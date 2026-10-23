import React, { useMemo } from 'react'

const formatVolume = (n) => {
  if (n == null || isNaN(n)) return '--'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

const formatTurnover = (n) => {
  if (n == null || isNaN(n)) return '--'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + n.toLocaleString()
}

export default function SectorPanel({ rankings }) {
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
        const changes = stocks.map(s => s.change_1d).filter(v => v != null && !isNaN(v))
        const avgChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0
        const totalVolume = stocks.reduce((sum, s) => sum + (Number(s.volume) || 0), 0)
        const totalValue = stocks.reduce((sum, s) => sum + (Number(s.turnover) || 0), 0)
        return { name, stockCount: stocks.length, avgChange, totalVolume, totalValue }
      })
      .sort((a, b) => b.totalValue - a.totalValue)
  }, [rankings])

  if (sectors.length === 0) return null

  return (
    <div className="mt-4 sm:mt-5 lg:mt-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-[var(--terminal-cyan)] shrink-0" />
        <span className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Sector Breakdown</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
        {sectors.map((sec) => (
          <div key={sec.name} className="glass-card group p-2.5 sm:p-3 md:p-4 text-left w-full transition-all hover:scale-[1.02] hover:border-[var(--terminal-accent)]/30">
            <div className="mb-2 sm:mb-3 flex items-center justify-between">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-display text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider text-white/70 truncate">{sec.name}</span>
                <span className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600">{sec.stockCount} stock{sec.stockCount !== 1 ? 's' : ''}</span>
              </div>
              <div className={`h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full shrink-0 ${sec.avgChange >= 0 ? 'bg-[var(--terminal-green)] shadow-[0_0_10px_var(--terminal-green)]' : 'bg-[var(--terminal-red)] shadow-[0_0_10px_var(--terminal-red)]'} transition-all group-hover:scale-125`} />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <div className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2 py-0.5 sm:py-1 font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider border shadow-sm ${sec.avgChange > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : sec.avgChange < 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-white/5 text-slate-400 border-white/10'}`}>
                {sec.avgChange > 0 ? '▲' : sec.avgChange < 0 ? '▼' : '•'} {Math.abs(sec.avgChange).toFixed(2)}%
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600">Vol</span>
                <span className="font-mono text-[10px] sm:text-[11px] font-black text-white/60">{formatVolume(sec.totalVolume)}</span>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600">Val</span>
                <span className="font-mono text-[10px] sm:text-[11px] font-black text-[var(--terminal-yellow)]">{formatTurnover(sec.totalValue)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
