import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'

export default function StockManagerModal({ open, onClose, onStocksChanged }) {
  const [tickers, setTickers] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      fetchTickers()
      setError('')
      setSuccess('')
      setInput('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const fetchTickers = async () => {
    try {
      const res = await axios.get('/api/stocks')
      setTickers(res.data.tickers || [])
    } catch {
      setError('Failed to load watchlist')
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    const sym = input.trim().toUpperCase()
    if (!sym) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await axios.post('/api/stocks/add', { ticker: sym })
      setTickers(res.data.tickers || [...tickers, sym])
      setSuccess(res.data.message)
      setInput('')
      onStocksChanged?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add stock')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (ticker) => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await axios.delete('/api/stocks/remove', { data: { ticker } })
      setTickers(res.data.tickers || tickers.filter(t => t !== ticker))
      setSuccess(res.data.message)
      onStocksChanged?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove stock')
    } finally {
      setLoading(false)
    }
  }

  const filtered = tickers.filter(t =>
    t.toLowerCase().includes(search.toLowerCase())
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0a0c10] shadow-2xl shadow-black/50 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="font-display text-base font-black text-white tracking-tight">Manage Watchlist</h2>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 mt-0.5">
              {tickers.length} stocks tracked
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="px-6 py-4 border-b border-white/5">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder="e.g. NVDA"
              maxLength={10}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 font-mono text-sm font-bold text-white placeholder-slate-600 outline-none transition-all focus:border-[var(--terminal-accent)] focus:bg-[var(--terminal-accent-soft)]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 rounded-xl border border-[var(--terminal-accent)]/30 bg-[var(--terminal-accent)]/10 font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--terminal-accent)] transition-all hover:bg-[var(--terminal-accent)]/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? '...' : 'Add'}
            </button>
          </div>
          {error && (
            <p className="mt-2 font-mono text-[11px] text-[var(--terminal-red)]">{error}</p>
          )}
          {success && (
            <p className="mt-2 font-mono text-[11px] text-[var(--terminal-green)]">{success}</p>
          )}
        </form>

        {/* Search + list */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-6 py-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter tickers..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-white/5 bg-black/40 font-mono text-xs text-white placeholder-slate-600 outline-none transition-all focus:border-[var(--terminal-accent)]"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-6 pb-4">
            {filtered.length === 0 ? (
              <div className="py-10 text-center font-mono text-[11px] text-slate-500">
                {tickers.length === 0 ? 'No stocks in watchlist' : 'No match found'}
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map(ticker => (
                  <div
                    key={ticker}
                    className="group flex items-center justify-between px-3 py-2 rounded-xl transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="font-mono text-sm font-bold text-white">{ticker}</span>
                    <button
                      onClick={() => handleRemove(ticker)}
                      disabled={loading}
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded-md text-slate-500 transition-all hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40"
                      title={`Remove ${ticker}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
