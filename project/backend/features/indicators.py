"""
indicators.py - Calculate technical indicators with pandas/numpy.
"""
import pandas as pd
import numpy as np


def calculate_rsi(series: pd.Series, period=14) -> float:
    """Calculate RSI using Wilder-style average gains/losses."""
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(window=period).mean()
    loss = (-delta.clip(upper=0)).rolling(window=period).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    value = rsi.dropna().iloc[-1] if not rsi.dropna().empty else 50.0
    return round(float(value), 2)


def _ensure_series(data):
    if isinstance(data, pd.DataFrame):
        if data.shape[1] == 1:
            return data.iloc[:, 0]
        raise ValueError("Expected a single-column DataFrame for indicator calculation")
    return data


def calculate_indicators(df: pd.DataFrame) -> dict:
    """
    Given a stock OHLCV DataFrame, calculate:
    - RSI (14)
    - MACD signal
    - EMA 20/50 trend
    - ATR (volatility)
    Returns a dict of indicator values.
    """
    close = _ensure_series(df["Close"].squeeze())
    result = {}

    # --- RSI ---
    result["rsi"] = calculate_rsi(close)

    # --- MACD ---
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    result["macd"] = round(float(macd_line.iloc[-1]), 4)
    result["macd_signal"] = round(float(signal_line.iloc[-1]), 4)
    result["macd_bullish"] = float(macd_line.iloc[-1]) > float(signal_line.iloc[-1])

    # --- EMA Trend ---
    ema20 = close.ewm(span=20, adjust=False).mean()
    ema50 = close.ewm(span=50, adjust=False).mean()
    last_close = float(close.iloc[-1])
    last_ema20 = float(ema20.iloc[-1])
    last_ema50 = float(ema50.iloc[-1])

    if last_close > last_ema20 > last_ema50:
        result["trend"] = "UP"
    elif last_close < last_ema20 < last_ema50:
        result["trend"] = "DOWN"
    else:
        result["trend"] = "SIDEWAYS"

    result["ema20"] = round(last_ema20, 2)
    result["ema50"] = round(last_ema50, 2)
    result["last_close"] = round(last_close, 2)

    # --- ATR (volatility) ---
    if len(df) >= 14:
        high = _ensure_series(df["High"].squeeze())
        low = _ensure_series(df["Low"].squeeze())
        tr = pd.concat([
            high - low,
            (high - close.shift()).abs(),
            (low - close.shift()).abs()
        ], axis=1).max(axis=1)
        atr = tr.rolling(14).mean().dropna()
        result["atr"] = round(float(atr.iloc[-1]), 4) if not atr.empty else 0.0
    else:
        result["atr"] = 0.0

    # --- Price change % (momentum) ---
    if len(close) >= 20:
        result["momentum_20d"] = round(((last_close / float(close.iloc[-20])) - 1) * 100, 2)
    else:
        result["momentum_20d"] = 0.0

    # --- Daily change % ---
    if len(close) >= 2:
        prev_close = float(close.iloc[-2])
        result["change_1d"] = round(((last_close / prev_close) - 1) * 100, 2) if prev_close else 0.0
    else:
        result["change_1d"] = 0.0

    # --- Price history for chart (last 252 trading days ~ 1 year) ---
    history = close.dropna().copy()
    history = history.tail(252)
    history.index = history.index.strftime("%Y-%m-%d %H:%M:%S")
    result["price_history"] = [
        {"date": date, "close": round(float(price), 2)}
        for date, price in history.items()
    ]

    return result
