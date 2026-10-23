import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const NewsCard = ({ article, source }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const signalColor = article.signal === 'BULLISH'
    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : article.signal === 'BEARISH'
    ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
    : 'text-slate-400 border-slate-500/30 bg-slate-500/10';

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown date';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="overflow-hidden transition-all border rounded-2xl border-white/5 hover:border-white/10">
      {/* Collapsed Card Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 lg:p-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex-1 min-w-0">
          {/* Meta row: Source, Date, Author */}
          <div className="flex items-center gap-2 sm:gap-3 mb-1.5 flex-wrap">
            <span className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-[var(--terminal-accent)]">
              {source}
            </span>
            <span className="text-slate-600 text-[8px] sm:text-[9px]">/</span>
            <span className="font-mono text-[8px] sm:text-[9px] text-slate-500">
              {formatDate(article.published_at || article.published_date)}
            </span>
            {article.author && (
              <>
                <span className="text-slate-600 text-[8px] sm:text-[9px]">/</span>
                <span className="font-mono text-[8px] sm:text-[9px] text-slate-500">
                  {article.author.split('@')[0]}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <div className="font-mono text-xs sm:text-sm font-bold leading-relaxed text-white">
            {article.title}
          </div>

          {/* Summary (only when collapsed) */}
          {article.summary && !isExpanded && (
            <div className="mt-1 font-mono text-[10px] sm:text-[11px] text-slate-500 leading-relaxed line-clamp-2">
              {article.summary}
            </div>
          )}
        </div>

        {/* Signal Badge */}
        <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-widest ${signalColor}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${article.signal === 'BULLISH' ? 'bg-emerald-500' : article.signal === 'BEARISH' ? 'bg-rose-500' : 'bg-slate-400'}`} />
          {article.signal || 'NEUTRAL'}
        </div>

        {/* Expand/Collapse Chevron */}
        <svg className={`h-4 w-4 mt-1 text-slate-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content Panel */}
      {isExpanded && (
        <div className="px-3 sm:px-4 lg:px-5 py-4 sm:py-5 space-y-4 sm:space-y-5 border-t border-white/5">
          {/* Stats Grid: Score, Confidence, Signal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3 lg:p-4">
              <div className="font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-500 mb-1">Score</div>
              <div className={`font-mono text-lg sm:text-xl font-black ${article.score > 0 ? 'text-emerald-400' : article.score < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {article.score != null ? article.score.toFixed(2) : '--'}
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3 lg:p-4">
              <div className="font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-500 mb-1">Confidence</div>
              <div className="font-mono text-lg sm:text-xl font-black text-amber-400">
                {article.confidence != null ? `${article.confidence}%` : '--'}
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3 lg:p-4">
              <div className="font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-slate-500 mb-1">Signal</div>
              <div className={`font-mono text-lg sm:text-xl font-black ${article.signal === 'BULLISH' ? 'text-emerald-400' : article.signal === 'BEARISH' ? 'text-rose-400' : 'text-slate-400'}`}>
                {article.signal || 'NEUTRAL'}
              </div>
            </div>
          </div>

          {/* Triggers */}
          {article.triggers?.length > 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-3">Detected Triggers</div>
              <div className="flex flex-wrap gap-2">
                {article.triggers.map((t, i) => (
                  <span key={i} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${t.type === 'positive' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-rose-500/20 bg-rose-500/5 text-rose-400'}`}>
                    {t.type === 'positive' ? '+' : '-'} {t.label} ({t.score > 0 ? '+' : ''}{t.score})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full Content */}
          {article.content && (
            <div className="prose prose-invert max-w-none">
              <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-3">Full Content</div>
              <div className="font-mono text-[11px] sm:text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {article.content}
              </div>
            </div>
          )}

          {/* Read Full Article Link */}
          {(article.link || article.url) && (
            <div className="pt-2">
              <a href={article.link || article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 sm:px-4 py-2 sm:py-2.5 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-all hover:border-[var(--terminal-accent)] hover:text-[var(--terminal-accent)] hover:bg-[var(--terminal-accent-soft)]">
                Read Full Article
                <ExternalLink className="w-3 h-3 sm:h-3.5 sm:w-3.5" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NewsCard;
