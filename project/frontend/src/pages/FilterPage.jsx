import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const INITIAL_FILTERS = {
  search: '',
  type: 'All',
  sector: 'All',
  signal: 'All',
  scoreMin: '',
  scoreMax: '',
  rsiMin: '',
  rsiMax: '',
  trend: 'All',
  macdBullish: false,
  momentumMin: '',
  momentumMax: '',
  perMin: '',
  perMax: '',
  roeMin: '',
  roeMax: '',
  derMin: '',
  derMax: '',
  npmMin: '',
  npmMax: '',
  marketCap: 'All',
  revenueGrowthMin: '',
  revenueGrowthMax: '',
  dividendYieldMin: '',
  dividendYieldMax: '',
  week52ReturnMin: '',
  week52ReturnMax: '',
  newsSignal: 'All',
  newsScoreMin: '',
  newsScoreMax: '',
};

const MARKET_CAP_PRESETS = [
  { label: 'All', value: 'All' },
  { label: '>$1T', value: '1t' },
  { label: '>$500B', value: '500b' },
  { label: '>$100B', value: '100b' },
  { label: '>$10B', value: '10b' },
  { label: '<$10B', value: '<10b' },
];

const MARKET_CAP_THRESHOLDS = {
  '1t': 1e12,
  '500b': 500e9,
  '100b': 100e9,
  '10b': 10e9,
};

export default function FilterPage() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    const POLL_INTERVAL = 90 * 1000;
    let timer = null;
    const poll = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    timer = setInterval(poll, POLL_INTERVAL);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/output/ranking.json?t=${Date.now()}`);
      if (res.data?.rankings) setRankings(res.data.rankings);
    } catch (err) {
      console.error('Failed to load rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.type !== 'All') count++;
    if (filters.sector !== 'All') count++;
    if (filters.signal !== 'All') count++;
    if (filters.trend !== 'All') count++;
    if (filters.macdBullish) count++;
    if (filters.newsSignal !== 'All') count++;
    if (filters.marketCap !== 'All') count++;
    if (filters.search) count++;
    const rangeKeys = [
      'scoreMin', 'scoreMax', 'rsiMin', 'rsiMax', 'momentumMin', 'momentumMax',
      'perMin', 'perMax', 'roeMin', 'roeMax', 'derMin', 'derMax', 'npmMin', 'npmMax',
      'revenueGrowthMin', 'revenueGrowthMax', 'dividendYieldMin', 'dividendYieldMax',
      'week52ReturnMin', 'week52ReturnMax', 'newsScoreMin', 'newsScoreMax',
    ];
    rangeKeys.forEach((k) => { if (filters[k] !== '') count++; });
    return count;
  }, [filters]);

  const filtered = useMemo(() => {
    return rankings.filter((r) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const haystack = `${r.stock || r.ticker || ''} ${r.name || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.type !== 'All' && r.type !== filters.type) return false;
      if (filters.sector !== 'All' && r.sector !== filters.sector) return false;
      if (filters.signal !== 'All' && r.signal !== filters.signal) return false;
      if (filters.trend !== 'All' && r.trend !== filters.trend) return false;
      if (filters.macdBullish && !r.macd_bullish) return false;
      if (filters.newsSignal !== 'All' && r.news_signal !== filters.newsSignal) return false;
      if (filters.marketCap !== 'All') {
        const cap = r.market_cap || 0;
        if (filters.marketCap.startsWith('<')) {
          if (cap >= 10e9) return false;
        } else {
          const threshold = MARKET_CAP_THRESHOLDS[filters.marketCap];
          if (threshold && cap < threshold) return false;
        }
      }
      const inRange = (val, min, max) => {
        if (min !== '' && (val == null || val < Number(min))) return false;
        if (max !== '' && (val == null || val > Number(max))) return false;
        return true;
      };
      if (!inRange(r.score, filters.scoreMin, filters.scoreMax)) return false;
      if (!inRange(r.rsi, filters.rsiMin, filters.rsiMax)) return false;
      if (!inRange(r.momentum_20d, filters.momentumMin, filters.momentumMax)) return false;
      if (!inRange(r.per, filters.perMin, filters.perMax)) return false;
      if (!inRange(r.roe, filters.roeMin, filters.roeMax)) return false;
      if (!inRange(r.der, filters.derMin, filters.derMax)) return false;
      if (!inRange(r.npm, filters.npmMin, filters.npmMax)) return false;
      if (!inRange(r.revenue_growth, filters.revenueGrowthMin, filters.revenueGrowthMax)) return false;
      if (!inRange(r.dividend_yield, filters.dividendYieldMin, filters.dividendYieldMax)) return false;
      if (!inRange(r.week_52_return, filters.week52ReturnMin, filters.week52ReturnMax)) return false;
      if (!inRange(r.news_score, filters.newsScoreMin, filters.newsScoreMax)) return false;
      return true;
    });
  }, [rankings, filters]);

  const sectors = useMemo(() => {
    const s = new Set(rankings.map((r) => r.sector).filter(Boolean));
    return ['All', ...Array.from(s).sort()];
  }, [rankings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[var(--terminal-accent)] mx-auto mb-4" />
          <p className="font-mono text-xs text-[var(--terminal-muted)] uppercase tracking-widest">Loading Filter Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--terminal-bg)] text-[var(--terminal-text)]">
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="h-1 w-8 sm:w-12 rounded-full bg-[var(--terminal-accent)]" />
            <h1 className="terminal-title text-xs sm:text-sm">Stock Filter</h1>
            <span className="font-mono text-xs text-slate-400">
              ({filtered.length} / {rankings.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                Clear ({activeCount})
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:border-[var(--terminal-accent)] hover:text-[var(--terminal-accent)] transition-colors"
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>
        </div>

        <div className="flex gap-5">
          {/* Filter Panel */}
          {showFilters && (
            <aside className="w-72 shrink-0 hidden lg:block">
              <div className="terminal-panel rounded-2xl p-4 space-y-5 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto custom-scrollbar">
                {/* Search */}
                <FilterSection title="Search">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    placeholder="Ticker or name..."
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-white placeholder-slate-500 outline-none focus:border-[var(--terminal-accent)] transition-colors"
                  />
                </FilterSection>

                {/* Type & Sector */}
                <FilterSection title="Type & Sector">
                  <PillToggle
                    options={['All', 'Stock', 'ETF']}
                    value={filters.type}
                    onChange={(v) => updateFilter('type', v)}
                  />
                  <select
                    value={filters.sector}
                    onChange={(e) => updateFilter('sector', e.target.value)}
                    className="appearance-none w-full px-3 py-2.5 rounded-xl border border-white/5 bg-black font-mono text-xs font-bold uppercase tracking-wider text-white outline-none transition-all cursor-pointer hover:border-white/20 focus:border-[var(--terminal-accent)]"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%23ffffff%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '28px' }}
                  >
                    <option value="All">All Sectors</option>
                    {sectors.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </FilterSection>

                {/* Score & Signal */}
                <FilterSection title="Score & Signal">
                  <PillToggle
                    options={['All', 'BUY', 'HOLD', 'SELL']}
                    value={filters.signal}
                    onChange={(v) => updateFilter('signal', v)}
                  />
                  <RangeInputs
                    label="Score"
                    min={filters.scoreMin}
                    max={filters.scoreMax}
                    onMinChange={(v) => updateFilter('scoreMin', v)}
                    onMaxChange={(v) => updateFilter('scoreMax', v)}
                    step={0.1}
                  />
                </FilterSection>

                {/* Technical */}
                <FilterSection title="Technical">
                  <RangeInputs
                    label="RSI"
                    min={filters.rsiMin}
                    max={filters.rsiMax}
                    onMinChange={(v) => updateFilter('rsiMin', v)}
                    onMaxChange={(v) => updateFilter('rsiMax', v)}
                    step={1}
                  />
                  <PillToggle
                    label="Trend"
                    options={['All', 'UP', 'DOWN', 'SIDEWAYS']}
                    value={filters.trend}
                    onChange={(v) => updateFilter('trend', v)}
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.macdBullish}
                      onChange={(e) => updateFilter('macdBullish', e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-black/40 text-[var(--terminal-accent)] focus:ring-[var(--terminal-accent)] focus:ring-offset-0"
                    />
                    <span className="font-mono text-xs text-slate-400">MACD Bullish Only</span>
                  </label>
                  <RangeInputs
                    label="Momentum (20d %)"
                    min={filters.momentumMin}
                    max={filters.momentumMax}
                    onMinChange={(v) => updateFilter('momentumMin', v)}
                    onMaxChange={(v) => updateFilter('momentumMax', v)}
                    step={0.5}
                  />
                </FilterSection>

                {/* Fundamentals */}
                <FilterSection title="Fundamentals">
                  <RangeInputs
                    label="P/E Ratio"
                    min={filters.perMin}
                    max={filters.perMax}
                    onMinChange={(v) => updateFilter('perMin', v)}
                    onMaxChange={(v) => updateFilter('perMax', v)}
                    step={0.5}
                  />
                  <RangeInputs
                    label="ROE (%)"
                    min={filters.roeMin}
                    max={filters.roeMax}
                    onMinChange={(v) => updateFilter('roeMin', v)}
                    onMaxChange={(v) => updateFilter('roeMax', v)}
                    step={1}
                  />
                  <RangeInputs
                    label="Debt/Equity"
                    min={filters.derMin}
                    max={filters.derMax}
                    onMinChange={(v) => updateFilter('derMin', v)}
                    onMaxChange={(v) => updateFilter('derMax', v)}
                    step={0.1}
                  />
                  <RangeInputs
                    label="Net Profit Margin (%)"
                    min={filters.npmMin}
                    max={filters.npmMax}
                    onMinChange={(v) => updateFilter('npmMin', v)}
                    onMaxChange={(v) => updateFilter('npmMax', v)}
                    step={1}
                  />
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500 mb-1.5">Market Cap</div>
                    <div className="flex flex-wrap gap-1.5">
                      {MARKET_CAP_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => updateFilter('marketCap', p.value)}
                          className={`px-2.5 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                            filters.marketCap === p.value
                              ? 'border-[var(--terminal-accent)]/30 bg-[var(--terminal-accent)]/10 text-[var(--terminal-accent)]'
                              : 'border-white/10 bg-white/[0.02] text-slate-500 hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <RangeInputs
                    label="Revenue Growth (%)"
                    min={filters.revenueGrowthMin}
                    max={filters.revenueGrowthMax}
                    onMinChange={(v) => updateFilter('revenueGrowthMin', v)}
                    onMaxChange={(v) => updateFilter('revenueGrowthMax', v)}
                    step={1}
                  />
                </FilterSection>

                {/* Dividends & Returns */}
                <FilterSection title="Dividends & Returns">
                  <RangeInputs
                    label="Dividend Yield (%)"
                    min={filters.dividendYieldMin}
                    max={filters.dividendYieldMax}
                    onMinChange={(v) => updateFilter('dividendYieldMin', v)}
                    onMaxChange={(v) => updateFilter('dividendYieldMax', v)}
                    step={0.1}
                  />
                  <RangeInputs
                    label="52-Week Return (%)"
                    min={filters.week52ReturnMin}
                    max={filters.week52ReturnMax}
                    onMinChange={(v) => updateFilter('week52ReturnMin', v)}
                    onMaxChange={(v) => updateFilter('week52ReturnMax', v)}
                    step={1}
                  />
                </FilterSection>

                {/* News Sentiment */}
                <FilterSection title="News Sentiment">
                  <PillToggle
                    options={['All', 'BULLISH', 'BEARISH', 'NEUTRAL']}
                    value={filters.newsSignal}
                    onChange={(v) => updateFilter('newsSignal', v)}
                  />
                  <RangeInputs
                    label="News Score"
                    min={filters.newsScoreMin}
                    max={filters.newsScoreMax}
                    onMinChange={(v) => updateFilter('newsScoreMin', v)}
                    onMaxChange={(v) => updateFilter('newsScoreMax', v)}
                    step={0.1}
                  />
                </FilterSection>
              </div>
            </aside>
          )}

          {/* Mobile Filter Drawer */}
          {showFilters && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilters(false)}>
              <div
                className="absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-[var(--terminal-panel)] border-l border-white/10 p-4 overflow-y-auto custom-scrollbar space-y-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-bold uppercase tracking-widest text-slate-400">Filters</span>
                  <button onClick={() => setShowFilters(false)} className="text-slate-500 hover:text-white">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <MobileFilterContent filters={filters} updateFilter={updateFilter} sectors={sectors} />
              </div>
            </div>
          )}

          {/* Results Grid */}
          <div className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div className="terminal-panel rounded-2xl p-12 text-center">
                <div className="font-mono text-sm text-slate-500">No stocks match your filters</div>
                <button onClick={clearFilters} className="mt-3 px-4 py-2 rounded-lg bg-[var(--terminal-accent)]/10 text-[var(--terminal-accent)] font-mono text-xs uppercase">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((r) => (
                  <StockCard key={r.stock || r.ticker} item={r} onClick={() => navigate('/')} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Sub-components ─── */

function FilterSection({ title, children }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500 mb-2">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PillToggle({ label, options, value, onChange }) {
  return (
    <div>
      {label && <div className="font-mono text-[11px] text-slate-500 mb-1">{label}</div>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-wider border transition-colors ${
              value === opt
                ? 'border-[var(--terminal-accent)]/30 bg-[var(--terminal-accent)]/10 text-[var(--terminal-accent)]'
                : 'border-white/10 bg-white/[0.02] text-slate-500 hover:text-white'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function RangeInputs({ label, min, max, onMinChange, onMaxChange, step = 1 }) {
  const inputClass = 'w-full rounded-md border border-white/10 bg-black/40 px-2.5 py-2 font-mono text-xs text-white placeholder-slate-600 outline-none focus:border-[var(--terminal-accent)] transition-colors';
  return (
    <div>
      <div className="font-mono text-[11px] text-slate-500 mb-1">{label}</div>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Min"
          value={min}
          step={step}
          onChange={(e) => onMinChange(e.target.value)}
          className={inputClass}
        />
        <input
          type="number"
          placeholder="Max"
          value={max}
          step={step}
          onChange={(e) => onMaxChange(e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}

function MobileFilterContent({ filters, updateFilter, sectors }) {
  return (
    <>
      <FilterSection title="Search">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          placeholder="Ticker or name..."
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-white placeholder-slate-500 outline-none focus:border-[var(--terminal-accent)] transition-colors"
        />
      </FilterSection>
      <FilterSection title="Type & Sector">
        <PillToggle options={['All', 'Stock', 'ETF']} value={filters.type} onChange={(v) => updateFilter('type', v)} />
        <select
          value={filters.sector}
          onChange={(e) => updateFilter('sector', e.target.value)}
          className="appearance-none w-full px-3 py-2.5 rounded-xl border border-white/5 bg-black font-mono text-xs font-bold uppercase tracking-wider text-white outline-none transition-all cursor-pointer hover:border-white/20 focus:border-[var(--terminal-accent)]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%23ffffff%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '28px' }}
        >
          <option value="All">All Sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </FilterSection>
      <FilterSection title="Score & Signal">
        <PillToggle options={['All', 'BUY', 'HOLD', 'SELL']} value={filters.signal} onChange={(v) => updateFilter('signal', v)} />
        <RangeInputs label="Score" min={filters.scoreMin} max={filters.scoreMax} onMinChange={(v) => updateFilter('scoreMin', v)} onMaxChange={(v) => updateFilter('scoreMax', v)} step={0.1} />
      </FilterSection>
      <FilterSection title="Technical">
        <RangeInputs label="RSI" min={filters.rsiMin} max={filters.rsiMax} onMinChange={(v) => updateFilter('rsiMin', v)} onMaxChange={(v) => updateFilter('rsiMax', v)} step={1} />
        <PillToggle label="Trend" options={['All', 'UP', 'DOWN', 'SIDEWAYS']} value={filters.trend} onChange={(v) => updateFilter('trend', v)} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={filters.macdBullish} onChange={(e) => updateFilter('macdBullish', e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/40 text-[var(--terminal-accent)] focus:ring-[var(--terminal-accent)] focus:ring-offset-0" />
          <span className="font-mono text-xs text-slate-400">MACD Bullish Only</span>
        </label>
        <RangeInputs label="Momentum (20d %)" min={filters.momentumMin} max={filters.momentumMax} onMinChange={(v) => updateFilter('momentumMin', v)} onMaxChange={(v) => updateFilter('momentumMax', v)} step={0.5} />
      </FilterSection>
      <FilterSection title="Fundamentals">
        <RangeInputs label="P/E Ratio" min={filters.perMin} max={filters.perMax} onMinChange={(v) => updateFilter('perMin', v)} onMaxChange={(v) => updateFilter('perMax', v)} step={0.5} />
        <RangeInputs label="ROE (%)" min={filters.roeMin} max={filters.roeMax} onMinChange={(v) => updateFilter('roeMin', v)} onMaxChange={(v) => updateFilter('roeMax', v)} step={1} />
        <RangeInputs label="Debt/Equity" min={filters.derMin} max={filters.derMax} onMinChange={(v) => updateFilter('derMin', v)} onMaxChange={(v) => updateFilter('derMax', v)} step={0.1} />
        <RangeInputs label="Net Profit Margin (%)" min={filters.npmMin} max={filters.npmMax} onMinChange={(v) => updateFilter('npmMin', v)} onMaxChange={(v) => updateFilter('npmMax', v)} step={1} />
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500 mb-1.5">Market Cap</div>
          <div className="flex flex-wrap gap-1.5">
            {MARKET_CAP_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => updateFilter('marketCap', p.value)}
                className={`px-2.5 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                  filters.marketCap === p.value
                    ? 'border-[var(--terminal-accent)]/30 bg-[var(--terminal-accent)]/10 text-[var(--terminal-accent)]'
                    : 'border-white/10 bg-white/[0.02] text-slate-500 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <RangeInputs label="Revenue Growth (%)" min={filters.revenueGrowthMin} max={filters.revenueGrowthMax} onMinChange={(v) => updateFilter('revenueGrowthMin', v)} onMaxChange={(v) => updateFilter('revenueGrowthMax', v)} step={1} />
      </FilterSection>
      <FilterSection title="Dividends & Returns">
        <RangeInputs label="Dividend Yield (%)" min={filters.dividendYieldMin} max={filters.dividendYieldMax} onMinChange={(v) => updateFilter('dividendYieldMin', v)} onMaxChange={(v) => updateFilter('dividendYieldMax', v)} step={0.1} />
        <RangeInputs label="52-Week Return (%)" min={filters.week52ReturnMin} max={filters.week52ReturnMax} onMinChange={(v) => updateFilter('week52ReturnMin', v)} onMaxChange={(v) => updateFilter('week52ReturnMax', v)} step={1} />
      </FilterSection>
      <FilterSection title="News Sentiment">
        <PillToggle options={['All', 'BULLISH', 'BEARISH', 'NEUTRAL']} value={filters.newsSignal} onChange={(v) => updateFilter('newsSignal', v)} />
        <RangeInputs label="News Score" min={filters.newsScoreMin} max={filters.newsScoreMax} onMinChange={(v) => updateFilter('newsScoreMin', v)} onMaxChange={(v) => updateFilter('newsScoreMax', v)} step={0.1} />
      </FilterSection>
    </>
  );
}

function StockCard({ item, onClick }) {
  const scoreColor = item.score >= 10 ? 'text-emerald-400' : item.score >= 6 ? 'text-amber-400' : 'text-rose-400';
  const signalStyle = item.signal === 'BUY'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    : item.signal === 'SELL'
    ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
    : 'border-slate-500/30 bg-slate-500/10 text-slate-400';
  const trendIcon = item.trend === 'UP' ? '\u2191' : item.trend === 'DOWN' ? '\u2193' : '\u2192';
  const trendColor = item.trend === 'UP' ? 'text-emerald-400' : item.trend === 'DOWN' ? 'text-rose-400' : 'text-slate-400';

  const formatCap = (v) => {
    if (!v) return '--';
    if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
    return `$${(v / 1e6).toFixed(0)}M`;
  };

  return (
    <button
      onClick={onClick}
      className="glass-card p-4 text-left w-full group"
    >
      {/* Header: Ticker + Signal */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-black text-white">{item.stock || item.ticker}</span>
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-wider ${signalStyle}`}>
              {item.signal}
            </span>
          </div>
          <div className="font-mono text-[10px] text-slate-500 mt-0.5 truncate max-w-[180px]">{item.name}</div>
        </div>
        <div className="text-right">
          <div className={`font-mono text-lg font-black ${scoreColor}`}>{item.score?.toFixed(1) ?? '--'}</div>
          <div className="font-mono text-[8px] text-slate-600 uppercase">Score</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="RSI" value={item.rsi?.toFixed(0)} color={item.rsi > 70 ? 'text-rose-400' : item.rsi < 30 ? 'text-emerald-400' : 'text-slate-300'} />
        <StatBox label="P/E" value={item.per?.toFixed(1)} />
        <StatBox label="Mkt Cap" value={formatCap(item.market_cap)} />
      </div>

      {/* Footer: Sector + Trend */}
      <div className="flex items-center justify-between">
        <span className="inline-flex rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5 font-mono text-[8px] text-slate-500 uppercase">
          {item.sector || 'N/A'}
        </span>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-xs font-bold ${trendColor}`}>{trendIcon} {item.trend}</span>
          {item.news_signal && (
            <span className={`inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${
              item.news_signal === 'BULLISH' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
              : item.news_signal === 'BEARISH' ? 'border-rose-500/20 bg-rose-500/5 text-rose-400'
              : 'border-slate-500/20 bg-slate-500/5 text-slate-500'
            }`}>
              {item.news_signal}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function StatBox({ label, value, color = 'text-slate-300' }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-1.5 text-center">
      <div className={`font-mono text-[10px] font-bold ${color}`}>{value ?? '--'}</div>
      <div className="font-mono text-[7px] text-slate-600 uppercase">{label}</div>
    </div>
  );
}
