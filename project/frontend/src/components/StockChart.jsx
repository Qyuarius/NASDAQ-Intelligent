import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'

const TIME_PERIODS = {
  '1D': { label: '1D', days: 1 },
  '1W': { label: '1W', days: 7 },
  '1M': { label: '1M', days: 30 },
  '3M': { label: '3M', days: 90 },
  YTD: { label: 'YTD', days: null },
  '1Y': { label: '1Y', days: null },
  '3Y': { label: '3Y', days: null },
  '5Y': { label: '5Y', days: null },
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  const value = payload[0]?.value

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0c12]/90 p-3 shadow-2xl backdrop-blur-md">
      <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="font-mono text-lg font-bold text-white tabular-nums">
        {value?.toLocaleString()}
      </p>
    </div>
  )
}

export default function StockChart({ stock }) {
  const [selectedPeriod, setSelectedPeriod] = useState('3M')

  const normalizeHistory = (items = []) => items
    .map((item) => ({
      date: item.date || item.datetime || item.time,
      close: Number(item.close ?? item.Close ?? item.price ?? item.value),
    }))
    .filter((item) => item.date && Number.isFinite(item.close))

  const dailyData = normalizeHistory(stock?.price_history)
  const intradayData = normalizeHistory(stock?.intraday_price_history)
  const data = selectedPeriod === '1D' ? (intradayData.length ? intradayData : dailyData) : dailyData

  const parseDate = (dateStr) => new Date(String(dateStr).replace(' ', 'T'))
  const formatDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  const dailyDataGrouped = useMemo(() => {
    const grouped = new Map()

    dailyData.forEach((item) => {
      const dateKey = item.date.split(' ')[0]
      const existing = grouped.get(dateKey)
      if (!existing || parseDate(item.date) > parseDate(existing.date)) {
        grouped.set(dateKey, item)
      }
    })

    return Array.from(grouped.values())
  }, [dailyData])

  const filteredData = useMemo(() => {
    try {
      if (!data.length || !data[data.length - 1]) return []

      const period = TIME_PERIODS[selectedPeriod]
      const lastDate = parseDate(data[data.length - 1].date)
      const lastDayKey = formatDateKey(lastDate)

      if (selectedPeriod === '1D') {
        const sameDayData = data.filter(item => item.date?.startsWith(lastDayKey))
        return sameDayData.length ? sameDayData : data.slice(-80)
      }

      if (selectedPeriod === 'YTD') {
        const yearStart = new Date(lastDate.getFullYear(), 0, 1)
        return dailyDataGrouped.filter(item => item?.date && parseDate(item.date) >= yearStart)
      }

      if (['1Y', '3Y', '5Y'].includes(selectedPeriod)) {
        const years = Number.parseInt(selectedPeriod.slice(0, -1), 10)
        const cutoffDate = new Date(lastDate)
        cutoffDate.setFullYear(cutoffDate.getFullYear() - years)
        return dailyDataGrouped.filter(item => item?.date && parseDate(item.date) >= cutoffDate)
      }

      if (!period?.days) return dailyDataGrouped

      const cutoffDate = new Date(lastDate)
      cutoffDate.setDate(cutoffDate.getDate() - period.days)
      return dailyDataGrouped.filter(item => item?.date && parseDate(item.date) >= cutoffDate)
    } catch (error) {
      console.error('Error in filteredData:', error)
      return []
    }
  }, [data, dailyDataGrouped, selectedPeriod])

  const chartData = useMemo(() => {
    return filteredData.length <= 30 ? filteredData : filteredData.filter((_, i) => {
      const step = Math.ceil(filteredData.length / 30)
      return i % step === 0 || i === filteredData.length - 1
    })
  }, [filteredData])

  const prices = chartData?.map(d => d?.close).filter(Number.isFinite) || []
  const minP = prices.length ? Math.min(...prices) * 0.98 : 0
  const maxP = prices.length ? Math.max(...prices) * 1.02 : 100
  const isUp = prices.length >= 2 && prices[prices.length - 1] >= prices[0]
  const gradientId = isUp ? 'terminalGreenGrad' : 'terminalRedGrad'
  const hasMinuteGranularity = data.some(item => {
    const itemDate = parseDate(item.date)
    return itemDate.getMinutes() !== 0 || itemDate.getSeconds() !== 0
  })

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = parseDate(dateStr)
    if (selectedPeriod === '1D') {
      const timeStr = hasMinuteGranularity
        ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        : `${String(d.getHours()).padStart(2, '0')}:00`
      return `${timeStr} WIB`
    }
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="flex h-full flex-col min-h-0">
      <div className="flex flex-wrap w-full gap-1 sm:gap-1.5 mb-3 sm:mb-4 lg:mb-6">
        {Object.entries(TIME_PERIODS).map(([key, period]) => (
          <button
            key={key}
            onClick={() => setSelectedPeriod(key)}
            className={`flex-shrink-0 rounded-md sm:rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all ${
              selectedPeriod === key
                ? 'bg-white/10 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {!stock ? (
        <div className="flex items-center justify-center flex-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-slate-600">
          Select a stock to view analysis
        </div>
      ) : chartData.length < 2 ? (
        <div className="flex items-center justify-center flex-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-slate-600">
          No data available for selected period
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6 font-mono text-[9px] sm:text-[10px] xl:grid-cols-4">
            <div className="rounded-lg sm:rounded-xl border border-white/5 bg-white/[0.01] p-2 sm:p-3">
              <span className="block mb-0.5 sm:mb-1 font-bold uppercase tracking-wider text-slate-500 text-[8px] sm:text-[9px]">Price</span>
              <span className="text-xs sm:text-sm font-bold text-white tabular-nums">{stock.last_close?.toLocaleString() ?? '--'}</span>
            </div>
            <div className="rounded-lg sm:rounded-xl border border-white/5 bg-white/[0.01] p-2 sm:p-3">
              <span className="block mb-0.5 sm:mb-1 font-bold uppercase tracking-wider text-slate-500 text-[8px] sm:text-[9px]">EMA20</span>
              <span className="text-xs sm:text-sm font-bold text-[var(--terminal-accent)] tabular-nums">{stock.ema20?.toLocaleString() ?? '--'}</span>
            </div>
            <div className="rounded-lg sm:rounded-xl border border-white/5 bg-white/[0.01] p-2 sm:p-3">
              <span className="block mb-0.5 sm:mb-1 font-bold uppercase tracking-wider text-slate-500 text-[8px] sm:text-[9px]">EMA50</span>
              <span className="text-xs sm:text-sm font-bold text-[var(--terminal-cyan)] tabular-nums">{stock.ema50?.toLocaleString() ?? '--'}</span>
            </div>
            <div className="rounded-lg sm:rounded-xl border border-white/5 bg-white/[0.01] p-2 sm:p-3">
              <span className="block mb-0.5 sm:mb-1 font-bold uppercase tracking-wider text-slate-500 text-[8px] sm:text-[9px]">RSI</span>
              <span className={`text-xs sm:text-sm font-bold tabular-nums ${stock.rsi > 70 ? 'text-rose-400' : stock.rsi < 30 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {stock.rsi?.toFixed(1) ?? '--'}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-[150px] sm:min-h-[200px] md:min-h-[250px] lg:min-h-[300px] overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="terminalGreenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="terminalRedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: '#475569', fontSize: 9, fontFamily: 'Geist Mono', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  domain={[minP, maxP]}
                  tick={{ fill: '#475569', fontSize: 9, fontFamily: 'Geist Mono', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0))}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                />
                {stock.ema20 && <ReferenceLine y={stock.ema20} stroke="rgba(255,157,0,0.3)" strokeDasharray="3 3" />}
                {stock.ema50 && <ReferenceLine y={stock.ema50} stroke="rgba(0,200,255,0.3)" strokeDasharray="3 3" />}
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={isUp ? '#10b981' : '#f43f5e'}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 4, fill: isUp ? '#10b981' : '#f43f5e', strokeWidth: 0 }}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
