"""
stock_correlation.py - Pairwise stock-to-stock correlation (price returns).
Computes Pearson correlation of daily returns between all tracked tickers.
Outputs a curated AI-focused network graph for the Correlations page.
"""

import json
import math
import os
from datetime import datetime

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Curated AI companies
# ---------------------------------------------------------------------------

AI_COMPANIES = {
    "NVDA": {"tag": "gpu", "sub": "AI Hardware"},
    "AMD": {"tag": "gpu", "sub": "AI Hardware"},
    "AVGO": {"tag": "chip", "sub": "AI Networking/Custom Silicon"},
    "INTC": {"tag": "chip", "sub": "AI Chips (Gaudi)"},
    "QCOM": {"tag": "chip", "sub": "On-device AI"},
    "MRVL": {"tag": "chip", "sub": "AI Semiconductor"},
    "MU": {"tag": "chip", "sub": "AI Memory/HBM"},
    "AMAT": {"tag": "equip", "sub": "Semiconductor Equipment"},
    "LRCX": {"tag": "equip", "sub": "Semiconductor Equipment"},
    "KLAC": {"tag": "equip", "sub": "Semiconductor Equipment"},
    "MSFT": {"tag": "platform", "sub": "Azure AI / Copilot"},
    "GOOGL": {"tag": "platform", "sub": "Google AI / Gemini"},
    "META": {"tag": "platform", "sub": "Llama Models / AI Research"},
    "AMZN": {"tag": "platform", "sub": "AWS AI / Bedrock"},
    "CRM": {"tag": "platform", "sub": "Einstein AI"},
    "SNOW": {"tag": "platform", "sub": "AI Data Cloud"},
    "PLTR": {"tag": "ai_native", "sub": "Enterprise AI"},
    "ORCL": {"tag": "platform", "sub": "Cloud AI"},
    "NOW": {"tag": "platform", "sub": "Now AI"},
    "ADBE": {"tag": "platform", "sub": "Firefly AI"},
    "IBM": {"tag": "platform", "sub": "Watson AI"},
    "ANET": {"tag": "infra", "sub": "AI Networking"},
    "PANW": {"tag": "security", "sub": "AI Security"},
    "CRWD": {"tag": "security", "sub": "AI Security"},
    "AAPL": {"tag": "platform", "sub": "Apple Intelligence"},
    "TSLA": {"tag": "ai_native", "sub": "Autonomous Driving AI"},
    "WDC": {"tag": "infra", "sub": "AI Storage"},
    "STX": {"tag": "infra", "sub": "AI Storage"},
}

AI_TAG_COLORS = {
    "gpu": "#31d17c",
    "chip": "#00c8ff",
    "equip": "#94a3b8",
    "platform": "#ffd166",
    "ai_native": "#ff5a36",
    "infra": "#a78bfa",
    "security": "#f472b6",
}


# ---------------------------------------------------------------------------
# Core computation
# ---------------------------------------------------------------------------

def compute_stock_correlations(
    all_price_data: dict[str, pd.DataFrame],
    ranking_map: dict,
    min_abs_corr: float = 0.3,
    min_common_days: int = 30,
) -> dict:
    """
    Compute pairwise Pearson correlation of daily close returns.

    Parameters
    ----------
    all_price_data : dict[ticker, DataFrame]  (from SQLite or yfinance)
    ranking_map    : dict[ticker, ranking_entry]  (from pipeline rankings)
    min_abs_corr   : minimum |r| to include an edge
    min_common_days: minimum overlapping trading days to compute correlation

    Returns
    -------
    dict with keys: ai_tickers, nodes, edges, ai_tags, tag_colors
    """

    # 1. Compute daily returns for every ticker
    ticker_returns = {}
    for ticker, df in all_price_data.items():
        try:
            close = df["Close"]
            if hasattr(close, "ndim") and close.ndim > 1:
                close = close.iloc[:, 0]
            returns = close.pct_change().dropna()
            if len(returns) >= min_common_days:
                ticker_returns[ticker] = returns
        except Exception:
            continue

    # 2. Determine which AI tickers are available
    ai_available = [t for t in AI_COMPANIES if t in ticker_returns]
    ai_set = set(ai_available)

    # 3. Compute correlations for the AI network
    #    - AI-to-AI (always)
    #    - AI-to-non-AI (only if strong enough)
    target_tickers = set(ai_available) | set(ticker_returns.keys())
    edges = []
    computed_pairs = set()

    for ticker_a in ai_available:
        ret_a = ticker_returns[ticker_a]
        for ticker_b in target_tickers:
            if ticker_b == ticker_a:
                continue
            pair = tuple(sorted([ticker_a, ticker_b]))
            if pair in computed_pairs:
                continue

            ret_b = ticker_returns.get(ticker_b)
            if ret_b is None:
                continue

            # Align on common dates
            aligned = pd.concat([ret_a, ret_b], axis=1, join="inner")
            aligned.columns = ["a", "b"]
            if len(aligned) < min_common_days:
                continue

            corr = float(aligned["a"].corr(aligned["b"]))
            if math.isnan(corr):
                continue

            # Only keep edges involving at least one AI company
            is_ai_pair = ticker_a in ai_available and ticker_b in ai_available
            abs_corr = abs(corr)

            if is_ai_pair and abs_corr >= min_abs_corr:
                edges.append({
                    "source": ticker_a,
                    "target": ticker_b,
                    "correlation": round(corr, 4),
                })
                computed_pairs.add(pair)
            elif abs_corr >= 0.5:
                edges.append({
                    "source": ticker_a,
                    "target": ticker_b,
                    "correlation": round(corr, 4),
                })
                computed_pairs.add(pair)

    # 4. Build nodes dict (AI companies + any non-AI that appear in edges)
    connected_tickers = set()
    for e in edges:
        connected_tickers.add(e["source"])
        connected_tickers.add(e["target"])

    nodes = {}
    for ticker in connected_tickers:
        rank_info = ranking_map.get(ticker, {})
        ai_info = AI_COMPANIES.get(ticker, None)
        nodes[ticker] = {
            "name": rank_info.get("name", ticker),
            "sector": rank_info.get("sector", "Unknown"),
            "score": rank_info.get("score", 0),
            "signal": rank_info.get("signal", "HOLD"),
            "is_ai": ticker in ai_set,
            "ai_tag": ai_info["tag"] if ai_info else None,
            "ai_sub": ai_info["sub"] if ai_info else None,
        }

    return {
        "ai_tickers": ai_available,
        "nodes": nodes,
        "edges": edges,
        "ai_tag_colors": AI_TAG_COLORS,
    }


def save_correlation_output(output: dict, output_dir: str):
    """Save correlations.json to the frontend public output directory."""
    path = os.path.join(output_dir, "correlations.json")
    output["generated_at"] = datetime.now().isoformat()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"  Saved correlations.json — {len(output['nodes'])} nodes, {len(output['edges'])} edges")
