"""
news_fetcher.py - Fetch news for stocks and broad market using yfinance
"""

import hashlib
from datetime import datetime, timezone, timedelta

import yfinance as yf

from data.fetcher import STOCK_TICKERS, ETF_TICKERS

try:
    from yfinance_config import configure_yfinance_cache
except ModuleNotFoundError:
    configure_yfinance_cache = None

if configure_yfinance_cache:
    configure_yfinance_cache(yf)

# Broad-market tickers used to capture general economic headlines
MARKET_NEWS_TICKERS = [
    "SPY",  # S&P 500
    "QQQ",  # Nasdaq
    "IWM",  # Russell 2000
    "GLD",  # Gold
    "USO",  # Oil
    "TLT",  # Bonds
    "DXY",  # Dollar Index (via yf)
]

# Cap news fetch to top-N stocks to avoid yfinance rate limiting.
MAX_NEWS_TICKERS = 600

MAX_ARTICLES_PER_TICKER = 8
MAX_TOTAL_ARTICLES = 800


def _uuid(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:12]


def _extract_article(item: dict) -> dict | None:
    """Normalize a yfinance news item into our standard shape."""
    content = item.get("content") or item
    if not isinstance(content, dict):
        return None

    title = content.get("title", "")
    if not title:
        return None

    summary = content.get("summary") or content.get("description", "")

    provider = content.get("provider", {})
    if isinstance(provider, dict):
        publisher = provider.get("displayName", "Yahoo Finance")
    else:
        publisher = str(provider)

    url = None
    click = content.get("clickThroughUrl") or {}
    if isinstance(click, dict):
        url = click.get("url")
    if not url:
        canon = content.get("canonicalUrl") or {}
        url = canon.get("url") if isinstance(canon, dict) else None
    if not url:
        url = content.get("previewUrl", "")

    pub_date_str = content.get("pubDate", "")
    published_at = None
    if pub_date_str:
        try:
            dt = datetime.fromisoformat(pub_date_str.replace("Z", "+00:00"))
            published_at = dt.isoformat()
        except Exception:
            published_at = pub_date_str

    return {
        "uuid": _uuid(url or title),
        "title": title,
        "link": url or "",
        "publisher": publisher,
        "summary": summary,
        "published_at": published_at,
    }


def fetch_ticker_news(tickers: list[str]) -> list[dict]:
    articles = []
    seen_urls = set()

    for ticker in tickers:
        try:
            t = yf.Ticker(ticker)
            news = getattr(t, "news", None) or []
        except Exception:
            news = []

        for item in news[:MAX_ARTICLES_PER_TICKER]:
            article = _extract_article(item)
            if not article:
                continue

            link = article["link"]
            if link and link in seen_urls:
                continue
            if link:
                seen_urls.add(link)

            article["related_tickers"] = [ticker]
            articles.append(article)

    return articles


def deduplicate_and_merge(articles: list[dict]) -> list[dict]:
    by_uuid = {}
    for a in articles:
        uid = a["uuid"]
        if uid in by_uuid:
            existing = by_uuid[uid]
            for t in a["related_tickers"]:
                if t not in existing["related_tickers"]:
                    existing["related_tickers"].append(t)
        else:
            by_uuid[uid] = {**a, "related_tickers": list(a["related_tickers"])}
    return list(by_uuid.values())


def fetch_all_news() -> list[dict]:
    # Use a capped set: top-N stocks + all ETFs + broad-market tickers
    news_tickers = list(dict.fromkeys(STOCK_TICKERS[:MAX_NEWS_TICKERS] + ETF_TICKERS + MARKET_NEWS_TICKERS))
    print(f"[NewsFetcher] Fetching news for {len(news_tickers)} tickers (stocks: top-{MAX_NEWS_TICKERS}, ETFs: {len(ETF_TICKERS)}, market: {len(MARKET_NEWS_TICKERS)})...")
    ticker_articles = fetch_ticker_news(news_tickers)

    # Market tickers already included above
    all_articles = deduplicate_and_merge(ticker_articles)
    all_articles.sort(key=lambda a: a.get("published_at") or "", reverse=True)

    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    before = len(all_articles)
    all_articles = [
        a for a in all_articles
        if a.get("published_at") and datetime.fromisoformat(a["published_at"]) >= cutoff
    ]
    print(f"[NewsFetcher] Filtered {before} → {len(all_articles)} articles (last 7 days)")

    if len(all_articles) > MAX_TOTAL_ARTICLES:
        all_articles = all_articles[:MAX_TOTAL_ARTICLES]

    print(f"[NewsFetcher] Total unique articles: {len(all_articles)}")
    return all_articles
