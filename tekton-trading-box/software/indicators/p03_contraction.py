"""
Tekton Trading Box — P03 Contraction/Expansion Indicator
Ported from Pine Script v6 (P03_Contraction_Expansion_Orders.pine)
Determines order type: STOP LIMIT (contraction) vs LIMIT (expansion)
"""

import numpy as np
import pandas as pd
from typing import Optional, Tuple


def compute_bollinger_bands(
    close: pd.Series,
    length: int = 20,
    num_std: float = 2.0,
) -> Tuple[pd.Series, pd.Series, pd.Series, pd.Series]:
    """Return (upper, basis, lower, width_pct)"""
    basis = close.rolling(length).mean()
    std = close.rolling(length).std()
    upper = basis + num_std * std
    lower = basis - num_std * std
    width_pct = (upper - lower) / basis * 100
    return upper, basis, lower, width_pct


def compute_keltner_channels(
    close: pd.Series,
    high: pd.Series,
    low: pd.Series,
    length: int = 20,
    atr_mult: float = 1.5,
    atr_len: int = 10,
) -> Tuple[pd.Series, pd.Series, pd.Series, pd.Series]:
    """Return (upper, basis, lower, width_pct)"""
    basis = close.ewm(span=length).mean()
    tr = pd.concat([high - low, (high - close.shift(1)).abs(), (low - close.shift(1)).abs()], axis=1).max(axis=1)
    atr = tr.rolling(atr_len).mean()
    upper = basis + atr_mult * atr
    lower = basis - atr_mult * atr
    width_pct = (upper - lower) / basis * 100
    return upper, basis, lower, width_pct


def compute_atr(
    high: pd.Series,
    low: pd.Series,
    close: pd.Series,
    length: int = 14,
) -> pd.Series:
    tr = pd.concat([high - low, (high - close.shift(1)).abs(), (low - close.shift(1)).abs()], axis=1).max(axis=1)
    return tr.rolling(length).mean()


def p03_analyze(
    df: pd.DataFrame,
    bb_length: int = 20,
    bb_std: float = 2.0,
    kc_length: int = 20,
    kc_mult: float = 1.5,
    kc_atr_len: int = 10,
    atr_len: int = 14,
    squeeze_lookback: int = 125,
    roc_len: int = 5,
    vol_ma_len: int = 20,
    ema_fast: int = 8,
    ema_mid: int = 21,
    ema_slow: int = 55,
) -> dict:
    """
    Run the full P03 analysis on a DataFrame with columns: open, high, low, close, volume.
    Returns a dict with current phase, order type recommendation, and all internals.
    """
    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df.get("volume", pd.Series(0, index=df.index))

    # Bollinger Bands
    bb_upper, bb_basis, bb_lower, bb_width = compute_bollinger_bands(close, bb_length, bb_std)

    # Keltner Channels
    kc_upper, kc_basis, kc_lower, kc_width = compute_keltner_channels(close, high, low, kc_length, kc_mult, kc_atr_len)

    # ATR
    atr = compute_atr(high, low, close, atr_len)
    atr_sma = atr.rolling(atr_len).mean()
    atr_roc = atr.pct_change(roc_len) * 100

    # TTM Squeeze detection
    squeeze_on = (bb_lower > kc_lower) & (bb_upper < kc_upper)
    squeeze_off = ~squeeze_on & squeeze_on.shift(1).fillna(False)

    # BBW percentile
    bbw_hist = bb_width.rolling(squeeze_lookback).mean()

    # Volume
    vol_ma = volume.rolling(vol_ma_len).mean()
    vol_ratio = volume / vol_ma.replace(0, 1)

    # Compression ratio
    range_val = high - low
    compress_ratio = range_val / atr.replace(0, 1)

    # Contraction score (0-100)
    contract_score = pd.Series(0.0, index=df.index)
    contract_score = contract_score.mask(squeeze_on, 100)
    narrowing = (~squeeze_on) & (bb_width < bb_width.shift(1)) & (bb_width < bbw_hist)
    safe_bbw = bbw_hist.replace(0, np.nan)
    narrowing_score = 50 + 50 * (1 - bb_width / safe_bbw)
    contract_score = contract_score.mask(narrowing, narrowing_score)
    contract_score = contract_score.fillna(0)

    # Expansion score (0-100)
    expand_score = pd.Series(0.0, index=df.index)
    hot_bb = (bb_width > bbw_hist * 1.5) & (atr_roc > 10)
    expand_score = expand_score.mask(hot_bb, 100)
    moderate = (~hot_bb) & (bb_width > bb_width.shift(1)) & (bb_width > bbw_hist) & (vol_ratio > 1.2)
    expand_score = expand_score.mask(moderate, 60)
    expand_score = expand_score.fillna(0)

    # Trend
    ema_f = close.ewm(span=ema_fast).mean()
    ema_m = close.ewm(span=ema_mid).mean()
    ema_s = close.ewm(span=ema_slow).mean()
    bullish = (ema_f > ema_m) & (ema_m > ema_s)
    bearish = (ema_f < ema_m) & (ema_m < ema_s)

    # Last row values
    idx = -1
    result = {
        "phase": "neutral",
        "order_type": "none",
        "order_label": "FLAT",
        "squeeze_on": bool(squeeze_on.iloc[idx]) if len(squeeze_on) > 0 else False,
        "squeeze_firing": bool(squeeze_off.iloc[idx]) if len(squeeze_off) > 0 else False,
        "contract_score": float(contract_score.iloc[idx]) if len(contract_score) > 0 else 0,
        "expand_score": float(expand_score.iloc[idx]) if len(expand_score) > 0 else 0,
        "bullish": bool(bullish.iloc[idx]) if len(bullish) > 0 else False,
        "bearish": bool(bearish.iloc[idx]) if len(bearish) > 0 else False,
        "bb_width": float(bb_width.iloc[idx]) if len(bb_width) > 0 else 0,
        "kc_width": float(kc_width.iloc[idx]) if len(kc_width) > 0 else 0,
        "atr": float(atr.iloc[idx]) if len(atr) > 0 else 0,
        "atr_pct": float((atr / close).iloc[idx] * 100) if len(atr) > 0 and len(close) > 0 else 0,
        "atr_roc": float(atr_roc.iloc[idx]) if len(atr_roc) > 0 else 0,
        "vol_ratio": float(vol_ratio.iloc[idx]) if len(vol_ratio) > 0 else 0,
        "compress_ratio": float(compress_ratio.iloc[idx]) if len(compress_ratio) > 0 else 0,
        "bb_upper": float(bb_upper.iloc[idx]) if len(bb_upper) > 0 else 0,
        "bb_lower": float(bb_lower.iloc[idx]) if len(bb_lower) > 0 else 0,
        "bb_basis": float(bb_basis.iloc[idx]) if len(bb_basis) > 0 else 0,
        "ema_fast": float(ema_f.iloc[idx]) if len(ema_f) > 0 else 0,
        "ema_mid": float(ema_m.iloc[idx]) if len(ema_m) > 0 else 0,
        "ema_slow": float(ema_s.iloc[idx]) if len(ema_s) > 0 else 0,
        "price": float(close.iloc[idx]) if len(close) > 0 else 0,
    }

    # Determine phase and order type
    sq_on = result["squeeze_on"]
    sq_fire = result["squeeze_firing"]
    cs = result["contract_score"]
    es = result["expand_score"]
    bull = result["bullish"]

    if sq_fire:
        result["phase"] = "contraction_fire"
        result["order_type"] = "stop_limit"
        result["order_label"] = "SL BUY" if result["price"] > result["bb_basis"] else "SL SELL"
    elif sq_on or cs > 70:
        result["phase"] = "contraction"
        result["order_type"] = "stop_limit"
        if bull:
            result["order_label"] = "SL* LONG"
        elif result["bearish"]:
            result["order_label"] = "SL* SHORT"
        else:
            result["order_label"] = "WAIT"
    elif es > 50:
        result["phase"] = "expansion"
        result["order_type"] = "limit"
        if bull:
            result["order_label"] = "LMT LONG"
        elif result["bearish"]:
            result["order_label"] = "LMT SHORT"
        else:
            result["order_label"] = "LMT* FLAT"
    else:
        result["phase"] = "neutral"
        result["order_type"] = "none"
        result["order_label"] = "FLAT"

    return result