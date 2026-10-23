import React, { useEffect, useState, useMemo, useCallback } from 'react'
import axios from 'axios'
import CorrelationGraph from '../components/CorrelationGraph'
import CorrelationMatrix from '../components/CorrelationMatrix'
import CorrelationStats from '../components/CorrelationStats'
import StockDetailPage from './StockDetailPage'

const VIEWS = [
  { id: 'network', label: 'Network' },
  { id: 'matrix', label: 'Matrix' },
]

const formatTime = (iso) => {
  if (!iso) return 'Unknown'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function CorrelationsPage() {
  const [corrData, setCorrData] = useState(null)
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [minCorrelation, setMinCorrelation] = useState(0.3)
  const [showAIOnly, setShowAIOnly] = useState(false)
  const [view, setView] = useState('network')
  const [searchTicker, setSearchTicker] = useState('')
  const [detailStock, setDetailStock] = useState(null)
  const [pollActive, setPollActive] = useState(false)

  // Build ticker -> ranking map so we can pass full stock objects to StockDetailPage
  const rankingMap = useMemo(() => {
    const m = {}
    rankings.forEach(r => {
      const t = r.ticker || r.stock
      if (t) m[t] = r
    })
    return m
  }, [rankings])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const cacheKey = Date.now()
      const [corrRes, rankRes] = await Promise.all([
        axios.get(`/output/correlations.json?t=${cacheKey}`),
        axios.get(`/output/ranking.json?t=${cacheKey}`).catch(() => null),
      ])
      setCorrData(corrRes.data)
      if (rankRes?.data) {
        const data = rankRes.data
        const rawList = Array.isArray(data) ? data : (data.rankings || data.data || data.rows || [])
        setRankings(rawList.map(row => ({
          ...row,
          stock: row.stock || row.ticker || 'UNKNOWN',
          ticker: row.ticker || row.stock || 'UNKNOWN',
          score: Number(row.score ?? 0),
        })))
      }
    } catch (err) {
      setError(err.response?.status === 404
        ? 'Data files not found. Run the pipeline to generate correlation data.'
        : err.message || 'Failed to load data'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + auto-poll every 5 min (skip when tab inactive)
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
    setPollActive(true)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [loadData])

  const handleNodeClick = useCallback((ticker) => {
    const rank = rankingMap[ticker]
    const node = corrData?.nodes?.[ticker]
    if (rank) {
      setDetailStock(rank)
    } else if (node) {
      setDetailStock({ ticker, stock: ticker, ...node })
    }
  }, [rankingMap, corrData])

  // -----------------------------------------------------------------------
  // Drill-down to stock detail
  // -----------------------------------------------------------------------
  if (detailStock) {
    return <StockDetailPage stock={detailStock} onBack={() => setDetailStock(null)} />
  }

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--terminal-bg)]">
        <div className="text-center animate-fade-in">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-[var(--terminal-accent)] blur-2xl opacity-20 animate-pulse" />
            <div className="relative h-14 w-14 animate-spin rounded-full border-b-2 border-t-2 border-[var(--terminal-accent)] shadow-[0_0_20px_var(--terminal-accent-soft)]" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--terminal-muted)]">Loading network...</p>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--terminal-bg)] p-8">
        <div className="max-w-lg p-10 text-center rounded-3xl terminal-panel animate-fade-in">
          <div className="mb-6 font-mono text-3xl font-black tracking-[0.3em] text-[var(--terminal-red)] glow-red">ERR</div>
          <p className="mb-8 font-mono text-xs text-slate-400">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-2.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest bg-[var(--terminal-accent)]/10 text-[var(--terminal-accent)] border border-[var(--terminal-accent)]/20 hover:bg-[var(--terminal-accent)]/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------
  if (!corrData?.edges?.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--terminal-bg)] p-8">
        <div className="max-w-md p-10 text-center rounded-3xl terminal-panel animate-fade-in">
          <div className="mb-4 font-mono text-2xl font-black tracking-widest text-slate-500">NO_DATA</div>
          <p className="font-mono text-xs text-slate-400 mb-6">
            Run the pipeline to compute stock-to-stock correlations.
          </p>
          <button
            onClick={loadData}
            className="px-6 py-2.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest bg-[var(--terminal-accent)]/10 text-[var(--terminal-accent)] border border-[var(--terminal-accent)]/20 hover:bg-[var(--terminal-accent)]/20 transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Filter stats
  // -----------------------------------------------------------------------
  const visibleEdgeCount = corrData.edges.filter(e => Math.abs(e.correlation) >= minCorrelation).length
  const aiOnlyEdgeCount = showAIOnly
    ? corrData.edges.filter(e =>
        Math.abs(e.correlation) >= minCorrelation &&
        corrData.ai_tickers?.includes(e.source) &&
        corrData.ai_tickers?.includes(e.target)
      ).length
    : visibleEdgeCount

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[var(--terminal-bg)] text-[var(--terminal-text)] selection:bg-[var(--terminal-accent)] selection:text-black">
      <main className="mx-auto max-w-[1600px] px-1 sm:px-2 lg:px-3 py-4 sm:py-6 lg:py-8 animate-fade-in">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Header */}
          <section className="w-full">
            <div className="terminal-panel rounded-2xl sm:rounded-3xl p-3 sm:p-5 lg:p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-center mb-4 sm:mb-5">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                  <div className="terminal-title text-[8px] sm:text-[10px]">Network — Correlations</div>
                </div>
                <div className="flex items-center gap-3">
                  {pollActive && (
                    <div className="hidden sm:flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-widest text-slate-600">
                      <span className="h-1 w-1 rounded-full bg-[var(--terminal-green)] shadow-[0_0_6px_var(--terminal-green)] animate-pulse" />
                      <span>Auto 5m</span>
                    </div>
                  )}
                  {corrData.generated_at && (
                    <div className="font-mono text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 sm:px-3 py-1 rounded-full border border-white/5">
                      {formatTime(corrData.generated_at)}
                    </div>
                  )}
                </div>
              </div>

              <p className="font-mono text-xs text-[var(--terminal-muted)] uppercase tracking-[0.18em] mb-4 sm:mb-5">
                AI industry stock-to-stock return correlations
              </p>

              {/* Stats cards */}
              <CorrelationStats corrData={corrData} />
            </div>
          </section>

          {/* Controls + View toggle */}
          <section className="w-full">
            <div className="terminal-panel rounded-2xl sm:rounded-3xl p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {/* View toggle */}
                <div className="flex items-center p-1 rounded-xl border border-white/5 bg-white/[0.02]">
                  {VIEWS.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setView(v.id)}
                      className={`px-3 sm:px-4 py-1.5 rounded-lg font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${
                        view === v.id
                          ? 'bg-[var(--terminal-accent)]/15 text-[var(--terminal-accent)] shadow-[0_0_12px_var(--terminal-accent-soft)]'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                <div className="hidden sm:block w-px h-6 bg-white/5" />

                {/* Search */}
                <div className="relative flex items-center">
                  <svg className="absolute left-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4-4" />
                  </svg>
                  <input
                    type="text"
                    value={searchTicker}
                    onChange={e => setSearchTicker(e.target.value)}
                    placeholder="Search ticker..."
                    className="pl-8 pr-3 py-1.5 w-32 sm:w-40 rounded-lg font-mono text-xs bg-white/[0.02] border border-white/10 text-white placeholder:text-slate-600 focus:border-[var(--terminal-accent)]/40 focus:outline-none focus:bg-white/[0.04] transition-all"
                  />
                  {searchTicker && (
                    <button
                      onClick={() => setSearchTicker('')}
                      className="absolute right-1.5 text-slate-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Correlation threshold slider */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <label className="font-mono text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    Min |r|
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.9"
                    step="0.05"
                    value={minCorrelation}
                    onChange={e => setMinCorrelation(parseFloat(e.target.value))}
                    className="w-24 sm:w-32 accent-[var(--terminal-accent)]"
                  />
                  <span className="font-mono text-xs sm:text-sm font-bold text-[var(--terminal-accent)] min-w-[2.5rem] text-right">
                    {minCorrelation.toFixed(2)}
                  </span>
                </div>

                {/* AI only toggle */}
                <button
                  onClick={() => setShowAIOnly(!showAIOnly)}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${
                    showAIOnly
                      ? 'bg-[var(--terminal-accent)]/15 text-[var(--terminal-accent)] border border-[var(--terminal-accent)]/30'
                      : 'text-slate-400 border border-white/10 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {showAIOnly ? 'AI ↔ AI' : 'All Edges'}
                </button>

                {/* Edge count */}
                <div className="ml-auto font-mono text-[10px] sm:text-xs text-slate-500">
                  {aiOnlyEdgeCount} edges | ≥ {minCorrelation.toFixed(2)}
                </div>

                {/* Reload button */}
                <button
                  onClick={loadData}
                  className="p-1.5 rounded-lg text-slate-400 border border-white/10 hover:border-white/20 hover:text-white transition-colors"
                  title="Refresh data"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </section>

          {/* Graph / Matrix area */}
          <section className="w-full">
            <div
              className="rounded-2xl sm:rounded-3xl terminal-panel overflow-hidden"
              style={{ height: 'calc(100vh - 380px)', minHeight: 420 }}
            >
              {view === 'network' ? (
                <CorrelationGraph
                  mode="statistical"
                  nodes={corrData.nodes}
                  edges={corrData.edges}
                  aiTagColors={corrData.ai_tag_colors}
                  minCorrelation={minCorrelation}
                  showAIOnly={showAIOnly}
                  aiTickers={corrData.ai_tickers || []}
                  searchTicker={searchTicker}
                  onNodeClick={handleNodeClick}
                />
              ) : (
                <div className="w-full h-full p-3 sm:p-4">
                  <CorrelationMatrix
                    nodes={corrData.nodes}
                    edges={corrData.edges}
                    aiTickers={corrData.ai_tickers || []}
                    aiTagColors={corrData.ai_tag_colors || {}}
                    minCorrelation={minCorrelation}
                    showAIOnly={showAIOnly}
                    searchTicker={searchTicker}
                    onTickerClick={handleNodeClick}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Legend */}
          <section className="w-full">
            <div className="flex flex-wrap items-center gap-4 p-3 sm:p-4 rounded-2xl sm:rounded-3xl terminal-panel">
              {/* Edge strength legend */}
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500">Edge strength</span>
                {[
                  { label: '≥ 0.7', color: '#31d17c' },
                  { label: '0.5–0.7', color: '#00c8ff' },
                  { label: '0.3–0.5', color: '#ffd166' },
                  { label: '< 0', color: '#ff5a36' },
                ].map(item => (
                  <span key={item.label} className="flex items-center gap-1.5 font-mono text-[10px] sm:text-xs text-slate-500">
                    <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                ))}
              </div>

              <div className="flex-1 terminal-divider mx-2" />

              {/* AI tag legend */}
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500">AI category</span>
                {corrData.ai_tag_colors && Object.entries(corrData.ai_tag_colors).map(([tag, color]) => (
                  <span key={tag} className="flex items-center gap-1.5 font-mono text-[10px] sm:text-xs text-slate-500">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex-1 terminal-divider mx-2" />

              {/* Stats */}
              <div className="font-mono text-[10px] sm:text-xs text-slate-500">
                {Object.keys(corrData.nodes).length} nodes | {corrData.ai_tickers?.length || 0} AI
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
