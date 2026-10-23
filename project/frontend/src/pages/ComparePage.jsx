import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import axios from 'axios'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import CompareMetricCard from '../components/CompareMetricCard'

const MAX_STOCKS = 6
const MIN_STOCKS = 2

const PALETTE = [
  { stroke: '#00c8ff', fill: 'grad0' },
  { stroke: '#31d17c', fill: 'grad1' },
  { stroke: '#f5a524', fill: 'grad2' },
  { stroke: '#f655a6', fill: 'grad3' },
  { stroke: '#a855f7', fill: 'grad4' },
  { stroke: '#ff6b6b', fill: 'grad5' },
]

const SIGNAL_STYLES = {
  BUY: { text: 'text-[var(--terminal-green)]', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'BUY' },
  HOLD: { text: 'text-[var(--terminal-yellow)]', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'HOLD' },
  SELL: { text: 'text-[var(--terminal-red)]', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'SELL' },
}

const formatMarketCap = (mc) => {
  if (mc == null) return '--'
  if (mc >= 1e12) return `$${(mc / 1e12).toFixed(2)}T`
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(0)}M`
  return `$${Number(mc).toLocaleString()}`
}

const formatPct = (v, decimals = 2) => {
  if (v == null || isNaN(v)) return '--'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(decimals)}%`
}

const formatMultiple = (v) => {
  if (v == null || isNaN(v)) return '--'
  return `${v.toFixed(1)}x`
}

const TABLE_ROWS = [
  { key: 'score', label: 'Composite Score', format: (v) => `${v}/15`, higherIsBetter: true },
  { key: 'technical_score', label: 'Technical Score', format: (v) => `${v}/5`, higherIsBetter: true },
  { key: 'fundamental_score', label: 'Fundamental Score', format: (v) => `${v}/5`, higherIsBetter: true },
  { key: 'rsi', label: 'RSI (14)', format: (v) => v.toFixed(1), higherIsBetter: null },
  { key: 'last_close', label: 'Price', format: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, higherIsBetter: null },
  { key: 'market_cap', label: 'Market Cap', format: formatMarketCap, higherIsBetter: true },
  { key: 'change_1d', label: '1D Change', format: (v) => formatPct(v), higherIsBetter: true },
  { key: 'momentum_20d', label: '20D Momentum', format: (v) => formatPct(v), higherIsBetter: true },
  { key: 'week_52_return', label: '52W Return', format: (v) => formatPct(v), higherIsBetter: true },
  { key: 'per', label: 'PER (TTM)', format: formatMultiple, higherIsBetter: false },
  { key: 'forward_per', label: 'Forward PER', format: formatMultiple, higherIsBetter: false },
  { key: 'ev_ebitda', label: 'EV/EBITDA', format: formatMultiple, higherIsBetter: false },
  { key: 'pbv', label: 'P/BV', format: formatMultiple, higherIsBetter: false },
  { key: 'roe', label: 'ROE', format: (v) => `${(v * 100).toFixed(1)}%`, higherIsBetter: true },
  { key: 'npm', label: 'Net Margin', format: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
  { key: 'revenue_growth', label: 'Rev Growth (YoY)', format: (v) => formatPct(v), higherIsBetter: true },
  { key: 'current_ratio', label: 'Current Ratio', format: formatMultiple, higherIsBetter: true },
  { key: 'der', label: 'DER', format: (v) => v.toFixed(2), higherIsBetter: false },
  { key: 'dividend_yield', label: 'Div. Yield', format: (v) => `${v.toFixed(2)}%`, higherIsBetter: true },
]

const QUICK_METRICS = [
  { key: 'score', label: 'Score', format: (v) => v.toFixed(1) },
  { key: 'last_close', label: 'Price', format: (v) => `$${v.toFixed(2)}`, higherIsBetter: null },
  { key: 'rsi', label: 'RSI', format: (v) => v.toFixed(1), higherIsBetter: null },
  { key: 'change_1d', label: '1D %', format: (v) => formatPct(v) },
  { key: 'market_cap', label: 'Mkt Cap', format: formatMarketCap },
]

function StockSelector({ label, stocks, selected, onSelect, accentColor, onRemove }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return stocks.slice(0, 50)
    const q = query.toLowerCase()
    return stocks.filter(s =>
      (s.ticker || s.stock || '').toLowerCase().includes(q) ||
      (s.name || '').toLowerCase().includes(q)
    ).slice(0, 50)
  }, [query, stocks])

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (stock) => {
    onSelect(stock)
    setOpen(false)
    setQuery('')
  }

  const sigStyle = selected ? (SIGNAL_STYLES[selected.signal] || SIGNAL_STYLES.HOLD) : null

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[180px]">
      <label className="block mb-1.5 font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </label>

      {selected ? (
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
            />
            <div className="min-w-0 text-left">
              <div className="font-mono text-sm font-black text-white truncate">{selected.ticker || selected.stock}</div>
              <div className="font-mono text-[10px] text-slate-500 truncate">{selected.name || 'Unknown'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded ${sigStyle.bg} ${sigStyle.text} ${sigStyle.border} border`}>
              {sigStyle.label}
            </span>
            <span className="font-mono text-sm font-black text-white">{selected.score?.toFixed(1) ?? '--'}</span>
            {onRemove && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onRemove() }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onRemove() } }}
                className="text-slate-600 hover:text-[var(--terminal-red)] transition-colors p-0.5"
                title="Remove"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            )}
            <svg className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      ) : (
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02] hover:border-[var(--terminal-accent)]/30 transition-all"
        >
          <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <span className="font-mono text-xs text-slate-500">Search ticker...</span>
        </button>
      )}

      {open && (
        <div className="absolute z-[100] mt-1 w-full rounded-xl border border-white/10 bg-[#0a0d14] shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="p-2 border-b border-white/5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type ticker or name..."
              className="w-full px-3 py-2 rounded-lg font-mono text-xs bg-white/[0.03] border border-white/10 text-white placeholder:text-slate-600 focus:border-[var(--terminal-accent)]/40 focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 font-mono text-xs text-slate-600 text-center">No matches</div>
            ) : (
              filtered.map(stock => {
                const sig = SIGNAL_STYLES[stock.signal] || SIGNAL_STYLES.HOLD
                return (
                  <button
                    key={stock.ticker || stock.stock}
                    onClick={() => handleSelect(stock)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-white">{stock.ticker || stock.stock}</div>
                      <div className="font-mono text-[10px] text-slate-500 truncate">{stock.name || 'Unknown'}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${sig.bg} ${sig.text}`}>{sig.label}</span>
                      <span className="font-mono text-xs font-black text-slate-400">{stock.score?.toFixed(1)}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ComparisonTableRow({ row, stocks, colors }) {
  const fmt = (v) => {
    if (v == null || (typeof v === 'number' && isNaN(v))) return '--'
    return row.format ? row.format(v) : String(v)
  }

  const nums = stocks.map(s => {
    const v = s?.[row.key]
    return typeof v === 'number' ? v : null
  })

  let bestIdx = null
  if (row.higherIsBetter !== null) {
    const validIdxs = nums.map((n, i) => (n != null ? i : -1)).filter(i => i >= 0)
    if (validIdxs.length >= 2) {
      let best = validIdxs[0]
      for (const i of validIdxs) {
        if (row.higherIsBetter ? nums[i] > nums[best] : nums[i] < nums[best]) best = i
      }
      const bestVal = nums[best]
      bestIdx = validIdxs.filter(i => nums[i] === bestVal).length === 1 ? best : null
    }
  }

  return (
    <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
      <td className="py-3 px-4 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
        {row.label}
      </td>
      {stocks.map((s, i) => {
        const v = s?.[row.key]
        const isBest = bestIdx === i
        return (
          <td
            key={i}
            className={`py-3 px-4 text-right font-mono text-xs sm:text-sm font-black transition-all ${
              isBest ? 'text-[var(--terminal-green)]' : 'text-white'
            }`}
            style={isBest ? {} : { color: undefined }}
          >
            <span className={isBest ? 'glow-green' : ''}>{fmt(v)}</span>
          </td>
        )
      })}
    </tr>
  )
}

function CorrelationMatrix({ tickers, edges }) {
  const getCorr = (a, b) => {
    if (a === b) return 1
    const edge = edges?.find(e =>
      (e.source === a && e.target === b) || (e.source === b && e.target === a)
    )
    return edge?.correlation ?? null
  }

  const cellColor = (c) => {
    if (c == null) return 'rgba(127,138,163,0.08)'
    if (c >= 0.5) return `rgba(49,209,124,${0.15 + Math.min(Math.abs(c), 1) * 0.35})`
    if (c <= -0.3) return `rgba(244,63,94,${0.15 + Math.min(Math.abs(c), 1) * 0.35})`
    return 'rgba(0,200,255,0.08)'
  }

  const cellText = (c) => {
    if (c == null) return 'text-slate-600'
    if (c >= 0.5) return 'text-[var(--terminal-green)]'
    if (c <= -0.3) return 'text-[var(--terminal-red)]'
    return 'text-[var(--terminal-accent)]'
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="p-1" />
            {tickers.map((t, i) => (
              <th key={i} className="p-1">
                <div className="font-mono text-[9px] font-black uppercase tracking-wider text-center" style={{ color: PALETTE[i].stroke }}>
                  {t}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickers.map((rowTicker, r) => (
            <tr key={r}>
              <td className="p-1">
                <div className="font-mono text-[9px] font-black uppercase tracking-wider text-center" style={{ color: PALETTE[r].stroke }}>
                  {rowTicker}
                </div>
              </td>
              {tickers.map((colTicker, c) => {
                const corr = getCorr(rowTicker, colTicker)
                return (
                  <td key={c} className="p-0.5">
                    <div
                      className="w-12 h-10 sm:w-14 sm:h-12 flex items-center justify-center rounded-md font-mono text-[9px] sm:text-[10px] font-black"
                      style={{ backgroundColor: cellColor(corr) }}
                      title={corr != null ? `${rowTicker} vs ${colTicker}: ${corr.toFixed(3)}` : `${rowTicker} vs ${colTicker}: N/A`}
                    >
                      <span className={cellText(corr)}>
                        {corr != null ? corr.toFixed(2) : '--'}
                      </span>
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PairwiseCorrelation({ a, b, edges }) {
  const edge = edges?.find(e =>
    (e.source === a && e.target === b) || (e.source === b && e.target === a)
  )
  const corr = edge?.correlation ?? null
  return (
    <div className="glass-card p-3 sm:p-4 flex flex-col justify-center items-center min-w-[140px] flex-1">
      <div className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 text-center">
        Correlation
      </div>
      {corr != null ? (
        <div
          className={`font-mono text-base sm:text-lg lg:text-xl font-black tracking-tight ${
            corr >= 0.5 ? 'text-[var(--terminal-green)] glow-green' :
            corr <= -0.3 ? 'text-[var(--terminal-red)] glow-red' :
            'text-[var(--terminal-accent)]'
          }`}
        >
          {corr >= 0 ? '+' : ''}{corr.toFixed(3)}
        </div>
      ) : (
        <div className="font-mono text-sm font-bold text-slate-600">N/A</div>
      )}
      <div className="mt-1 font-mono text-[9px] uppercase tracking-widest text-slate-600">
        {corr != null ? (Math.abs(corr) >= 0.5 ? 'strong' : Math.abs(corr) >= 0.3 ? 'moderate' : 'weak') : 'no edge'}
      </div>
    </div>
  )
}

export default function ComparePage() {
  const [rankings, setRankings] = useState([])
  const [corrData, setCorrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stocks, setStocks] = useState([])

  const loadData = useCallback(async () => {
    const cacheKey = Date.now()
    try {
      const [rankRes, corrRes] = await Promise.all([
        axios.get(`/output/ranking.json?t=${cacheKey}`),
        axios.get(`/output/correlations.json?t=${cacheKey}`).catch(() => null),
      ])
      const data = rankRes.data
      const rawList = Array.isArray(data) ? data : (data.rankings || data.data || data.rows || [])
      const rankList = rawList.map(row => ({
        ...row,
        stock: row.stock || row.ticker || 'UNKNOWN',
        ticker: row.ticker || row.stock || 'UNKNOWN',
        score: Number(row.score ?? 0),
      }))
      setRankings(rankList)
      if (corrRes?.data) setCorrData(corrRes.data)
      setError(null)
      setStocks(prev => prev.map(s => rankList.find(r => r.ticker === (s.ticker || s.stock)) || s))
    } catch (err) {
      setError(`Failed to load data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const POLL_INTERVAL = 90 * 1000
    let timer = null
    const poll = () => {
      if (document.visibilityState === 'visible') loadData()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    timer = setInterval(poll, POLL_INTERVAL)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [loadData])

  const tickers = useMemo(() => stocks.map(s => s.ticker || s.stock), [stocks])
  const colors = useMemo(() => stocks.map((_, i) => PALETTE[i % PALETTE.length].stroke), [stocks.length])

  const addStock = (stock) => {
    setStocks(prev => {
      if (prev.some(s => (s.ticker || s.stock) === (stock.ticker || stock.stock))) return prev
      if (prev.length >= MAX_STOCKS) return prev
      return [...prev, stock]
    })
  }

  const removeStock = (idx) => {
    setStocks(prev => prev.filter((_, i) => i !== idx))
  }

  const chartData = useMemo(() => {
    if (stocks.length < MIN_STOCKS) return []
    if (stocks.some(s => !s.price_history)) return []
    const maps = stocks.map(s => {
      const m = new Map()
      ;(s.price_history || []).forEach(p => {
        const d = String(p.date).split(' ')[0]
        m.set(d, Number(p.close))
      })
      return m
    })
    const allDates = new Set()
    maps.forEach(m => m.forEach((_, d) => allDates.add(d)))
    const dates = [...allDates].sort()
    const bases = new Array(stocks.length).fill(null)
    const result = []
    for (const d of dates) {
      const row = { date: d }
      let allBasesSet = true
      for (let i = 0; i < stocks.length; i++) {
        const p = maps[i].get(d)
        if (p != null && bases[i] == null) bases[i] = p
        if (bases[i] == null) allBasesSet = false
      }
      if (!allBasesSet) continue
      for (let i = 0; i < stocks.length; i++) {
        const p = maps[i].get(d)
        row[`${tickers[i]}__${i}`] = p != null ? ((p - bases[i]) / bases[i]) * 100 : null
      }
      result.push(row)
    }
    return result
  }, [stocks, tickers])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--terminal-bg)]">
        <div className="text-center animate-fade-in">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-[var(--terminal-accent)] blur-2xl opacity-20 animate-pulse" />
            <div className="relative h-14 w-14 animate-spin rounded-full border-b-2 border-t-2 border-[var(--terminal-accent)] shadow-[0_0_20px_var(--terminal-accent-soft)]" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--terminal-muted)]">Loading comparison engine...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--terminal-bg)] p-8">
        <div className="max-w-lg p-10 text-center rounded-3xl terminal-panel animate-fade-in">
          <div className="mb-6 font-mono text-3xl font-black tracking-[0.3em] text-[var(--terminal-red)] glow-red">ERR</div>
          <p className="mb-8 font-mono text-xs text-slate-400">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest bg-[var(--terminal-accent)]/10 text-[var(--terminal-accent)] border border-[var(--terminal-accent)]/20 hover:bg-[var(--terminal-accent)]/20 transition-colors">
            Retry
          </button>
        </div>
      </div>
    )
  }

  const ready = stocks.length >= MIN_STOCKS

  return (
    <div className="min-h-screen bg-[var(--terminal-bg)] text-[var(--terminal-text)] selection:bg-[var(--terminal-accent)] selection:text-black">
      <main className="mx-auto max-w-[1600px] px-1 sm:px-2 lg:px-3 py-4 sm:py-6 lg:py-8 animate-fade-in">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Header */}
          <section className="w-full relative z-50">
            <div className="terminal-panel rounded-2xl sm:rounded-3xl p-3 sm:p-5 lg:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                <div className="terminal-title text-[8px] sm:text-[10px]">Multi-Stock Comparison</div>
              </div>
              <p className="font-mono text-xs text-[var(--terminal-muted)] uppercase tracking-[0.18em] mb-4 sm:mb-5">
                Compare {MIN_STOCKS}–{MAX_STOCKS} stocks side by side
              </p>

              {/* Selectors */}
              <div className="flex flex-wrap items-stretch gap-3 sm:gap-4">
                {stocks.map((s, i) => (
                  <StockSelector
                    key={`${i}-${s.ticker || s.stock}`}
                    label={`Stock ${String.fromCharCode(65 + i)}`}
                    stocks={rankings}
                    selected={s}
                    onSelect={(stock) => setStocks(prev => prev.map((p, idx) => idx === i ? stock : p))}
                    accentColor={PALETTE[i % PALETTE.length].stroke}
                    onRemove={() => removeStock(i)}
                  />
                ))}
                {stocks.length < MAX_STOCKS && (
                  <StockSelector
                    label={`Stock ${String.fromCharCode(65 + stocks.length)}`}
                    stocks={rankings}
                    selected={null}
                    onSelect={addStock}
                    accentColor={PALETTE[stocks.length % PALETTE.length].stroke}
                  />
                )}
              </div>
            </div>
          </section>

          {!ready ? (
            <section className="w-full">
              <div className="terminal-panel rounded-2xl sm:rounded-3xl p-10 sm:p-16 text-center">
                <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-2xl border border-white/5 bg-white/[0.02]">
                  <svg className="h-7 w-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 12h12l3-12M3 6l2-3h14l2 3M3 6h18" />
                  </svg>
                </div>
                <p className="font-mono text-sm text-slate-500 mb-2">Select {MIN_STOCKS} or more stocks to begin comparison</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Use the selectors above to add up to {MAX_STOCKS} stocks</p>
              </div>
            </section>
          ) : (
            <>
              {/* Quick metrics + Correlation */}
              <section className="w-full">
                <div className="flex flex-wrap gap-2 sm:gap-3 items-stretch">
                  {QUICK_METRICS.map(m => (
                    <CompareMetricCard
                      key={m.key}
                      label={m.label}
                      values={stocks.map(s => s[m.key])}
                      colors={colors}
                      format={m.format}
                      higherIsBetter={m.higherIsBetter ?? true}
                    />
                  ))}

                  {stocks.length === 2 ? (
                    <PairwiseCorrelation
                      a={tickers[0]}
                      b={tickers[1]}
                      edges={corrData?.edges}
                    />
                  ) : (
                    <div className="glass-card p-3 sm:p-4 flex flex-col justify-center items-center min-w-[140px] flex-1">
                      <div className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 text-center">
                        Avg Correlation
                      </div>
                      {(() => {
                        const corrs = []
                        for (let i = 0; i < tickers.length; i++) {
                          for (let j = i + 1; j < tickers.length; j++) {
                            const edge = corrData?.edges?.find(e =>
                              (e.source === tickers[i] && e.target === tickers[j]) ||
                              (e.source === tickers[j] && e.target === tickers[i])
                            )
                            if (edge?.correlation != null) corrs.push(edge.correlation)
                          }
                        }
                        const avg = corrs.length ? corrs.reduce((a, b) => a + b, 0) / corrs.length : null
                        return avg != null ? (
                          <div
                            className={`font-mono text-base sm:text-lg lg:text-xl font-black tracking-tight ${
                              avg >= 0.5 ? 'text-[var(--terminal-green)] glow-green' :
                              avg <= -0.3 ? 'text-[var(--terminal-red)] glow-red' :
                              'text-[var(--terminal-accent)]'
                            }`}
                          >
                            {avg >= 0 ? '+' : ''}{avg.toFixed(3)}
                          </div>
                        ) : (
                          <div className="font-mono text-sm font-bold text-slate-600">N/A</div>
                        )
                      })()}
                      <div className="mt-1 font-mono text-[9px] uppercase tracking-widest text-slate-600">
                        {tickers.length} stocks · see matrix below
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Normalized Price Chart */}
              {chartData.length > 1 && (
                <section className="w-full">
                  <div className="terminal-panel rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4">
                      <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                      <div className="terminal-title text-[8px] sm:text-[10px]">Normalized Performance</div>
                      <span className="ml-auto font-mono text-[9px] text-slate-600">% from start</span>
                    </div>
                    <div className="h-[280px] sm:h-[340px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            {PALETTE.slice(0, stocks.length).map((p, i) => (
                              <linearGradient key={p.fill} id={p.fill} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={p.stroke} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={p.stroke} stopOpacity={0} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,255,0.06)" />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: '#7f8aa3', fontSize: 9, fontFamily: "'Geist Mono', monospace" }}
                            axisLine={{ stroke: '#273041' }}
                            tickLine={false}
                            minTickGap={50}
                          />
                          <YAxis
                            tick={{ fill: '#7f8aa3', fontSize: 9, fontFamily: "'Geist Mono', monospace" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              background: 'rgba(10,13,20,0.95)',
                              border: '1px solid rgba(39,48,65,0.4)',
                              borderRadius: '12px',
                              fontFamily: "'Geist Mono', monospace",
                            }}
                            labelStyle={{ color: '#7f8aa3', fontSize: 10 }}
                            formatter={(value, name) => {
                              const parts = String(name).split('__')
                              const ticker = parts[0]
                              return [`${value > 0 ? '+' : ''}${value.toFixed(2)}%`, ticker]
                            }}
                          />
                          <Legend
                            formatter={(value) => {
                              const parts = String(value).split('__')
                              const ticker = parts[0]
                              const idx = Number(parts[1]) || 0
                              return (
                                <span style={{ color: PALETTE[idx % PALETTE.length].stroke, fontFamily: "'Geist Mono', monospace", fontSize: 11, fontWeight: 700 }}>
                                  {ticker}
                                </span>
                              )
                            }}
                          />
                          {stocks.map((s, i) => {
                            const key = `${tickers[i]}__${i}`
                            const p = PALETTE[i % PALETTE.length]
                            return (
                              <Area
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={p.stroke}
                                strokeWidth={2}
                                fill={`url(#${p.fill})`}
                                dot={false}
                              />
                            )
                          })}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>
              )}

              {/* Correlation Matrix (3+ stocks) */}
              {stocks.length >= 3 && corrData?.edges && (
                <section className="w-full">
                  <div className="terminal-panel rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4">
                      <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                      <div className="terminal-title text-[8px] sm:text-[10px]">Correlation Matrix</div>
                      <span className="ml-auto font-mono text-[9px] text-slate-600">pairwise · {tickers.length}×{tickers.length}</span>
                    </div>
                    <CorrelationMatrix tickers={tickers} edges={corrData.edges} />
                  </div>
                </section>
              )}

              {/* Full Comparison Table */}
              <section className="w-full">
                <div className="terminal-panel rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4">
                    <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                    <div className="terminal-title text-[8px] sm:text-[10px]">Full Breakdown</div>
                    <span className="ml-auto font-mono text-[9px] text-slate-600">
                      best value highlighted per row
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px]">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="py-3 px-4 text-left font-mono text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Metric</th>
                          {tickers.map((t, i) => (
                            <th
                              key={i}
                              className="py-3 px-4 text-right font-mono text-[9px] font-black uppercase tracking-[0.2em]"
                              style={{ color: PALETTE[i % PALETTE.length].stroke }}
                            >
                              {t}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {TABLE_ROWS.map(row => (
                          <ComparisonTableRow key={row.key} row={row} stocks={stocks} colors={colors} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
