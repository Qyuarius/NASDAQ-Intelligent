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

from data.data_cache import load_news_cache, save_news_cache
from data.news_fetcher import fetch_all_news
from engine.news_processor import process_articles

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
    print("  NEWS INTELLIGENCE PIPELINE")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    ensure_output_dir()

    # --- Step 1: Load rankings ---
    print("\n[Step 1] Loading existing rankings...")
    ranking_data = load_json("ranking.json")
    if ranking_data is None:
        print("[ERROR] ranking.json not found. Run run_stock_commodity_pipeline.py first.")
        sys.exit(1)

    rankings = ranking_data.get("rankings", [])
    if not rankings:
        print("[ERROR] No rankings found in ranking.json.")
        sys.exit(1)
    print(f"  Loaded {len(rankings)} ranked assets")

    # --- Step 2: Fetch and analyze news ---
    print("\n[Step 2] Fetching and analyzing news...")
    news_articles_count = 0
    articles = []
    ticker_news = {}
    by_ticker = {}

    try:
        cached_news = load_news_cache()
        if cached_news:
            ticker_news = cached_news["ticker_news"]
            articles = cached_news["articles"]
            by_ticker = cached_news["by_ticker"]
            print(f"  Loaded {len(articles)} articles from cache")
        else:
            articles = fetch_all_news()
            news_data = process_articles(articles)
            by_ticker = news_data["by_ticker"]
            articles_raw = news_data["articles"]

            articles_by_uuid = {a["uuid"]: a for a in articles_raw}
            ticker_news = {}
            for ticker, uuids in by_ticker.items():
                scores = []
                signals = []
                for uid in uuids:
                    a = articles_by_uuid.get(uid)
                    if not a or a.get("score") is None:
                        continue
                    scores.append(a["score"])
                    signals.append(a["signal"])
                if not scores:
                    continue
                avg_score = sum(scores) / len(scores)
                bullish = signals.count("BULLISH")
                bearish = signals.count("BEARISH")
                ticker_news[ticker] = {
                    "news_score": round(avg_score, 2),
                    "news_signal": "BULLISH" if avg_score > 0.5 else "BEARISH" if avg_score < -0.5 else "NEUTRAL",
                    "news_articles_count": len(uuids),
                    "news_bullish_count": bullish,
                    "news_bearish_count": bearish,
                }

            save_news_cache(articles_raw, by_ticker, ticker_news)
            articles = articles_raw

        # --- Step 3: Inject news into rankings ---
        print("\n[Step 3] Injecting news data into rankings...")

        # Pass 1: Find max absolute news_score for normalization to ±5
        news_scores_abs = []
        for entry in rankings:
            ns = ticker_news.get(entry["ticker"])
            if ns:
                news_scores_abs.append(abs(ns["news_score"]))
        max_abs_news = max(news_scores_abs) if news_scores_abs else 1.0
        if max_abs_news <= 0:
            max_abs_news = 1.0
        print(f"  Max |news_score| = {max_abs_news:.2f} → normalizing to ±5 points")

        # Pass 2: Normalize and inject
        injected = 0
        for entry in rankings:
            t = entry["ticker"]
            ns = ticker_news.get(t)
            if not ns:
                base = entry.get("technical_score", 0) + entry.get("fundamental_score", 0)
                entry["score"] = round(max(0.0, min(15.0, float(base))), 2)
                entry["signal"] = "BUY" if entry["score"] >= 7 else "HOLD" if entry["score"] >= 4 else "SELL"
                entry["news_adjustment"] = 0.0
                entry.pop("news_score", None)
                entry.pop("news_signal", None)
                entry.pop("news_articles_count", None)
                entry.pop("news_bullish_count", None)
                entry.pop("news_bearish_count", None)
                entry.pop("news", None)
                if "breakdown" in entry and isinstance(entry["breakdown"], dict):
                    entry["breakdown"].pop("news", None)
                continue
            entry["news_score"] = ns["news_score"]
            entry["news_signal"] = ns["news_signal"]
            entry["news_articles_count"] = ns["news_articles_count"]
            entry["news_bullish_count"] = ns["news_bullish_count"]
            entry["news_bearish_count"] = ns["news_bearish_count"]
            entry["news"] = ns["news_score"]

            # Normalize news_score proportionally to ±5 points
            normalized_news = round((ns["news_score"] / max_abs_news) * 5, 2)
            entry["score"] = round(max(0.0, min(15.0, entry["score"] - entry.get("news_adjustment", 0.0) + normalized_news)), 2)
            entry["news_adjustment"] = normalized_news

            # Re-evaluate signal: max score is now 15
            entry["signal"] = "BUY" if entry["score"] >= 10 else "HOLD" if entry["score"] >= 6 else "SELL"

            if "breakdown" in entry and isinstance(entry["breakdown"], dict):
                entry["breakdown"]["news"] = {
                    "points": min(round(abs(normalized_news), 1), 5),
                    "note": f"{ns['news_signal']} · {ns['news_articles_count']} articles ({ns['news_bullish_count']}↑ {ns['news_bearish_count']}↓)",
                }
            injected += 1

        # Re-sort rankings based on updated, news-adjusted scores
        rankings.sort(key=lambda x: (x["score"], -abs(x["rsi"] - 60)), reverse=True)

        news_output = {
            "generated_at": datetime.now().isoformat(),
            "total_articles": len(articles),
            "by_ticker": by_ticker,
            "articles": articles,
        }
        save_json(news_output, "news.json")
        news_articles_count = len(articles)
        print(f"  Injected news scores into {injected} ranking entries, re-sorted rankings")

    except Exception as e:
        import traceback
        print(f"  [Warning] News pipeline error: {e}")
        traceback.print_exc()

    # --- Step 4: Re-save ranking.json ---
    ranking_data["rankings"] = rankings
    save_json(ranking_data, "ranking.json")

    # --- Summary ---
    print("\n" + "=" * 60)
    print("  NEWS PIPELINE COMPLETE")
    print(f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    if news_articles_count:
        print(f"  News articles analyzed: {news_articles_count}")
    print("=" * 60)
    print(f"\n  Pipeline complete.\n")


if __name__ == "__main__":
    main()
