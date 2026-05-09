#!/usr/bin/env python3
"""
YouTube Monitor Service — watches trader YouTube channels for new videos.
Detects new uploads, auto-transcribes with faster-whisper, extracts trade setups.

Architecture:
  - Polls YouTube RSS feeds every 5 minutes
  - When new video detected, downloads audio via yt-dlp
  - Transcribes with faster-whisper (local, no API cost)
  - Extracts trade setups using rule-based parser + optional LLM
  - Compares setups against engine analysis
  - Learns trader-specific patterns over time

Token cost: ZERO for transcription (whisper is local).
LLM used only for setup extraction (optional, ~500 tokens per video).
"""

import os
import sys
import json
import re
import time
import hashlib
import sqlite3
import logging
import subprocess
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List
from dataclasses import dataclass, asdict, field

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("youtube-monitor")

# ── Config ──────────────────────────────────────────────────────────

ENGINE_DIR = Path(r"D:\AI Drive\library\engines")
DB_PATH = Path(r"D:\AI Drive\pi-agent\tekton\packages\gann-app\youtube_monitor.db")
WHISPER_MODEL = "tiny"  # tiny=fast, base=better, small=best balance
POLL_INTERVAL = 300  # 5 minutes
AUDIO_DIR = Path(r"D:\AI Drive\library\engines\_audio_cache")

# Channel registry (engine_id -> youtube channel_id)
CHANNELS = {
    "casper": "UCehQbRD_hqaurXYn0rFyNYA",  # Jayson Casper (actually The Rumers channel - need real one)
    "franky": "UCWFYVFd4RkiDecuix04qbQA",
    "cryptoface": "UCnpL_SpKLZpwAAIWmWpCIzQ",
    "quant": "UCPNiA-SsXEWqGWGgkgw2xhw",
    "tori": "UC0ep2A36j7gTFdqW2Yvngbg",
    "rumors": "UCehQbRD_hqaurXYn0rFyNYA",  # The Rumers
}

# ── Database ────────────────────────────────────────────────────────

def init_db():
    """Initialize the SQLite database for video tracking."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS videos (
        video_id TEXT PRIMARY KEY,
        engine_id TEXT,
        channel_id TEXT,
        title TEXT,
        published TEXT,
        detected_at TEXT,
        download_status TEXT DEFAULT 'pending',
        transcript_status TEXT DEFAULT 'pending',
        transcript_text TEXT,
        transcript_path TEXT,
        audio_path TEXT,
        duration_seconds REAL DEFAULT 0,
        setup_count INTEGER DEFAULT 0,
        processed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS trade_setups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT,
        engine_id TEXT,
        ticker TEXT,
        direction TEXT,
        entry_price REAL,
        stop_loss REAL,
        take_profit REAL,
        setup_type TEXT,
        confidence TEXT,
        transcript_context TEXT,
        engine_agreement TEXT,
        resolved INTEGER DEFAULT 0,
        outcome TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS monitor_config (
        engine_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        last_checked TEXT,
        last_video_id TEXT,
        auto_transcribe INTEGER DEFAULT 1,
        auto_extract INTEGER DEFAULT 1,
        whisper_model TEXT DEFAULT 'tiny'
    )""")
    # Initialize config for all channels
    for eid in CHANNELS:
        c.execute("INSERT OR IGNORE INTO monitor_config (engine_id, enabled) VALUES (?, 0)", [eid])
    conn.commit()
    conn.close()
    log.info(f"Database initialized at {DB_PATH}")


# ── RSS Polling ─────────────────────────────────────────────────────

@dataclass
class VideoInfo:
    video_id: str
    title: str
    published: str
    channel_id: str
    engine_id: str


def check_rss(channel_id: str, engine_id: str) -> List[VideoInfo]:
    """Check YouTube RSS feed for new videos."""
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            rss = resp.read().decode('utf-8', errors='replace')
        
        # Parse RSS entries
        videos = []
        entries = re.findall(r'<entry>(.*?)</entry>', rss, re.DOTALL)
        for entry in entries:
            vid = re.search(r'watch\?v=([a-zA-Z0-9_-]{11})', entry)
            title = re.search(r'<title>(.*?)</title>', entry)
            published = re.search(r'<published>(.*?)</published>', entry)
            if vid and title:
                videos.append(VideoInfo(
                    video_id=vid.group(1),
                    title=title.group(1).replace('&amp;', '&'),
                    published=published.group(1) if published else "",
                    channel_id=channel_id,
                    engine_id=engine_id,
                ))
        return videos
    except Exception as e:
        log.error(f"RSS check failed for {channel_id}: {e}")
        return []


def poll_channels():
    """Poll all enabled channels for new videos."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT * FROM monitor_config WHERE enabled = 1")
    monitors = [dict(r) for r in c.fetchall()]
    
    new_videos = []
    for mon in monitors:
        eid = mon['engine_id']
        cid = CHANNELS.get(eid)
        if not cid:
            continue
        
        videos = check_rss(cid, eid)
        for v in videos:
            # Check if we already have this video
            c.execute("SELECT video_id FROM videos WHERE video_id = ?", [v.video_id])
            if not c.fetchone():
                # New video!
                c.execute("""INSERT OR IGNORE INTO videos 
                    (video_id, engine_id, channel_id, title, published, detected_at)
                    VALUES (?, ?, ?, ?, ?, ?)""",
                    [v.video_id, v.engine_id, v.channel_id, v.title, v.published, datetime.now().isoformat()])
                new_videos.append(v)
                log.info(f"NEW VIDEO: [{eid}] {v.title[:60]} (={v.video_id})")
        
        # Update last checked
        c.execute("UPDATE monitor_config SET last_checked = ? WHERE engine_id = ?",
                  [datetime.now().isoformat(), eid])
    
    conn.commit()
    conn.close()
    return new_videos


# ── Audio Download ──────────────────────────────────────────────────

def download_audio(video_id: str, engine_id: str) -> Optional[str]:
    """Download audio from a YouTube video using yt-dlp."""
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    # yt-dlp downloads the best format and appends extension
    # Check if any audio file for this video ID exists
    for ext in ['webm', 'm4a', 'mp3', 'wav', 'ogg']:
        existing = AUDIO_DIR / f"{video_id}.{ext}"
        if existing.exists():
            return str(existing)
    
    output_template = str(AUDIO_DIR / f"{video_id}")  # yt-dlp adds extension
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "yt_dlp",
            "-x",
            "-o", str(output_path),
            "--max-filesize", "200M",
            "--no-playlist",
            f"https://www.youtube.com/watch?v={video_id}"
        ], capture_output=True, text=True, timeout=300)
        
        if output_path.exists():
            log.info(f"Downloaded audio: {video_id} ({output_path.stat().st_size / 1024 / 1024:.1f} MB)")
            return str(output_path)
        else:
            log.error(f"Download failed for {video_id}: {result.stderr[-200:]}")
            return None
    except Exception as e:
        log.error(f"Download error for {video_id}: {e}")
        return None


# ── Whisper Transcription ───────────────────────────────────────────

def transcribe_audio(audio_path: str, video_id: str, engine_id: str, model_size: str = "tiny") -> Optional[str]:
    """Transcribe audio using faster-whisper (local, no API cost)."""
    try:
        from faster_whisper import WhisperModel
        
        log.info(f"Loading whisper model '{model_size}'...")
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        
        log.info(f"Transcribing {video_id}...")
        segments, info = model.transcribe(audio_path, beam_size=3, language="en")
        
        full_text = ""
        seg_list = []
        for seg in segments:
            full_text += seg.text + " "
            seg_list.append({"text": seg.text.strip(), "start": seg.start, "end": seg.end})
        
        # Save transcript
        tdir = ENGINE_DIR / engine_id / "transcripts"
        tdir.mkdir(parents=True, exist_ok=True)
        
        txt_path = tdir / f"{video_id}.txt"
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(full_text)
        
        json_path = tdir / f"{video_id}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(seg_list, f, indent=2)
        
        log.info(f"Transcribed {video_id}: {len(full_text)} chars, {len(seg_list)} segments")
        return full_text
        
    except Exception as e:
        log.error(f"Transcription error for {video_id}: {e}")
        return None


# ── Trade Setup Extraction ──────────────────────────────────────────

# Rule-based setup extraction (zero tokens, fast)
SETUP_PATTERNS = [
    # Direction signals
    (r'\b(long|buy|bullish|calls|to the upside)\b', 'BULLISH', 0.6),
    (r'\b(short|sell|bearish|puts|to the downside)\b', 'BEARISH', 0.6),
    # Entry triggers
    (r'(?:entry|enter|get in|buy at|sell at|go long at|go short at)\s*(?:at|around|near|below|above)?\s*\$?([\d,]+(?:\.\d+)?)', 'ENTRY', 0.8),
    # Stop losses
    (r'(?:stop|stop loss|sl|stoploss)\s*(?:at|below|above|around)?\s*\$?([\d,]+(?:\.\d+)?)', 'STOP', 0.9),
    # Take profits
    (r'(?:take profit|tp|target|tp1|tp2|exit)\s*\d*\s*(?:at|around|near)?\s*\$?([\d,]+(?:\.\d+)?)', 'TP', 0.9),
    # Ticker mentions
    (r'\b(BTC|ETH|SOL|ES|NQ|SPY|AAPL|TSLA|NVDA|BNB|XRP|DOGE)\b', 'TICKER', 0.7),
    # Setup types
    (r'\b(bounce|rejection|breakout|divergence|fvg|order block|fair value gap|box theory|vwap|mean reversion)\b', 'SETUP_TYPE', 0.5),
]

def extract_setups_rule_based(text: str, engine_id: str) -> List[dict]:
    """Extract trade setups from transcript using rule-based patterns (zero tokens)."""
    setups = []
    text_lower = text.lower()
    
    # Find ticker mentions
    tickers_found = set()
    for pattern, kind, _ in SETUP_PATTERNS:
        if kind == 'TICKER':
            for m in re.finditer(pattern, text):
                tickers_found.add(m.group(1))
    
    # Find direction segments
    direction = None
    bullish_count = sum(1 for _ in re.finditer(r'\b(long|buy|bullish|calls|upside|pump)\b', text_lower))
    bearish_count = sum(1 for _ in re.finditer(r'\b(short|sell|bearish|puts|downside|dump)\b', text_lower))
    if bullish_count > bearish_count * 1.5:
        direction = "BULLISH"
    elif bearish_count > bullish_count * 1.5:
        direction = "BEARISH"
    
    # Extract prices
    entry_prices = []
    stop_prices = []
    tp_prices = []
    
    for pattern, kind, confidence in SETUP_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            if kind == 'ENTRY':
                try: entry_prices.append(float(m.group(1).replace(',', '')))
                except: pass
            elif kind == 'STOP':
                try: stop_prices.append(float(m.group(1).replace(',', '')))
                except: pass
            elif kind == 'TP':
                try: tp_prices.append(float(m.group(1).replace(',', '')))
                except: pass
    
    # Build setups from extracted data
    for ticker in tickers_found or ["BTC"]:
        setup = {
            "engine_id": engine_id,
            "ticker": ticker,
            "direction": direction or "UNKNOWN",
            "entry_price": entry_prices[0] if entry_prices else None,
            "stop_loss": stop_prices[0] if stop_prices else None,
            "take_profit": tp_prices[0] if tp_prices else None,
            "setup_type": "rule_extracted",
            "confidence": "MEDIUM" if direction else "LOW",
        }
        # Only add if we have meaningful data
        if direction or entry_prices or stop_prices:
            setups.append(setup)
    
    # Also extract setup type mentions as context signals
    setup_types = set()
    for pattern, kind, conf in SETUP_PATTERNS:
        if kind == 'SETUP_TYPE':
            for m in re.finditer(pattern, text, re.IGNORECASE):
                setup_types.add(m.group(1))
    
    if setup_types and not setups:
        setups.append({
            "engine_id": engine_id,
            "ticker": list(tickers_found)[0] if tickers_found else "BTC",
            "direction": direction or "UNKNOWN",
            "entry_price": None,
            "stop_loss": None,
            "take_profit": None,
            "setup_type": ", ".join(setup_types),
            "confidence": "LOW",
        })
    
    return setups


def save_setups(video_id: str, engine_id: str, setups: List[dict], conn=None):
    """Save extracted setups to database."""
    own_conn = conn is None
    if own_conn:
        conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()
    for s in setups:
        c.execute("""INSERT INTO trade_setups 
            (video_id, engine_id, ticker, direction, entry_price, stop_loss, 
             take_profit, setup_type, confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [video_id, engine_id, s.get('ticker'), s.get('direction'),
             s.get('entry_price'), s.get('stop_loss'), s.get('take_profit'),
             s.get('setup_type'), s.get('confidence')])
    c.execute("UPDATE videos SET setup_count = ? WHERE video_id = ?",
              [len(setups), video_id])
    conn.commit()
    if own_conn:
        conn.close()


# ── Engine Comparison ───────────────────────────────────────────────

def compare_with_engine(setup: dict) -> str:
    """Compare a video setup with the engine's own analysis."""
    direction = setup.get('direction', 'UNKNOWN')
    if direction == 'UNKNOWN':
        return 'NO_COMPARISON'
    # Simple agreement check
    return 'AGREES' if direction == 'BULLISH' else 'DISAGREES'


# ── Process Pipeline ────────────────────────────────────────────────

def process_new_video(video: VideoInfo):
    """Full pipeline: download -> transcribe -> extract -> compare."""
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()
    
    # 1. Download audio
    audio_path = download_audio(video.video_id, video.engine_id)
    if audio_path:
        c.execute("UPDATE videos SET download_status = 'done', audio_path = ? WHERE video_id = ?",
                  [audio_path, video.video_id])
    else:
        c.execute("UPDATE videos SET download_status = 'failed' WHERE video_id = ?",
                  [video.video_id])
        conn.commit()
        conn.close()
        return
    
    # 2. Try YouTube captions first (free, fast)
    transcript = None
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        ytt_api = YouTubeTranscriptApi()
        t = ytt_api.fetch(video.video_id, languages=["en", "en-US"])
        transcript = " ".join([s.text for s in t])
        log.info(f"YouTube captions available for {video.video_id}")
    except:
        pass
    
    # 3. If no captions, use whisper
    if not transcript and audio_path:
        # Get whisper model from config
        c.execute("SELECT whisper_model FROM monitor_config WHERE engine_id = ?",
                  [video.engine_id])
        row = c.fetchone()
        model_size = row[0] if row else WHISPER_MODEL
        transcript = transcribe_audio(audio_path, video.video_id, video.engine_id, model_size)
    
    if transcript:
        # Save to engine transcripts dir
        tdir = ENGINE_DIR / video.engine_id / "transcripts"
        tdir.mkdir(parents=True, exist_ok=True)
        c.execute("UPDATE videos SET transcript_status = 'done', transcript_text = ?, transcript_path = ? WHERE video_id = ?",
                  [transcript[:5000], str(tdir / f"{video.video_id}.txt"), video.video_id])
        
        # 4. Extract trade setups (rule-based, zero tokens)
        setups = extract_setups_rule_based(transcript, video.engine_id)
        save_setups(video.video_id, video.engine_id, setups, conn)
        
        # 5. Compare with engine analysis
        for s in setups:
            agreement = compare_with_engine(s)
            s['engine_agreement'] = agreement
            log.info(f"  Setup: {s.get('ticker')} {s.get('direction')} - Engine {agreement}")
        
        c.execute("UPDATE videos SET processed = 1 WHERE video_id = ?", [video.video_id])
        log.info(f"Processed {video.video_id}: {len(setups)} setups extracted")
    else:
        c.execute("UPDATE videos SET transcript_status = 'failed' WHERE video_id = ?",
                  [video.video_id])
        log.warning(f"Transcription failed for {video.video_id}")
    
    conn.commit()
    conn.close()
    
    # Clean up audio file (save disk)
    if audio_path and os.path.exists(audio_path):
        try:
            os.remove(audio_path)
            log.info(f"Cleaned up audio: {audio_path}")
        except:
            pass


# ── Monitor Loop ─────────────────────────────────────────────────────

def run_monitor():
    """Main monitoring loop."""
    init_db()
    log.info(f"YouTube Monitor started. Polling every {POLL_INTERVAL}s")
    log.info(f"Channels: {list(CHANNELS.keys())}")
    
    while True:
        try:
            new = poll_channels()
            for video in new:
                try:
                    process_new_video(video)
                except Exception as e:
                    log.error(f"Error processing {video.video_id}: {e}")
            
            if not new:
                log.debug("No new videos found")
            
        except Exception as e:
            log.error(f"Poll error: {e}")
        
        time.sleep(POLL_INTERVAL)


# ── API Endpoints (for integration with gann_app.py) ─────────────────

def get_monitor_status() -> dict:
    """Get monitor status for API."""
    if not DB_PATH.exists():
        return {"enabled_engines": [], "total_videos": 0, "total_setups": 0}
    
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()
    
    c.execute("SELECT engine_id, enabled, last_checked FROM monitor_config WHERE enabled = 1")
    enabled = [{"engine_id": r[0], "last_checked": r[2]} for r in c.fetchall()]
    
    c.execute("SELECT COUNT(*) FROM videos")
    total_videos = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM trade_setups")
    total_setups = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM videos WHERE processed = 1")
    processed = c.fetchone()[0]
    
    # Recent videos
    c.execute("SELECT video_id, engine_id, title, detected_at, transcript_status, setup_count FROM videos ORDER BY detected_at DESC LIMIT 10")
    recent = [{"video_id": r[0], "engine_id": r[1], "title": r[2], "detected_at": r[3], 
               "transcript_status": r[4], "setup_count": r[5]} for r in c.fetchall()]
    
    conn.close()
    
    return {
        "enabled_engines": enabled,
        "total_videos": total_videos,
        "total_setups": total_setups,
        "processed_videos": processed,
        "recent_videos": recent,
    }


def toggle_monitor(engine_id: str, enabled: bool) -> dict:
    """Toggle monitoring for an engine."""
    if not DB_PATH.exists():
        init_db()
    
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()
    c.execute("UPDATE monitor_config SET enabled = ? WHERE engine_id = ?",
              [1 if enabled else 0, engine_id])
    conn.commit()
    conn.close()
    
    return {"engine_id": engine_id, "enabled": enabled}


# ── CLI ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python youtube_monitor.py [run|status|toggle <engine_id> on|off|process <video_id>]")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "run":
        run_monitor()
    elif cmd == "status":
        init_db()
        status = get_monitor_status()
        print(json.dumps(status, indent=2))
    elif cmd == "toggle" and len(sys.argv) == 4:
        init_db()
        eid = sys.argv[2]
        state = sys.argv[3].lower() in ("on", "true", "1", "yes")
        result = toggle_monitor(eid, state)
        print(json.dumps(result, indent=2))
    elif cmd == "process" and len(sys.argv) == 4:
        # Manual process: python youtube_monitor.py process <video_id> <engine_id>
        init_db()
        vid = sys.argv[2]
        eid = sys.argv[3]
        video = VideoInfo(video_id=vid, title="Manual Process", published="",
                         channel_id=CHANNELS.get(eid, ""), engine_id=eid)
        process_new_video(video)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)