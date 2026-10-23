import React from 'react'

const COMMODITY_META = {
  oil: { label: 'Crude Oil', unit: 'USD/bbl', code: 'CL1', color: 'text-[var(--terminal-accent)]' },
  coal: { label: 'Coal', unit: 'USD/t', code: 'COAL', color: 'text-slate-200' },
  nickel: { label: 'Nickel', unit: 'USD/t', code: 'NICK', color: 'text-[var(--terminal-cyan)]' },
  gold: { label: 'Gold', unit: 'USD/oz', code: 'GOLD', color: 'text-[var(--terminal-yellow)]' },
  sp500: { label: 'S&P 500', unit: '', code: 'SPX', color: 'text-emerald-400' },
  nasdaq: { label: 'NASDAQ', unit: '', code: 'IXIC', color: 'text-sky-400' },
  dow: { label: 'Dow Jones', unit: '', code: 'DJI', color: 'text-blue-400' },
}

export default function CommodityPanel({ commodities, onSelectCommodity }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-3">
      {Object.entries(COMMODITY_META).map(([key, meta]) => {
        const data = commodities[key]
        const price = typeof data === 'number' ? data : data?.price
        const changePct = typeof data === 'number' ? 0 : data?.change_pct ?? 0

        return (
          <button key={key} onClick={() => onSelectCommodity?.(key)} className="glass-card group p-2.5 sm:p-3 md:p-4 lg:p-5 xl:p-3 text-left w-full cursor-pointer transition-all hover:scale-[1.02] hover:border-[var(--terminal-accent)]/30 touch-target">
            <div className="mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-3 flex items-center justify-between">
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <span className="font-mono text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-slate-500">{meta.code}</span>
                <p className="font-display text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider text-white/40 truncate max-w-[90px] sm:max-w-[120px]">{meta.label}</p>
              </div>
              <div className={`h-1 w-1 sm:h-1.5 sm:w-1.5 md:h-2 md:w-2 rounded-full shrink-0 ${changePct >= 0 ? 'bg-[var(--terminal-green)] shadow-[0_0_10px_var(--terminal-green)]' : 'bg-[var(--terminal-red)] shadow-[0_0_10px_var(--terminal-red)]'} transition-all group-hover:scale-125`} />
            </div>

            <div className="space-y-1 sm:space-y-2 md:space-y-3 xl:space-y-1.5">
              <div className="flex items-baseline gap-1 sm:gap-1.5 md:gap-2 flex-wrap">
                <p className={`font-mono text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-xl font-black tracking-tighter text-white group-hover:text-[var(--terminal-accent)] transition-colors duration-500`}>
                  {price !== undefined && price !== null
                    ? price >= 1000
                      ? price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                      : price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '--'}
                </p>
                {meta.unit && <span className="font-mono text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">{meta.unit}</span>}
              </div>
              <div className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider ${changePct > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : changePct < 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-white/5 text-slate-400 border-white/10'} border shadow-sm`}>
                {changePct > 0 ? '▲' : changePct < 0 ? '▼' : '•'} {Math.abs(changePct).toFixed(2)}%
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
