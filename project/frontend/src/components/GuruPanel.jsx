import React, { useState } from 'react'

const GURU_COLORS = {
  'elon-musk': { accent: '#e31937', glow: 'rgba(227,25,55,0.3)', avatar: 'EM' },
  'jensen-huang': { accent: '#76b900', glow: 'rgba(118,185,0,0.3)', avatar: 'JH' },
  'leopold-aschenbrenner': { accent: '#00e5ff', glow: 'rgba(0,229,255,0.3)', avatar: 'LA' },
}

const formatNumber = (n) => {
  if (n == null || isNaN(n)) return '--'
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + n.toLocaleString()
}

const formatShares = (n) => {
  if (n == null || isNaN(n)) return '--'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function GuruCard({ guru, isSelected, onSelect, color }) {
  return (
    <button
      onClick={() => onSelect(guru.id)}
      className={`relative glass-card group text-left w-full transition-all duration-300 touch-target overflow-hidden ${
        isSelected
          ? 'border-opacity-50 ring-1 scale-[1.01]'
          : 'hover:scale-[1.01] hover:border-opacity-30'
      }`}
      style={{
        borderColor: isSelected ? color.accent : 'transparent',
        boxShadow: isSelected ? `0 0 20px ${color.glow}, inset 0 1px 0 rgba(255,255,255,0.05)` : undefined,
      }}
    >
      <div className="p-3 sm:p-4 lg:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs sm:text-sm font-black transition-transform group-hover:scale-110"
            style={{ backgroundColor: `${color.accent}20`, color: color.accent, border: `1px solid ${color.accent}30` }}
          >
            {color.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm sm:text-base font-bold text-white truncate">{guru.name}</p>
            <p className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5 truncate">{guru.title}</p>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] sm:text-[11px] font-bold border"
            style={{ backgroundColor: `${color.accent}10`, color: color.accent, borderColor: `${color.accent}20` }}>
            {guru.holdings.length} {guru.holdings.length === 1 ? 'holding' : 'holdings'}
          </span>
          {guru.holdings.some(h => h.type === 'SHORT') && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] sm:text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {guru.holdings.filter(h => h.type === 'SHORT').length} shorts
            </span>
          )}
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 transition-opacity duration-300"
        style={{ backgroundColor: color.accent, opacity: isSelected ? 1 : 0 }}
      />
    </button>
  )
}

function HoldingsTable({ holdings, onSelectTicker, guruColor }) {
  const longs = holdings.filter(h => h.type === 'LONG')
  const shorts = holdings.filter(h => h.type === 'SHORT')

  const totalLongValue = longs.reduce((s, h) => s + (h.value || 0), 0)
  const totalShortValue = shorts.reduce((s, h) => s + (h.value || 0), 0)

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      {longs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--terminal-green)] shadow-[0_0_6px_var(--terminal-green)]" />
            <span className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400">Long Positions</span>
            <span className="font-mono text-[9px] sm:text-[10px] text-slate-600">·</span>
            <span className="font-mono text-[9px] sm:text-[10px] text-slate-500">{formatNumber(totalLongValue)}</span>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 pb-2 pr-2">#</th>
                  <th className="text-left font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 pb-2 pr-3">Ticker</th>
                  <th className="text-left font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 pb-2 pr-3 hidden sm:table-cell">Company</th>
                  <th className="text-right font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 pb-2 pr-3">Shares</th>
                  <th className="text-right font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 pb-2 pr-3">Value</th>
                  <th className="text-right font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 pb-2">Weight</th>
                </tr>
              </thead>
              <tbody>
                {longs.map((h, i) => (
                  <tr key={h.ticker}
                    onClick={() => onSelectTicker(h.ticker)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors group">
                    <td className="py-2 pr-2 font-mono text-[9px] text-slate-600">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded font-mono text-[10px] sm:text-[11px] font-bold text-white/90 group-hover:text-[var(--terminal-accent)] transition-colors"
                        style={{ backgroundColor: `${guruColor}15`, border: `1px solid ${guruColor}25` }}>
                        {h.ticker}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-[10px] sm:text-[11px] text-slate-400 hidden sm:table-cell truncate max-w-[180px]">{h.name}</td>
                    <td className="py-2 pr-3 text-right font-mono text-[10px] sm:text-[11px] text-white/60">{formatShares(h.shares)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-[10px] sm:text-[11px] font-bold text-[var(--terminal-green)]">{formatNumber(h.value)}</td>
                    <td className="py-2 text-right font-mono text-[10px] sm:text-[11px] text-slate-400">{h.pct_of_portfolio?.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {shorts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--terminal-red)] shadow-[0_0_6px_var(--terminal-red)]" />
            <span className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-rose-400">Short / Put Options</span>
            <span className="font-mono text-[9px] sm:text-[10px] text-slate-600">·</span>
            <span className="font-mono text-[9px] sm:text-[10px] text-slate-500">{formatNumber(totalShortValue)}</span>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 pb-2 pr-2">#</th>
                  <th className="text-left font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 pb-2 pr-3">Ticker</th>
                  <th className="text-left font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 pb-2 pr-3 hidden sm:table-cell">Company</th>
                  <th className="text-right font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 pb-2 pr-3">Shares</th>
                  <th className="text-right font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 pb-2 pr-3">Value</th>
                  <th className="text-right font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 pb-2">Weight</th>
                </tr>
              </thead>
              <tbody>
                {shorts.map((h, i) => (
                  <tr key={h.ticker}
                    onClick={() => onSelectTicker(h.ticker)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors group">
                    <td className="py-2 pr-2 font-mono text-[9px] text-slate-600">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded font-mono text-[10px] sm:text-[11px] font-bold text-white/90 group-hover:text-[var(--terminal-accent)] transition-colors"
                        style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        {h.ticker}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-[10px] sm:text-[11px] text-slate-400 hidden sm:table-cell truncate max-w-[180px]">{h.name}</td>
                    <td className="py-2 pr-3 text-right font-mono text-[10px] sm:text-[11px] text-white/60">{formatShares(h.shares)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-[10px] sm:text-[11px] font-bold text-[var(--terminal-red)]">{formatNumber(h.value)}</td>
                    <td className="py-2 text-right font-mono text-[10px] sm:text-[11px] text-slate-400">{h.pct_of_portfolio?.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GuruPanel({ gurus, rankings, onSelectTicker }) {
  const [selectedGuru, setSelectedGuru] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  const handleSelectGuru = (guruId) => {
    if (selectedGuru === guruId) {
      setShowDetail(false)
      setTimeout(() => setSelectedGuru(null), 200)
    } else {
      setSelectedGuru(guruId)
      setShowDetail(true)
    }
  }

  const selected = gurus?.find(g => g.id === selectedGuru)

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {gurus?.map(guru => (
          <GuruCard
            key={guru.id}
            guru={guru}
            isSelected={selectedGuru === guru.id}
            onSelect={handleSelectGuru}
            color={GURU_COLORS[guru.id] || { accent: '#3b82f6', glow: 'rgba(59,130,246,0.3)', avatar: guru.name.split(' ').map(w => w[0]).join('') }}
          />
        ))}
      </div>

      {showDetail && selected && (
        <div className="terminal-inset rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5">
          <div className="flex items-start gap-3 mb-3 sm:mb-4">
            <div className="flex-1 min-w-0">
              <p className="font-display text-xs sm:text-sm font-bold text-white/60 truncate">{selected.bio}</p>
              <p className="font-mono text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-1">Source: {selected.source}</p>
            </div>
            <button
              onClick={() => { setShowDetail(false); setTimeout(() => setSelectedGuru(null), 200) }}
              className="shrink-0 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8 2L2 8M2 2l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
          <HoldingsTable
            holdings={selected.holdings}
            onSelectTicker={onSelectTicker}
            guruColor={GURU_COLORS[selected.id]?.accent || '#3b82f6'}
          />
        </div>
      )}
    </div>
  )
}
