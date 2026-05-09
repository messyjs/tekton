#!/usr/bin/env python3
"""
MessyHedge Scheduler — Runs automated analysis at session opens.

Sessions:
  Asian Open:   00:00 UTC (Tokyo 09:00)
  London Open:  07:00 UTC (08:00 BST)
  NY Open:      13:30 UTC (09:30 EST)

Strategy:
  1. Python-first: Run all Tekton engines locally (zero tokens)
  2. Compute indicators, signals, confluence (zero tokens)
  3. Single LLM call per ticker for synthesis (~6K tokens)
  4. Push results to Telegram via bot API

Token usage: ~6K per ticker (vs ~46K for full TradingAgents)
Daily: 10 tickers x 3 sessions x 6K = ~180K tokens/day
"""

import json
import os
import sys
import time
import signal
import threading
import traceback
from datetime import datetime, timedelta
from pathlib import Path

# ── Configuration ──
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")  # Your Telegram user/chat ID
TEKTON_PORT = int(os.environ.get("TEKTON_PORT", "7799"))
DEEP_THINK_LLM = os.environ.get("DEEP_THINK_LLM", "deepseek-v4-pro:cloud")
QUICK_THINK_LLM = os.environ.get("QUICK_THINK_LLM", "deepseek-v4-flash:cloud")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_CLOUD_URL", "http://localhost:11434/v1")

# Watchlists per session type
WATCHLISTS = {
    "crypto": ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "BNB-USD"],
    "stocks": ["NVDA", "AAPL", "TSLA", "MSFT", "AMZN", "GOOGL", "META"],
    "forex": ["EUR-USD", "GBP-USD", "USD-JPY"],
}

# Session schedule (UTC hours)
SESSIONS = {
    "asian": {"hour": 0, "tickers": "crypto", "label": "Asian Open"},
    "london": {"hour": 7, "tickers": "forex", "label": "London Open"},
    "ny": {"hour": 13, "tickers": "stocks", "label": "NY Open"},
    "ny_crypto": {"hour": 14, "tickers": "crypto", "label": "NY Crypto"},
}

RESULTS_DIR = Path(os.environ.get("TRADINGAGENTS_RESULTS_DIR",
    str(Path.home() / ".tekton" / "messyhedge" / "results")))
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


# ── Telegram Push ──
def telegram_send(chat_id: str, text: str, parse_mode: str = "Markdown"):
    """Send a message to Telegram"""
    if not TELEGRAM_BOT_TOKEN or not chat_id:
        print(f"[telegram] No token/chat_id - would send: {text[:100]}...")
        return
    import urllib.request
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = json.dumps({
        "chat_id": chat_id,
        "text": text[:4096],
        "parse_mode": parse_mode,
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"[telegram] Send failed: {e}")


# ── Python-First Analysis (Zero-Token) ──
def run_python_analysis(ticker: str) -> dict:
    """
    Run all Tekton engines locally via HTTP API.
    This costs ZERO tokens - all Python computation.
    Returns structured signals, levels, and scores.
    """
    import urllib.request
    
    results = {"ticker": ticker, "engines": {}, "timestamp": datetime.utcnow().isoformat()}
    
    # Call Tekton's analyze endpoint for multiple engines
    engines = ["gann", "ict", "casper", "franky", "buffett", "quant"]
    for engine in engines:
        try:
            payload = json.dumps({"ticker": ticker, "engine": engine}).encode()
            req = urllib.request.Request(
                f"http://localhost:{TEKTON_PORT}/api/analyze",
                data=payload,
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
                score = data.get("gannScore") or data.get("score") or 0
                bias = data.get("gannBias") or data.get("bias") or "NEUTRAL"
                signals = data.get("signals", [])
                key_levels = data.get("keyLevels", data.get("confluenceZones", []))
                results["engines"][engine] = {
                    "score": score,
                    "bias": bias,
                    "signals": signals[:5] if isinstance(signals, list) else str(signals)[:200],
                    "key_levels": key_levels[:3] if isinstance(key_levels, list) else [],
                }
        except Exception as e:
            results["engines"][engine] = {"error": str(e)[:100]}

    # Compute aggregate score (weighted average)
    scores = [e["score"] for e in results["engines"].values() 
              if isinstance(e.get("score"), (int, float))]
    if scores:
        results["aggregate_score"] = round(sum(scores) / len(scores), 1)
    else:
        results["aggregate_score"] = 0

    # Compute consensus bias
    bull_count = sum(1 for e in results["engines"].values() 
                     if "BULL" in str(e.get("bias", "")))
    bear_count = sum(1 for e in results["engines"].values() 
                     if "BEAR" in str(e.get("bias", "")))
    if bull_count > bear_count + 1:
        results["consensus"] = "BULLISH"
    elif bear_count > bull_count + 1:
        results["consensus"] = "BEARISH"
    else:
        results["consensus"] = "NEUTRAL"

    return results


# ── LLM Synthesis (Single call, ~6K tokens) ──
def llm_synthesize(analysis_data: dict) -> str:
    """
    Single LLM call: feed all engine results, get a concise decision.
    This is the ONLY token cost per analysis (~6K tokens).
    """
    import urllib.request
    
    # Build a compact prompt with all engine data
    engine_summaries = []
    for eng, data in analysis_data.get("engines", {}).items():
        if "error" in data:
            engine_summaries.append(f"{eng}: ERROR ({data['error']})")
        else:
            score = data.get("score", "?")
            bias = data.get("bias", "?")
            sigs = data.get("signals", [])
            sig_str = ", ".join(str(s)[:30] for s in (sigs[:3] if isinstance(sigs, list) else [sigs]))
            engine_summaries.append(f"{eng}: Score={score} Bias={bias} Signals=[{sig_str}]")
    
    engines_text = "\n".join(engine_summaries)
    prompt = f"""Analyze {analysis_data['ticker']} based on these engine results:

{engines_text}

Aggregate Score: {analysis_data.get('aggregate_score', '?')}/100
Consensus: {analysis_data.get('consensus', '?')}

Provide a brief trading decision (3-4 sentences max):
1. Decision: BUY / SELL / HOLD
2. Key reason (one sentence)
3. Risk level: LOW / MEDIUM / HIGH
4. Confidence: 1-10"""

    # Call Ollama (local proxy to cloud)
    payload = json.dumps({
        "model": QUICK_THINK_LLM,
        "prompt": prompt,
        "stream": False,
        "options": {"num_predict": 200, "temperature": 0.3}
    }).encode()
    
    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL.rstrip('/v1')}/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
            return result.get("response", "No response").strip()
    except Exception as e:
        return f"LLM synthesis failed: {e}"


# ── Format Telegram Message ──
def format_session_message(session_label: str, results: list) -> str:
    """Format analysis results for Telegram"""
    lines = [f"*MessyHedge - {session_label}*", f"_{datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC_", ""]
    
    for r in results[:10]:
        ticker = r.get("ticker", "?")
        score = r.get("aggregate_score", "?")
        consensus = r.get("consensus", "?")
        llm = r.get("llm_decision", "")
        
        score_icon = "+" if isinstance(score, (int, float)) and score >= 60 else "-"
        lines.append(f"*{ticker}* {score_icon}{score} {consensus}")
        if llm:
            lines.append(f"  {llm[:150]}")
        lines.append("")
    
    return "\n".join(lines)[:4096]


# ── Run Session ──
def run_session(session_name: str, session_cfg: dict):
    """Run analysis for all tickers in a session"""
    tickers_key = session_cfg["tickers"]
    tickers = WATCHLISTS.get(tickers_key, [])
    label = session_cfg["label"]
    
    print(f"[{label}] Starting analysis for {len(tickers)} tickers: {', '.join(tickers)}")
    
    # Notify Telegram
    telegram_send(TELEGRAM_CHAT_ID, f"*MessyHedge - {label}* Starting analysis for {len(tickers)} tickers...")
    
    results = []
    for ticker in tickers:
        print(f"  [{label}] Analyzing {ticker}...")
        
        # Step 1: Python-first analysis (ZERO tokens)
        analysis = run_python_analysis(ticker)
        
        # Step 2: LLM synthesis (single call, ~6K tokens)
        llm_decision = llm_synthesize(analysis)
        analysis["llm_decision"] = llm_decision
        
        # Save result
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filepath = RESULTS_DIR / f"{ticker}_{ts}.json"
        with open(filepath, "w") as f:
            json.dump(analysis, f, indent=2, default=str)
        
        results.append(analysis)
        time.sleep(2)  # Rate limit between tickers
    
    # Send summary to Telegram
    msg = format_session_message(label, results)
    telegram_send(TELEGRAM_CHAT_ID, msg)
    
    print(f"[{label}] Complete. {len(results)} tickers analyzed.")
    return results


# ── Scheduler ──
class SessionScheduler:
    """Runs sessions at scheduled times"""
    
    def __init__(self):
        self.running = True
        self.last_run = {}  # session_name -> date string
    
    def should_run(self, session_name: str, session_cfg: dict) -> bool:
        """Check if a session should run now"""
        now = datetime.utcnow()
        target_hour = session_cfg["hour"]
        today = now.strftime("%Y-%m-%d")
        
        # Already ran this session today?
        if self.last_run.get(session_name) == today:
            return False
        
        # Is it the right hour? (±10 minute window)
        if now.hour == target_hour and now.minute < 10:
            return True
        
        return False
    
    def run(self):
        """Main scheduler loop"""
        print(f"[scheduler] MessyHedge Scheduler started")
        print(f"[scheduler] Sessions: {', '.join(f'{v['label']} ({v['hour']:02d}:00 UTC)' for v in SESSIONS.values())}")
        
        while self.running:
            now = datetime.utcnow()
            
            for name, cfg in SESSIONS.items():
                if self.should_run(name, cfg):
                    print(f"[scheduler] Triggering {cfg['label']}")
                    try:
                        run_session(name, cfg)
                        self.last_run[name] = now.strftime("%Y-%m-%d")
                    except Exception as e:
                        print(f"[scheduler] Session {name} failed: {e}")
                        telegram_send(TELEGRAM_CHAT_ID, f"*MessyHedge Error*\n{cfg['label']}: {str(e)[:200]}")
            
            # Check every 60 seconds
            time.sleep(60)
    
    def stop(self):
        self.running = False


# ── CLI ──
def main():
    import argparse
    parser = argparse.ArgumentParser(description="MessyHedge Scheduler")
    parser.add_argument("--now", action="store_true", help="Run all sessions immediately (test mode)")
    parser.add_argument("--ticker", type=str, help="Analyze a single ticker now")
    parser.add_argument("--session", type=str, choices=list(SESSIONS.keys()), help="Run a specific session now")
    parser.add_argument("--daemon", action="store_true", help="Run as daemon with scheduled sessions")
    parser.add_argument("--chat-id", type=str, help="Telegram chat ID for notifications")
    args = parser.parse_args()
    
    global TELEGRAM_CHAT_ID
    if args.chat_id:
        TELEGRAM_CHAT_ID = args.chat_id
    
    if args.ticker:
        # Single ticker analysis
        print(f"Analyzing {args.ticker}...")
        analysis = run_python_analysis(args.ticker)
        llm = llm_synthesize(analysis)
        analysis["llm_decision"] = llm
        print(json.dumps(analysis, indent=2, default=str))
        return
    
    if args.now:
        # Run all sessions immediately
        for name, cfg in SESSIONS.items():
            run_session(name, cfg)
        return
    
    if args.session:
        # Run specific session
        run_session(args.session, SESSIONS[args.session])
        return
    
    if args.daemon or True:
        # Run as daemon (default)
        scheduler = SessionScheduler()
        
        def shutdown(sig, frame):
            print("\nShutting down...")
            scheduler.stop()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, shutdown)
        signal.signal(signal.SIGTERM, shutdown)
        
        scheduler.run()


if __name__ == "__main__":
    main()