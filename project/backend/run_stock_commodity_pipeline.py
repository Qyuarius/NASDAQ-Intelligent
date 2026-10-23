import json
import math
import os
import sys
from datetime import datetime
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, os.path.dirname(__file__))

try:
    from yfinance_config import configure_yfinance_cache
except ModuleNotFoundError:
    configure_yfinance_cache = None

import yfinance as yf

if configure_yfinance_cache:
    configure_yfinance_cache(yf)

from data.fetcher import (
    fetch_all_data, fetch_all_data_intraday,
    fetch_commodity_data, fetch_commodity_series,
    fetch_fundamental_data_batch,
)
from data.data_cache import ensure_cache_dir, load_sector_cache, save_sector_cache
from features.indicators import calculate_indicators
from features.correlation import calculate_correlations
from features.stock_correlation import compute_stock_correlations, save_correlation_output
from engine.scorer import rank_stocks
from stock_sectors import classify_sector

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "output")


def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def clean_nan(obj):
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    return obj


def save_json(data, filename):
    path = os.path.join(OUTPUT_DIR, filename)
    data = clean_nan(data)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  ✓ Saved: {path}")


def load_json(filename):
    path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    print("=" * 60)
    print("  STOCK + COMMODITY DATA PIPELINE")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    ensure_output_dir()
    ensure_cache_dir()

    # --- Step 1: Fetch data (stocks + ETFs) ---
    print("\n[Step 1] Fetching market data...")
    daily_stock_data   = fetch_all_data(period="5y", interval="1d")
    intraday_stock_data = fetch_all_data_intraday(period="5d", interval="1m")
    commodity_prices   = fetch_commodity_data()
    commodity_series   = fetch_commodity_series(period="3mo", interval="1d")

    if not daily_stock_data:
        print("[ERROR] No stock data fetched. Check your internet connection.")
        sys.exit(1)

    # --- Step 1.5: Fetch fundamental data ---
    print("\n[Step 1.5] Fetching fundamental data...")
    fundamentals_map = fetch_fundamental_data_batch(list(daily_stock_data.keys()))

    # --- Step 2: Calculate indicators ---
    print("\n[Step 2] Calculating technical indicators...")
    indicators_map = {}
    skipped = 0
    for ticker, df in daily_stock_data.items():
        try:
            if len(df) < 15:
                skipped += 1
                continue
            indicators_map[ticker] = calculate_indicators(df)
        except Exception:
            skipped += 1
    print(f"  Calculated indicators for {len(indicators_map)} tickers ({skipped} skipped)")

    # --- Step 3: Calculate correlations ---
    print("\n[Step 3] Calculating correlations...")
    correlations_map = {}
    if commodity_series:
        correlations_map = calculate_correlations(daily_stock_data, commodity_series)
        print(f"  Correlations computed for {len(correlations_map)} tickers")
    else:
        print("  [Warning] Skipping correlations - no commodity series data.")

    # --- Step 4: Score and rank ---
    print("\n[Step 4] Scoring and ranking...")
    rankings = rank_stocks(daily_stock_data, indicators_map, intraday_stock_data, fundamentals_map)

    for entry in rankings:
        t = entry["ticker"]
        corr = correlations_map.get(t)
        if corr:
            entry["best_commodity"] = corr.get("commodity", "")
            entry["correlation"] = corr.get("correlation", 0)

    # Fetch sector/industry
    print("[Pipeline] Fetching sector data from yfinance...")
    sector_cache = load_sector_cache()
    for entry in rankings:
        t = entry["ticker"]
        cached = sector_cache.get(t)
        if cached and cached.get("sector"):
            entry["sector"] = cached["sector"]
            entry["name"] = cached.get("name", "")
            continue
        try:
            info = yf.Ticker(t).info
            sector = info.get("sector") or info.get("industry") or None
            if sector:
                entry["sector"] = sector
            name = info.get("longName") or info.get("shortName") or None
            if name:
                entry["name"] = name
            sector_cache[t] = {"sector": sector, "name": name}
            print(f"  ✓ {t}: {sector or 'no sector'} | {name or 'no name'}")
        except Exception as e:
            print(f"  ✗ {t}: {e}")
    save_sector_cache(sector_cache)

    # Apply specific sub-sector classification (semiconductor, software, etc.)
    # Overrides the broad yfinance sector where a specific mapping exists.
    print("[Pipeline] Applying specific sector classification...")
    reclassified = 0
    for entry in rankings:
        t = entry["ticker"]
        broad = entry.get("sector")
        specific = classify_sector(t, fallback=broad)
        if specific and specific != broad:
            entry["sector_broad"] = broad
            entry["sector"] = specific
            reclassified += 1
    print(f"  ✓ Reclassified {reclassified}/{len(rankings)} tickers into specific sectors")

    # --- Step 5: Save outputs ---
    print("\n[Step 5] Saving output files...")

    output_ranking = {
        "generated_at": datetime.now().isoformat(),
        "total_stocks": len(rankings),
        "rankings": rankings
    }
    save_json(output_ranking, "ranking.json")

    output_commodity = {
        "generated_at": datetime.now().isoformat(),
        "prices": commodity_prices
    }
    save_json(output_commodity, "commodity.json")

    commodity_series_output = {}
    for name, series in commodity_series.items():
        if series is not None and len(series) > 0:
            commodity_series_output[name] = [
                {"date": str(idx.date()), "close": round(float(val), 2)}
                for idx, val in series.items()
            ]
    save_json(commodity_series_output, "commodity_series.json")

    # --- Step 6: Stock-to-stock correlations (AI network) ---
    print("\n[Step 6] Computing stock-to-stock correlations (AI network)...")
    try:
        ranking_map = {r["ticker"]: r for r in rankings}
        stock_corr_output = compute_stock_correlations(
            daily_stock_data,
            ranking_map,
            min_abs_corr=0.3,
            min_common_days=30,
        )
        save_correlation_output(stock_corr_output, OUTPUT_DIR)
    except Exception as e:
        print(f"  [Warning] Stock correlation step failed: {e}")

    from data.database import DB_PATH
    import sqlite3
    if os.path.exists(DB_PATH):
        db_size = os.path.getsize(DB_PATH) / 1024 / 1024
        conn = sqlite3.connect(DB_PATH)
        total_rows = conn.execute("SELECT COUNT(*) FROM price_data").fetchone()[0]
        conn.close()
        print(f"\n  DB: {db_size:.1f} MB — {total_rows:,} price rows")

    # --- Summary ---
    print("\n" + "=" * 60)
    print("  STOCK + COMMODITY PIPELINE COMPLETE")
    print(f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Assets ranked: {len(rankings)}")
    print("\n  TOP PICKS:")
    for i, r in enumerate(rankings[:3], 1):
        print(f"    {i}. {r['stock']} — Score: {r['score']}/15 — Signal: {r['signal']}")
    print("=" * 60)
    print(f"\n  Next: run_news_pipeline.py\n")


if __name__ == "__main__":
    main()
