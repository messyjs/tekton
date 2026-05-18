"""
Tekton Trading Box — Experimental Stats Engine
Tracks lesser-used analytics like time-of-day win rate,
scent accuracy, regime accuracy, holding period analysis, etc.
All stats are designed to be backtestable.
"""

import sqlite3
import json
from datetime import datetime
from typing import Optional, List
from dataclasses import dataclass, field


DB_PATH = "trade_box_stats.db"

# Time buckets for time-of-day analysis
TIME_BUCKETS = {
    "Asia":    (0, 6),     # 00:00 - 06:00 UTC
    "London":  (6, 12),    # 06:00 - 12:00 UTC
    "NY":      (12, 18),   # 12:00 - 18:00 UTC
    "Overlap": (14, 16),   # London+NY overlap
    "Overnight": (18, 0),  # 18:00 - 00:00 UTC
}


@dataclass
class TradeRecord:
    """A completed trade stored in the database."""
    id: int = 0
    timestamp: float = 0       # entry time, epoch ms
    exit_timestamp: float = 0  # exit time, epoch ms
    symbol: str = ""
    direction: str = ""        # long / short
    order_type: str = ""       # stop_limit / limit / market
    strategy: str = ""         # which agent
    entry: float = 0
    stop_loss: float = 0
    take_profit: float = 0
    exit_price: float = 0
    pnl: float = 0
    result: str = ""           # win / loss / be / expired
    confidence: float = 0
    bias_at_entry: str = "neutral"  # USDT.D bias when entered
    regime_at_entry: str = "neutral" # market regime when entered
    holding_minutes: float = 0
    risk_reward: float = 0


class ExperimentalStats:
    """
    Tracks experimental statistics for the trading box.
    All queries use the SQLite trade database.
    """

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                exit_timestamp REAL DEFAULT 0,
                symbol TEXT DEFAULT '',
                direction TEXT DEFAULT '',
                order_type TEXT DEFAULT '',
                strategy TEXT DEFAULT '',
                entry REAL DEFAULT 0,
                stop_loss REAL DEFAULT 0,
                take_profit REAL DEFAULT 0,
                exit_price REAL DEFAULT 0,
                pnl REAL DEFAULT 0,
                result TEXT DEFAULT 'open',
                confidence REAL DEFAULT 0,
                bias_at_entry TEXT DEFAULT 'neutral',
                regime_at_entry TEXT DEFAULT 'neutral',
                holding_minutes REAL DEFAULT 0,
                risk_reward REAL DEFAULT 0
            )
        """)
        conn.commit()
        conn.close()

    def record_trade(self, trade: TradeRecord):
        """Store a completed trade."""
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            INSERT INTO trades (timestamp, exit_timestamp, symbol, direction, order_type,
                strategy, entry, stop_loss, take_profit, exit_price, pnl, result,
                confidence, bias_at_entry, regime_at_entry, holding_minutes, risk_reward)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (trade.timestamp, trade.exit_timestamp, trade.symbol, trade.direction,
             trade.order_type, trade.strategy, trade.entry, trade.stop_loss,
             trade.take_profit, trade.exit_price, trade.pnl, trade.result,
             trade.confidence, trade.bias_at_entry, trade.regime_at_entry,
             trade.holding_minutes, trade.risk_reward))
        conn.commit()
        conn.close()

    def get_all_trades(self, min_count: int = 0) -> list:
        conn = sqlite3.connect(self.db_path)
        rows = conn.execute("SELECT * FROM trades WHERE result != 'open' ORDER BY timestamp DESC").fetchall()
        conn.close()
        return rows

    # ── Experimental Stat: Time-of-Day Win Rate ────────────────────────

    def time_of_day_win_rate(self) -> dict:
        """Win rate bucketed by time of day (UTC)."""
        conn = sqlite3.connect(self.db_path)
        rows = conn.execute(
            "SELECT timestamp, result FROM trades WHERE result != 'open'"
        ).fetchall()
        conn.close()

        buckets = {name: {"wins": 0, "total": 0} for name in TIME_BUCKETS}

        for ts, result in rows:
            hour = datetime.utcfromtimestamp(ts / 1000).hour
            for name, (start, end) in TIME_BUCKETS.items():
                if start <= end:
                    if start <= hour < end:
                        buckets[name]["total"] += 1
                        if result == "win":
                            buckets[name]["wins"] += 1
                else:  # overnight wraps
                    if hour >= start or hour < end:
                        buckets[name]["total"] += 1
                        if result == "win":
                            buckets[name]["wins"] += 1

        return {
            name: {
                "win_rate": round(b["wins"] / b["total"] * 100, 1) if b["total"] > 0 else 0,
                "trades": b["total"],
                "wins": b["wins"],
            }
            for name, b in buckets.items()
        }

    # ── Experimental Stat: Scent Accuracy ──────────────────────────────

    def scent_accuracy(self) -> dict:
        """
        Did the USDT.D scent prediction match the trade outcome?
        Bullish scent + long win = correct
        Bearish scent + short win = correct
        """
        conn = sqlite3.connect(self.db_path)
        rows = conn.execute(
            "SELECT bias_at_entry, direction, result FROM trades WHERE result != 'open' AND bias_at_entry != 'neutral'"
        ).fetchall()
        conn.close()

        correct = 0
        total = 0
        bullish_correct = 0
        bullish_total = 0
        bearish_correct = 0
        bearish_total = 0

        for bias, direction, result in rows:
            total += 1
            is_win = result == "win"
            is_correct = (bias == "bullish" and direction == "long") or (bias == "bearish" and direction == "short")

            if is_correct and is_win:
                correct += 1

            if bias == "bullish":
                bullish_total += 1
                if is_correct and is_win:
                    bullish_correct += 1
            else:
                bearish_total += 1
                if is_correct and is_win:
                    bearish_correct += 1

        return {
            "overall_accuracy": round(correct / total * 100, 1) if total > 0 else 0,
            "total_trades": total,
            "bullish_accuracy": round(bullish_correct / bullish_total * 100, 1) if bullish_total > 0 else 0,
            "bearish_accuracy": round(bearish_correct / bearish_total * 100, 1) if bearish_total > 0 else 0,
            "bullish_trades": bullish_total,
            "bearish_trades": bearish_total,
        }

    # ── Experimental Stat: Holding Period Win Rate ────────────────────

    def holding_period_win_rate(self, buckets: list = None) -> dict:
        """Win rate by holding period (minutes)."""
        if buckets is None:
            buckets = [(0, 30), (30, 60), (60, 240), (240, 1440), (1440, 99999)]
        # Labels
        labels = ["0-30m", "30-60m", "1-4h", "4-24h", "1d+"]

        conn = sqlite3.connect(self.db_path)
        rows = conn.execute(
            "SELECT holding_minutes, result FROM trades WHERE result != 'open' AND holding_minutes > 0"
        ).fetchall()
        conn.close()

        result = {}
        for label, (lo, hi) in zip(labels, buckets):
            matching = [(m, r) for m, r in rows if lo <= m < hi]
            wins = sum(1 for _, r in matching if r == "win")
            total = len(matching)
            result[label] = {
                "win_rate": round(wins / total * 100, 1) if total > 0 else 0,
                "trades": total,
            }
        return result

    # ── Experimental Stat: Day of Week ───────────────────────────────

    def day_of_week_win_rate(self) -> dict:
        DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        conn = sqlite3.connect(self.db_path)
        rows = conn.execute(
            "SELECT timestamp, result FROM trades WHERE result != 'open'"
        ).fetchall()
        conn.close()

        counts = {d: {"wins": 0, "total": 0} for d in DAYS}
        for ts, result in rows:
            day = DAYS[datetime.utcfromtimestamp(ts / 1000).weekday()]
            counts[day]["total"] += 1
            if result == "win":
                counts[day]["wins"] += 1

        return {
            d: {
                "win_rate": round(v["wins"] / v["total"] * 100, 1) if v["total"] > 0 else 0,
                "trades": v["total"],
            }
            for d, v in counts.items()
        }

    # ── Experimental Stat: Regime Accuracy ──────────────────────────

    def regime_accuracy(self) -> dict:
        """How often did the director's regime match the trade outcome?"""
        conn = sqlite3.connect(self.db_path)
        rows = conn.execute(
            "SELECT regime_at_entry, direction, result FROM trades WHERE result != 'open' AND regime_at_entry != 'neutral'"
        ).fetchall()
        conn.close()

        # Trending regime: long wins are correct
        # Ranging regime: any direction short-term wins are correct
        # Volatile regime: reversal trades (contrarian) are correct
        # Breakout regime: momentum direction trades are correct
        correct = 0
        total = 0
        by_regime = {}

        for regime, direction, result in rows:
            total += 1
            is_win = result == "win"
            # Simplified: regime matches if direction matches typical regime behavior
            is_correct = is_win  # if it won, the regime was correct

            if is_correct:
                correct += 1

            if regime not in by_regime:
                by_regime[regime] = {"wins": 0, "total": 0}
            by_regime[regime]["total"] += 1
            if is_correct:
                by_regime[regime]["wins"] += 1

        return {
            "overall_accuracy": round(correct / total * 100, 1) if total > 0 else 0,
            "total_trades": total,
            "by_regime": {
                k: {
                    "accuracy": round(v["wins"] / v["total"] * 100, 1),
                    "trades": v["total"],
                }
                for k, v in by_regime.items()
            },
        }

    # ── All Stats Summary ───────────────────────────────────────────

    def get_all_experimental_stats(self) -> dict:
        return {
            "time_of_day": self.time_of_day_win_rate(),
            "scent_accuracy": self.scent_accuracy(),
            "holding_period": self.holding_period_win_rate(),
            "day_of_week": self.day_of_week_win_rate(),
            "regime_accuracy": self.regime_accuracy(),
        }