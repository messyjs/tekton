"""
Tekton Trading Box — Main Application
Voice-activated AI trading assistant with olfactory feedback.

Usage:
    python main.py                    # Start with demo data
    python main.py --live              # Start with live Binance data
    python main.py --simulate-scent   # Print scent commands instead of GPIO
"""

import asyncio
import argparse
import signal
import sys
from datetime import datetime

# Add parent to path for imports
sys.path.insert(0, ".")

from software.agents.base_agent import TradingAgent, TradeSetup, MarketData, Direction, OrderType, AgentStats
from software.agents.director import DirectorAgent
from software.indicators.p03_contraction import p03_analyze
from software.indicators.usdt_dominance import USDTDominanceTracker, DemoUSDTDominance
from firmware.scent_controller import ScentController
from software.voice.trade_voice import format_trade_voice, format_trade_explanation, format_trade_dashboard
from software.backtesting.experimental import ExperimentalStats, TradeRecord


# ── Demo Sub-Agents ────────────────────────────────────────────────────

import numpy as np
import pandas as pd


class DemoMomentumAgent(TradingAgent):
    """P03 breakout strategy — trades contraction→expansion squeeze fires."""
    name = "momentum"
    strategy = "P03 Breakout"
    description = "Trades Bollinger Band squeeze fires using stop limit orders"

    def analyze(self, market: MarketData) -> TradeSetup | None:
        p03 = market.indicators.get("p03", {})
        if not p03 or p03.get("phase") not in ("contraction_fire", "contraction"):
            return None

        direction = Direction.LONG if market.bias == "bullish" or p03.get("bullish") else Direction.SHORT
        order_type = OrderType.STOP_LIMIT if p03.get("order_type") == "stop_limit" else OrderType.LIMIT
        atr = market.indicators.get("atr", market.price * 0.02) or market.price * 0.02

        if direction == Direction.LONG:
            entry = market.price + atr * 0.3
            sl = market.price - atr * 0.5
            tp = market.price + atr * 2
        else:
            entry = market.price - atr * 0.3
            sl = market.price + atr * 0.5
            tp = market.price - atr * 2

        return TradeSetup(
            symbol=market.symbol,
            direction=direction,
            order_type=order_type,
            strategy_name=self.strategy,
            entry=round(entry, 2),
            stop_loss=round(sl, 2),
            take_profit=round(tp, 2),
            confidence=70 if p03.get("squeeze_firing") else 40,
            reason_short="Breakout",
            timeframe=market.timeframe,
            agent_name=self.name,
            contraction_expansion=p03.get("phase", "neutral"),
        )


class DemoICTAgent(TradingAgent):
    """ICT order block strategy — precision entries on pullbacks."""
    name = "ict"
    strategy = "ICT Order Blocks"
    description = "Identifies order blocks and fair value gaps for entry"

    def analyze(self, market: MarketData) -> TradeSetup | None:
        p03 = market.indicators.get("p03", {})
        if p03.get("phase") != "expansion":
            return None

        direction = Direction.LONG if market.bias == "bullish" else Direction.SHORT
        ema8 = market.indicators.get("ema_fast", market.price)
        atr = market.indicators.get("atr", market.price * 0.02)

        # Limit entry on pullback to EMA8
        if direction == Direction.LONG and market.price > ema8:
            entry = ema8
            sl = entry - atr * 0.5
            tp = market.price + atr * 1.5
        elif direction == Direction.SHORT and market.price < ema8:
            entry = ema8
            sl = entry + atr * 0.5
            tp = market.price - atr * 1.5
        else:
            return None

        return TradeSetup(
            symbol=market.symbol,
            direction=direction,
            order_type=OrderType.LIMIT,
            strategy_name=self.strategy,
            entry=round(entry, 2),
            stop_loss=round(sl, 2),
            take_profit=round(tp, 2),
            confidence=55,
            reason_short="Pullback",
            timeframe=market.timeframe,
            agent_name=self.name,
            contraction_expansion=p03.get("phase", "neutral"),
        )


class DemoGannAgent(TradingAgent):
    """W.D. Gann SQ9 reversal strategy."""
    name = "gann"
    strategy = "Gann SQ9 Reversal"
    description = "Identifies Gann Square of 9 reversal levels"

    def analyze(self, market: MarketData) -> TradeSetup | None:
        price = market.price
        # Simple SQ9: nearest square root level
        import math
        sqrt_price = math.sqrt(price)
        lower_sq = math.floor(sqrt_price)
        upper_sq = math.ceil(sqrt_price)
        support = lower_sq ** 2
        resistance = upper_sq ** 2

        # Near support → long, near resistance → short
        dist_to_support = (price - support) / price
        dist_to_resist = (resistance - price) / price

        if dist_to_support < 0.01:  # within 1% of Gann support
            direction = Direction.LONG
        elif dist_to_resist < 0.01:
            direction = Direction.SHORT
        else:
            return None

        atr = market.indicators.get("atr", price * 0.02) or price * 0.02

        return TradeSetup(
            symbol=market.symbol,
            direction=direction,
            order_type=OrderType.LIMIT,
            strategy_name=self.strategy,
            entry=round(price, 2),
            stop_loss=round(price - atr * 0.8 if direction == Direction.LONG else price + atr * 0.8, 2),
            take_profit=round(price + atr * 2.5 if direction == Direction.LONG else price - atr * 2.5, 2),
            confidence=45,
            reason_short="Gann Reversal",
            timeframe=market.timeframe,
            agent_name=self.name,
        )


# ── Demo Market Data Generator ─────────────────────────────────────────

def generate_demo_market(symbol: str = "BTC/USDT", price: float = 62000.0) -> MarketData:
    """Generate demo market data with realistic-looking candles."""
    n = 200
    noise = np.random.randn(n) * price * 0.005
    closes = pd.Series(price + np.cumsum(noise))
    highs = closes + abs(np.random.randn(n) * price * 0.003)
    lows = closes - abs(np.random.randn(n) * price * 0.003)
    volumes = pd.Series(np.random.randint(100, 10000, n))

    df = pd.DataFrame({"open": closes.shift(1).fillna(closes.iloc[0]),
                       "high": highs, "low": lows, "close": closes, "volume": volumes})

    p03_result = p03_analyze(df)

    return MarketData(
        symbol=symbol,
        price=float(closes.iloc[-1]),
        timeframe="4H",
        candles=df.to_dict("records")[-50:],
        indicators={
            "p03": p03_result,
            "atr": p03_result["atr"],
            "atr_pct": p03_result["atr_pct"],
            "ema_fast": p03_result["ema_fast"],
            "ema_mid": p03_result["ema_mid"],
            "ema_slow": p03_result["ema_slow"],
            "ema_trend": "bullish" if p03_result["bullish"] else "bearish" if p03_result["bearish"] else "flat",
            "bb_width_pct": p03_result["bb_width"],
        },
        bias="bullish",  # will be overridden by USDT.D tracker
        contraction_expansion=p03_result["phase"],
        volume_profile={},
    )


# ── Main App ────────────────────────────────────────────────────────────

class TektonTradingBox:
    """
    The main trading box application.
    Ties together: voice, agents, indicators, scent, stats, dashboard.
    """

    def __init__(self, simulate_scent: bool = True, live_data: bool = False):
        # Sub-agents
        self.agents = [
            DemoMomentumAgent(),
            DemoICTAgent(),
            DemoGannAgent(),
        ]

        # Director picks the best agent
        self.director = DirectorAgent(self.agents)

        # Scent controller
        self.scent = ScentController(simulation=simulate_scent)

        # USDT.D bias tracker
        if live_data:
            self.bias_tracker = USDTDominanceTracker()
        else:
            self.bias_tracker = DemoUSDTDominance()

        self.bias_tracker.set_scent_callback(self.scent.trigger_bias_change)

        # Experimental stats
        self.stats = ExperimentalStats()

        # State
        self.running = False
        self.last_setup = None

    async def run_analysis_cycle(self):
        """Run one analysis cycle: fetch data, analyze, output."""
        # 1. Update USDT.D bias
        bias = await self.bias_tracker.compute_bias()
        print(f"\n[Bias] USDT.D: {bias} (change: {self.bias_tracker.usdt_d_change_pct:+.3f}%)")

        # 2. Generate market data (demo) or fetch live
        market = generate_demo_market()
        market.bias = bias
        market.contraction_expansion = market.indicators.get("p03", {}).get("phase", "neutral")

        # 3. Ask Director for best trade setup
        result = self.director.select_best(market, min_score=15)

        if result:
            agent, setup, score = result
            voice = format_trade_voice(setup)
            dashboard = format_trade_dashboard(setup)

            print(f"[Director] Best agent: {agent.name} (score: {score})")
            print(f"[Voice]   {voice}")
            print(f"[Details]  Entry ${setup.entry:,.2f} | SL ${setup.stop_loss:,.2f} | TP ${setup.take_profit:,.2f} | RR {setup.risk_reward}")

            # Auto-record to experimental stats
            record = TradeRecord(
                timestamp=setup.timestamp,
                symbol=setup.symbol,
                direction=setup.direction.value,
                order_type=setup.order_type.value,
                strategy=setup.strategy_name,
                entry=setup.entry,
                stop_loss=setup.stop_loss,
                take_profit=setup.take_profit,
                bias_at_entry=bias,
                regime_at_entry=self.director.current_regime,
                risk_reward=setup.risk_reward,
            )
            # Simulate outcome for demo
            import random
            outcome = random.choice(["win", "loss", "win", "win"])  # slightly favorable
            record.result = outcome
            record.pnl = setup.take_profit - setup.entry if outcome == "win" and setup.direction == Direction.LONG else -(setup.entry - setup.stop_loss)
            record.holding_minutes = random.randint(30, 480)
            self.stats.record_trade(record)
            agent.evaluate(setup, outcome, record.pnl)

            self.last_setup = setup
        else:
            print("[Director] No trade setup found — waiting for edge")

        # 4. Print leaderboard
        lb = self.director.get_leaderboard()
        print(f"\n[Leaderboard] Regime: {self.director.current_regime}")
        for entry in lb[:5]:
            print(f"  {entry['name']:12s} | Score: {entry['score']:5.1f} | WR: {entry['win_rate']:5.1f}% | PnL: ${entry['pnl']:+,.2f} | Trades: {entry['total_trades']}")

        # 5. Print experimental stats
        exp_stats = self.stats.get_all_experimental_stats()
        scent_acc = exp_stats["scent_accuracy"]["overall_accuracy"]
        tod = exp_stats["time_of_day"]
        print(f"\n[Experimental] Scent accuracy: {scent_acc}%")
        for bucket, data in tod.items():
            if data["trades"] > 0:
                print(f"  {bucket:10s} | WR: {data['win_rate']:5.1f}% | ({data['trades']} trades)")

    async def run(self, interval: int = 60):
        """Main loop — run analysis every `interval` seconds."""
        self.running = True
        print("=" * 60)
        print("  TEKTON TRADING BOX")
        print("  Voice-activated AI trading assistant with olfactory feedback")
        print("=" * 60)
        print(f"  Agents: {', '.join(a.name for a in self.agents)}")
        print(f"  Scent: {'GPIO' if self.scent.use_gpio else 'Simulation'}")
        print(f"  Bias: {'Live' if isinstance(self.bias_tracker, USDTDominanceTracker) else 'Demo'}")
        print(f"  Interval: {interval}s")
        print("=" * 60)

        # Test scent system on startup
        self.scent.trigger_scent("bullish", 0.2)
        await asyncio.sleep(2)
        self.scent.trigger_scent("bearish", 0.2)

        try:
            while self.running:
                await self.run_analysis_cycle()
                await asyncio.sleep(interval)
        except KeyboardInterrupt:
            print("\n[App] Shutting down...")
        finally:
            self.scent.cleanup()
            print("[App] Clean exit")

    def stop(self):
        self.running = False


def main():
    parser = argparse.ArgumentParser(description="Tekton Trading Box")
    parser.add_argument("--live", action="store_true", help="Use live Binance data")
    parser.add_argument("--simulate-scent", action="store_true", default=True, help="Simulate scent commands (no GPIO)")
    parser.add_argument("--interval", type=int, default=60, help="Analysis interval in seconds")
    args = parser.parse_args()

    box = TektonTradingBox(simulate_scent=args.simulate_scent, live_data=args.live)
    asyncio.run(box.run(interval=args.interval))


if __name__ == "__main__":
    main()