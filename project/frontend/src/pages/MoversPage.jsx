import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import StockDetailPage from './StockDetailPage'

const TABS = [
  { id: 'gainers', label: 'Top Gainers', metric: 'change_1d', color: 'var(--terminal-green)' },
  { id: 'losers', label: 'Top Losers', metric: 'change_1d', color: 'var(--terminal-red)' },
  { id: 'volume', label: 'Top Volume', metric: 'volume', color: 'var(--terminal-accent)' },
  { id: 'value', label: 'Top Value', metric: 'turnover', color: 'var(--terminal-yellow)' },
]

const formatNumber = (n) => {
  if (n == null || isNaN(n)) return '--'
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + n.toLocaleString()
}

const formatVolume = (n) => {
  if (n == null || isNaN(n)) return '--'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

const formatPrice = (n) => {
  if (n == null || isNaN(n)) return '--'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

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

export default function MoversPage() {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('gainers')
  const [search, setSearch] = useState('')
  const [detailStock, setDetailStock] = useState(null)

  const loadData = async () => {
    const cacheKey = Date.now()
    try {
      const res = await axios.get(`/output/ranking.json?t=${cacheKey}`)
      const rawRankList = extractRankings(res.data)
      const rankList = rawRankList.map(row => ({
        ...row,
        stock: row.stock || row.ticker || 'UNKNOWN',
        ticker: row.ticker || row.stock || 'UNKNOWN',
        type: String(row.type || '').trim().toUpperCase() === 'ETF' ? 'ETF' : 'Stock',
        score: Number(row.score ?? 0),
      }))
      setRankings(rankList)
      setError(null)
    } catch (err) {
      setError(`Failed to load data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

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
  }, [])

  const sortedRankings = useMemo(() => {
    const withDefaults = rankings.map(r => ({
      ...r,
      change_1d: r.change_1d ?? 0,
      volume: r.volume ?? 0,
      turnover: r.turnover ?? 0,
      last_close: r.last_close ?? 0,
    }))

    switch (activeTab) {
      case 'gainers':
        return withDefaults.filter(r => r.change_1d > 0).sort((a, b) => b.change_1d - a.change_1d)
      case 'losers':
        return withDefaults.filter(r => r.change_1d < 0).sort((a, b) => a.change_1d - b.change_1d)
      case 'volume':
        return withDefaults.filter(r => r.volume > 0).sort((a, b) => b.volume - a.volume)
      case 'value':
        return withDefaults.filter(r => r.turnover > 0).sort((a, b) => b.turnover - a.turnover)
      default:
        return withDefaults
    }
  }, [rankings, activeTab])

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedRankings
    const q = search.toLowerCase()
    return sortedRankings.filter(r =>
      r.ticker?.toLowerCase().includes(q) ||
      r.name?.toLowerCase().includes(q)
    )
  }, [sortedRankings, search])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--terminal-bg)]">
        <div className="text-center animate-fade-in">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-[var(--terminal-accent)] blur-2xl opacity-20 animate-pulse" />
            <div className="relative h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-[var(--terminal-accent)] shadow-[0_0_20px_var(--terminal-accent-soft)]" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--terminal-muted)] glow-text">Loading Movers...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--terminal-bg)] p-8">
        <div className="max-w-lg p-10 text-center rounded-3xl terminal-panel animate-fade-in">
          <div className="mb-6 font-mono text-4xl font-black tracking-[0.3em] text-[var(--terminal-red)] glow-red">SYSTEM_ERR</div>
          <pre className="mb-8 p-6 font-mono text-[11px] text-left whitespace-pre-wrap rounded-2xl terminal-inset text-slate-400 leading-relaxed">{error}</pre>
          <button onClick={() => window.location.reload()}
            className="group relative overflow-hidden rounded-xl border border-[var(--terminal-red)]/30 bg-[var(--terminal-red)]/5 px-8 py-3 transition-all hover:bg-[var(--terminal-red)]/10">
            <span className="relative z-10 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--terminal-red)]">Restart Connection</span>
          </button>
        </div>
      </div>
    )
  }

  if (detailStock) {
    return <StockDetailPage stock={detailStock} onBack={() => setDetailStock(null)} />
  }

  const activeTabConfig = TABS.find(t => t.id === activeTab)

  return (
    <div className="min-h-screen bg-[var(--terminal-bg)] text-[var(--terminal-text)] selection:bg-[var(--terminal-accent)] selection:text-black">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#030407]/60 backdrop-blur-2xl safe-top">
        <div className="mx-auto max-w-[1600px] px-1 sm:px-2 lg:px-3 py-2 sm:py-3 lg:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center min-w-0 gap-2 sm:gap-3">
              <div className="min-w-0">
                <h1 className="text-base font-black tracking-tight text-white truncate sm:text-lg lg:text-2xl font-display">
                  Market<span className="hidden sm:inline text-[var(--terminal-accent)] glow-text"> Movers</span>
                </h1>
                <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[var(--terminal-muted)]">
                  <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-[var(--terminal-green)] shadow-[0_0_8px_var(--terminal-green)] animate-pulse shrink-0" />
                  <span className="truncate">{filtered.length} stocks · {activeTabConfig?.label}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search ticker..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-32 sm:w-48 md:w-56 pl-8 pr-3 py-1.5 sm:py-2 rounded-xl border border-white/10 bg-white/5 font-mono text-[10px] sm:text-xs text-white/80 placeholder-slate-500 focus:outline-none focus:border-[var(--terminal-accent)]/30 focus:bg-white/[0.07] transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-1 sm:px-2 lg:px-3 py-4 sm:py-6 lg:py-8 animate-fade-in">
        {/* Tab Navigation */}
        <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            const count = (() => {
              const withDefaults = rankings.map(r => ({
                ...r,
                change_1d: r.change_1d ?? 0,
                volume: r.volume ?? 0,
                turnover: r.turnover ?? 0,
              }))
              switch (tab.id) {
                case 'gainers': return withDefaults.filter(r => r.change_1d > 0).length
                case 'losers': return withDefaults.filter(r => r.change_1d < 0).length
                case 'volume': return withDefaults.filter(r => r.volume > 0).length
                case 'value': return withDefaults.filter(r => r.turnover > 0).length
                default: return 0
              }
            })()
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearch('') }}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
                style={isActive ? { backgroundColor: `${tab.color}15`, border: `1px solid ${tab.color}30`, color: tab.color } : {}}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tab.color, opacity: isActive ? 1 : 0.3 }} />
                {tab.label}
                <span className="text-[9px] opacity-60">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Results Table */}
        <div className="terminal-panel rounded-2xl sm:rounded-3xl overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 p-3 w-10">#</th>
                  <th className="text-left font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 p-3">Ticker</th>
                  <th className="text-left font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 p-3 hidden lg:table-cell">Name</th>
                  <th className="text-right font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 p-3">Price</th>
                  <th className="text-right font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 p-3">Change%</th>
                  <th className="text-right font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 p-3">Volume</th>
                  <th className="text-right font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 p-3">Value</th>
                  <th className="text-right font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 p-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const isPositive = r.change_1d > 0
                  const isNegative = r.change_1d < 0
                  return (
                    <tr
                      key={`${r.ticker}-${i}`}
                      onClick={() => setDetailStock(r)}
                      className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors group"
                    >
                      <td className="p-3 font-mono text-[10px] text-slate-600">{i + 1}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-bold text-white/90 group-hover:text-[var(--terminal-accent)] transition-colors bg-white/5 border border-white/5 group-hover:border-[var(--terminal-accent)]/20">
                          {r.ticker}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400 hidden lg:table-cell truncate max-w-[200px]">{r.name || '--'}</td>
                      <td className="p-3 text-right font-mono text-[11px] font-bold text-white/70">${formatPrice(r.last_close)}</td>
                      <td className={`p-3 text-right font-mono text-[11px] font-bold ${isPositive ? 'text-[var(--terminal-green)]' : isNegative ? 'text-[var(--terminal-red)]' : 'text-slate-400'}`}>
                        {isPositive ? '+' : ''}{(r.change_1d || 0).toFixed(2)}%
                      </td>
                      <td className="p-3 text-right font-mono text-[11px] text-white/50">{formatVolume(r.volume)}</td>
                      <td className="p-3 text-right font-mono text-[11px] font-bold text-white/60">{formatNumber(r.turnover)}</td>
                      <td className="p-3 text-right">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-white/5 text-white/60">
                          {r.score}/15
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-white/[0.03]">
            {filtered.map((r, i) => {
              const isPositive = r.change_1d > 0
              const isNegative = r.change_1d < 0
              return (
                <div
                  key={`${r.ticker}-${i}`}
                  onClick={() => setDetailStock(r)}
                  className="p-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-slate-600 w-5 text-right">{i + 1}</span>
                      <span className="font-mono text-xs font-bold text-white/90">{r.ticker}</span>
                      <span className="inline-flex items-center px-1 py-0.5 rounded font-mono text-[9px] font-bold bg-white/5 text-white/40">
                        {r.score}/15
                      </span>
                    </div>
                    <span className={`font-mono text-xs font-bold ${isPositive ? 'text-[var(--terminal-green)]' : isNegative ? 'text-[var(--terminal-red)]' : 'text-slate-400'}`}>
                      {isPositive ? '+' : ''}{(r.change_1d || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="text-white/60">${formatPrice(r.last_close)}</span>
                    <span>Vol: {formatVolume(r.volume)}</span>
                    <span>Val: {formatNumber(r.turnover)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="p-8 text-center font-mono text-[11px] text-slate-600">
              {search ? `No stocks matching "${search}"` : 'No data available for this category'}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
