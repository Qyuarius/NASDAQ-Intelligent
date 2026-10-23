import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import CommodityPanel from '../components/CommodityPanel'
import SectorPanel from '../components/SectorPanel'
import SectorHeatmap from '../components/SectorHeatmap'
import RankingTable from '../components/RankingTable'
import StockChart from '../components/StockChart'
import MoversPanel from '../components/MoversPanel'
import GuruPanel from '../components/GuruPanel'
import StockManagerModal from '../components/StockManagerModal'
import StockDetailPage from './StockDetailPage'
import CommodityDetailPage from './CommodityDetailPage'

export default function Dashboard() {
  const [rankings, setRankings] = useState([])
  const [commodities, setCommodities] = useState({})
  const [generatedAt, setGeneratedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedStock, setSelectedStock] = useState(null)
  const [detailStock, setDetailStock] = useState(null)
  const [detailCommodity, setDetailCommodity] = useState(null)
  const [commoditySeries, setCommoditySeries] = useState({})
  const [guruData, setGuruData] = useState([])
  const [sectorFilter, setSectorFilter] = useState('All')
  const [pollActive, setPollActive] = useState(false)
  const [showStockManager, setShowStockManager] = useState(false)
  const rankingSectionRef = useRef(null)

  const parseJsonResponse = (payload) => {
    if (typeof payload !== 'string') return payload
    try {
      return JSON.parse(payload)
    } catch {
      return payload
    }
  }

  const extractRankings = (payload) => {
    const data = parseJsonResponse(payload)
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.rankings)) return data.rankings
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.rows)) return data.rows
    return []
  }

  const loadData = async () => {
    try {
      setError(null)
      const cacheKey = Date.now()
      const [rankRes, commRes, seriesRes, insightRes] = await Promise.all([
        axios.get(`/output/ranking.json?t=${cacheKey}`),
        axios.get(`/output/commodity.json?t=${cacheKey}`),
        axios.get(`/output/commodity_series.json?t=${cacheKey}`).catch(() => null),
        axios.get(`/output/insight.json?t=${cacheKey}`).catch(() => null),
      ])
      const rankData = parseJsonResponse(rankRes.data)
      const rawRankList = extractRankings(rankData)
      const rankList = rawRankList.map((row) => ({
        ...row,
        stock: row.stock || row.ticker || row.symbol || 'UNKNOWN',
        ticker: row.ticker || row.stock || row.symbol || 'UNKNOWN',
        type: String(row.type || '').trim().toUpperCase() === 'ETF' ? 'ETF' : 'Stock',
        score: Number(row.score ?? 0),
      }))
      const commData = parseJsonResponse(commRes.data)
      setRankings(rankList)
      setGeneratedAt(rankData.generated_at || commData.generated_at || null)
      setCommodities(commData.prices || commData)
      setCommoditySeries(seriesRes?.data || {})
      setGuruData(insightRes?.data?.gurus || [])
      if (rankList?.length) {
        setSelectedStock((current) => {
          if (!current) return rankList[0]
          return rankList.find(row => row.ticker === current.ticker || row.stock === current.stock) || rankList[0]
        })
      } else {
        setSelectedStock(null)
      }
    } catch (err) {
      setError(err.response?.status === 404
        ? 'Output files not found. Run: cd backend && python run_pipeline.py'
        : `Failed to load data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCommodity = (key) => {
    setDetailCommodity(key)
  }

  // Load cached data on startup + auto-poll every 5 min (skip when tab inactive)
  useEffect(() => {
    loadData()

    const POLL_INTERVAL = 90 * 1000
    let timer = null

    const poll = () => {
      if (document.visibilityState === 'visible') {
        loadData()
        setLastPoll(Date.now())
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        poll()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    timer = setInterval(poll, POLL_INTERVAL)
    setPollActive(true)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const formatTime = (iso) => {
    if (!iso) return 'Unknown'
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--terminal-bg)]">
        <div className="text-center animate-fade-in">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-[var(--terminal-accent)] blur-2xl opacity-20 animate-pulse" />
            <div className="relative h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-[var(--terminal-accent)] shadow-[0_0_20px_var(--terminal-accent-soft)]" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--terminal-muted)] glow-text">Initializing Intel Systems...</p>
        </div>
      </div>
    )
  }

  if (detailCommodity) {
    const correlatedStocks = rankings
      .filter(r => r.best_commodity === detailCommodity)
      .sort((a, b) => Math.abs(b.correlation || 0) - Math.abs(a.correlation || 0))
    return (
      <CommodityDetailPage
        commodityKey={detailCommodity}
        commodityData={commodities[detailCommodity]}
        seriesData={commoditySeries[detailCommodity]}
        correlatedStocks={correlatedStocks}
        onBack={() => setDetailCommodity(null)}
      />
    )
  }

  if (detailStock) return <StockDetailPage stock={detailStock} onBack={() => setDetailStock(null)} />

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

  const buyCount = rankings.filter(r => r.signal === 'BUY').length
  const holdCount = rankings.filter(r => r.signal === 'HOLD').length
  const sellCount = rankings.filter(r => r.signal === 'SELL').length

  return (
    <div className="min-h-screen bg-[var(--terminal-bg)] text-[var(--terminal-text)] selection:bg-[var(--terminal-accent)] selection:text-black">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#030407]/60 backdrop-blur-2xl safe-top">
        <div className="mx-auto max-w-[1600px] px-1 sm:px-2 lg:px-3 py-2 sm:py-3 lg:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
            <div className="flex items-center min-w-0 gap-2 sm:gap-3 lg:gap-6">
              <div className="min-w-0">
                <h1 className="text-base font-black tracking-tight text-white truncate sm:text-lg lg:text-2xl font-display">
                  USA<span className="hidden sm:inline text-[var(--terminal-accent)] glow-text"> Stock Intelligent</span>
                </h1>
                <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[var(--terminal-muted)]">
                  <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-[var(--terminal-green)] shadow-[0_0_8px_var(--terminal-green)] animate-pulse shrink-0" />
                  <span className="truncate">Live Market Analysis</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 shrink-0">
              <div className="hidden md:flex items-center px-1 py-1 border divide-x divide-white/5 rounded-xl sm:rounded-2xl border-white/5 bg-white/[0.02] lg:shadow-inner">
                <div className="px-2 py-1 text-center sm:px-3 lg:px-5">
                  <div className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Buy</div>
                  <div className="font-mono text-xs sm:text-sm font-black text-[var(--terminal-green)] glow-green">{buyCount}</div>
                </div>
                <div className="px-2 py-1 text-center sm:px-3 lg:px-5">
                  <div className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Hold</div>
                  <div className="font-mono text-xs sm:text-sm font-black text-[var(--terminal-yellow)]">{holdCount}</div>
                </div>
                <div className="px-2 py-1 text-center sm:px-3 lg:px-5">
                  <div className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Sell</div>
                  <div className="font-mono text-xs sm:text-sm font-black text-[var(--terminal-red)] glow-red">{sellCount}</div>
                </div>
              </div>
              <div className="hidden w-px h-6 sm:block sm:h-8 bg-white/5" />

              {/* Auto-poll indicator */}
              {pollActive && (
                <div className="hidden lg:flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-widest text-slate-600">
                  <span className="h-1 w-1 rounded-full bg-[var(--terminal-green)] shadow-[0_0_6px_var(--terminal-green)] animate-pulse" />
                  <span>Auto 5m</span>
                </div>
              )}

              {/* Manage Watchlist Button */}
              <button
                onClick={() => setShowStockManager(true)}
                title="Add or remove stocks"
                className="group flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2 sm:py-2.5 text-slate-400 transition-all hover:border-[var(--terminal-accent)] hover:bg-[var(--terminal-accent-soft)] hover:text-[var(--terminal-accent)]"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Add Stock
                </span>
              </button>

            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-1 sm:px-2 lg:px-3 py-4 sm:py-6 lg:py-8 xl:py-10 animate-fade-in">
        <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10">
          {/* Market Fundamentals Section */}
          <section className="w-full">
            <div className="terminal-panel rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] p-3 sm:p-4 lg:p-6 xl:p-8 2xl:p-10">
              <div className="flex flex-col justify-between gap-3 mb-4 sm:flex-row sm:items-center sm:gap-4 sm:mb-6 lg:mb-8">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                  <div className="terminal-title text-[8px] sm:text-[10px]">Market Fundamentals</div>
                </div>
                {generatedAt && (
                  <div className="font-mono text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-2 sm:px-3 py-1 rounded-full border border-white/5 w-fit">
                    <span className="hidden sm:inline">Snapshot: </span>{formatTime(generatedAt)}
                  </div>
                )}
              </div>
              <CommodityPanel commodities={commodities} onSelectCommodity={handleSelectCommodity} />
              <SectorPanel rankings={rankings} />
              <SectorHeatmap rankings={rankings} onSelectStock={setSelectedStock} onDoubleClickStock={setDetailStock} />
            </div>
          </section>

          {/* Main Content - Stock Chart & Ranking Table */}
          <section ref={rankingSectionRef} className="w-full space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Stock Chart - Full Width */}
            <div className="h-[400px] sm:h-[450px] md:h-[500px] lg:h-[550px]">
              <div className="flex flex-col h-full rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] terminal-panel p-3 sm:p-4 lg:p-5 xl:p-8">
                <div className="flex items-center gap-2 mb-4 sm:gap-3 sm:mb-6 lg:mb-8 shrink-0">
                  <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                  <div className="terminal-title text-[8px] sm:text-[10px]">Live Analysis</div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <StockChart stock={selectedStock} />
                </div>
              </div>
            </div>

            {/* Ranking Table - Full Width */}
            <div className="h-[500px] sm:h-[550px] md:h-[600px] lg:h-[680px]">
              <div className="flex flex-col h-full rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] terminal-panel p-2 sm:p-3 overflow-hidden">
                <RankingTable rankings={rankings} selectedStock={selectedStock} onSelectStock={setSelectedStock} onDoubleClickStock={setDetailStock} sectorFilter={sectorFilter} onSectorFilterChange={setSectorFilter} />
              </div>
            </div>
          </section>

          {/* Movers Section */}
          {rankings.length > 0 && (
            <section className="w-full">
              <div className="terminal-panel rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] p-3 sm:p-4 lg:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 lg:mb-6">
                  <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                  <div className="terminal-title text-[8px] sm:text-[10px]">Market Movers</div>
                </div>
                <MoversPanel rankings={rankings} />
              </div>
            </section>
          )}

          {/* Guru Insight Section */}
          {guruData.length > 0 && (
            <section className="w-full">
              <div className="terminal-panel rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] p-3 sm:p-4 lg:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 lg:mb-6">
                  <div className="h-1 sm:h-1.5 w-6 sm:w-10 rounded-full bg-[var(--terminal-accent)] shrink-0" />
                  <div className="terminal-title text-[8px] sm:text-[10px]">Insight — Whales Watch</div>
                </div>
                <GuruPanel gurus={guruData} rankings={rankings} onSelectTicker={setDetailStock} />
              </div>
            </section>
          )}
        </div>

      </main>

      <footer className="py-8 mt-12 border-t sm:py-10 lg:py-12 sm:mt-16 lg:mt-20 border-white/5 safe-bottom">
        <div className="mx-auto max-w-[1600px] px-1 sm:px-2 lg:px-3 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
          <div className="text-lg font-bold sm:text-xl font-display text-white/20">NASDAQ<span className="opacity-50">Intel</span></div>
          <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-600 text-center">Systemic Trading Architecture v1.0.4</p>
          <div className="flex gap-3 sm:gap-4">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/10" />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/10" />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/10" />
          </div>
        </div>
      </footer>

      <StockManagerModal
        open={showStockManager}
        onClose={() => setShowStockManager(false)}
        onStocksChanged={() => loadData()}
      />
    </div>
  )
}
