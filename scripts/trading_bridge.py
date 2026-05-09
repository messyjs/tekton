#!/usr/bin/env python3
"""
TradingAgents Bridge — stdin/stdout JSON interface for Tekton.

Tekton calls this as a subprocess. TradingAgents manages its own
internal sub-agents (analysts, researchers, trader, risk team, PM).
DO NOT replicate these roles in Tekton.

Commands:
  analyze  - Run full TradingAgents multi-agent analysis
  history  - Show past analysis results for a ticker
  status   - System health check
  models   - Show current LLM configuration
"""

import json
import os
import sys
import glob
import traceback
from datetime import datetime
from pathlib import Path

# ── Config ──
TRADINGAGENTS_DIR = os.environ.get("TRADINGAGENTS_DIR", "D:/AI Drive/pi-agent/TradingAgents")
RESULTS_DIR = os.environ.get("TRADINGAGENTS_RESULTS_DIR", os.path.join(os.path.expanduser("~"), ".tekton", "messyhedge", "results"))
OLLAMA_BASE_URL = os.environ.get("OLLAMA_CLOUD_URL", os.environ.get("OPENAI_BASE_URL", "http://localhost:11434/v1"))
DEEP_THINK_LLM = os.environ.get("DEEP_THINK_LLM", "deepseek-v4-flash:cloud")
QUICK_THINK_LLM = os.environ.get("QUICK_THINK_LLM", "glm-5.1:cloud")

os.makedirs(RESULTS_DIR, exist_ok=True)
sys.path.insert(0, TRADINGAGENTS_DIR)


def get_config():
    """Build TradingAgents config. All 12 internal sub-agents share these two LLMs."""
    from tradingagents.default_config import DEFAULT_CONFIG
    config = DEFAULT_CONFIG.copy()
    config["llm_provider"] = "ollama_cloud"
    config["deep_think_llm"] = DEEP_THINK_LLM    # Research Manager + Portfolio Manager
    config["quick_think_llm"] = QUICK_THINK_LLM   # All 4 Analysts, Researchers, Trader, Risk team
    config["checkpoint_enabled"] = True
    config["max_debate_rounds"] = 1
    config["max_risk_discuss_rounds"] = 1
    config["backend_url"] = OLLAMA_BASE_URL
    config["data_vendors"] = {
        "core_stock_apis": "yfinance",
        "technical_indicators": "yfinance",
        "fundamental_data": "yfinance",
        "news_data": "yfinance",
    }
    if RESULTS_DIR:
        config["results_dir"] = RESULTS_DIR
    return config


def cmd_analyze(args):
    """Run full TradingAgents analysis. This one call runs ALL 12 internal sub-agents automatically."""
    ticker = args.get("ticker", "").upper().strip()
    date = args.get("date")
    debate_rounds = int(args.get("debate_rounds", 1))
    risk_rounds = int(args.get("risk_rounds", 1))

    if not ticker:
        return {"error": True, "message": "Missing ticker. Usage: {\"command\": \"analyze\", \"ticker\": \"NVDA\"}"}

    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    try:
        from tradingagents.graph.trading_graph import TradingAgentsGraph
    except ImportError as e:
        return {"error": True, "message": f"TradingAgents import failed: {e}", "ticker": ticker}

    config = get_config()
    config["max_debate_rounds"] = debate_rounds
    config["max_risk_discuss_rounds"] = risk_rounds

    # Set API key for Ollama Cloud if available
    api_key = os.environ.get("OLLAMA_API_KEY", os.environ.get("OPENAI_API_KEY", ""))
    if api_key:
        os.environ["OPENAI_API_KEY"] = api_key

    try:
        ta = TradingAgentsGraph(debug=False, config=config)
        final_state, decision = ta.propagate(ticker, date)

        result = {
            "status": "success",
            "ticker": ticker,
            "date": date,
            "decision": str(decision) if decision else "No decision",
            "provider": "ollama",
            "deep_llm": DEEP_THINK_LLM,
            "quick_llm": QUICK_THINK_LLM,
            "timestamp": datetime.now().isoformat(),
        }

        # Extract structured report data from final_state if available
        if isinstance(final_state, dict):
            for key in ["market_report", "sentiment_report", "news_report",
                         "fundamentals_report", "news_report_e", "news_report_l",
                         "trader_investment_plan", "final_trade_decision"]:
                val = final_state.get(key, "")
                if val:
                    result[key] = str(val)[:3000]  # Truncate long reports

            # Try to extract a structured decision object
            if isinstance(decision, dict):
                result["decision_data"] = {k: v for k, v in decision.items() if not k.startswith("_")}
            elif hasattr(decision, "__dict__"):
                result["decision_data"] = {k: v for k, v in vars(decision).items() if not k.startswith("_")}

        # Save result
        filename = os.path.join(RESULTS_DIR, f"{ticker}_{date}_{datetime.now().strftime('%H%M%S')}.json")
        with open(filename, "w") as f:
            json.dump(result, f, indent=2, default=str)

        return result

    except Exception as e:
        return {
            "error": True,
            "ticker": ticker,
            "message": str(e),
            "traceback": traceback.format_exc()[-2000:],
        }


def cmd_history(args):
    """Show past analysis results for a ticker."""
    ticker = args.get("ticker", "").upper().strip()
    limit = int(args.get("limit", 10))

    pattern = os.path.join(RESULTS_DIR, f"{ticker}_*.json") if ticker else os.path.join(RESULTS_DIR, "*.json")
    files = sorted(glob.glob(pattern), reverse=True)[:limit]

    if not files:
        return {"ticker": ticker, "results": [], "message": "No past analyses found"}

    results = []
    for f in files:
        try:
            with open(f) as fh:
                data = json.load(fh)
                results.append({
                    "file": os.path.basename(f),
                    "ticker": data.get("ticker", "?"),
                    "date": data.get("date", "?"),
                    "decision": str(data.get("decision", "?"))[:200],
                    "timestamp": data.get("timestamp", "?"),
                    "error": data.get("error", False),
                })
        except Exception:
            pass

    return {"ticker": ticker or "ALL", "results": results, "count": len(results)}


def cmd_status(args):
    """System health check."""
    result = {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "config": {
            "deep_think_llm": DEEP_THINK_LLM,
            "quick_think_llm": QUICK_THINK_LLM,
            "provider": "ollama",
            "base_url": OLLAMA_BASE_URL,
            "debate_rounds": 1,
            "risk_rounds": 1,
            "checkpoint_enabled": True,
            "tradingagents_dir": TRADINGAGENTS_DIR,
            "results_dir": RESULTS_DIR,
        },
    }

    # Check TradingAgents import
    try:
        from tradingagents.graph.trading_graph import TradingAgentsGraph
        result["tradingagents"] = {"installed": True, "version": "0.2.4"}
    except ImportError:
        result["tradingagents"] = {"installed": False, "error": "Cannot import TradingAgentsGraph"}

    # Check Ollama connectivity
    try:
        import urllib.request
        req = urllib.request.Request(OLLAMA_BASE_URL.rstrip("/v1") + "/api/tags", method="GET")
        if os.environ.get("OLLAMA_API_KEY"):
            req.add_header("Authorization", f"Bearer {os.environ['OLLAMA_API_KEY']}")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            models = [m.get("name", "?") for m in data.get("models", [])]
            result["ollama"] = {
                "connected": True,
                "models_count": len(models),
                "has_deep_think": any(DEEP_THINK_LLM.split(":")[0] in m for m in models),
                "has_quick_think": any(QUICK_THINK_LLM.split(":")[0] in m for m in models),
            }
    except Exception as e:
        result["ollama"] = {"connected": False, "error": str(e)[:200]}

    return result


def cmd_models(args):
    """Show current LLM configuration."""
    return {
        "deep_think": {"model": DEEP_THINK_LLM, "provider": "ollama", "base_url": OLLAMA_BASE_URL},
        "quick_think": {"model": QUICK_THINK_LLM, "provider": "ollama", "base_url": OLLAMA_BASE_URL},
        "data_vendors": {"all": "yfinance"},
        "checkpoint_enabled": True,
    }


COMMANDS = {
    "analyze": cmd_analyze,
    "history": cmd_history,
    "status": cmd_status,
    "models": cmd_models,
}


def main():
    try:
        raw = sys.stdin.read()
        request = json.loads(raw.strip() or "{}")
    except json.JSONDecodeError as e:
        print(json.dumps({"error": True, "message": f"Invalid JSON: {e}"}))
        sys.exit(1)

    command = request.get("command", "status")
    handler = COMMANDS.get(command)

    if not handler:
        print(json.dumps({
            "error": True,
            "message": f"Unknown command: {command}. Available: {', '.join(COMMANDS.keys())}"
        }))
        sys.exit(1)

    result = handler(request)

    try:
        output = json.dumps(result, default=str, ensure_ascii=False)
    except TypeError:
        output = json.dumps({"error": True, "message": "Result serialization failed"}, ensure_ascii=False)

    print(output)


if __name__ == "__main__":
    main()