"""
fetcher.py - Fetches stock and commodity data using yfinance
Supports incremental caching — only downloads new data on subsequent runs.
"""
import json
import os
from datetime import datetime, timedelta

import yfinance as yf
import pandas as pd
from features.fundamentals import fetch_fundamental_data
from data.data_cache import (
    load_cached_df,
    save_cached_df,
    get_cached_latest_date,
    get_cached_tickers,
    load_cached_fundamentals,
    save_cached_fundamentals,
    get_cached_fundamental_tickers,
)

try:
    from yfinance_config import configure_yfinance_cache
except ModuleNotFoundError:
    configure_yfinance_cache = None

if configure_yfinance_cache:
    configure_yfinance_cache(yf)

# â”€â”€ Ticker sources â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

US_TICKERS_CACHE = os.path.join(os.path.dirname(__file__), "..", "us_tickers_cache.json")
"""Local source of truth for the US stock ticker list."""

# Maximum number of assets to process. Use a smaller set for stability
# and faster pipeline runs when the full universe is not needed.
MAX_TOTAL_TICKERS = 550
MAX_ETFS = 25
MAX_STOCKS = MAX_TOTAL_TICKERS - MAX_ETFS

# US ETFs â€” broad market, sector, bond, commodity, international
DEFAULT_ETF_TICKERS = [
    # Broad Market
    "SPY","QQQ","VOO","IWM","DIA",
    # Growth & Tech
    "VGT","XLK","SOXX","ARKK","IGV",
    # Dividend & Value
    "VYM","SCHD","VTV","DVY","HDV",
    # Sector
    "XLF","XLE","XLV","XLI","XLP",
    # Bond
    "TLT","BND","AGG","HYG","SHY",
    # Commodity & Gold
    "GLD","SLV","USO","DBA","PDBC",
    # International
    "EEM","VEA","EWJ","FXI","VWO",
]

ETF_TICKERS_FILE   = os.path.join(os.path.dirname(__file__), "..", "etf_tickers.json")

# â”€â”€ US stock ticker list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€




# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ETF + commodity config â€” remains manually curated
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

# Commodity futures
COMMODITY_TICKERS = {
    "oil":    ["CL=F"],
    "coal":   ["KOL=F", "MTF=F"],
    "nickel": ["^SPGSIK"],
    "gold":   ["GC=F"],
    "sp500":  ["^GSPC"],
    "nasdaq": ["^IXIC"],
    "dow":    ["^DJI"],
}

FALLBACK_PRICES = {
    "oil": 82.1,
    "coal": 135.0,
    "nickel": 18200.0,
    "gold": 2340.0,
    "sp500": 5341.0,
    "nasdaq": 17025.0,
    "dow": 39130.0,
}




def load_etf_tickers():
    """Load ETF tickers from file, or fall back to defaults."""
    if os.path.exists(ETF_TICKERS_FILE):
        try:
            with open(ETF_TICKERS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and all(isinstance(item, str) for item in data):
                    return data[:MAX_ETFS]
        except Exception:
            pass
    return DEFAULT_ETF_TICKERS[:MAX_ETFS]


def fetch_us_ticker_list() -> list[str]:
    """Load US stock tickers from us_tickers_cache.json only."""
    if not os.path.exists(US_TICKERS_CACHE):
        print(f"[Fetcher] WARNING: Ticker cache not found: {US_TICKERS_CACHE}")
        return []

    try:
        with open(US_TICKERS_CACHE, "r", encoding="utf-8") as f:
            cached = json.load(f)
    except Exception as e:
        print(f"[Fetcher] WARNING: Failed to read ticker cache: {e}")
        return []

    if not isinstance(cached, list):
        print(f"[Fetcher] WARNING: Ticker cache must be a JSON array: {US_TICKERS_CACHE}")
        return []

    tickers = []
    used = set()
    for item in cached:
        if not isinstance(item, str):
            continue
        symbol = item.strip().upper()
        if not symbol or symbol in used:
            continue
        tickers.append(symbol)
        used.add(symbol)

    print(f"[Fetcher] Loaded {len(tickers)} tickers from {US_TICKERS_CACHE}")
    return tickers


def load_stock_tickers():
    stock_file = os.path.join(os.path.dirname(__file__), "..", "stock_tickers.json")
    if os.path.exists(stock_file):
        try:
            with open(stock_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and all(isinstance(item, str) for item in data):
                    print(f"[Fetcher] Loaded {len(data)} tickers from stock_tickers.json")
                    return data
        except Exception:
            pass
    all_us = fetch_us_ticker_list()
    limited = all_us[:MAX_STOCKS]
    print(f"[Fetcher] Using {len(limited)} of {len(all_us)} cached US stocks (MAX_STOCKS={MAX_STOCKS})")
    return limited


STOCK_TICKERS   = load_stock_tickers()
ETF_TICKERS     = load_etf_tickers()
ETF_TICKERS_SET = set(ETF_TICKERS)                                  # used by scorer to skip fundamentals
ALL_TICKERS     = (STOCK_TICKERS + [t for t in ETF_TICKERS if t not in STOCK_TICKERS])[:MAX_TOTAL_TICKERS]


STOCK_TICKERS_FILE = os.path.join(os.path.dirname(__file__), "..", "stock_tickers.json")


def get_stock_tickers() -> list[str]:
    """Read tickers fresh from disk (never stale)."""
    if os.path.exists(STOCK_TICKERS_FILE):
        try:
            with open(STOCK_TICKERS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and all(isinstance(i, str) for i in data):
                    return data
        except Exception:
            pass
    return list(STOCK_TICKERS)


def save_stock_tickers(tickers: list[str]):
    """Write the ticker list back to stock_tickers.json."""
    cleaned = []
    seen = set()
    for t in tickers:
        sym = t.strip().upper()
        if sym and sym not in seen:
            cleaned.append(sym)
            seen.add(sym)
    with open(STOCK_TICKERS_FILE, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2)


def add_stock_ticker(ticker: str) -> tuple[bool, str]:
    """Add a ticker. Returns (success, message)."""
    sym = ticker.strip().upper()
    if not sym:
        return False, "Ticker cannot be empty"
    current = get_stock_tickers()
    if sym in current:
        return False, f"{sym} already exists in watchlist"
    current.append(sym)
    save_stock_tickers(current)
    return True, f"{sym} added"


def remove_stock_ticker(ticker: str) -> tuple[bool, str]:
    """Remove a ticker. Returns (success, message)."""
    sym = ticker.strip().upper()
    current = get_stock_tickers()
    if sym not in current:
        return False, f"{sym} not found in watchlist"
    current = [t for t in current if t != sym]
    save_stock_tickers(current)
    return True, f"{sym} removed"


def is_etf(ticker: str) -> bool:
    """Return True if the ticker is an ETF."""
    return ticker in ETF_TICKERS_SET


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalize_aliases(aliases):
    return aliases if isinstance(aliases, list) else [aliases]


def _download_close_series(ticker, period="5d", interval="1d"):
    df = yf.download(ticker, period=period, interval=interval, progress=False)
    if df.empty or "Close" not in df:
        return None
    series = df["Close"]
    if isinstance(series, pd.DataFrame):
        series = series.iloc[:, 0]
    series = series.dropna()
    if series.empty:
        return None
    return series


def _resolve_commodity_series(name, period="5d", interval="1d"):
    aliases = _normalize_aliases(COMMODITY_TICKERS.get(name, []))
    if not aliases:
        return None
    for alias in aliases:
        series = _download_close_series(alias, period=period, interval=interval)
        if series is not None:
            return series
    return None


def _download_stock_df(ticker, period="5y", interval="1d"):
    df = yf.download(ticker, period=period, interval=interval, progress=False)
    if df.empty:
        return None
    df.dropna(inplace=True)
    return df if not df.empty else None


def _download_stock_df_incremental(ticker, start_date, interval="1d"):
    """
    Download price data for *ticker* from *start_date* onward.
    Returns None if nothing new is available.
    """
    start_str = start_date.strftime("%Y-%m-%d") if hasattr(start_date, "strftime") else str(start_date)
    df = yf.download(ticker, start=start_str, interval=interval, progress=False)
    if df.empty:
        return None
    df.dropna(inplace=True)
    return df if not df.empty else None


def _has_new_market_data(tickers, interval="1d"):
    """Quick check: if SPY has no new data, skip per-ticker incremental checks."""
    bellwether = "SPY"
    if bellwether in tickers:
        cached = load_cached_df(bellwether, "daily")
        if cached is not None and not cached.empty:
            latest = cached.index[-1]
            if hasattr(latest, "tzinfo") and latest.tzinfo is not None:
                latest = latest.replace(tzinfo=None)
            next_day = latest + timedelta(days=1)
            probe = _download_stock_df_incremental(bellwether, next_day, interval=interval)
            if probe is None or probe.empty:
                return False
            # Probe may return already-cached dates — only consider new if > cached latest
            if hasattr(probe.index, 'tz') and probe.index.tz is not None:
                probe.index = probe.index.tz_localize(None)
            probe = probe[probe.index > latest]
            if probe.empty:
                return False
    return True


def _fetch_tickers_daily(tickers: list, label: str, period="5y", interval="1d") -> dict:
    print(f"[Fetcher] Fetching daily data for {len(tickers)} {label} tickers...")
    today = datetime.now().date()
    try_market_check = True
    market_has_new = True
    stock_data = {}
    for ticker in tickers:
        try:
            cached_df = load_cached_df(ticker, "daily")
            if cached_df is not None and not cached_df.empty:
                latest_date = cached_df.index[-1]
                # Normalize timezone: strip tzinfo for consistent comparison
                if hasattr(latest_date, "tzinfo") and latest_date.tzinfo is not None:
                    latest_date = latest_date.replace(tzinfo=None)
                if hasattr(latest_date, "date") and latest_date.date() >= today:
                    stock_data[ticker] = cached_df
                    continue
                if try_market_check:
                    market_has_new = _has_new_market_data(tickers, interval=interval)
                    try_market_check = False
                if not market_has_new:
                    stock_data[ticker] = cached_df
                    continue
                next_date = latest_date + timedelta(days=1)
                new_df = _download_stock_df_incremental(ticker, next_date, interval=interval)
                if new_df is not None and not new_df.empty:
                    # Normalize new_df index timezone for consistent comparison
                    if hasattr(new_df.index, 'tz') and new_df.index.tz is not None:
                        new_df.index = new_df.index.tz_localize(None)
                    # Flatten MultiIndex columns from yfinance
                    if hasattr(new_df.columns, 'levels') and len(new_df.columns.levels) > 1:
                        new_df.columns = [c[0] for c in new_df.columns]
                    new_df = new_df[new_df.index > latest_date]
                    df = pd.concat([cached_df, new_df])
                    df = df[~df.index.duplicated(keep="last")]
                    df.sort_index(inplace=True)
                else:
                    df = cached_df
            else:
                df = _download_stock_df(ticker, period=period, interval=interval)
            # Final normalization: ensure index is tz-naive
            if df is not None and hasattr(df.index, 'tz') and df.index.tz is not None:
                df.index = df.index.tz_localize(None)

            if df is not None:
                stock_data[ticker] = df
                save_cached_df(df, ticker, "daily")
        except Exception as e:
            print(f"  — {ticker}: Error - {e}")
    print(f"  → {len(stock_data)} tickers loaded")
    return stock_data


def _has_new_intraday(tickers, interval="1m"):
    """Quick bellwether check for intraday data."""
    bellwether = "SPY"
    if bellwether in tickers:
        cached = load_cached_df(bellwether, "intraday")
        if cached is not None and not cached.empty:
            latest = cached.index[-1]
            if hasattr(latest, "tzinfo") and latest.tzinfo is not None:
                latest = latest.replace(tzinfo=None)
            next_ts = latest + timedelta(minutes=1)
            probe = _download_stock_df_incremental(bellwether, next_ts, interval=interval)
            if probe is None or probe.empty:
                return False
            if hasattr(probe.index, 'tz') and probe.index.tz is not None:
                probe.index = probe.index.tz_localize(None)
            probe = probe[probe.index > latest]
            if probe.empty:
                return False
    return True


def _fetch_tickers_intraday(tickers: list, label: str, period="5d", interval="1m") -> dict:
    print(f"[Fetcher] Fetching intraday data for {len(tickers)} {label} tickers...")
    stock_data = {}
    now = datetime.now()
    try_market_check = True
    market_has_new = True
    for ticker in tickers:
        try:
            cached_df = load_cached_df(ticker, "intraday")
            latest_ts = get_cached_latest_date(ticker, "intraday")

            _age = None
            if cached_df is not None and latest_ts is not None:
                lt = latest_ts.replace(tzinfo=None) if hasattr(latest_ts, 'replace') else latest_ts
                _age = (now - lt).total_seconds()

            # If cache is very fresh (< 30 min), skip fully
            if _age is not None and _age < 1800:
                stock_data[ticker] = cached_df
                continue

            # Bellwether check — if SPY has nothing new, skip all
            if try_market_check:
                market_has_new = _has_new_intraday(tickers, interval=interval)
                try_market_check = False
            if not market_has_new:
                stock_data[ticker] = cached_df
                continue

            # If cache is fresh (within 1 day), try incremental update
            if cached_df is not None and latest_ts is not None and _age is not None and _age < 86400:
                # Normalize latest_ts
                if hasattr(latest_ts, "tzinfo") and latest_ts.tzinfo is not None:
                    latest_ts = latest_ts.replace(tzinfo=None)
                next_ts = latest_ts + timedelta(minutes=1)
                new_df = _download_stock_df_incremental(ticker, next_ts, interval=interval)
                if new_df is not None and not new_df.empty:
                    if hasattr(new_df.index, 'tz') and new_df.index.tz is not None:
                        new_df.index = new_df.index.tz_localize(None)
                    new_df = new_df[new_df.index > latest_ts]
                    df = pd.concat([cached_df, new_df])
                    df = df[~df.index.duplicated(keep="last")]
                    df.sort_index(inplace=True)
                else:
                    df = cached_df
            else:
                # Full fetch with fallback logic
                df = _download_stock_df(ticker, period=period, interval=interval)
                if df is None or len(df) < 10:
                    df = _download_stock_df(ticker, period="5d", interval="1h")
                if df is None or len(df) < 5:
                    df = _download_stock_df(ticker, period="5y", interval="1d")

            # Final normalization: ensure index is tz-naive
            if df is not None and hasattr(df.index, 'tz') and df.index.tz is not None:
                df.index = df.index.tz_localize(None)

            if df is not None:
                stock_data[ticker] = df
                save_cached_df(df, ticker, "intraday")
        except Exception as e:
            print(f"  — {ticker}: Error - {e}")
    print(f"  → {len(stock_data)} tickers loaded")
    return stock_data


# ---------------------------------------------------------------------------
# Public fetch functions â€” stocks only
# ---------------------------------------------------------------------------

def fetch_stock_data(period="5y", interval="1d") -> dict:
    """Returns daily OHLCV data for US stocks."""
    return _fetch_tickers_daily(STOCK_TICKERS, "stocks", period=period, interval=interval)


def fetch_stock_data_intraday(period="5d", interval="1m") -> dict:
    """Returns intraday OHLCV data for US stocks."""
    return _fetch_tickers_intraday(STOCK_TICKERS, "stocks", period=period, interval=interval)


# ---------------------------------------------------------------------------
# Public fetch functions â€” ETFs only
# ---------------------------------------------------------------------------

def fetch_etf_data(period="5y", interval="1d") -> dict:
    """Returns daily OHLCV data for US ETFs."""
    return _fetch_tickers_daily(ETF_TICKERS, "ETFs", period=period, interval=interval)


def fetch_etf_data_intraday(period="5d", interval="1m") -> dict:
    """Returns intraday OHLCV data for US ETFs."""
    return _fetch_tickers_intraday(ETF_TICKERS, "ETFs", period=period, interval=interval)


# ---------------------------------------------------------------------------
# Public fetch functions â€” stocks + ETFs combined (default for pipeline)
# ---------------------------------------------------------------------------

def fetch_all_data(period="5y", interval="1d") -> dict:
    """Returns daily OHLCV data for all stocks + ETFs."""
    return _fetch_tickers_daily(ALL_TICKERS, "stocks+ETFs", period=period, interval=interval)


def fetch_all_data_intraday(period="5d", interval="1m") -> dict:
    """Returns intraday OHLCV data for all stocks + ETFs."""
    return _fetch_tickers_intraday(ALL_TICKERS, "stocks+ETFs", period=period, interval=interval)


# ---------------------------------------------------------------------------
# Commodity functions
# ---------------------------------------------------------------------------

def _fetch_ticker_prices(ticker_map: dict, label: str) -> dict:
    """Fetch prices for a dict of name→[aliases], return {name: {price, change_pct}}."""
    prices = {}
    for name in ticker_map:
        try:
            series = _resolve_commodity_series(name, period="5d", interval="1d")
            if series is not None and len(series) >= 2:
                current_price = float(series.iloc[-1])
                previous_price = float(series.iloc[-2])
                change_pct = ((current_price - previous_price) / previous_price * 100) if previous_price != 0 else 0
                prices[name] = {
                    "price": round(current_price, 2),
                    "change_pct": round(change_pct, 2),
                }
                print(f"  \" {name}: {current_price} ({change_pct:+.2f}%)")
            elif series is not None and len(series) == 1:
                current_price = float(series.iloc[-1])
                prices[name] = {"price": round(current_price, 2), "change_pct": 0.0}
                print(f"  \" {name}: {current_price} (no previous data)")
            else:
                fallback_price = FALLBACK_PRICES.get(name, 0)
                prices[name] = {"price": fallback_price, "change_pct": 0.0}
                print(f"  — {name}: No valid ticker found, using fallback {fallback_price}")
        except Exception as e:
            fallback_price = FALLBACK_PRICES.get(name, 0)
            prices[name] = {"price": fallback_price, "change_pct": 0.0}
            print(f"  — {name}: Error ({e}), using fallback {fallback_price}")
    return prices

def fetch_commodity_data() -> dict:
    """Returns dict: { commodity_name: { "price": float, "change_pct": float } }"""
    print("[Fetcher] Fetching commodity & index prices...")
    return _fetch_ticker_prices(COMMODITY_TICKERS, "commodities/indices")


def _to_series(obj):
    """Normalize a Series or single-close-column DataFrame to a pd.Series."""
    if isinstance(obj, pd.Series):
        return obj
    if isinstance(obj, pd.DataFrame):
        if "Close" in obj:
            col = obj["Close"]
            if isinstance(col, pd.DataFrame):
                col = col.iloc[:, 0]
            return col
        return obj.iloc[:, 0]
    return obj


def _save_series_cache(series, commodity_name):
    """Save a pd.Series as a parquet DataFrame for caching."""
    save_cached_df(series.to_frame(name="Close"), f"commodity_{commodity_name}", "daily")


def fetch_commodity_series(period="3mo", interval="1d") -> dict:
    """Returns dict: { commodity_name: pd.Series of daily Close prices }"""
    print("[Fetcher] Fetching commodity price series for correlation...")
    return _fetch_series_batch(COMMODITY_TICKERS, period, interval)



def _fetch_series_batch(ticker_map: dict, period="3mo", interval="1d") -> dict:
    result = {}
    for name in ticker_map:
        try:
            cached = load_cached_df(f"commodity_{name}", "daily")
            cached_series = _to_series(cached) if cached is not None else None

            if cached_series is not None and not cached_series.empty:
                latest_date = cached_series.index[-1]
                next_date = latest_date + timedelta(days=1)
                aliases = _normalize_aliases(ticker_map.get(name, []))
                new_series = None
                for alias in aliases:
                    nd = yf.download(alias, start=next_date.strftime("%Y-%m-%d"), interval=interval, progress=False)
                    if nd is not None and not nd.empty and "Close" in nd:
                        new_series = _to_series(nd["Close"])
                        break
                if new_series is not None and not new_series.empty:
                    new_series = new_series[new_series.index > latest_date]
                    if not new_series.empty:
                        series = pd.concat([cached_series, new_series])
                        series = series[~series.index.duplicated(keep="last")]
                        series.sort_index(inplace=True)
                        print(f"  “ {name}: {len(cached_series)} cached + {len(new_series)} new = {len(series)} rows")
                    else:
                        series = cached_series
                        print(f"  “ {name}: {len(series)} rows (from cache, no new data)")
                else:
                    series = cached_series
                    print(f"  “ {name}: {len(series)} rows (from cache, no new data)")
            else:
                series = _resolve_commodity_series(name, period=period, interval=interval)
                if series is not None:
                    print(f"  “ {name}: {len(series)} rows (fresh download)")
                else:
                    print(f"  — {name}: No valid series available")

            if series is not None and len(series) > 0:
                result[name] = series
                _save_series_cache(series, name)
        except Exception as e:
            print(f"  — {name} series: {e}")
    return result


# ---------------------------------------------------------------------------
# Fundamental / ETF metric data batch
# ---------------------------------------------------------------------------

def fetch_fundamental_data_batch(tickers: list) -> dict:
    """
    Returns dict per ticker:
    - Stocks : { "per", "pbv", "roe", "der", "npm" }
    - ETFs   : { "per":None, ..., "expense_ratio", "aum", "dividend_yield", "nav", "category" }
    Uses cached fundamentals (JSON) — only fetches tickers not yet cached.
    """
    from features.fundamentals import fetch_etf_data as _fetch_etf_metrics

    cached_all = load_cached_fundamentals()
    cached_tickers = set(cached_all.keys())

    print(f"[Fetcher] Fetching fundamental/ETF data for {len(tickers)} tickers...")
    fundamentals_data = dict(cached_all)  # start from cache

    to_fetch = [t for t in tickers if t not in cached_tickers]
    if not to_fetch:
        print(f"  All {len(tickers)} tickers loaded from cache.")
        return fundamentals_data

    print(f"  {len(to_fetch)} tickers need fresh fetch (others from cache)...")
    for ticker in to_fetch:
        if is_etf(ticker):
            try:
                etf_metrics = _fetch_etf_metrics(ticker)
                fundamentals_data[ticker] = {
                    "per": None, "pbv": None, "roe": None, "der": None, "npm": None,
                    **etf_metrics,
                }
                available = [k for k, v in etf_metrics.items() if v is not None]
                if available:
                    print(f"  \" {ticker} [ETF]: {', '.join(available)}")
                else:
                    print(f"    {ticker} [ETF]: No ETF metrics available")
            except Exception as e:
                print(f"  — {ticker} [ETF]: Error - {e}")
                fundamentals_data[ticker] = {
                    "per": None, "pbv": None, "roe": None, "der": None, "npm": None,
                    "expense_ratio": None, "aum": None, "dividend_yield": None,
                    "nav": None, "category": None,
                }
        else:
            try:
                fundamentals = fetch_fundamental_data(ticker)
                fundamentals_data[ticker] = fundamentals
                available = [k for k, v in fundamentals.items() if v is not None]
                if available:
                    print(f"{ticker}: {', '.join(available)}")
                else:
                    print(f"{ticker}: No fundamental data available")
            except Exception as e:
                print(f"  — {ticker}: Error - {e}")
                fundamentals_data[ticker] = {
                    "per": None, "pbv": None, "roe": None, "der": None, "npm": None,
                }

    save_cached_fundamentals(fundamentals_data)
    return fundamentals_data
