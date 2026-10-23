import React, { useMemo } from 'react'

function StatCard({ label, value, sub, accent = 'var(--terminal-accent)', icon }) {
  return (
    <div className="glass-card group flex flex-col justify-between p-3 sm:p-4 lg:p-5 min-w-[140px] flex-1">
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <span
            className="flex items-center justify-center h-6 w-6 rounded-lg shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}
          >
            {icon}
          </span>
        )}
        <span className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 truncate">
          {label}
        </span>
      </div>
      <div
        className="font-mono text-base sm:text-lg lg:text-xl font-black tracking-tight transition-all group-hover:scale-105"
        style={{ color: accent, textShadow: `0 0 18px color-mix(in srgb, ${accent} 35%, transparent)` }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 truncate">
          {sub}
        </div>
      )}
    </div>
  )
}

export default function CorrelationStats({ corrData }) {
  const stats = useMemo(() => {
    const edges = corrData?.edges || []
    const nodes = corrData?.nodes || {}
    const aiTickers = corrData?.ai_tickers || []

    if (!edges.length) {
      return { nodeCount: 0, aiCount: 0, edgeCount: 0, strongest: null, weakest: null, avgAbs: 0, inverseCount: 0 }
    }

    let strongest = edges[0]
    let weakest = edges[0]
    let sumAbs = 0
    let inverseCount = 0

    for (const e of edges) {
      const abs = Math.abs(e.correlation)
      sumAbs += abs
      if (e.correlation < 0) inverseCount++
      if (abs > Math.abs(strongest.correlation)) strongest = e
      if (e.correlation < weakest.correlation) weakest = e
    }

    return {
      nodeCount: Object.keys(nodes).length,
      aiCount: aiTickers.length,
      edgeCount: edges.length,
      strongest,
      weakest,
      avgAbs: sumAbs / edges.length,
      inverseCount,
    }
  }, [corrData])

  const formatR = (r) => (r >= 0 ? '+' : '') + r.toFixed(3)

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      <StatCard
        label="Nodes"
        value={stats.nodeCount}
        sub={`${stats.aiCount} AI`}
        accent="var(--terminal-accent)"
        icon={
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <circle cx="5" cy="5" r="2" />
            <circle cx="19" cy="5" r="2" />
            <circle cx="5" cy="19" r="2" />
            <circle cx="19" cy="19" r="2" />
            <path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3" />
          </svg>
        }
      />
      <StatCard
        label="Edges"
        value={stats.edgeCount}
        sub={`${stats.inverseCount} inverse`}
        accent="var(--terminal-green)"
        icon={
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 12h16M4 6h16M4 18h16" />
          </svg>
        }
      />
      <StatCard
        label="Strongest"
        value={stats.strongest ? formatR(stats.strongest.correlation) : '--'}
        sub={stats.strongest ? `${stats.strongest.source} ↔ ${stats.strongest.target}` : ''}
        accent="#31d17c"
        icon={
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M13 7l5 5-5 5M6 12h12" />
          </svg>
        }
      />
      <StatCard
        label="Most Inverse"
        value={stats.weakest && stats.weakest.correlation < 0 ? formatR(stats.weakest.correlation) : 'N/A'}
        sub={stats.weakest && stats.weakest.correlation < 0 ? `${stats.weakest.source} ↔ ${stats.weakest.target}` : 'none found'}
        accent="var(--terminal-red)"
        icon={
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M11 17l-5-5 5-5M18 12H6" />
          </svg>
        }
      />
      <StatCard
        label="Avg |r|"
        value={stats.avgAbs.toFixed(3)}
        sub="mean strength"
        accent="#00c8ff"
        icon={
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M3 12h4l3-9 4 18 3-9h4" />
          </svg>
        }
      />
    </div>
  )
}
