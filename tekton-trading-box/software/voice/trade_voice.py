"""
Tekton Trading Box — Trade Voice Formatter
Formats trade setups as concise spoken output.
No lengthy explanations unless user asks "explain".
"""

from software.agents.base_agent import TradeSetup, Direction, OrderType


def format_trade_voice(setup: TradeSetup) -> str:
    """
    Format a trade setup as a concise voice string.
    Example: "BTC Breakout trade, stop limit Long at $60,000, SL $59,990, TP $60,200"
    """
    return setup.to_voice()


def format_trade_dashboard(setup: TradeSetup) -> dict:
    """Format for dashboard display (more detail)."""
    return {
        "voice": setup.to_voice(),
        "symbol": setup.symbol,
        "direction": setup.direction.value,
        "order_type": setup.order_type.value,
        "entry": setup.entry,
        "stop_loss": setup.stop_loss,
        "take_profit": setup.take_profit,
        "risk_reward": setup.risk_reward,
        "confidence": setup.confidence,
        "strategy": setup.strategy_name,
        "agent": setup.agent_name,
        "reason": setup.reason_short,
        "timeframe": setup.timeframe,
        "phase": setup.contraction_expansion,
    }


def format_trade_explanation(setup: TradeSetup, market_context: dict = None) -> str:
    """
    Longer explanation when user says "Hey Tekton, explain last trade".
    """
    direction = "long" if setup.direction == Direction.LONG else "short"
    order = "stop limit" if setup.order_type == OrderType.STOP_LIMIT else "limit"
    rr = setup.risk_reward

    parts = [
        f"{setup.symbol} {setup.reason_short} trade.",
        f"Direction: {direction}.",
        f"Order type: {order}.",
        f"Entry at ${setup.entry:,.0f}.",
        f"Stop loss at ${setup.stop_loss:,.0f}.",
        f"Take profit at ${setup.take_profit:,.0f}.",
        f"Risk to reward ratio: {rr} to 1.",
        f"Confidence: {setup.confidence} percent.",
    ]

    if market_context:
        bias = market_context.get("bias", "neutral")
        if bias != "neutral":
            parts.append(f"Market bias: {bias}, based on USDT dominance.")
        phase = market_context.get("contraction_expansion", "neutral")
        if phase != "neutral":
            parts.append(f"Volatility phase: {phase}.")

    return " ".join(parts)