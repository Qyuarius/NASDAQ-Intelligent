import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const COMMODITY_META = {
  oil: { label: 'Crude Oil', unit: 'USD/bbl', code: 'CL1', color: 'text-[var(--terminal-accent)]', chartColor: '#f97316', icon: '🛢' },
  coal: { label: 'Coal', unit: 'USD/t', code: 'COAL', color: 'text-slate-200', chartColor: '#94a3b8', icon: '⛏' },
  nickel: { label: 'Nickel', unit: 'USD/t', code: 'NICK', color: 'text-[var(--terminal-cyan)]', chartColor: '#00c8ff', icon: '🔩' },
  gold: { label: 'Gold', unit: 'USD/oz', code: 'GOLD', color: 'text-[var(--terminal-yellow)]', chartColor: '#ffd166', icon: '🥇' },
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#030407]/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="font-mono text-[10px] text-slate-500 mb-1">{label}</p>
      <p className="font-mono text-sm font-bold text-white">{payload[0].value.toFixed(2)}</p>
    </div>
  )
}

function StatCard({ label, value, valueClassName }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 sm:p-6 transition-all hover:bg-white/[0.03] hover:border-white/10">
      <div className="font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 sm:mb-2">{label}</div>
      <div className={`font-mono text-lg sm:text-2xl font-black tracking-tight ${valueClassName || 'text-white'}`}>{value}</div>
    </div>
  )
}

function formatNumber(n) {
  if (n == null) return '--'
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CommodityDetailPage({ commodityKey, commodityData, seriesData, correlatedStocks, onBack }) {
  const meta = COMMODITY_META[commodityKey] || {}
  const price = commodityData?.price
  const changePct = commodityData?.change_pct ?? 0
  const series = seriesData || []

  const prices = series.map(s => s.close).filter(v => v != null)
  const high3m = prices.length ? Math.max(...prices) : null
  const low3m = prices.length ? Math.min(...prices) : null
  const avg3m = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null

  return (
    <div className="min-h-screen bg-[var(--terminal-bg)] text-[var(--terminal-text)] selection:bg-[var(--terminal-accent)] selection:text-black">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#030407]/60 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-8">
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                onClick={onBack}
                className="group flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 shrink-0 transition-all border rounded-xl sm:rounded-2xl border-white/10 bg-white/5 text-slate-400 hover:border-[var(--terminal-accent)] hover:bg-[var(--terminal-accent-soft)] hover:text-[var(--terminal-accent)]"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="hidden sm:block w-px h-8 bg-white/5" />
              <div>
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white font-display">
                  {meta.label} <span className="hidden sm:inline text-[var(--terminal-muted)]">/ Commodity Report</span>
                </h1>
                <div className="flex items-center gap-2 font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--terminal-muted)]">
                  <span className={`h-1.5 w-1.5 rounded-full ${changePct >= 0 ? 'bg-[var(--terminal-green)]' : 'bg-[var(--terminal-red)]'} shadow-[0_0_8px_var(--terminal-green)]`} />
                  {meta.code} · {meta.unit}
                </div>
              </div>
            </div>
            <div className={`self-start sm:self-auto inline-flex items-center rounded-xl sm:rounded-2xl border px-3 py-1.5 sm:px-5 sm:py-2.5 font-mono text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] ${changePct > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : changePct < 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-white/5 text-slate-400 border-white/10'} shadow-2xl`}>
              <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full mr-2 sm:mr-3 animate-pulse ${changePct > 0 ? 'bg-emerald-500 shadow-[0_0_10px_var(--terminal-green)]' : changePct < 0 ? 'bg-rose-500 shadow-[0_0_10px_var(--terminal-red)]' : 'bg-slate-400'}`} />
              {changePct > 0 ? '▲' : changePct < 0 ? '▼' : '•'} {Math.abs(changePct).toFixed(2)}%
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-fade-in">
        <div className="grid grid-cols-1 gap-x-10 gap-y-16 lg:grid-cols-12">
          {/* Price Chart */}
          <div className="lg:col-span-8 h-[300px] sm:h-[400px] lg:h-[500px]">
            <div className="terminal-panel rounded-[2.5rem] p-4 sm:p-6 lg:p-10 pb-8 sm:pb-16 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-10 rounded-full bg-[var(--terminal-accent)]" />
                  <div className="terminal-title">Price History (3 Month)</div>
                </div>
              </div>
              <div className="flex-1 min-h-[320px]">
                {series.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#7f8aa3', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                        axisLine={{ stroke: '#273041' }}
                        tickLine={false}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fill: '#7f8aa3', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                        axisLine={{ stroke: '#273041' }}
                        tickLine={false}
                        tickFormatter={(v) => formatNumber(v)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="close"
                        stroke={meta.chartColor || '#ff9d00'}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, stroke: meta.chartColor || '#ff9d00', strokeWidth: 2, fill: '#030407' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full font-mono text-sm text-slate-600">
                    No historical data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats + Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="terminal-panel rounded-[2.5rem] p-4 sm:p-6 lg:p-10">
              <div className="flex items-center gap-3 mb-4 sm:mb-6 lg:mb-8">
                <div className="h-1.5 w-10 rounded-full bg-[var(--terminal-accent)]" />
                <div className="terminal-title">Statistics</div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <StatCard label="Current Price" value={price != null ? formatNumber(price) : '--'} valueClassName={`text-white ${price >= (avg3m || 0) ? '' : ''}`} />
                <StatCard label="Change" value={`${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%`} valueClassName={changePct > 0 ? 'text-emerald-400' : changePct < 0 ? 'text-rose-400' : 'text-slate-400'} />
                <StatCard label="3M High" value={high3m != null ? formatNumber(high3m) : '--'} valueClassName="text-amber-400" />
                <StatCard label="3M Low" value={low3m != null ? formatNumber(low3m) : '--'} valueClassName="text-sky-400" />
                <StatCard label="3M Avg" value={avg3m != null ? formatNumber(avg3m) : '--'} valueClassName="text-slate-300" />
                <StatCard label="Unit" value={meta.unit || '--'} valueClassName="text-[var(--terminal-muted)]" />
              </div>
            </div>
          </div>

          {/* Correlation Stocks */}
          <div className="lg:col-span-12">
            <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4 sm:mb-6 lg:mb-8">
                <div className="h-1.5 w-10 rounded-full bg-sky-500" />
                <div className="terminal-title">Top Correlation Stocks</div>
                <span className="font-mono text-[10px] text-slate-500 ml-2">({correlatedStocks.length} Stocks)</span>
              </div>
              {correlatedStocks.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-5">
                  {correlatedStocks.slice(0, 15).map((s, i) => {
                    const corr = Math.abs(s.correlation)
                    const isPos = s.correlation >= 0
                    const barColor = corr >= 0.5 ? 'bg-emerald-500' : corr >= 0.3 ? 'bg-amber-500' : 'bg-slate-500'
                    return (
                      <div key={s.ticker || i} className="p-5 transition-all border rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-bold text-white">{s.ticker || s.stock}</span>
                          <span className={`font-mono text-[11px] font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {s.correlation > 0 ? '+' : ''}{s.correlation.toFixed(3)}
                          </span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(corr * 100, 100)}%` }} />
                        </div>
                        <div className="mt-2 font-mono text-[9px] text-slate-500 uppercase tracking-wider">
                          {s.sector || `${commodityKey} correlation`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="font-mono text-[11px] text-slate-600">No correlation data available for {meta.label}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12 mt-20 border-t border-white/5 bg-black/20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-4 text-sm font-bold tracking-widest uppercase font-display text-white/20">
            NASDAQ Intel Terminal
          </div>
          <div className="font-mono text-[10px] text-slate-600 leading-relaxed">
            Data provided for informational purposes only. &copy; 2024 NASDAQ Intel
          </div>
        </div>
      </footer>
    </div>
  )
}
