"""
Tekton Trading Box — USDT.D Bias Tracker
Tracks USDT Dominance to determine market bias.
USDT.D up = money leaving crypto = bearish
USDT.D down = money entering crypto = bullish
"""

import asyncio
from typing import Optional
from datetime import datetime, timedelta

try:
    import ccxt.async_support as ccxt
except ImportError:
    ccxt = None


class USDTDominanceTracker:
    """
    Fetches USDT.D from Binance and determines bullish/bearish bias.
    Triggers scent system on bias changes.
    """

    def __init__(self, threshold: float = 0.5, lookback_hours: int = 4):
        self.threshold = threshold       # % change to count as bias shift
        self.lookback_hours = lookback_hours
        self.current_bias = "neutral"    # bullish / bearish / neutral
        self.usdt_d_value = 0.0
        self.usdt_d_prev = 0.0
        self.usdt_d_change_pct = 0.0
        self.last_update = 0.0
        self.history = []                # [(timestamp, value), ...]
        self.scent_callback = None       # set by main app: scent_callback(bias)

    def set_scent_callback(self, callback):
        """Set the function to call when bias changes. callback(bias: str)"""
        self.scent_callback = callback

    async def fetch_usdt_dominance(self) -> Optional[float]:
        """
        Fetch current USDT market cap dominance.
        Uses Binance total market ticker as proxy:
        USDT.D = USDT market cap / Total crypto market cap

        Simplified: use USDT.D volatility as proxy.
        When USDT pumps relative to BTC, money is fleeing to stablecoins.
        """
        if ccxt is None:
            return None

        exchange = ccxt.binance({"enableRateLimit": True})
        try:
            # Method: compare USDT/USDC pair as proxy for USDT demand
            # Also use total market cap from coin gecko or similar
            # For now: use BTC/USDT orderbook depth imbalance as proxy

            ticker = await exchange.fetch_ticker("BTC/USDT")
            btc_price = ticker["last"]

            # Fetch BTC dominance (inverse of USDT dominance roughly)
            # When BTC.D goes up and USDT.D goes down = bullish
            # When BTC.D goes down and USDT.D goes up = bearish

            # Use a simple proxy: USDT 24h volume relative to BTC
            usdt_ticker = await exchange.fetch_ticker("USDT/USD")
            usdt_price = usdt_ticker.get("last", 1.0)

            # Store history
            now = datetime.now().timestamp() * 1000
            self.history.append((now, usdt_price))
            # Keep last 24 hours
            cutoff = (datetime.now() - timedelta(hours=24)).timestamp() * 1000
            self.history = [(t, v) for t, v in self.history if t > cutoff]

            self.usdt_d_value = usdt_price
            self.last_update = now
            return usdt_price

        except Exception as e:
            print(f"[USDT.D] Fetch error: {e}")
            return None
        finally:
            await exchange.close()

    async def compute_bias(self) -> str:
        """
        Compute current bias from USDT.D change.
        Returns 'bullish', 'bearish', or 'neutral'.
        """
        val = await self.fetch_usdt_dominance()
        if val is None:
            return self.current_bias

        # Get value from lookback period ago
        cutoff = (datetime.now() - timedelta(hours=self.lookback_hours)).timestamp() * 1000
        prev_entries = [(t, v) for t, v in self.history if t <= cutoff]

        if len(prev_entries) == 0:
            self.usdt_d_prev = val
            self.current_bias = "neutral"
            return self.current_bias

        self.usdt_d_prev = prev_entries[-1][1]
        if self.usdt_d_prev == 0:
            return self.current_bias

        self.usdt_d_change_pct = (val - self.usdt_d_prev) / self.usdt_d_prev * 100

        old_bias = self.current_bias

        if self.usdt_d_change_pct > self.threshold:
            new_bias = "bearish"   # USDT.D rising = money leaving crypto
        elif self.usdt_d_change_pct < -self.threshold:
            new_bias = "bullish"   # USDT.D falling = money entering crypto
        else:
            new_bias = "neutral"

        self.current_bias = new_bias

        # Trigger scent on bias CHANGE
        if new_bias != old_bias and self.scent_callback:
            self.scent_callback(new_bias)

        return new_bias

    def get_status(self) -> dict:
        return {
            "bias": self.current_bias,
            "usdt_d_value": self.usdt_d_value,
            "usdt_d_prev": self.usdt_d_prev,
            "change_pct": round(self.usdt_d_change_pct, 3),
            "threshold": self.threshold,
            "lookback_hours": self.lookback_hours,
            "last_update": self.last_update,
        }


# ── Demo Mode ──────────────────────────────────────────────────────────

class DemoUSDTDominance(USDTDominanceTracker):
    """Simulates USDT.D changes for testing without API calls."""

    def __init__(self, threshold: float = 0.5, lookback_hours: int = 4):
        super().__init__(threshold, lookback_hours)
        self._demo_step = 0

    async def fetch_usdt_dominance(self) -> float:
        """Cycle through bullish → neutral → bearish → neutral for demo."""
        import math
        self._demo_step += 1
        # Sinusoidal cycle: peaks every 24 steps
        val = 1.0 + 0.005 * math.sin(self._demo_step * math.pi / 12)
        now = datetime.now().timestamp() * 1000
        self.history.append((now, val))
        cutoff = (datetime.now() - timedelta(hours=24)).timestamp() * 1000
        self.history = [(t, v) for t, v in self.history if t > cutoff]
        self.usdt_d_value = val
        self.last_update = now
        return val