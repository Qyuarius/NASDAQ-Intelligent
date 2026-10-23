"""
correlation.py - Calculate stock-commodity correlation
"""
import pandas as pd
import numpy as np


def calculate_correlations(stock_data: dict, commodity_series: dict) -> dict:
    """
    For each stock, find the highest absolute correlation with any commodity.
    Returns dict: { ticker: { "commodity": name, "correlation": float, "all": {name: corr} } }
    """
    print("[Correlation] Calculating stock-commodity correlations...")
    results = {}

    # Build commodity returns DataFrame
    commodity_returns = {}
    for name, series in commodity_series.items():
        if len(series) > 10:
            commodity_returns[name] = series.pct_change().dropna()

    if not commodity_returns:
        print("  [Warning] No commodity series available for correlation.")
        return {}

    for ticker, df in stock_data.items():
        try:
            close = df["Close"].squeeze()
            stock_returns = close.pct_change().dropna()

            corr_map = {}
            for name, comm_ret in commodity_returns.items():
                # Align on common dates
                aligned = pd.concat([stock_returns, comm_ret], axis=1, join="inner")
                aligned.columns = ["stock", "commodity"]
                if len(aligned) < 10:
                    continue
                corr = aligned.corr().iloc[0, 1]
                corr_map[name] = round(float(corr), 3) if not np.isnan(corr) else 0.0

            if corr_map:
                best_commodity = max(corr_map, key=lambda k: abs(corr_map[k]))
                results[ticker] = {
                    "commodity": best_commodity,
                    "correlation": corr_map[best_commodity],
                    "all": corr_map
                }
            else:
                results[ticker] = {"commodity": "none", "correlation": 0.0, "all": {}}
        except Exception as e:
            print(f"  ✗ {ticker}: Correlation error - {e}")
            results[ticker] = {"commodity": "none", "correlation": 0.0, "all": {}}

    return results
