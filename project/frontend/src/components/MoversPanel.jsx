import React from 'react'
import { Link } from 'react-router-dom'

const formatNumber = (n) => {
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

const formatVolume = (n) => {
  if (n == null || isNaN(n)) return '--'
  return formatNumber(n)
}

const formatTurnover = (n) => {
  if (n == null || isNaN(n)) return '--'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + n.toLocaleString()
}

function MoversColumn({ title, items, valueFormatter, isPositiveGood = null, accentColor }) {
  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <div className={`h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full shrink-0`} style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
        <span className="font-mono text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 truncate">{title}</span>
      </div>
      <div className="space-y-0.5 sm:space-y-1 overflow-y-auto scrollbar-hide max-h-[200px] sm:max-h-[260px] md:max-h-[300px]">
        {items.map((item, i) => {
          const change = item.change_1d || 0
          const isPositive = change > 0
          const isNegative = change < 0
          return (
            <div key={item.ticker} className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition-colors hover:bg-white/[0.03] group">
              <span className="font-mono text-[7px] sm:text-[8px] md:text-[9px] font-bold text-slate-600 w-3 sm:w-3.5 text-right shrink-0">{i + 1}</span>
              <span className="font-mono text-[10px] sm:text-xs md:text-[11px] font-black text-white/80 group-hover:text-white w-10 sm:w-11 md:w-12 truncate shrink-0">{item.ticker}</span>
              <span className="flex-1 text-right font-mono text-[9px] sm:text-[10px] md:text-[11px] font-bold text-white/60 shrink-0">${formatPrice(item.last_close)}</span>
              <span className={`font-mono text-[9px] sm:text-[10px] md:text-[11px] font-black shrink-0 ${
                isPositiveGood === true ? (isPositive ? 'text-[var(--terminal-green)]' : isNegative ? 'text-[var(--terminal-red)]' : 'text-slate-400')
                : isPositiveGood === false ? (isPositive ? 'text-[var(--terminal-red)]' : isNegative ? 'text-[var(--terminal-green)]' : 'text-slate-400')
                : (isPositive ? 'text-[var(--terminal-green)]' : isNegative ? 'text-[var(--terminal-red)]' : 'text-slate-400')
              }`}>
                {valueFormatter(item)}
              </span>
            </div>
          )
        })}
        {items.length === 0 && (
          <div className="px-2 py-4 text-center font-mono text-[9px] text-slate-600">No data</div>
        )}
      </div>
    </div>
  )
}

export default function MoversPanel({ rankings }) {
  const topGainers = [...rankings]
    .filter(r => r.change_1d != null)
    .sort((a, b) => (b.change_1d || 0) - (a.change_1d || 0))
    .slice(0, 5)

  const topLosers = [...rankings]
    .filter(r => r.change_1d != null)
    .sort((a, b) => (a.change_1d || 0) - (b.change_1d || 0))
    .slice(0, 5)

  const topVolume = [...rankings]
    .filter(r => r.volume > 0)
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 5)

  const topValue = [...rankings]
    .filter(r => r.turnover > 0)
    .sort((a, b) => (b.turnover || 0) - (a.turnover || 0))
    .slice(0, 5)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <MoversColumn
          title="Top Gainers"
          items={topGainers}
          valueFormatter={(r) => `+${(r.change_1d || 0).toFixed(2)}%`}
          isPositiveGood={true}
          accentColor="var(--terminal-green)"
        />
        <MoversColumn
          title="Top Losers"
          items={topLosers}
          valueFormatter={(r) => `${(r.change_1d || 0).toFixed(2)}%`}
          isPositiveGood={true}
          accentColor="var(--terminal-red)"
        />
        <MoversColumn
          title="Top Volume"
          items={topVolume}
          valueFormatter={(r) => formatVolume(r.volume)}
          accentColor="var(--terminal-accent)"
        />
        <MoversColumn
          title="Top Value"
          items={topValue}
          valueFormatter={(r) => formatTurnover(r.turnover)}
          accentColor="var(--terminal-yellow)"
        />
      </div>
      <div className="flex justify-center">
        <Link
          to="/movers"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border-[var(--terminal-accent)]/30 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          See More
        </Link>
      </div>
    </div>
  )
}
