import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [cnbcNews, setCnbcNews] = useState([]);
  const [expandedNews, setExpandedNews] = useState(null);
  const [expandedCnbcNews, setExpandedCnbcNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNews();
    const POLL_INTERVAL = 90 * 1000;
    let timer = null;
    const poll = () => {
      if (document.visibilityState === 'visible') loadNews();
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

  const loadNews = async () => {
    try {
      setLoading(true);
      setError(null);
      const cacheKey = Date.now();
      const [newsRes, cnbcRes] = await Promise.all([
        axios.get(`/output/news.json?t=${cacheKey}`).catch(() => null),
        axios.get(`/output/news_signals.json?t=${cacheKey}`).catch(() => null),
      ]);

      const newsData = newsRes?.data;
      if (newsData?.articles) setNews(newsData.articles);

      const cnbcData = cnbcRes?.data;
      if (cnbcData?.data?.articles) setCnbcNews(cnbcData.data.articles);
    } catch (err) {
      setError(`Failed to load news: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return 'Unknown';
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[var(--terminal-accent)] mx-auto mb-4" />
          <p className="font-mono text-xs text-[var(--terminal-muted)] uppercase tracking-widest">Loading News...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-lg p-8 text-center rounded-2xl terminal-panel">
          <div className="mb-4 font-mono text-2xl font-black text-[var(--terminal-red)]">ERROR</div>
          <p className="font-mono text-sm text-slate-400">{error}</p>
          <button onClick={loadNews} className="mt-4 px-4 py-2 rounded-lg bg-[var(--terminal-accent)]/10 text-[var(--terminal-accent)] font-mono text-xs uppercase">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--terminal-bg)] text-[var(--terminal-text)]">
      <main className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8 lg:mb-10">
          <div className="h-1 w-8 sm:w-12 rounded-full bg-[var(--terminal-accent)]" />
          <h1 className="terminal-title text-xs sm:text-sm">News Intelligence Center</h1>
          <span className="font-mono text-xs text-slate-400">
            ({news.length + cnbcNews.length} Articles)
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
          {/* Yahoo Finance News Section */}
          <section className="terminal-panel rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <div>
                <h2 className="terminal-title text-xs sm:text-sm">Yahoo Finance News</h2>
                <span className="font-mono text-[11px] text-slate-500">{news.length} Articles</span>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {news.slice(0, 20).map((article) => (
                <NewsArticleCard
                  key={article.uuid}
                  article={article}
                  isExpanded={expandedNews === article.uuid}
                  onToggle={() => setExpandedNews(expandedNews === article.uuid ? null : article.uuid)}
                  formatTime={formatTime}
                />
              ))}
            </div>
          </section>

          {/* CNBC News Section */}
          <section className="terminal-panel rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <span className="font-display text-sm sm:text-base font-black text-emerald-400">C</span>
              </div>
              <div>
                <h2 className="terminal-title text-xs sm:text-sm">CNBC Market Intelligence</h2>
                <span className="font-mono text-[11px] text-slate-500">{cnbcNews.length} Articles</span>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {cnbcNews.slice(0, 20).map((article) => (
                <CNBCArticleCard
                  key={article.uuid}
                  article={article}
                  isExpanded={expandedCnbcNews === article.uuid}
                  onToggle={() => setExpandedCnbcNews(expandedCnbcNews === article.uuid ? null : article.uuid)}
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// News Article Card Component
function NewsArticleCard({ article, isExpanded, onToggle, formatTime }) {
  const sigColor = article.signal === 'BULLISH'
    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : article.signal === 'BEARISH'
    ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
    : 'text-slate-400 border-slate-500/30 bg-slate-500/10';

  return (
    <div className="overflow-hidden transition-all border rounded-xl border-white/5 hover:border-white/10">
      <button onClick={onToggle} className="w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-white/[0.02]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--terminal-accent)]">
              {article.publisher || 'Yahoo Finance'}
            </span>
            {article.published_at && (
              <>
                <span className="text-slate-600 text-[10px]">/</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {formatTime(article.published_at)}
                </span>
              </>
            )}
          </div>
          <div className="font-mono text-sm font-bold leading-relaxed text-white text-left">
            {article.title}
          </div>
        </div>
        <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-black uppercase tracking-wider ${sigColor}`}>
          <span className={`h-1 w-1 rounded-full ${article.signal === 'BULLISH' ? 'bg-emerald-500' : article.signal === 'BEARISH' ? 'bg-rose-500' : 'bg-slate-400'}`} />
          {article.signal || 'NEUTRAL'}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          {article.stocks?.length > 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-2">Related Stocks</div>
              <div className="flex flex-wrap gap-1.5">
                {article.stocks.map((s, i) => (
                  <span key={i} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-[10px] font-bold ${s.signal === 'BULLISH' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : s.signal === 'BEARISH' ? 'border-rose-500/20 bg-rose-500/5 text-rose-400' : 'border-slate-500/20 bg-slate-500/5 text-slate-400'}`}>
                    {s.ticker}
                    <span className="text-[9px] opacity-70">{s.score > 0 ? '+' : ''}{s.score?.toFixed(1)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {article.summary && (
            <p className="font-mono text-xs text-slate-400 leading-relaxed text-left">
              {article.summary}
            </p>
          )}
          {article.link && (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-all hover:border-[var(--terminal-accent)] hover:text-[var(--terminal-accent)]"
            >
              Read Full Article
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2-2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// CNBC Article Card Component
function CNBCArticleCard({ article, isExpanded, onToggle }) {
  const sigColor = article.signal === 'BULLISH'
    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    : article.signal === 'BEARISH'
    ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
    : 'text-slate-400 border-slate-500/30 bg-slate-500/10';

  return (
    <div className="overflow-hidden transition-all border rounded-xl border-white/5 hover:border-white/10">
      <button onClick={onToggle} className="w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-white/[0.02]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              CNBC
            </span>
            {article.published_date && (
              <>
                <span className="text-slate-600 text-[10px]">/</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {new Date(article.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            )}
          </div>
          <div className="font-mono text-sm font-bold leading-relaxed text-white text-left">
            {article.title}
          </div>
        </div>
        <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-black uppercase tracking-wider ${sigColor}`}>
          <span className={`h-1 w-1 rounded-full ${article.signal === 'BULLISH' ? 'bg-emerald-500' : article.signal === 'BEARISH' ? 'bg-rose-500' : 'bg-slate-400'}`} />
          {article.signal || 'NEUTRAL'}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          {article.stocks?.length > 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500 mb-2">Related Stocks</div>
              <div className="flex flex-wrap gap-1.5">
                {article.stocks.map((s, i) => (
                  <span key={i} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-[10px] font-bold ${s.signal === 'BULLISH' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : s.signal === 'BEARISH' ? 'border-rose-500/20 bg-rose-500/5 text-rose-400' : 'border-slate-500/20 bg-slate-500/5 text-slate-400'}`}>
                    {s.ticker}
                    <span className="text-[9px] opacity-70">{s.score > 0 ? '+' : ''}{s.score?.toFixed(1)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {article.summary && (
            <p className="font-mono text-xs text-slate-400 leading-relaxed text-left">
              {article.summary}
            </p>
          )}
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-all hover:border-[var(--terminal-accent)] hover:text-[var(--terminal-accent)]"
            >
              Read on CNBC
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2-2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
