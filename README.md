# NASDAQ Intel — Stock Ranking & Market Intelligence

A US equity analysis platform that ranks **500+ stocks & ETFs** using technical, fundamental, and news-sentiment signals. A **0–15 composite score** drives BUY / HOLD / SELL signals, paired with interactive charts, correlation analysis, side-by-side comparison, a portfolio tracker, and commodity/index coverage.

> Data is sourced from Yahoo Finance / CNBC. Not investment advice.

---

## Tech Stack

### Backend

| Component | Technology |
|-----------|------------|
| **Language** | Python ≥ 3.10 |
| **API** | Flask 3 + Flask-CORS |
| **Scheduler** | APScheduler (auto-refresh hourly) |
| **Data** | yfinance, pandas, numpy, requests, BeautifulSoup |
| **Cache** | SQLite (`nasdaq_intel.db`) with WAL mode |
| **News** | CNBC scraper (optional Playwright) + signal engine |

### Frontend

| Component | Technology |
|-----------|------------|
| **Framework** | React 18 |
| **Build Tool** | Vite 5 |
| **Charts** | Recharts |
| **Styling** | Tailwind CSS 3 |
| **Routing** | React Router 7 |
| **HTTP** | Axios |
| **Animation & Icons** | Framer Motion, Lucide, Phosphor Icons |

---

## Features

### 1. Dashboard
- **Market Fundamentals** — commodity & index prices, sector summary, sector heatmap
- **Live Analysis** — price chart for the selected stock
- **Ranking Table** — all assets with sector filtering and composite score
- **Market Movers** — top gainers / losers / volume
- **Insight — Whales Watch** — public-figure and institutional holdings
- **Auto-refresh** — data polls every 90 seconds while the tab is active

### 2. Scoring & Ranking
Maximum composite score is **15 points** = Technical (5) + Fundamental/ETF (5) + News (±5).

**Technical (0–5)**

| Component | Points | Criteria |
|-----------|--------|----------|
| **RSI (14)** | 0–2 | 60–70 bullish = 2; 40–60 neutral = 1; overbought/oversold = 0 |
| **MACD** | 0–1 | MACD line > signal line = 1 |
| **EMA Trend** | 0–1 | Close > EMA20 > EMA50 = 1 |
| **20d Momentum** | 0–1 | 20-day return > +2% = 1 |

**Stock fundamentals (0–5)**

| Component | Points | Criteria |
|-----------|--------|----------|
| **PER** | 0–1 | < 25 considered fair |
| **PBV** | 0–1 | < 3 |
| **ROE** | 0–1 | ≥ 15% |
| **DER** | 0–1 | < 1 |
| **NPM** | 0–1 | ≥ 10% |

**ETF (0–5)**

| Component | Points | Criteria |
|-----------|--------|----------|
| **Expense Ratio** | 0–2 | ≤ 0.10% = 2; ≤ 0.50% = 1 |
| **AUM** | 0–1 | ≥ $1B |
| **Dividend Yield** | 0–1 | ≥ 1% |
| **NAV** | 0–1 | Available |

**Signals**

| Stage | BUY | HOLD | SELL |
|-------|-----|------|------|
| Before news adjustment (0–10) | ≥ 7 | ≥ 4 | < 4 |
| After news adjustment (0–15) | ≥ 10 | ≥ 6 | < 6 |

### 3. News Intelligence
- Aggregates Yahoo Finance & CNBC articles
- Classifies each article as **BULLISH / NEUTRAL / BEARISH**
- Sentiment score + confidence + keyword triggers
- Per-ticker impact aggregation
- News adjustment normalized to **±5 points**, then rankings are re-sorted

### 4. Correlation Analysis
- **Network view** — stock-to-stock correlation graph
- **Matrix view** — correlation heatmap
- Minimum-correlation filter and AI-network focus
- Commodity correlation detection (oil, coal, nickel, gold)

### 5. Compare
Compare **2–6 stocks** side by side: performance charts, valuation, profitability, momentum metrics, and pairwise correlation matrices.

### 6. Portfolio Tracker
- Add / remove holdings (ticker, quantity, buy price)
- Stored in browser `localStorage`
- Valuation, P&L, allocation, and live price refresh via `GET /api/quote/<ticker>`

### 7. Stock Manager
- Add a ticker → validate, download data, compute indicators, score, then inject into `ranking.json`
- Remove a ticker from the watchlist and rankings
- Watchlist stored in `project/backend/stock_tickers.json`

### 8. Stock Detail
- Metric cards: price, market cap, daily performance, RSI, score
- Historical + intraday price chart
- Technical & fundamental score breakdown
- Fundamental diagnostics table (PER, PBV, ROE, DER, NPM, EV/EBITDA, revenue growth, etc.)
- Strengths & risks summary

### 9. Commodity & Index
- **Commodities**: Crude Oil (CL=F), Coal, Nickel, Gold
- **Indices**: S&P 500 (^GSPC), NASDAQ (^IXIC), Dow Jones (^DJI)
- Detail page with a 3-month series chart and the stocks most correlated to each commodity

### 10. Filter & Movers
- Advanced filters by sector, signal, score, RSI, market cap, PER, PBV, ROE, DER, NPM, momentum
- Dedicated Movers page for the largest daily moves

---

## Workflow

```
run_pipeline.py
├── run_stock_commodity_pipeline.py
│   ├── Fetch 5y OHLCV + 5d intraday
│   ├── Fetch fundamentals / ETF metrics
│   ├── Compute technical indicators
│   ├── Compute commodity correlations
│   ├── Score & rank
│   ├── Classify sectors
│   └── Write ranking.json, commodity.json,
│       commodity_series.json, correlations.json
└── run_news_pipeline.py
    ├── Fetch & analyze news
    ├── Aggregate sentiment per ticker
    ├── Inject news score (±5) into rankings
    ├── Re-sort rankings
    └── Write news.json + final ranking.json
```

Optional standalone CNBC scraper:

```bash
python -m engine.news_scrapper --limit 15
```

produces `news_signals.json` and `news_signals_summary.json`.

Outputs are written to `project/frontend/public/output/` and served directly by Vite.

---

## Usage

### Prerequisites
- Python ≥ 3.10
- Node.js ≥ 18
- Internet connection (yfinance & CNBC)

### Install

```bash
# From the project root
npm run install:all
```

Or manually:

```bash
cd project/backend && pip install -r requirements.txt
cd project/frontend && npm install
```

### Run the App

```bash
# Project root — starts Flask API (:5000) + Vite (:5173)
npm run dev
```

Alternatives:

```bash
python project/start.py          # API + Vite
python project/start.py --api    # API only (after building)
start.bat                        # Windows shortcut
```

Open `http://localhost:5173`.

### Generate Data for the First Time

Output files are not available until the pipeline runs:

```bash
cd project/backend

python run_pipeline.py                    # stock + commodity + news
python run_pipeline.py --steps stock      # stock + commodity only
python run_pipeline.py --steps news       # news only
```

Or step by step:

```bash
python run_stock_commodity_pipeline.py
python run_news_pipeline.py
```

Once the API is running, the pipeline can also run automatically:
- Internal scheduler runs **every hour**
- Manual trigger via `POST /api/scheduler/trigger` or `POST /api/refresh`

### Production Build

```bash
npm run build
python project/start.py --api
```

---

## Project Structure

```
NASDAQ Intel/
├── start.bat / create-shortcut.ps1       # Windows launcher
├── package.json                          # Root scripts (dev, build, install:all)
├── opencode.json
│
└── project/
    ├── start.py                          # Flask + Vite runner
    ├── venv.bat / venv.sh                # Virtualenv setup
    │
    ├── backend/
    │   ├── requirements.txt
    │   ├── api_server.py                 # Flask API + APScheduler
    │   ├── run_pipeline.py               # Orchestrator
    │   ├── run_stock_commodity_pipeline.py
    │   ├── run_news_pipeline.py
    │   ├── stock_tickers.json            # 500+ ticker watchlist
    │   ├── stock_sectors.py              # Sub-sector classification
    │   ├── nasdaq_intel.db               # SQLite cache
    │   │
    │   ├── engine/
    │   │   ├── scorer.py                 # Scoring & ranking
    │   │   ├── signal_engine.py
    │   │   ├── news_processor.py
    │   │   └── news_scrapper.py          # CNBC scraper + signal CLI
    │   ├── features/
    │   │   ├── indicators.py             # RSI, MACD, EMA, ATR, momentum
    │   │   ├── fundamentals.py           # Fundamental & ETF metrics
    │   │   ├── correlation.py            # Stock–commodity correlation
    │   │   └── stock_correlation.py      # Stock–stock correlation
    │   └── data/
    │       ├── fetcher.py                # Downloads & watchlist
    │       ├── news_fetcher.py
    │       ├── data_cache.py
    │       └── database.py               # SQLite schema
    │
    └── frontend/
        ├── vite.config.js                # /api proxy → :5000
        ├── tailwind.config.js
        ├── public/output/                # Pipeline JSON outputs
        └── src/
            ├── App.jsx
            ├── layouts/MainLayout.jsx
            ├── hooks/usePortfolio.js
            ├── pages/
            │   ├── Dashboard.jsx
            │   ├── StockDetailPage.jsx
            │   ├── CommodityDetailPage.jsx
            │   ├── NewsPage.jsx
            │   ├── FilterPage.jsx
            │   ├── MoversPage.jsx
            │   ├── CorrelationsPage.jsx
            │   ├── ComparePage.jsx
            │   └── PortfolioPage.jsx
            └── components/
                ├── RankingTable.jsx
                ├── StockChart.jsx
                ├── CommodityPanel.jsx
                ├── SectorPanel.jsx / SectorHeatmap.jsx
                ├── MoversPanel.jsx
                ├── GuruPanel.jsx
                ├── CorrelationGraph.jsx / CorrelationMatrix.jsx
                ├── StockManagerModal.jsx
                ├── Sidebar.jsx
                └── news/
                    ├── NewsCard.jsx
                    └── NewsFilter.jsx
```

---

## API Endpoints

The Flask API runs at `http://localhost:5000`. The frontend accesses it through the Vite `/api` proxy.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ranking` | Final ranking data |
| `GET` | `/api/commodity` | Commodity & index prices |
| `GET` | `/api/news` | News articles + per-ticker aggregation |
| `GET` | `/api/stocks` | Watchlist tickers |
| `POST` | `/api/stocks/add` | Add ticker (`{"ticker": "AAPL"}`) |
| `DELETE` | `/api/stocks/remove` | Remove ticker (`{"ticker": "AAPL"}`) |
| `GET` | `/api/quote/<ticker>` | Live price via yfinance `fast_info` |
| `POST` | `/api/refresh` | Run full pipeline (async) |
| `POST` | `/api/refresh/stock` | Run stock pipeline (sync) |
| `POST` | `/api/refresh/news` | Run news pipeline (sync) |
| `GET` | `/api/scheduler/status` | Auto-refresh status |
| `POST` | `/api/scheduler/trigger` | Manually trigger the pipeline |
| `GET` | `/health` | Health check + scheduler status |

### Example `GET /api/quote/AAPL`

```json
{
  "ticker": "AAPL",
  "price": 184.52,
  "name": "Apple Inc.",
  "previous_close": 183.9,
  "market_cap": 2850000000000,
  "currency": "USD",
  "source": "live"
}
```

### Example `ranking.json` entry

```json
{
  "ticker": "AAPL",
  "stock": "AAPL",
  "type": "Stock",
  "name": "Apple Inc.",
  "sector": "Consumer Electronics",
  "score": 11.4,
  "signal": "BUY",
  "technical_score": 4,
  "fundamental_score": 4,
  "news_adjustment": 3.4,
  "rsi": 62.1,
  "trend": "UP",
  "momentum_20d": 4.8,
  "last_close": 184.52,
  "change_1d": 0.34,
  "per": 28.1,
  "pbv": 44.2,
  "roe": 0.152,
  "der": 1.4,
  "npm": 25.3,
  "breakdown": { "...": "..." }
}
```

---

## Output Files

| File | Contents |
|------|----------|
| `ranking.json` | `generated_at`, `total_stocks`, `rankings[]` |
| `commodity.json` | `generated_at`, `prices` |
| `commodity_series.json` | 3-month series: oil, coal, nickel, gold, sp500, nasdaq, dow |
| `correlations.json` | `nodes`, `edges`, `ai_tickers`, `ai_tag_colors` |
| `news.json` | `articles[]`, `by_ticker`, `total_articles` |
| `news_signals.json` | CNBC scraper + signal engine output |
| `news_signals_summary.json` | CNBC signal summary |
| `insight.json` | Static public-figure holdings data |
| `relationships.json` | Static company-relationship dataset (optional) |

---

## Notes

- yfinance prices may be delayed and depend on upstream availability.
- The default watchlist contains 500+ tickers; a full pipeline run takes several minutes.
- The SQLite cache speeds up subsequent runs; delete `project/backend/nasdaq_intel.db` to reset it.
- Portfolio data is stored locally in the browser, not on the server.
- The API binds to `localhost` only and has no authentication — do not expose it publicly without additional protection.
