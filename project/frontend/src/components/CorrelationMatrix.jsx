import React, { useMemo, useState, useRef, useLayoutEffect } from 'react'

function corrColor(r) {
  if (r == null) return 'rgba(255,255,255,0.02)'
  const abs = Math.abs(r)
  if (abs < 0.001) return 'rgba(255,255,255,0.03)'
  if (r >= 0) {
    if (r >= 0.7) return 'rgba(49,209,124,0.85)'
    if (r >= 0.5) return 'rgba(0,200,255,0.75)'
    if (r >= 0.3) return 'rgba(255,209,102,0.6)'
    return `rgba(74,85,104,${0.25 + abs * 0.5})`
  }
  if (r <= -0.5) return 'rgba(255,90,54,0.8)'
  return `rgba(255,90,54,${0.3 + abs * 0.5})`
}

function corrTextColor(r) {
  if (r == null) return '#475569'
  const abs = Math.abs(r)
  return abs > 0.45 ? '#020408' : '#94a3b8'
}

export default function CorrelationMatrix({
  nodes,
  edges,
  aiTickers = [],
  aiTagColors = {},
  minCorrelation = 0,
  showAIOnly = false,
  searchTicker = '',
  onTickerClick,
}) {
  const [hoverCell, setHoverCell] = useState(null)
  const tooltipRef = useRef(null)
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0, ready: false })

  const tickers = useMemo(() => {
    const connected = new Set()
    edges.forEach(e => {
      if (Math.abs(e.correlation) < minCorrelation) return
      if (showAIOnly && !(aiTickers.includes(e.source) && aiTickers.includes(e.target))) return
      connected.add(e.source)
      connected.add(e.target)
    })
    return [...connected]
      .filter(t => nodes[t])
      .sort((a, b) => {
        const aAI = aiTickers.includes(a)
        const bAI = aiTickers.includes(b)
        if (aAI !== bAI) return aAI ? -1 : 1
        const aTag = nodes[a]?.ai_tag || 'zzz'
        const bTag = nodes[b]?.ai_tag || 'zzz'
        if (aTag !== bTag) return aTag < bTag ? -1 : 1
        return a < b ? -1 : 1
      })
  }, [edges, nodes, aiTickers, minCorrelation, showAIOnly])

  const corrMatrix = useMemo(() => {
    const m = {}
    edges.forEach(e => {
      const key = `${e.source}|${e.target}`
      m[key] = e.correlation
      m[`${e.target}|${e.source}`] = e.correlation
    })
    return m
  }, [edges])

  useLayoutEffect(() => {
    if (!hoverCell || !tooltipRef.current) {
      setTooltipPos(p => (p.ready ? { ...p, ready: false } : p))
      return
    }
    const el = tooltipRef.current
    const rect = el.getBoundingClientRect()
    const margin = 12
    let left = hoverCell.mouseX + 14
    let top = hoverCell.mouseY - 10
    if (left + rect.width > window.innerWidth - margin) left = hoverCell.mouseX - rect.width - 14
    if (top + rect.height > window.innerHeight - margin) top = hoverCell.mouseY - rect.height - 10
    left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin))
    top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin))
    setTooltipPos({ left, top, ready: true })
  }, [hoverCell])

  const isHighlighted = (t) => {
    if (!searchTicker) return false
    return t.toLowerCase().includes(searchTicker.toLowerCase())
  }

  if (tickers.length === 0) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center">
        <p className="font-mono text-sm text-slate-500">No correlations match the current filter</p>
      </div>
    )
  }

  const cellSize = 26
  const labelWidth = 64
  const labelHeight = 22
  const gridSize = tickers.length * cellSize

  return (
    <div className="w-full h-full overflow-auto scrollbar-hide relative">
      <div style={{ minWidth: labelWidth + gridSize + 4, minHeight: labelHeight + gridSize + 4 }}>
        <svg width={labelWidth + gridSize + 4} height={labelHeight + gridSize + 4}>
          {/* Top-left corner */}
          <rect x={0} y={0} width={labelWidth} height={labelHeight} fill="transparent" />

          {/* Column headers (top) */}
          {tickers.map((t, i) => {
            const isAI = aiTickers.includes(t)
            const dim = searchTicker && !isHighlighted(t)
            return (
              <g key={`col-${t}`} transform={`translate(${labelWidth + i * cellSize},0)`} opacity={dim ? 0.25 : 1}>
                <text
                  x={cellSize / 2}
                  y={labelHeight - 4}
                  textAnchor="end"
                  transform={`rotate(-45 ${cellSize / 2} ${labelHeight - 4})`}
                  fill={isAI ? (aiTagColors[nodes[t]?.ai_tag] || '#00c8ff') : '#64748b'}
                  fontSize={9}
                  fontFamily="'Geist Mono', monospace"
                  fontWeight={isHighlighted(t) ? 700 : 400}
                  className="cursor-pointer select-none"
                  onClick={() => onTickerClick?.(t)}
                >
                  {t}
                </text>
              </g>
            )
          })}

          {/* Rows */}
          {tickers.map((rowT, ri) => {
            const isAI = aiTickers.includes(rowT)
            const rowDim = searchTicker && !isHighlighted(rowT)
            const tagColor = isAI ? (aiTagColors[nodes[rowT]?.ai_tag] || '#00c8ff') : '#64748b'
            return (
              <g key={`row-${rowT}`} transform={`translate(0,${labelHeight + ri * cellSize})`} opacity={rowDim ? 0.25 : 1}>
                {/* Row label */}
                <text
                  x={labelWidth - 6}
                  y={cellSize / 2 + 3}
                  textAnchor="end"
                  fill={tagColor}
                  fontSize={9}
                  fontFamily="'Geist Mono', monospace"
                  fontWeight={isHighlighted(rowT) ? 700 : 400}
                  className="cursor-pointer select-none"
                  onClick={() => onTickerClick?.(rowT)}
                >
                  {rowT}
                </text>
                {/* Cells */}
                {tickers.map((colT, ci) => {
                  const r = rowT === colT ? 1 : corrMatrix[`${rowT}|${colT}`]
                  const hasVal = r != null && rowT !== colT
                  const dim = (searchTicker && !isHighlighted(rowT) && !isHighlighted(colT)) || (hasVal && Math.abs(r) < minCorrelation)
                  const fill = hasVal ? corrColor(r) : (rowT === colT ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.015)')
                  return (
                    <rect
                      key={`cell-${ri}-${ci}`}
                      x={labelWidth + ci * cellSize}
                      y={0}
                      width={cellSize - 1}
                      height={cellSize - 1}
                      fill={fill}
                      stroke={hoverCell?.row === ri && hoverCell?.col === ci ? '#fff' : 'rgba(255,255,255,0.04)'}
                      strokeWidth={hoverCell?.row === ri && hoverCell?.col === ci ? 1.5 : 0.5}
                      opacity={dim ? 0.15 : 1}
                      style={{ transition: 'opacity 0.2s, stroke 0.15s' }}
                      onMouseEnter={(e) => hasVal && setHoverCell({
                        row: ri, col: ci,
                        rowT, colT, r,
                        mouseX: e.clientX, mouseY: e.clientY,
                      })}
                      onMouseMove={(e) => hasVal && setHoverCell(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null)}
                      onMouseLeave={() => setHoverCell(null)}
                      onClick={() => hasVal && onTickerClick?.(rowT)}
                      className={hasVal ? 'cursor-pointer' : ''}
                    />
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {hoverCell && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 rounded-lg shadow-2xl pointer-events-none terminal-inset"
          style={{
            left: tooltipPos.left,
            top: tooltipPos.top,
            opacity: tooltipPos.ready ? 1 : 0,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-white">{hoverCell.rowT}</span>
            <span className="font-mono text-[10px] text-slate-500">↔</span>
            <span className="font-mono text-xs font-bold text-white">{hoverCell.colT}</span>
          </div>
          <p className={`font-mono text-sm font-black ${hoverCell.r >= 0 ? 'text-[var(--terminal-green)]' : 'text-[var(--terminal-red)]'}`}>
            {hoverCell.r >= 0 ? '+' : ''}{hoverCell.r.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  )
}
