import React, { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Force simulation constants
// ---------------------------------------------------------------------------
const REPULSION       = 22000
const ATTRACTION      = 0.004
const CENTER_GRAVITY  = 0.008
const DAMPING         = 0.85
const MAX_TICKS       = 320
const MIN_TICKS       = 120
const SETTLE_THRESHOLD = 0.1
// Extra breathing room beyond the two nodes' physical radii, large enough
// that a node's label (which sits below it) never collides with its
// neighbours — this is what keeps companies from landing on top of one
// another and needing to be dragged apart by hand.
const LABEL_CLEARANCE = 46
// Pure overlap-resolution pass run after the physics settle, so that even
// if the force simulation gets stuck in a locally-tangled state, the final
// layout is guaranteed to have zero overlapping nodes.
const OVERLAP_PASSES = 220

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Pure radius function shared between the simulation and the renderer so
// spacing always matches what's actually drawn on screen.
function computeNodeRadius(ticker, nodes, aiTickers, mode) {
  const node = nodes[ticker]
  if (!node) return 6
  const isAI = aiTickers.includes(ticker)
  const base = isAI ? 10 : 7
  if (mode === 'relationships') return base
  const scoreScale = (node.score || 0) / 10
  return base + scoreScale * 4
}

function minDistFor(radii, a, b) {
  return (radii[a] || 8) + (radii[b] || 8) + LABEL_CLEARANCE
}

// Spread the starting layout out over an area that scales with the number
// of nodes, so dense graphs don't start so cramped that the simulation has
// to fight its way out of a pile-up. Uses a sunflower/golden-angle spiral,
// which distributes points far more evenly than a single ring.
function initPositions(nodes, width, height) {
  const cx = width / 2
  const cy = height / 2
  const entries = Object.keys(nodes)
  const n = entries.length
  const maxRadius = Math.min(width, height) * 0.46
  const golden = Math.PI * (3 - Math.sqrt(5)) // golden angle in radians
  return entries.reduce((acc, ticker, i) => {
    const frac = n > 1 ? i / (n - 1) : 0
    const radius = maxRadius * Math.sqrt(frac)
    const angle = i * golden
    acc[ticker] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    }
    return acc
  }, {})
}

// Direct constraint pass: push any still-overlapping pair apart until every
// node respects its minimum clearance from every other node. Runs after the
// force simulation as a guarantee, independent of how the physics settled.
function resolveOverlaps(positions, tickers, radii, width, height) {
  for (let pass = 0; pass < OVERLAP_PASSES; pass++) {
    let anyOverlap = false
    for (let i = 0; i < tickers.length; i++) {
      for (let j = i + 1; j < tickers.length; j++) {
        const ta = tickers[i], tb = tickers[j]
        const a = positions[ta], b = positions[tb]
        let dx = a.x - b.x
        let dy = a.y - b.y
        let dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = minDistFor(radii, ta, tb)
        if (dist < minDist) {
          anyOverlap = true
          // If nodes are exactly coincident, nudge in a deterministic
          // direction based on index so they don't stay stacked.
          if (dist < 0.001) {
            const ang = (i * 2.399963 + j * 0.732)
            dx = Math.cos(ang)
            dy = Math.sin(ang)
            dist = 1
          }
          const overlap = (minDist - dist) / dist * 0.5
          const px = dx * overlap
          const py = dy * overlap
          a.x += px; a.y += py
          b.x -= px; b.y -= py
        }
      }
    }
    // Keep everything on screen after nudging
    const padX = 50, padY = 50, padBottom = 70
    tickers.forEach(t => {
      const p = positions[t]
      p.x = Math.max(padX, Math.min(width - padX, p.x))
      p.y = Math.max(padY, Math.min(height - padBottom, p.y))
    })
    if (!anyOverlap) break
  }
}

function runSimulation(nodes, edges, width, height, radii) {
  const tickers = Object.keys(nodes)
  let positions = initPositions(nodes, width, height)

  for (let tick = 0; tick < MAX_TICKS; tick++) {
    let totalForce = 0

    // Reset accelerations
    tickers.forEach(t => { positions[t].ax = 0; positions[t].ay = 0 })

    // 1. Repulsion between all nodes (radius + label aware spacing)
    for (let i = 0; i < tickers.length; i++) {
      for (let j = i + 1; j < tickers.length; j++) {
        const ta = tickers[i], tb = tickers[j]
        const a = positions[ta]
        const b = positions[tb]
        let dx = a.x - b.x
        let dy = a.y - b.y
        const distSq = dx * dx + dy * dy || 1
        const dist = Math.sqrt(distSq)
        const force = REPULSION / distSq
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.ax += fx;  a.ay += fy
        b.ax -= fx;  b.ay -= fy
        totalForce += force

        // Minimum spacing scaled to each node's actual rendered size (plus
        // its label), so bigger AI-company nodes get proportionally more
        // breathing room and never sit on top of a neighbour.
        const minDist = minDistFor(radii, ta, tb)
        if (dist < minDist) {
          const push = (minDist - dist) / dist * 0.9
          const px = dx * push
          const py = dy * push
          a.ax += px;  a.ay += py
          b.ax -= px;  b.ay -= py
          totalForce += minDist - dist
        }
      }
    }

    // 2. Attraction along edges
    edges.forEach(({ source, target }) => {
      const a = positions[source]
      const b = positions[target]
      if (!a || !b) return
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = dist * ATTRACTION * (Math.abs(1 / (Math.abs(nodes[source]?.score || 1) - Math.abs(nodes[target]?.score || 1) + 0.5)))
      const fx = dx * force
      const fy = dy * force
      a.ax += fx;  a.ay += fy
      b.ax -= fx;  b.ay -= fy
      totalForce += force
    })

    // 3. Center gravity
    tickers.forEach(t => {
      const p = positions[t]
      const dx = width / 2 - p.x
      const dy = height / 2 - p.y
      p.ax += dx * CENTER_GRAVITY
      p.ay += dy * CENTER_GRAVITY
    })

    // 4. Update positions
    tickers.forEach(t => {
      const p = positions[t]
      p.vx = (p.vx + p.ax) * DAMPING
      p.vy = (p.vy + p.ay) * DAMPING
      p.x += p.vx
      p.y += p.vy
      // Keep within bounds (padding accounts for labels below nodes)
      const padX = 50
      const padY = 50
      const padBottom = 70
      p.x = Math.max(padX, Math.min(width - padX, p.x))
      p.y = Math.max(padY, Math.min(height - padBottom, p.y))
    })

    // Check settle
    if (tick > MIN_TICKS && totalForce / (tickers.length * tickers.length) < SETTLE_THRESHOLD) break
  }

  // Guarantee pass: whatever the physics converged to, make sure no two
  // nodes are left overlapping (this is what removes the need to manually
  // drag companies apart to see them).
  resolveOverlaps(positions, tickers, radii, width, height)

  return tickers.reduce((acc, t) => {
    acc[t] = { x: positions[t].x, y: positions[t].y }
    return acc
  }, {})
}

// Compute arrowhead position for directed edges
function arrowPoints(ax, ay, bx, by, r) {
  const dx = bx - ax
  const dy = by - ay
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = dx / dist
  const ny = dy / dist
  const tipX = bx - nx * (r + 6)
  const tipY = by - ny * (r + 6)
  const p1x = tipX - ny * 5
  const p1y = tipY + nx * 5
  const p2x = tipX + ny * 5
  const p2y = tipY - nx * 5
  return `${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`
}

// ---------------------------------------------------------------------------
// CorrelationGraph component
// ---------------------------------------------------------------------------

export default function CorrelationGraph({
  mode = 'statistical',
  nodes,
  edges,
  aiTagColors = {},
  relationshipTypes = {},
  minCorrelation = 0.3,
  showAIOnly = false,
  aiTickers = [],
  searchTicker = '',
  onNodeClick,
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 })
  const [positions, setPositions] = useState({})
  const [simDone, setSimDone] = useState(false)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [draggedNode, setDraggedNode] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const tooltipRef = useRef(null)
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0, ready: false })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragStart = useRef(null)

  // Filter edges based on mode
  const visibleEdges = useMemo(() => {
    if (mode === 'relationships') {
      // edges are already filtered by type from the parent
      return edges
    }
    return edges.filter(e => {
      if (Math.abs(e.correlation) < minCorrelation) return false
      if (showAIOnly) {
        return aiTickers.includes(e.source) && aiTickers.includes(e.target)
      }
      return true
    })
  }, [edges, minCorrelation, showAIOnly, aiTickers, mode])

  // Visible nodes (only those connected by visible edges)
  const visibleNodeSet = useMemo(() => {
    const s = new Set()
    visibleEdges.forEach(e => { s.add(e.source); s.add(e.target) })
    return s
  }, [visibleEdges])

  // In relationship mode, all nodes from the companies object should be visible
  const visibleNodeTickers = useMemo(() => {
    if (mode === 'relationships') {
      return Object.keys(nodes).filter(t => visibleNodeSet.has(t))
    }
    return Object.keys(nodes).filter(t => visibleNodeSet.has(t))
  }, [nodes, visibleNodeSet, mode])

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setDimensions({ width, height: Math.max(height, 400) })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Keep the tooltip fully on-screen: measure it once rendered and flip/clamp
  // its position so it never gets cut off near the edges of the viewport
  // (which is what made it hard to read when clicking a company near the
  // side or bottom of the graph).
  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) {
      setTooltipPos(p => (p.ready ? { ...p, ready: false } : p))
      return
    }
    const el = tooltipRef.current
    const rect = el.getBoundingClientRect()
    const margin = 12
    let left = tooltip.x + 16
    let top = tooltip.y - 10

    // Flip to the left of the cursor if it would overflow the right edge
    if (left + rect.width > window.innerWidth - margin) {
      left = tooltip.x - rect.width - 16
    }
    // Flip above the cursor if it would overflow the bottom edge
    if (top + rect.height > window.innerHeight - margin) {
      top = tooltip.y - rect.height - 10
    }
    // Final clamp so it's never off any edge, even for corner cases
    left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin))
    top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin))

    setTooltipPos({ left, top, ready: true })
  }, [tooltip])

  // Run force simulation when visible data changes
  useEffect(() => {
    if (visibleNodeTickers.length === 0) { setPositions({}); setSimDone(true); return }
    setSimDone(false)

    const filteredNodes = {}
    visibleNodeTickers.forEach(t => { filteredNodes[t] = nodes[t] })

    const filteredEdges = visibleEdges.filter(
      e => filteredNodes[e.source] && filteredNodes[e.target]
    )

    const radii = {}
    visibleNodeTickers.forEach(t => {
      radii[t] = computeNodeRadius(t, nodes, aiTickers, mode)
    })

    const result = runSimulation(filteredNodes, filteredEdges, dimensions.width, dimensions.height, radii)
    setPositions(result)
    setSimDone(true)
  }, [visibleNodeTickers.length, visibleEdges.length, dimensions.width, dimensions.height, showAIOnly, minCorrelation, mode])

  // -----------------------------------------------------------------------
  // Edge color / thickness (statistical mode)
  // -----------------------------------------------------------------------
  const edgeColor = useCallback((r) => {
    if (r >= 0.7) return '#31d17c'
    if (r >= 0.5) return '#00c8ff'
    if (r >= 0.3) return '#ffd166'
    if (r >= 0)   return '#4a5568'
    if (r >= -0.5) return '#ffd166'
    return '#ff5a36'
  }, [])

  const edgeWidth = useCallback((r) => {
    const abs = Math.abs(r)
    return 0.5 + abs * 2.5
  }, [])

  // Relationship edge color
  const relEdgeColor = useCallback((type) => {
    return relationshipTypes[type]?.color || '#64748b'
  }, [relationshipTypes])

  // -----------------------------------------------------------------------
  // Drag handlers
  // -----------------------------------------------------------------------
  const draggedNodeRef = useRef(null)

  const handleNodeMouseDown = useCallback((e, ticker) => {
    e.stopPropagation()
    const pos = positions[ticker]
    if (!pos) return
    draggedNodeRef.current = ticker
    setDraggedNode(ticker)
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      nodeX: pos.x,
      nodeY: pos.y,
    }
  }, [positions])

  useEffect(() => {
    if (!draggedNode) return

    const handleMouseMove = (e) => {
      if (!dragStart.current || !draggedNodeRef.current) return
      const ticker = draggedNodeRef.current
      const dx = (e.clientX - dragStart.current.mouseX) / zoom
      const dy = (e.clientY - dragStart.current.mouseY) / zoom
      const newX = dragStart.current.nodeX + dx
      const newY = dragStart.current.nodeY + dy
      setPositions(prev => ({
        ...prev,
        [ticker]: {
          x: Math.max(20, Math.min(dimensions.width - 20, newX)),
          y: Math.max(20, Math.min(dimensions.height - 20, newY)),
        },
      }))
    }

    const handleMouseUp = () => {
      draggedNodeRef.current = null
      setDraggedNode(null)
      dragStart.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggedNode, zoom, dimensions.width, dimensions.height])

  // -----------------------------------------------------------------------
  // Zoom with wheel
  // -----------------------------------------------------------------------
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    setZoom(prev => Math.max(0.3, Math.min(3, prev - e.deltaY * 0.001)))
  }, [])

  // -----------------------------------------------------------------------
  // Hover (statistical mode)
  // -----------------------------------------------------------------------
  const handleNodeHoverStat = useCallback((e, ticker) => {
    if (draggedNode) return
    const node = nodes[ticker]
    if (!node) return
    const connected = visibleEdges
      .filter(ed => ed.source === ticker || ed.target === ticker)
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
      .slice(0, 5)
      .map(ed => ({
        ticker: ed.source === ticker ? ed.target : ed.source,
        correlation: ed.correlation,
        name: nodes[ed.source === ticker ? ed.target : ed.source]?.name || '',
      }))

    setHoveredNode(ticker)
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      ticker,
      ...node,
      connected,
    })
  }, [nodes, visibleEdges, draggedNode])

  // -----------------------------------------------------------------------
  // Hover (relationship mode)
  // -----------------------------------------------------------------------
  const handleNodeHoverRel = useCallback((e, ticker) => {
    if (draggedNode) return
    const node = nodes[ticker]
    if (!node) return

    const connected = visibleEdges
      .filter(ed => ed.source === ticker || ed.target === ticker)
      .map(ed => ({
        other: ed.source === ticker ? ed.target : ed.source,
        type: ed.type,
        label: ed.label,
        description: ed.description,
        year: ed.year,
        confidence: ed.confidence,
        direction: ed.source === ticker ? 'outgoing' : 'incoming',
      }))

    setHoveredNode(ticker)
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      ticker,
      ...node,
      connected,
    })
  }, [nodes, visibleEdges, draggedNode])

  const handleNodeHover = useCallback((e, ticker) => {
    if (mode === 'relationships') return handleNodeHoverRel(e, ticker)
    return handleNodeHoverStat(e, ticker)
  }, [mode, handleNodeHoverRel, handleNodeHoverStat])

  const handleNodeLeave = useCallback(() => {
    if (draggedNode) return
    setHoveredNode(null)
    setTooltip(null)
  }, [draggedNode])

  // -----------------------------------------------------------------------
  // Determine connected set (for dimming)
  // -----------------------------------------------------------------------
  const connectedToHovered = useMemo(() => {
    if (!hoveredNode) return new Set()
    const s = new Set([hoveredNode])
    visibleEdges.forEach(e => {
      if (e.source === hoveredNode) s.add(e.target)
      if (e.target === hoveredNode) s.add(e.source)
    })
    return s
  }, [hoveredNode, visibleEdges])

  // Search highlight: when searchTicker is set, highlight the matched node
  // and its directly-connected neighbours, dim everything else.
  const searchSet = useMemo(() => {
    if (!searchTicker) return null
    const q = searchTicker.toLowerCase()
    const matched = visibleNodeTickers.filter(t =>
      t.toLowerCase().includes(q) || (nodes[t]?.name || '').toLowerCase().includes(q)
    )
    if (!matched.length) return null
    const s = new Set(matched)
    visibleEdges.forEach(e => {
      if (matched.includes(e.source)) s.add(e.target)
      if (matched.includes(e.target)) s.add(e.source)
    })
    return s
  }, [searchTicker, visibleNodeTickers, nodes, visibleEdges])

  const hasSearch = searchSet !== null
  const hasHover = hoveredNode !== null

  // -----------------------------------------------------------------------
  // Node radius
  // -----------------------------------------------------------------------
  const nodeRadius = useCallback((ticker) => {
    return computeNodeRadius(ticker, nodes, aiTickers, mode)
  }, [nodes, aiTickers, mode])

  // -----------------------------------------------------------------------
  // Label collision detection — hide overlapping labels, prioritise AI & score
  // -----------------------------------------------------------------------
  const visibleLabelSet = useMemo(() => {
    if (visibleNodeTickers.length === 0) return new Set()

    // Estimate label bounding boxes
    const labels = visibleNodeTickers.map(ticker => {
      const pos = positions[ticker]
      if (!pos) return null
      const r = nodeRadius(ticker)
      const isAI = aiTickers.includes(ticker)
      const score = nodes[ticker]?.score || 0
      const charWidth = 7 // approx px per char at fontSize 11 monospace
      const textWidth = ticker.length * charWidth
      const textHeight = 14
      return {
        ticker,
        isAI,
        score,
        x: pos.x - textWidth / 2,
        y: pos.y + r + 2,
        width: textWidth,
        height: textHeight,
      }
    }).filter(Boolean)

    // Sort: AI first, then by score descending (higher priority = keeps label)
    labels.sort((a, b) => {
      if (a.isAI !== b.isAI) return a.isAI ? -1 : 1
      return b.score - a.score
    })

    // Greedy: keep a label only if it doesn't overlap any already-kept label
    const kept = []
    const visibleSet = new Set()
    for (const label of labels) {
      const overlaps = kept.some(k =>
        !(label.x + label.width < k.x || k.x + k.width < label.x ||
          label.y + label.height < k.y || k.y + k.height < label.y)
      )
      if (!overlaps) {
        kept.push(label)
        visibleSet.add(label.ticker)
      }
    }
    return visibleSet
  }, [visibleNodeTickers, positions, nodes, aiTickers, nodeRadius])

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (visibleNodeTickers.length === 0) {
    return (
      <div ref={containerRef} className="w-full h-full min-h-[400px] flex items-center justify-center">
        <div className="font-mono text-sm text-slate-500">
          {simDone
            ? (mode === 'relationships' ? 'No relationships match the current filter' : 'No correlations match the current filter')
            : 'Computing layout...'}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] relative overflow-hidden select-none">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        onWheel={handleWheel}
        className="cursor-grab active:cursor-grabbing"
      >
        <defs>
          {/* Arrowhead marker for each relationship type */}
          {mode === 'relationships' && Object.entries(relationshipTypes).map(([type, info]) => (
            <marker
              key={`arrow-${type}`}
              id={`arrow-${type}`}
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={info.color} />
            </marker>
          ))}
        </defs>

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {mode === 'statistical' ? (
            // Statistical mode edges
            visibleEdges.map((e, i) => {
              const a = positions[e.source]
              const b = positions[e.target]
              if (!a || !b) return null
              const isDimmed = (hasHover && !connectedToHovered.has(e.source) && !connectedToHovered.has(e.target)) || (hasSearch && !searchSet.has(e.source) && !searchSet.has(e.target))
              return (
                <line
                  key={`${e.source}-${e.target}`}
                  x1={a.x} y1={a.y}
                  x2={b.x} y2={b.y}
                  stroke={edgeColor(e.correlation)}
                  strokeWidth={edgeWidth(e.correlation)}
                  strokeOpacity={isDimmed ? 0.04 : 0.55}
                  className="transition-opacity duration-200"
                />
              )
            })
          ) : (
            // Relationship mode edges
            visibleEdges.map((e, i) => {
              const a = positions[e.source]
              const b = positions[e.target]
              if (!a || !b) return null
              const isDimmed = (hasHover && !connectedToHovered.has(e.source) && !connectedToHovered.has(e.target)) || (hasSearch && !searchSet.has(e.source) && !searchSet.has(e.target))
              const color = relEdgeColor(e.type)
              const isDirected = e.type === 'investment' || e.type === 'customer'
              const isReported = e.confidence === 'reported'
              const r = nodeRadius(e.target)

              return (
                <g key={`rel-${e.source}-${e.target}-${e.type}`}>
                  <line
                    x1={a.x} y1={a.y}
                    x2={b.x} y2={b.y}
                    stroke={color}
                    strokeWidth={2}
                    strokeOpacity={isDimmed ? 0.04 : 0.6}
                    strokeDasharray={isReported ? '6 4' : 'none'}
                    markerEnd={isDirected ? `url(#arrow-${e.type})` : undefined}
                    className="transition-opacity duration-200"
                  />
                </g>
              )
            })
          )}

          {/* Nodes */}
          {visibleNodeTickers.map(ticker => {
            const pos = positions[ticker]
            if (!pos) return null
            const node = nodes[ticker]
            const r = nodeRadius(ticker)
            const isAI = aiTickers.includes(ticker)
            const tagColor = mode === 'relationships'
              ? (isAI ? (aiTagColors[node.ai_tag] || node.ai_tag ? undefined : '#60a5fa') : '#64748b')
              : (isAI ? (aiTagColors[node.ai_tag] || '#00c8ff') : '#64748b')
            // In relationships mode, determine color from AI tag or default
            const nodeColor = mode === 'relationships'
              ? (isAI ? (aiTagColors[node.ai_tag] || '#60a5fa') : '#64748b')
              : tagColor
            const isHovered = hoveredNode === ticker
            const isDimmed = (hasHover && !connectedToHovered.has(ticker)) || (hasSearch && !searchSet.has(ticker))
            const isSearchMatch = hasSearch && searchSet.has(ticker) && (ticker.toLowerCase().includes(searchTicker.toLowerCase()) || (node.name || '').toLowerCase().includes(searchTicker.toLowerCase()))
            const opacity = isDimmed ? 0.18 : 1

            return (
              <g
                key={ticker}
                transform={`translate(${pos.x},${pos.y})`}
                opacity={opacity}
                onMouseDown={e => handleNodeMouseDown(e, ticker)}
                onMouseEnter={e => handleNodeHover(e, ticker)}
                onMouseLeave={handleNodeLeave}
                onClick={(e) => { if (!draggedNode && onNodeClick) { e.stopPropagation(); onNodeClick(ticker) } }}
                className="transition-opacity duration-200 cursor-pointer"
              >
                {/* Non-AI node dashed ring (relationships mode) */}
                {mode === 'relationships' && !isAI && (
                  <circle
                    r={r + 4}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth={1}
                    strokeDasharray="3 2"
                    strokeOpacity={isHovered ? 0.8 : 0.4}
                  />
                )}

                {/* Glow ring for AI companies (or search-matched nodes) */}
                {(isAI || isSearchMatch) && (
                  <circle
                    r={r + (isSearchMatch ? 6 : 4)}
                    fill="none"
                    stroke={isSearchMatch ? '#fff' : nodeColor}
                    strokeWidth={isSearchMatch ? 2 : 1.5}
                    strokeOpacity={isSearchMatch ? 0.9 : (isHovered ? 0.9 : 0.35)}
                    className={isSearchMatch ? 'animate-pulse' : ''}
                  />
                )}

                {/* Main node */}
                <circle
                  r={r}
                  fill={nodeColor}
                  fillOpacity={isHovered ? 0.95 : 0.7}
                  stroke={isHovered ? '#fff' : nodeColor}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-150"
                />

                {/* Ticker label — hidden when overlapping another label (always shown on hover or search match) */}
                {(visibleLabelSet.has(ticker) || isHovered || isSearchMatch) && (
                  <text
                    y={r + 14}
                    textAnchor="middle"
                    fill={isHovered ? '#fff' : '#94a3b8'}
                    fontSize={isHovered ? 13 : 11}
                    fontFamily="'IBM Plex Mono', monospace"
                    fontWeight={isHovered ? 700 : 400}
                    className="pointer-events-none select-none"
                  >
                    {ticker}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Tooltip — Statistical mode */}
      {tooltip && mode === 'statistical' && (
        <div
          ref={tooltipRef}
          className="fixed z-50 max-w-xs px-4 py-3 overflow-y-auto rounded-lg shadow-2xl pointer-events-none terminal-inset"
          style={{
            left: tooltipPos.left,
            top: tooltipPos.top,
            opacity: tooltipPos.ready ? 1 : 0,
            maxHeight: 'min(420px, calc(100vh - 24px))',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: aiTagColors[tooltip.ai_tag] || '#64748b' }}
            />
            <span className="font-mono text-sm font-bold text-white">{tooltip.ticker}</span>
            {tooltip.is_ai && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--terminal-accent)] bg-[var(--terminal-accent)]/10 px-1.5 py-0.5 rounded">
                AI
              </span>
            )}
          </div>
          <p className="mb-1 font-mono text-xs text-slate-300">{tooltip.name}</p>
          <p className="font-mono text-[10px] text-slate-500 mb-2">{tooltip.sector} — {tooltip.ai_sub || ''}</p>

          <div className="flex gap-3 mb-2 font-mono text-xs">
            <span className="text-slate-400">Score: <span className="text-white">{tooltip.score}/10</span></span>
            <span className={`font-bold ${tooltip.signal === 'BUY' ? 'text-[var(--terminal-green)]' : tooltip.signal === 'SELL' ? 'text-[var(--terminal-red)]' : 'text-[var(--terminal-accent)]'}`}>
              {tooltip.signal}
            </span>
          </div>

          {tooltip.connected?.length > 0 && (
            <div className="pt-2 mt-1 border-t border-white/10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-1">Top correlations</p>
              {tooltip.connected.map(c => (
                <div key={c.ticker} className="flex justify-between gap-4 font-mono text-xs py-0.5">
                  <span className="text-slate-300">{c.ticker}</span>
                  <span className={c.correlation >= 0 ? 'text-[var(--terminal-green)]' : 'text-[var(--terminal-red)]'}>
                    {c.correlation >= 0 ? '+' : ''}{c.correlation.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tooltip — Relationship mode */}
      {tooltip && mode === 'relationships' && (
        <div
          ref={tooltipRef}
          className="fixed z-50 max-w-sm px-4 py-3 overflow-y-auto rounded-lg shadow-2xl pointer-events-none terminal-inset"
          style={{
            left: tooltipPos.left,
            top: tooltipPos.top,
            opacity: tooltipPos.ready ? 1 : 0,
            maxHeight: 'min(420px, calc(100vh - 24px))',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm font-bold text-white">{tooltip.ticker}</span>
            {tooltip.is_ai && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--terminal-accent)] bg-[var(--terminal-accent)]/10 px-1.5 py-0.5 rounded">
                AI
              </span>
            )}
          </div>
          <p className="mb-1 font-mono text-xs text-slate-300">{tooltip.name}</p>
          <p className="font-mono text-[10px] text-slate-500 mb-2">{tooltip.sector || ''}</p>

          {tooltip.connected?.length > 0 && (
            <div className="pt-2 mt-1 border-t border-white/10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-1">Relationships</p>
              {tooltip.connected.map((c, i) => {
                const typeInfo = relationshipTypes[c.type] || {}
                return (
                  <div key={i} className="flex items-start gap-2 py-1">
                    <span
                      className="inline-block w-2 h-2 mt-1 rounded-full shrink-0"
                      style={{ backgroundColor: typeInfo.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{c.other}</span>
                        <span className="font-mono text-[10px] text-slate-500">{c.direction === 'incoming' ? '←' : '→'}</span>
                        <span
                          className="font-mono text-[10px] px-1 py-0.5 rounded"
                          style={{ backgroundColor: typeInfo.color + '20', color: typeInfo.color }}
                        >
                          {typeInfo.label || c.type}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-slate-400 truncate">{c.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
