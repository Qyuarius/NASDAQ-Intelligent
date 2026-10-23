import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'nasdaq-intel-portfolio'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(h =>
      h && typeof h.ticker === 'string' &&
      typeof h.quantity === 'number' && h.quantity > 0 &&
      typeof h.buyPrice === 'number' && h.buyPrice > 0
    )
  } catch {
    return []
  }
}

function saveToStorage(holdings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function usePortfolio() {
  const [holdings, setHoldings] = useState(() => loadFromStorage())

  useEffect(() => {
    saveToStorage(holdings)
  }, [holdings])

  const addHolding = useCallback((ticker, quantity, buyPrice) => {
    const t = ticker.trim().toUpperCase()
    if (!t || quantity <= 0 || buyPrice <= 0) return
    setHoldings(prev => {
      const existing = prev.find(h => h.ticker === t)
      if (existing) {
        // Average cost weighted by quantity
        const totalQty = existing.quantity + quantity
        const avgCost = (existing.buyPrice * existing.quantity + buyPrice * quantity) / totalQty
        return prev.map(h =>
          h.ticker === t
            ? { ...h, quantity: totalQty, buyPrice: Math.round(avgCost * 100) / 100 }
            : h
        )
      }
      return [...prev, {
        ticker: t,
        quantity,
        buyPrice: Math.round(buyPrice * 100) / 100,
        addedAt: new Date().toISOString(),
      }]
    })
  }, [])

  const removeHolding = useCallback((ticker) => {
    setHoldings(prev => prev.filter(h => h.ticker !== ticker))
  }, [])

  const updateHolding = useCallback((ticker, updates) => {
    setHoldings(prev => prev.map(h =>
      h.ticker === ticker ? { ...h, ...updates } : h
    ))
  }, [])

  const clearAll = useCallback(() => {
    setHoldings([])
  }, [])

  return { holdings, addHolding, removeHolding, updateHolding, clearAll }
}
