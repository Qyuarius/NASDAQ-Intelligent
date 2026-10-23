"""
Flask API server with APScheduler auto-refresh
Run: python api_server.py
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import math
import json
import os
import subprocess
import sys
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(message)s', datefmt='%H:%M:%S')
logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, "..", "frontend", "public", "output"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

scheduler = BackgroundScheduler()
scheduler_status = {
    "last_run": None,
    "next_run": None,
    "running": False,
    "run_count": 0,
}


def run_pipeline_job():
    if scheduler_status["running"]:
        logger.info("Pipeline already running, skipping")
        return

    scheduler_status["running"] = True
    logger.info("[Scheduler] Starting pipeline auto-refresh...")
    try:
        result = subprocess.run(
            [sys.executable, os.path.join(BACKEND_DIR, "run_pipeline.py")],
            cwd=BACKEND_DIR,
            capture_output=True,
            text=True,
            timeout=1800,
        )
        if result.returncode == 0:
            scheduler_status["last_run"] = datetime.now(timezone.utc).isoformat()
            scheduler_status["run_count"] += 1
            logger.info(f"[Scheduler] Pipeline complete (run #{scheduler_status['run_count']})")
        else:
            logger.error(f"[Scheduler] Pipeline failed: {result.stderr[-500:]}")
    except Exception as e:
        logger.error(f"[Scheduler] Pipeline error: {e}")
    finally:
        scheduler_status["running"] = False
        jobs = scheduler.get_jobs()
        if jobs:
            scheduler_status["next_run"] = jobs[0].next_run_time.isoformat() if jobs[0].next_run_time else None


@app.route('/api/ranking', methods=['GET'])
def get_ranking():
    ranking_path = os.path.join(OUTPUT_DIR, 'ranking.json')
    if not os.path.exists(ranking_path):
        return {'error': 'ranking.json not found', 'path': ranking_path}, 404
    with open(ranking_path, 'r', encoding='utf-8') as f:
        return jsonify(json.load(f))

@app.route('/api/commodity', methods=['GET'])
def get_commodity():
    comm_path = os.path.join(OUTPUT_DIR, 'commodity.json')
    if not os.path.exists(comm_path):
        return {'error': f'commodity.json not found at {comm_path}'}, 404
    with open(comm_path, 'r', encoding='utf-8') as f:
        return jsonify(json.load(f))

@app.route('/api/news', methods=['GET'])
def get_news():
    news_path = os.path.join(OUTPUT_DIR, 'news.json')
    if not os.path.exists(news_path):
        return {'error': f'news.json not found at {news_path}'}, 404
    with open(news_path, 'r', encoding='utf-8') as f:
        return jsonify(json.load(f))

@app.route('/api/refresh', methods=['POST'])
def refresh_pipeline():
    import threading
    def run_async():
        scheduler_status["running"] = True
        try:
            result = subprocess.run(
                [sys.executable, os.path.join(BACKEND_DIR, "run_pipeline.py")],
                cwd=BACKEND_DIR,
                capture_output=True,
                text=True,
                timeout=1800,
            )
            if result.returncode == 0:
                scheduler_status["last_run"] = datetime.now(timezone.utc).isoformat()
                scheduler_status["run_count"] += 1
            else:
                logger.error(f"Pipeline failed: {result.stderr[-500:]}")
        except Exception as e:
            logger.error(f"Pipeline error: {e}")
        finally:
            scheduler_status["running"] = False

    if scheduler_status["running"]:
        return {'message': 'Pipeline already running', 'status': scheduler_status}, 202

    threading.Thread(target=run_async, daemon=True).start()
    return {'ok': True, 'message': 'Pipeline started', 'status': scheduler_status}

@app.route('/api/refresh/stock', methods=['POST'])
def refresh_stock():
    result = subprocess.run(
        [sys.executable, os.path.join(BACKEND_DIR, 'run_stock_commodity_pipeline.py')],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return {'error': 'Stock pipeline failed', 'stdout': result.stdout, 'stderr': result.stderr}, 500
    return {'ok': True, 'message': 'Stock pipeline completed', 'output': result.stdout}

@app.route('/api/refresh/news', methods=['POST'])
def refresh_news():
    result = subprocess.run(
        [sys.executable, os.path.join(BACKEND_DIR, 'run_news_pipeline.py')],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return {'error': 'News pipeline failed', 'stdout': result.stdout, 'stderr': result.stderr}, 500
    return {'ok': True, 'message': 'News pipeline completed', 'output': result.stdout}

def _clean_nan(obj):
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean_nan(v) for v in obj]
    return obj


def _save_json(data, filename):
    path = os.path.join(OUTPUT_DIR, filename)
    data = _clean_nan(data)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _load_json(filename):
    path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _build_single_ticker_entry(ticker: str):
    """Download, calculate indicators, score, and return a full ranking entry for one ticker."""
    import yfinance as yf
    sys.path.insert(0, BACKEND_DIR)
    from features.indicators import calculate_indicators
    from features.fundamentals import fetch_fundamental_data
    from data.fetcher import is_etf
    from features.fundamentals import fetch_etf_data
    from data.data_cache import save_cached_df

    df = yf.download(ticker, period="5y", interval="1d", progress=False)
    if df is None or df.empty:
        return None

    # Flatten MultiIndex columns from yfinance
    if hasattr(df.columns, 'levels') and len(df.columns.levels) > 1:
        df.columns = [c[0] for c in df.columns]

    if hasattr(df.index, 'tz') and df.index.tz is not None:
        df.index = df.index.tz_localize(None)

    df.dropna(inplace=True)
    if df.empty or len(df) < 15:
        return None

    # Cache the data in SQLite
    try:
        save_cached_df(df, ticker, "daily")
    except Exception:
        pass

    indicators = calculate_indicators(df)

    asset_is_etf = is_etf(ticker)
    metrics = {}
    try:
        if asset_is_etf:
            etf_data = fetch_etf_data(ticker)
            metrics = {
                "per": None, "pbv": None, "roe": None, "der": None, "npm": None,
                **etf_data,
            }
        else:
            metrics = fetch_fundamental_data(ticker) or {}
    except Exception:
        pass

    if asset_is_etf:
        from engine.scorer import score_etf_asset
        scored = score_etf_asset(indicators, metrics)
    else:
        from engine.scorer import score_stock
        scored = score_stock(indicators, metrics)

    volume = 0
    try:
        vol_series = df["Volume"]
        if hasattr(vol_series, "iloc") and len(vol_series) > 0:
            volume = int(vol_series.iloc[-1])
    except Exception:
        volume = 0

    last_close = indicators.get("last_close", 0)
    turnover = round(last_close * volume, 2) if volume > 0 else 0.0

    entry = {
        "stock": ticker,
        "ticker": ticker,
        "type": "ETF" if asset_is_etf else "Stock",
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
        "change_1d": indicators.get("change_1d", 0.0),
        "volume": volume,
        "turnover": turnover,
        "last_close": last_close,
        "ema20": indicators.get("ema20", 0),
        "ema50": indicators.get("ema50", 0),
        "atr": indicators.get("atr", 0),
        "per": metrics.get("per"),
        "pbv": metrics.get("pbv"),
        "roe": metrics.get("roe"),
        "der": metrics.get("der"),
        "npm": metrics.get("npm"),
        "market_cap": metrics.get("market_cap"),
        "forward_per": metrics.get("forward_per"),
        "ev_ebitda": metrics.get("ev_ebitda"),
        "revenue_growth": metrics.get("revenue_growth"),
        "current_ratio": metrics.get("current_ratio"),
        "week_52_return": metrics.get("week_52_return"),
        "expense_ratio": metrics.get("expense_ratio"),
        "aum": metrics.get("aum"),
        "dividend_yield": metrics.get("dividend_yield"),
        "nav": metrics.get("nav"),
        "category": metrics.get("category"),
        "price_history": indicators.get("price_history", []),
        "intraday_price_history": [],
        "breakdown": scored["breakdown"],
    }

    # Enrich sector/name from yfinance
    try:
        info = yf.Ticker(ticker).info
        broad = info.get("sector") or info.get("industry") or None
        entry["sector_broad"] = broad
        entry["name"] = info.get("longName") or info.get("shortName") or None
    except Exception:
        broad = None
        entry["sector_broad"] = None
        entry["name"] = None

    # Apply specific sub-sector classification
    from stock_sectors import classify_sector
    entry["sector"] = classify_sector(ticker, fallback=broad)

    return entry


@app.route('/api/stocks', methods=['GET'])
def get_stocks():
    sys.path.insert(0, os.path.join(BACKEND_DIR, "data"))
    from fetcher import get_stock_tickers
    return jsonify({"tickers": get_stock_tickers()})


@app.route('/api/stocks/add', methods=['POST'])
def add_stock():
    data = request.get_json(silent=True) or {}
    ticker = data.get("ticker", "").strip().upper()
    if not ticker:
        return {"error": "ticker is required"}, 400

    sys.path.insert(0, os.path.join(BACKEND_DIR, "data"))
    sys.path.insert(0, BACKEND_DIR)
    from fetcher import add_stock_ticker, get_stock_tickers

    # Validate + fetch + score the ticker
    entry = _build_single_ticker_entry(ticker)
    if entry is None:
        return {"error": f"'{ticker}' is not a valid ticker or has insufficient data"}, 400

    # Add to stock_tickers.json
    ok, msg = add_stock_ticker(ticker)
    if not ok:
        return {"error": msg}, 409

    # Inject into ranking.json
    ranking_data = _load_json("ranking.json") or {"generated_at": datetime.now().isoformat(), "total_stocks": 0, "rankings": []}
    rankings = ranking_data.get("rankings", [])
    rankings = [r for r in rankings if r.get("ticker") != ticker]
    rankings.append(entry)
    rankings.sort(key=lambda x: (x.get("score", 0), -abs(x.get("rsi", 50) - 60)), reverse=True)
    ranking_data["rankings"] = rankings
    ranking_data["total_stocks"] = len(rankings)
    ranking_data["generated_at"] = datetime.now().isoformat()
    _save_json(ranking_data, "ranking.json")

    return {"ok": True, "message": msg, "tickers": get_stock_tickers()}


@app.route('/api/stocks/remove', methods=['DELETE'])
def remove_stock():
    data = request.get_json(silent=True) or {}
    ticker = data.get("ticker", "").strip().upper()
    if not ticker:
        return {"error": "ticker is required"}, 400
    sys.path.insert(0, os.path.join(BACKEND_DIR, "data"))
    from fetcher import remove_stock_ticker, get_stock_tickers
    ok, msg = remove_stock_ticker(ticker)
    if not ok:
        return {"error": msg}, 404

    # Remove from ranking.json too
    ranking_data = _load_json("ranking.json")
    if ranking_data:
        rankings = ranking_data.get("rankings", [])
        rankings = [r for r in rankings if r.get("ticker") != ticker]
        ranking_data["rankings"] = rankings
        ranking_data["total_stocks"] = len(rankings)
        _save_json(ranking_data, "ranking.json")

    return {"ok": True, "message": msg, "tickers": get_stock_tickers()}


@app.route('/api/quote/<ticker>', methods=['GET'])
def get_quote(ticker):
    """Lightweight live quote via yfinance fast_info. No side effects."""
    import yfinance as yf
    sym = (ticker or "").strip().upper()
    if not sym:
        return {"error": "ticker is required"}, 400
    try:
        t = yf.Ticker(sym)
        fi = t.fast_info
        price = None
        for attr in ("last_price", "last", "previous_close"):
            try:
                v = getattr(fi, attr, None)
                if v is not None:
                    price = float(v)
                    break
            except Exception:
                continue
        if price is None:
            return {"error": f"'{sym}' has no price data"}, 404

        name = None
        market_cap = None
        previous_close = None
        currency = None
        try:
            market_cap = float(fi.market_cap) if fi.market_cap else None
        except Exception:
            pass
        try:
            previous_close = float(fi.previous_close) if fi.previous_close else None
        except Exception:
            pass
        try:
            currency = str(fi.currency) if fi.currency else None
        except Exception:
            pass
        try:
            info = t.info
            name = info.get("longName") or info.get("shortName") or None
        except Exception:
            pass

        return {
            "ticker": sym,
            "price": price,
            "name": name,
            "previous_close": previous_close,
            "market_cap": market_cap,
            "currency": currency,
            "source": "live",
        }
    except Exception as e:
        return {"error": f"Failed to fetch quote for '{sym}': {e}"}, 500


@app.route('/api/scheduler/status', methods=['GET'])
def scheduler_status_endpoint():
    return jsonify(scheduler_status)

@app.route('/api/scheduler/trigger', methods=['POST'])
def scheduler_trigger():
    scheduler.add_job(run_pipeline_job, 'date', id='manual_trigger', replace_existing=True)
    return {'ok': True, 'message': 'Pipeline triggered manually'}

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'ok', 'scheduler': scheduler_status}, 200

if __name__ == '__main__':
    scheduler.add_job(
        run_pipeline_job,
        'interval',
        hours=1,
        id='auto_refresh',
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info("[Scheduler] Auto-refresh every 1 hour started")

    jobs = scheduler.get_jobs()
    if jobs:
        scheduler_status["next_run"] = jobs[0].next_run_time.isoformat() if jobs[0].next_run_time else None
        logger.info(f"[Scheduler] Next auto-refresh: {scheduler_status['next_run']}")

    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Exists: {os.path.exists(OUTPUT_DIR)}")
    if os.path.exists(OUTPUT_DIR):
        print(f"Files: {os.listdir(OUTPUT_DIR)}")
    print("API Server running on http://localhost:5000")
    app.run(host='localhost', port=5000, debug=False)
