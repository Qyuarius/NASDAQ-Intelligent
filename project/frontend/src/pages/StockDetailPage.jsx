import React, { useState, useEffect } from 'react'
import axios from 'axios'
import StockChart from '../components/StockChart'

const SIGNAL_COLORS = {
  BUY: { bg: 'bg-[rgba(49,209,124,0.1)]', text: 'text-[var(--terminal-green)]', border: 'border-[rgba(49,209,124,0.3)]', label: 'BUY' },
  HOLD: { bg: 'bg-[rgba(255,209,102,0.1)]', text: 'text-[var(--terminal-yellow)]', border: 'border-[rgba(255,209,102,0.3)]', label: 'HOLD' },
  SELL: { bg: 'bg-[rgba(255,90,54,0.1)]', text: 'text-[var(--terminal-red)]', border: 'border-[rgba(255,90,54,0.3)]', label: 'SELL' },
}

function MetricCard({ label, value, hint, valueClassName = 'text-white' }) {
  return (
    <div className="glass-card group flex flex-col items-center justify-center text-center p-3 sm:p-4 lg:p-6">
      <div className="mb-1 sm:mb-2 font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</div>
      <div className={`font-mono text-lg sm:text-xl md:text-2xl lg:text-2xl xl:text-3xl font-black tracking-tighter transition-all group-hover:scale-105 ${valueClassName}`}>{value}</div>
      {hint && <div className="mt-2 sm:mt-3 font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500/0 transition-all group-hover:text-slate-500/100">{hint}</div>}
    </div>
  )
}

function BreakdownRow({ label, note, points }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-b-0">
      <div className="min-w-0">
        <div className="font-mono text-xs font-bold uppercase tracking-widest text-slate-300">{label}</div>
        <div className="mt-0.5 truncate font-mono text-[11px] font-medium text-slate-500">{note || 'No data'}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-1.5 overflow-hidden rounded-full bg-white/5 border border-white/5">
          <div className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" style={{ width: `${(points / 2) * 100}%` }} />
        </div>
        <span className="font-mono text-[11px] font-black text-amber-500">{points}pt</span>
      </div>
    </div>
  )
}

function SnapshotCard({ label, value, status, note, valueClassName = 'text-white' }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.01] p-8 transition-all hover:bg-white/[0.03] hover:border-white/10 hover:-translate-y-1">
      <div className="mb-4 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className={`font-mono text-2xl font-black tracking-tight ${valueClassName}`}>{value}</div>
      <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">{status}</div>
      {note && <div className="mt-5 font-mono text-[10px] leading-relaxed text-slate-500/80 border-t border-white/5 pt-5">{note}</div>}
    </div>
  )
}

function FundaTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/5">
      <table className="w-full min-w-[500px]">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02]">
            <th className="py-3 px-5 text-left font-mono text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Metric</th>
            <th className="py-3 px-5 text-right font-mono text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Value</th>
            <th className="py-3 px-5 text-right font-mono text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-b-0 transition-colors hover:bg-white/[0.02]">
              <td className="py-3.5 px-5 font-mono text-xs font-bold tracking-wide text-slate-300">{row.label}</td>
              <td className={`py-3.5 px-5 text-right font-mono text-sm font-black tracking-tight ${row.valueClassName || 'text-white'}`}>{row.value}</td>
              <td className="py-3.5 px-5 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SignalList({ title, titleClassName, items, emptyText }) {
  return (
    <div className="space-y-3">
      <div className={`font-mono text-[10px] uppercase tracking-[0.2em] ${titleClassName}`}>{title}</div>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-3 font-mono text-[11px] leading-relaxed text-slate-400">
              <span className="text-slate-600 shrink-0">0{i + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-mono text-[11px] text-slate-600">{emptyText}</p>
      )}
    </div>
  )
}

function formatMarketCap(mc) {
  if (mc == null) return '--'
  if (mc >= 1e12) return `$${(mc / 1e12).toFixed(2)}T`
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(2)}M`
  return `$${Number(mc).toLocaleString()}`
}

function formatPct(value, decimals = 1) {
  if (value == null) return '--'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

function formatMultiple(value) {
  if (value == null) return '--'
  return `${value.toFixed(1)}x`
}

export default function StockDetailPage({ stock, onBack }) {
  const [activeBreakdown, setActiveBreakdown] = useState('technical')
  const [newsArticles, setNewsArticles] = useState([])
  const [expandedNews, setExpandedNews] = useState(null)
  const [newsLoading, setNewsLoading] = useState(true)
  const signalStyle = SIGNAL_COLORS[stock.signal] || SIGNAL_COLORS.HOLD

  useEffect(() => {
    let cancelled = false
    setNewsLoading(true)
    axios.get(`/output/news.json?t=${Date.now()}`)
      .then(res => {
        if (cancelled) return
        const data = res.data
        const ticker = stock.ticker || stock.stock
        const articleUuids = data.by_ticker?.[ticker] || []
        if (!articleUuids.length) {
          setNewsArticles([])
          setNewsLoading(false)
          return
        }
        const uuidSet = new Set(articleUuids)
        const filtered = (data.articles || []).filter(a => uuidSet.has(a.uuid))
        setNewsArticles(filtered)
        setNewsLoading(false)
      })
      .catch(() => {
        if (!cancelled) setNewsLoading(false)
      })
    return () => { cancelled = true }
  }, [stock.ticker, stock.stock])

  const getPerformance = () => {
    if (!stock.price_history || stock.price_history.length < 2) return { today: null, yesterday: null }

    const history = stock.price_history
    const lastIdx = history.length - 1
    const latestDate = history[lastIdx].date.split(' ')[0]
    
    // Find today's open (first entry of the latest date)
    let todayOpenIdx = lastIdx
    while (todayOpenIdx > 0 && history[todayOpenIdx - 1].date.startsWith(latestDate)) {
      todayOpenIdx--
    }
    const todayOpen = history[todayOpenIdx].close
    const todayClose = history[lastIdx].close
    const todayPerf = ((todayClose - todayOpen) / todayOpen) * 100

    // Find yesterday's data
    let yesterdayPerf = null
    if (todayOpenIdx > 0) {
      const yesterdayDate = history[todayOpenIdx - 1].date.split(' ')[0]
      let yestEndIdx = todayOpenIdx - 1
      let yestStartIdx = yestEndIdx
      while (yestStartIdx > 0 && history[yestStartIdx - 1].date.startsWith(yesterdayDate)) {
        yestStartIdx--
      }
      const yestOpen = history[yestStartIdx].close
      const yestClose = history[yestEndIdx].close
      yesterdayPerf = ((yestClose - yestOpen) / yestOpen) * 100
    }

    return { today: todayPerf, yesterday: yesterdayPerf }
  }

  const { today, yesterday } = getPerformance()

  const positiveSignals = [
    stock.trend === 'UP' ? 'Uptrend structure confirmed on multiple timeframes' : null,
    stock.breakdown?.trend?.points > 0 ? 'Price maintaining position above key EMA levels' : null,
    stock.breakdown?.rsi?.points === 2 ? 'RSI indicating strong bullish momentum (60-70)' : null,
    stock.breakdown?.macd?.points > 0 ? 'Positive MACD crossover signal' : null,
    stock.breakdown?.momentum?.points > 0 ? '20-day price momentum is positive' : null,
    stock.breakdown?.news?.points > 0 ? 'Positive news sentiment from recent market coverage' : null,
    stock.type === 'ETF' && stock.breakdown?.expense_ratio?.points === 2 ? 'Highly competitive expense ratio' : null,
    stock.score >= 10 ? `Robust composite score of ${stock.score}/15` : null,
  ].filter(Boolean)

  const riskSignals = [
    stock.trend === 'DOWN' ? 'Active downtrend regime' : null,
    stock.breakdown?.trend?.points === 0 && stock.trend !== 'UP' ? 'Price currently trading below key EMAs' : null,
    stock.rsi > 70 ? 'RSI in overbought territory; elevated pullback risk' : null,
    stock.rsi < 30 ? 'RSI oversold; trend repair may be slow' : null,
    stock.breakdown?.macd?.points === 0 ? 'Lack of bullish MACD confirmation' : null,
    stock.type === 'ETF' && stock.breakdown?.expense_ratio?.points === 0 ? 'Relatively high management fees' : null,
    stock.news_score < 0 ? 'Negative news sentiment from recent market coverage' : null,
    stock.score <= 5 ? `Caution: Low composite score of ${stock.score}/15` : null,
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-[var(--terminal-bg)] text-[var(--terminal-text)] selection:bg-[var(--terminal-accent)] selection:text-black">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#030407]/60 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-8">
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                onClick={onBack}
                className="group flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 shrink-0 transition-all border rounded-xl sm:rounded-2xl border-white/10 bg-white/5 text-slate-400 hover:border-[var(--terminal-accent)] hover:bg-[var(--terminal-accent-soft)] hover:text-[var(--terminal-accent)]"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="hidden sm:block w-px h-8 bg-white/5" />
              <div>
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white font-display">
                  {stock.name || stock.stock} <span className="hidden sm:inline text-[var(--terminal-muted)]">/ Intelligence Report</span>
                </h1>
                <div className="flex items-center gap-2 font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--terminal-muted)]">
                  {stock.type === 'ETF' ? 'Exchange Traded Fund Portfolio' : 'Publicly Traded Equity Asset'}
                </div>
              </div>
            </div>

            <div className={`self-start sm:self-auto inline-flex items-center rounded-xl sm:rounded-2xl border px-3 py-1.5 sm:px-5 sm:py-2.5 font-mono text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] ${signalStyle.bg} ${signalStyle.text} ${signalStyle.border} shadow-2xl`}>
              <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full mr-2 sm:mr-3 animate-pulse ${stock.signal === 'BUY' ? 'bg-emerald-500 shadow-[0_0_10px_var(--terminal-green)]' : stock.signal === 'SELL' ? 'bg-rose-500 shadow-[0_0_10px_var(--terminal-red)]' : 'bg-amber-500 shadow-[0_0_10px_var(--terminal-yellow)]'}`} />
              Signal: {signalStyle.label}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-fade-in">
        <div className="grid grid-cols-1 gap-x-10 gap-y-16 lg:grid-cols-12">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-8 lg:col-span-12">
            <MetricCard
              label="Market Price"
              value={stock.last_close?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '--'}
              hint="Last Traded Value"
            />
            <MetricCard
              label="Market Cap"
              value={formatMarketCap(stock.market_cap)}
              hint="Total Equity Value"
              valueClassName="text-amber-400"
            />
            <MetricCard
              label="Today Perf"
              value={today !== null ? `${today > 0 ? '+' : ''}${today.toFixed(2)}%` : '--'}
              hint="Intraday Change"
              valueClassName={today > 0 ? 'text-emerald-400 glow-green' : today < 0 ? 'text-rose-400 glow-red' : 'text-slate-400'}
            />
            <MetricCard
              label="Yesterday"
              value={yesterday !== null ? `${yesterday > 0 ? '+' : ''}${yesterday.toFixed(2)}%` : '--'}
              hint="Prior Day Change"
              valueClassName={yesterday > 0 ? 'text-emerald-400 glow-green' : yesterday < 0 ? 'text-rose-400 glow-red' : 'text-slate-400'}
            />
            <MetricCard
              label="RSI (14)"
              value={stock.rsi?.toFixed(1) ?? '--'}
              hint={stock.rsi > 70 ? 'Overbought' : stock.rsi < 30 ? 'Oversold' : 'Neutral Momentum'}
              valueClassName={stock.rsi > 70 ? 'text-rose-400 glow-red' : stock.rsi < 30 ? 'text-emerald-400 glow-green' : 'text-sky-400'}
            />
            <MetricCard
              label="News Sentiment"
              value={stock.news_score !== undefined ? `${stock.news_score > 0 ? '+' : ''}${stock.news_score.toFixed(2)}` : '--'}
              hint={stock.news_articles_count ? `${stock.news_articles_count} articles (${stock.news_bullish_count || 0}↑ ${stock.news_bearish_count || 0}↓)` : 'No recent news'}
              valueClassName={stock.news_score > 0 ? 'text-emerald-400 glow-green' : stock.news_score < 0 ? 'text-rose-400 glow-red' : 'text-slate-400'}
            />
          </div>

          {/* Row 1: Chart | Intelligence Matrix */}
          <div className="lg:col-span-8">
            <div className="terminal-panel rounded-[2.5rem] p-4 sm:p-6 lg:p-10 pb-8 sm:pb-16 h-full flex flex-col">
              <div className="flex items-center justify-between mb-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-10 rounded-full bg-[var(--terminal-accent)]" />
                  <div className="terminal-title">Performance Topology</div>
                </div>
                <div className="flex gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_var(--terminal-green)]" />
                  <div className="h-2 w-2 rounded-full bg-white/5" />
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <StockChart stock={stock} />
              </div>
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="terminal-panel rounded-[2.5rem] p-4 sm:p-6 lg:p-10 h-full">
              <div className="flex items-center gap-3 mb-6 sm:mb-10">
                <div className="h-1.5 w-10 rounded-full bg-[var(--terminal-accent)]" />
                <div className="terminal-title">Intelligence Matrix</div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Composite Score</span>
                    <span className={`font-mono text-xl font-bold ${stock.score >= 10 ? 'text-emerald-400' : 'text-amber-400'}`}>{stock.score}/15</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-[var(--terminal-accent)] transition-all duration-1000"
                      style={{ width: `${(stock.score / 15) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1 font-mono text-[9px] text-slate-500">
                    <span className="text-amber-400">{stock.technical_score}</span>/5
                    <span className="text-slate-600">+</span>
                    <span className="text-sky-400">{stock.fundamental_score}</span>/5
                    {stock.news_adjustment ? (
                      <>
                        <span className="text-slate-600">+</span>
                        <span className={stock.news_adjustment > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {stock.news_adjustment > 0 ? '+' : ''}{stock.news_adjustment}
                        </span>
                      </>
                    ) : null}
                    <span className="text-slate-600">=</span>
                    <span className="text-white">{stock.score}</span>/15
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setActiveBreakdown(activeBreakdown === 'technical' ? null : 'technical')}
                    className={`rounded-2xl border p-4 text-left transition-all ${activeBreakdown === 'technical' ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'}`}
                  >
                    <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-1">Technical</div>
                    <div className="font-mono text-lg font-bold text-amber-400">{stock.technical_score}/5</div>
                  </button>
                  <button
                    onClick={() => setActiveBreakdown(activeBreakdown === 'fundamental' ? null : 'fundamental')}
                    className={`rounded-2xl border p-4 text-left transition-all ${activeBreakdown === 'fundamental' ? 'border-sky-500/50 bg-sky-500/10' : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'}`}
                  >
                    <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-1">Foundational</div>
                    <div className="font-mono text-lg font-bold text-sky-400">{stock.fundamental_score}/5</div>
                  </button>
                </div>
              </div>

              {activeBreakdown && (
                <div className="mt-6 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[var(--terminal-accent)] mb-4 px-1">
                    {activeBreakdown === 'technical' ? 'Technical Diagnostics' : 'Foundational Metrics'}
                  </div>
                  {activeBreakdown === 'technical' ? (
                    <>
                      {stock.breakdown?.trend && <BreakdownRow label="Position" note={stock.breakdown.trend.note} points={stock.breakdown.trend.points} />}
                      {stock.breakdown?.rsi && <BreakdownRow label="RSI" note={stock.breakdown.rsi.note} points={stock.breakdown.rsi.points} />}
                      {stock.breakdown?.macd && <BreakdownRow label="MACD" note={stock.breakdown.macd.note} points={stock.breakdown.macd.points} />}
                      {stock.breakdown?.momentum && <BreakdownRow label="Momentum" note={stock.breakdown.momentum.note} points={stock.breakdown.momentum.points} />}
                    </>
                  ) : (
                    <>
                      {stock.type === 'ETF' ? (
                        <>
                          {stock.breakdown?.expense_ratio && <BreakdownRow label="Expense" note={stock.breakdown.expense_ratio.note} points={stock.breakdown.expense_ratio.points} />}
                          {stock.breakdown?.aum && <BreakdownRow label="AUM" note={stock.breakdown.aum.note} points={stock.breakdown.aum.points} />}
                          {stock.breakdown?.nav && <BreakdownRow label="NAV" note={stock.breakdown.nav.note} points={stock.breakdown.nav.points} />}
                          {stock.breakdown?.dividend_yield && <BreakdownRow label="Dividend" note={stock.breakdown.dividend_yield.note} points={stock.breakdown.dividend_yield.points} />}
                        </>
                      ) : (
                        <>
                          {stock.breakdown?.per && <BreakdownRow label="PER" note={stock.breakdown.per.note} points={stock.breakdown.per.points} />}
                          {stock.breakdown?.pbv && <BreakdownRow label="PBV" note={stock.breakdown.pbv.note} points={stock.breakdown.pbv.points} />}
                          {stock.breakdown?.roe && <BreakdownRow label="ROE" note={stock.breakdown.roe.note} points={stock.breakdown.roe.points} />}
                          {stock.breakdown?.der && <BreakdownRow label="DER" note={stock.breakdown.der.note} points={stock.breakdown.der.points} />}
                          {stock.breakdown?.npm && <BreakdownRow label="NPM" note={stock.breakdown.npm.note} points={stock.breakdown.npm.points} />}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Deep Fundamental | Strategy Logic */}
          <div className="lg:col-span-8">
            <div className="terminal-panel rounded-[2.5rem] p-4 sm:p-6 lg:p-10 h-full">
              <div className="flex items-center gap-3 mb-6 sm:mb-10">
                <div className="h-1.5 w-10 rounded-full bg-sky-500" />
                <div className="terminal-title">Deep fundamental Diagnostics</div>
              </div>

              {stock.type === 'ETF' ? (
                <FundaTable rows={[
                  { label: 'Expense', value: `${(stock.expense_ratio || 0).toFixed(2)}%`, status: 'Ratio' },
                  { label: 'AUM', value: `Rp${(stock.aum / 1e12).toFixed(1)}T`, status: 'Assets' },
                  { label: 'Yield', value: `${(stock.dividend_yield || 0).toFixed(1)}%`, status: 'Div' },
                  { label: 'NAV', value: stock.nav?.toLocaleString() || '--', status: 'Net Value' },
                  { label: 'Score', value: `${stock.fundamental_score}/5`, status: 'Rating', valueClassName: 'text-sky-400' },
                ]} />
              ) : (
                <FundaTable rows={[
                  { label: 'Market Cap', value: formatMarketCap(stock.market_cap), status: 'Size', valueClassName: 'text-amber-400' },
                  { label: 'PER (TTM)', value: formatMultiple(stock.per), status: 'Earnings' },
                  { label: 'Forward PER', value: formatMultiple(stock.forward_per), status: 'Forward' },
                  { label: 'EV/EBITDA', value: formatMultiple(stock.ev_ebitda), status: 'Enterprise' },
                  { label: 'P/BV', value: formatMultiple(stock.pbv), status: 'Book' },
                  { label: 'ROE', value: stock.roe != null ? `${(stock.roe * 100).toFixed(1)}%` : '--', status: 'Return' },
                  { label: 'Net Margin', value: stock.npm != null ? `${stock.npm.toFixed(1)}%` : '--', status: 'Profitability' },
                  { label: 'Rev Growth (YoY)', value: formatPct(stock.revenue_growth), status: 'YoY' },
                  { label: 'Current Ratio', value: formatMultiple(stock.current_ratio), status: 'Liquidity' },
                  { label: 'DER', value: stock.der?.toFixed(2) || '--', status: 'Leverage' },
                  { label: 'Div. Yield', value: stock.dividend_yield != null ? `${stock.dividend_yield.toFixed(2)}%` : '--', status: 'Income' },
                  { label: '52W Return', value: formatPct(stock.week_52_return), status: 'Performance' },
                  { label: 'Score', value: `${stock.fundamental_score}/5`, status: 'Rating', valueClassName: 'text-sky-400' },
                ]} />
              )}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-8">
            {/* Strategy Logic Panel */}
            <div className="terminal-panel rounded-[2.5rem] p-4 sm:p-6 lg:p-10 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6 sm:mb-10 shrink-0">
                <div className="w-10 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_var(--terminal-green)]" />
                <div className="terminal-title">Strategy Logic</div>
              </div>
              <div className="space-y-6">
                <SignalList title="Strengths" titleClassName="text-emerald-400" items={positiveSignals} emptyText="No major bullish catalysts" />
                <SignalList title="Risks" titleClassName="text-rose-400" items={riskSignals} emptyText="No immediate risk alerts" />
              </div>
            </div>
          </div>

          {/* ETF Holdings Section */}
          {stock.type === 'ETF' && stock.holdings && stock.holdings.length > 0 && (
            <div className="lg:col-span-12">
              <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-4 sm:p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 rounded-full bg-sky-500" />
                    <div className="terminal-title">Portfolio Composition</div>
                    <span className="font-mono text-[10px] text-slate-500 ml-2">({stock.holdings.length} Assets)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-5">
                  {stock.holdings.slice(0, 10).map((holding, idx) => (
                    <div key={holding.symbol || idx} className="p-4 transition-all border rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-sky-400">{holding.symbol || 'N/A'}</span>
                        <span className="font-mono text-[10px] text-emerald-400">{(holding.weight * 100).toFixed(2)}%</span>
                      </div>
                      <div className="font-mono text-[9px] text-slate-500 truncate group-hover:text-slate-300 transition-colors">
                        {holding.name || 'Unknown Asset'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* News Intelligence Section */}
          <div className="lg:col-span-12">
            <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 rounded-full bg-[var(--terminal-accent)]" />
                  <div className="terminal-title">News Intelligence</div>
                  {!newsLoading && (
                    <span className="font-mono text-[10px] text-slate-500 ml-2">({newsArticles.length} Articles)</span>
                  )}
                </div>
              </div>

              {newsLoading ? (
                <div className="flex items-center gap-3 py-8">
                  <div className="h-2 w-2 rounded-full bg-[var(--terminal-accent)] animate-pulse" />
                  <span className="font-mono text-xs text-slate-500">Loading news...</span>
                </div>
              ) : newsArticles.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="font-mono text-[11px] text-slate-600">No relevant news articles found for {stock.ticker || stock.stock}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {newsArticles.map((article) => {
                    const isExpanded = expandedNews === article.uuid
                    const sigColor = article.signal === 'BULLISH' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                      : article.signal === 'BEARISH' ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                      : 'text-slate-400 border-slate-500/30 bg-slate-500/10'

                    return (
                      <div key={article.uuid} className="overflow-hidden rounded-2xl border border-white/5 transition-all hover:border-white/10">
                        <button
                          onClick={() => setExpandedNews(isExpanded ? null : article.uuid)}
                          className="w-full flex items-start gap-4 p-5 text-left transition-colors hover:bg-white/[0.02]"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1.5">
                              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--terminal-accent)]">{article.publisher || 'Yahoo Finance'}</span>
                              {article.published_at && (
                                <>
                                  <span className="text-slate-600 text-[9px]">/</span>
                                  <span className="font-mono text-[9px] text-slate-500">{new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              )}
                            </div>
                            <div className="font-mono text-sm font-bold text-white leading-relaxed">{article.title}</div>
                          </div>
                          <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-widest ${sigColor}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${article.signal === 'BULLISH' ? 'bg-emerald-500' : article.signal === 'BEARISH' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                            {article.signal || 'NEUTRAL'}
                          </div>
                          <svg
                            className={`h-4 w-4 mt-1 text-slate-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-white/5 px-5 py-5 space-y-5 animate-in fade-in slide-in-from-top-2">
                            {/* Score & Confidence */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                                <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-1">Score</div>
                                <div className={`font-mono text-xl font-black ${article.score > 0 ? 'text-emerald-400' : article.score < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                  {article.score != null ? article.score.toFixed(2) : '--'}
                                </div>
                              </div>
                              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                                <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-1">Confidence</div>
                                <div className="font-mono text-xl font-black text-amber-400">{article.confidence != null ? `${article.confidence}%` : '--'}</div>
                              </div>
                              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                                <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-1">Signal</div>
                                <div className={`font-mono text-xl font-black ${article.signal === 'BULLISH' ? 'text-emerald-400' : article.signal === 'BEARISH' ? 'text-rose-400' : 'text-slate-400'}`}>
                                  {article.signal || 'NEUTRAL'}
                                </div>
                              </div>
                            </div>

                            {/* Triggers */}
                            {article.triggers && article.triggers.length > 0 && (
                              <div>
                                <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-3">Detected Triggers</div>
                                <div className="flex flex-wrap gap-2">
                                  {article.triggers.map((t, i) => (
                                    <span
                                      key={i}
                                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                                        t.type === 'positive'
                                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                                          : 'border-rose-500/20 bg-rose-500/5 text-rose-400'
                                      }`}
                                    >
                                      {t.type === 'positive' ? '↑' : '↓'} {t.label} ({t.score > 0 ? '+' : ''}{t.score})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Sectors */}
                            {article.sectors && article.sectors.length > 0 && (
                              <div>
                                <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-3">Affected Sectors</div>
                                <div className="flex flex-wrap gap-2">
                                  {article.sectors.map((s, i) => (
                                    <span
                                      key={i}
                                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                                        s.direction === 'BULLISH'
                                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                                          : 'border-rose-500/20 bg-rose-500/5 text-rose-400'
                                      }`}
                                    >
                                      {s.direction === 'BULLISH' ? '↑' : '↓'} {s.sector}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Affected Stocks */}
                            {article.stocks && article.stocks.length > 0 && (
                              <div>
                                <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-3">Affected Stocks</div>
                                <div className="flex flex-wrap gap-2">
                                  {article.stocks.map((s, i) => (
                                    <span
                                      key={i}
                                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide ${
                                        s.signal === 'BULLISH'
                                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                                          : s.signal === 'BEARISH'
                                          ? 'border-rose-500/20 bg-rose-500/5 text-rose-400'
                                          : 'border-slate-500/20 bg-slate-500/5 text-slate-400'
                                      }`}
                                    >
                                      {s.ticker} ({s.score > 0 ? '+' : ''}{s.score})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Link */}
                            {article.link && (
                              <div className="pt-2">
                                <a
                                  href={article.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-all hover:border-[var(--terminal-accent)] hover:text-[var(--terminal-accent)] hover:bg-[var(--terminal-accent-soft)]"
                                >
                                  Read Full Article
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12 mt-20 border-t border-white/5 bg-black/20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-4 text-sm font-bold tracking-widest uppercase font-display text-white/20">
            NASDAQ Intel Terminal
          </div>
          <div className="font-mono text-[10px] text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Data provided for informational purposes only. Investment in financial markets involves risk.
            Always conduct your own research or consult with a certified financial advisor.
            &copy; 2024 NASDAQ Intel &bull; Premium Analytics Engine
          </div>
        </div>
      </footer>
    </div>
  )
}
