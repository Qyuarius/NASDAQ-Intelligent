"""
news_processor.py - Run news articles through the rule-based signal engine
==========================================================================
Analysis: Rule-based signal_engine (entity detection, sector rules)
"""

from engine.signal_engine import analyze as rule_based_analyze


def process_articles(articles: list[dict]) -> dict:
    total = len(articles)
    print(f"[NewsProcessor] Processing {total} articles via rule-based engine...")

    by_ticker: dict[str, list[str]] = {}
    enriched: list[dict] = []

    for i, article in enumerate(articles, 1):
        text = f"{article['title']}. {article['summary']}".strip()
        if not text:
            continue

        # --- Rule-based analysis ---
        try:
            rule_result = rule_based_analyze(text)
        except Exception as e:
            print(f"  [!] Rule-based failed for article {article['uuid']}: {e}")
            rule_result = {
                "signal": "NEUTRAL", "score": 0.0, "confidence": 0,
                "stocks": [], "sectors": [], "triggers": [],
            }

        existing_tickers = {s['ticker'] for s in rule_result.get('stocks', [])}
        for t in article.get('related_tickers', []):
            if t and t not in existing_tickers:
                rule_result['stocks'].append({
                    'ticker': t,
                    'name': t,
                    'signal': 'NEUTRAL',
                    'score': 0.0,
                    'reasons': ['Related ticker from yfinance'],
                    'source': 'yfinance',
                })

        article_with_signal = {
            **article,
            "signal": rule_result.get("signal", "NEUTRAL"),
            "score": rule_result.get("score", 0.0),
            "confidence": rule_result.get("confidence", 0),
            "triggers": rule_result.get("triggers", []),
            "sectors": rule_result.get("sectors", []),
            "stocks": rule_result.get("stocks", []),
            "analysis_source": "rule_based",
        }
        enriched.append(article_with_signal)

        # --- Index by tickers ---
        for stock in rule_result.get("stocks", []):
            t = stock.get("ticker")
            if not t:
                continue
            if t not in by_ticker:
                by_ticker[t] = []
            by_ticker[t].append(article_with_signal["uuid"])

        # yfinance related_tickers
        for t in article.get("related_tickers", []):
            if not t:
                continue
            if t not in by_ticker:
                by_ticker[t] = []
            if article_with_signal["uuid"] not in by_ticker[t]:
                by_ticker[t].append(article_with_signal["uuid"])

        # Progress logging every 25 articles
        if i % 25 == 0 or i == total:
            print(f"  [{i}/{total}] processed")

    print(
        f"[NewsProcessor] Done. {len(enriched)} articles enriched, "
        f"{len(by_ticker)} tickers indexed."
    )

    return {
        "articles": enriched,
        "by_ticker": by_ticker,
    }
