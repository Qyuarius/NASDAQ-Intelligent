import React, { useState } from 'react'

const SIGNAL_STYLES = {
  BUY: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'glow-green' },
  HOLD: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', glow: '' },
  SELL: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', glow: 'glow-red' },
}

const TREND_STYLES = {
  UP: { icon: 'UP', color: 'text-[var(--terminal-green)]', glow: 'glow-green' },
  DOWN: { icon: 'DN', color: 'text-[var(--terminal-red)]', glow: 'glow-red' },
  SIDEWAYS: { icon: 'FL', color: 'text-slate-500', glow: '' },
}

const TYPE_STYLES = {
  Stock: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  ETF:   { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
}

function ScoreBar({ score, max = 15 }) {
  const safeScore = Number.isFinite(Number(score)) ? Number(score) : 0
  const pct = Math.max(0, Math.min(100, (safeScore / max) * 100))
  const color = safeScore >= 10 ? 'bg-emerald-500' : safeScore >= 6 ? 'bg-amber-500' : 'bg-rose-500'
  const glow = safeScore >= 10 ? 'shadow-[0_0_10px_rgba(16,185,129,0.3)]' : ''

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5 border border-white/5">
        <div 
          className={`h-full transition-all duration-1000 ease-out rounded-full ${color} ${glow}`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
      <span className={`font-mono text-xs font-black tabular-nums ${safeScore >= 10 ? 'text-emerald-400' : 'text-slate-500'}`}>{safeScore.toFixed(1)}</span>
    </div>
  )
}

const normalizeRow = (row, index) => {
  const ticker = row?.ticker || row?.stock || row?.symbol || `UNKNOWN-${index}`
  const rawType = String(row?.type || '').trim().toUpperCase()
  const news = Number(row?.news ?? row?.news_score)

  return {
    ...row,
    stock: row?.stock || ticker,
    ticker,
    type: rawType === 'ETF' ? 'ETF' : 'Stock',
    score: Number.isFinite(Number(row?.score)) ? Number(row.score) : 0,
    rsi: Number.isFinite(Number(row?.rsi)) ? Number(row.rsi) : null,
    news: Number.isFinite(news) ? news : null,
    last_close: Number.isFinite(Number(row?.last_close)) ? Number(row.last_close) : null,
    trend: row?.trend || 'SIDEWAYS',
    signal: row?.signal || 'HOLD',
  }
}

export default function RankingTable({ rankings, selectedStock, onSelectStock, onDoubleClickStock, sectorFilter = 'All', onSectorFilterChange }) {
  const [sortKey, setSortKey] = useState('score')
  const [sortDir, setSortDir] = useState('desc')
  const [typeFilter, setTypeFilter] = useState('All') // 'All' | 'Stock' | 'ETF'
  const [searchQuery, setSearchQuery] = useState('')

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
      return
    }
    setSortKey(key)
    setSortDir('desc')
  }


  const safeRankings = Array.isArray(rankings) ? rankings.map(normalizeRow) : []
  const sectors = [...new Set(safeRankings.map(r => r.sector).filter(Boolean))].sort()

  const filtered = (typeFilter === 'All' ? safeRankings : safeRankings.filter(r => r.type === typeFilter))
    .filter(r => sectorFilter === 'All' || r.sector === sectorFilter)
    .filter(r => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.trim().toLowerCase()
      return r.ticker?.toLowerCase().includes(q) || r.stock?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q)
    })

  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortKey] ?? 0
    let bv = b[sortKey] ?? 0
    if (typeof av === 'string') av = av.charCodeAt(0)
    if (typeof bv === 'string') bv = bv.charCodeAt(0)
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const displayedRows = sorted

  const SortHeader = ({ label, field }) => (
    <th
      className="cursor-pointer select-none px-3 py-4 text-left font-mono text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <div className="flex flex-col gap-0.5 opacity-30">
          <div className={`h-1 w-1 rounded-full bg-white ${sortKey === field && sortDir === 'asc' ? 'opacity-100 bg-[var(--terminal-accent)]' : ''}`} />
          <div className={`h-1 w-1 rounded-full bg-white ${sortKey === field && sortDir === 'desc' ? 'opacity-100 bg-[var(--terminal-accent)]' : ''}`} />
        </div>
      </div>
    </th>
  )

  const stockCount = safeRankings.filter(r => r.type === 'Stock').length
  const etfCount   = safeRankings.filter(r => r.type === 'ETF').length

  return (
    <div className="flex flex-col h-full">

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-white/5 bg-white/[0.01]">
        <div className="flex gap-1 p-1 border rounded-xl bg-black/40 border-white/5">
          {[
            { label: 'All', value: 'All', count: safeRankings.length },
            { label: 'Stocks', value: 'Stock', count: stockCount },
            { label: 'ETFs', value: 'ETF', count: etfCount },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => { setTypeFilter(tab.value) }}
              className={`px-4 py-1.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                typeFilter === tab.value
                  ? 'bg-white/10 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label} <span className="ml-1 opacity-40">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {sectors.length > 0 && (
            <select
              value={sectorFilter}
              onChange={e => { onSectorFilterChange?.(e.target.value) }}
              className="appearance-none px-3 py-1.5 rounded-xl border border-white/5 bg-black font-mono text-xs font-bold uppercase tracking-wider text-white outline-none transition-all cursor-pointer hover:border-white/20 focus:border-[var(--terminal-accent)]"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%23ffffff%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '28px' }}
            >
              <option value="All">All Sectors</option>
              {sectors.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          )}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search ticker..."
              className="w-40 pl-8 pr-3 py-1.5 rounded-xl border border-white/5 bg-black/40 font-mono text-xs text-white placeholder-slate-600 outline-none transition-all focus:w-56 focus:border-[var(--terminal-accent)] focus:bg-[var(--terminal-accent-soft)]"
            />
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="flex-1 min-h-0 overflow-auto md:hidden">
        {displayedRows.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="mb-2 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-white">
                No ranking rows visible
              </div>
              <div className="font-mono text-[11px] leading-relaxed text-slate-500">
                Loaded {safeRankings.length} assets ({stockCount} stocks, {etfCount} ETFs). Clear the search or switch the asset filter to All.
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {displayedRows.map((row, idx) => {
              const signalStyle = SIGNAL_STYLES[row.signal] || SIGNAL_STYLES.HOLD
              const trendStyle  = TREND_STYLES[row.trend]   || TREND_STYLES.SIDEWAYS
              const typeStyle   = TYPE_STYLES[row.type]     || TYPE_STYLES.Stock
              const isSelected  = selectedStock?.stock === row.stock
              return (
                <div
                  key={row.stock}
                  onClick={() => onSelectStock(row)}
                  onDoubleClick={() => onDoubleClickStock && onDoubleClickStock(row)}
                  className={`px-3 py-3 cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'bg-[var(--terminal-accent-soft)]'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-display text-base font-black tracking-tight text-white truncate">{row.stock}</span>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-tighter ${typeStyle.bg} ${typeStyle.text} border border-white/5`}>
                        {row.type === 'ETF' ? 'ETF' : 'EQT'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-widest ${signalStyle.bg} ${signalStyle.text} border ${signalStyle.border}`}>
                        {row.signal}
                      </span>
                      <span className="font-mono text-sm font-black text-white tabular-nums">
                        {Number.isFinite(row.last_close) ? row.last_close.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '--'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <ScoreBar score={row.score} />
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs font-bold text-slate-400 tabular-nums">
                        RSI {Number.isFinite(row.rsi) ? row.rsi.toFixed(1) : '--'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${trendStyle.color.replace('text-', 'bg-')} shadow-[0_0_6px_currentColor]`} />
                        <span className={`font-mono text-[11px] font-black uppercase tracking-[0.15em] ${trendStyle.color}`}>
                          {row.trend}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold tabular-nums">
                        {Number.isFinite(row.news) ? (
                          <span className={row.news > 0 ? 'text-emerald-400' : row.news < 0 ? 'text-rose-400' : 'text-slate-400'}>
                            {row.news > 0 ? '+' : ''}{row.news.toFixed(1)}
                          </span>
                        ) : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block flex-1 min-h-0 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[var(--terminal-panel)]/95 backdrop-blur-xl border-b border-white/5">
            <tr>
              <th className="px-3 py-4 text-left font-mono text-xs font-bold uppercase tracking-widest text-slate-500">#</th>
              <SortHeader label="Asset" field="stock" />
              <SortHeader label="Score" field="score" />
              <SortHeader label="Signal" field="signal" />
              <SortHeader label="RSI" field="rsi" />
              <SortHeader label="Trend" field="trend" />
              <SortHeader label="News" field="news" />
              <th className="px-3 py-4 text-right font-mono text-xs font-bold uppercase tracking-widest text-slate-500">Price</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {displayedRows.map((row, idx) => {
              const signalStyle = SIGNAL_STYLES[row.signal] || SIGNAL_STYLES.HOLD
              const trendStyle  = TREND_STYLES[row.trend]   || TREND_STYLES.SIDEWAYS
              const typeStyle   = TYPE_STYLES[row.type]     || TYPE_STYLES.Stock
              const isSelected  = selectedStock?.stock === row.stock

              return (
                <tr
                  key={row.stock}
                  onClick={() => onSelectStock(row)}
                  onDoubleClick={() => onDoubleClickStock && onDoubleClickStock(row)}
                  className={`group cursor-pointer transition-all duration-300 ${
                    isSelected 
                      ? 'bg-[var(--terminal-accent-soft)]' 
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <td className="px-3 py-5 font-mono text-xs text-slate-600 tabular-nums">{(sorted.indexOf(row) + 1).toString().padStart(2, '0')}</td>
                  <td className="px-3 py-5">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-black tracking-tight text-white group-hover:text-[var(--terminal-accent)] transition-colors">{row.stock}</span>
                      <span className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-tighter ${typeStyle.bg} ${typeStyle.text} border border-white/5`}>
                        {row.type === 'ETF' ? 'ETF' : 'EQT'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-5">
                    <ScoreBar score={row.score} />
                  </td>
                  <td className="px-3 py-5">
                    <span className={`inline-flex items-center rounded-lg px-3 py-1 font-mono text-xs font-black uppercase tracking-widest ${signalStyle.bg} ${signalStyle.text} border ${signalStyle.border} ${signalStyle.glow}`}>
                      {row.signal}
                    </span>
                  </td>
                  <td className="px-3 py-5 font-mono text-sm font-bold text-slate-400 tabular-nums">{Number.isFinite(row.rsi) ? row.rsi.toFixed(1) : '--'}</td>
                  <td className="px-3 py-5">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${trendStyle.color.replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`} />
                    <span className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${trendStyle.color} ${trendStyle.glow}`}>
                      {row.trend}
                    </span>
                    </div>
                  </td>
                  <td className="px-3 py-5 font-mono text-sm font-bold tabular-nums">
                    {Number.isFinite(row.news) ? (
                      <span className={row.news > 0 ? 'text-emerald-400 glow-green' : row.news < 0 ? 'text-rose-400 glow-red' : 'text-slate-400'}>
                        {row.news > 0 ? '+' : ''}{row.news.toFixed(2)}
                      </span>
                    ) : '--'}
                  </td>
                  <td className="px-3 py-5 font-mono text-sm font-black text-right text-white tabular-nums">
                    {Number.isFinite(row.last_close) ? row.last_close.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '--'}
                  </td>
                </tr>
              )
            })}
            {displayedRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-16 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="mb-2 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-white">
                      No ranking rows visible
                    </div>
                    <div className="font-mono text-[11px] leading-relaxed text-slate-500">
                      Loaded {safeRankings.length} assets ({stockCount} stocks, {etfCount} ETFs). Clear the search or switch the asset filter to All.
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-6 py-4 bg-white/[0.01] border-t border-white/5 mt-auto">
        <p className="font-mono text-xs text-slate-500 uppercase tracking-widest">
          Showing {displayedRows.length} of {sorted.length} results · {stockCount} stocks · {etfCount} ETFs
        </p>

      </div>
    </div>
  )
}
