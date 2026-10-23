"""
data_cache.py - Caching layer for fetched market data.
All data is stored in a single SQLite database (nvidia_intel.db).
"""
from data.database import (
    load_cached_df as _db_load_df,
    save_cached_df as _db_save_df,
    get_cached_tickers as _db_cached_tickers,
    get_cached_latest_date as _db_latest_date,
    load_cached_fundamentals as _db_load_fund,
    save_cached_fundamentals as _db_save_fund,
    get_cached_fundamental_tickers as _db_fund_tickers,
    load_sector_cache as _db_load_sectors,
    save_sector_cache as _db_save_sectors,
    load_news_cache as _db_load_news,
    save_news_cache as _db_save_news,
    get_conn,
)


def ensure_cache_dir():
    get_conn()  # trigger DB init


# ---------------------------------------------------------------------------
# DataFrame cache (daily / intraday / commodity series)
# ---------------------------------------------------------------------------

def load_cached_df(ticker: str, data_type: str = "daily"):
    return _db_load_df(ticker, data_type)


def save_cached_df(df, ticker: str, data_type: str = "daily"):
    _db_save_df(df, ticker, data_type)


def get_cached_tickers(data_type: str = "daily") -> set:
    return _db_cached_tickers(data_type)


def get_cached_latest_date(ticker: str, data_type: str = "daily"):
    return _db_latest_date(ticker, data_type)


# ---------------------------------------------------------------------------
# Sector / name cache
# ---------------------------------------------------------------------------

def load_sector_cache() -> dict:
    return _db_load_sectors()


def save_sector_cache(data: dict):
    _db_save_sectors(data)


# ---------------------------------------------------------------------------
# Fundamental data cache
# ---------------------------------------------------------------------------

def load_cached_fundamentals() -> dict:
    return _db_load_fund()


def save_cached_fundamentals(data: dict):
    _db_save_fund(data)


def get_cached_fundamental_tickers() -> set:
    return _db_fund_tickers()


# ---------------------------------------------------------------------------
# News data cache (time-to-live handled in DB)
# ---------------------------------------------------------------------------

def load_news_cache() -> dict | None:
    return _db_load_news()


def save_news_cache(articles, by_ticker, ticker_news):
    _db_save_news(articles, by_ticker, ticker_news)
