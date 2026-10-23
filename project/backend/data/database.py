"""
database.py - SQLite caching layer for all market data.
Replaces per-ticker Parquet files and JSON blobs with a single DB file.
"""
import json
import os
import sqlite3
from datetime import datetime, timedelta

import pandas as pd

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "nasdaq_intel.db")

# ---------------------------------------------------------------------------
# Connection helpers
# ---------------------------------------------------------------------------

_conn: sqlite3.Connection | None = None


def get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(DB_PATH, timeout=10)
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA synchronous=NORMAL")
        _conn.row_factory = sqlite3.Row
        _init_schema(_conn)
    return _conn


def close_conn():
    global _conn
    if _conn is not None:
        _conn.close()
        _conn = None


def _init_schema(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS price_data (
            ticker    TEXT    NOT NULL,
            data_type TEXT    NOT NULL,
            timestamp TEXT    NOT NULL,
            open      REAL,
            high      REAL,
            low       REAL,
            close     REAL,
            volume    INTEGER,
            PRIMARY KEY (ticker, data_type, timestamp)
        );

        CREATE INDEX IF NOT EXISTS idx_price_ticker_type
            ON price_data(ticker, data_type);

        CREATE TABLE IF NOT EXISTS fundamentals (
            ticker     TEXT PRIMARY KEY,
            data       TEXT,
            cached_at  TEXT
        );

        CREATE TABLE IF NOT EXISTS ticker_meta (
            ticker     TEXT PRIMARY KEY,
            name       TEXT,
            sector     TEXT,
            asset_type TEXT,
            cached_at  TEXT
        );

        CREATE TABLE IF NOT EXISTS news_articles (
            uuid         TEXT PRIMARY KEY,
            title        TEXT,
            summary      TEXT,
            publisher    TEXT,
            url          TEXT,
            published_at TEXT,
            score        REAL,
            signal       TEXT,
            confidence   REAL,
            triggers     TEXT,
            sectors      TEXT,
            stocks       TEXT,
            cached_at    TEXT
        );

        CREATE TABLE IF NOT EXISTS news_ticker (
            uuid    TEXT NOT NULL,
            ticker  TEXT NOT NULL,
            PRIMARY KEY (uuid, ticker)
        );

        CREATE INDEX IF NOT EXISTS idx_news_ticker
            ON news_ticker(ticker);

        CREATE TABLE IF NOT EXISTS ticker_news (
            ticker         TEXT PRIMARY KEY,
            avg_score      REAL,
            signal         TEXT,
            articles_count INTEGER,
            bullish_count  INTEGER,
            bearish_count  INTEGER,
            cached_at      TEXT
        );

        CREATE TABLE IF NOT EXISTS news_meta (
            key   TEXT PRIMARY KEY,
            value TEXT
        );
    """)


# ---------------------------------------------------------------------------
# Price Data (replaces Parquet per-ticker files)
# ---------------------------------------------------------------------------

def load_cached_df(ticker: str, data_type: str = "daily") -> pd.DataFrame | None:
    conn = get_conn()
    rows = conn.execute(
        "SELECT timestamp, open, high, low, close, volume "
        "FROM price_data WHERE ticker=? AND data_type=? ORDER BY timestamp",
        (ticker, data_type),
    ).fetchall()
    if not rows:
        return None
    df = pd.DataFrame(
        [dict(r) for r in rows],
        columns=["timestamp", "open", "high", "low", "close", "volume"],
    )
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df.set_index("timestamp", inplace=True)
    df.columns = [c.capitalize() for c in df.columns]
    return df


def save_cached_df(df: pd.DataFrame, ticker: str, data_type: str = "daily"):
    conn = get_conn()
    # Flatten multi-level columns (yfinance returns ('Close', 'AAPL'))
    work = df.copy()
    if hasattr(work.columns, 'levels') and len(work.columns.levels) > 1:
        work.columns = [c[0] for c in work.columns]
    # Normalize column names to lowercase for consistent lookup
    col_map = {c: c.lower() for c in work.columns}
    work.rename(columns=col_map, inplace=True)
    for idx, row in work.iterrows():
        ts = idx.strftime("%Y-%m-%d %H:%M:%S") if hasattr(idx, "strftime") else str(idx)
        conn.execute(
            "INSERT OR REPLACE INTO price_data (ticker, data_type, timestamp, open, high, low, close, volume) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (ticker, data_type, ts,
             float(row.get("open", 0)),
             float(row.get("high", 0)),
             float(row.get("low", 0)),
             float(row.get("close", 0)),
             int(row.get("volume", 0))),
        )
    conn.commit()


def get_cached_tickers(data_type: str = "daily") -> set:
    conn = get_conn()
    rows = conn.execute(
        "SELECT DISTINCT ticker FROM price_data WHERE data_type=?", (data_type,)
    ).fetchall()
    return {r["ticker"] for r in rows}


def get_cached_latest_date(ticker: str, data_type: str = "daily"):
    conn = get_conn()
    row = conn.execute(
        "SELECT MAX(timestamp) as latest FROM price_data WHERE ticker=? AND data_type=?",
        (ticker, data_type),
    ).fetchone()
    if row and row["latest"]:
        return pd.Timestamp(row["latest"])
    return None


# ---------------------------------------------------------------------------
# Fundamentals (replaces fundamentals.json)
# ---------------------------------------------------------------------------

def load_cached_fundamentals() -> dict:
    conn = get_conn()
    rows = conn.execute("SELECT ticker, data FROM fundamentals").fetchall()
    return {r["ticker"]: json.loads(r["data"]) if r["data"] else {} for r in rows}


def save_cached_fundamentals(data: dict):
    conn = get_conn()
    now = datetime.now().isoformat()
    for ticker, metrics in data.items():
        conn.execute(
            "INSERT OR REPLACE INTO fundamentals (ticker, data, cached_at) VALUES (?, ?, ?)",
            (ticker, json.dumps(metrics, ensure_ascii=False), now),
        )
    conn.commit()


def get_cached_fundamental_tickers() -> set:
    conn = get_conn()
    rows = conn.execute("SELECT ticker FROM fundamentals").fetchall()
    return {r["ticker"] for r in rows}


# ---------------------------------------------------------------------------
# Ticker metadata (replaces sector_names.json)
# ---------------------------------------------------------------------------

def load_sector_cache() -> dict:
    conn = get_conn()
    rows = conn.execute("SELECT ticker, name, sector FROM ticker_meta").fetchall()
    return {r["ticker"]: {"name": r["name"], "sector": r["sector"]} for r in rows}


def save_sector_cache(data: dict):
    conn = get_conn()
    now = datetime.now().isoformat()
    for ticker, info in data.items():
        conn.execute(
            "INSERT OR REPLACE INTO ticker_meta (ticker, name, sector, cached_at) "
            "VALUES (?, ?, ?, ?)",
            (ticker, info.get("name"), info.get("sector"), now),
        )
    conn.commit()


# ---------------------------------------------------------------------------
# News cache (replaces news_cache.json)
# ---------------------------------------------------------------------------

NEWS_CACHE_TTL_HOURS = 6


def load_news_cache() -> dict | None:
    conn = get_conn()
    row = conn.execute(
        "SELECT value FROM news_meta WHERE key='cached_at'"
    ).fetchone()
    if not row:
        return None
    try:
        cached_at = datetime.fromisoformat(row["value"])
        age = datetime.now() - cached_at
        if age.total_seconds() > NEWS_CACHE_TTL_HOURS * 3600:
            return None
    except Exception:
        return None

    # Load articles
    article_rows = conn.execute("SELECT * FROM news_articles").fetchall()
    articles = []
    for r in article_rows:
        articles.append({
            "uuid": r["uuid"],
            "title": r["title"],
            "summary": r["summary"],
            "publisher": r["publisher"],
            "link": r["url"],
            "published_at": r["published_at"],
            "score": r["score"],
            "signal": r["signal"],
            "confidence": r["confidence"],
            "triggers": json.loads(r["triggers"]) if r["triggers"] else [],
            "sectors": json.loads(r["sectors"]) if r["sectors"] else [],
            "stocks": json.loads(r["stocks"]) if r["stocks"] else [],
        })

    # Load by_ticker
    ticker_map_rows = conn.execute("SELECT uuid, ticker FROM news_ticker").fetchall()
    by_ticker: dict[str, list[str]] = {}
    for r in ticker_map_rows:
        by_ticker.setdefault(r["ticker"], []).append(r["uuid"])

    # Load ticker_news
    tn_rows = conn.execute("SELECT * FROM ticker_news").fetchall()
    ticker_news = {}
    for r in tn_rows:
        ticker_news[r["ticker"]] = {
            "news_score": r["avg_score"],
            "news_signal": r["signal"],
            "news_articles_count": r["articles_count"],
            "news_bullish_count": r["bullish_count"],
            "news_bearish_count": r["bearish_count"],
        }

    return {"articles": articles, "by_ticker": by_ticker, "ticker_news": ticker_news}


def save_news_cache(articles: list, by_ticker: dict, ticker_news: dict):
    conn = get_conn()
    now = datetime.now().isoformat()

    conn.execute("DELETE FROM news_articles")
    conn.execute("DELETE FROM news_ticker")
    conn.execute("DELETE FROM ticker_news")
    conn.execute("DELETE FROM news_meta")

    for article in articles:
        conn.execute(
            "INSERT OR REPLACE INTO news_articles "
            "(uuid, title, summary, publisher, url, published_at, score, signal, "
            "confidence, triggers, sectors, stocks, cached_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                article.get("uuid"),
                article.get("title"),
                article.get("summary") or article.get("description", ""),
                article.get("publisher", ""),
                article.get("link", "") or article.get("url", ""),
                article.get("published_at"),
                article.get("score"),
                article.get("signal"),
                article.get("confidence", 0),
                json.dumps(article.get("triggers", []), ensure_ascii=False),
                json.dumps(article.get("sectors", []), ensure_ascii=False),
                json.dumps(article.get("stocks", []), ensure_ascii=False),
                now,
            ),
        )

    for ticker, uuids in by_ticker.items():
        for uid in uuids:
            conn.execute(
                "INSERT OR IGNORE INTO news_ticker (uuid, ticker) VALUES (?, ?)",
                (uid, ticker),
            )

    for ticker, info in ticker_news.items():
        conn.execute(
            "INSERT OR REPLACE INTO ticker_news "
            "(ticker, avg_score, signal, articles_count, bullish_count, bearish_count, cached_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                ticker,
                info.get("news_score"),
                info.get("news_signal"),
                info.get("news_articles_count", 0),
                info.get("news_bullish_count", 0),
                info.get("news_bearish_count", 0),
                now,
            ),
        )

    conn.execute("INSERT OR REPLACE INTO news_meta (key, value) VALUES ('cached_at', ?)", (now,))
    conn.commit()
