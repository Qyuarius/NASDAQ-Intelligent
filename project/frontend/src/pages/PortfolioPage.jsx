import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import axios from 'axios'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'
import { usePortfolio } from '../hooks/usePortfolio'
import StockDetailPage from './StockDetailPage'

const SIGNAL_STYLES = {
  BUY: { text: 'text-[var(--terminal-green)]', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'BUY' },
  HOLD: { text: 'text-[var(--terminal-yellow)]', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'HOLD' },
  SELL: { text: 'text-[var(--terminal-red)]', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'SELL' },
}

const SECTOR_COLORS = [
  '#00c8ff', '#31d17c', '#f5a524', '#f655a6', '#a855f7',
  '#ff6b6b', '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
  '#8b5cf6', '#06b6d4', '#84cc16', '#eab308', '#64748b',
]

const parseJsonResponse = (payload) => {
  if (typeof payload !== 'string') return payload
  try { return JSON.parse(payload) } catch { return payload }
}

const extractRankings = (payload) => {
  const data = parseJsonResponse(payload)
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.rankings)) return data.rankings
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.rows)) return data.rows
  return []
}

const formatCurrency = (n) => {
  if (n == null || isNaN(n)) return '--'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatCurrencyCompact = (n) => {
  if (n == null || isNaN(n)) return '--'
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const formatPct = (v, decimals = 2) => {
  if (v == null || isNaN(v)) return '--'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(decimals)}%`
}

function SummaryCard({ label, value, sub, valueClass = 'text-white', glow = '' }) {
  return (
    <div className="glass-card p-3 sm:p-4 flex flex-col gap-1">
      <div className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className={`font-mono text-base sm:text-lg lg:text-xl font-black tracking-tight ${valueClass} ${glow}`}>
        {value}
      </div>
      {sub && (
        <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-600">
          {sub}
        </div>
      )}
    </div>
  )
}

function AddHoldingForm({ rankings, onAdd }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [open, setOpen] = useState(false)
  const [priceLive, setPriceLive] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [liveLookupLoading, setLiveLookupLoading] = useState(false)
  const [liveError, setLiveError] = useState(null)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return rankings.slice(0, 30)
    const q = query.toLowerCase()
    return rankings.filter(s =>
      (s.ticker || '').toLowerCase().includes(q) ||
      (s.name || '').toLowerCase().includes(q)
    ).slice(0, 30)
  }, [query, rankings])

  const queryLooksLikeTicker = /^[A-Z]{1,6}([.\-][A-Z]{1,4})?$/i.test(query.trim())

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchQuote = useCallback(async (ticker) => {
    try {
      const res = await axios.get(`/api/quote/${encodeURIComponent(ticker)}`, { timeout: 12000 })
      if (res.data?.price != null) {
        return { ok: true, data: res.data }
      }
      return { ok: false, error: res.data?.error || 'No price data' }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Backend unreachable'
      return { ok: false, error: msg }
    }
  }, [])

  const handleSelect = (stock) => {
    setSelected(stock)
    setQuery('')
    setOpen(false)
    setLiveError(null)
    if (!buyPrice && stock.last_close) setBuyPrice(String(stock.last_close))
    setPriceLive(false)
  }

  const handleLiveLookup = useCallback(async (ticker) => {
    const sym = ticker.trim().toUpperCase()
    if (!sym) return
    setLiveLookupLoading(true)
    setLiveError(null)
    const res = await fetchQuote(sym)
    setLiveLookupLoading(false)
    if (res.ok) {
      const stock = {
        ticker: res.data.ticker,
        name: res.data.name || '--',
        last_close: res.data.price,
      }
      setSelected(stock)
      setBuyPrice(String(res.data.price))
      setPriceLive(true)
      setQuery('')
      setOpen(false)
    } else {
      setLiveError(res.error)
    }
  }, [fetchQuote])

  const handleMarketPrice = useCallback(async () => {
    if (!selected?.ticker) return
    setPriceLoading(true)
    setLiveError(null)
    const res = await fetchQuote(selected.ticker)
    setPriceLoading(false)
    if (res.ok) {
      setBuyPrice(String(res.data.price))
      setPriceLive(true)
    } else {
      setLiveError(res.error)
      setPriceLive(false)
    }
  }, [selected, fetchQuote])

  const handleSubmit = (e) => {
    e.preventDefault()
    const qty = parseFloat(quantity)
    const price = parseFloat(buyPrice)
    if (!selected || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) return
    onAdd(selected.ticker, qty, price)
    setSelected(null)
    setQuantity('')
    setBuyPrice('')
    setPriceLive(false)
    setLiveError(null)
  }

  const openDropdown = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch">
      {/* Ticker search — direct text input */}
      <div ref={containerRef} className="relative flex-1 min-w-[180px]">
        <label className="block mb-1 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
          Ticker
        </label>
        {selected ? (
          <div className="flex items-stretch gap-2">
            <div className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="font-mono text-sm font-black text-white truncate">{selected.ticker}</div>
                <div className="font-mono text-[10px] text-slate-500 truncate hidden sm:block">{selected.name}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-[10px] text-slate-400">${selected.last_close?.toFixed(2)}</span>
                {priceLive && (
                  <span className="font-mono text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    LIVE
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setSelected(null); setBuyPrice(''); setPriceLive(false); setLiveError(null); openDropdown() }}
              className="px-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-slate-500 hover:text-[var(--terminal-red)] hover:border-rose-500/30 transition-all"
              title="Change ticker"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); setLiveError(null) }}
              onFocus={() => setOpen(true)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (filtered.length > 0) {
                    handleSelect(filtered[0])
                  } else if (queryLooksLikeTicker) {
                    handleLiveLookup(query)
                  }
                }
              }}
              placeholder="Type ticker or name..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] font-mono text-sm text-white placeholder:text-slate-600 focus:border-[var(--terminal-accent)]/40 focus:outline-none transition-all"
            />
          </div>
        )}

        {open && !selected && (
          <div className="absolute z-[100] mt-1 w-full rounded-xl border border-white/10 bg-[#0a0d14] shadow-2xl backdrop-blur-xl overflow-hidden">
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 && !queryLooksLikeTicker ? (
                <div className="px-4 py-6 font-mono text-xs text-slate-600 text-center">No local matches</div>
              ) : (
                <>
                  {filtered.map(s => (
                    <button
                      key={s.ticker}
                      type="button"
                      onClick={() => handleSelect(s)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2 hover:bg-white/[0.04] transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-white">{s.ticker}</div>
                        <div className="font-mono text-[10px] text-slate-500 truncate">{s.name || '--'}</div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">${s.last_close?.toFixed(2)}</span>
                    </button>
                  ))}
                  {queryLooksLikeTicker && query.trim() && (
                    <button
                      type="button"
                      onClick={() => handleLiveLookup(query)}
                      disabled={liveLookupLoading}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border-t border-white/5 hover:bg-[var(--terminal-accent)]/[0.06] transition-colors text-left disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="h-3.5 w-3.5 text-[var(--terminal-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="font-mono text-xs font-bold text-[var(--terminal-accent)]">
                          {liveLookupLoading ? 'Fetching live quote...' : `Search live for ${query.trim().toUpperCase()}`}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">LIVE ↵</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {liveError && !selected && (
          <p className="mt-1.5 font-mono text-[10px] text-[var(--terminal-red)]">
            {liveError}
            {queryLooksLikeTicker && (
              <button type="button" onClick={() => handleLiveLookup(query)} className="ml-2 underline hover:text-rose-300">retry</button>
            )}
          </p>
        )}
      </div>

      {/* Quantity */}
      <div className="w-full sm:w-28">
        <label className="block mb-1 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
          Quantity
        </label>
        <input
          type="number"
          step="any"
          min="0"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          placeholder="0"
          className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] font-mono text-sm text-white placeholder:text-slate-600 focus:border-[var(--terminal-accent)]/40 focus:outline-none"
        />
      </div>

      {/* Buy price + Market button */}
      <div className="w-full sm:w-auto sm:flex sm:items-stretch">
        <div className="flex flex-col">
          <label className="block mb-1 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            Buy Price
            {priceLive && (
              <span className="ml-1.5 font-mono text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                LIVE
              </span>
            )}
          </label>
          <div className="flex items-stretch gap-1.5">
            <input
              type="number"
              step="any"
              min="0"
              value={buyPrice}
              onChange={e => { setBuyPrice(e.target.value); setPriceLive(false) }}
              placeholder="0.00"
              className="w-full sm:w-28 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] font-mono text-sm text-white placeholder:text-slate-600 focus:border-[var(--terminal-accent)]/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleMarketPrice}
              disabled={!selected || priceLoading}
              title={selected ? `Fetch live market price for ${selected.ticker}` : 'Select a ticker first'}
              className="px-3 rounded-xl border border-[var(--terminal-accent)]/20 bg-[var(--terminal-accent)]/5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--terminal-accent)] transition-all hover:bg-[var(--terminal-accent)]/15 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {priceLoading ? '...' : 'Market'}
            </button>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-end">
        <button
          type="submit"
          disabled={!selected || !quantity || !buyPrice}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--terminal-accent)]/30 bg-[var(--terminal-accent)]/10 font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--terminal-accent)] transition-all hover:bg-[var(--terminal-accent)]/20 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          + Add
        </button>
      </div>
    </form>
  )
}

function AllocationBar({ label, value, maxValue, color, weight }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="w-20 sm:w-28 truncate font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/70">
        {label}
      </div>
      <div className="flex-1 h-5 rounded-md bg-white/[0.03] overflow-hidden relative">
        <div
          className="h-full rounded-md transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-16 sm:w-20 text-right font-mono text-[10px] sm:text-[11px] font-black text-white/80 tabular-nums">
        {weight.toFixed(1)}%
      </div>
      <div className="w-20 sm:w-28 text-right font-mono text-[10px] sm:text-[11px] font-bold text-slate-400 tabular-nums hidden sm:block">
        {formatCurrencyCompact(value)}
      </div>
    </div>
  )
}

export default function PortfolioPage() {
  const { holdings, addHolding, removeHolding, clearAll } = usePortfolio()
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [detailStock, setDetailStock] = useState(null)
  const [livePrices, setLivePrices] = useState({})
  const [refreshingPrices, setRefreshingPrices] = useState(false)
  const [refreshNotice, setRefreshNotice] = useState(null)

  const loadData = useCallback(async () => {
    try {
      const cacheKey = Date.now()
      const res = await axios.get(`/output/ranking.json?t=${cacheKey}`)
      const rawList = extractRankings(res.data)
      const rankList = rawList.map(row => ({
        ...row,
        ticker: row.ticker || row.stock || 'UNKNOWN',
        score: Number(row.score ?? 0),
      }))
      setRankings(rankList)
      setError(null)
    } catch (err) {
      setError(`Failed to load data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const POLL_INTERVAL = 90 * 1000
    const poll = () => { if (document.visibilityState === 'visible') loadData() }
    const onVis = () => { if (document.visibilityState === 'visible') poll() }
    document.addEventListener('visibilitychange', onVis)
    const timer = setInterval(poll, POLL_INTERVAL)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [loadData])

  const refreshAllPrices = useCallback(async () => {
    if (holdings.length === 0) return
    setRefreshingPrices(true)
    setRefreshNotice(null)
    const tickers = holdings.map(h => h.ticker)
    const results = await Promise.all(
      tickers.map(t =>
        axios.get(`/api/quote/${encodeURIComponent(t)}`, { timeout: 12000 })
          .then(res => ({ ticker: t, price: res.data?.price ?? null, ok: true }))
          .catch(err => ({ ticker: t, price: null, ok: false, error: err.response?.data?.error || err.message }))
      )
    )
    const newPrices = {}
    let okCount = 0
    let failCount = 0
    for (const r of results) {
      if (r.ok && r.price != null) {
        newPrices[r.ticker] = r.price
        okCount++
      } else {
        failCount++
      }
    }
    setLivePrices(newPrices)
    setRefreshingPrices(false)
    if (failCount === 0) {
      setRefreshNotice({ type: 'ok', text: `Refreshed ${okCount} live price${okCount !== 1 ? 's' : ''}` })
    } else if (okCount === 0) {
      setRefreshNotice({ type: 'error', text: `Failed to fetch live prices (backend offline?)` })
    } else {
      setRefreshNotice({ type: 'partial', text: `Refreshed ${okCount} · ${failCount} failed` })
    }
    setTimeout(() => setRefreshNotice(null), 5000)
  }, [holdings])

  // Join holdings with live ranking data
  const enrichedHoldings = useMemo(() => {
    const rankMap = new Map(rankings.map(r => [r.ticker, r]))
    return holdings.map(h => {
      const stock = rankMap.get(h.ticker)
      const livePrice = livePrices[h.ticker]
      const currentPrice = livePrice ?? stock?.last_close ?? h.buyPrice
      const marketValue = currentPrice * h.quantity
      const costBasis = h.buyPrice * h.quantity
      const pnl = marketValue - costBasis
      const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
      return {
        ...h,
        name: stock?.name || '--',
        sector: stock?.sector || 'Unknown',
        signal: stock?.signal || 'HOLD',
        score: stock?.score ?? 0,
        currentPrice,
        priceSource: livePrice != null ? 'live' : (stock?.last_close != null ? 'cached' : 'cost'),
        marketValue,
        costBasis,
        pnl,
        pnlPct,
        price_history: stock?.price_history || [],
      }
    })
  }, [holdings, rankings, livePrices])

  // Portfolio totals
  const totals = useMemo(() => {
    const totalValue = enrichedHoldings.reduce((s, h) => s + h.marketValue, 0)
    const totalCost = enrichedHoldings.reduce((s, h) => s + h.costBasis, 0)
    const totalPnl = totalValue - totalCost
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
    const best = enrichedHoldings.length > 0
      ? enrichedHoldings.reduce((a, b) => a.pnlPct > b.pnlPct ? a : b)
      : null
    const worst = enrichedHoldings.length > 0
      ? enrichedHoldings.reduce((a, b) => a.pnlPct < b.pnlPct ? a : b)
      : null
    return { totalValue, totalCost, totalPnl, totalPnlPct, best, worst }
  }, [enrichedHoldings])

  // Sector allocation
  const sectorAllocation = useMemo(() => {
    const grouped = {}
    for (const h of enrichedHoldings) {
      const sec = h.sector || 'Unknown'
      grouped[sec] = (grouped[sec] || 0) + h.marketValue
    }
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [enrichedHoldings])

  // Portfolio performance chart (aggregated normalized)
  const chartData = useMemo(() => {
    if (enrichedHoldings.length === 0) return []
    const withHistory = enrichedHoldings.filter(h => h.price_history && h.price_history.length > 1)
    if (withHistory.length === 0) return []

    // Build per-holding date->close map and weight
    const holdingData = withHistory.map(h => {
      const map = new Map()
      h.price_history.forEach(p => {
        const d = String(p.date).split(' ')[0]
        map.set(d, Number(p.close))
      })
      return { ticker: h.ticker, map, weight: h.marketValue / totals.totalValue }
    })

    // Union of all dates
    const allDates = new Set()
    holdingData.forEach(hd => hd.map.forEach((_, d) => allDates.add(d)))
    const dates = [...allDates].sort()

    // For each date, compute weighted normalized return
    // Normalize each holding to its first available price, then weight by portfolio weight
    const bases = new Array(holdingData.length).fill(null)
    const result = []
    for (const d of dates) {
      let weightedReturn = 0
      let totalWeight = 0
      let allBasesSet = true
      for (let i = 0; i < holdingData.length; i++) {
        const p = holdingData[i].map.get(d)
        if (p != null && bases[i] == null) bases[i] = p
        if (bases[i] == null) { allBasesSet = false; break }
        const ret = ((p - bases[i]) / bases[i]) * 100
        weightedReturn += ret * holdingData[i].weight
        totalWeight += holdingData[i].weight
      }
      if (!allBasesSet) continue
      result.push({
        date: d,
        return: totalWeight > 0 ? weightedReturn / totalWeight : 0,
      })
    }
    return result
  }, [enrichedHoldings, totals.totalValue])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--terminal-bg)]">
        <div className="text-center animate-fade-in">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-[var(--terminal-accent)] blur-2xl opacity-20 animate-pulse" />
            <div className="relative h-14 w-14 animate-spin rounded-full border-b-2 border-t-2 border-[var(--terminal-accent)] shadow-[0_0_20px_var(--terminal-accent-soft)]" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--terminal-muted)]">Loading portfolio...</p>
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

  if (detailStock) {
    return <StockDetailPage stock={detailStock} onBack={() => setDetailStock(null)} />
  }

  const pnlPositive = totals.totalPnl >= 0
  const hasHoldings = enrichedHoldings.length > 0
  const maxSectorValue = sectorAllocation.length > 0 ? sectorAllocation[0].value : 0

  return (
    <div className="min-h-screen bg-[var(--terminal-bg)] text-[var(--terminal-text)] selection:bg-[var(--terminal-accent)] selection:text-black">
      <main className="mx-auto max-w-[1600px] px-1 sm:px-2 lg:px-3 py-4 sm:py-6 lg:py-8 animate-fade-in">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Header */}
          <section className="w-full">
            <div className="terminal-panel rounded-2xl sm:rounded-3xl p-3 sm:p-5 lg:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                <div className="terminal-title text-[8px] sm:text-[10px]">Portfolio</div>
                {hasHoldings && (
                  <button
                    onClick={() => { if (confirm('Clear all holdings? This cannot be undone.')) clearAll() }}
                    className="ml-auto font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 hover:text-[var(--terminal-red)] transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <p className="font-mono text-xs text-[var(--terminal-muted)] uppercase tracking-[0.18em] mb-4 sm:mb-5">
                {hasHoldings ? `${enrichedHoldings.length} holding${enrichedHoldings.length !== 1 ? 's' : ''} · stored in your browser` : 'Track your personal stock portfolio'}
              </p>

              {/* Add holding form */}
              <AddHoldingForm rankings={rankings} onAdd={addHolding} />
            </div>
          </section>

          {!hasHoldings ? (
            <section className="w-full">
              <div className="terminal-panel rounded-2xl sm:rounded-3xl p-10 sm:p-16 text-center">
                <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-2xl border border-white/5 bg-white/[0.02]">
                  <svg className="h-7 w-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2l3-9 4 18 3-9h6" />
                  </svg>
                </div>
                <p className="font-mono text-sm text-slate-500 mb-2">Your portfolio is empty</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Use the form above to add your first holding</p>
              </div>
            </section>
          ) : (
            <>
              {/* Summary cards */}
              <section className="w-full">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                  <SummaryCard
                    label="Total Value"
                    value={formatCurrency(totals.totalValue)}
                    sub={`${enrichedHoldings.length} holdings`}
                    valueClass="text-white"
                  />
                  <SummaryCard
                    label="Total Cost"
                    value={formatCurrency(totals.totalCost)}
                    sub="invested"
                    valueClass="text-slate-300"
                  />
                  <SummaryCard
                    label="Total P&L"
                    value={formatCurrency(totals.totalPnl)}
                    sub={formatPct(totals.totalPnlPct)}
                    valueClass={pnlPositive ? 'text-[var(--terminal-green)]' : 'text-[var(--terminal-red)]'}
                    glow={pnlPositive ? 'glow-green' : 'glow-red'}
                  />
                  <SummaryCard
                    label="Best"
                    value={totals.best ? totals.best.ticker : '--'}
                    sub={totals.best ? formatPct(totals.best.pnlPct) : ''}
                    valueClass="text-[var(--terminal-green)]"
                  />
                  <SummaryCard
                    label="Worst"
                    value={totals.worst ? totals.worst.ticker : '--'}
                    sub={totals.worst ? formatPct(totals.worst.pnlPct) : ''}
                    valueClass="text-[var(--terminal-red)]"
                  />
                  <SummaryCard
                    label="Avg Score"
                    value={(enrichedHoldings.reduce((s, h) => s + h.score, 0) / enrichedHoldings.length).toFixed(1)}
                    sub="/ 15"
                    valueClass="text-[var(--terminal-accent)]"
                  />
                </div>
              </section>

              {/* Portfolio Performance Chart */}
              {chartData.length > 1 && (
                <section className="w-full">
                  <div className="terminal-panel rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4">
                      <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                      <div className="terminal-title text-[8px] sm:text-[10px]">Portfolio Performance</div>
                      <span className="ml-auto font-mono text-[9px] text-slate-600">weighted % from start</span>
                    </div>
                    <div className="h-[280px] sm:h-[340px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={pnlPositive ? '#31d17c' : '#fb7185'} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={pnlPositive ? '#31d17c' : '#fb7185'} stopOpacity={0} />
                            </linearGradient>
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
                            formatter={(value) => [`${value > 0 ? '+' : ''}${value.toFixed(2)}%`, 'Portfolio']}
                          />
                          <ReferenceLine y={0} stroke="rgba(127,138,163,0.3)" strokeDasharray="2 2" />
                          <Area
                            type="monotone"
                            dataKey="return"
                            stroke={pnlPositive ? '#31d17c' : '#fb7185'}
                            strokeWidth={2}
                            fill="url(#portfolioGrad)"
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>
              )}

              {/* Holdings table + Allocation */}
              <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                {/* Holdings table */}
                <section className="w-full lg:flex-1 lg:min-w-0">
                  <div className="terminal-panel rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
                      <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                      <div className="terminal-title text-[8px] sm:text-[10px]">Holdings</div>
                      <div className="ml-auto flex items-center gap-2 sm:gap-3">
                        {refreshNotice && (
                          <span className={`font-mono text-[9px] font-bold uppercase tracking-wider ${
                            refreshNotice.type === 'ok' ? 'text-[var(--terminal-green)]' :
                            refreshNotice.type === 'error' ? 'text-[var(--terminal-red)]' :
                            'text-[var(--terminal-yellow)]'
                          }`}>
                            {refreshNotice.text}
                          </span>
                        )}
                        {Object.keys(livePrices).length > 0 && (
                          <span className="font-mono text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            LIVE
                          </span>
                        )}
                        <button
                          onClick={refreshAllPrices}
                          disabled={refreshingPrices || enrichedHoldings.length === 0}
                          title="Fetch live market prices for all holdings"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--terminal-accent)]/20 bg-[var(--terminal-accent)]/5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--terminal-accent)] transition-all hover:bg-[var(--terminal-accent)]/15 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg className={`h-3.5 w-3.5 ${refreshingPrices ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {refreshingPrices ? 'Refreshing...' : 'Refresh Prices'}
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="py-3 px-3 text-left font-mono text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Ticker</th>
                            <th className="py-3 px-3 text-right font-mono text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Qty</th>
                            <th className="py-3 px-3 text-right font-mono text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Buy</th>
                            <th className="py-3 px-3 text-right font-mono text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Current</th>
                            <th className="py-3 px-3 text-right font-mono text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Value</th>
                            <th className="py-3 px-3 text-right font-mono text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">P&L</th>
                            <th className="py-3 px-3 text-right font-mono text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">P&L%</th>
                            <th className="py-3 px-3 text-right font-mono text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Weight</th>
                            <th className="py-3 px-3 text-center font-mono text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {enrichedHoldings
                            .sort((a, b) => b.marketValue - a.marketValue)
                            .map(h => {
                              const sigStyle = SIGNAL_STYLES[h.signal] || SIGNAL_STYLES.HOLD
                              const isProfit = h.pnl >= 0
                              const weight = totals.totalValue > 0 ? (h.marketValue / totals.totalValue) * 100 : 0
                              return (
                                <tr
                                  key={h.ticker}
                                  onClick={() => {
                                    const stock = rankings.find(r => r.ticker === h.ticker)
                                    if (stock) setDetailStock(stock)
                                  }}
                                  className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors group"
                                >
                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-2">
                                      <div className="font-mono text-xs font-black text-white group-hover:text-[var(--terminal-accent)] transition-colors">
                                        {h.ticker}
                                      </div>
                                      <span className={`font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${sigStyle.bg} ${sigStyle.text} ${sigStyle.border} border hidden sm:inline`}>
                                        {sigStyle.label}
                                      </span>
                                    </div>
                                    <div className="font-mono text-[9px] text-slate-500 truncate max-w-[120px]">{h.sector}</div>
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-xs text-white/70 tabular-nums">{h.quantity}</td>
                                  <td className="py-3 px-3 text-right font-mono text-xs text-slate-400 tabular-nums">${h.buyPrice.toFixed(2)}</td>
                                  <td className="py-3 px-3 text-right font-mono text-xs text-white/80 tabular-nums">
                                    <span className="inline-flex items-center gap-1">
                                      ${h.currentPrice.toFixed(2)}
                                      {h.priceSource === 'live' && (
                                        <span className="font-mono text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 leading-none">
                                          LIVE
                                        </span>
                                      )}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-xs font-bold text-white tabular-nums">{formatCurrencyCompact(h.marketValue)}</td>
                                  <td className={`py-3 px-3 text-right font-mono text-xs font-bold tabular-nums ${isProfit ? 'text-[var(--terminal-green)]' : 'text-[var(--terminal-red)]'}`}>
                                    {isProfit ? '+' : ''}{formatCurrencyCompact(h.pnl)}
                                  </td>
                                  <td className={`py-3 px-3 text-right font-mono text-xs font-black tabular-nums ${isProfit ? 'text-[var(--terminal-green)]' : 'text-[var(--terminal-red)]'}`}>
                                    {formatPct(h.pnlPct)}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-[10px] text-slate-400 tabular-nums">{weight.toFixed(1)}%</td>
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removeHolding(h.ticker) }}
                                      className="text-slate-600 hover:text-[var(--terminal-red)] transition-colors p-1"
                                      title={`Remove ${h.ticker}`}
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                {/* Allocation panel */}
                <section className="w-full lg:w-80 xl:w-96 shrink-0">
                  <div className="terminal-panel rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-4">
                      <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                      <div className="terminal-title text-[8px] sm:text-[10px]">Allocation</div>
                    </div>

                    {/* Sector allocation bars */}
                    <div className="mb-5">
                      <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-3">By Sector</div>
                      <div className="space-y-2">
                        {sectorAllocation.map((sec, i) => {
                          const weight = totals.totalValue > 0 ? (sec.value / totals.totalValue) * 100 : 0
                          const color = SECTOR_COLORS[i % SECTOR_COLORS.length]
                          return (
                            <AllocationBar
                              key={sec.name}
                              label={sec.name}
                              value={sec.value}
                              maxValue={maxSectorValue}
                              color={color}
                              weight={weight}
                            />
                          )
                        })}
                      </div>
                    </div>

                    {/* Holdings allocation bars */}
                    <div>
                      <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-3">By Holding</div>
                      <div className="space-y-2">
                        {[...enrichedHoldings]
                          .sort((a, b) => b.marketValue - a.marketValue)
                          .slice(0, 10)
                          .map((h, i) => {
                            const weight = totals.totalValue > 0 ? (h.marketValue / totals.totalValue) * 100 : 0
                            const maxVal = enrichedHoldings[0]?.marketValue || 1
                            const color = SECTOR_COLORS[i % SECTOR_COLORS.length]
                            return (
                              <AllocationBar
                                key={h.ticker}
                                label={h.ticker}
                                value={h.marketValue}
                                maxValue={maxVal}
                                color={color}
                                weight={weight}
                              />
                            )
                          })}
                      </div>
                      {enrichedHoldings.length > 10 && (
                        <p className="mt-2 font-mono text-[9px] text-slate-600 text-center">
                          +{enrichedHoldings.length - 10} more holdings
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
