import React, { useMemo, useState } from 'react'

const TOP_PER_SECTOR = 24

const SIGNAL_DOT_COLOR = {
  BUY: '#34d399',
  HOLD: '#fbbf24',
  SELL: '#fb7185',
}

function changeColor(v) {
  if (v == null || isNaN(v)) return { bg: 'rgba(127,138,163,0.08)', text: '#7f8aa3' }
  const clamped = Math.max(-5, Math.min(5, v))
  const intensity = Math.abs(clamped) / 5
  if (clamped > 0) {
    const alpha = 0.12 + intensity * 0.48
    return {
      bg: `rgba(16,185,129,${alpha.toFixed(3)})`,
      text: intensity > 0.45 ? '#0a0d14' : '#34d399',
    }
  }
  if (clamped < 0) {
    const alpha = 0.12 + intensity * 0.48
    return {
      bg: `rgba(244,63,94,${alpha.toFixed(3)})`,
      text: intensity > 0.45 ? '#0a0d14' : '#fb7185',
    }
  }
  return { bg: 'rgba(127,138,163,0.06)', text: '#94a3b8' }
}

function StockCell({ stock, onSelect, onDoubleClick }) {
  const v = Number(stock.change_1d)
  const { bg, text } = changeColor(v)
  const dotColor = SIGNAL_DOT_COLOR[stock.signal] || SIGNAL_DOT_COLOR.HOLD

  return (
    <button
      onClick={() => onSelect?.(stock)}
      onDoubleClick={() => onDoubleClick?.(stock)}
      title={`${stock.ticker} · ${stock.name || 'Unknown'}
${stock.signal || 'HOLD'} · Score ${stock.score?.toFixed?.(1) ?? '--'}
${v > 0 ? '+' : ''}${v.toFixed(2)}% · $${Number(stock.last_close).toFixed(2)}`}
      className="relative flex items-center justify-center rounded-md font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-tight transition-all hover:scale-110 hover:z-20 hover:ring-1 hover:ring-white/50"
      style={{
        backgroundColor: bg,
        color: text,
        height: '26px',
        width: '50px',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <span className="absolute top-0.5 right-0.5 h-1 w-1 rounded-full" style={{ backgroundColor: dotColor, opacity: 0.85 }} />
      <span className="truncate">{stock.ticker}</span>
    </button>
  )
}

function SectorRow({ sector, onSelect, onDoubleClick }) {
  const { name, stocks, avgChange, totalValue, expanded, onToggle } = sector
  const visible = expanded ? stocks : stocks.slice(0, TOP_PER_SECTOR)
  const hidden = stocks.length - visible.length

  const formatVal = (n) => {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M'
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
    return '$' + n.toLocaleString()
  }

  return (
    <div className="border-b border-white/5 last:border-b-0 px-2 sm:px-3 py-2.5 sm:py-3">
      {/* Sector header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full shrink-0" style={{
            backgroundColor: avgChange >= 0 ? '#34d399' : '#fb7185',
            boxShadow: avgChange >= 0 ? '0 0 8px rgba(52,211,153,0.5)' : '0 0 8px rgba(251,113,133,0.5)',
          }} />
          <span className="font-display text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider text-white/80 truncate">
            {name}
          </span>
          <span className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 hidden sm:inline">
            {stocks.length} stock{stocks.length !== 1 ? 's' : ''} · {formatVal(totalValue)}
          </span>
        </div>
        <div
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider border shrink-0 ${
            avgChange > 0
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : avgChange < 0
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              : 'bg-white/5 text-slate-400 border-white/10'
          }`}
        >
          {avgChange > 0 ? '▲' : avgChange < 0 ? '▼' : '•'} {Math.abs(avgChange).toFixed(2)}%
        </div>
      </div>

      {/* Heatmap cells — full width horizontal wrap */}
      <div className="flex flex-wrap gap-1">
        {visible.map((s) => (
          <StockCell key={s.ticker} stock={s} onSelect={onSelect} onDoubleClick={onDoubleClick} />
        ))}
      </div>

      {/* Expand / collapse */}
      {stocks.length > TOP_PER_SECTOR && (
        <button
          onClick={onToggle}
          className="mt-2 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 hover:text-[var(--terminal-accent)] transition-colors"
        >
          {expanded ? 'Show less ▲' : `+${hidden} more ▼`}
        </button>
      )}
    </div>
  )
}

export default function SectorHeatmap({ rankings, onSelectStock, onDoubleClickStock }) {
  const [expandedSectors, setExpandedSectors] = useState({})

  const sectors = useMemo(() => {
    const grouped = {}
    for (const r of rankings) {
      const sec = r.sector
      if (!sec) continue
      if (!grouped[sec]) grouped[sec] = []
      grouped[sec].push(r)
    }
    return Object.entries(grouped)
      .map(([name, stocks]) => {
        const changes = stocks.map(s => Number(s.change_1d)).filter(v => v != null && !isNaN(v))
        const avgChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0
        const totalValue = stocks.reduce((sum, s) => sum + (Number(s.turnover) || 0), 0)
        const sorted = [...stocks].sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0))
        return { name, stocks: sorted, avgChange, totalValue }
      })
      .sort((a, b) => b.totalValue - a.totalValue)
  }, [rankings])

  const toggle = (name) => {
    setExpandedSectors(prev => ({ ...prev, [name]: !prev[name] }))
  }

  if (sectors.length === 0) return null

  const totalStocks = sectors.reduce((sum, s) => sum + s.stocks.length, 0)

  return (
    <div className="mt-4 sm:mt-5 lg:mt-6">
      <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-[var(--terminal-cyan)] shrink-0" />
          <span className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Sector Heatmap
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 hidden sm:inline">
            {totalStocks} stocks · color = 1D%
          </span>
          {/* Legend */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[8px] uppercase tracking-wider text-slate-600">−5%</span>
            <div className="h-2 w-24 sm:w-32 rounded-full" style={{
              background: 'linear-gradient(to right, rgba(244,63,94,0.55), rgba(244,63,94,0.12), rgba(127,138,163,0.08), rgba(16,185,129,0.12), rgba(16,185,129,0.55))',
            }} />
            <span className="font-mono text-[8px] uppercase tracking-wider text-slate-600">+5%</span>
          </div>
        </div>
      </div>

      {/* Full-width heatmap panel */}
      <div className="terminal-panel rounded-2xl sm:rounded-3xl overflow-hidden">
        {sectors.map(sec => (
          <SectorRow
            key={sec.name}
            sector={{
              ...sec,
              expanded: !!expandedSectors[sec.name],
              onToggle: () => toggle(sec.name),
            }}
            onSelect={onSelectStock}
            onDoubleClick={onDoubleClickStock}
          />
        ))}
      </div>
    </div>
  )
}
