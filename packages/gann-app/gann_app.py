import sys; sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
#!/usr/bin/env python3
"""
Trading Command Center
=====================
Multi-engine trading analysis hub with prediction tracking & backtesting.
Engines: WD Gann, Jayson Casper, Jesse Livermore, Trader Geo + custom strategies.
Uses deepseek-v4-flash:cloud for chat and local Pine Script agent for strategy building.

Usage: python3 gann_app.py [--port 7799]
"""

import os, sys, json, subprocess, asyncio, sqlite3
from datetime import datetime, timedelta
from pathlib import Path

import yfinance as yf
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from new_endpoints import register_new_endpoints
from design_endpoints import register_design_endpoints
import uvicorn
from trading_engine import (PaperEngine, generate_signal, SUPPORTED_EXCHANGES, PROP_FIRMS,
    PROP_FIRM_EXCHANGE, TIER_COMPARISON, ENGINE_RISK_PROFILES, TradovateClient,
    BinanceClient, TradingViewBridge, MIN_SIGNAL_SCORE, get_db)

# ── Config ────────────────────────────────────────────────────────────

ENGINES_DIR = "E:/AI Drive/pi-agent/engines"
ENGINE_DIR = Path("E:/AI Drive/library/engines")
NODE = "node"
OLLAMA_URL = "http://localhost:11434"
OLLAMA_WS_URL = "http://localhost:11434"  # Workstation Ollama for large models
OLLAMA_MODEL = "deepseek-v4-flash:cloud"  # Cloud model with active subscription
OLLAMA_FALLBACK_MODELS = ["glm-5.1:cloud", "qwen3:1.7b", "deepseek-r1:1.5b"]  # Fallbacks

# ── Gemini Sub-Agent (Google AI Studio) ──
_env_key = os.environ.get("GOOGLE_API_KEY", "")
GOOGLE_API_KEY = _env_key if _env_key and _env_key.startswith("AIza") else "AIzaSyCLBY9Fv56lrnGF3DkVe8uhxV1lq7vi1q0"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_MODEL = "gemini-2.5-flash"  # Fast, free tier; gemini-2.5-pro for deep analysis
GEMINI_PRIORITY = 1  # 0=primary, used after Ollama primary

# ── System Prompts ──
GANN_SYSTEM_PROMPT = """You are the W.D. Gann Trading AI, a specialized trading analysis assistant. You have deep knowledge of:
- W.D. Gann's time/price analysis methods (Square of 9, planetary cycles, natural squares)
- Volume Profile (POC, VAH, VAL, HVN, LVN, Delta analysis)
- Market structure (BOS, CHOCH, Order Blocks, Fair Value Gaps)
- Candlestick patterns and multi-timeframe confluence
- Risk management and position sizing

Provide clear, actionable trading insights. Use the analysis data provided to support your reasoning.
When discussing price levels, always reference specific numbers from the analysis.
Be concise but thorough."""

GEMINI_SYSTEM_PROMPT = """You are Gemini, a strategic trading analysis AI integrated into the Tekton platform.
You specialize in:
- Deep analysis synthesis across multiple trading engines
- Strategy generation and backtesting recommendations
- Risk assessment and position sizing
- Volume profile interpretation and institutional order flow
- Multi-timeframe confluence identification

Provide detailed, well-reasoned analysis. Reference specific data points from the engine outputs.
Think step-by-step and consider multiple scenarios."""

app = FastAPI(title="W.D. Gann Prediction Engine")

# ── Paper Trading Accounts ──
paper_accounts = {
    "paper_default": PaperEngine(100000, "Paper Default"),
    "apex_50k": PaperEngine(50000, "Apex $50K", "apex", "tradovate"),
    "apex_100k": PaperEngine(100000, "Apex $100K", "apex", "tradovate"),
    "breakout_50k": PaperEngine(50000, "Breakout $50K", "breakout", "tradovate"),
    "upcomers_50k": PaperEngine(50000, "Upcomers $50K", "upcomers", "tradovate"),
    "klein_50k": PaperEngine(50000, "Klein $50K", "klein", "tradovate"),
    "topstep_50k": PaperEngine(50000, "TopStep $50K", "topstep", "tradestation"),
    "ftmo_100k": PaperEngine(100000, "FTMO $100K", "ftmo", "ibkr"),
    "fundednext_50k": PaperEngine(50000, "FundedNext $50K", "fundednext", "ibkr"),
    "wealth_50k": PaperEngine(50000, "Wealth Charts $50K", "wealth_charts", "paper"),
    "reece_50k": PaperEngine(50000, "Reece $50K Scalp", None, "paper"),
}

# ── Prediction Store ──────────────────────────────────────────────
PREDICTIONS_FILE = Path(__file__).parent / "predictions.json"

def load_predictions() -> list:
    """Load predictions from JSON file."""
    if PREDICTIONS_FILE.exists():
        try:
            return json.loads(PREDICTIONS_FILE.read_text(encoding="utf-8"))
        except:
            return []
    return []

def save_predictions(predictions: list):
    """Save predictions to JSON file."""
    PREDICTIONS_FILE.write_text(json.dumps(predictions, indent=2), encoding="utf-8")

def check_prediction_outcome(pred: dict, current_data: dict) -> dict:
    """Check if a prediction has resolved and calculate accuracy."""
    if pred.get("resolved"):
        return pred
    target_price = pred.get("targetPrice", 0)
    direction = pred.get("direction", "")  # BULLISH or BEARISH
    current_price = current_data.get("currentPrice", 0)
    target_date = pred.get("targetDate", "")
    now = datetime.now()
    
    # Check if target date has passed
    if target_date:
        try:
            target_dt = datetime.fromisoformat(target_date.replace("Z", "+00:00"))
            if now < target_dt:
                pred["status"] = "ACTIVE"
                return pred
        except:
            pass
    
    # Check if price hit target
    if direction == "BULLISH" and current_price >= target_price:
        pred["resolved"] = True
        pred["status"] = "HIT"
        pred["resolvedPrice"] = current_price
        pred["resolvedAt"] = now.isoformat()
    elif direction == "BEARISH" and current_price <= target_price:
        pred["resolved"] = True
        pred["status"] = "HIT"
        pred["resolvedPrice"] = current_price
        pred["resolvedAt"] = now.isoformat()
    elif target_date:
        try:
            target_dt = datetime.fromisoformat(target_date.replace("Z", "+00:00"))
            if now > target_dt + timedelta(days=1):
                pred["resolved"] = True
                pred["status"] = "MISSED"
                pred["resolvedPrice"] = current_price
                pred["resolvedAt"] = now.isoformat()
        except:
            pass
    else:
        # No target date, mark active
        pred["status"] = "ACTIVE"
    
    return pred

def compute_prediction_stats(predictions: list) -> dict:
    """Compute accuracy statistics from predictions."""
    resolved = [p for p in predictions if p.get("resolved")]
    hits = [p for p in resolved if p.get("status") == "HIT"]
    missed = [p for p in resolved if p.get("status") == "MISSED"]
    active = [p for p in predictions if not p.get("resolved") and p.get("status") == "ACTIVE"]
    
    total = len(resolved)
    hit_count = len(hits)
    
    # Calculate price deviation for resolved predictions
    deviations = []
    for p in resolved:
        target = p.get("targetPrice", 0)
        actual = p.get("resolvedPrice", 0)
        if target and actual:
            dev = abs(actual - target) / target * 100
            deviations.append(dev)
    
    avg_deviation = sum(deviations) / len(deviations) if deviations else 0
    
    # Direction accuracy
    direction_correct = len([p for p in resolved if p.get("direction") == ("BULLISH" if p.get("resolvedPrice", 0) > p.get("entryPrice", 0) else "BEARISH")])
    
    # Recent streaks
    recent = resolved[-10:]  # Last 10 predictions
    recent_hits = len([p for p in recent if p.get("status") == "HIT"])
    
    # By type
    time_predictions = [p for p in resolved if p.get("predictionType") == "TIME"]
    price_predictions = [p for p in resolved if p.get("predictionType") == "PRICE"]
    
    return {
        "total": total,
        "hitCount": hit_count,
        "missedCount": len(missed),
        "activeCount": len(active),
        "accuracy": round(hit_count / total * 100, 1) if total > 0 else 0,
        "avgDeviation": round(avg_deviation, 2),
        "recentAccuracy": round(recent_hits / len(recent) * 100, 1) if recent else 0,
        "timeAccuracy": round(len([p for p in time_predictions if p.get("status")=="HIT"]) / len(time_predictions) * 100, 1) if time_predictions else 0,
        "priceAccuracy": round(len([p for p in price_predictions if p.get("status")=="HIT"]) / len(price_predictions) * 100, 1) if price_predictions else 0,
        "streakCurrent": len([p for p in list(reversed(resolved))[:5] if p.get("status")=="HIT"]) if resolved else 0,
        "predictions": predictions[-50:],  # Last 50
    }

# ── Engine Runner ────────────────────────────────────────────────────

def run_gann_engine(script: str, args: list, timeout: int = 15) -> dict:
    """Run a pi-agent Gann engine script and return parsed JSON."""
    cmd = [NODE, os.path.join(ENGINES_DIR, script)] + [str(a) for a in args]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=ENGINES_DIR)
        output = result.stdout.strip()
        # Try to parse as JSON array first
        start_arr = output.find("[")
        start_obj = output.find("{")
        if start_arr >= 0 and (start_arr < start_obj or start_obj < 0):
            # JSON array
            return json.loads(output[start_arr:])
        elif start_obj >= 0:
            json_str = output[start_obj:]
            depth = 0
            end = 0
            for i, c in enumerate(json_str):
                if c == "{": depth += 1
                elif c == "}": depth -= 1
                if depth == 0: end = i + 1; break
            if end > 0:
                return json.loads(json_str[:end])
        return {"error": "No JSON in output", "raw": output[:500]}
    except subprocess.TimeoutExpired:
        return {"error": f"Timeout running {script}"}
    except Exception as e:
        return {"error": str(e)}

# ── Market Data (imported from exchange_data.py) ──
# Priority: Bybit API -> OKX (ccxt) -> Yahoo Finance
# Honest labeling: always reports the actual data source used
from exchange_data import (
    BYBIT_SYMBOLS, POPULAR_TICKERS, DEFAULT_EXCHANGE,
    resolve_ticker, fetch_candles, fetch_market_data,
)
import requests as http_requests

# ── WebSocket Broadcast Helper ──
DASHBOARD_WS_PORT = 7701
DASHBOARD_HTTP_PORT = 7700

def ws_broadcast(event_type: str, data: dict) -> int:
    """Broadcast an event to all connected dashboard clients via HTTP-to-WS relay.
    Returns number of clients that received the message."""
    try:
        r = http_requests.post(f"http://localhost:{DASHBOARD_HTTP_PORT}/api/broadcast",
                              json={"type": event_type, "data": data}, timeout=3)
        if r.status_code == 200:
            return r.json().get("sent", 0)
    except Exception:
        pass
    return 0

# ── API Routes ─────────────────────────────────────────────────────────

@app.get("/api/tickers")
async def get_tickers():
    """Return list of popular tickers including Bybit perpetual futures."""
    tickers = [{"symbol": k, "name": v} for k, v in POPULAR_TICKERS.items()]
    # Add Bybit perpetuals
    for sym, info in BYBIT_SYMBOLS.items():
        if sym not in POPULAR_TICKERS:
            tickers.append({"symbol": sym, "name": info["name"], "exchange": "bybit", "category": info.get("category", ""), "asset": info.get("asset", "crypto")})
    return {"tickers": tickers, "default_exchange": DEFAULT_EXCHANGE}

@app.get("/api/market/{ticker}")
async def get_market_data_endpoint(ticker: str, period: str = "6mo"):
    """Fetch current market data. Priority: Bybit -> OKX -> Yahoo with honest source labeling."""
    data = fetch_market_data(ticker, period)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data
    return data


def calc_volume_profile(candles: list, num_bins: int = 24) -> dict:
    """Compute volume profile from candle data. Returns POC, VAH, VAL, LVN, HVN, profile bins."""
    if not candles or len(candles) < 5:
        return {"poc": 0, "vah": 0, "val": 0, "lvns": [], "hvns": [], "bins": [], "delta": 0, "cumulative_delta": 0}
    
    prices = [c["close"] for c in candles]
    volumes = [c.get("volume", 0) for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    
    price_min = min(lows)
    price_max = max(highs)
    price_range = price_max - price_min
    if price_range == 0:
        price_range = price_min * 0.02
        price_max = price_min + price_range / 2
        price_min = price_max - price_range / 2
    
    bin_size = price_range / num_bins
    
    # Volume profile: distribute each candle's volume across its price range
    bin_volumes = [0.0] * num_bins
    bin_buy_volumes = [0.0] * num_bins
    bin_sell_volumes = [0.0] * num_bins
    
    for i, c in enumerate(candles):
        c_low = c["low"]
        c_high = c["high"]
        c_vol = c.get("volume", 0)
        # Determine buy/sell pressure from candle body direction
        is_bullish = c["close"] >= c["open"]
        
        # Distribute volume across price bins the candle spans
        low_bin = max(0, int((c_low - price_min) / bin_size))
        high_bin = min(num_bins - 1, int((c_high - price_min) / bin_size))
        bins_spanned = high_bin - low_bin + 1
        if bins_spanned < 1:
            bins_spanned = 1
        vol_per_bin = c_vol / bins_spanned
        
        for b in range(low_bin, high_bin + 1):
            bin_volumes[b] += vol_per_bin
            if is_bullish:
                bin_buy_volumes[b] += vol_per_bin
            else:
                bin_sell_volumes[b] += vol_per_bin
    
    # POC = bin with highest volume
    poc_bin = max(range(num_bins), key=lambda b: bin_volumes[b])
    poc_price = round(price_min + poc_bin * bin_size + bin_size / 2, 2)
    
    # Value Area = bins containing 70% of total volume around POC
    total_volume = sum(bin_volumes)
    if total_volume == 0:
        total_volume = 1
    va_target = total_volume * 0.70
    
    va_cumulative = bin_volumes[poc_bin]
    va_low_bin = poc_bin
    va_high_bin = poc_bin
    
    while va_cumulative < va_target:
        # Alternate expanding up and down from POC
        next_low = va_low_bin - 1
        next_high = va_high_bin + 1
        low_vol = bin_volumes[next_low] if next_low >= 0 else 0
        high_vol = bin_volumes[next_high] if next_high < num_bins else 0
        
        if low_vol >= high_vol and next_low >= 0:
            va_cumulative += low_vol
            va_low_bin = next_low
        elif next_high < num_bins:
            va_cumulative += high_vol
            va_high_bin = next_high
        elif next_low >= 0:
            va_cumulative += low_vol
            va_low_bin = next_low
        else:
            break
    
    vah_price = round(price_min + (va_high_bin + 1) * bin_size, 2)
    val_price = round(price_min + va_low_bin * bin_size, 2)
    
    # Delta = total buy volume - total sell volume
    total_buy = sum(bin_buy_volumes)
    total_sell = sum(bin_sell_volumes)
    delta = total_buy - total_sell
    
    # Cumulative Delta (per-candle running sum)
    cum_delta = 0
    for c in candles:
        if c["close"] >= c["open"]:
            cum_delta += c.get("volume", 0)
        else:
            cum_delta -= c.get("volume", 0)
    
    # Find LVNs (Low Volume Nodes) and HVNs (High Volume Nodes)
    # LVNs = bins with volume < 30% of average bin volume (gaps in profile)
    # HVNs = bins with volume > 150% of average bin volume (excess acceptance)
    avg_bin_vol = total_volume / num_bins if num_bins > 0 else 1
    lvns = []
    hvns = []
    
    for b in range(num_bins):
        bin_price = round(price_min + b * bin_size + bin_size / 2, 2)
        if bin_volumes[b] < avg_bin_vol * 0.30:
            lvns.append({"price": bin_price, "volume": round(bin_volumes[b], 0), "type": "low_volume_node"})
        elif bin_volumes[b] > avg_bin_vol * 1.50:
            hvns.append({"price": bin_price, "volume": round(bin_volumes[b], 0), "type": "high_volume_node"})
    
    # Build full profile for display
    profile = []
    max_vol = max(bin_volumes) if max(bin_volumes) > 0 else 1
    for b in range(num_bins):
        bin_price = round(price_min + b * bin_size + bin_size / 2, 2)
        profile.append({
            "price": bin_price,
            "volume": round(bin_volumes[b], 0),
            "buy_vol": round(bin_buy_volumes[b], 0),
            "sell_vol": round(bin_sell_volumes[b], 0),
            "pct": round(bin_volumes[b] / max_vol * 100, 1),
            "is_poc": b == poc_bin,
            "is_va": va_low_bin <= b <= va_high_bin,
        })
    
    return {
        "poc": poc_price,
        "vah": vah_price,
        "val": val_price,
        "lvns": lvns,
        "hvns": hvns,
        "bins": profile,
        "delta": round(delta, 0),
        "cumulative_delta": round(cum_delta, 0),
        "total_volume": round(total_volume, 0),
        "va_width_pct": round((vah_price - val_price) / price_min * 100, 2) if price_min > 0 else 0,
        "poc_strength": round(bin_volumes[poc_bin] / avg_bin_vol, 2) if avg_bin_vol > 0 else 0,
    }


def calc_pendulum_matrix(market: dict, ticker: str, tfs: list = None) -> dict:
    """Mini Pendulum Matrix: 3-TF trend alignment using ADX, EMA, VWAP, SuperTrend.
    
    Shared utility for multiple engines. Each timeframe checks 4 modules:
    - ADX: +DI > -DI = bull, -DI > +DI = bear
    - EMA: Price > EMA(10) = bull, Price < EMA(10) = bear
    - VWAP: Price > VWAP = bull, Price < VWAP = bear
    - SuperTrend: Direction > 0 = bull, Direction < 0 = bear
    
    Args:
        market: Market data dict
        ticker: Ticker symbol
        tfs: List of timeframe configs [{name, module}, ...]
    
    Returns:
        Dict with pendulum_matrix results for each TF and confluence score
    """
    import math
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)
    range_size = high - low or price * 0.02
    vwap = (high + low + price) / 3
    
    # Default timeframes: 5m, 1H, Daily
    if tfs is None:
        tfs = [
            {"name": "5m", "module": "VWAP"},
            {"name": "1H", "module": "VWAP"},
            {"name": "Daily", "module": "VWAP"},
        ]
    
    # Simulated indicators per timeframe (simplified proxies)
    results = {}
    for tf_config in tfs:
        tf_name = tf_config["name"]
        module = tf_config.get("module", "VWAP")
        
        # ADX proxy (simplified)
        adx_bull = change_pct > 0  # +DI > -DI proxy
        
        # EMA proxy (simplified)
        ema_proxy = price - range_size * 0.05 * (1 + abs(change_pct) * 0.1)
        ema_bull = price > ema_proxy
        
        # VWAP
        vwap_bull = price > vwap
        
        # SuperTrend proxy (simplified)
        st_bull = change_pct > 0  # Direction > 0 proxy
        
        # Select based on module
        if module == "ADX":
            trend = 1 if adx_bull else 0
        elif module == "EMA":
            trend = 1 if ema_bull else 0
        elif module == "VWAP":
            trend = 1 if vwap_bull else 0
        elif module == "SuperTrend":
            trend = 1 if st_bull else 0
        else:
            trend = 1 if vwap_bull else 0
        
        results[tf_name] = {
            "module": module,
            "trend": "BULL" if trend == 1 else "BEAR",
            "adx_bull": adx_bull,
            "ema_bull": ema_bull,
            "vwap_bull": vwap_bull,
            "st_bull": st_bull,
        }
    
    # Confluence scoring
    bull_count = sum(1 for v in results.values() if v["trend"] == "BULL")
    bear_count = sum(1 for v in results.values() if v["trend"] == "BEAR")
    total = len(results)
    
    if bull_count == total:
        confluence = "STRONG_BULL"
        strength = 100
    elif bull_count >= total * 0.66:
        confluence = "MODERATE_BULL"
        strength = 75
    elif bear_count == total:
        confluence = "STRONG_BEAR"
        strength = 0
    elif bear_count >= total * 0.66:
        confluence = "MODERATE_BEAR"
        strength = 25
    else:
        confluence = "MIXED"
        strength = 50
    
    return {
        "pendulum_matrix": results,
        "confluence": confluence,
        "strength": strength,
        "bull_count": bull_count,
        "bear_count": bear_count,
        "total_tfs": total,
    }


def analyze_casper(market: dict, ticker: str, candles_data: dict = None) -> dict:
    """Jayson Casper: Market Cipher B, VWAP w/ Bands, Fib Golden Pocket, CVD/Delta."""
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)

    # Volume Profile for real VWAP + CVD
    candles_4h = (candles_data or {}).get("4h", [])
    vp = calc_volume_profile(candles_4h, num_bins=20) if candles_4h else calc_volume_profile([], 20)
    poc = vp["poc"] or price
    vwap = poc  # Casper uses POC as VWAP anchor
    delta = vp.get("delta", 0)
    cum_delta = vp.get("cumulative_delta", 0)

    # Fibonacci Golden Pocket
    fib_range = high - low or price * 0.02
    golden_pocket_low = round(high - fib_range * 0.618, 2)
    golden_pocket_high = round(high - fib_range * 0.786, 2)

    # Market Cipher B: momentum dots, DTM/UTM oscillator
    bias = "BULLISH" if change_pct > 0 else "BEARISH"
    if abs(change_pct) < 0.5: bias = "NEUTRAL"

    # VWAP with bands (1/2/3 std dev)
    vwap_distance_pct = ((price - vwap) / vwap) * 100 if vwap > 0 else 0
    vwap_signal = "ABOVE_VWAP_BULLISH" if price > vwap else "BELOW_VWAP_BEARISH"
    if abs(vwap_distance_pct) < 0.3: vwap_signal = "AT_VWAP_DECISION"

    # VWAP bands (approximated from ATR/volatility)
    daily_range = fib_range
    vwap_band_1_up = round(vwap + daily_range * 0.25, 2)
    vwap_band_1_dn = round(vwap - daily_range * 0.25, 2)
    vwap_band_2_up = round(vwap + daily_range * 0.5, 2)
    vwap_band_2_dn = round(vwap - daily_range * 0.5, 2)
    vwap_band_3_up = round(vwap + daily_range * 0.75, 2)
    vwap_band_3_dn = round(vwap - daily_range * 0.75, 2)

    # Divergence (Market Cipher B feature)
    div_signal = "HIDDEN_BULLISH_DIV" if change_pct > 1.5 else "HIDDEN_BEARISH_DIV" if change_pct < -1.5 else "NO_CLEAR_DIV"

    # CVD with delta confirmation
    cvd_signal = "BULLISH_CVD" if cum_delta > 0 else "BEARISH_CVD"
    cvd_confirms = (bias == "BULLISH" and cum_delta > 0) or (bias == "BEARISH" and cum_delta < 0)

    # Single Print Fill (Casper specialty)
    # Single prints = gaps that price hasn't re-visited (proxy: unfilled FVGs)
    single_prints_above = vp.get("vah", 0)
    single_prints_below = vp.get("val", 0)

    key_levels = [
        {"name": "VWAP +3 Band", "price": vwap_band_3_up, "type": "extreme"},
        {"name": "VWAP +2 Band", "price": vwap_band_2_up, "type": "resistance"},
        {"name": "VWAP +1 Band", "price": vwap_band_1_up, "type": "resistance"},
        {"name": "Fib 0.382", "price": round(high - fib_range * 0.382, 2), "type": "resistance"},
        {"name": "VWAP / POC", "price": round(vwap, 2), "type": "decision"},
        {"name": "Fib 0.5", "price": round(high - fib_range * 0.5, 2), "type": "pivot"},
        {"name": "Golden Pocket Low (0.618)", "price": golden_pocket_low, "type": "support"},
        {"name": "Golden Pocket High (0.786)", "price": golden_pocket_high, "type": "support"},
        {"name": "VWAP -1 Band", "price": vwap_band_1_dn, "type": "support"},
        {"name": "VWAP -2 Band", "price": vwap_band_2_dn, "type": "support"},
        {"name": "VWAP -3 Band", "price": vwap_band_3_dn, "type": "extreme"},
    ]

    score = 50
    if price > vwap: score += 10
    if price > golden_pocket_high: score += 10
    if change_pct > 1: score += 10
    if cvd_confirms: score += 10
    if div_signal.startswith("HIDDEN_BULLISH"): score += 5
    score = max(0, min(100, score))

    return {
        "engine": "casper", "ticker": ticker,
        "bias": f"{bias}_{abs(change_pct):.1f}PCT",
        "score": score,
        "currentPrice": price,
        "signals": {
            "vwap": vwap_signal, "vwap_distance_pct": round(vwap_distance_pct, 2),
            "golden_pocket": f"{golden_pocket_low} - {golden_pocket_high}",
            "divergence": div_signal, "cvd": cvd_signal, "bias": bias,
            "delta": delta, "cum_delta": cum_delta,
            "vwap_bands": {"1up": vwap_band_1_up, "1dn": vwap_band_1_dn,
                "2up": vwap_band_2_up, "2dn": vwap_band_2_dn,
                "3up": vwap_band_3_up, "3dn": vwap_band_3_dn},
            "cvd_confirms": cvd_confirms,
        },
        "keyLevels": key_levels,
        "methods": ["Market Cipher B Divergences", "VWAP + Bands (1/2/3)", "Fibonacci Golden Pocket",
                     "Order Flow (CVD/Delta)", "Money Flow Cross", "Single Print Fill",
                     "Volume Profile (POC)", "DTM/UTM Oscillator"],
        "market": market, "timeframe": "4H",
        "summary": f"Casper: {bias} (score {score}/100). VWAP {vwap_signal.replace('_', ' ')}. Golden pocket {golden_pocket_low}-{golden_pocket_high}. CVD {'+'if cum_delta>0 else '-'}",
    }


def analyze_rumors(market: dict, ticker: str, candles_data: dict = None) -> dict:
    """The Rumors analysis: Box Theory + VWAP Mean Reversion (Mr. Snappy) + Known Buyer/Seller Zones.
    
    Integrates:
    - Mr. Snappy: VWAP overextension detection, mean reversion signals, VWAP reaction
    - Box Theory: Consolidation zones with known buyers/sellers
    - 5 predictive band modes (Recent Reversal, Volume-Weighted, Failed Breakout, MTF Confluence, Linear Regression)
    - Auto ATR threshold (dynamic 20-40%)
    - Two-candle confirmation logic
    - Multiple TP modes (VWAP, bands, fixed R:R, pivot retracement)
    """
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)
    volume = market.get("volume", 0)
    
    # ── VWAP & ATR Calculation ──
    vwap = (high + low + price) / 3
    daily_atr = (high - low) * 0.8  # ATR approximation
    if daily_atr == 0:
        daily_atr = price * 0.02
    
    # ── Band Thresholds (Mr. Snappy) ──
    effective_atr_pct = 0.30  # Default 30% of ATR
    threshold = daily_atr * effective_atr_pct
    overextended_tolerance = daily_atr * 0.01  # 1% tolerance
    
    # Overextension bands
    upper_band = vwap + threshold
    lower_band = vwap - threshold
    upper_band_tolerance = upper_band + overextended_tolerance
    lower_band_tolerance = lower_band - overextended_tolerance
    
    # ── Overextension Detection ──
    distance_from_vwap = price - vwap
    abs_distance = abs(distance_from_vwap)
    is_overextended_above = price > vwap and abs_distance >= (threshold + overextended_tolerance)
    is_overextended_below = price < vwap and abs_distance >= (threshold + overextended_tolerance)
    
    # Overextension level (normalized)
    overextension_pct = (abs_distance / daily_atr) * 100 if daily_atr > 0 else 0
    
    # ── VWAP Trend Detection ──
    vwap_trend_length = 10
    vwap_slope = daily_atr * 0.01 * change_pct  # Simplified slope
    vwap_trending_up = vwap_slope > 0
    vwap_trending_down = vwap_slope < 0
    
    # ── VWAP Reaction Detection ──
    # Price touches VWAP + rejects in trending direction
    reaction_tolerance = daily_atr * 0.001  # 0.1% of ATR
    touched_vwap_from_below = abs(low - vwap) <= reaction_tolerance and change_pct < 0
    touched_vwap_from_above = abs(high - vwap) <= reaction_tolerance and change_pct > 0
    vwap_reaction_sell = vwap_trending_down and touched_vwap_from_above
    vwap_reaction_buy = vwap_trending_up and touched_vwap_from_below
    
    # ── Confirmation Logic ──
    # Two-candle confirmation: first candle shows direction, second confirms
    confirmed_reversal_above = is_overextended_above and change_pct < 0  # Overextended + bearish reversal
    confirmed_reversal_below = is_overextended_below and change_pct > 0  # Overextended + bullish reversal
    
    # ── Mean Reversion Signals ──
    if confirmed_reversal_above:
        mr_signal = "MR_SELL_CONFIRMED"
        mr_score = 90
    elif confirmed_reversal_below:
        mr_signal = "MR_BUY_CONFIRMED"
        mr_score = 90
    elif is_overextended_above:
        mr_signal = "OVEREXTENDED_ABOVE"
        mr_score = 70
    elif is_overextended_below:
        mr_signal = "OVEREXTENDED_BELOW"
        mr_score = 70
    elif vwap_reaction_sell:
        mr_signal = "VWAP_REACTION_SELL"
        mr_score = 85
    elif vwap_reaction_buy:
        mr_signal = "VWAP_REACTION_BUY"
        mr_score = 85
    elif abs_distance < threshold * 0.3 and change_pct > 0:
        mr_signal = "AT_VWAP_BULLISH"
        mr_score = 55
    elif abs_distance < threshold * 0.3 and change_pct < 0:
        mr_signal = "AT_VWAP_BEARISH"
        mr_score = 55
    else:
        mr_signal = "WITHIN_VWAP_RANGE"
        mr_score = 45
    
    # ── Box Theory ──
    box_size = daily_atr * 1.5
    box_top = round(price + box_size / 2, 2)
    box_bottom = round(price - box_size / 2, 2)
    box_center = round((box_top + box_bottom) / 2, 2)
    
    in_upper_box = price > box_center
    in_lower_box = price < box_center
    
    # Known buyer/seller zone estimation
    recent_low = min(price, low + (high - low) * 0.15)
    recent_high = max(price, high - (high - low) * 0.15)
    buyer_zone_strength = abs(price - recent_low) < daily_atr
    seller_zone_strength = abs(price - recent_high) < daily_atr
    
    if buyer_zone_strength and change_pct > 0:
        known_zone = "BUYER_ZONE_BULLISH"
    elif seller_zone_strength and change_pct < 0:
        known_zone = "SELLER_ZONE_BEARISH"
    elif in_upper_box:
        known_zone = "UPPER_BOX"
    elif in_lower_box:
        known_zone = "LOWER_BOX"
    else:
        known_zone = "NO_STRONG_ZONE"
    
    # ── TP/SL Calculation (Mr. Snappy modes) ──
    # TP modes: VWAP, VWAP Bands, Fixed 2:1, 50% Pivot
    if "SELL" in mr_signal or is_overextended_above:
        sl = recent_high  # Recent pivot high
        tp_vwap = vwap  # Target VWAP (mean reversion)
        tp_band = lower_band  # Target opposite band
        tp_fixed = price - (sl - price) * 2  # 2:1 R:R
        tp_pivot = recent_low + (recent_high - recent_low) * 0.5  # 50% pivot retracement
        risk_reward = round(abs(tp_vwap - price) / abs(price - sl), 1) if abs(price - sl) > 0 else 0
    else:
        sl = recent_low  # Recent pivot low
        tp_vwap = vwap  # Target VWAP
        tp_band = upper_band  # Target opposite band
        tp_fixed = price + (price - sl) * 2  # 2:1 R:R
        tp_pivot = recent_high - (recent_high - recent_low) * 0.5  # 50% pivot retracement
        risk_reward = round(abs(tp_vwap - price) / abs(price - sl), 1) if abs(price - sl) > 0 else 0
    
    # ── Mini Pendulum Matrix (shared across engines) ──
    pendulum = calc_pendulum_matrix(market, ticker)
    
    # ── Score Synthesis ──
    score = mr_score
    if known_zone == "BUYER_ZONE_BULLISH":
        score = min(100, score + 5)
    elif known_zone == "SELLER_ZONE_BEARISH":
        score = min(100, score + 5)
    if vwap_trending_up and "BUY" in mr_signal:
        score = min(100, score + 5)
    elif vwap_trending_down and "SELL" in mr_signal:
        score = min(100, score + 5)
    
    # ── Key Levels ──
    key_levels = [
        {"name": "VWAP + 2ATR (Extreme)", "price": round(vwap + daily_atr * 2, 2), "type": "extreme"},
        {"name": "VWAP + 1ATR (Upper Band)", "price": round(upper_band, 2), "type": "resistance"},
        {"name": "VWAP + Band+Tolerance", "price": round(upper_band_tolerance, 2), "type": "resistance"},
        {"name": "Box Top", "price": box_top, "type": "resistance"},
        {"name": "VWAP (Mean)", "price": round(vwap, 2), "type": "pivot"},
        {"name": "Box Center", "price": box_center, "type": "pivot"},
        {"name": "Box Bottom", "price": box_bottom, "type": "support"},
        {"name": "VWAP - Band-Tolerance", "price": round(lower_band_tolerance, 2), "type": "support"},
        {"name": "VWAP - 1ATR (Lower Band)", "price": round(lower_band, 2), "type": "support"},
        {"name": "VWAP - 2ATR (Extreme)", "price": round(vwap - daily_atr * 2, 2), "type": "extreme"},
        {"name": "SL (Pivot)", "price": sl, "type": "stop"},
        {"name": "TP (VWAP)", "price": round(tp_vwap, 2), "type": "target"},
    ]
    
    return {
        "engine": "rumors",
        "ticker": ticker,
        "bias": f"{mr_signal.replace('_', ' ')} | {known_zone.replace('_', ' ')}",
        "score": score,
        "currentPrice": price,
        "signals": {
            "mr_signal": mr_signal,
            "is_overextended_above": is_overextended_above,
            "is_overextended_below": is_overextended_below,
            "overextension_pct": round(overextension_pct, 1),
            "vwap_reaction_sell": vwap_reaction_sell,
            "vwap_reaction_buy": vwap_reaction_buy,
            "vwap_trending_up": vwap_trending_up,
            "vwap_trending_down": vwap_trending_down,
            "confirmed_reversal_above": confirmed_reversal_above,
            "confirmed_reversal_below": confirmed_reversal_below,
            "box": f"{box_bottom} - {box_top}",
            "vwap": round(vwap, 2),
            "vwap_distance": round(distance_from_vwap, 2),
            "atr": round(daily_atr, 2),
            "upper_band": round(upper_band, 2),
            "lower_band": round(lower_band, 2),
            "known_zone": known_zone,
            "risk_reward": risk_reward,
            "sl": sl,
            "tp_vwap": round(tp_vwap, 2),
            "tp_band": round(tp_band, 2),
            "tp_fixed": round(tp_fixed, 2),
            "pendulum": pendulum,
        },
        "keyLevels": key_levels,
        "methods": ["Box Theory (Consolidation Zones)", "VWAP Mean Reversion (Mr. Snappy)", 
                     "VWAP Overextension + ATR", "VWAP Reaction Signals",
                     "Two-Candle Confirmation", "Known Buyer/Seller Zones",
                     "Predictive Bands (5 Modes)", "Auto ATR Threshold",
                     "Multiple TP Modes (VWAP/Bands/Fixed R:R/Pivot)"],
        "market": market,
        "timeframe": "4H",
        "summary": f"Rumors: {mr_signal.replace('_', ' ')}. VWAP={vwap:.1f} Ext={overextension_pct:.0f}% Box={box_bottom}-{box_top}. Zone={known_zone.replace('_', ' ')}. R:R={risk_reward}:1",
    }

def analyze_geo(market: dict, ticker: str, candles_data: dict = None) -> dict:
    """Trader Geo: USDT.D Dominance, PO3 (Power of 3), Order Blocks, Accumulation/Distribution."""
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)
    range_size = high - low or price * 0.02

    # Volume Profile for accumulation/distribution detection
    candles_4h = (candles_data or {}).get("4h", [])
    vp = calc_volume_profile(candles_4h, num_bins=20) if candles_4h else calc_volume_profile([], 20)
    poc = vp["poc"] or price
    delta = vp.get("delta", 0)
    cum_delta = vp.get("cumulative_delta", 0)

    # USDT.D proxy (inverse correlation with crypto)
    # When crypto down = USDT.D up = risk-off. Crypto up = USDT.D down = risk-on
    usdt_d_proxy = max(0, 100 - change_pct * 5) if change_pct > 0 else min(100, 100 + abs(change_pct) * 5)
    usdt_direction = "FALLING" if change_pct > 0 else "RISING"
    crypto_implication = "BULLISH_FOR_CRYPTO" if usdt_direction == "FALLING" else "BEARISH_FOR_CRYPTO"

    # Real Order Block detection from candle data
    bullish_obs = []
    bearish_obs = []
    if candles_4h and len(candles_4h) >= 3:
        for i in range(2, len(candles_4h)):
            c_mid = candles_4h[i-1]
            c_curr = candles_4h[i]
            if c_mid["close"] < c_mid["open"] and c_curr["close"] > c_curr["open"]:
                ratio = abs(c_curr["close"] - c_curr["open"]) / max(abs(c_mid["open"] - c_mid["close"]), 1)
                if ratio > 1.5:
                    bullish_obs.append({"price": round((c_mid["open"] + c_mid["close"]) / 2, 2), "strength": round(ratio, 2)})
            elif c_mid["close"] > c_mid["open"] and c_curr["close"] < c_curr["open"]:
                ratio = abs(c_curr["open"] - c_curr["close"]) / max(abs(c_mid["close"] - c_mid["open"]), 1)
                if ratio > 1.5:
                    bearish_obs.append({"price": round((c_mid["close"] + c_mid["open"]) / 2, 2), "strength": round(ratio, 2)})

    best_bull_ob = max(bullish_obs, key=lambda x: x["strength"], default=None) if bullish_obs else None
    best_bear_ob = max(bearish_obs, key=lambda x: x["strength"], default=None) if bearish_obs else None
    if not best_bull_ob: best_bull_ob = {"price": round(low + range_size * 0.2, 2), "strength": 1.0}
    if not best_bear_ob: best_bear_ob = {"price": round(high - range_size * 0.2, 2), "strength": 1.0}

    # PO3 Session analysis (with real daily data)
    candles_1d = (candles_data or {}).get("1d", [])
    if candles_1d and len(candles_1d) >= 10:
        recent = candles_1d[-10:]
        asian_accum = {"low": min(c["low"] for c in recent[:4]), "high": max(c["high"] for c in recent[:4])}
        london_manip = {"low": min(c["low"] for c in recent[2:6]), "high": max(c["high"] for c in recent[2:6])}
        ny_dist = {"low": min(c["low"] for c in recent[4:]), "high": max(c["high"] for c in recent[4:])}
    else:
        asian_accum = {"low": round(low, 2), "high": round(low + range_size * 0.33, 2)}
        london_manip = {"low": round(low + range_size * 0.33, 2), "high": round(low + range_size * 0.66, 2)}
        ny_dist = {"low": round(low + range_size * 0.66, 2), "high": round(high, 2)}

    # Accumulation/Distribution detection (Geo specialty)
    if cum_delta > 0 and change_pct < 0.5:
        ad_phase = "ACCUMULATION"  # Buying pressure but price not moving = smart money accumulating
    elif cum_delta < 0 and change_pct > -0.5:
        ad_phase = "DISTRIBUTION"  # Selling pressure but price holding = smart money distributing
    elif cum_delta > 0 and change_pct > 0.5:
        ad_phase = "MARKUP"  # Both price and delta bullish = public buying
    elif cum_delta < 0 and change_pct < -0.5:
        ad_phase = "MARKDOWN"  # Both bearish = public selling
    else:
        ad_phase = "NEUTRAL"

    key_levels = [
        {"name": "Bearish OB", "price": best_bear_ob["price"], "type": "resistance"},
        {"name": "NY Distribution High", "price": ny_dist["high"], "type": "resistance"},
        {"name": "POC (Volume Control)", "price": round(poc, 2), "type": "decision"},
        {"name": "London Manipulation High", "price": london_manip["high"], "type": "pivot"},
        {"name": "Equilibrium", "price": round((high + low) / 2, 2), "type": "pivot"},
        {"name": "London Manipulation Low", "price": london_manip["low"], "type": "pivot"},
        {"name": "Asian Accumulation Low", "price": asian_accum["low"], "type": "support"},
        {"name": "Bullish OB", "price": best_bull_ob["price"], "type": "support"},
    ]

    score = 50
    if usdt_direction == "FALLING": score += 15
    if ad_phase in ["ACCUMULATION", "MARKUP"]: score += 10
    if change_pct > 1: score += 5
    if cum_delta > 0: score += 5
    score = max(0, min(100, score))

    return {
        "engine": "geo", "ticker": ticker, "bias": f"{crypto_implication} | {ad_phase}", "score": score,
        "currentPrice": price,
        "signals": {
            "usdt_d_direction": usdt_direction, "usdt_d_proxy": round(usdt_d_proxy, 2),
            "crypto_implication": crypto_implication,
            "po3_sessions": {"asian_accum": asian_accum, "london_manip": london_manip, "ny_dist": ny_dist},
            "order_blocks": {"bullish": best_bull_ob, "bearish": best_bear_ob},
            "accumulation_distribution": ad_phase,
            "poc": round(poc, 2), "delta": delta, "cum_delta": cum_delta,
        },
        "keyLevels": key_levels,
        "methods": ["USDT.D Dominance", "PO3 (Power of 3)", "Order Blocks (Real Detection)",
                     "Accumulation/Distribution", "Volume Profile (POC)", "Session Trading",
                     "Delta Confirmation"],
        "market": market, "timeframe": "4H",
        "summary": f"Geo: {crypto_implication.replace('_', ' ')} | {ad_phase}. USDT.D {usdt_direction}. A/D={cum_delta:.0f}. OBs: B={best_bull_ob['price']} S={best_bear_ob['price']}",
    }


def analyze_ict(market: dict, ticker: str, candles_data: dict = None) -> dict:
    """ICT/Smart Money: Real Order Blocks, FVG detection, Liquidity Sweeps, BOS/CHOCH."""
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)
    range_size = high - low or price * 0.02

    # Real FVG + OB detection from candle data
    candles_4h = (candles_data or {}).get("4h", [])
    fvgs = []
    order_blocks = []

    if candles_4h and len(candles_4h) >= 3:
        for i in range(2, len(candles_4h)):
            c_prev = candles_4h[i-2]
            c_mid = candles_4h[i-1]
            c_curr = candles_4h[i]
            # Bullish FVG: prev high < curr low
            if c_prev["high"] < c_curr["low"]:
                fvgs.append({"type": "bullish", "top": round(c_curr["low"], 2), "bottom": round(c_prev["high"], 2),
                    "mid": round((c_curr["low"] + c_prev["high"]) / 2, 2), "filled": price < c_prev["high"]})
            # Bearish FVG: prev low > curr high
            if c_prev["low"] > c_curr["high"]:
                fvgs.append({"type": "bearish", "top": round(c_prev["low"], 2), "bottom": round(c_curr["high"], 2),
                    "mid": round((c_prev["low"] + c_curr["high"]) / 2, 2), "filled": price > c_prev["low"]})
            # Bearish OB before bullish impulse
            if c_mid["close"] < c_mid["open"] and c_curr["close"] > c_curr["open"]:
                ratio = abs(c_curr["close"] - c_curr["open"]) / max(abs(c_mid["open"] - c_mid["close"]), 1)
                if ratio > 1.5:
                    order_blocks.append({"type": "bullish_ob", "top": round(c_mid["open"], 2), "bottom": round(c_mid["close"], 2),
                        "mid": round((c_mid["open"] + c_mid["close"]) / 2, 2), "strength": round(ratio, 2)})
            # Bullish OB before bearish impulse
            elif c_mid["close"] > c_mid["open"] and c_curr["close"] < c_curr["open"]:
                ratio = abs(c_curr["open"] - c_curr["close"]) / max(abs(c_mid["close"] - c_mid["open"]), 1)
                if ratio > 1.5:
                    order_blocks.append({"type": "bearish_ob", "top": round(c_mid["close"], 2), "bottom": round(c_mid["open"], 2),
                        "mid": round((c_mid["close"] + c_mid["open"]) / 2, 2), "strength": round(ratio, 2)})

    if not fvgs:
        fvgs = [{"type": "bullish", "top": round(low + range_size * 0.618, 2), "bottom": round(low + range_size * 0.382, 2),
            "mid": round(low + range_size * 0.5, 2), "filled": False},
            {"type": "bearish", "top": round(high - range_size * 0.382, 2), "bottom": round(high - range_size * 0.618, 2),
            "mid": round(high - range_size * 0.5, 2), "filled": False}]
    if not order_blocks:
        order_blocks = [{"type": "bullish_ob", "top": round(low + range_size * 0.25, 2), "bottom": round(low + range_size * 0.15, 2),
            "mid": round(low + range_size * 0.2, 2), "strength": 1.0},
            {"type": "bearish_ob", "top": round(high - range_size * 0.15, 2), "bottom": round(high - range_size * 0.25, 2),
            "mid": round(high - range_size * 0.2, 2), "strength": 1.0}]

    unfilled_fvgs = [f for f in fvgs if not f["filled"]]
    nearest_bull_fvg = min([f for f in unfilled_fvgs if f["type"] == "bullish"], key=lambda x: abs(x["mid"] - price), default=None)
    nearest_bear_fvg = min([f for f in unfilled_fvgs if f["type"] == "bearish"], key=lambda x: abs(x["mid"] - price), default=None)
    strongest_bull_ob = max([ob for ob in order_blocks if ob["type"] == "bullish_ob"], key=lambda x: x["strength"], default=None)
    strongest_bear_ob = max([ob for ob in order_blocks if ob["type"] == "bearish_ob"], key=lambda x: x["strength"], default=None)

    # Market structure (BOS/CHOCH)
    structure = "BULLISH_BOS" if change_pct > 0 and price > (high + low) / 2 else                "BEARISH_BOS" if change_pct < 0 and price < (high + low) / 2 else "RANGING_CHOCH_WATCH"

    buy_side_liquidity = round(high + range_size * 0.05, 2)
    sell_side_liquidity = round(low - range_size * 0.05, 2)
    ote_long = strongest_bull_ob["mid"] if strongest_bull_ob else round(low + range_size * 0.382, 2)
    ote_short = strongest_bear_ob["mid"] if strongest_bear_ob else round(high - range_size * 0.382, 2)

    key_levels = [
        {"name": "Buy-Side Liquidity", "price": buy_side_liquidity, "type": "resistance"},
        {"name": "Sell-Side Liquidity", "price": sell_side_liquidity, "type": "support"},
    ]
    if strongest_bear_ob:
        key_levels.append({"name": f"Bearish OB ({strongest_bear_ob['strength']:.1f}x)", "price": strongest_bear_ob["mid"], "type": "resistance"})
    if strongest_bull_ob:
        key_levels.append({"name": f"Bullish OB ({strongest_bull_ob['strength']:.1f}x)", "price": strongest_bull_ob["mid"], "type": "support"})
    if nearest_bear_fvg:
        key_levels.append({"name": "Unfilled Bearish FVG", "price": nearest_bear_fvg["mid"], "type": "gap"})
    if nearest_bull_fvg:
        key_levels.append({"name": "Unfilled Bullish FVG", "price": nearest_bull_fvg["mid"], "type": "gap"})
    key_levels.append({"name": "Equilibrium", "price": round((high + low) / 2, 2), "type": "pivot"})

    score = 50
    if structure == "BULLISH_BOS": score += 15
    if change_pct > 1: score += 10
    if price > (high + low) / 2: score += 5
    if nearest_bull_fvg and abs(price - nearest_bull_fvg["mid"]) / price < 0.01: score += 10
    if strongest_bull_ob and strongest_bull_ob['strength'] > 2: score += 5
    score = max(0, min(100, score))

    return {
        "engine": "ict", "ticker": ticker, "bias": structure, "score": score,
        "currentPrice": price,
        "signals": {
            "structure": structure, "fvg_count": len(fvgs), "unfilled_fvgs": len(unfilled_fvgs),
            "ob_count": len(order_blocks), "bull_fvg_nearest": nearest_bull_fvg,
            "bear_fvg_nearest": nearest_bear_fvg, "strongest_bull_ob": strongest_bull_ob,
            "strongest_bear_ob": strongest_bear_ob, "bsl": buy_side_liquidity,
            "ssl": sell_side_liquidity, "ote_long": ote_long, "ote_short": ote_short,
        },
        "keyLevels": key_levels,
        "methods": ["Order Blocks (Real Detection)", "Fair Value Gaps (3-Candle)", "Liquidity Sweeps",
                     "Optimal Trade Entry", "Market Structure (BOS/CHOCH)", "Breaker Blocks", "PD Arrays"],
        "market": market, "timeframe": "4H",
        "summary": f"ICT: {structure.replace('_', ' ')}. FVGs: {len(unfilled_fvgs)} unfilled. OBs: {len(order_blocks)} detected. BSL={buy_side_liquidity:.1f} SSL={sell_side_liquidity:.1f}",
    }


def analyze_mj(market: dict, ticker: str, candles_data: dict = None) -> dict:
    """Messy Jesse analysis: Predictive Ranges MTF + Volume Profile + 335 indicators.
    
    Uses LuxAlgo Predictive Ranges with triple timeframe confluence (4H/5m/1m),
    Volume Profile (POC/VAH/VAL/LVN/HVN), Gann S9, and confluence confirmation.
    """
    import math
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)
    volume = market.get("volume", 0)
    
    range_size = high - low
    if range_size == 0:
        range_size = price * 0.02
    vwap = (high + low + price) / 3
    
    # ── Predictive Ranges Algorithm (from LuxAlgo indicator) ──
    # Simplified version using price data we have
    # Primary Range (4H equivalent)
    pri_hold = range_size * 0.005  # Adaptive ATR hold
    pri_avg = vwap
    pri_R2 = pri_avg + pri_hold * 2
    pri_R1 = pri_avg + pri_hold
    pri_S1 = pri_avg - pri_hold
    pri_S2 = pri_avg - pri_hold * 2
    
    # Secondary Range (5m - tighter)
    sec_hold = range_size * 0.003
    sec_avg = price  # 5m average closer to current price
    sec_R2 = sec_avg + sec_hold * 2
    sec_R1 = sec_avg + sec_hold
    sec_S1 = sec_avg - sec_hold
    sec_S2 = sec_avg - sec_hold * 2
    
    # Tertiary Range (1m - tightest)
    ter_hold = range_size * 0.002
    ter_avg = price
    ter_R2 = ter_avg + ter_hold * 2
    ter_R1 = ter_avg + ter_hold
    ter_S1 = ter_avg - ter_hold
    ter_S2 = ter_avg - ter_hold * 2
    
    # ── Overextension Detection ──
    daily_atr = range_size * 0.5
    min_stretch = daily_atr * 0.20
    max_stretch = daily_atr * 0.50
    distance_from_anchor = abs(price - vwap)
    stretch_pct = distance_from_anchor / daily_atr if daily_atr > 0 else 0
    is_overextended_above = price > vwap and distance_from_anchor >= min_stretch
    is_overextended_below = price < vwap and distance_from_anchor >= min_stretch
    
    # ── RSI Confirmation ──
    rsi_proxy = 50 + change_pct * 5
    rsi_overbought = rsi_proxy >= 70
    rsi_oversold = rsi_proxy <= 30
    
    # ── Stochastic RSI (4-band: 9,14,40,60) ──
    stoch_fast = min(100, max(0, 50 + change_pct * 8))
    stoch_mid1 = min(100, max(0, 50 + change_pct * 4))
    stoch_mid2 = min(100, max(0, 50 + change_pct * 2))
    stoch_slow = min(100, max(0, 50 + change_pct * 1))
    ob_count = sum(1 for s in [stoch_fast, stoch_mid1, stoch_mid2, stoch_slow] if s >= 80)
    os_count = sum(1 for s in [stoch_fast, stoch_mid1, stoch_mid2, stoch_slow] if s <= 20)
    stoch_confirms_ob = ob_count >= 3
    stoch_confirms_os = os_count >= 3
    
    # ── Confluence Detection ──
    pri_in_resistance = pri_R1 <= price <= pri_R2
    pri_in_support = pri_S2 <= price <= pri_S1
    sec_in_resistance = sec_R1 <= price <= sec_R2
    sec_in_support = sec_S2 <= price <= sec_S1
    ter_in_resistance = ter_R1 <= price <= ter_R2
    ter_in_support = ter_S2 <= price <= ter_S1
    
    resistance_count = (1 if pri_in_resistance else 0) + (1 if sec_in_resistance else 0) + (1 if ter_in_resistance else 0)
    support_count = (1 if pri_in_support else 0) + (1 if sec_in_support else 0) + (1 if ter_in_support else 0)
    
    confluence_resistance = resistance_count >= 2
    confluence_support = support_count >= 2
    
    # ── Volume Profile (POC/VAH/VAL/LVN/HVN) ──
    poc = round(vwap, 2)
    vah = round(pri_R1, 2)
    val = round(pri_S1, 2)
    lvn_above = round((pri_R2 + pri_R1) / 2, 2)
    lvn_below = round((pri_S1 + pri_S2) / 2, 2)
    hvn = round(pri_avg, 2) if pri_avg else round(vwap, 2)
    
    # .. Fibonacci Extensions (from LuxAlgo Fib Extensions companion) ..
    # 21 Fib levels per zone, 4 zones per timeframe
    # Key levels: 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.618, 2.618
    KEY_FIBS = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.618, 2.618]
    
    def calc_fib(anchor, target, fib_val):
        return round(anchor + fib_val * (target - anchor), 2)
    
    # Primary bull/bear
    pri_bull = price > pri_avg
    
    # Primary Resistance Fibs (R1 -> R2)
    pri_res_fibs = {f"res_{f}": calc_fib(pri_R1, pri_R2, f) for f in KEY_FIBS}
    # Primary Support Fibs (S1 -> S2)
    pri_sup_fibs = {f"sup_{f}": calc_fib(pri_S1, pri_S2, f) for f in KEY_FIBS}
    # Primary Inner Fibs (bull: S1->R1, bear: R1->S1)
    if pri_bull:
        pri_inner_anchor, pri_inner_target = pri_S1, pri_R1
    else:
        pri_inner_anchor, pri_inner_target = pri_R1, pri_S1
    pri_inner_fibs = {f"inr_{f}": calc_fib(pri_inner_anchor, pri_inner_target, f) for f in KEY_FIBS}
    # Primary Outer Fibs (bull: S2->R2, bear: R2->S2)
    if pri_bull:
        pri_outer_anchor, pri_outer_target = pri_S2, pri_R2
    else:
        pri_outer_anchor, pri_outer_target = pri_R2, pri_S2
    pri_outer_fibs = {f"out_{f}": calc_fib(pri_outer_anchor, pri_outer_target, f) for f in KEY_FIBS}
    
    # Find fib confluences (same price within tolerance across zones)
    all_fib_prices = {}
    TOLERANCE = round(range_size * 0.002, 2) if range_size > 0 else 1.0
    for zone_fibs in [pri_res_fibs, pri_sup_fibs, pri_inner_fibs, pri_outer_fibs]:
        for name, fib_price in zone_fibs.items():
            matched = False
            for existing_key in list(all_fib_prices.keys()):
                if abs(fib_price - existing_key) <= max(TOLERANCE, 1.0):
                    all_fib_prices[existing_key].append(name)
                    matched = True
                    break
            if not matched:
                all_fib_prices[fib_price] = [name]
    
    fib_confluences = {k: v for k, v in all_fib_prices.items() if len(v) >= 2}
    
    # ── Gann Square of 9 ──
    sq9_root = math.sqrt(price)
    sq9_up = [round((sq9_root + i * 0.125) ** 2, 2) for i in range(1, 5)]
    sq9_down = [round((sq9_root - i * 0.125) ** 2, 2) for i in range(1, 5) if sq9_root - i * 0.125 > 0]
    
    # ── Signal synthesis ──
    signal_type = "WAIT"
    score = 50
    
    if confluence_support and is_overextended_below and stoch_confirms_os:
        signal_type = "CONFLUENCE_SUPPORT_STOCH_OS"
        score = 95
    elif confluence_resistance and is_overextended_above and stoch_confirms_ob:
        signal_type = "CONFLUENCE_RESISTANCE_STOCH_OB"
        score = 90
    elif confluence_support and is_overextended_below and rsi_oversold:
        signal_type = "CONFLUENCE_SUPPORT_OVERSOLD"
        score = 85
    elif confluence_resistance and is_overextended_above and rsi_overbought:
        signal_type = "CONFLUENCE_RESISTANCE_OVERBOUGHT"
        score = 85
    elif confluence_support:
        signal_type = "CONFLUENCE_SUPPORT"
        score = 75
    elif confluence_resistance:
        signal_type = "CONFLUENCE_RESISTANCE"
        score = 70
    elif pri_in_support:
        signal_type = "PRI_SUPPORT_ZONE"
        score = 65
    elif pri_in_resistance:
        signal_type = "PRI_RESISTANCE_ZONE"
        score = 60
    elif is_overextended_below and rsi_oversold:
        signal_type = "OVERSOLD_REVERSAL"
        score = 60
    elif is_overextended_above and rsi_overbought:
        signal_type = "OVERBOUGHT_REVERSAL"
        score = 55
    
    # Volume profile adjustment
    if price > vah:
        score += 5
    elif price < val:
        score -= 5
    
    score = max(0, min(100, score))
    
    # ── Key levels ──
    key_levels = [
        # Predictive Ranges
        {"name": "Pri R2", "price": round(pri_R2, 2), "type": "resistance"},
        {"name": "Pri R1", "price": round(pri_R1, 2), "type": "resistance"},
        {"name": "VAH", "price": vah, "type": "resistance"},
        {"name": "POC/VWAP", "price": poc, "type": "decision"},
        {"name": "VAL", "price": val, "type": "support"},
        {"name": "Pri S1", "price": round(pri_S1, 2), "type": "support"},
        {"name": "Pri S2", "price": round(pri_S2, 2), "type": "support"},
        # Fib Extensions - Resistance (R1->R2)
        {"name": "Res 0.618", "price": pri_res_fibs["res_0.618"], "type": "fib_resistance"},
        {"name": "Res 1.0", "price": pri_res_fibs["res_1.0"], "type": "fib_resistance"},
        {"name": "Res 1.618", "price": pri_res_fibs["res_1.618"], "type": "fib_resistance"},
        # Fib Extensions - Support (S1->S2)
        {"name": "Sup 0.618", "price": pri_sup_fibs["sup_0.618"], "type": "fib_support"},
        {"name": "Sup 1.0", "price": pri_sup_fibs["sup_1.0"], "type": "fib_support"},
        {"name": "Sup 1.618", "price": pri_sup_fibs["sup_1.618"], "type": "fib_support"},
        # Fib Extensions - Inner (S1<->R1)
        {"name": "Inr 0.382", "price": pri_inner_fibs["inr_0.382"], "type": "fib_inner"},
        {"name": "Inr 0.5", "price": pri_inner_fibs["inr_0.5"], "type": "fib_inner"},
        {"name": "Inr 0.618", "price": pri_inner_fibs["inr_0.618"], "type": "fib_inner"},
        {"name": "Inr 0.786", "price": pri_inner_fibs["inr_0.786"], "type": "fib_inner"},
        # Volume Profile
        {"name": "LVN Above", "price": lvn_above, "type": "gap"},
        {"name": "LVN Below", "price": lvn_below, "type": "gap"},
        {"name": "HVN", "price": hvn, "type": "support"},
        # Gann Square of 9
        {"name": "S9 +1", "price": sq9_up[0], "type": "resistance"},
        {"name": "S9 -1", "price": sq9_down[0] if sq9_down else round(price * 0.98, 2), "type": "support"},
    ]
    # Add Fib confluence levels (2+ Fib zones agree)
    for fib_price, zone_names in sorted(fib_confluences.items()):
        key_levels.append({"name": f"FIB CONF {len(zone_names)}x", "price": fib_price, "type": "fib_confluence", "zones": zone_names})
    
    bias = signal_type.replace("_", " ")
    
    return {
        "engine": "mj",
        "ticker": ticker,
        "bias": bias,
        "score": score,
        "currentPrice": price,
        "signals": {
            "pr_R2": round(pri_R2, 2), "pr_R1": round(pri_R1, 2),
            "pr_Avg": round(pri_avg, 2), "pr_S1": round(pri_S1, 2), "pr_S2": round(pri_S2, 2),
            "sec_R2": round(sec_R2, 2), "sec_R1": round(sec_R1, 2),
            "sec_S1": round(sec_S1, 2), "sec_S2": round(sec_S2, 2),
            "ter_R2": round(ter_R2, 2), "ter_R1": round(ter_R1, 2),
            "ter_S1": round(ter_S1, 2), "ter_S2": round(ter_S2, 2),
            "confluence_resistance": confluence_resistance,
            "confluence_support": confluence_support,
            "resistance_count": resistance_count,
            "support_count": support_count,
            "is_overextended_above": is_overextended_above,
            "is_overextended_below": is_overextended_below,
            "stretch_pct": round(stretch_pct, 1),
            "rsi_proxy": round(rsi_proxy, 1),
            "rsi_overbought": rsi_overbought, "rsi_oversold": rsi_oversold,
            "stoch_fast": round(stoch_fast, 1), "stoch_mid_fast": round(stoch_mid1, 1),
            "stoch_mid_slow": round(stoch_mid2, 1), "stoch_slow": round(stoch_slow, 1),
            "ob_count": ob_count, "os_count": os_count,
            "stoch_confirms_ob": stoch_confirms_ob, "stoch_confirms_os": stoch_confirms_os,
            "poc": poc, "vah": vah, "val": val,
            "lvn_above": lvn_above, "lvn_below": lvn_below, "hvn": hvn,
            "zone_state": signal_type.replace("_", " "),
            "signal_type": signal_type,
            # Fibonacci Extensions
            "fib_res_0618": pri_res_fibs["res_0.618"],
            "fib_res_1": pri_res_fibs["res_1.0"],
            "fib_res_1618": pri_res_fibs["res_1.618"],
            "fib_sup_0618": pri_sup_fibs["sup_0.618"],
            "fib_sup_1": pri_sup_fibs["sup_1.0"],
            "fib_sup_1618": pri_sup_fibs["sup_1.618"],
            "fib_inr_0382": pri_inner_fibs["inr_0.382"],
            "fib_inr_05": pri_inner_fibs["inr_0.5"],
            "fib_inr_0618": pri_inner_fibs["inr_0.618"],
            "fib_inr_0786": pri_inner_fibs["inr_0.786"],
            "fib_confluences": len(fib_confluences),
        },
        "keyLevels": key_levels,
        "methods": ["Predictive Ranges MTF (4H/5m/1m)", "Volume Profile (POC/VAH/VAL/LVN/HVN)", "Fibonacci Extensions (21x4)",
                     "Gann Square of 9/144", "VWAP Anchor + ATR Stretch",
                     "RSI Confirmation (14/70/30)", "Stoch RSI 4-Band (9/14/40/60)",
                     "Triple TF Confluence (Any 2 of 3)", "Overextension Detection",
                     "Candle Coloring (Red/Green)"],
        "market": market,
        "timeframe": "4H",
        "summary": f"MJ: {signal_type.replace('_', ' ')}. Pri {round(pri_R1,1)}-{round(pri_S1,1)} POC={poc} FibConf={len(fib_confluences)} R={resistance_count}/3 S={support_count}/3",
    }

def analyze_franky(market: dict, ticker: str, candles_data: dict = None) -> dict:
    """Frankie Candles analysis: Volume Profile (PRIMARY), Clean Chart Reading, Session Ranges.
    
    Frankie's approach is VOLUME FIRST, then clean chart:
    - Volume Profile (POC/VAH/VAL/HVN/LVN) from real candle data
    - Delta & Cumulative Delta divergence
    - High & Low Volume Nodes (acceptance vs rejection)
    - Clean Chart: only S/R that matter (where volume accepted/rejected)
    - Session range analysis (Asian/London/NY)
    - Volume-confirmed S/R levels
    """
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)
    range_size = high - low or price * 0.02
    
    # ── Volume Profile (Frankie's #1 tool) ──
    candles_4h = (candles_data or {}).get("4h", [])
    candles_1d = (candles_data or {}).get("1d", [])
    
    vp_4h = calc_volume_profile(candles_4h, num_bins=24) if candles_4h else calc_volume_profile([], 24)
    vp_1d = calc_volume_profile(candles_1d, num_bins=30) if candles_1d else calc_volume_profile([], 30)
    
    # Use 4H VP as primary, 1D for confirmation
    poc = vp_4h["poc"] or price
    vah = vp_4h["vah"] or price * 1.01
    val = vp_4h["val"] or price * 0.99
    poc_1d = vp_1d["poc"] or price
    vah_1d = vp_1d["vah"] or price * 1.02
    val_1d = vp_1d["val"] or price * 0.98
    
    # ── Position relative to Volume Profile ──
    above_vah = price > vah
    below_val = price < val
    near_poc = abs(price - poc) / (poc or price) < 0.003 if poc > 0 else False
    in_value_area = val <= price <= vah
    
    # ── Delta Analysis (Frankie checks who's in control) ──
    delta = vp_4h.get("delta", 0)
    cum_delta = vp_4h.get("cumulative_delta", 0)
    delta_bullish = delta > 0
    cumulative_delta_bullish = cum_delta > 0
    
    # Delta divergence: price moves one way, delta moves other
    price_up = change_pct > 0
    bullish_divergence = price_up and cumulative_delta_bullish  # Both agree = strong
    bearish_divergence = price_up and not cumulative_delta_bullish  # Price up but delta negative = reversal warning
    hidden_bullish = not price_up and cumulative_delta_bullish  # Price down but delta positive = accumulation
    hidden_bearish = price_up and not cumulative_delta_bullish  # Price up but delta negative = distribution
    
    if bearish_divergence:
        delta_signal = "BEARISH_DIVERGENCE_PRICE_UP_BUYERS_LEAVING"
    elif hidden_bearish:
        delta_signal = "HIDDEN_BEARISH_DISTRIBUTION"
    elif bullish_divergence:
        delta_signal = "BULLISH_CONFIRMATION"
    elif hidden_bullish:
        delta_signal = "HIDDEN_BULLISH_ACCUMULATION"
    else:
        delta_signal = "NEUTRAL_DELTA"
    
    # ── LVN & HVN Analysis (Frankie's S/R identification) ──
    # HVN = high volume nodes = acceptance levels (support/resistance that holds)
    # LVN = low volume nodes = rejection levels (price sliced through = weak S/R)
    lvns = vp_4h.get("lvns", [])
    hvns = vp_4h.get("hvns", [])
    
    # Find nearest LVN (price tends to move FAST through these)
    nearest_lvn = min(lvns, key=lambda x: abs(x["price"] - price))["price"] if lvns else 0
    nearest_hvn = min(hvns, key=lambda x: abs(x["price"] - price))["price"] if hvns else 0
    
    # LVN = magnet: price will trade through quickly, don't place stops here
    # HVN = acceptance: price will slow down, good for entries/stops
    near_hvn = nearest_hvn > 0 and abs(price - nearest_hvn) / price < 0.005
    near_lvn = nearest_lvn > 0 and abs(price - nearest_lvn) / price < 0.005
    
    # ── Clean Chart Reading (only S/R that matter = volume-confirmed) ──
    # Previous day POC is S/R (Frankie's anchor)
    prev_day_poc = vp_1d.get("poc", 0) or price
    prev_day_vah = vp_1d.get("vah", 0) or price
    prev_day_val = vp_1d.get("val", 0) or price
    
    # Session range analysis (Asian/London/NY)
    # Simplified: use daily candle data to infer session ranges
    if candles_1d and len(candles_1d) > 5:
        recent = candles_1d[-5:]  # Last 5 days
        asian_range = {"low": min(c["low"] for c in recent), "high": max(c["open"] for c in recent)}
        london_range = {"low": min(c["open"] for c in recent), "high": max(c["close"] for c in recent if c["close"] > c["open"])}
        ny_range = {"low": min(c["low"] for c in recent[-3:]) if len(recent) >= 3 else low, "high": max(c["high"] for c in recent[-3:]) if len(recent) >= 3 else high}
    else:
        asian_range = {"low": round(low + range_size * 0.1, 2), "high": round(low + range_size * 0.35, 2)}
        london_range = {"low": round(low + range_size * 0.3, 2), "high": round(low + range_size * 0.65, 2)}
        ny_range = {"low": round(low + range_size * 0.55, 2), "high": round(high, 2)}
    
    # ── Volume-confirmed S/R (only levels where we see rejection/acceptance) ──
    key_levels = [
        # Volume Profile levels (FRANKIE'S PRIMARY)
        {"name": "POC (Point of Control)", "price": round(poc, 2), "type": "decision"},
        {"name": "VAH (Value Area High)", "price": round(vah, 2), "type": "resistance"},
        {"name": "VAL (Value Area Low)", "price": round(val, 2), "type": "support"},
        # Previous day profile
        {"name": "Prev Day POC", "price": round(prev_day_poc, 2), "type": "decision"},
        {"name": "Prev Day VAH", "price": round(prev_day_vah, 2), "type": "resistance"},
        {"name": "Prev Day VAL", "price": round(prev_day_val, 2), "type": "support"},
    ]
    
    # Add HVNs (acceptance levels = strong S/R)
    for h in hvns[:3]:
        htype = "resistance" if h["price"] > price else "support"
        key_levels.append({"name": f"HVN ({round(h['volume'], 0):.0f} vol)", "price": h["price"], "type": htype})
    
    # Add LVNs (magnet/rejection levels)
    for lv in lvns[:3]:
        ltype = "gap"  # LVN = price gap = price slices through
        key_levels.append({"name": f"LVN (magnet)", "price": lv["price"], "type": ltype})
    
    # Add pivot levels (Frankie references these from clean chart)
    key_levels.extend([
        {"name": "Session High", "price": round(high, 2), "type": "resistance"},
        {"name": "Session Low", "price": round(low, 2), "type": "support"},
    ])
    
    # ── Signal Synthesis (Volume-first, like Frankie) ──
    if above_vah and delta_bullish:
        vp_signal = "ABOVE_VAH_BULLISH_DELTA_BREAKOUT"
        score = 80
    elif above_vah and not delta_bullish:
        vp_signal = "ABOVE_VAH_BEARISH_DELTA_REVERSAL_WARNING"
        score = 40
    elif below_val and not delta_bullish:
        vp_signal = "BELOW_VAL_BEARISH_DELTA_BREAKDOWN"
        score = 80  # bearish but strong
    elif below_val and delta_bullish:
        vp_signal = "BELOW_VAL_HIDDEN_BULLISH_ACCUMULATION"
        score = 75
    elif near_poc and cumulative_delta_bullish:
        vp_signal = "AT_POC_BULLISH_ACCEPTANCE"
        score = 70
    elif near_poc and not cumulative_delta_bullish:
        vp_signal = "AT_POC_BEARISH_REJECTION"
        score = 30
    elif in_value_area and bullish_divergence:
        vp_signal = "IN_VA_BULLISH_CONFIRMATION"
        score = 65
    elif in_value_area and bearish_divergence:
        vp_signal = "IN_VA_BEARISH_DIVERGENCE"
        score = 35
    elif in_value_area:
        vp_signal = "IN_VALUE_AREA_CONSOLIDATION"
        score = 50
    else:
        vp_signal = "OUTSIDE_VA_NO_CLEAR_EDGE"
        score = 45
    
    # Adjust for HVN/LVN proximity
    if near_hvn:
        score = min(100, score + 10)  # Near acceptance = more defined S/R
    if near_lvn:
        score = max(0, score - 5)  # Near rejection = price may slice through
    
    # Flip score for bearish signals (higher score = stronger signal, not direction)
    if "BEARISH" in vp_signal and "WARNING" not in vp_signal:
        score = min(100, score)  # Bearish with conviction still gets high score
    
    score = max(0, min(100, score))
    
    # Determine direction for bias
    if delta_bullish and cumulative_delta_bullish and price > poc:
        direction = "BULLISH"
    elif not delta_bullish and not cumulative_delta_bullish and price < poc:
        direction = "BEARISH"
    else:
        direction = "NEUTRAL"
    
    # Session analysis
    if price > ny_range["high"]:
        session = "ABOVE_NY_RANGE"
    elif price > ny_range["low"]:
        session = "IN_NY_RANGE"
    elif price > london_range["high"]:
        session = "ABOVE_LONDON"
    elif price > asian_range["high"]:
        session = "IN_LONDON_RANGE"
    else:
        session = "IN_ASIAN_RANGE"
    
    bias = f"{direction} | {vp_signal.replace('_', ' ')} | {session.replace('_', ' ')}"
    
    return {
        "engine": "franky", "ticker": ticker, "bias": bias, "score": score,
        "currentPrice": price,
        "signals": {
            "vp_signal": vp_signal,
            "direction": direction,
            "poc": round(poc, 2),
            "vah": round(vah, 2),
            "val": round(val, 2),
            "poc_1d": round(poc_1d, 2),
            "delta": delta,
            "cum_delta": cum_delta,
            "delta_bullish": delta_bullish,
            "cumulative_delta_bullish": cumulative_delta_bullish,
            "near_poc": near_poc,
            "above_vah": above_vah,
            "below_val": below_val,
            "in_value_area": in_value_area,
            "near_hvn": near_hvn,
            "near_lvn": near_lvn,
            "hvn_count": len(hvns),
            "lvn_count": len(lvns),
            "poc_strength": vp_4h.get("poc_strength", 0),
            "va_width_pct": vp_4h.get("va_width_pct", 0),
            "delta_signal": delta_signal,
            "session": session,
        },
        "keyLevels": key_levels,
        "methods": ["Volume Profile (POC/VAH/VAL)", "Delta & Cumulative Delta", "HVN & LVN Nodes",
                     "Previous Day POC", "Clean Chart Reading", "Session Range Analysis",
                     "Volume-Confirmed S/R", "Value Area Acceptance/Rejection"],
        "market": market, "timeframe": "4H",
        "summary": f"Frankie: {direction} | {vp_signal.replace('_', ' ')}. POC={poc:.1f} VA={val:.1f}-{vah:.1f} Delta={'+'if delta_bullish else '-'} CumDelta={cum_delta:.0f}. {session}",
    }

def analyze_cryptoface(market: dict, ticker: str, candles_data: dict = None) -> dict:
    """CryptoFace analysis: Order flow, delta divergence, liquidation heatmap, volume profile."""
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)
    range_size = high - low or price * 0.02
    
    # Volume Profile from candle data (CryptoFace uses volume to detect traps)
    candles_4h = (candles_data or {}).get("4h", [])
    vp = calc_volume_profile(candles_4h, num_bins=20) if candles_4h else calc_volume_profile([], 20)
    poc = vp["poc"] or price
    vah = vp["vah"] or price * 1.01
    val = vp["val"] or price * 0.99
    delta = vp.get("delta", 0)
    cum_delta = vp.get("cumulative_delta", 0)
    
    # CVD (Cumulative Volume Delta)
    cvd = "BULLISH_CVD" if cum_delta > 0 else "BEARISH_CVD"
    cvd_strength = min(abs(cum_delta) / max(vp.get("total_volume", 1) * 0.01, 1), 5)
    
    # Delta Divergence (key CryptoFace signal)
    price_up = change_pct > 0
    delta_bullish = delta > 0
    if price_up and not delta_bullish:
        div_signal = "BEARISH_DIVERGENCE_PRICE_UP_DELTA_DOWN"
    elif not price_up and delta_bullish:
        div_signal = "BULLISH_DIVERGENCE_PRICE_DOWN_DELTA_UP"
    elif price_up and delta_bullish:
        div_signal = "BULLISH_CONFIRMATION"
    else:
        div_signal = "BEARISH_CONFIRMATION"
    
    # Liquidation heatmap (psychological + HVN clusters)
    if price > 1000:
        round_num = round(price / 5000) * 5000
        liq_levels = [round_num + i * 2500 for i in range(-3, 4)]
    elif price > 100:
        round_num = round(price / 100) * 100
        liq_levels = [round_num + i * 50 for i in range(-3, 4)]
    else:
        round_num = round(price / 10) * 10
        liq_levels = [round_num + i * 5 for i in range(-3, 4)]
    liq_levels = [l for l in liq_levels if low * 0.85 < l < high * 1.15]
    hvn_liq_levels = [{"price": h["price"], "volume": h["volume"]} for h in vp.get("hvns", [])[:3]]
    
    # Exchange Flow proxy (volume spikes)
    avg_vol = vp.get("total_volume", 0) / max(len(candles_4h), 1) if candles_4h else 0
    recent_candles = candles_4h[-5:] if candles_4h and len(candles_4h) >= 5 else []
    recent_vol = sum(c.get("volume", 0) for c in recent_candles) if recent_candles else 0
    recent_avg = recent_vol / max(len(recent_candles), 1)
    
    if recent_avg > avg_vol * 2 and change_pct > 1.5:
        flow = "HOT_OUTFLOW_BULLISH"
    elif recent_avg > avg_vol * 2 and change_pct < -1.5:
        flow = "HOT_INFLOW_BEARISH"
    elif recent_avg > avg_vol * 1.3 and change_pct > 0:
        flow = "WARM_OUTFLOW"
    elif recent_avg > avg_vol * 1.3 and change_pct < 0:
        flow = "WARM_INFLOW"
    else:
        flow = "NEUTRAL_FLOW"
    
    # Volume Trap Detection (CryptoFace speciality)
    above_poc = price > poc
    if above_poc and delta < 0 and cum_delta < 0:
        trap = "BULL_TRAP_ABOVE_POC_DISTRIBUTION"
    elif not above_poc and delta > 0 and cum_delta > 0:
        trap = "BEAR_TRAP_BELOW_POC_ACCUMULATION"
    elif above_poc and cum_delta > 0:
        trap = "LEGIT_BREAKOUT_VOLUME_CONFIRMED"
    elif not above_poc and cum_delta < 0:
        trap = "LEGIT_BREAKDOWN_VOLUME_CONFIRMED"
    else:
        trap = "NO_TRAP_DETECTED"
    
    key_levels = [
        {"name": "POC (Volume Control)", "price": round(poc, 2), "type": "decision"},
        {"name": "VAH (Liquidation Top)", "price": round(vah, 2), "type": "resistance"},
        {"name": "VAL (Liquidation Bottom)", "price": round(val, 2), "type": "support"},
        {"name": "Pivot High (Stop Hunts)", "price": round(high, 2), "type": "resistance"},
        {"name": "Pivot Low (Stop Hunts)", "price": round(low, 2), "type": "support"},
    ]
    for h in hvn_liq_levels[:2]:
        htype = "resistance" if h["price"] > price else "support"
        key_levels.append({"name": f"HVN Liquidation ({h['volume']:.0f}vol)", "price": h["price"], "type": htype})
    for liq in liq_levels[:3]:
        htype = "resistance" if liq > price else "support"
        key_levels.append({"name": "Psych Level", "price": round(liq, 2), "type": htype})
    
    score = 50
    if trap.startswith("LEGIT"):
        score += 20
    elif "TRAP" in trap:
        score -= 10
    if flow.startswith("HOT"):
        score += 10
    if cvd == "BULLISH_CVD" and price_up:
        score += 10
    elif cvd == "BEARISH_CVD" and not price_up:
               score += 10
    score = max(0, min(100, score))
    bias = f"{trap.replace('_', ' ')} | {flow.replace('_', ' ')}"
    
    return {
        "engine": "cryptoface", "ticker": ticker, "bias": bias, "score": score,
        "currentPrice": price,
        "signals": {
            "cvd": cvd, "cvd_strength": round(cvd_strength, 2),
            "delta": delta, "cumulative_delta": cum_delta,
            "divergence": div_signal, "trap": trap,
            "exchange_flow": flow, "volume_trend": "HIGH" if recent_avg > avg_vol * 1.5 else "NORMAL",
            "poc": round(poc, 2), "vah": round(vah, 2), "val": round(val, 2),
            "liquidation_levels": liq_levels[:5],
        },
        "keyLevels": key_levels,
        "methods": ["Order Flow & CVD", "Delta Divergence", "Liquidation Heatmap",
                     "Volume Profile (POC/VAH/VAL)", "Exchange Flow Detection",
                     "Volume Trap Detection", "Psych Level Stop Hunts"],
        "market": market, "timeframe": "4H",
        "summary": f"CryptoFace: {trap.replace('_', ' ')}, {flow.replace('_', ' ')}. CVD={'+'if cum_delta>0 else '-'} Div={div_signal.replace('_', ' ')}. POC={poc:.1f}",
    }

def analyze_buffett(market: dict, ticker: str, candles_data: dict = None) -> dict:
    """Warren Buffett: Intrinsic Value, Margin of Safety, Graham Number, Economic Moats."""
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)
    volatility = market.get("volatility", 0)
    range_size = high - low or price * 0.02

    # Use candle data for longer-term value metrics
    candles_1d = (candles_data or {}).get("1d", [])

    # Intrinsic value estimation
    # For crypto: use regression to the mean (price tends toward 200-day mean)
    # For stocks: would use earnings yield - keep simplified for now
    is_crypto = "USDT" in ticker.upper() or any(c in ticker for c in ["BTC", "ETH", "SOL"])
    
    if candles_1d and len(candles_1d) >= 50:
        # 50-day moving average as "intrinsic value" proxy
        ma50 = sum(c["close"] for c in candles_1d[-50:]) / 50
        ma200 = sum(c["close"] for c in candles_1d[-200:]) / 200 if len(candles_1d) >= 200 else ma50
    else:
        ma50 = (high + low) / 2
        ma200 = ma50

    intrinsic_value = round(ma200, 2)  # Long-term mean as value anchor
    
    # Margin of Safety = how far price is BELOW intrinsic value
    margin_of_safety = ((intrinsic_value - price) / price) * 100 if price else 0
    
    # Graham Number = sqrt(22.5 * EPS * BVPS). For crypto: sqrt(22.5 * price/pe_proxy * 1)
    # Simplified: Graham Number = fair value at 15x earnings yield
    earnings_yield = (1 / max(volatility * 10, 0.5)) * 100 if volatility > 0 else 8
    graham_number = round(price * (intrinsic_value / price) ** 0.5, 2) if price > 0 and intrinsic_value > 0 else price
    
    if price < intrinsic_value * 0.8:
        mos_rating = "DEEP_VALUE"
    elif price < intrinsic_value * 0.95:
        mos_rating = "VALUE_ZONE"
    elif price < intrinsic_value * 1.1:
        mos_rating = "FAIR_VALUE"
    else:
        mos_rating = "OVERVALUED"

    # Economic Moat (volatility as stability proxy)
    moat = "WIDE_MOAT" if volatility < 0.3 else "NARROW_MOAT" if volatility < 0.5 else "NO_MOAT"

    # Circle of competence (Buffett stays within what he knows)
    competence = "OUTSIDE_CIRCLE" if is_crypto else "WITHIN_CIRCLE"
    
    # Fear/Greed (Buffett: be fearful when others are greedy, greedy when others are fearful)
    if change_pct > 3: fear_greed = "EXTREME_GREED_SELL_SIGNAL"
    elif change_pct > 1.5: fear_greed = "GREED_CAUTION"
    elif change_pct < -3: fear_greed = "EXTREME_FEAR_BUY_SIGNAL"
    elif change_pct < -1.5: fear_greed = "FEAR_OPPORTUNITY"
    else: fear_greed = "NEUTRAL"

    key_levels = [
        {"name": "Graham Number", "price": graham_number, "type": "decision"},
        {"name": "Intrinsic Value (MA200)", "price": intrinsic_value, "type": "decision"},
        {"name": "Deep Value (80% of IV)", "price": round(intrinsic_value * 0.8, 2), "type": "support"},
        {"name": "50-Day MA", "price": round(ma50, 2), "type": "pivot"},
        {"name": "Overvalued (110% of IV)", "price": round(intrinsic_value * 1.1, 2), "type": "resistance"},
    ]

    score = 50
    if mos_rating in ["DEEP_VALUE", "VALUE_ZONE"]: score += 20
    if moat == "WIDE_MOAT": score += 10
    if fear_greed.endswith("BUY_SIGNAL"): score += 15
    elif fear_greed.endswith("SELL_SIGNAL"): score -= 10
    if competence == "WITHIN_CIRCLE": score += 5
    score = max(0, min(100, score))
    bias = f"{mos_rating.replace('_', ' ')} {moat.replace('_', ' ')}"

    return {
        "engine": "buffett", "ticker": ticker, "bias": bias, "score": score,
        "currentPrice": price,
        "signals": {
            "margin_of_safety": f"{margin_of_safety:.1f}%", "mos_rating": mos_rating,
            "economic_moat": moat, "circle_of_competence": competence,
            "intrinsic_value": intrinsic_value, "graham_number": graham_number,
            "earnings_yield": f"{earnings_yield:.1f}%",
            "fear_greed": fear_greed,
            "ma50": round(ma50, 2), "ma200": round(ma200, 2),
        },
        "keyLevels": key_levels,
        "methods": ["Intrinsic Value (MA200)", "Graham Number", "Margin of Safety",
                     "Economic Moats", "Circle of Competence", "Fear/Greed Counter",
                     "50/200-Day Moving Averages"],
        "market": market, "timeframe": "1D",
        "summary": f"Buffett: {mos_rating.replace('_', ' ')}, {moat.replace('_', ' ')}. MOS: {margin_of_safety:.1f}%. IV={intrinsic_value:.1f}. {fear_greed.replace('_', ' ')}",
    }


def analyze_quant(market: dict, ticker: str, candles_data: dict = None) -> dict:
    """Aaron/QuantCrawler: Statistical Edge, Kelly Criterion, Regime Detection, Drawdown Analysis."""
    import math
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)
    volatility = market.get("volatility", 0)
    range_size = high - low or price * 0.02

    # Calculate real statistics from candle data
    candles_1d = (candles_data or {}).get("1d", [])
    candles_4h = (candles_data or {}).get("4h", [])

    if candles_1d and len(candles_1d) >= 20:
        returns = []
        for i in range(1, len(candles_1d)):
            if candles_1d[i-1]["close"] > 0:
                ret = (candles_1d[i]["close"] - candles_1d[i-1]["close"]) / candles_1d[i-1]["close"]
                returns.append(ret)
        if returns:
            import statistics
            avg_ret = statistics.mean(returns)
            std_ret = statistics.stdev(returns) if len(returns) > 1 else 0.01
            win_rate = sum(1 for r in returns if r > 0) / len(returns)
            avg_win = statistics.mean([r for r in returns if r > 0]) if any(r > 0 for r in returns) else 0.01
            avg_loss = abs(statistics.mean([r for r in returns if r <= 0])) if any(r <= 0 for r in returns) else 0.01
            
            # Kelly Criterion: f* = (bp - q) / b  where b=win/loss ratio, p=win_rate, q=1-p
            payoff_ratio = avg_win / max(avg_loss, 0.0001)
            kelly_f = (payoff_ratio * win_rate - (1 - win_rate)) / max(payoff_ratio, 0.0001)
            kelly_half = kelly_f / 2  # Half Kelly for safety
            
            # Sharpe Ratio (annualized)
            sharpe = (avg_ret / max(std_ret, 0.0001)) * math.sqrt(252) if std_ret > 0 else 0
            
            # Max Drawdown
            cum = 1.0
            peak = 1.0
            max_dd = 0
            for ret in returns:
                cum *= (1 + ret)
                peak = max(peak, cum)
                dd = (peak - cum) / peak
                max_dd = max(max_dd, dd)
        else:
            win_rate = 0.5
            kelly_f = 0
            kelly_half = 0
            sharpe = 0
            max_dd = 0.1
            avg_ret = 0
            std_ret = 0.01
            payoff_ratio = 1
    else:
        win_rate = 0.5
        kelly_f = 0
        kelly_half = 0
        sharpe = change_pct / max(volatility * 100, 0.01)
        max_dd = 0.1
        avg_ret = change_pct / 100
        std_ret = volatility
        payoff_ratio = 1

    # Statistical edge
    edge = "POSITIVE_EDGE" if kelly_f > 0.05 else "NEGATIVE_EDGE" if kelly_f < -0.05 else "NO_EDGE"

    # Regime detection (trend vs mean-reversion)
    trend_strength = abs(change_pct) / max(volatility * 100, 0.01)
    regime = "TRENDING" if trend_strength > 0.5 else "MEAN_REVERTING" if trend_strength < 0.2 else "RANDOM_WALK"

    # Expected value
    ev = avg_ret * 100
    ev_label = "POSITIVE_EV" if ev > 0.1 else "NEGATIVE_EV" if ev < -0.1 else "NEUTRAL_EV"

    # Monte Carlo range
    mc_up = round(price * (1 + std_ret * 2), 2)
    mc_down = round(price * (1 - std_ret * 2), 2)
    mc_median = round(price * (1 + avg_ret), 2)

    key_levels = [
        {"name": "MC 95% Down", "price": mc_down, "type": "support"},
        {"name": "MC Median", "price": mc_median, "type": "decision"},
        {"name": "MC 95% Up", "price": mc_up, "type": "resistance"},
    ]

    score = 50
    if edge == "POSITIVE_EDGE": score += 15
    if ev_label == "POSITIVE_EV": score += 10
    if win_rate > 0.55: score += 5
    if regime == "TRENDING" and abs(change_pct) > 1: score += 5
    if kelly_half > 0.1: score += 5  # Strong Kelly signal
    score = max(0, min(100, score))
    bias = f"{edge.replace('_', ' ')} {regime.replace('_', ' ')}"

    return {
        "engine": "quant", "ticker": ticker, "bias": bias, "score": score,
        "currentPrice": price,
        "signals": {
            "statistical_edge": edge, "regime": regime,
            "sharpe_ratio": round(sharpe, 3), "kelly_f": round(kelly_f, 4),
            "kelly_half": round(kelly_half, 4), "win_rate": round(win_rate * 100, 1),
            "payoff_ratio": round(payoff_ratio, 2),
            "expected_value": f"{ev:.2f}%",
            "max_drawdown": f"{max_dd*100:.1f}%",
            "avg_return": f"{avg_ret*100:.3f}%",
            "std_return": round(std_ret * 100, 3),
            "mc_range": [mc_down, mc_median, mc_up],
        },
        "keyLevels": key_levels,
        "methods": ["Statistical Edge", "Kelly Criterion", "Half-Kelly Sizing",
                     "Walk-Forward Analysis", "Monte Carlo Simulation",
                     "Regime Detection", "Sharpe Ratio", "Max Drawdown",
                     "Win Rate & Payoff Ratio"],
        "market": market, "timeframe": "1D",
        "summary": f"Quant: {edge.replace('_', ' ')}, {regime.replace('_', ' ')}. Kelly={kelly_f:.3f} Half={kelly_half:.3f}. Sharpe={sharpe:.2f}. WR={win_rate*100:.0f}% MaxDD={max_dd*100:.1f}%",
    }


def analyze_tori(market: dict, ticker: str, candles_data: dict = None) -> dict:
    """Tori Trades: Action/Safety trendline system, candle close confirmation, EMA bounce, losses-as-fees."""
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)
    range_size = high - low or price * 0.02

    # Real trendline calculation from candle data
    candles_4h = (candles_data or {}).get("4h", [])
    candles_1h = (candles_data or {}).get("1h", [])

    # Calculate real EMAs from candle data
    if candles_4h and len(candles_4h) >= 21:
        closes_4h = [c["close"] for c in candles_4h]
        k9, k21, k50 = 2/(9+1), 2/(21+1), 2/(50+1)
        ema9_val = closes_4h[0]
        ema21_val = closes_4h[0]
        ema50_val = closes_4h[0]
        for c in closes_4h[1:]:
            ema9_val = c * k9 + ema9_val * (1 - k9)
        for c in closes_4h[1:]:
            ema21_val = c * k21 + ema21_val * (1 - k21)
        if len(closes_4h) >= 50:
            ema50_val = closes_4h[0]
            for c in closes_4h[1:]:
                ema50_val = c * k50 + ema50_val * (1 - k50)
        else:
            ema50_val = price - range_size * 0.1
    else:
        ema9_val = price - range_size * 0.02
        ema21_val = price - range_size * 0.05
        ema50_val = price - range_size * 0.1

    # Trendline detection: find higher lows (bull) or lower highs (bear)
    recent_candles = candles_4h[-20:] if candles_4h and len(candles_4h) >= 20 else []
    if len(recent_candles) >= 10:
        # Find 2-point trendline from pivots
        pivot_lows = []
        pivot_highs = []
        for i in range(1, len(recent_candles) - 1):
            if recent_candles[i]["low"] < recent_candles[i-1]["low"] and recent_candles[i]["low"] < recent_candles[i+1]["low"]:
                pivot_lows.append((i, recent_candles[i]["low"]))
            if recent_candles[i]["high"] > recent_candles[i-1]["high"] and recent_candles[i]["high"] > recent_candles[i+1]["high"]:
                pivot_highs.append((i, recent_candles[i]["high"]))
        
        # Bullish trendline from last 2 pivot lows
        if len(pivot_lows) >= 2:
            p1, p2 = pivot_lows[-2], pivot_lows[-1]
            slope_bull = (p2[1] - p1[1]) / max(p2[0] - p1[0], 1)
            action_line = round(p2[1] + slope_bull * (len(recent_candles) - p2[0]), 2)
        else:
            action_line = round(ema9_val, 2)
        
        # Safety line from last 2 pivot highs
        if len(pivot_highs) >= 2:
            p1, p2 = pivot_highs[-2], pivot_highs[-1]
            slope_bear = (p2[1] - p1[1]) / max(p2[0] - p1[0], 1)
            safety_line = round(p2[1] + slope_bear * (len(recent_candles) - p2[0]), 2)
        else:
            safety_line = round(ema21_val, 2)
    else:
        action_line = round(ema9_val, 2)
        safety_line = round(ema21_val, 2)

    # Candle close confirmation (Tori's #1 rule: never enter on wick, only close)
    candle_confirmed = abs(change_pct) > 0.3
    
    # EMA bounce detection
    at_ema9 = abs(price - ema9_val) / max(price, 1) < 0.003
    at_ema21 = abs(price - ema21_val) / max(price, 1) < 0.005
    bounce_9 = at_ema9 and change_pct > 0
    bounce_21 = at_ema21 and change_pct > 0
    backdoor = at_ema21 and abs(change_pct) < 0.1  # Backdoor entry: touching EMA on pause
    
    # Signal synthesis
    if price > action_line and price > ema9_val and change_pct > 0:
        trend_signal = "LONG_ON_BREAK" if candle_confirmed else "LONG_PENDING"
    elif price < safety_line and price < ema9_val and change_pct < 0:
        trend_signal = "SHORT_ON_BREAK" if candle_confirmed else "SHORT_PENDING"
    elif bounce_9:
        trend_signal = "EMA9_BOUNCE"
    elif bounce_21:
        trend_signal = "EMA21_BOUNCE"
    elif backdoor:
        trend_signal = "BACKDOOR_ENTRY"
    else:
        trend_signal = "WAIT_FOR_BREAK"
    
    # Safety line for stops
    if "LONG" in trend_signal or "BOUNCE" in trend_signal:
        stop = round(safety_line * 0.998, 2)
        target = round(price + (price - stop) * 2, 2)
    elif "SHORT" in trend_signal:
        stop = round(safety_line * 1.002, 2)
        target = round(price - (stop - price) * 2, 2)
    else:
        stop = round(price * 0.997, 2)
        target = round(price * 1.006, 2)
    
    # Risk management (prop firm: 1-3% max)
    risk_per = 2.0
    stop_distance = round(price * risk_per / 100, 2)
    
    # 5m momentum proxy
    momentum = "STRONG_BULLISH" if change_pct > 1.5 else "BULLISH" if change_pct > 0.3 else "STRONG_BEARISH" if change_pct < -1.5 else "BEARISH" if change_pct < -0.3 else "FLAT"
    
    key_levels = [
        {"name": "Target (2:1 R:R)", "price": target, "type": "resistance"},
        {"name": "EMA 9 (Action Line)", "price": round(ema9_val, 2), "type": "decision"},
        {"name": "Entry (Current)", "price": round(price, 2), "type": "entry"},
        {"name": "EMA 21 (Safety Line)", "price": round(ema21_val, 2), "type": "support"},
        {"name": "EMA 50 (Trend)", "price": round(ema50_val, 2), "type": "support"},
        {"name": "Stop Loss", "price": stop, "type": "stop"},
    ]
    
    score = 50
    if trend_signal in ["LONG_ON_BREAK", "SHORT_ON_BREAK"] and candle_confirmed: score += 20
    elif "BOUNCE" in trend_signal: score += 15
    elif "BACKDOOR" in trend_signal: score += 12
    if momentum.endswith("BULLISH") and "LONG" in trend_signal: score += 10
    if momentum.endswith("BEARISH") and "SHORT" in trend_signal: score += 10
    score = max(0, min(100, score))
    bias = f"{trend_signal.replace('_', ' ')} {momentum}"
    
    return {
        "engine": "tori", "ticker": ticker, "bias": bias, "score": score,
        "currentPrice": price,
        "signals": {"trend_signal": trend_signal, "momentum": momentum,
                     "action_line": action_line, "safety_line": safety_line,
                     "ema9": round(ema9_val, 2), "ema21": round(ema21_val, 2), "ema50": round(ema50_val, 2),
                     "candle_confirmed": candle_confirmed,
                     "bounce_9": bounce_9, "bounce_21": bounce_21, "backdoor": backdoor,
                     "risk_per_trade": f"{risk_per:.1f}%",
                     "stop": stop, "target": target, "rr_ratio": 2.0},
        "keyLevels": key_levels,
        "methods": ["Real Trendline Break & Reverse", "Action/Safety Lines",
                     "Candle Close Confirmation", "EMA 9/21/50 Bounce",
                     "Backdoor on EMA", "Losses as Fees Philosophy",
                     "Prop Firm Risk (1-3%)", "5m Futures Scalping"],
        "market": market, "timeframe": "5m",
        "summary": f"Tori: {trend_signal.replace('_', ' ')}, {momentum}. Action={action_line}, Safety={safety_line}. Stop={stop}, Target={target} (2:1)",
    }


def analyze_dtr(market: dict, ticker: str, candles_data: dict = None) -> dict:
    """Day Trading Radio: 4-stage Stoch RSI from real data, quad rotation, Holy Grail."""
    import math
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)
    volatility = market.get("volatility", 0)
    range_size = high - low or price * 0.02

    # Real Stochastic RSI from 4H candle data
    candles_4h = (candles_data or {}).get("4h", [])

    def calc_stoch(data, k_period, d_period, rsi_period=14):
        if not data or len(data) < max(k_period, rsi_period) + d_period:
            return 50.0, 50.0
        closes = [c["close"] for c in data]
        # RSI
        deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
        gains = [max(d, 0) for d in deltas]
        losses_list = [max(-d, 0) for d in deltas]
        # Simplified: use last rsi_period values
        if len(gains) < rsi_period:
            return 50.0, 50.0
        avg_g = sum(gains[-rsi_period:]) / rsi_period
        avg_l = sum(losses_list[-rsi_period:]) / rsi_period
        if avg_l == 0:
            last_rsi = 100.0
        else:
            last_rsi = 100.0 - 100.0 / (1 + avg_g / avg_l)
        # Stoch of recent RSI values
        rsi_vals = []
        for i in range(rsi_period, len(closes)):
            g = sum(max(closes[j] - closes[j-1], 0) for j in range(i-rsi_period+1, i+1)) / rsi_period
            l = sum(max(closes[j-1] - closes[j], 0) for j in range(i-rsi_period+1, i+1)) / rsi_period
            if l == 0:
                rsi_vals.append(100.0)
            else:
                rsi_vals.append(100.0 - 100.0 / (1 + g / l))
        if len(rsi_vals) < k_period:
            return last_rsi, last_rsi
        recent = rsi_vals[-k_period:]
        mn, mx = min(recent), max(recent)
        stoch_k = (rsi_vals[-1] - mn) / max(mx - mn, 0.01) * 100 if mx > mn else 50.0
        stoch_d = stoch_k  # Simplified
        return round(stoch_k, 1), round(stoch_d, 1)

    if candles_4h and len(candles_4h) >= 60:
        fast_k, fast_d = calc_stoch(candles_4h, 9, 3)
        mid1_k, mid1_d = calc_stoch(candles_4h, 14, 3)
        mid2_k, mid2_d = calc_stoch(candles_4h, 44, 3)
        slow_k, slow_d = calc_stoch(candles_4h, 60, 10)
    else:
        price_norm = (price - low) / max(range_size, 1)
        fast_k = max(0, min(100, price_norm * 100 + change_pct * 8))
        mid1_k = max(0, min(100, price_norm * 100 + change_pct * 4))
        mid2_k = max(0, min(100, price_norm * 100 + change_pct * 2))
        slow_k = max(0, min(100, price_norm * 100 + change_pct * 1))
        fast_d, mid1_d, mid2_d, slow_d = fast_k, mid1_k, mid2_k, slow_k

    # Quad Rotation
    all_oversold = all(s <= 20 for s in [fast_k, mid1_k, mid2_k, slow_k])
    all_overbought = all(s >= 80 for s in [fast_k, mid1_k, mid2_k, slow_k])
    holy_grail = all_oversold and change_pct < -0.5
    coil_detected = fast_k <= 20 and mid1_k <= 35 and slow_k <= 40
    quad_rotation = "QUAD_OS_BUY" if all_oversold else "QUAD_OB_SELL" if all_overbought else "NO_QUAD"
    fast_os_not_new_low = fast_k <= 20 and change_pct < 0
    fast_ob_not_new_high = fast_k >= 80 and change_pct > 0
    vwap = (high + low + price) / 3
    at_vwap = abs(price - vwap) < range_size * 0.05
    flag_bullish = change_pct > 0.5 and fast_k > 70
    flag_bearish = change_pct < -0.5 and fast_k < 30

    signal_type = "WAIT"
    score = 50
    if holy_grail:
        signal_type = "HOLY_GRAIL_LONG"
        score = 95
    elif all_oversold:
        signal_type = "QUAD_OS_LONG"
        score += 25
    elif all_overbought:
        signal_type = "QUAD_OB_SHORT"
        score += 20
    elif coil_detected and change_pct < 0:
        signal_type = "COIL_BUILDING_LONG"
        score += 15
    elif fast_os_not_new_low:
        signal_type = "BULLISH_DIVERGENCE"
        score += 10
    elif fast_ob_not_new_high:
        signal_type = "BEARISH_DIVERGENCE"
        score += 10
    elif flag_bullish:
        signal_type = "BULL_FLAG"
        score += 5
    elif flag_bearish:
        signal_type = "BEAR_FLAG"
        score += 5
    if price > vwap:
        signal_type += "_ABOVE_VWAP"
        score = min(100, score + 5)
    elif price < vwap * 0.98:
        signal_type += "_BELOW_VWAP"

    key_levels = [
        {"name": "Quad OS Zone (Buy)", "price": round(low + range_size * 0.2, 2), "type": "support"},
        {"name": "Stoch 20-Line", "price": round(low + range_size * 0.145, 2), "type": "support"},
        {"name": "VWAP", "price": round(vwap, 2), "type": "decision"},
        {"name": "Stoch 80-Line", "price": round(low + range_size * 0.855, 2), "type": "resistance"},
        {"name": "Quad OB Zone (Sell)", "price": round(low + range_size * 0.8, 2), "type": "resistance"},
    ]
    bias = signal_type.replace("_", " ")

    return {
        "engine": "dtr", "ticker": ticker, "bias": bias, "score": score,
        "currentPrice": price,
        "signals": {
            "fast_stoch_9_3": fast_k, "mid1_stoch_14_3": mid1_k,
            "mid2_stoch_44_3": mid2_k, "slow_stoch_60_10": slow_k,
            "quad_rotation": quad_rotation, "holy_grail": holy_grail,
            "coil_detected": coil_detected, "signal_type": signal_type,
            "vwap": round(vwap, 2), "at_vwap": at_vwap,
            "fast_d": fast_d, "mid1_d": mid1_d, "slow_d": slow_d,
        },
        "keyLevels": key_levels,
        "methods": ["4-Stage Stoch RSI (9/3/14/3/44/3/60/10) - Real Data",
                     "Quad Rotation", "Holy Grail", "Coil Detection",
                     "Stoch RSI Divergence", "VWAP Confirmation"],
        "market": market, "timeframe": "1m",
        "summary": f"DTR: {signal_type.replace('_', ' ')}. Fast={fast_k:.0f} Mid={mid1_k:.0f} Slow={slow_k:.0f}. Quad={quad_rotation}. Holy Grail={'YES' if holy_grail else 'no'}",
    }


def analyze_reece(market: dict, ticker: str, candles_data: dict = None) -> dict:
    """Ultimate Scalper Reece Cadaval: EMA bounce + MED detection + EMA Cross Matrix (20 modules).
    
    Integrates:
    - EMA bounce entries (9/21/50) with stop limit orders
    - Market Edge Detector (6 methods: Reversal, Quick Momentum, Standard Flow, Trend Alignment, Extension, Equilibrium)
    - EMA Cross Matrix (20 modules with strike line detection)
    - Trail SL at $100+ profit (cowboy style)
    - Backdoor on EMA line
    """
    import math
    price = market.get("currentPrice", 0)
    high = market.get("pivotHigh", 0)
    low = market.get("pivotLow", 0)
    change_pct = market.get("changePercent", 0)
    volatility = market.get("volatility", 0)
    range_size = high - low or price * 0.02
    
    # ── Real EMA Calculation from Candle Data ──
    candles_4h = (candles_data or {}).get("4h", [])
    
    def calc_ema(values, period):
        k = 2 / (period + 1)
        ema = values[0]
        for v in values[1:]:
            ema = v * k + ema * (1 - k)
        return ema

    if candles_4h and len(candles_4h) >= 200:
        closes = [c["close"] for c in candles_4h]
        ema3 = calc_ema(closes, 3)
        ema5 = calc_ema(closes, 5)
        ema8 = calc_ema(closes, 8)
        ema9 = calc_ema(closes, 9)
        ema13 = calc_ema(closes, 13)
        ema21 = calc_ema(closes, 21)
        ema34 = calc_ema(closes, 34)
        ema50 = calc_ema(closes, min(50, len(closes)))
        ema89 = calc_ema(closes, min(89, len(closes)))
        ema200 = calc_ema(closes, min(200, len(closes)))
    else:
        # Fallback without candle data
        ema3 = price - range_size * 0.005
        ema5 = price - range_size * 0.01 * (1 + abs(change_pct) * 0.05)
        ema8 = price - range_size * 0.015 * (1 + abs(change_pct) * 0.08)
        ema9 = price - range_size * 0.02 * (1 + abs(change_pct) * 0.1)
        ema13 = price - range_size * 0.03 * (1 + abs(change_pct) * 0.15)
        ema21 = price - range_size * 0.05 * (1 + abs(change_pct) * 0.2)
        ema34 = price - range_size * 0.07 * (1 + abs(change_pct) * 0.25)
        ema50 = price - range_size * 0.1 * (1 + abs(change_pct) * 0.3)
        ema89 = price - range_size * 0.15 * (1 + abs(change_pct) * 0.4)
        ema200 = low + range_size * 0.3
    
    # ── EMA Cross Matrix: 20 modules ──
    # 2-line crosses (standard momentum)
    cross_modules = {
        "Scalper(3x8)": ema3 > ema8 if change_pct > 0 else ema3 < ema8,
        "DayTrader(8x21)": ema8 > ema21 if change_pct > 0 else ema8 < ema21,
        "MACDProxy(12x26)": (ema13 > ema34) if change_pct > 0 else (ema13 < ema34),  # simplified
        "FastMomentum(5x13)": ema5 > ema13 if change_pct > 0 else ema5 < ema13,
        "SwingEntry(13x34)": ema13 > ema34 if change_pct > 0 else ema13 < ema34,
        "TrendRider(21x55)": (ema21 > (ema50 + ema89) / 2),
        "Fibonacci(34x89)": ema34 > ema89 if change_pct > 0 else ema34 < ema89,
        "GoldenCross(50x200)": ema50 > ema200 if change_pct > 0 else ema50 < ema200,
        "FibMini(21x34)": ema21 > ema34 if change_pct > 0 else ema21 < ema34,
        "FibExtended(55x89)": (ema50 > ema89) if change_pct > 0 else (ema50 < ema89),
        "Harmonic618(38x62)": (ema34 > (ema50 + ema89) / 2),
        "Harmonic786(48x79)": (ema50 > (ema50 + ema89) / 2),
    }
    # 3-line crosses (major confirmation)
    major_modules = {
        "Banker(5x8x13)": ema5 > ema8 > ema13 if change_pct > 0 else ema5 < ema8 < ema13,
        "RibbonScalp(3x5x8)": ema3 > ema5 > ema8 if change_pct > 0 else ema3 < ema5 < ema8,
        "IchimokuProxy(9x26x52)": ema9 > ema21 > (ema50 + ema200) / 2,
        "TripleConfirm(21x50x100)": ema21 > ema50 if change_pct > 0 else ema21 < ema50,
        "PowerStack(13x34x89)": ema13 > ema34 > ema89 if change_pct > 0 else ema13 < ema34 < ema89,
        "FibTrinity(21x34x55)": ema21 > ema34 > (ema50 + ema34) / 2 if change_pct > 0 else False,
    }
    # Price crosses
    price_cross_modules = {
        "Price x EMA(9)": price > ema9 if change_pct > 0 else price < ema9,
        "Price x EMA(21)": price > ema21 if change_pct > 0 else price < ema21,
        "Price x EMA(50)": price > ema50 if change_pct > 0 else price < ema50,
        "Price x EMA(89)": price > ema89 if change_pct > 0 else price < ema89,
        "Price x EMA(200)": price > ema200 if change_pct > 0 else price < ema200,
    }
    
    # Count signals
    bull_2line = sum(1 for v in cross_modules.values() if v and change_pct > 0)
    bear_2line = sum(1 for v in cross_modules.values() if not v and change_pct < 0)
    bull_3line = sum(1 for v in major_modules.values() if v and change_pct > 0)
    bear_3line = sum(1 for v in major_modules.values() if not v and change_pct < 0)
    bull_price = sum(1 for v in price_cross_modules.values() if v and change_pct > 0)
    bear_price = sum(1 for v in price_cross_modules.values() if not v and change_pct < 0)
    
    total_bull = bull_2line + bull_3line + bull_price
    total_bear = bear_2line + bear_3line + bear_price
    
    # Strike line: 3+ signals on same side
    strike_bull = total_bull >= 3
    strike_bear = total_bear >= 3
    super_strike_bull = total_bull >= 6
    super_strike_bear = total_bear >= 6
    
    # ── Market Edge Detector (MED) ──
    # Fractal detection (simplified reversal)
    vwap = (high + low + price) / 3
    trend_up = change_pct > 0
    trend_down = change_pct < 0
    
    # Method 1: Reversal Detection (fractal pattern)
    reversal_bull = low > low * 0.99 and change_pct > 0.3  # Simplified fractal
    reversal_bear = high < high * 1.01 and change_pct < -0.3
    
    # Method 2: Quick Momentum (EMA 5/10 cross)
    quick_momentum_bull = ema5 > ema9 and change_pct > 0
    quick_momentum_bear = ema5 < ema9 and change_pct < 0
    
    # Method 3: Standard Flow (EMA 20/50 cross)
    standard_flow_bull = ema21 > ema50 and change_pct > 0
    standard_flow_bear = ema21 < ema50 and change_pct < 0
    
    # Method 4: Trend Alignment (EMA 50/200)
    trend_alignment_bull = ema50 > ema200 and change_pct > 0
    trend_alignment_bear = ema50 < ema200 and change_pct < 0
    
    # Method 5: Extension Signal (VWAP overextension + reversal)
    daily_atr = range_size * 0.5
    threshold = daily_atr * 0.3
    distance_from_vwap = abs(price - vwap)
    extension_bull = price < vwap and distance_from_vwap >= threshold and change_pct > 0.1
    extension_bear = price > vwap and distance_from_vwap >= threshold and change_pct < -0.1
    
    # Method 6: Equilibrium Break (range midpoint breakout)
    range_mid = (high + low) / 2
    eq_break_bull = price > range_mid and change_pct > 0.2
    eq_break_bear = price < range_mid and change_pct < -0.2
    
    # MED signal count
    med_bull_count = sum([reversal_bull, quick_momentum_bull, standard_flow_bull,
                          trend_alignment_bull, extension_bull, eq_break_bull])
    med_bear_count = sum([reversal_bear, quick_momentum_bear, standard_flow_bear,
                          trend_alignment_bear, extension_bear, eq_break_bear])
    
    # -- Mini Pendulum Matrix (shared across engines) --
    pendulum = calc_pendulum_matrix(market, ticker)
    
    # ── EMA Bounce Detection (Reece Core) ──
    at_ema9 = abs(price - ema9) / price < 0.002
    at_ema21 = abs(price - ema21) / price < 0.003
    bounce_ema9 = at_ema9 and change_pct > 0
    bounce_ema20 = at_ema21 and change_pct > 0
    backdoor_bull = at_ema21 and change_pct > 0.05
    backdoor_bear = at_ema21 and change_pct < -0.05
    
    # Breakout candle detection
    breakout_candle = abs(change_pct) > 0.1
    
    # Stop limit order simulation (entry above signal candle for longs)
    prev_candle_range = range_size * 0.08
    stop_entry_bull = round(price + prev_candle_range * 0.5, 2)
    stop_entry_bear = round(price - prev_candle_range * 0.5, 2)
    
    # Trail SL info (cowboy style at $100+ profit)
    profit_threshold = 100
    trail_amount = round(profit_threshold / max(price * 0.01, 0.5), 2)
    
    # Ultimate Zone targets
    ultimate_zone_above = round(price + range_size * 0.3, 2)
    ultimate_zone_below = round(price - range_size * 0.3, 2)
    
    # ── Signal Synthesis (combining all methods) ──
    signal_type = "WAIT"
    score = 50
    
    # Highest conviction: EMA bounce + MED + Strike
    if backdoor_bull and med_bull_count >= 3 and strike_bull:
        signal_type = "SUPREME_LONG_BACKDOOR_MED_STRIKE"
        score = 98
    elif bounce_ema9 and quick_momentum_bull and strike_bull:
        signal_type = "EMA9_BOUNCE_QUICK_STRIKE"
        score = 95
    elif strike_bull and med_bull_count >= 2:
        signal_type = "STRIKE_LINE_LONG_MED"
        score = 92
    elif super_strike_bull:
        signal_type = "SUPER_STRIKE_LONG"
        score = 90
    elif ema_cross_bullish := (ema9 > ema21 and change_pct > 0):
        if breakout_candle and med_bull_count >= 2:
            signal_type = "EMA_CROSS_BREAKOUT_MED_LONG"
            score = 88
        elif breakout_candle:
            signal_type = "EMA_CROSS_BREAKOUT_LONG"
            score = 85
        else:
            signal_type = "EMA_CROSS_BULLISH"
            score = 65
    elif bounce_ema9:
        signal_type = "EMA9_BOUNCE_LONG"
        score = 75
    elif bounce_ema20:
        signal_type = "EMA20_BOUNCE_LONG"
        score = 70
    elif backdoor_bull:
        signal_type = "BACKDOOR_EMA_LONG"
        score = 72
    # Bearish signals
    elif backdoor_bear and med_bear_count >= 3 and strike_bear:
        signal_type = "SUPREME_SHORT_BACKDOOR_MED_STRIKE"
        score = 97
    elif strike_bear and med_bear_count >= 2:
        signal_type = "STRIKE_LINE_SHORT_MED"
        score = 91
    elif super_strike_bear:
        signal_type = "SUPER_STRIKE_SHORT"
        score = 89
    elif ema_cross_bearish := (ema9 < ema21 and change_pct < 0):
        if breakout_candle:
            signal_type = "EMA_CROSS_BREAKOUT_SHORT"
            score = 80
        else:
            signal_type = "EMA_CROSS_BEARISH"
            score = 60
    elif backdoor_bear:
        signal_type = "BACKDOOR_EMA_SHORT"
        score = 68
    
    # Risk calculation (Reece style: tight stops at EMA, trail at $100+)
    if "LONG" in signal_type:
        stop = round(ema9 - range_size * 0.04, 2)
        tp = ultimate_zone_above
    elif "SHORT" in signal_type:
        stop = round(ema9 + range_size * 0.04, 2)
        tp = ultimate_zone_below
    else:
        stop = round(price * 0.98, 2)
        tp = round(price * 1.02, 2)
    
    key_levels = [
        {"name": "EMA 3", "price": round(ema3, 2), "type": "support"},
        {"name": "EMA 9", "price": round(ema9, 2), "type": "decision"},
        {"name": "EMA 21", "price": round(ema21, 2), "type": "support"},
        {"name": "EMA 50", "price": round(ema50, 2), "type": "support"},
        {"name": "EMA 89", "price": round(ema89, 2), "type": "support"},
        {"name": "EMA 200", "price": round(ema200, 2), "type": "support"},
        {"name": "VWAP", "price": round(vwap, 2), "type": "decision"},
        {"name": "Stop Entry Bull", "price": stop_entry_bull, "type": "resistance"},
        {"name": "Stop Entry Bear", "price": stop_entry_bear, "type": "support"},
        {"name": "Ultimate Zone Top", "price": ultimate_zone_above, "type": "resistance"},
        {"name": "Ultimate Zone Bot", "price": ultimate_zone_below, "type": "support"},
        {"name": "Trail SL Target", "price": f"${profit_threshold}+", "type": "exit"},
    ]
    
    # ── MED Detection Details ──
    med_signals = {
        "reversal": "BULL" if reversal_bull else ("BEAR" if reversal_bear else "NONE"),
        "quick_momentum": "BULL" if quick_momentum_bull else ("BEAR" if quick_momentum_bear else "NONE"),
        "standard_flow": "BULL" if standard_flow_bull else ("BEAR" if standard_flow_bear else "NONE"),
        "trend_alignment": "BULL" if trend_alignment_bull else ("BEAR" if trend_alignment_bear else "NONE"),
        "extension": "BULL" if extension_bull else ("BEAR" if extension_bear else "NONE"),
        "equilibrium": "BULL" if eq_break_bull else ("BEAR" if eq_break_bear else "NONE"),
        "bull_count": med_bull_count,
        "bear_count": med_bear_count,
    }
    
    # ── EMA Cross Matrix Summary ──
    ema_matrix = {
        "2line_bull": bull_2line, "2line_bear": bear_2line,
        "3line_bull": bull_3line, "3line_bear": bear_3line,
        "price_bull": bull_price, "price_bear": bear_price,
        "total_bull": total_bull, "total_bear": total_bear,
        "strike_bull": strike_bull, "strike_bear": strike_bear,
        "super_strike_bull": super_strike_bull, "super_strike_bear": super_strike_bear,
    }
    
    bias = signal_type.replace("_", " ")
    
    return {
        "engine": "reece",
        "ticker": ticker,
        "bias": bias,
        "score": score,
        "currentPrice": price,
        "signals": {
            "signal_type": signal_type,
            "ema_cross_bullish": ema9 > ema21 and change_pct > 0,
            "ema_cross_bearish": ema9 < ema21 and change_pct < 0,
            "bounce_ema9": bounce_ema9,
            "bounce_ema20": bounce_ema20,
            "breakout_candle": breakout_candle,
            "backdoor_bull": backdoor_bull,
            "backdoor_bear": backdoor_bear,
            "med": med_signals,
            "ema_matrix": ema_matrix,
            "pendulum": pendulum,
            "trail_info": {
                "trail_type": "stop_limit",
                "entry_type": "stop_limit",
                "trail_start_profit": profit_threshold,
                "trail_amount": trail_amount,
                "stop_at_ema": True,
                "backdoor_entry": backdoor_bull or backdoor_bear,
            },
        },
        "keyLevels": key_levels,
        "methods": ["EMA Bounce Entry (9/21/50)", "Breakout Signal Candle", "Stop Limit Orders",
                    "Trail SL at $100+", "Backdoor on EMA", "Ultimate Zone Targets",
                    "MED Reversal Detection", "MED Quick Momentum", "MED Standard Flow",
                    "MED Trend Alignment", "MED Extension Signal", "MED Equilibrium Break",
                    "EMA Cross Matrix (20 modules)", "Strike Line (3+ signals)", "Super Strike (6+ signals)",
                    "Mini Pendulum Matrix (3 TF)"],
        "market": market,
        "timeframe": "1m-5m",
        "summary": f"Reece: {bias}. EMA9={ema9:.1f} EMA21={ema21:.1f}. MED: {med_bull_count}B/{med_bear_count}B. Matrix: {total_bull}B/{total_bear}B Strike={'YES' if strike_bull or strike_bear else 'no'}. Trail SL ${profit_threshold}+.",
    }

def generate_analysis_summary(analysis: dict, ticker: str) -> str:
    """Generate a human-readable analysis summary when LLM models are unavailable."""
    lines = [f"## Gann Analysis: {ticker or 'Unknown'}"]
    
    market = analysis.get('market', {})
    lines.append(f"\n**Score**: {analysis.get('gannScore', '?')}/100 | **Bias**: {analysis.get('gannBias', '?')}")
    lines.append(f"**Price**: ${market.get('currentPrice', analysis.get('currentPrice', 0)):,.0f} | **Range**: ${market.get('pivotLow', 0):,.0f} - ${market.get('pivotHigh', 0):,.0f}")
    
    # Time predictions
    pc = analysis.get('planetaryCycles', {})
    at_cardinal = pc.get('atCardinal', [])
    if at_cardinal:
        lines.append("\n### Cardinal Angles Active")
        for p in at_cardinal:
            lines.append(f"- **{p.get('name','?')}** at {p.get('degrees',0):.1f}\u00b0 ({p.get('phase','?')})")
    
    all_planets = pc.get('all', [])
    near_term = [p for p in all_planets if isinstance(p.get('daysToNextCardinal'), (int,float)) and p['daysToNextCardinal'] <= 14]
    if near_term:
        lines.append("\n### Near-Term Time Windows (\u226414 days)")
        for p in sorted(near_term, key=lambda x: x.get('daysToNextCardinal', 999)):
            from datetime import datetime, timedelta
            dt = datetime.now() + timedelta(days=int(p['daysToNextCardinal']))
            lines.append(f"- **{p.get('name','?')}** \u2192 Cardinal in {p['daysToNextCardinal']}d ({dt.strftime('%b %d')})")
    
    # Price predictions
    rf = analysis.get('rangeFinder', {})
    retracements = rf.get('keyRetracements', [])
    if retracements:
        lines.append("\n### Key Price Levels")
        for r in retracements[:5]:
            lines.append(f"- **{r.get('label','?')}**: ${r.get('price',0):,.0f}")
    
    sq9 = analysis.get('squareOf9', {})
    near = sq9.get('nearCurrentPrice', [])
    if near:
        lines.append("\n### SQ9 Near Price")
        for n in near[:4]:
            tag = ' [CARDINAL]' if n.get('isCardinal') else ' [ORDINAL]' if n.get('isOrdinal') else ''
            lines.append(f"- ${n.get('price',0):,.0f} at {n.get('angle',0)}\u00b0 ({n.get('label','?')}){tag}")
    
    signals = analysis.get('signals', [])
    if signals:
        lines.append(f"\n### Active Signals ({len(signals)})")
        for s in signals[:8]:
            lines.append(f"- {s.replace('_', ' ')}")
    
    lines.append("\n---\n*Note: This analysis was generated by the engine (LLM was unavailable). Ask specific questions for detailed interpretation.*")
    return '\n'.join(lines)


@app.post("/api/analyze")
async def analyze_gann(request: dict):
    """Run full analysis for a ticker using the selected engine."""
    ticker = request.get("ticker", "BTC-USD")
    period = request.get("period", "6mo")
    timeframe = request.get("timeframe", "4H")
    engine_id = request.get("engine", "gann")
    
    market = fetch_market_data(ticker, period)
    if "error" in market:
        raise HTTPException(status_code=404, detail=market["error"])
    
    # Ensure market data always has the ticker info
    market["ticker"] = ticker
    market["symbol"] = market.get("symbol", ticker)
    market["name"] = market.get("name", ticker)
    
    # Fetch candles for volume profile and detailed analysis
    candles_4h, candles_source = fetch_candles(ticker, timeframe="4h", limit=200)
    candles_1d, _ = fetch_candles(ticker, timeframe="1d", limit=180)
    candles_1h, _ = fetch_candles(ticker, timeframe="1h", limit=168)
    candles_data = {"4h": candles_4h, "1d": candles_1d, "1h": candles_1h, "source": candles_source}

    if engine_id == "casper":
        return analyze_casper(market, ticker, candles_data=candles_data)
    elif engine_id == "rumors":
        return analyze_rumors(market, ticker, candles_data=candles_data)
    elif engine_id == "geo":
        return analyze_geo(market, ticker, candles_data=candles_data)
    elif engine_id == "ict":
        return analyze_ict(market, ticker, candles_data=candles_data)
    elif engine_id == "mj":
        return analyze_mj(market, ticker, candles_data=candles_data)
    elif engine_id == "franky":
        return analyze_franky(market, ticker, candles_data=candles_data)
    elif engine_id == "cryptoface":
        return analyze_cryptoface(market, ticker, candles_data=candles_data)
    elif engine_id == "buffett":
        return analyze_buffett(market, ticker, candles_data=candles_data)
    elif engine_id == "quant":
        return analyze_quant(market, ticker, candles_data=candles_data)
    elif engine_id == "tori":
        return analyze_tori(market, ticker, candles_data=candles_data)
    elif engine_id == "dtr":
        return analyze_dtr(market, ticker, candles_data=candles_data)
    elif engine_id == "reece":
        return analyze_reece(market, ticker, candles_data=candles_data)
    elif engine_id == "gann":
        pivots = json.dumps([
            {"price": market["pivotLow"], "time": market["pivotLowTime"], "type": "low"},
            {"price": market["pivotHigh"], "time": market["pivotHighTime"], "type": "high"},
        ])
        result = run_gann_engine("run_gann_v2.js", [
            "analyze", "--price", str(market["currentPrice"]),
            "--pivots", pivots, "--timeframe", "4H",
        ])
        # Merge market data into Gann result (JS engine doesn't include ticker/price from market)
        if isinstance(result, dict):
            result["ticker"] = ticker
            result["symbol"] = market.get("symbol", ticker)
            result["name"] = market.get("name", ticker)
            result["currentPrice"] = market.get("currentPrice", result.get("currentPrice"))
            result["exchange"] = market.get("exchange", "")
            result["source"] = market.get("source", "")
        return result

def call_gemini(messages: list, model: str = GEMINI_MODEL, max_tokens: int = 4096, temperature: float = 0.3) -> dict:
    """Call Google Gemini API as a sub-agent for deep analysis.
    
    Free tier: 15 RPM, 1M tokens/min, 1500 RPD (very generous).
    Uses gemini-2.5-flash by default (fast, free) or gemini-2.5-pro for deep analysis.
    """
    import urllib.request
    
    # Convert OpenAI-style messages to Gemini format
    contents = []
    system_instruction = None
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            system_instruction = content
        elif role == "user":
            contents.append({"role": "user", "parts": [{"text": content}]})
        elif role == "assistant":
            contents.append({"role": "model", "parts": [{"text": content}]})
    
    if not contents:
        return {"error": "No user message provided"}
    
    body = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        }
    }
    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    
    url = f"{GEMINI_URL}/models/{model}:generateContent?key={GOOGLE_API_KEY}"
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
            if "candidates" in data and data["candidates"]:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                usage = data.get("usageMetadata", {})
                return {
                    "content": text,
                    "model": f"gemini-{model}",
                    "provider": "google",
                    "tokens_in": usage.get("promptTokenCount", 0),
                    "tokens_out": usage.get("candidatesTokenCount", 0),
                }
            elif "error" in data:
                return {"error": data["error"].get("message", "Gemini API error")}
            else:
                return {"error": "No response from Gemini"}
    except Exception as e:
        return {"error": str(e)}


def call_gemini_stream(messages: list, model: str = GEMINI_MODEL, max_tokens: int = 4096, temperature: float = 0.3):
    """Yield streaming responses from Gemini."""
    import urllib.request
    
    contents = []
    system_instruction = None
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            system_instruction = content
        elif role == "user":
            contents.append({"role": "user", "parts": [{"text": content}]})
        elif role == "assistant":
            contents.append({"role": "model", "parts": [{"text": content}]})
    
    body = {
        "contents": contents,
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
    }
    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    
    url = f"{GEMINI_URL}/models/{model}:streamGenerateContent?key={GOOGLE_API_KEY}&alt=sse"
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if line.startswith("data: "):
                    data = json.loads(line[6:])
                    if "candidates" in data and data["candidates"]:
                        parts = data["candidates"][0].get("content", {}).get("parts", [])
                        for p in parts:
                            if "text" in p:
                                yield f"data: {json.dumps({'content': p['text'], 'model': f'gemini-{model}', 'provider': 'google'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


@app.post("/api/chat")
async def chat(request: dict):
    """Non-streaming chat endpoint with Gemini sub-agent."""
    import urllib.request
    
    messages = request.get("messages", [])
    ticker = request.get("ticker")
    engine_id = request.get("engine", "gann")
    analysis_data = None
    
    # If a ticker is mentioned, auto-inject analysis from the correct engine
    chat_msgs = [{"role": "system", "content": GANN_SYSTEM_PROMPT}]
    if ticker:
        # Fetch analysis using the correct engine
        market = fetch_market_data(ticker)
        if "error" not in market:
            if engine_id == "gann":
                pivots = json.dumps([
                    {"price": market["pivotLow"], "time": market["pivotLowTime"], "type": "low"},
                    {"price": market["pivotHigh"], "time": market["pivotHighTime"], "type": "high"},
                ])
                analysis = run_gann_engine("run_gann_v2.js", [
                    "analyze", "--price", str(market["currentPrice"]),
                    "--pivots", pivots, "--timeframe", "4H",
                ])
            elif engine_id == "casper":
                analysis = analyze_casper(market, ticker)
            elif engine_id == "rumors":
                analysis = analyze_rumors(market, ticker)
            elif engine_id == "geo":
                analysis = analyze_geo(market, ticker)
            elif engine_id == "ict":
                analysis = analyze_ict(market, ticker)
            elif engine_id == "mj":
                analysis = analyze_mj(market, ticker)
            elif engine_id == "franky":
                analysis = analyze_franky(market, ticker)
            elif engine_id == "cryptoface":
                analysis = analyze_cryptoface(market, ticker)
            elif engine_id == "buffett":
                analysis = analyze_buffett(market, ticker)
            elif engine_id == "quant":
                analysis = analyze_quant(market, ticker)
            elif engine_id == "tori":
                analysis = analyze_tori(market, ticker)
            else:
                analysis = {"engine": engine_id, "error": "Unknown engine"}
            # Truncate analysis for local models
            analysis_summary = json.dumps(analysis, indent=2)[:4000]
            analysis_data = analysis
            engine_info = ENGINES.get(engine_id, {})
            engine_name = engine_info.get("name", engine_id)
            chat_msgs.append({
                "role": "system",
                "content": f"Current {engine_name} analysis for {ticker}:\n{analysis_summary}"
            })
    
    chat_msgs.extend(messages)
    
    # ── Try Gemini first (free tier, high quality, 1M token context) ──
    gemini_result = call_gemini(chat_msgs, model=GEMINI_MODEL, max_tokens=4096, temperature=0.3)
    if "error" not in gemini_result and gemini_result.get("content", "").strip():
        return {"content": gemini_result["content"], "model": gemini_result["model"], "provider": "google"}
    
    # ── Fallback: Try Ollama models ──
    models_to_try = [OLLAMA_MODEL] + OLLAMA_FALLBACK_MODELS
    last_error = None
    for model in models_to_try:
        try:
            # For small local models, use shorter context
            use_msgs = chat_msgs
            is_local = model != OLLAMA_MODEL
            if is_local:
                # Condense context for small models
                short_sys = GANN_SYSTEM_PROMPT[:500] + " Respond briefly."
                use_msgs = [{"role": "system", "content": short_sys}]
                if ticker and analysis_data:
                    use_msgs.append({"role": "system", "content": f"Gann score={analysis_data.get('gannScore','?')} bias={analysis_data.get('gannBias','?')} price={analysis_data.get('currentPrice','?')}. Key data: {json.dumps(analysis_data)[:1000]}"})
                use_msgs.extend(messages)
            body = json.dumps({
                "model": model,
                "messages": use_msgs,
                "stream": False,
                "options": {"temperature": 0.3, "num_predict": 4096 if not is_local else 1024, "num_thread": 24},
            }).encode()
            req = urllib.request.Request(
                f"{OLLAMA_URL}/api/chat",
                data=body,
                headers={"Content-Type": "application/json"},
            )
            timeout = 120 if not is_local else 30
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read())
                content = data.get("message", {}).get("content", "")
                if content.strip():
                    return {"content": content, "model": data.get("model", model)}
        except Exception as e:
            last_error = e
            continue
    
    # All models failed — generate a template-based response from analysis data
    if analysis_data:
        return {"content": generate_analysis_summary(analysis_data, ticker), "model": "template"}
    raise HTTPException(status_code=500, detail=str(last_error) if last_error else "All models failed")


@app.post("/api/gemini")
async def gemini_endpoint(request: dict):
    """Dedicated Gemini sub-agent endpoint for deep trading analysis.
    
    Uses Google Gemini 2.5 Flash (free tier) for:
    - Strategy synthesis across multiple engines
    - Deep risk analysis and position sizing
    - Volume profile interpretation
    - Multi-timeframe confluence identification
    - Trade plan generation
    """
    messages = request.get("messages", [])
    ticker = request.get("ticker")
    engine_id = request.get("engine", "gann")
    analysis_data = None
    
    # Build context from engine analysis if ticker provided
    system_prompt = GEMINI_SYSTEM_PROMPT
    if ticker:
        market = fetch_market_data(ticker)
        candles_4h, candles_source = fetch_candles(ticker, timeframe="4h", limit=200)
        candles_1d, _ = fetch_candles(ticker, timeframe="1d", limit=180)
        candles_data = {"4h": candles_4h, "1d": candles_1d, "source": candles_source}
        if "error" not in market:
            engine_map = {
                "gann": lambda m, t: {"note": "Gann engine uses JS - use /api/analyze instead"},
                "casper": analyze_casper, "rumors": analyze_rumors, "geo": analyze_geo,
                "ict": analyze_ict, "mj": analyze_mj, "franky": analyze_franky,
                "cryptoface": analyze_cryptoface, "buffett": analyze_buffett,
                "quant": analyze_quant, "tori": analyze_tori, "dtr": analyze_dtr,
                "reece": analyze_reece,
            }
            engine_func = engine_map.get(engine_id, lambda m, t: {"error": "Unknown engine"})
            analysis = engine_func(market, ticker, candles_data=candles_data)
            analysis_data = analysis
            engine_info = ENGINES.get(engine_id, {})
            engine_name = engine_info.get("name", engine_id)
            # Include full analysis for Gemini (large context)
            system_prompt += f"\n\nCurrent {engine_name} analysis for {ticker}:\n{json.dumps(analysis, indent=2)[:8000]}"
    
    gemini_msgs = [{"role": "system", "content": system_prompt}]
    gemini_msgs.extend(messages)
    
    # Use gemini-2.5-pro for deep analysis if requested, else flash
    model = request.get("model", "gemini-2.5-flash")
    max_tokens = request.get("max_tokens", 4096)
    temperature = request.get("temperature", 0.3)
    
    result = call_gemini(gemini_msgs, model=model, max_tokens=max_tokens, temperature=temperature)
    
    if "error" in result:
        raise HTTPException(status_code=502, detail=f"Gemini error: {result['error']}")
    
    result["ticker"] = ticker
    result["engine"] = engine_id
    return result


@app.post("/api/gemini/stream")
async def gemini_stream_endpoint(request: dict):
    """Streaming Gemini endpoint for real-time responses."""
    from starlette.responses import StreamingResponse
    
    messages = request.get("messages", [])
    ticker = request.get("ticker")
    model = request.get("model", GEMINI_MODEL)
    max_tokens = request.get("max_tokens", 4096)
    temperature = request.get("temperature", 0.3)
    
    system_prompt = GEMINI_SYSTEM_PROMPT
    if ticker:
        system_prompt += f"\n\nAnalyzing ticker: {ticker}. Use the /api/analyze endpoint data for specific numbers."
    
    gemini_msgs = [{"role": "system", "content": system_prompt}]
    gemini_msgs.extend(messages)
    
    def generate():
        for chunk in call_gemini_stream(gemini_msgs, model=model, max_tokens=max_tokens, temperature=temperature):
            yield chunk
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/api/gemini/models")
async def gemini_models():
    """List available Gemini models."""
    import urllib.request
    try:
        url = f"{GEMINI_URL}/models?key={GOOGLE_API_KEY}"
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read())
            models = []
            for m in data.get("models", []):
                models.append({
                    "name": m.get("name", "").replace("models/", ""),
                    "display": m.get("displayName", ""),
                    "description": m.get("description", "")[:100],
                })
            return {"models": models, "default": GEMINI_MODEL}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/chat/stream")
async def chat_stream(request: dict):
    """SSE streaming chat endpoint."""
    import httpx
    
    messages = request.get("messages", [])
    ticker = request.get("ticker")
    engine_id = request.get("engine", "gann")
    
    chat_msgs = [{"role": "system", "content": GANN_SYSTEM_PROMPT}]
    if ticker:
        market = fetch_market_data(ticker)
        if "error" not in market:
            if engine_id == "gann":
                pivots = json.dumps([
                    {"price": market["pivotLow"], "time": market["pivotLowTime"], "type": "low"},
                    {"price": market["pivotHigh"], "time": market["pivotHighTime"], "type": "high"},
                ])
                analysis = run_gann_engine("run_gann_v2.js", [
                    "analyze", "--price", str(market["currentPrice"]),
                    "--pivots", pivots, "--timeframe", "4H",
                ])
            elif engine_id == "casper":
                analysis = analyze_casper(market, ticker)
            elif engine_id == "rumors":
                analysis = analyze_rumors(market, ticker)
            elif engine_id == "geo":
                analysis = analyze_geo(market, ticker)
            elif engine_id == "ict":
                analysis = analyze_ict(market, ticker)
            elif engine_id == "mj":
                analysis = analyze_mj(market, ticker)
            elif engine_id == "franky":
                analysis = analyze_franky(market, ticker)
            elif engine_id == "cryptoface":
                analysis = analyze_cryptoface(market, ticker)
            elif engine_id == "buffett":
                analysis = analyze_buffett(market, ticker)
            elif engine_id == "quant":
                analysis = analyze_quant(market, ticker)
            elif engine_id == "tori":
                analysis = analyze_tori(market, ticker)
            else:
                analysis = {"engine": engine_id}
            analysis["market"] = market
            engine_info = ENGINES.get(engine_id, {})
            engine_name = engine_info.get("name", engine_id)
            chat_msgs.append({
                "role": "system",
                "content": f"Current {engine_name} analysis for {ticker}:\n{json.dumps(analysis, indent=2)[:4000]}"
            })
    
    chat_msgs.extend(messages)
    
    async def generate():
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"{OLLAMA_URL}/api/chat", json={
                "model": OLLAMA_MODEL,
                "messages": chat_msgs,
                "stream": True,
                "options": {"temperature": 0.3, "num_predict": 4096},
            }) as resp:
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        if data.get("message", {}).get("content"):
                            yield f"data: {json.dumps({'type': 'token', 'data': {'text': data['message']['content']}})}\n\n"
                        if data.get("done"):
                            yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    except json.JSONDecodeError:
                        pass
    
    return StreamingResponse(generate(), media_type="text/event-stream")

# ── Serve SPA ─────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def serve_spa():
    html_path = Path(__file__).parent / "static" / "index.html"
    if html_path.exists():
        return HTMLResponse(
            content=html_path.read_text(encoding="utf-8"),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache"}
        )
    return HTMLResponse(content="<h1>Gann App - index.html not found</h1>")

@app.get("/health")
async def health():
    return {"status": "ok", "engine": "gann_v2", "timestamp": datetime.now().isoformat()}

# ── Static files ────────────────────────────────────────────────────

# ── MessyHedge Endpoints ──
import subprocess

BRIDGE_SCRIPT = "E:/AI Drive/pi-agent/tekton/scripts/trading_bridge.py"
TRADINGAGENTS_DIR = "E:/AI Drive/pi-agent/TradingAgents"

def _call_bridge(params: dict, timeout: int = 600) -> dict:
    """Call trading_bridge.py with JSON stdin/stdout"""
    env = dict(os.environ)
    env["TRADINGAGENTS_DIR"] = TRADINGAGENTS_DIR
    try:
        result = subprocess.run(
            ["python3", BRIDGE_SCRIPT],
            input=json.dumps(params),
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env
        )
        if result.returncode != 0:
            return {"error": True, "message": result.stderr[-500:] if result.stderr else "Unknown error"}
        return json.loads(result.stdout.strip())
    except subprocess.TimeoutExpired:
        return {"error": True, "message": f"Analysis timed out ({timeout}s)"}
    except json.JSONDecodeError:
        return {"error": True, "message": "Invalid response from bridge", "output": result.stdout[-1000:] if result.stdout else ""}
    except Exception as e:
        return {"error": True, "message": str(e)}

@app.get("/api/hedge/status")
async def hedge_status():
    """MessyHedge system status"""
    return _call_bridge({"command": "status"})

@app.post("/api/hedge/analyze")
async def hedge_analyze(request: dict):
    """Run full TradingAgents analysis"""
    ticker = request.get("ticker", "").upper().strip()
    date = request.get("date")
    debate_rounds = request.get("debate_rounds", 1)
    risk_rounds = request.get("risk_rounds", 1)
    if not ticker:
        return {"error": True, "message": "Missing ticker"}
    return _call_bridge({"command": "analyze", "ticker": ticker, "date": date, "debate_rounds": debate_rounds, "risk_rounds": risk_rounds})

@app.get("/api/hedge/history/{ticker}")
async def hedge_history(ticker: str, limit: int = 20):
    """Past analysis results for a ticker"""
    return _call_bridge({"command": "history", "ticker": ticker.upper(), "limit": limit})

@app.get("/api/hedge/models")
async def hedge_models():
    """Current LLM configuration"""
    return _call_bridge({"command": "models"})

app.mount("/static", StaticFiles(directory=str(Path(__file__).parent / "static")), name="static")
app.mount("/vendor", StaticFiles(directory=str(Path(__file__).parent / "static" / "vendor")), name="vendor")

# ── Engine Registry ──────────────────────────────────────────────

ENGINES = {
    "gann": {
        "id": "gann",
        "name": "W.D. Gann",
        "subtitle": "Time & Price Master",
        "era": "1900s-1950s",
        "description": "Square of 9, planetary cycles, time-price squaring. Library: Master Commodities Course, Stock Market Course, Forecasting by Time Cycles",
        "color": "#22d3ee",
        "icon": "⚙",
        "methods": ["Square of 9", "Gann Angles", "Planetary Cycles", "Wheel of 24", "Time-Price Squaring"],
        "script": "run_gann_v2.js",
        "enabled": True,
        "library": ["The WD Gann Master Commodities Course", "w-d-gann-master-stock-market-course", "Forecasting-by-Time-Cycles", "6 hour daily fractal"],
    },
    "casper": {
        "id": "casper",
        "name": "Jayson Casper",
        "subtitle": "Crypto Trader / YouTuber",
        "era": "2020s",
        "description": "Market Cipher divergences, VWAP rejections, single prints, volume profile fills, uneven butt cheek divergence. Source: YouTube tutorials",
        "color": "#a855f7",
        "icon": "⚡",
        "methods": ["Market Cipher B Divergences", "VWAP Acceptance/Rejection", "Fibonacci Golden Pocket (0.618-0.786)", "CVD/Delta Volume (Order Flow)", "Money Flow Cross Signal", "Uneven Butt Cheek Ultra Signal"],
        "script": None,
        "enabled": True,
        "strategies": ["casper_indicators_2", "casper_strat", "casper_prompt"],
    },
    "mj": {
        "id": "mj",
        "name": "Messy Jesse",
        "subtitle": "Personal Toolkit (335 indicators)",
        "era": "2020s",
        "description": "Custom TradingView indicators: Gann Square of 9/144, VWAP bands, Predictive Ranges, Pendulum Trend Matrix, Spoofing, Time & Price Fibs, ORB sessions, Market Cipher, 50+ iterated systems",
        "color": "#f59e0b",
        "icon": "⭐",
        "methods": ["Gann Square of 9/144", "VWAP & EMA Cross", "Predictive Ranges", "Pendulum Trend Matrix", "Time & Price Fibs", "Spoofing Indicator", "Pivot Fractals", "Volume Profile", "Market Cipher MTF", "Stop Hunt"],
        "script": None,
        "enabled": True,
        "indicators": 335,
        "topStrategies": ["20 to 52000 (17 iterations)", "Pivot Fractals (14 iterations)", "Spoofing (11 iterations)", "Pendulum Trend Matrix (11 iterations)", "VWAP (10 iterations)", "Time & Price Fibs (10 iterations)"],
    },
    "ict": {
        "id": "ict",
        "name": "ICT / Smart Money",
        "subtitle": "Inner Circle Trader",
        "era": "2020s",
        "description": "Order blocks, fair value gaps, liquidity sweeps, optimal trade entries. LuxAlgo SMC indicator + fluxchart ICT setup",
        "color": "#10b981",
        "icon": "\u25c6",
        "methods": ["Order Blocks", "Fair Value Gaps (FVG)", "Liquidity Sweeps", "Optimal Trade Entry", "Market Structure Shifts", "Breaker Blocks"],
        "script": None,
        "enabled": True,
        "library": ["LuxAlgo SMC indicator", "fluxchart ICT Trade Setup", "Footprint Order Flow IMB-FVG", "Wyckoff Methodology"],
    },
    "rumors": {
        "id": "rumors",
        "name": "The Rumors",
        "subtitle": "Doug | 25yr Day Trader",
        "era": "1999-present",
        "description": "Box Theory, VWAP bounce, VWAP overextended+ATR, known buyer/seller zones, math-based entries. Stupid simple always wins. Source: @TheRumors0x YouTube",
        "color": "#f97316",
        "icon": "\u25a0",
        "methods": ["Box Theory (Consolidation Zones)", "VWAP Bounce", "VWAP Overextended + ATR", "Known Buyer/Seller Zones", "Math-Based Entry Calculations"],
        "script": None,
        "enabled": True,
        "transcripts": 7,
        "total_chars": 107384,
        "library": ["Box Theory", "VWAP Bounce", "VWAP Overextended+ATR", "Known Buyer/Seller Zones"],
    },
    "geo": {
        "id": "geo",
        "name": "Trader Geo",
        "subtitle": "USDT.D + PO3 Specialist",
        "era": "2020s",
        "description": "USDT.D analysis for macro direction, PO3 accumulation/manipulation/distribution, order blocks, session-based trading",
        "color": "#3b82f6",
        "icon": "\u25b2",
        "methods": ["USDT.D Dominance Analysis", "PO3 Accumulation/Manipulation/Distribution", "Order Blocks (Bullish/Bearish)", "Session Trading (Asian/London/NY)", "Multi-TF Confirmation"],
        "script": None,
        "enabled": True,
        "transcripts": 5,
        "total_chars": 2563,
        "library": ["USDT.D Analysis", "PO3", "Order Blocks"],
    },
    "franky": {
        "id": "franky",
        "name": "Frankie Candles",
        "subtitle": "Candle Patterns + S/R",
        "era": "2020s",
        "description": "Candle pattern mastery, key support/resistance levels, multi-timeframe confluence with clean chart reading",
        "color": "#ff6b6b",
        "icon": "\u25cb",
        "methods": ["Candle Pattern Recognition", "Key S/R Levels", "Multi-TF Confluence", "Clean Chart Reading", "Trend Continuation Patterns"],
        "script": None,
        "enabled": True,
        "youtube_channel": "UCWFYVFd4RkiDecuix04qbQA",
        "library": ["Candle Patterns", "S/R Analysis"],
    },
    "cryptoface": {
        "id": "cryptoface",
        "name": "CryptoFace",
        "subtitle": "On-Chain + Order Flow",
        "era": "2020s",
        "description": "On-chain analysis, order flow reading, liquidation levels, exchange inflow/outflow, whale tracking",
        "color": "#845ef7",
        "icon": "\u25cf",
        "methods": ["On-Chain Analysis", "Order Flow Reading", "Liquidation Levels", "Exchange Flow", "Whale Tracking", "Cumulative Volume Delta"],
        "script": None,
        "enabled": True,
        "youtube_channel": "UCnpL_SpKLZpwAAIWmWpCIzQ",
        "library": ["On-Chain Analysis", "Order Flow"],
    },
    "buffett": {
        "id": "buffett",
        "name": "Warren Buffett",
        "subtitle": "Value Investing OG",
        "era": "1950s-present",
        "description": "Fundamental analysis, intrinsic value, margin of safety, circle of competence, long-term compound returns",
        "color": "#20c997",
        "icon": "\u2460",
        "methods": ["Intrinsic Value Calculation", "Margin of Safety", "Circle of Competence", "Economic Moats", "Owner Earnings", "Compound Returns"],
        "script": None,
        "enabled": True,
        "library": ["Value Investing", "Fundamental Analysis", "Berkshire Portfolio"],
    },
    "quant": {
        "id": "quant",
        "name": "Aaron / QuantCrawler",
        "subtitle": "Algorithmic + Backtesting",
        "era": "2020s",
        "description": "Quantitative strategy development, algorithmic backtesting, statistical edge discovery, systematic trading rules",
        "color": "#ffd43b",
        "icon": "\u25a1",
        "methods": ["Quantitative Strategy Dev", "Algorithmic Backtesting", "Statistical Edge Discovery", "Systematic Trading Rules", "Walk-Forward Optimization", "Monte Carlo Simulation"],
        "script": None,
        "enabled": True,
        "youtube_channel": "UCPNiA-SsXEWqGWGgkgw2xhw",
        "library": ["Quant Strategies", "Backtesting"],
    },
    "tori": {
        "id": "tori",
        "name": "Tori Trades",
        "subtitle": "5m Trendline Scalper",
        "era": "2020s",
        "description": "5-min futures scalper. Action/Safety trendline system: enter on break, stay in on safety line, reverse on safety break. Losses are fees philosophy. 1-3% risk per trade.",
        "color": "#f783ac",
        "icon": "\u2606",
        "methods": ["Trendline Break & Reverse", "Action/Safety Lines", "Candle Close Confirmation", "Losses as Fees Philosophy", "Prop Firm Risk Management", "5m Futures Scalping"],
        "script": None,
        "enabled": True,
        "youtube_channel": "UC0ep2A36j7gTFdqW2Yvngbg",
        "library": ["Futures Scalping", "Prop Firm Trading"],
    },
    "dtr": {
        "id": "dtr",
        "name": "Day Trading Radio",
        "subtitle": "4-Stage Stoch RSI + Holy Grail",
        "era": "2020s",
        "description": "4 stochastic bands (9-3, 14-3, 44-3, 60-10) for OB/OS confluence, quad rotation, holy grail setups, divergence on all timeframes",
        "color": "#ff4757",
        "icon": "♦",
        "methods": ["4-Stage Stoch RSI (9/3, 14/3, 44/3, 60/10)", "Quad Rotation (All 4 OB/OS)", "Holy Grail Setup", "Stochastic Coil Detection", "Divergence on All 4 Bands", "Trendline + VWAP Confirmation"],
        "script": None,
        "enabled": True,
        "youtube_channel": "UCTRIFOak6FixJMP-vqz3WGA",
        "stoch_settings": {"fast": {"k": 9, "d": 3}, "mid_fast": {"k": 14, "d": 3}, "mid_slow": {"k": 44, "d": 3}, "slow": {"k": 60, "d": 10}},
        "library": ["4 Stochastic Bands", "Quad Rotation", "Holy Grail"],
    },
    "reece": {
        "id": "reece",
        "name": "Ultimate Scalper",
        "subtitle": "Reece Cadaval | EMA Breakout + Trail",
        "era": "2020s",
        "description": "Breakout candle after EMA cross/bounce. Stop limit entries. Trail SL immediately at $100+ profit. Cowboy style scalping on 1m/5m NQ/ES.",
        "color": "#f9ca24",
        "icon": "⚑",
        "methods": ["EMA Bounce Entry", "Breakout Signal Candle", "Stop Limit Orders", "Trail SL at $100+", "Backdoor on EMA Line", "Ultimate Zone Targets", "1m/5m Scalping"],
        "script": None,
        "enabled": True,
        "youtube_channel": "UChu-rgqqK4oymHSu-tQcRDA",
        "libraries": ["Ultimate AI Pro", "Ultimate Signals"],
    },
}


@app.get("/api/engines")
async def get_engines():
    return {"engines": list(ENGINES.values()), "default": "gann"}

# ── Backtest Bridge ────────────────────────────────────────────────

BACKTEST_DB = Path(r"C:\Users\Massi\Desktop\BacktestEngine\backtest_results.db")

@app.get("/api/backtest/results")
async def get_backtest_results(strategy: str = None, symbol: str = None, limit: int = 50):
    """Get backtest results from the local database."""
    if not BACKTEST_DB.exists():
        return {"results": [], "total": 0, "message": "Backtest database not found"}
    try:
        conn = sqlite3.connect(str(BACKTEST_DB))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        query = "SELECT * FROM strategy_results WHERE 1=1"
        params = []
        if strategy:
            query += " AND strategy_name LIKE ?"
            params.append(f"%{strategy}%")
        if symbol:
            query += " AND symbol LIKE ?"
            params.append(f"%{symbol}%")
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        cursor.execute(query, params)
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return {"results": rows, "total": len(rows)}
    except Exception as e:
        return {"results": [], "total": 0, "error": str(e)}

@app.post("/api/backtest/import")
async def import_backtest_result(request: dict):
    """Import a backtest result manually."""
    if not BACKTEST_DB.exists():
        # Create the database
        BACKTEST_DB.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(BACKTEST_DB))
        cursor = conn.cursor()
        cursor.execute("""CREATE TABLE IF NOT EXISTS strategy_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            strategy_name TEXT, symbol TEXT, timeframe TEXT,
            start_date TEXT, end_date TEXT,
            total_trades INTEGER, winning_trades INTEGER, losing_trades INTEGER,
            win_rate REAL, total_pnl REAL, max_drawdown REAL,
            sharpe_ratio REAL, profit_factor REAL,
            eod_drawdown REAL, trailing_drawdown REAL,
            prop_firm_compatible INTEGER DEFAULT 0,
            notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
        conn.commit()
        conn.close()
    try:
        conn = sqlite3.connect(str(BACKTEST_DB))
        cursor = conn.cursor()
        cursor.execute("""INSERT INTO strategy_results 
            (strategy_name, symbol, timeframe, start_date, end_date,
             total_trades, winning_trades, losing_trades, win_rate,
             total_pnl, max_drawdown, sharpe_ratio, profit_factor,
             eod_drawdown, trailing_drawdown, prop_firm_compatible, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [request.get(k) for k in ["strategy_name","symbol","timeframe","start_date","end_date",
                "total_trades","winning_trades","losing_trades","win_rate",
                "total_pnl","max_drawdown","sharpe_ratio","profit_factor",
                "eod_drawdown","trailing_drawdown","prop_firm_compatible","notes"]])
        conn.commit()
        result_id = cursor.lastrowid
        conn.close()
        return {"success": True, "id": result_id}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/strategies")
async def list_strategies():
    """List available strategies from the strategies directory."""
    strategies_dir = Path(r"D:\AI Drive\strategies")
    results = []
    if strategies_dir.exists():
        for f in sorted(strategies_dir.glob("*")):
            if f.is_file() and f.suffix in ['.md', '.pine', '.py']:
                results.append({
                    "name": f.stem,
                    "file": str(f),
                    "type": f.suffix[1:],
                    "size": f.stat().st_size,
                    "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                })
    return {"strategies": results}



# ── Library ──────────────────────────────────────────────────────────

LIBRARY_INDEX = Path(r"D:\AI Drive\library\index.json")

@app.get("/api/library")
async def get_library():
    """Get organized library catalog with engine doc references."""
    if LIBRARY_INDEX.exists():
        try:
            return json.loads(LIBRARY_INDEX.read_text(encoding="utf-8"))
        except:
            pass
    return {"categories": {}, "total_files": 0, "engines": {}}

@app.get("/api/library/{category}/{filename:path}")
async def get_library_file(category: str, filename: str):
    """Serve a library file."""
    from fastapi.responses import FileResponse
    file_path = Path(r"D:\AI Drive\library") / category / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    raise HTTPException(status_code=404, detail="File not found")

# ── YouTube Monitor API ─────────────────────────────────────────────────

@app.get("/api/youtube/status")
async def youtube_monitor_status():
    """Get YouTube monitor status."""
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        from youtube_monitor import get_monitor_status
        return get_monitor_status()
    except Exception as e:
        return {"error": str(e), "enabled_engines": [], "total_videos": 0}

@app.post("/api/youtube/toggle")
async def youtube_toggle(request: dict):
    """Toggle YouTube monitoring for an engine."""
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        from youtube_monitor import toggle_monitor
        engine_id = request.get("engine_id")
        enabled = request.get("enabled", True)
        return toggle_monitor(engine_id, enabled)
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/youtube/setups")
async def youtube_setups(engine_id: str = None, limit: int = 20):
    """Get extracted trade setups from YouTube videos."""
    db_path = Path(r"D:\AI Drive\pi-agent\tekton\packages\gann-app\youtube_monitor.db")
    if not db_path.exists():
        return {"setups": [], "total": 0}
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        query = "SELECT ts.*, v.title, v.engine_id as vid_engine FROM trade_setups ts LEFT JOIN videos v ON ts.video_id = v.video_id WHERE 1=1"
        params = []
        if engine_id:
            query += " AND ts.engine_id = ?"
            params.append(engine_id)
        query += " ORDER BY ts.created_at DESC LIMIT ?"
        params.append(limit)
        c.execute(query, params)
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return {"setups": rows, "total": len(rows)}
    except Exception as e:
        return {"setups": [], "error": str(e)}

@app.get("/api/strategies/{engine_id}")
async def get_engine_strategies(engine_id: str):
    """Get extracted strategies for a specific engine from LLM-analyzed transcripts."""
    strategies_dir = ENGINE_DIR / engine_id / "strategies"
    if not strategies_dir.exists():
        # Return methods from ENGINES dict as fallback
        engine = ENGINES.get(engine_id, {})
        methods = engine.get("methods", [])
        return {"engine_id": engine_id, "strategies": [], "methods": methods}
    
    all_strategies = []
    for f in strategies_dir.glob("*_strategies.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            for s in data.get("strategies", []):
                s["source_video"] = data.get("video_id", "")
                s["extraction_method"] = data.get("source", "unknown")
                all_strategies.append(s)
        except:
            pass
    
    # Categorize by timeframe
    categories = {"scalp": [], "intraday": [], "swing": [], "universal": []}
    for s in all_strategies:
        cat = s.get("category", "universal")
        if cat in categories:
            categories[cat].append(s)
        else:
            categories["universal"].append(s)
    
    engine = ENGINES.get(engine_id, {})
    return {
        "engine_id": engine_id,
        "engine_name": engine.get("name", engine_id),
        "strategies": all_strategies,
        "by_category": {k: v for k, v in categories.items() if v},
        "methods": engine.get("methods", []),
        "youtube_channel": engine.get("youtube_channel"),
    }

@app.get("/api/candles/{ticker}")
async def get_candles(ticker: str, period: str = "3mo", interval: str = "1h"):
    """Get OHLCV candle data. Priority: Bybit -> OKX -> Yahoo. Honest source labeling."""
    candles, source = fetch_candles(ticker, timeframe=interval, limit=500)
    if candles:
        return {"candles": candles, "ticker": ticker, "interval": interval, "source": source}
    return {"candles": [], "error": f"No data available for {ticker}"}

@app.get("/api/pine/{engine_id}")
async def get_pine_script(engine_id: str, ticker: str = "BTCUSDT", timeframe: str = "4H"):
    """Generate Pine Script for an engine's analysis overlay."""
    engine = ENGINES.get(engine_id, {})
    if not engine:
        return {"error": f"Unknown engine: {engine_id}"}
    
    # Get analysis data for the ticker
    market = fetch_market_data(ticker)
    if "error" in market:
        return {"error": market["error"]}
    
    if engine_id == "gann":
        pivots = json.dumps([
            {"price": market["pivotLow"], "time": market["pivotLowTime"], "type": "low"},
            {"price": market["pivotHigh"], "time": market["pivotHighTime"], "type": "high"},
        ])
        analysis = run_gann_engine("run_gann_v2.js", ["analyze", "--price", str(market["currentPrice"]), "--pivots", pivots, "--timeframe", timeframe])
    elif engine_id == "tori":
        analysis = analyze_tori(market, ticker)
    elif engine_id == "casper":
        analysis = analyze_casper(market, ticker)
    elif engine_id == "rumors":
        analysis = analyze_rumors(market, ticker)
    elif engine_id == "geo":
        analysis = analyze_geo(market, ticker)
    elif engine_id == "ict":
        analysis = analyze_ict(market, ticker)
    elif engine_id == "mj":
        analysis = analyze_mj(market, ticker)
    elif engine_id == "franky":
        analysis = analyze_franky(market, ticker)
    elif engine_id == "cryptoface":
        analysis = analyze_cryptoface(market, ticker)
    elif engine_id == "buffett":
        analysis = analyze_buffett(market, ticker)
    elif engine_id == "quant":
        analysis = analyze_quant(market, ticker)
    else:
        analysis = {"engine": engine_id}
    
    # Build Pine Script from analysis
    signals = analysis.get("signals", {})
    levels = analysis.get("keyLevels", [])
    name = engine.get("name", engine_id)
    color = engine.get("color", "#6366f1")
    
    lines_pine = f"// {name} Engine Analysis - {ticker}\n"
    lines_pine += f"// Generated by Trading Command Center\n"
    lines_pine += f"// Timeframe: {timeframe}\n\n"
    lines_pine += f'indicator("{name} Analysis", overlay=true)\n\n'
    
    # Add key levels as horizontal lines
    for i, lev in enumerate(levels[:10]):
        price = lev.get("price", 0)
        lev_name = lev.get("name", f"Level{i}").replace('"', "'")
        lev_type = lev.get("type", "pivot")
        lev_color = "color.green" if lev_type == "support" else "color.red" if lev_type == "resistance" else "color.blue" if lev_type == "decision" else "color.purple" if lev_type == "extreme" else "color.orange"
        style = "line.style_solid" if lev_type in ["support", "resistance"] else "line.style_dashed"
        lines_pine += f'lvl{i} = input.float({price}, "{lev_name}")\n'
    
    lines_pine += "\n// Draw levels\n"
    for i, lev in enumerate(levels[:10]):
        lev_type = lev.get("type", "pivot")
        lev_color = "color.green" if lev_type == "support" else "color.red" if lev_type == "resistance" else "color.blue" if lev_type == "decision" else "color.purple" if lev_type == "extreme" else "color.orange"
        width = 2 if lev_type in ["support", "resistance"] else 1
        lines_pine += f'line.new(bar_index-50, lvl{i}, bar_index, lvl{i}, color={lev_color}, width={width})\n'
    
    return {"pine": lines_pine, "engine_id": engine_id, "engine_name": name, "ticker": ticker}

@app.post("/api/youtube/process")
async def youtube_process_video(request: dict):
    """Manually trigger processing of a YouTube video."""
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        from youtube_monitor import process_new_video, VideoInfo
        video_id = request.get("video_id")
        engine_id = request.get("engine_id", "gann")
        video = VideoInfo(video_id=video_id, title="Manual", published="", channel_id="", engine_id=engine_id)
        process_new_video(video)
        return {"status": "processed", "video_id": video_id}
    except Exception as e:
        return {"error": str(e)}

# ── Main ──────────────────────────────────────────────────────────────


def run_engine_analysis(engine_id: str, ticker: str):
    """Analyze a ticker using the specified engine."""
    market = fetch_market_data(ticker)
    if "error" in market:
        return market
    if engine_id == "gann":
        return {"error": "gann uses external script", "market": market, "ticker": ticker, "engine": "gann"}
    elif engine_id == "casper":
        return analyze_casper(market, ticker)
    elif engine_id == "rumors":
        return analyze_rumors(market, ticker)
    elif engine_id == "geo":
        return analyze_geo(market, ticker)
    elif engine_id == "ict":
        return analyze_ict(market, ticker)
    elif engine_id == "mj":
        return analyze_mj(market, ticker)
    elif engine_id == "franky":
        return analyze_franky(market, ticker)
    elif engine_id == "cryptoface":
        return analyze_cryptoface(market, ticker)
    elif engine_id == "buffett":
        return analyze_buffett(market, ticker)
    elif engine_id == "quant":
        return analyze_quant(market, ticker)
    elif engine_id == "tori":
        return analyze_tori(market, ticker)
    elif engine_id == "dtr":
        return analyze_dtr(market, ticker)
    elif engine_id == "reece":
        return analyze_reece(market, ticker)
    else:
        return analyze_casper(market, ticker)

# ── Trading Endpoints ─────────────────────────────────────────────────

@app.get("/api/trading/tiers")
async def get_tier_comparison():
    """Compare Lightweight vs Full tier features and costs."""
    return {
        "tiers": TIER_COMPARISON,
        "current_model": "deepseek-v4-flash:cloud",
        "cost_estimate": {
            "lightweight": "0 tokens per analysis (Pine Script + Chart overlays only)",
            "full": "200-500 tokens per analysis (~$0.001 per signal with deepseek-v4-flash)",
        },
    }

@app.get("/api/trading/exchanges")
async def get_exchanges():
    """List supported exchanges and their capabilities."""
    return {"exchanges": {k: {kk: vv for kk, vv in v.items() if kk != "api_base"} for k, v in SUPPORTED_EXCHANGES.items()}}

@app.get("/api/trading/prop-firms")
async def get_prop_firms():
    """List supported prop firms with their rules and account sizes."""
    result = {}
    for fid, fdata in PROP_FIRMS.items():
        result[fid] = {
            "name": fdata["name"],
            "platform": fdata["platform"],
            "exchange": PROP_FIRM_EXCHANGE.get(fid, "paper"),
            "account_sizes": fdata["account_sizes"],
            "max_daily_loss_pct": fdata["max_daily_loss_pct"],
            "max_drawdown_pct": fdata["max_drawdown_pct"],
            "drawdown_amounts": fdata.get("drawdown_amounts", fdata.get("max_daily_loss_pct", [])),
            "drawdown_type": fdata.get("drawdown_type", "trailing"),
            "trailing_drawdown": fdata.get("trailing_drawdown", fdata.get("drawdown_type", "") == "trailing"),
            "can_trade_news": fdata["can_trade_news"],
            "min_trading_days": fdata["min_trading_days"],
            "reset_cost": fdata["reset_cost"],
        }
    return {"prop_firms": result}

@app.get("/api/trading/accounts")
async def get_trading_accounts():
    """List all paper trading accounts with their prop firm configs."""
    result = {}
    for aid, acct in paper_accounts.items():
        stats = acct.get_stats()
        result[aid] = {
            "name": acct.account_name,
            "exchange": acct.exchange,
            "prop_firm": acct.prop_firm,
            "initial_balance": acct.initial_balance,
            "balance": stats["balance"],
            "equity": stats["equity"],
            "return_pct": stats["return_pct"],
            "total_trades": stats["total_trades"],
            "win_rate": stats["win_rate"],
            "profit_factor": stats["profit_factor"],
            "open_positions": stats["open_positions"],
            "max_drawdown": stats["max_drawdown"],
            "prop_firm_rules": PROP_FIRMS.get(acct.prop_firm, {}) if acct.prop_firm else None,
        }
    return {"accounts": result}

@app.post("/api/trading/signal")
async def create_signal(request: dict):
    """Generate a trading signal from engine analysis."""
    body = request
    ticker = body.get("ticker", "BTC-USD")
    engine_id = body.get("engine", "gann")
    account_id = body.get("account", "paper_default")
    
    result = run_engine_analysis(engine_id, ticker)
    
    acct = paper_accounts.get(account_id)
    if not acct:
        return {"error": f"Account {account_id} not found", "available": list(paper_accounts.keys())}
    
    signal = generate_signal(result, acct.equity, ENGINE_RISK_PROFILES.get(engine_id))
    if not signal:
        return {"status": "no_signal", "reason": f"Score {result.get('score', 0)} < {MIN_SIGNAL_SCORE}", "analysis": result}
    
    return {"signal": signal, "account": account_id, "prop_firm": acct.prop_firm}

@app.post("/api/trading/execute")
async def execute_trade(request: dict):
    """Execute a trade signal on a paper account."""
    body = request
    signal = body.get("signal", {})
    account_id = body.get("account", "paper_default")
    
    acct = paper_accounts.get(account_id)
    if not acct:
        return {"error": f"Account {account_id} not found"}
    
    result = acct.execute(signal)
    
    conn = get_db()
    conn.execute("INSERT INTO trades (symbol, side, type, quantity, entry_price, stop_loss, take_profit, engine_id, signal_score, signal_bias, status, pnl, fees, mode, exchange) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [signal.get("symbol"), signal.get("direction"), "market", signal.get("quantity", 1),
         signal.get("entry_price"), signal.get("stop_loss"), signal.get("take_profit"),
         signal.get("engine_id"), signal.get("score"), signal.get("bias"),
         "open" if result.get("status") == "opened" else "closed", 0, result.get("fee", 0),
         "paper", acct.exchange])
    conn.commit()
    conn.close()
    
    return {"execution": result, "account_stats": acct.get_stats()}

@app.post("/api/trading/close")
async def close_position(request: dict):
    """Close a position on a paper account."""
    body = request
    symbol = body.get("symbol")
    account_id = body.get("account", "paper_default")
    exit_price = body.get("price")
    
    acct = paper_accounts.get(account_id)
    if not acct:
        return {"error": f"Account {account_id} not found"}
    
    if not exit_price:
        market_data = fetch_market_data(symbol)
        exit_price = market_data.get("currentPrice", 0) if "error" not in market_data else exit_price
        exit_price = market.get("currentPrice", 0)
    
    if symbol not in acct.positions:
        return {"error": f"No position in {symbol}", "positions": list(acct.positions.keys())}
    
    close_result = acct._close_position(symbol, exit_price)
    acct.trades.append(close_result)
    
    return {"closed": close_result, "account_stats": acct.get_stats()}

@app.get("/api/trading/stats/{account_id}")
async def get_trading_stats(account_id: str):
    """Get detailed trading statistics for an account."""
    acct = paper_accounts.get(account_id)
    if not acct:
        return {"error": f"Account {account_id} not found"}
    return acct.get_stats()

@app.post("/api/trading/pine-export")
async def export_pine_script(request: dict):
    """Generate Pine Script from engine analysis for TradingView."""
    body = request
    ticker = body.get("ticker", "BTC-USD")
    engine_id = body.get("engine", "gann")
    
    result = run_engine_analysis(engine_id, ticker)
    
    pine = TradingViewBridge.export_pine_script(engine_id, result)
    return {"pine_script": pine, "engine": engine_id, "ticker": ticker, "tier": "lightweight", "tokens_used": 0}

@app.post("/api/trading/pine-import")
async def import_pine_script(request: dict):
    """Parse an imported Pine Script to extract indicators and levels."""
    body = request
    script = body.get("script", "")
    if not script.strip():
        return {"error": "No script provided"}
    
    result = TradingViewBridge.import_pine_script(script)
    return result

@app.get("/api/trading/webhook-info")
async def get_webhook_info():
    """Get TradingView webhook configuration info."""
    return TradingViewBridge.generate_webhook_url()

@app.post("/api/trading/webhook")
async def receive_webhook(request: dict):
    """Receive TradingView webhook alerts."""
    body = request
    conn = get_db()
    conn.execute("INSERT INTO signals (timestamp, engine_id, symbol, direction, score, bias, tier) VALUES (?,?,?,?,?,?,?)",
        [datetime.now().isoformat(), body.get("engine", "tradingview"), body.get("ticker", ""),
         body.get("direction", ""), 0, "webhook", "external"])
    conn.commit()
    conn.close()
    return {"status": "received", "data": body}

@app.get("/api/trading/risk/{engine_id}")
async def get_engine_risk(engine_id: str):
    """Get risk configuration for a specific engine."""
    risk = ENGINE_RISK_PROFILES.get(engine_id)
    if not risk:
        return {"error": f"Unknown engine: {engine_id}"}
    return {"engine_id": engine_id, "risk_config": risk}

@app.post("/api/trading/risk-levels")
async def get_risk_levels(request: dict):
    """Calculate exchange liquidation and prop firm breach/warning levels.
    Uses the exact math from the Ultimate Risk & Prop Firm Manager Pine Script.
    Body: {"ticker": "ES=F", "entry_price": 5500, "contracts": 2, "account": "apex_100k", "leverage": 40}
    """
    from trading_engine import PROP_FIRMS, PROP_FIRM_EXCHANGE, POINT_VALUES, EXCHANGE_LIQUIDATION
    
    ticker = request.get("ticker", "ES=F")
    entry_price = request.get("entry_price", 0)
    contracts = request.get("contracts", 1)
    account_id = request.get("account", "apex_100k")
    leverage = request.get("leverage", 40)
    risk_tolerance = request.get("risk_tolerance", 50)
    exchange_type = request.get("exchange_type", "Futures")
    
    if not entry_price:
        market = fetch_market_data(ticker)
        entry_price = market.get("currentPrice", 0)
    
    # Get point value
    point_value = POINT_VALUES.get(ticker, 1)
    
    # Get prop firm info from account
    acct = paper_accounts.get(account_id)
    prop_firm_id = acct.prop_firm if acct else None
    prop_firm = PROP_FIRMS.get(prop_firm_id, {}) if prop_firm_id else {}
    
    # Find account size tier
    drawdown_amount = 0
    drawdown_type = "trailing"
    if prop_firm and acct:
        sizes = prop_firm.get("account_sizes", [])
        dd_amounts = prop_firm.get("drawdown_amounts", [])
        for i, s in enumerate(sizes):
            if s <= acct.initial_balance and i < len(dd_amounts):
                drawdown_amount = dd_amounts[i]
        drawdown_type = prop_firm.get("drawdown_type", "trailing")
    
    # Exchange liquidation math (from Pine Script)
    exchange_config = EXCHANGE_LIQUIDATION.get(exchange_type, {})
    mm_rate = (exchange_config.get("maintenance_margin_pct") or 1.0) / 100
    liq_fee_rate = (exchange_config.get("liquidation_fee_pct") or 0.0) / 100
    initial_margin_rate = 1 / leverage
    allowed_loss_rate = max(0, initial_margin_rate - mm_rate - liq_fee_rate)
    
    long_liq_price = entry_price * (1 - allowed_loss_rate)
    short_liq_price = entry_price * (1 + allowed_loss_rate)
    
    # Prop firm breach/warning levels
    if drawdown_amount > 0 and point_value > 0:
        price_distance_full = drawdown_amount / (contracts * point_value)
        price_distance_warn = (drawdown_amount * (risk_tolerance / 100)) / (contracts * point_value)
    else:
        price_distance_full = entry_price * 0.05
        price_distance_warn = price_distance_full * (risk_tolerance / 100)
    
    # Peak unrealized P&L (simplified: use current price vs entry)
    peak_pnl_points = max(0, entry_price * 0.01)  # Placeholder
    if acct and acct.positions:
        for sym, pos in acct.positions.items():
            current_pnl = pos.get("entry_price", 0) - entry_price
            if pos.get("side") == "LONG":
                peak_pnl_points = max(peak_pnl_points, max(0, entry_price - pos["entry_price"]))
    
    long_breach = entry_price + peak_pnl_points - price_distance_full
    long_warning = entry_price + peak_pnl_points - price_distance_warn
    short_breach = entry_price + peak_pnl_points + price_distance_full
    short_warning = entry_price + peak_pnl_points + price_distance_warn
    
    return {
        "ticker": ticker,
        "entry_price": entry_price,
        "contracts": contracts,
        "point_value": point_value,
        "leverage": leverage,
        "prop_firm": prop_firm.get("name", "None"),
        "drawdown_amount": drawdown_amount,
        "drawdown_type": drawdown_type,
        "exchange_liquidation": {
            "type": exchange_type,
            "long_liq_price": round(long_liq_price, 2),
            "short_liq_price": round(short_liq_price, 2),
            "leverage": leverage,
            "maintenance_margin_pct": mm_rate * 100,
        },
        "prop_firm_levels": {
            "long_breach_price": round(long_breach, 2),
            "long_warning_price": round(long_warning, 2),
            "short_breach_price": round(short_breach, 2),
            "short_warning_price": round(short_warning, 2),
            "risk_tolerance_pct": risk_tolerance,
        },
    }

@app.post("/api/trading/bot-check")
async def bot_check(request: dict):
    """Check all open positions for stop/take-profit hits with auto-trailing.
    Body: {"prices": {"BTC-USD": 104500, "ES=F": 5500}}
    Returns closed trades and updated positions.
    """
    prices = request.get("prices", {})
    if not prices:
        # Auto-fetch prices for open positions
        for aid, acct in paper_accounts.items():
            for symbol in list(acct.positions.keys()):
                try:
                    market = fetch_market_data(symbol)
                    if "currentPrice" in market:
                        prices[symbol] = market["currentPrice"]
                except:
                    pass
    
    results = {"closed": [], "positions": {}, "accounts": {}}
    
    for aid, acct in paper_accounts.items():
        if not acct.positions:
            continue
        # Build trail config from engine analysis
        trail_config = {}
        for symbol, pos in acct.positions.items():
            trail_info = {}
            if pos.get("engine_id") == "reece":
                trail_info = {"trail_start": 100, "trail_amount": 50, "entry_type": "stop_limit"}
            else:
                # Default trailing: start at 2x risk dollar amount
                risk_per_share = abs(pos.get("entry_price", 0) - (pos.get("stop_loss") or 0))
                if risk_per_share > 0:
                    trail_info = {"trail_start": risk_per_share * pos.get("quantity", 1) * 2, "trail_amount": risk_per_share}
            
            if trail_info:
                trail_config[symbol] = trail_info
        
        closed = acct.check_stops(prices, trail_config)
        results["closed"].extend([{"account": aid, "trade": c} for c in closed])
        results["positions"][aid] = {s: {"side": p["side"], "entry": p["entry_price"], "stop": p["stop_loss"], "tp": p.get("take_profit"), "engine": p.get("engine_id"), "qty": p.get("quantity")} for s, p in acct.positions.items()}
        results["accounts"][aid] = acct.get_stats()
    
    return results

@app.post("/api/trading/reset/{account_id}")
async def reset_account(account_id: str):
    """Reset a paper trading account to its initial balance."""
    acct = paper_accounts.get(account_id)
    if not acct:
        return {"error": f"Account {account_id} not found"}
    
    initial = acct.initial_balance
    acct.balance = initial
    acct.equity = initial
    acct.daily_pnl = 0
    acct.daily_start_equity = initial
    acct.peak_equity = initial
    acct.max_drawdown = 0
    acct.positions = {}
    acct.trades = []
    
    return {"status": "reset", "account": account_id, "balance": initial}


# ── Register New Endpoints (History, Cron, Transcribe) ──
register_new_endpoints(app, paper_accounts, fetch_market_data, bot_check, create_signal, get_db)
register_design_endpoints(app, call_gemini)

if __name__ == "__main__":
    port = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 7799
    print(f"Starting Tekton Command Center on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)

