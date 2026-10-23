import React from 'react'

export default function CompareMetricCard({ label, values, colors, format, higherIsBetter = true, suffix = '' }) {
  const fmt = (v) => {
    if (v == null || v === undefined || (typeof v === 'number' && isNaN(v))) return '--'
    if (format) return format(v)
    if (typeof v === 'number') return v.toLocaleString('en-US', { maximumFractionDigits: 2 })
    return String(v)
  }

  const nums = values.map(v => (typeof v === 'number' ? v : null))

  let bestIdx = null
  const validIdxs = nums.map((n, i) => (n != null ? i : -1)).filter(i => i >= 0)
  if (validIdxs.length >= 2 && higherIsBetter !== null) {
    let best = validIdxs[0]
    for (const i of validIdxs) {
      if (higherIsBetter ? nums[i] > nums[best] : nums[i] < nums[best]) best = i
    }
    const bestVal = nums[best]
    bestIdx = validIdxs.filter(i => nums[i] === bestVal).length === 1 ? best : null
  }

  return (
    <div className="glass-card p-3 sm:p-4 flex flex-col gap-2">
      <div className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">
        {label}
      </div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}
      >
        {values.map((v, i) => {
          const isBest = bestIdx === i
          return (
            <div
              key={i}
              className={`text-center transition-all ${
                isBest
                  ? 'text-[var(--terminal-green)] glow-green scale-105'
                  : 'text-white'
              }`}
            >
              <div className="font-mono text-sm sm:text-base lg:text-lg font-black tracking-tight truncate">
                {fmt(v)}{suffix}
              </div>
            </div>
          )
        })}
      </div>
      <div
        className="flex gap-1.5 mt-0.5"
        style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))`, display: 'grid' }}
      >
        {colors.map((c, i) => (
          <div key={i} className="h-0.5 rounded-full" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  )
}
