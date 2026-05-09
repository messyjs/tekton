#!/usr/bin/env python3
"""
Strategy Extractor — Uses LLM to extract detailed trading strategies from transcripts.
Produces structured strategies with timeframe categories (scalp/day/swing).
Uses glm-5.1:cloud or deepseek-v4-flash:cloud via Ollama.
"""

import json
import os
import sys
import urllib.request
from typing import List, Dict, Optional
from pathlib import Path

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("STRATEGY_MODEL", "deepseek-v4-flash:cloud")

STRATEGY_PROMPT = """You are a trading strategy extraction expert. Analyze the following YouTube transcript from a trader and extract ALL distinct trading strategies they mention or demonstrate.

For EACH strategy, provide:
1. **name**: A concise strategy name (e.g., "Trendline Break & Reverse", "VWAP Bounce Entry")
2. **category**: One of: "scalp" (1-5min), "intraday" (5min-4H), "swing" (daily+), "universal" (works on all)
3. **timeframes**: Primary and confirmation timeframes (e.g., "5m entry, 1h trendline")
4. **entry_rules**: Numbered list of specific entry conditions
5. **exit_rules**: When to exit (take profit, stop loss, trailing)
6. **risk_management**: Position sizing, max risk per trade, etc.
7. **win_condition**: What confirms the trade is working
8. **invalidation**: What invalidates the setup
9. **quotes**: 2-3 direct quotes from the transcript that describe this strategy

Be SPECIFIC. Use the trader's own words. Don't genericize — capture their exact methodology.
If the trader mentions multiple setups (e.g., a break setup and a bounce setup), list them separately.
If they trade different instruments, note which instruments each strategy applies to.

OUTPUT FORMAT: JSON array of strategy objects.

TRANSCRIPT:
"""

def extract_strategies_llm(transcript_text: str, engine_id: str, engine_name: str) -> List[Dict]:
    """Use LLM to extract strategies from a transcript."""
    # Truncate to fit context (most models handle 4-8K well)
    truncated = transcript_text[:6000]
    
    prompt = STRATEGY_PROMPT + f"\nTrader: {engine_name} ({engine_id})\n\n{truncated}\n\nExtract strategies:"
    
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": "You extract trading strategies from transcripts. Output valid JSON only."},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1, "num_predict": 2000}
    }
    
    try:
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/chat",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode())
            content = data.get("message", {}).get("content", "")
            
            # Try to parse JSON from the response
            # Sometimes the model wraps it in ```json blocks
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            strategies = json.loads(content)
            if isinstance(strategies, dict) and "strategies" in strategies:
                strategies = strategies["strategies"]
            if not isinstance(strategies, list):
                strategies = [strategies]
            
            return strategies
    except Exception as e:
        print(f"LLM extraction error: {e}")
        return []


def extract_strategies_rule_based(transcript_text: str, engine_id: str) -> List[Dict]:
    """Fallback: rule-based strategy extraction (zero tokens)."""
    import re
    text_lower = transcript_text.lower()
    strategies = []
    
    # Trendline strategies
    if "trend line" in text_lower or "trendline" in text_lower:
        strategies.append({
            "name": "Trendline Break & Reverse",
            "category": "universal",
            "timeframes": "5m entry, 1h trendline",
            "entry_rules": [
                "Wait for candle close beyond trendline",
                "Action line = crossed trendline, Safety line = opposing trendline",
                "Reverse position when safety line breaks"
            ],
            "exit_rules": ["Exit when opposing trendline breaks"],
            "risk_management": "1-3% of capital per trade",
            "source": "rule_based"
        })
    
    # Bounce strategies
    if "bounce" in text_lower and ("support" in text_lower or "resistance" in text_lower or "line" in text_lower):
        strategies.append({
            "name": "Trendline Bounce Entry",
            "category": "universal", 
            "timeframes": "5m entry, 1h trendline",
            "entry_rules": [
                "Price respects trendline (2+ touches)",
                "Enter on bounce with safety line on other side"
            ],
            "exit_rules": ["Exit when trendline breaks"],
            "risk_management": "1-3% max risk",
            "source": "rule_based"
        })
    
    return strategies


def extract_and_save(transcript_path: str, engine_id: str, engine_name: str, use_llm: bool = True) -> List[Dict]:
    """Extract strategies from a transcript file and save."""
    with open(transcript_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    strategies = []
    
    # Try LLM first
    if use_llm:
        strategies = extract_strategies_llm(text, engine_id, engine_name)
    
    # Fallback to rule-based
    if not strategies:
        strategies = extract_strategies_rule_based(text, engine_id)
    
    # Save strategies
    output_dir = Path(r"D:\AI Drive\library\engines") / engine_id / "strategies"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    vid = Path(transcript_path).stem
    output_path = output_dir / f"{vid}_strategies.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "engine_id": engine_id,
            "engine_name": engine_name,
            "video_id": vid,
            "strategies": strategies,
            "source": "llm" if use_llm and strategies else "rule_based"
        }, f, indent=2)
    
    return strategies


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python strategy_extractor.py <transcript_path> <engine_id> [--no-llm]")
        sys.exit(1)
    
    transcript_path = sys.argv[1]
    engine_id = sys.argv[2]
    use_llm = "--no-llm" not in sys.argv
    
    engine_names = {
        "gann": "W.D. Gann", "casper": "Jayson Casper", "rumors": "The Rumors",
        "geo": "Trader Geo", "ict": "ICT / Smart Money", "mj": "Messy Jesse",
        "franky": "Frankie Candles", "cryptoface": "CryptoFace",
        "buffett": "Warren Buffett", "quant": "Aaron/QuantCrawler", "tori": "Tori Trades"
    }
    
    engine_name = engine_names.get(engine_id, engine_id)
    strategies = extract_and_save(transcript_path, engine_id, engine_name, use_llm)
    
    print(f"Extracted {len(strategies)} strategies:")
    for s in strategies:
        print(f"  - {s.get('name', 'Unknown')} ({s.get('category', '?')})")
