"""
Tekton Trading Box — Director Agent
Picks the best sub-agent for the current market regime.
Scores agents by win_rate, sharpe, and regime fitness.
"""

from typing import Optional, List
from .base_agent import TradingAgent, TradeSetup, MarketData, Direction, OrderType


class DirectorAgent:
    """
    The Director evaluates all sub-agents and picks the one
    best suited for the current market regime.

    Scoring weights:
      - win_rate: 40%  (historical accuracy)
      - sharpe:   30%  (risk-adjusted returns)
      - regime:   30%  (fit for current market type)

    Regime mapping:
      - trending  → momentum, casper (trend followers)
      - ranging   → geo, meanrev (range traders)
      - volatile  → gann, ict (reversal/precision)
      - breakout  → momentum (P03 contraction detected)
    """

    REGIME_AGENT_FIT = {
        "trending":  {"momentum": 1.0, "casper": 0.9, "gann": 0.5, "ict": 0.6, "geo": 0.3, "quant": 0.4, "meanrev": 0.2},
        "ranging":   {"geo": 1.0, "meanrev": 0.9, "quant": 0.8, "ict": 0.5, "gann": 0.4, "casper": 0.2, "momentum": 0.1},
        "volatile":  {"gann": 1.0, "ict": 0.9, "quant": 0.6, "casper": 0.4, "momentum": 0.5, "geo": 0.3, "meanrev": 0.3},
        "breakout":  {"momentum": 1.0, "casper": 0.7, "ict": 0.6, "gann": 0.5, "geo": 0.2, "quant": 0.3, "meanrev": 0.1},
    }

    def __init__(self, agents: List[TradingAgent]):
        self.agents = agents
        self.current_regime = "neutral"

    def detect_regime(self, market: MarketData) -> str:
        """
        Detect current market regime from indicator data.
        Uses P03 contraction/expansion, trend, and volatility.
        """
        # P03 contraction = breakout regime
        if market.contraction_expansion == "contraction":
            return "breakout"

        # P03 expansion + trend = trending regime
        if market.contraction_expansion == "expansion":
            ema_trend = market.indicators.get("ema_trend", "flat")
            if ema_trend == "bullish" or ema_trend == "bearish":
                return "trending"
            return "volatile"

        # High ATR = volatile
        atr_pct = market.indicators.get("atr_pct", 0)
        if atr_pct > 0.03:  # ATR > 3% of price
            return "volatile"

        # Low ATR + range = ranging
        bb_width = market.indicators.get("bb_width_pct", 0)
        if bb_width < 2.0 and atr_pct < 0.015:
            return "ranging"

        return "ranging"  # default

    def score_agent(self, agent: TradingAgent, regime: str) -> float:
        """
        Score an agent for the given market regime.
        Returns 0-100 composite score.
        """
        if not agent.stats.qualified:
            return 0.0  # Not enough trades yet

        # Win rate component (0-40 points)
        win_rate_score = agent.stats.win_rate * 0.4

        # Sharpe component (0-30 points, cap at 3.0 sharpe)
        sharpe_score = min(abs(agent.stats.sharpe), 3.0) / 3.0 * 30

        # Regime fit component (0-30 points)
        agent_name = agent.name.lower()
        regime_fit = self.REGIME_AGENT_FIT.get(regime, {}).get(agent_name, 0.3)
        regime_score = regime_fit * 30

        return round(win_rate_score + sharpe_score + regime_score, 1)

    def select_best(
        self,
        market: MarketData,
        min_score: float = 20.0,
    ) -> Optional[tuple]:
        """
        Return (agent, setup, score) for the best trade, or None.
        Only returns if score exceeds min_score threshold.
        """
        self.current_regime = self.detect_regime(market)

        best = None  # (agent, setup, score)
        for agent in self.agents:
            score = self.score_agent(agent, self.current_regime)
            if score < min_score:
                continue

            # Ask the agent for a trade setup
            try:
                setup = agent.analyze(market)
            except Exception as e:
                print(f"[Director] Agent {agent.name} failed: {e}")
                continue

            if setup is None:
                continue  # Agent has no edge right now

            # Boost score by agent confidence
            adjusted_score = score + setup.confidence * 0.1

            if best is None or adjusted_score > best[2]:
                best = (agent, setup, adjusted_score)

        if best:
            best[1].agent_name = best[0].name
            return best
        return None

    def get_leaderboard(self) -> list:
        """Return agents sorted by score for current regime."""
        entries = []
        for agent in self.agents:
            score = self.score_agent(agent, self.current_regime)
            entries.append({
                "name": agent.name,
                "strategy": agent.strategy,
                "score": score,
                "win_rate": agent.stats.win_rate,
                "pnl": round(agent.stats.pnl, 2),
                "qualified": agent.stats.qualified,
                "total_trades": agent.stats.total_trades,
            })
        return sorted(entries, key=lambda x: x["score"], reverse=True)

    def to_dict(self) -> dict:
        return {
            "regime": self.current_regime,
            "agent_count": len(self.agents),
            "leaderboard": self.get_leaderboard(),
        }