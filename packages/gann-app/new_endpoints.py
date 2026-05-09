#!/usr/bin/env python3
"""
New API endpoints for gann_app — loaded via import.
Trade History, Auto-Signal Cron, Batch Transcribe.
"""

from datetime import datetime
import asyncio
import sqlite3
from pathlib import Path


def register_new_endpoints(app, paper_accounts, fetch_market_data, bot_check, create_signal, get_db):
    """Register new API endpoints on the FastAPI app."""

    # ── WebSocket Broadcast Helper ──
    DASHBOARD_PORT = 7700

    def ws_broadcast(event_type: str, data: dict) -> int:
        """Broadcast event to all dashboard WebSocket clients."""
        try:
            import requests as _r
            resp = _r.post(f"http://localhost:{DASHBOARD_PORT}/api/broadcast",
                          json={"type": event_type, "data": data}, timeout=2)
            return resp.json().get("sent", 0) if resp.status_code == 200 else 0
        except Exception:
            return 0

    # ── Trade History API ──────────────────────────────────────────────

    @app.get("/api/trading/history/{account_id}")
    async def get_trade_history(account_id: str):
        """Get closed trade history for a paper trading account."""
        acct = paper_accounts.get(account_id)
        if not acct:
            return {"error": f"Account {account_id} not found"}

        all_trades = acct.trades or []
        wins = [t for t in all_trades if t.get("pnl", 0) > 0]
        losses = [t for t in all_trades if t.get("pnl", 0) <= 0]
        total_pnl = sum(t.get("pnl", 0) for t in all_trades)
        best = max((t.get("pnl", 0) for t in all_trades), default=0)
        worst = min((t.get("pnl", 0) for t in all_trades), default=0)
        win_rate = round(len(wins) / len(all_trades) * 100, 1) if all_trades else 0
        avg_pnl = round(total_pnl / len(all_trades), 2) if all_trades else 0
        pf_num = sum(t["pnl"] for t in wins)
        pf_den = abs(sum(t["pnl"] for t in losses))
        profit_factor = round(pf_num / pf_den, 2) if pf_den > 0 else 0

        return {
            "account_id": account_id,
            "account_name": acct.account_name,
            "summary": {
                "total_trades": len(all_trades),
                "wins": len(wins),
                "losses": len(losses),
                "win_rate": win_rate,
                "total_pnl": round(total_pnl, 2),
                "avg_pnl": avg_pnl,
                "best_trade": round(best, 2),
                "worst_trade": round(worst, 2),
                "profit_factor": profit_factor,
                "avg_r": round(sum(t.get("r_multiple", 0) for t in all_trades) / len(all_trades), 2) if all_trades else 0,
            },
            "trades": all_trades[-200:],
        }

    # ── Auto-Signal Cron Job ────────────────────────────────────────────

    cron_state = {
        "running": False,
        "interval_s": 300,
        "task": None,
        "last_run": None,
        "run_count": 0,
        "results": [],
        "last_status": "never_run",
        "config": {
            "accounts": [],
            "engines": [],
            "tickers": [],
            "generate_signals": True,
            "check_stops": True,
        },
    }

    async def _cron_loop():
        """Background loop: generate signals + check stops every interval."""
        while cron_state["running"]:
            try:
                cron_state["last_run"] = datetime.now().isoformat()
                cron_state["run_count"] += 1
                results = []
                cfg = cron_state.get("config", {})
                cfg_accounts = cfg.get("accounts", [])
                cfg_engines = cfg.get("engines", [])
                cfg_tickers = cfg.get("tickers", [])

                # Check stops for accounts with positions
                if cfg.get("check_stops", True):
                    prices = {}
                    for aid, acct in paper_accounts.items():
                        if cfg_accounts and aid not in cfg_accounts:
                            continue
                        for symbol in list(acct.positions.keys()):
                            if cfg_tickers and symbol not in cfg_tickers:
                                continue
                            try:
                                market = fetch_market_data(symbol)
                                if market and "currentPrice" in market:
                                    prices[symbol] = market["currentPrice"]
                            except Exception:
                                pass

                    if prices:
                        bot_result = await bot_check({"prices": prices})
                        results.append({
                            "action": "bot_check",
                            "closed": len(bot_result.get("closed", [])),
                            "positions": sum(len(v) for v in bot_result.get("positions", {}).values()),
                        })

                # Generate signals
                if cfg.get("generate_signals", True):
                    target_accounts = []
                    if cfg_accounts:
                        for aid in cfg_accounts:
                            if aid in paper_accounts:
                                target_accounts.append(aid)
                    else:
                        for aid, acct in paper_accounts.items():
                            if acct.positions:
                                target_accounts.append(aid)

                    for aid in target_accounts:
                        acct = paper_accounts[aid]
                        symbols_to_scan = list(cfg_tickers) if cfg_tickers else (list(acct.positions.keys()) if acct.positions else ["BTC-USD"])

                        for symbol in symbols_to_scan:
                            engines_to_use = list(cfg_engines) if cfg_engines else ([acct.positions[symbol].get("engine_id", "gann")] if acct.positions and symbol in acct.positions else ["gann"])

                            for engine_id in engines_to_use:
                                try:
                                    sig = await create_signal({"ticker": symbol, "engine": engine_id, "account": aid})
                                    results.append({
                                        "action": "signal",
                                        "account": aid,
                                        "ticker": symbol,
                                        "engine": engine_id,
                                        "direction": sig.get("signal", {}).get("direction", "none"),
                                        "score": sig.get("signal", {}).get("score", 0),
                                    })
                                except Exception as ex:
                                    results.append({
                                        "action": "signal_error",
                                        "account": aid,
                                        "ticker": symbol,
                                        "error": str(ex)[:100],
                                    })

                cron_state["results"] = results[-30:]
                cron_state["last_status"] = "ok"
                # Broadcast cron results to dashboard
                ws_broadcast("cron_cycle", {
                    "run_count": cron_state["run_count"],
                    "results_count": len(results),
                    "signals": [r for r in results if r.get("action") == "signal"],
                    "errors": [r for r in results if r.get("action") == "signal_error"],
                    "bot_check": next((r for r in results if r.get("action") == "bot_check"), None),
                    "config": cron_state.get("config", {}),
                })
            except Exception as ex:
                cron_state["last_status"] = f"error: {str(ex)[:100]}"

            await asyncio.sleep(cron_state["interval_s"])

    @app.post("/api/cron/start")
    async def cron_start(request: dict = None):
        """Start the auto-signal cron job. Body: {"interval": 300, "config": {...}}
        config.accounts: list of account IDs to scan (empty = all with positions)
        config.engines: list of engine IDs to use (empty = auto from position)
        config.tickers: list of tickers to scan (empty = auto from positions)
        config.generate_signals: bool (default True)
        config.check_stops: bool (default True)
        """
        if cron_state["running"]:
            return {"status": "already_running", "interval_s": cron_state["interval_s"], "config": cron_state.get("config", {})}
        body = request or {}
        cron_state["interval_s"] = body.get("interval", 300)
        if "config" in body:
            cron_state["config"] = body["config"]
        default_cfg = {"accounts": [], "engines": [], "tickers": [], "generate_signals": True, "check_stops": True}
        for k, v in default_cfg.items():
            cron_state["config"].setdefault(k, v)
        cron_state["running"] = True
        cron_state["run_count"] = 0
        cron_state["task"] = asyncio.create_task(_cron_loop())
        ws_broadcast("cron_started", {"interval_s": cron_state["interval_s"], "config": cron_state["config"]})
        return {"status": "started", "interval_s": cron_state["interval_s"], "config": cron_state["config"]}

    @app.post("/api/cron/stop")
    async def cron_stop():
        """Stop the auto-signal cron job."""
        if not cron_state["running"]:
            return {"status": "already_stopped"}
        cron_state["running"] = False
        if cron_state["task"]:
            cron_state["task"].cancel()
            cron_state["task"] = None
        ws_broadcast("cron_stopped", {"run_count": cron_state["run_count"]})
        return {"status": "stopped", "run_count": cron_state["run_count"]}

    @app.get("/api/cron/status")
    async def cron_status():
        """Get cron job status."""
        return {
            "running": cron_state["running"],
            "interval_s": cron_state["interval_s"],
            "run_count": cron_state["run_count"],
            "last_run": cron_state["last_run"],
            "last_status": cron_state.get("last_status", "never_run"),
            "config": cron_state.get("config", {}),
            "recent_results": cron_state.get("results", []),
        }

    # ── Batch Transcribe API ────────────────────────────────────────────

    @app.post("/api/transcribe/batch")
    async def transcribe_batch(request: dict):
        """Batch transcribe videos from a YouTube channel.
        Body: {"channel": "dtr"|"reece", "max_videos": 10, "overwrite": false}
        """
        channel_key = request.get("channel", "dtr")
        max_videos = request.get("max_videos", 10)
        overwrite = request.get("overwrite", False)

        channel_map = {
            "dtr": "dtr", "reece": "reece", "casper": "casper",
            "franky": "franky", "rumors": "rumors",
        }
        engine_id = channel_map.get(channel_key, channel_key)

        try:
            from youtube_monitor import (
                init_db, fetch_new_videos, download_audio,
                transcribe_audio, VideoInfo, CHANNELS
            )
        except ImportError:
            return {"error": "youtube_monitor module not available", "status": "failed"}

        # Add DTR and Reece channels if missing
        CHANNELS.setdefault("dtr", "UCM4G2Ma3hPWKq8r0V4k2hZg")
        CHANNELS.setdefault("reece", "UCdpM12S5lFu_1n0Y3LMm9NQ")

        channel_id = CHANNELS.get(engine_id)
        if not channel_id:
            return {
                "error": f"No YouTube channel for {engine_id}",
                "available": list(CHANNELS.keys()),
            }

        init_db()
        DB_PATH = Path(r"D:\AI Drive\pi-agent\tekton\packages\gann-app\youtube_monitor.db")
        results = {
            "channel": channel_key, "engine_id": engine_id,
            "videos_processed": 0, "transcripts_created": 0,
            "errors": [], "details": [],
        }

        try:
            new_videos = fetch_new_videos(engine_id)
            for video in new_videos[:max_videos]:
                vid_id = video.video_id if hasattr(video, 'video_id') else video.get('video_id', '')
                vid_title = video.title if hasattr(video, 'title') else video.get('title', '')
                try:
                    if not overwrite:
                        db = sqlite3.connect(str(DB_PATH))
                        row = db.execute(
                            "SELECT transcript_status FROM videos WHERE video_id=?",
                            [vid_id]
                        ).fetchone()
                        db.close()
                        if row and row[0] == 'done':
                            results["details"].append({
                                "video_id": vid_id,
                                "title": vid_title[:60],
                                "status": "skipped",
                            })
                            continue

                    audio_path = download_audio(video)
                    if audio_path:
                        transcript = transcribe_audio(audio_path)
                        results["transcripts_created"] += 1
                        results["details"].append({
                            "video_id": vid_id,
                            "title": vid_title[:60],
                            "status": "transcribed",
                        })
                    else:
                        results["details"].append({
                            "video_id": vid_id,
                            "title": vid_title[:60],
                            "status": "download_failed",
                        })
                    results["videos_processed"] += 1
                except Exception as ex:
                    results["errors"].append(str(ex)[:100])
                    results["details"].append({
                        "video_id": vid_id,
                        "title": vid_title[:60] if vid_title else "unknown",
                        "status": "error",
                        "error": str(ex)[:80],
                    })
        except Exception as ex:
            results["errors"].append(f"Feed fetch error: {str(ex)[:100]}")

        return results

    @app.get("/api/transcribe/status")
    async def transcribe_status():
        """Get transcription status from the youtube_monitor database."""
        db_path = Path(r"D:\AI Drive\pi-agent\tekton\packages\gann-app\youtube_monitor.db")
        if not db_path.exists():
            return {"total": 0, "transcribed": 0, "pending": 0, "channels": {}}

        conn = sqlite3.connect(str(db_path))
        try:
            total = conn.execute("SELECT COUNT(*) FROM videos").fetchone()[0]
            transcribed = conn.execute(
                "SELECT COUNT(*) FROM videos WHERE transcript_status='done'"
            ).fetchone()[0]
            pending = conn.execute(
                "SELECT COUNT(*) FROM videos WHERE transcript_status='pending'"
            ).fetchone()[0]
            channels = {}
            for row in conn.execute(
                "SELECT engine_id, COUNT(*), "
                "SUM(CASE WHEN transcript_status='done' THEN 1 ELSE 0 END) "
                "FROM videos GROUP BY engine_id"
            ):
                channels[row[0]] = {"total": row[1], "transcribed": row[2]}

            recent = []
            for row in conn.execute(
                "SELECT video_id, engine_id, title, transcript_status, published "
                "FROM videos ORDER BY detected_at DESC LIMIT 20"
            ):
                recent.append({
                    "video_id": row[0],
                    "engine_id": row[1],
                    "title": (row[2] or "")[:60],
                    "status": row[3],
                    "published": row[4],
                })
            return {
                "total": total,
                "transcribed": transcribed,
                "pending": pending,
                "channels": channels,
                "recent": recent,
            }
        finally:
            conn.close()