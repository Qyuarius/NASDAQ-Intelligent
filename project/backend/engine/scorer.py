"""
scorer.py - Score and rank stocks/ETFs, generate BUY/HOLD/SELL signals
"""

from features.fundamentals import score_fundamentals, score_etf
from data.fetcher import is_etf


def _price_history_from_df(df, max_rows=240):
    if df is None:
        return []
    series = df["Close"]
    if hasattr(series, "ndim") and series.ndim > 1:
        series = series.iloc[:, 0]
    series = series.dropna().copy()
    series = series.tail(max_rows)
    series.index = series.index.strftime("%Y-%m-%d %H:%M:%S")
    return [{"date": date, "close": round(float(price), 2)} for date, price in series.items()]


def score_stock(indicators: dict, fundamentals: dict = None) -> dict:
    """Score a stock 0-10: Technical (0-5) + Fundamental (0-5)."""
    score = 0
    breakdown = {}
    technical_score = 0
    fundamental_score = 0

    # --- RSI (0-2) ---
    rsi = indicators.get("rsi", 50)
    if 40 <= rsi <= 60:
        rsi_pts, rsi_note = 1, "Neutral zone"
    elif 60 < rsi <= 70:
        rsi_pts, rsi_note = 2, "Bullish momentum"
    elif rsi > 70:
        rsi_pts, rsi_note = 0, "Overbought"
    elif 30 <= rsi < 40:
        rsi_pts, rsi_note = 1, "Near oversold"
    else:
        rsi_pts, rsi_note = 0, "Oversold"
    score += rsi_pts; technical_score += rsi_pts
    breakdown["rsi"] = {"points": rsi_pts, "note": rsi_note}

    # --- MACD (0-1) ---
    macd_bullish = indicators.get("macd_bullish", False)
    macd_pts = 1 if macd_bullish else 0
    score += macd_pts; technical_score += macd_pts
    breakdown["macd"] = {"points": macd_pts, "note": "Bullish crossover" if macd_bullish else "Bearish/neutral"}

    # --- Trend (0-1) ---
    trend = indicators.get("trend", "SIDEWAYS")
    trend_pts = 1 if trend == "UP" else 0
    score += trend_pts; technical_score += trend_pts
    breakdown["trend"] = {"points": trend_pts, "note": trend}

    # --- Momentum (0-1) ---
    momentum = indicators.get("momentum_20d", 0)
    mom_pts = 1 if momentum > 2 else 0
    score += mom_pts; technical_score += mom_pts
    breakdown["momentum"] = {"points": mom_pts, "note": f"{momentum:+.1f}% 20d"}

    # --- Fundamentals (0-5) ---
    if fundamentals is not None:
        fund_scored = score_fundamentals(fundamentals)
        fundamental_score = fund_scored.get("total_pts", 0)
        score += fundamental_score
        for key, val in fund_scored.get("breakdown", {}).items():
            breakdown[key] = val

    signal = "BUY" if score >= 7 else "HOLD" if score >= 4 else "SELL"

    return {
        "score": score, "signal": signal, "breakdown": breakdown,
        "technical_score": technical_score, "fundamental_score": fundamental_score,
    }


def score_etf_asset(indicators: dict, etf_metrics: dict = None) -> dict:
    """
    Score an ETF 0-10:
    - Technical (0-5): same as stocks
    - ETF metrics (0-5): expense ratio (0-2), AUM (0-1), yield (0-1), NAV (1)
    """
    score = 0
    breakdown = {}
    technical_score = 0
    etf_score = 0

    # --- RSI (0-2) ---
    rsi = indicators.get("rsi", 50)
    if 40 <= rsi <= 60:
        rsi_pts, rsi_note = 1, "Neutral zone"
    elif 60 < rsi <= 70:
        rsi_pts, rsi_note = 2, "Bullish momentum"
    elif rsi > 70:
        rsi_pts, rsi_note = 0, "Overbought"
    elif 30 <= rsi < 40:
        rsi_pts, rsi_note = 1, "Near oversold"
    else:
        rsi_pts, rsi_note = 0, "Oversold"
    score += rsi_pts; technical_score += rsi_pts
    breakdown["rsi"] = {"points": rsi_pts, "note": rsi_note}

    # --- MACD (0-1) ---
    macd_bullish = indicators.get("macd_bullish", False)
    macd_pts = 1 if macd_bullish else 0
    score += macd_pts; technical_score += macd_pts
    breakdown["macd"] = {"points": macd_pts, "note": "Bullish crossover" if macd_bullish else "Bearish/neutral"}

    # --- Trend (0-1) ---
    trend = indicators.get("trend", "SIDEWAYS")
    trend_pts = 1 if trend == "UP" else 0
    score += trend_pts; technical_score += trend_pts
    breakdown["trend"] = {"points": trend_pts, "note": trend}

    # --- Momentum (0-1) ---
    momentum = indicators.get("momentum_20d", 0)
    mom_pts = 1 if momentum > 2 else 0
    score += mom_pts; technical_score += mom_pts
    breakdown["momentum"] = {"points": mom_pts, "note": f"{momentum:+.1f}% 20d"}

    # --- ETF metrics (0-5) ---
    if etf_metrics is not None:
        etf_scored = score_etf(etf_metrics)
        etf_score = etf_scored.get("total_pts", 0)
        score += etf_score
        for key, val in etf_scored.get("breakdown", {}).items():
            breakdown[key] = val

    signal = "BUY" if score >= 7 else "HOLD" if score >= 4 else "SELL"

    return {
        "score": score, "signal": signal, "breakdown": breakdown,
        "technical_score": technical_score, "fundamental_score": etf_score,
    }


def rank_stocks(stock_data: dict, indicators_map: dict, intraday_map: dict = None, fundamentals_map: dict = None) -> list:
    """Produce a sorted ranking list for all stocks and ETFs."""
    print("[Scorer] Scoring and ranking assets...")
    rankings = []

    for ticker, indicators in indicators_map.items():
        metrics = fundamentals_map.get(ticker, {}) if fundamentals_map else {}
        asset_is_etf = is_etf(ticker)
        asset_type = "ETF" if asset_is_etf else "Stock"

        if asset_is_etf:
            scored = score_etf_asset(indicators, metrics)
        else:
            scored = score_stock(indicators, metrics)

        # Extract volume from stock data
        volume = 0
        last_close = indicators.get("last_close", 0)
        if ticker in stock_data and stock_data[ticker] is not None:
            try:
                vol_series = stock_data[ticker]["Volume"]
                if hasattr(vol_series, "iloc") and len(vol_series) > 0:
                    volume = int(vol_series.iloc[-1])
            except Exception as e:
                if ticker == "AAPL":
                    print(f"[Scorer DEBUG] AAPL volume error: {e}, type={type(stock_data[ticker])}, cols={list(stock_data[ticker].columns) if hasattr(stock_data[ticker], 'columns') else 'N/A'}")
                volume = 0

        change_1d = indicators.get("change_1d", 0.0)
        turnover = round(last_close * volume, 2) if volume > 0 else 0.0

        entry = {
            "stock": ticker,
            "ticker": ticker,
            "type": asset_type,
            "score": scored["score"],
            "signal": scored["signal"],
            "technical_score": scored.get("technical_score", 0),
            "fundamental_score": scored.get("fundamental_score", 0),
            "news_adjustment": 0.0,
            "rsi": indicators.get("rsi", 50),
            "trend": indicators.get("trend", "SIDEWAYS"),
            "macd": indicators.get("macd", 0),
            "macd_signal_val": indicators.get("macd_signal", 0),
            "macd_bullish": indicators.get("macd_bullish", False),
            "momentum_20d": indicators.get("momentum_20d", 0),
            "change_1d": change_1d,
            "volume": volume,
            "turnover": turnover,
            "last_close": last_close,
            "ema20": indicators.get("ema20", 0),
            "ema50": indicators.get("ema50", 0),
            "atr": indicators.get("atr", 0),
            # Stock fundamentals
            "per": metrics.get("per"),
            "pbv": metrics.get("pbv"),
            "roe": metrics.get("roe"),
            "der": metrics.get("der"),
            "npm": metrics.get("npm"),
            # Extended stock fundamentals
            "market_cap": metrics.get("market_cap"),
            "forward_per": metrics.get("forward_per"),
            "ev_ebitda": metrics.get("ev_ebitda"),
            "revenue_growth": metrics.get("revenue_growth"),
            "current_ratio": metrics.get("current_ratio"),
            "week_52_return": metrics.get("week_52_return"),
            # ETF metrics
            "expense_ratio":  metrics.get("expense_ratio"),
            "aum":            metrics.get("aum"),
            "dividend_yield": metrics.get("dividend_yield"),
            "nav":            metrics.get("nav"),
            "category":       metrics.get("category"),
            "price_history": indicators.get("price_history", []),
            "intraday_price_history": _price_history_from_df(intraday_map[ticker]) if intraday_map and ticker in intraday_map and intraday_map[ticker] is not None else [],
            "breakdown": scored["breakdown"],
        }
        rankings.append(entry)

    rankings.sort(key=lambda x: (x["score"], -abs(x["rsi"] - 60)), reverse=True)
    return rankings
