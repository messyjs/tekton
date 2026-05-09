#!/usr/bin/env python3
"""
Exchange Data Layer for Tekton
Priority: Bybit API -> OKX (ccxt) -> Yahoo Finance
Honest labeling -- always reports the actual source used.

- Bybit: Direct API, works when not geo-blocked or behind VPN
- OKX: Always accessible, 307 USDT perpetuals, same markets
- Yahoo: Last resort for stocks/futures/Yahoo crypto
"""

import os
import statistics
from datetime import datetime
from pathlib import Path

import yfinance as yf

# ── Symbol Definitions ──

BYBIT_SYMBOLS = {
    # ── Major Perps (USDT-settled) ──
    "BTCUSDT": {"name": "BTC/USDT Perp", "yahoo": "BTC-USD", "asset": "crypto", "category": "Major"},
    "ETHUSDT": {"name": "ETH/USDT Perp", "yahoo": "ETH-USD", "asset": "crypto", "category": "Major"},
    "BNBUSDT": {"name": "BNB/USDT Perp", "yahoo": "BNB-USD", "asset": "crypto", "category": "Major"},
    "SOLUSDT": {"name": "SOL/USDT Perp", "yahoo": "SOL-USD", "asset": "crypto", "category": "Major"},
    "XRPUSDT": {"name": "XRP/USDT Perp", "yahoo": "XRP-USD", "asset": "crypto", "category": "Major"},
    "DOGEUSDT": {"name": "DOGE/USDT Perp", "yahoo": "DOGE-USD", "asset": "crypto", "category": "Major"},
    "ADAUSDT": {"name": "ADA/USDT Perp", "yahoo": "ADA-USD", "asset": "crypto", "category": "Major"},
    "AVAXUSDT": {"name": "AVAX/USDT Perp", "yahoo": "AVAX-USD", "asset": "crypto", "category": "Major"},
    "DOTUSDT": {"name": "DOT/USDT Perp", "yahoo": "DOT-USD", "asset": "crypto", "category": "Major"},
    "LINKUSDT": {"name": "LINK/USDT Perp", "yahoo": "LINK-USD", "asset": "crypto", "category": "Major"},
    "MATICUSDT": {"name": "MATIC/USDT Perp", "yahoo": "MATIC-USD", "asset": "crypto", "category": "Major"},
    # ── Layer 1 / Smart Contract ──
    "SUIUSDT": {"name": "SUI/USDT Perp", "yahoo": "SUI-USD", "asset": "crypto", "category": "L1"},
    "APTUSDT": {"name": "APT/USDT Perp", "yahoo": "APT-USD", "asset": "crypto", "category": "L1"},
    "NEARUSDT": {"name": "NEAR/USDT Perp", "yahoo": "NEAR-USD", "asset": "crypto", "category": "L1"},
    "FTMUSDT": {"name": "FTM/USDT Perp", "yahoo": "FTM-USD", "asset": "crypto", "category": "L1"},
    "SEIUSDT": {"name": "SEI/USDT Perp", "yahoo": "SEI-USD", "asset": "crypto", "category": "L1"},
    "INJUSDT": {"name": "INJ/USDT Perp", "yahoo": "INJ-USD", "asset": "crypto", "category": "L1"},
    "ATOMUSDT": {"name": "ATOM/USDT Perp", "yahoo": "ATOM-USD", "asset": "crypto", "category": "L1"},
    "ALGOUSDT": {"name": "ALGO/USDT Perp", "yahoo": "ALGO-USD", "asset": "crypto", "category": "L1"},
    "FILUSDT": {"name": "FIL/USDT Perp", "yahoo": "FIL-USD", "asset": "crypto", "category": "L1"},
    "ICPUSDT": {"name": "ICP/USDT Perp", "yahoo": "ICP-USD", "asset": "crypto", "category": "L1"},
    # ── DeFi ──
    "AAVEUSDT": {"name": "AAVE/USDT Perp", "yahoo": "AAVE-USD", "asset": "crypto", "category": "DeFi"},
    "UNIUSDT": {"name": "UNI/USDT Perp", "yahoo": "UNI-USD", "asset": "crypto", "category": "DeFi"},
    "MKRUSDT": {"name": "MKR/USDT Perp", "yahoo": "MKR-USD", "asset": "crypto", "category": "DeFi"},
    "CRVUSDT": {"name": "CRV/USDT Perp", "yahoo": "CRV-USD", "asset": "crypto", "category": "DeFi"},
    "COMPUSDT": {"name": "COMP/USDT Perp", "yahoo": "COMP-USD", "asset": "crypto", "category": "DeFi"},
    "SNXUSDT": {"name": "SNX/USDT Perp", "yahoo": "SNX-USD", "asset": "crypto", "category": "DeFi"},
    "GRTUSDT": {"name": "GRT/USDT Perp", "yahoo": "GRT-USD", "asset": "crypto", "category": "DeFi"},
    "LDOUSDT": {"name": "LDO/USDT Perp", "yahoo": "LDO-USD", "asset": "crypto", "category": "DeFi"},
    # ── Meme / Viral ──
    "PEPEUSDT": {"name": "PEPE/USDT Perp", "yahoo": "PEPE-USD", "asset": "crypto", "category": "Meme"},
    "SHIBUSDT": {"name": "SHIB/USDT Perp", "yahoo": "SHIB-USD", "asset": "crypto", "category": "Meme"},
    "FLOKIUSDT": {"name": "FLOKI/USDT Perp", "yahoo": "FLOKI-USD", "asset": "crypto", "category": "Meme"},
    "BONKUSDT": {"name": "BONK/USDT Perp", "yahoo": "BONK-USD", "asset": "crypto", "category": "Meme"},
    "WIFUSDT": {"name": "WIF/USDT Perp", "yahoo": "WIF-USD", "asset": "crypto", "category": "Meme"},
    # ── AI / Narrative ──
    "FETUSDT": {"name": "FET/USDT Perp", "yahoo": "FET-USD", "asset": "crypto", "category": "AI"},
    "RENDERUSDT": {"name": "RENDER/USDT Perp", "yahoo": "RENDER-USD", "asset": "crypto", "category": "AI"},
    "ARKMUSDT": {"name": "ARKM/USDT Perp", "yahoo": "ARKM-USD", "asset": "crypto", "category": "AI"},
    "OCEANUSDT": {"name": "OCEAN/USDT Perp", "yahoo": "OCEAN-USD", "asset": "crypto", "category": "AI"},
    # ── Gaming / Metaverse ──
    "AXSUSDT": {"name": "AXS/USDT Perp", "yahoo": "AXS-USD", "asset": "crypto", "category": "Gaming"},
    "SANDUSDT": {"name": "SAND/USDT Perp", "yahoo": "SAND-USD", "asset": "crypto", "category": "Gaming"},
    "MANAUSDT": {"name": "MANA/USDT Perp", "yahoo": "MANA-USD", "asset": "crypto", "category": "Gaming"},
    "IMXUSDT": {"name": "IMX/USDT Perp", "yahoo": "IMX-USD", "asset": "crypto", "category": "Gaming"},
    # ── Exchange Tokens ──
    "OKBUSDT": {"name": "OKB/USDT Perp", "yahoo": "OKB-USD", "asset": "crypto", "category": "Exchange"},
    # ── Shorthand aliases (BTC, ETH, SOL, etc.) -> map to USDT perps
    "BTC": {"name": "BTC/USDT Perp", "yahoo": "BTC-USD", "asset": "crypto", "category": "Major"},
    "ETH": {"name": "ETH/USDT Perp", "yahoo": "ETH-USD", "asset": "crypto", "category": "Major"},
    "SOL": {"name": "SOL/USDT Perp", "yahoo": "SOL-USD", "asset": "crypto", "category": "Major"},
    "BNB": {"name": "BNB/USDT Perp", "yahoo": "BNB-USD", "asset": "crypto", "category": "Major"},
    "XRP": {"name": "XRP/USDT Perp", "yahoo": "XRP-USD", "asset": "crypto", "category": "Major"},
    "DOGE": {"name": "DOGE/USDT Perp", "yahoo": "DOGE-USD", "asset": "crypto", "category": "Major"},
    "ADA": {"name": "ADA/USDT Perp", "yahoo": "ADA-USD", "asset": "crypto", "category": "Major"},
    "AVAX": {"name": "AVAX/USDT Perp", "yahoo": "AVAX-USD", "asset": "crypto", "category": "Major"},
    "DOT": {"name": "DOT/USDT Perp", "yahoo": "DOT-USD", "asset": "crypto", "category": "Major"},
    "LINK": {"name": "LINK/USDT Perp", "yahoo": "LINK-USD", "asset": "crypto", "category": "Major"},
    "MATIC": {"name": "MATIC/USDT Perp", "yahoo": "MATIC-USD", "asset": "crypto", "category": "Major"},
    "UNI": {"name": "UNI/USDT Perp", "yahoo": "UNI-USD", "asset": "crypto", "category": "DeFi"},
    "AAVE": {"name": "AAVE/USDT Perp", "yahoo": "AAVE-USD", "asset": "crypto", "category": "DeFi"},
    "ATOM": {"name": "ATOM/USDT Perp", "yahoo": "ATOM-USD", "asset": "crypto", "category": "L1"},
    "SUI": {"name": "SUI/USDT Perp", "yahoo": "SUI-USD", "asset": "crypto", "category": "L1"},
    "APT": {"name": "APT/USDT Perp", "yahoo": "APT-USD", "asset": "crypto", "category": "L1"},
    "INJ": {"name": "INJ/USDT Perp", "yahoo": "INJ-USD", "asset": "crypto", "category": "L1"},
    "FET": {"name": "FET/USDT Perp", "yahoo": "FET-USD", "asset": "crypto", "category": "AI"},
    "PEPE": {"name": "PEPE/USDT Perp", "yahoo": "PEPE-USD", "asset": "crypto", "category": "Meme"},
    "SHIB": {"name": "SHIB/USDT Perp", "yahoo": "SHIB-USD", "asset": "crypto", "category": "Meme"},
}

POPULAR_TICKERS = {
    "BTC-USD": "Bitcoin", "ETH-USD": "Ethereum", "SOL-USD": "Solana",
    "SPY": "S&P 500 ETF", "QQQ": "Nasdaq 100 ETF", "AAPL": "Apple",
    "TSLA": "Tesla", "NQ=F": "Nasdaq Futures", "ES=F": "S&P Futures",
    "GLD": "Gold ETF", "AMZN": "Amazon", "NVDA": "NVIDIA",
    "META": "Meta", "GOOGL": "Google", "XRP-USD": "XRP",
    "DOGE-USD": "Dogecoin", "ADA-USD": "Cardano", "AVAX-USD": "Avalanche",
}

DEFAULT_EXCHANGE = "bybit"  # Default exchange label for crypto

# ── Bybit API (direct, geo-blocked in some regions) ──

_BYBIT_AVAILABLE = None

def _check_bybit_available() -> bool:
    """Check if Bybit API is accessible. Caches result."""
    global _BYBIT_AVAILABLE
    if _BYBIT_AVAILABLE is not None:
        return _BYBIT_AVAILABLE
    try:
        import requests
        r = requests.get("https://api.bybit.com/v5/market/kline",
                        params={"category": "linear", "symbol": "BTCUSDT", "interval": "1", "limit": 1},
                        timeout=5)
        _BYBIT_AVAILABLE = r.status_code == 200 and r.json().get("retCode") == 0
    except Exception:
        _BYBIT_AVAILABLE = False
    return _BYBIT_AVAILABLE


TICKER_ALIASES = {
    # Common shorthands -> proper yfinance symbols
    # Crypto
    "BTC": "BTC-USD", "ETH": "ETH-USD", "SOL": "SOL-USD", "BNB": "BNB-USD",
    "XRP": "XRP-USD", "DOGE": "DOGE-USD", "ADA": "ADA-USD", "AVAX": "AVAX-USD",
    "MATIC": "MATIC-USD", "LINK": "LINK-USD", "DOT": "DOT-USD", "UNI": "UNI-USD",
    "AAVE": "AAVE-USD", "ATOM": "ATOM-USD", "ALGO": "ALGO-USD", "FIL": "FIL-USD",
    "ICP": "ICP-USD", "NEAR": "NEAR-USD", "SUI": "SUI-USD", "APT": "APT-USD",
    "INJ": "INJ-USD", "SEI": "SEI-USD", "FTM": "FTM-USD", "PEPE": "PEPE-USD",
    "SHIB": "SHIB-USD", "FET": "FET-USD", "RENDER": "RENDER-USD",
    # Stocks
    "NVDA": "NVDA", "AAPL": "AAPL", "TSLA": "TSLA", "MSFT": "MSFT",
    "GOOGL": "GOOGL", "AMZN": "AMZN", "META": "META", "AMD": "AMD",
    "NFLX": "NFLX", "COIN": "COIN", "SPY": "SPY", "QQQ": "QQQ",
    "PLTR": "PLTR", "SNOW": "SNOW", "CRM": "CRM", "PYPL": "PYPL",
    "SQ": "SQ", "HOOD": "HOOD", "RIVN": "RIVN", "DIS": "DIS", "BA": "BA",
    # Futures
    "ES": "ES=F", "NQ": "NQ=F", "RTY": "RTY=F", "YM": "YM=F",
    "CL": "CL=F", "GC": "GC=F", "SI": "SI=F", "HG": "HG=F",
    "ZB": "ZB=F", "ZN": "ZN=F", "ZF": "ZF=F",
    # Forex
    "EURUSD": "EURUSD=X", "GBPUSD": "GBPUSD=X", "USDJPY": "USDJPY=X",
    "AUDUSD": "AUDUSD=X", "USDCAD": "USDCAD=X", "NZDUSD": "NZDUSD=X",
}

def resolve_ticker(ticker: str) -> str:
    """Resolve symbol to Yahoo Finance format. BTC -> BTC-USD, BTCUSDT -> BTC-USD."""
    # 1. Direct alias lookup (BTC, ETH, NVDA, etc.)
    if ticker in TICKER_ALIASES:
        return TICKER_ALIASES[ticker]
    # 2. Bybit perp format lookup (BTCUSDT, etc.)
    if ticker in BYBIT_SYMBOLS:
        return BYBIT_SYMBOLS[ticker]["yahoo"]
    # 3. Already in yfinance format or unknown — pass through
    return ticker


def _bybit_to_okx(symbol: str) -> str:
    """Convert Bybit symbol to OKX ccxt format. BTCUSDT -> BTC/USDT:USDT."""
    if symbol in BYBIT_SYMBOLS:
        base = symbol.replace("USDT", "").replace("USDC", "")
        return f"{base}/USDT:USDT"
    return symbol


def fetch_bybit_candles(symbol: str, interval: str = "60", limit: int = 500) -> list:
    """Fetch candles from Bybit v5 API. Returns empty list if blocked."""
    import requests
    try:
        url = "https://api.bybit.com/v5/market/kline"
        params = {"category": "linear", "symbol": symbol, "interval": interval, "limit": limit}
        r = requests.get(url, params=params, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get("retCode") == 0:
                rows = data["result"]["list"]
                return [{"time": int(row[0]) // 1000, "open": float(row[1]),
                         "high": float(row[2]), "low": float(row[3]),
                         "close": float(row[4]), "volume": float(row[5])}
                        for row in reversed(rows)]
    except Exception:
        pass
    return []


# ── OKX Exchange (always accessible, 307 USDT perps) ──

_OKX_EXCHANGE = None

def _get_okx_exchange():
    """Lazy-load OKX exchange via ccxt."""
    global _OKX_EXCHANGE
    if _OKX_EXCHANGE is None:
        try:
            import ccxt
            _OKX_EXCHANGE = ccxt.okx({"enableRateLimit": True})
        except ImportError:
            pass
    return _OKX_EXCHANGE


def fetch_okx_candles(symbol: str, timeframe: str = "1h", limit: int = 500) -> list:
    """Fetch candles from OKX. Converts Bybit symbols automatically."""
    exchange = _get_okx_exchange()
    if not exchange:
        return []
    tf_map = {"1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d"}
    okx_tf = tf_map.get(timeframe, "1h")
    # Try perp then spot
    attempts = []
    if symbol in BYBIT_SYMBOLS:
        base = symbol.replace("USDT", "")
        attempts = [f"{base}/USDT:USDT", f"{base}/USDT"]
    else:
        attempts = [symbol]
    for attempt in attempts:
        try:
            ohlcv = exchange.fetch_ohlcv(attempt, timeframe=okx_tf, limit=limit)
            return [{"time": int(row[0] // 1000), "open": float(row[1]),
                     "high": float(row[2]), "low": float(row[3]),
                     "close": float(row[4]), "volume": float(row[5]) if row[5] else 0}
                    for row in ohlcv]
        except Exception:
            continue
    return []


def fetch_okx_ticker(symbol: str) -> dict:
    """Fetch current price from OKX. Returns dict or empty dict."""
    exchange = _get_okx_exchange()
    if not exchange:
        return {}
    attempts = []
    if symbol in BYBIT_SYMBOLS:
        base = symbol.replace("USDT", "")
        attempts = [f"{base}/USDT:USDT", f"{base}/USDT"]
    else:
        attempts = [symbol]
    for attempt in attempts:
        try:
            ticker = exchange.fetch_ticker(attempt)
            return {"currentPrice": ticker.get("last", 0), "previousClose": ticker.get("previousClose", 0),
                    "high": ticker.get("high", 0), "low": ticker.get("low", 0),
                    "volume": ticker.get("baseVolume", 0), "change_pct": ticker.get("percentage", 0)}
        except Exception:
            continue
    return {}


# ── Unified data fetchers with honest source labeling ──

def fetch_candles(symbol: str, timeframe: str = "1h", limit: int = 500) -> tuple:
    """Fetch candles. Priority: Bybit -> OKX -> Yahoo.
    Returns (candles_list, source_str) with honest labeling."""
    is_crypto = symbol in BYBIT_SYMBOLS

    # 1. Bybit API (direct, works when not geo-blocked)
    if is_crypto and _check_bybit_available():
        bybit_interval = {"1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "D"}.get(timeframe, "60")
        candles = fetch_bybit_candles(symbol, interval=bybit_interval, limit=limit)
        if candles:
            return candles, "bybit"

    # 2. OKX (always accessible, same USDT perp markets)
    if is_crypto:
        candles = fetch_okx_candles(symbol, timeframe=timeframe, limit=limit)
        if candles:
            return candles, "okx"

    # 3. Yahoo Finance (last resort)
    yahoo_ticker = resolve_ticker(symbol)
    try:
        period_map = {"1m": "5d", "5m": "1mo", "15m": "1mo", "1h": "3mo", "4h": "6mo", "1d": "1y"}
        period = period_map.get(timeframe, "3mo")
        yf_interval = timeframe if timeframe != "4h" else "60m"
        t = yf.Ticker(yahoo_ticker)
        hist = t.history(period=period, interval=yf_interval)
        if not hist.empty:
            candles = []
            for idx, row in hist.iterrows():
                candles.append({"time": int(idx.timestamp()),
                                "open": round(float(row["Open"]), 2), "high": round(float(row["High"]), 2),
                                "low": round(float(row["Low"]), 2), "close": round(float(row["Close"]), 2),
                                "volume": int(row["Volume"]) if row["Volume"] > 0 else 0})
            return candles, "yahoo"
    except Exception:
        pass
    return [], "none"


def fetch_market_data(ticker: str, period: str = "6mo") -> dict:
    """Fetch market data with priority: Bybit -> OKX -> Yahoo.
    Always labels the actual source honestly."""
    resolved = resolve_ticker(ticker)
    is_crypto = ticker in BYBIT_SYMBOLS or resolved != ticker  # alias resolved = crypto shorthand
    # Convert shorthand (BTC, ETH) to Bybit perp format (BTCUSDT, ETHUSDT)
    if ticker in BYBIT_SYMBOLS and BYBIT_SYMBOLS[ticker].get('yahoo', '').endswith('-USD'):
        bybit_symbol = ticker + 'USDT'  # BTC -> BTCUSDT
    elif is_crypto and not ticker.endswith('USDT') and not ticker.endswith('USDC'):
        bybit_symbol = ticker + 'USDT'
    else:
        bybit_symbol = ticker

    # 1. Try Bybit direct (works when not geo-blocked)
    if is_crypto and _check_bybit_available():
        import requests
        try:
            r = requests.get("https://api.bybit.com/v5/market/tickers",
                            params={"category": "linear", "symbol": bybit_symbol}, timeout=10)
            if r.status_code == 200:
                data = r.json()
                if data.get("retCode") == 0 and data.get("result", {}).get("list"):
                    t = data["result"]["list"][0]
                    # Get historical data from OKX for pivots (Bybit ticker endpoint doesn't have full history)
                    okx_hist = fetch_okx_candles(bybit_symbol, timeframe="1d", limit=180)
                    if okx_hist and len(okx_hist) >= 2:
                        closes = [c["close"] for c in okx_hist]
                        highs = [c["high"] for c in okx_hist]
                        lows = [c["low"] for c in okx_hist]
                        current_price = float(t.get("lastPrice", closes[-1]))
                        change_pct = float(t.get("price24hPcnt", 0)) * 100
                        return {
                            "symbol": ticker, "name": BYBIT_SYMBOLS.get(ticker, {}).get("name", ticker),
                            "currentPrice": round(current_price, 8 if current_price < 1 else 4 if current_price < 100 else 2),
                            "pivotHigh": round(max(highs), 2), "pivotLow": round(min(lows), 2),
                            "pivotHighTime": okx_hist[max(range(len(highs)), key=lambda i: highs[i])]["time"],
                            "pivotLowTime": okx_hist[min(range(len(lows)), key=lambda i: lows[i])]["time"],
                            "volatility": round(statistics.stdev(closes) / statistics.mean(closes) * (252 ** 0.5), 4) if len(closes) > 1 else 0,
                            "changePercent": round(change_pct, 2),
                            "volume": round(float(t.get("volume24h", 0)), 0),
                            "period": period, "dataPoints": len(okx_hist),
                            "lastUpdate": datetime.now().isoformat(),
                            "exchange": "bybit", "source": "bybit",
                        }
        except Exception:
            pass

    # 2. OKX (always works, honest label)
    if is_crypto:
        okx_symbol = _bybit_to_okx(bybit_symbol) if bybit_symbol in BYBIT_SYMBOLS else _bybit_to_okx(bybit_symbol + "USDT" if not bybit_symbol.endswith("USDT") else bybit_symbol)
        okx_data = fetch_okx_ticker(bybit_symbol)
        okx_hist = fetch_okx_candles(bybit_symbol, timeframe="1d", limit=180)
        if okx_data and okx_data.get("currentPrice") and okx_hist and len(okx_hist) >= 2:
            closes = [c["close"] for c in okx_hist]
            highs = [c["high"] for c in okx_hist]
            lows = [c["low"] for c in okx_hist]
            current_price = okx_data["currentPrice"]
            prev_close = closes[-2] if len(closes) > 1 else current_price
            change_pct = okx_data.get("change_pct", ((current_price - prev_close) / prev_close * 100) if prev_close else 0)
            return {
                "symbol": ticker, "name": BYBIT_SYMBOLS.get(ticker, {}).get("name", ticker),
                "currentPrice": round(current_price, 8 if current_price < 1 else 4 if current_price < 100 else 2),
                "pivotHigh": round(max(highs), 2), "pivotLow": round(min(lows), 2),
                "pivotHighTime": okx_hist[max(range(len(highs)), key=lambda i: highs[i])]["time"],
                "pivotLowTime": okx_hist[min(range(len(lows)), key=lambda i: lows[i])]["time"],
                "volatility": round(statistics.stdev(closes) / statistics.mean(closes) * (252 ** 0.5), 4) if len(closes) > 1 else 0,
                "changePercent": round(change_pct, 2),
                "volume": round(sum(c["volume"] for c in okx_hist[-7:]), 0),
                "period": period, "dataPoints": len(okx_hist),
                "lastUpdate": datetime.now().isoformat(),
                "exchange": "okx", "source": "okx",
            }

    # 3. Yahoo Finance (last resort for everything)
    yahoo_ticker = resolve_ticker(ticker)
    try:
        t = yf.Ticker(yahoo_ticker)
        hist = t.history(period=period)
        if hist.empty:
            return {"error": f"No data for {ticker} (tried Bybit->OKX->Yahoo)"}
        current_price = float(hist["Close"].iloc[-1])
        prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else current_price
        change_pct = ((current_price - prev_close) / prev_close) * 100 if prev_close else 0
        high = float(hist["High"].max())
        low = float(hist["Low"].min())
        volume = float(hist["Volume"].iloc[-1]) if "Volume" in hist.columns else 0
        high_idx = hist["High"].idxmax()
        low_idx = hist["Low"].idxmin()
        returns = hist["Close"].pct_change().dropna()
        volatility = float(returns.std() * (252 ** 0.5)) if len(returns) > 0 else 0
        return {
            "symbol": ticker, "name": POPULAR_TICKERS.get(ticker, BYBIT_SYMBOLS.get(ticker, {}).get("name", ticker)),
            "currentPrice": round(current_price, 8 if current_price < 1 else 4 if current_price < 100 else 2),
            "pivotHigh": round(high, 2), "pivotLow": round(low, 2),
            "pivotHighTime": high_idx.isoformat() if hasattr(high_idx, "isoformat") else str(high_idx),
            "pivotLowTime": low_idx.isoformat() if hasattr(low_idx, "isoformat") else str(low_idx),
            "volatility": round(volatility, 4), "changePercent": round(change_pct, 2),
            "volume": round(volume, 0), "period": period, "dataPoints": len(hist),
            "lastUpdate": datetime.now().isoformat(),
            "exchange": "okx" if is_crypto else "yahoo", "source": "yahoo",
        }
    except Exception as e:
        return {"error": str(e)}