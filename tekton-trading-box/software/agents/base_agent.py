"""
Tekton Trading Box — Base Trading Agent Interface
All sub-agents implement this interface and compete for best trade setups.
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
from datetime import datetime


class OrderType(str, Enum):
    STOP_LIMIT = "stop_limit"
    LIMIT = "limit"
    MARKET = "market"


class Direction(str, Enum):
    LONG = "long"
    SHORT = "short"


class TradeResult(str, Enum):
    WIN = "win"        # Hit TP
    LOSS = "loss"      # Hit SL
    BREAKEVEN = "be"   # Closed at entry
    OPEN = "open"      # Still active
    EXPIRED = "expired" # Timed out without hit


@dataclass
class TradeSetup:
    """A concrete trade recommendation with entry, stop, target."""
    symbol: str
    direction: Direction
    order_type: OrderType
    strategy_name: str
    entry: float
    stop_loss: float
    take_profit: float
    confidence: float = 0.0       # 0-100
    reason_short: str = ""        # e.g. "BTC Breakout trade"
    timeframe: str = "4H"
    risk_reward: float = 0.0      # computed from entry/SL/TP
    agent_name: str = ""          # which sub-agent generated this
    timestamp: float = 0.0        # epoch ms
    contraction_expansion: str = "neutral"  # from P03

    def __post_init__(self):
        if self.risk_reward == 0:
            risk = abs(self.entry - self.stop_loss)
            reward = abs(self.take_profit - self.entry)
            self.risk_reward = round(reward / risk, 2) if risk > 0 else 0
        if self.timestamp == 0:
            self.timestamp = datetime.now().timestamp() * 1000

    def to_voice(self) -> str:
        """Format as concise voice output."""
        # "BTC Breakout trade, stop limit Long at $60,000, SL $59,990, TP $60,200"
        direction = "long" if self.direction == Direction.LONG else "short"
        order = "stop limit" if self.order_type == OrderType.STOP_LIMIT else "limit"
        return (f"{self.symbol} {self.reason_short} trade, "
                f"{order} {direction} at ${self.entry:,.0f}, "
                f"SL ${self.stop_loss:,.0f}, TP ${self.take_profit:,.0f}")

    def to_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "direction": self.direction.value,
            "order_type": self.order_type.value,
            "strategy_name": self.strategy_name,
            "entry": self.entry,
            "stop_loss": self.stop_loss,
            "take_profit": self.take_profit,
            "confidence": self.confidence,
            "reason_short": self.reason_short,
            "timeframe": self.timeframe,
            "risk_reward": self.risk_reward,
            "agent_name": self.agent_name,
            "timestamp": self.timestamp,
            "contraction_expansion": self.contraction_expansion,
        }


@dataclass
class MarketData:
    """Market data snapshot fed to agents."""
    symbol: str
    price: float
    timeframe: str = "4H"
    candles: list = field(default_factory=list)      # OHLCV list
    indicators: dict = field(default_factory=dict)     # computed indicator values
    usdt_d_change: float = 0.0       # USDT.D 4H change %
    bias: str = "neutral"            # bullish / bearish / neutral
    contraction_expansion: str = "neutral"  # from P03
    volume_profile: dict = field(default_factory=dict)


@dataclass
class AgentStats:
    """Performance tracking for a sub-agent."""
    name: str
    strategy: str
    total_trades: int = 0
    wins: int = 0
    losses: int = 0
    breakevens: int = 0
    pnl: float = 0.0
    sharpe: float = 0.0
    regime_accuracy: float = 0.0   # how often correct for market regime
    last_active: float = 0.0

    @property
    def win_rate(self) -> float:
        closed = self.wins + self.losses + self.breakevens
        return round(self.wins / closed * 100, 1) if closed > 0 else 0.0

    @property
    def qualified(self) -> bool:
        """Min 10 trades before director considers this agent."""
        return self.total_trades >= 10

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "strategy": self.strategy,
            "total_trades": self.total_trades,
            "wins": self.wins,
            "losses": self.losses,
            "pnl": round(self.pnl, 2),
            "win_rate": self.win_rate,
            "sharpe": round(self.sharpe, 2),
            "regime_accuracy": round(self.regime_accuracy, 1),
            "qualified": self.qualified,
        }


class TradingAgent:
    """Base class for all trading sub-agents."""

    name: str = "base"
    strategy: str = "base"
    description: str = "Base agent — override in subclass"

    def __init__(self):
        self.stats = AgentStats(name=self.name, strategy=self.strategy)

    def analyze(self, market: MarketData) -> Optional[TradeSetup]:
        """
        Analyze market data and return a trade setup, or None if no edge found.
        Override this in each sub-agent.
        """
        raise NotImplementedError

    def evaluate(self, setup: TradeSetup, result: TradeResult, pnl: float = 0.0):
        """Learn from trade outcome — update stats."""
        self.stats.total_trades += 1
        if result == TradeResult.WIN:
            self.stats.wins += 1
            self.stats.pnl += pnl
        elif result == TradeResult.LOSS:
            self.stats.losses += 1
            self.stats.pnl += pnl  # pnl is negative for losses
        elif result == TradeResult.BREAKEVEN:
            self.stats.breakevens += 1
        self.stats.last_active = datetime.now().timestamp() * 1000

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "strategy": self.strategy,
            "description": self.description,
            "stats": self.stats.to_dict(),
        }