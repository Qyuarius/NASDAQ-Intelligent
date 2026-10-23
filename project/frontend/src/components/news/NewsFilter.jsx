import React from 'react';
import { Search, Filter, Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const NewsFilter = ({ filters, onFilterChange }) => {
  const { source, signal, searchQuery } = filters;

  const handleSourceChange = (newSource) => {
    onFilterChange({ ...filters, source: newSource });
  };

  const handleSignalChange = (newSignal) => {
    onFilterChange({ ...filters, signal: newSignal });
  };

  const handleSearchChange = (e) => {
    onFilterChange({ ...filters, searchQuery: e.target.value });
  };

  const clearFilters = () => {
    onFilterChange({ source: 'all', signal: 'all', searchQuery: '' });
  };

  const hasActiveFilters = source !== 'all' || signal !== 'all' || searchQuery;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--terminal-accent)]" />
          <span className="font-mono text-xs uppercase tracking-wider text-slate-400">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="font-mono text-[10px] uppercase tracking-wider text-slate-500 hover:text-[var(--terminal-accent)] transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by ticker or keyword..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-mono text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[var(--terminal-accent)] transition-colors"
        />
      </div>

      {/* Source Filter */}
      <div className="mb-4">
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 block mb-2">Source</span>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Sources', icon: Newspaper },
            { key: 'yahoo', label: 'Yahoo Finance', icon: Newspaper },
            { key: 'cnbc', label: 'CNBC', icon: Newspaper },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleSourceChange(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-all ${
                source === key
                  ? 'bg-[var(--terminal-accent)]/20 text-[var(--terminal-accent)] border border-[var(--terminal-accent)]/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Signal Filter */}
      <div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 block mb-2">Signal</span>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Signals', color: 'slate' },
            { key: 'BULLISH', label: 'Bullish', icon: TrendingUp, color: 'emerald' },
            { key: 'BEARISH', label: 'Bearish', icon: TrendingDown, color: 'rose' },
            { key: 'NEUTRAL', label: 'Neutral', icon: Minus, color: 'slate' },
          ].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => handleSignalChange(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-all ${
                signal === key
                  ? `bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsFilter;
