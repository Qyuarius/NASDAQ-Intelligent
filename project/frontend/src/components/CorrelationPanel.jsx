import React from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell,
} from 'recharts'

const COMMODITY_COLORS = {
  oil: '#f97316',
  coal: '#94a3b8',
  nickel: '#00c8ff',
  gold: '#ffd166',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  const val = payload[0].value

  return (
    <div className="px-3 py-2 rounded-sm shadow-xl terminal-inset">
      <p className="mb-1 font-mono text-xs text-slate-500">{label}</p>
      <p className={`font-mono text-sm font-bold ${val >= 0 ? 'text-[var(--terminal-green)]' : 'text-[var(--terminal-red)]'}`}>
        {val >= 0 ? '+' : ''}{val?.toFixed(3)}
      </p>
    </div>
  )
}

export default function CorrelationPanel({ rankings }) {
  const topStocks = rankings.slice(0, 10)
  const barData = topStocks.map(r => ({
    stock: r.stock,
    correlation: r.correlation ?? 0,
    commodity: r.best_commodity || 'none',
  }))

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="terminal-title">Commodity Correlation</span>
        <div className="flex-1 terminal-divider" />
      </div>

      <div className="p-5 rounded-sm terminal-panel">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-[var(--terminal-muted)]">
          Best commodity correlation per stock (top 10)
        </p>

        {barData.length === 0 ? (
          <div className="flex items-center justify-center h-48 font-mono text-sm text-slate-600">
            No correlation data available
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,157,0,0.12)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[-1, 1]}
                  tick={{ fill: '#7f8aa3', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                  axisLine={{ stroke: '#273041' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="stock"
                  tick={{ fill: '#d8deea', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="correlation" radius={[0, 3, 3, 0]}>
                  {barData.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={
                        entry.correlation >= 0.5 ? '#31d17c' :
                        entry.correlation >= 0 ? '#00c8ff' :
                        entry.correlation >= -0.5 ? '#ffd166' : '#ff5a36'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 mt-4">
          {Object.entries(COMMODITY_COLORS).map(([name, color]) => (
            <span key={name} className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {name}
            </span>
          ))}
          <span className="ml-auto font-mono text-xs uppercase tracking-[0.16em] text-slate-600">
            &gt;= 0.5 strong | 0 to 0.5 moderate | below 0 inverse
          </span>
        </div>
      </div>
    </section>
  )
}
