"""
fundamentals.py - Fetch fundamental metrics (PER, PBV, ROE, DER, NPM)
                  and ETF-specific metrics (expense ratio, AUM, yield, NAV)
"""
import yfinance as yf
import warnings

try:
    from yfinance_config import configure_yfinance_cache
except ModuleNotFoundError:
    configure_yfinance_cache = None

if configure_yfinance_cache:
    configure_yfinance_cache(yf)

warnings.filterwarnings('ignore')


# ---------------------------------------------------------------------------
# Stock fundamentals
# ---------------------------------------------------------------------------

def fetch_fundamental_data(ticker: str) -> dict:
    try:
        stock = yf.Ticker(ticker)
        info = stock.info if hasattr(stock, 'info') else {}

        market_cap = info.get('marketCap')
        if market_cap is not None and isinstance(market_cap, (int, float)):
            market_cap = round(float(market_cap), 2)

        forward_per = info.get('forwardPE')
        if forward_per is not None and isinstance(forward_per, (int, float)):
            forward_per = round(float(forward_per), 2)

        current_ratio = info.get('currentRatio')
        if current_ratio is not None and isinstance(current_ratio, (int, float)):
            current_ratio = round(float(current_ratio), 2)

        return {
            "per": _get_metric(info, 'trailingPE'),
            "pbv": _calculate_pbv(stock, info),
            "roe": _get_metric(info, 'returnOnEquity'),
            "der": _calculate_der(stock, info),
            "npm": _calculate_npm(info),
            "market_cap": market_cap,
            "forward_per": forward_per,
            "ev_ebitda": _calculate_ev_ebitda(info),
            "revenue_growth": _calculate_revenue_growth(info),
            "current_ratio": current_ratio,
            "dividend_yield": _get_stock_dividend_yield(info),
            "week_52_return": _calculate_52week_return(info),
        }
    except Exception as e:
        print(f"    [Warning] Could not fetch fundamentals for {ticker}: {e}")
        return {
            "per": None, "pbv": None, "roe": None, "der": None, "npm": None,
            "market_cap": None, "forward_per": None, "ev_ebitda": None,
            "revenue_growth": None, "current_ratio": None,
            "dividend_yield": None, "week_52_return": None,
        }


def _get_metric(info: dict, key: str) -> float:
    try:
        val = info.get(key)
        if val is not None and isinstance(val, (int, float)) and val > 0:
            return round(float(val), 2)
    except (TypeError, ValueError):
        pass
    return None


def _calculate_pbv(stock, info: dict) -> float:
    try:
        pb = info.get('priceToBook')
        if pb is not None and isinstance(pb, (int, float)) and pb > 0:
            return round(float(pb), 2)

        price = info.get('currentPrice') or info.get('regularMarketPrice')
        bvps  = info.get('bookValue')
        if price and bvps and bvps > 0:
            return round(float(price) / float(bvps), 2)

        market_cap = info.get('marketCap')
        bs = stock.balance_sheet
        if bs is None or bs.empty:
            return None

        equity_keys = [
            "Stockholders Equity", "Total Stockholder Equity",
            "Total Equity Gross Minority Interest", "Total Equity",
        ]
        equity = None
        for key in equity_keys:
            if key in bs.index:
                val = bs.loc[key].iloc[0]
                if val and float(val) > 0:
                    equity = float(val)
                    break

        if market_cap and equity:
            return round(float(market_cap) / equity, 2)
    except Exception:
        pass
    return None


def _calculate_der(stock, info: dict) -> float:
    try:
        total_debt   = info.get('totalDebt')
        total_equity = info.get('totalStockholderEquity')
        if total_debt and total_equity and float(total_equity) != 0:
            return round(float(total_debt) / float(total_equity), 2)

        bs = stock.balance_sheet
        debt_keys   = ["Total Debt", "Long Term Debt", "Total Liab"]
        equity_keys = ["Stockholders Equity", "Total Stockholder Equity"]
        debt = equity = None
        for key in debt_keys:
            if key in bs.index:
                debt = bs.loc[key].iloc[0]
                break
        for key in equity_keys:
            if key in bs.index:
                equity = bs.loc[key].iloc[0]
                break
        if debt and equity and float(equity) != 0:
            return round(float(debt) / float(equity), 2)
    except Exception:
        pass
    return None


def _calculate_npm(info: dict) -> float:
    try:
        net_income = info.get('netIncomeToCommon')
        revenue    = info.get('totalRevenue')
        if net_income and revenue and float(revenue) != 0:
            return round((float(net_income) / float(revenue)) * 100, 2)
    except (TypeError, ValueError, ZeroDivisionError):
        pass
    return None


# ---------------------------------------------------------------------------
# New fundamental helpers
# ---------------------------------------------------------------------------

def _calculate_ev_ebitda(info: dict) -> float:
    try:
        ev = info.get('enterpriseValue')
        ebitda = info.get('ebitda')
        if ev is not None and ebitda is not None and float(ebitda) > 0:
            return round(float(ev) / float(ebitda), 2)
    except (TypeError, ValueError, ZeroDivisionError):
        pass
    return None


def _calculate_revenue_growth(info: dict) -> float:
    try:
        val = info.get('revenueGrowth')
        if val is not None and isinstance(val, (int, float)):
            return round(float(val) * 100, 2)
    except (TypeError, ValueError):
        pass
    return None


def _get_stock_dividend_yield(info: dict) -> float:
    try:
        val = info.get('trailingAnnualDividendYield') or info.get('dividendYield')
        if val is not None and isinstance(val, (int, float)) and val >= 0:
            return round(float(val) * 100, 2)
    except (TypeError, ValueError):
        pass
    return None


def _calculate_52week_return(info: dict) -> float:
    try:
        val = info.get('52WeekChange')
        if val is not None and isinstance(val, (int, float)):
            return round(float(val) * 100, 2)
    except (TypeError, ValueError):
        pass
    return None


def score_fundamentals(fundamentals: dict) -> dict:
    """Score stock fundamental metrics 0-5 pts."""
    score = 0
    breakdown = {}

    per = fundamentals.get("per")
    per_pts, per_note = 0, "—"
    if per:
        if per < 15:
            per_pts, per_note = 1, f"Undervalued ({per})"
        elif per <= 25:
            per_pts, per_note = 1, f"Fair valuation ({per})"
        else:
            per_pts, per_note = 0, f"Expensive ({per})"
    breakdown["per"] = {"points": per_pts, "note": per_note}
    score += per_pts

    pbv = fundamentals.get("pbv")
    pbv_pts, pbv_note = 0, "—"
    if pbv:
        if pbv < 1:
            pbv_pts, pbv_note = 1, f"Trading below book ({pbv})"
        elif pbv <= 3:
            pbv_pts, pbv_note = 1, f"Fair book value ({pbv})"
        else:
            pbv_pts, pbv_note = 0, f"Premium valuation ({pbv})"
    breakdown["pbv"] = {"points": pbv_pts, "note": pbv_note}
    score += pbv_pts

    roe = fundamentals.get("roe")
    roe_pts, roe_note = 0, "—"
    if roe:
        roe_pct = float(roe) * 100 if abs(roe) < 1 else float(roe)
        if roe_pct >= 15:
            roe_pts, roe_note = 1, f"Strong profitability ({roe_pct:.1f}%)"
        else:
            roe_pts, roe_note = 0, f"Low ROE ({roe_pct:.1f}%)"
    breakdown["roe"] = {"points": roe_pts, "note": roe_note}
    score += roe_pts

    der = fundamentals.get("der")
    der_pts, der_note = 0, "—"
    if der:
        if der < 1:
            der_pts, der_note = 1, f"Conservative leverage ({der})"
        else:
            der_pts, der_note = 0, f"{'Moderate' if der <= 2 else 'High'} debt ({der})"
    breakdown["der"] = {"points": der_pts, "note": der_note}
    score += der_pts

    npm = fundamentals.get("npm")
    npm_pts, npm_note = 0, "—"
    if npm:
        if npm >= 10:
            npm_pts, npm_note = 1, f"Healthy margin ({npm:.1f}%)"
        else:
            npm_pts, npm_note = 0, f"Low margin ({npm:.1f}%)"
    breakdown["npm"] = {"points": npm_pts, "note": npm_note}
    score += npm_pts

    return {"total_pts": score, "breakdown": breakdown}


# ---------------------------------------------------------------------------
# ETF metrics
# ---------------------------------------------------------------------------

def fetch_etf_data(ticker: str) -> dict:
    """
    Fetch ETF-specific metrics:
    - expense_ratio : annual fee (%)
    - aum           : assets under management (USD)
    - dividend_yield: trailing yield (%)
    - nav           : net asset value per share
    - category      : Morningstar/yfinance category string
    - holdings      : list of top holdings
    """
    try:
        etf = yf.Ticker(ticker)
        info = etf.info if hasattr(etf, 'info') else {}

        expense_ratio  = _etf_expense_ratio(info)
        aum            = _etf_aum(info)
        dividend_yield = _etf_dividend_yield(info)
        nav            = _etf_nav(info)
        category       = info.get('category') or info.get('fundFamily') or None

        # Fetch holdings
        holdings = []
        try:
            if hasattr(etf, 'holdings') and etf.holdings is not None:
                holdings_df = etf.holdings
                if not holdings_df.empty:
                    # Take top 10
                    top_10 = holdings_df.head(10)
                    for _, row in top_10.iterrows():
                        holdings.append({
                            "symbol": row.get('Symbol') or row.get('Holding Ticker'),
                            "name": row.get('Holding Name') or row.get('Name'),
                            "weight": round(float(row.get('Holding Percent') or row.get('Weight')), 4) if (row.get('Holding Percent') or row.get('Weight')) is not None else None
                        })
        except Exception:
            pass

        return {
            "expense_ratio":  expense_ratio,
            "aum":            aum,
            "dividend_yield": dividend_yield,
            "nav":            nav,
            "category":       category,
            "holdings":       holdings,
        }
    except Exception as e:
        print(f"    [Warning] Could not fetch ETF data for {ticker}: {e}")
        return {
            "expense_ratio":  None,
            "aum":            None,
            "dividend_yield": None,
            "nav":            None,
            "category":       None,
            "holdings":       [],
        }


def _etf_expense_ratio(info: dict) -> float:
    """Expense ratio as percentage, e.g. 0.03 → returned as 0.03."""
    try:
        val = info.get('annualReportExpenseRatio') or info.get('totalExpenseRatio')
        if val is not None and isinstance(val, (int, float)):
            return round(float(val) * 100, 4)  # convert 0.0003 → 0.03%
    except Exception:
        pass
    return None


def _etf_aum(info: dict) -> float:
    """Total net assets / AUM in USD."""
    try:
        val = info.get('totalAssets')
        if val is not None and isinstance(val, (int, float)) and val > 0:
            return float(val)
    except Exception:
        pass
    return None


def _etf_dividend_yield(info: dict) -> float:
    """Trailing annual dividend yield as percentage."""
    try:
        val = info.get('trailingAnnualDividendYield') or info.get('dividendYield')
        if val is not None and isinstance(val, (int, float)) and val >= 0:
            return round(float(val) * 100, 4)
    except Exception:
        pass
    return None


def _etf_nav(info: dict) -> float:
    """NAV per share — use navPrice if available, else current price."""
    try:
        val = info.get('navPrice') or info.get('currentPrice') or info.get('regularMarketPrice')
        if val is not None and isinstance(val, (int, float)) and val > 0:
            return round(float(val), 4)
    except Exception:
        pass
    return None


def score_etf(etf_metrics: dict) -> dict:
    """
    Score ETF metrics 0-5 pts:
    - Expense Ratio (0-2): lower is better
    - AUM          (0-1): larger = more liquid
    - Dividend Yield(0-1): yield >= 1% gets a point
    - NAV          (0-1): available = 1 pt (proxy for data quality)
    """
    score = 0
    breakdown = {}

    # Expense Ratio (0-2 pts)
    er = etf_metrics.get("expense_ratio")
    er_pts, er_note = 0, "—"
    if er is not None:
        if er <= 0.1:
            er_pts, er_note = 2, f"Very low cost ({er:.3f}%)"
        elif er <= 0.5:
            er_pts, er_note = 1, f"Low cost ({er:.3f}%)"
        else:
            er_pts, er_note = 0, f"High fee ({er:.3f}%)"
    breakdown["expense_ratio"] = {"points": er_pts, "note": er_note}
    score += er_pts

    # AUM (0-1 pt)
    aum = etf_metrics.get("aum")
    aum_pts, aum_note = 0, "—"
    if aum is not None:
        aum_b = aum / 1e9
        if aum_b >= 1:
            aum_pts, aum_note = 1, f"Large AUM (${aum_b:.1f}B)"
        else:
            aum_pts, aum_note = 0, f"Small AUM (${aum_b:.2f}B)"
    breakdown["aum"] = {"points": aum_pts, "note": aum_note}
    score += aum_pts

    # Dividend Yield (0-1 pt)
    dy = etf_metrics.get("dividend_yield")
    dy_pts, dy_note = 0, "—"
    if dy is not None:
        if dy >= 1.0:
            dy_pts, dy_note = 1, f"Yield {dy:.2f}%"
        else:
            dy_pts, dy_note = 0, f"Low yield ({dy:.2f}%)"
    breakdown["dividend_yield"] = {"points": dy_pts, "note": dy_note}
    score += dy_pts

    # NAV available (0-1 pt)
    nav = etf_metrics.get("nav")
    nav_pts = 1 if nav is not None else 0
    nav_note = f"NAV ${nav:.2f}" if nav else "NAV unavailable"
    breakdown["nav"] = {"points": nav_pts, "note": nav_note}
    score += nav_pts

    return {"total_pts": score, "breakdown": breakdown}
