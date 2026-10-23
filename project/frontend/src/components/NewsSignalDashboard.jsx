import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Newspaper, 
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';

const NewsSignalDashboard = () => {
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedArticles, setExpandedArticles] = useState(new Set());
  const [selectedTicker, setSelectedTicker] = useState('all');

  useEffect(() => {
    fetchNewsSignals();
    // Auto-refresh every 90 seconds
    const interval = setInterval(fetchNewsSignals, 90 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchNewsSignals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/output/news_signals.json');
      if (!response.ok) {
        throw new Error('Failed to fetch news signals');
      }
      const data = await response.json();
      setNewsData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching news signals:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleArticle = (articleId) => {
    const newExpanded = new Set(expandedArticles);
    if (newExpanded.has(articleId)) {
      newExpanded.delete(articleId);
    } else {
      newExpanded.add(articleId);
    }
    setExpandedArticles(newExpanded);
  };

  const getSignalIcon = (signal) => {
    switch (signal) {
      case 'BULLISH':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'BEARISH':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'BULLISH':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'BEARISH':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Activity className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-gray-600">Loading news signals...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">Error loading news signals: {error}</span>
        </div>
        <button
          onClick={fetchNewsSignals}
          className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!newsData || !newsData.data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-700 mb-1">No News Signals Available</h3>
        <p className="text-gray-500 text-sm">Run the CNBC scraper to generate news signals.</p>
      </div>
    );
  }

  const { articles, ticker_signals, summary } = newsData.data;

  // Filter articles by selected ticker
  const filteredArticles = selectedTicker === 'all' 
    ? articles 
    : articles.filter(article => 
        article.stocks?.some(stock => stock.ticker === selectedTicker)
      );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Newspaper className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">News Signal Dashboard</h2>
              <p className="text-sm text-gray-500">
                Generated: {new Date(newsData.generated_at).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={fetchNewsSignals}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Activity className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-800">{summary.total_articles}</div>
            <div className="text-sm text-gray-500">Total Articles</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{summary.signal_counts.BULLISH || 0}</div>
            <div className="text-sm text-green-600">Bullish Signals</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">{summary.signal_counts.BEARISH || 0}</div>
            <div className="text-sm text-red-600">Bearish Signals</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{ticker_signals.length}</div>
            <div className="text-sm text-blue-600">Tickers Affected</div>
          </div>
        </div>
      </div>

      {/* Ticker Filter */}
      {ticker_signals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Filter by Ticker:</span>
            <select
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Tickers</option>
              {ticker_signals.map((ticker) => (
                <option key={ticker.ticker} value={ticker.ticker}>
                  {ticker.ticker} - {ticker.aggregate?.signal || 'NEUTRAL'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Articles List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">
            News Articles with Signals
            {selectedTicker !== 'all' && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                (Filtered by {selectedTicker})
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Showing {filteredArticles.length} articles with AI-generated trading signals
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredArticles.map((article, index) => (
            <div key={article.uuid || index} className="p-6 hover:bg-gray-50 transition-colors">
              {/* Article Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    {article.title}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(article.published_date || article.fetched_at).toLocaleString()}
                    </span>
                    {article.author && (
                      <span>By {article.author}</span>
                    )}
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {article.source}
                    </span>
                  </div>
                </div>
                
                {/* Signal Badge */}
                <div className={`ml-4 px-4 py-2 rounded-lg border ${getSignalColor(article.signal)}`}>
                  <div className="flex items-center space-x-2">
                    {getSignalIcon(article.signal)}
                    <span className="font-bold">{article.signal}</span>
                  </div>
                  {article.score !== undefined && (
                    <div className={`text-xs mt-1 ${getConfidenceColor(article.confidence || 0)}`}>
                      Score: {article.score.toFixed(2)} | Confidence: {article.confidence || 0}%
                    </div>
                  )}
                </div>
              </div>

              {/* Related Stocks */}
              {article.stocks && article.stocks.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Related Stocks:</h5>
                  <div className="flex flex-wrap gap-2">
                    {article.stocks.map((stock, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center px-3 py-1 bg-gray-100 rounded-full text-sm"
                      >
                        <span className="font-bold text-gray-800">{stock.ticker}</span>
                        <span className="mx-1 text-gray-400">|</span>
                        <span className="text-gray-600">{stock.name}</span>
                        <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded text-xs text-gray-500">
                          {stock.sector}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Triggers */}
              {article.triggers && article.triggers.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Signal Triggers:</h5>
                  <div className="flex flex-wrap gap-2">
                    {article.triggers.map((trigger, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs"
                      >
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Expand/Collapse Button */}
              <button
                onClick={() => toggleArticle(article.uuid || index)}
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {expandedArticles.has(article.uuid || index) ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Show Less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>Show Full Article</span>
                  </>
                )}
              </button>

              {/* Expanded Content */}
              {expandedArticles.has(article.uuid || index) && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-semibold text-gray-800 mb-2">Full Article Content:</h5>
                  <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {article.content || 'No content available'}
                  </div>
                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Read on CNBC
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Newspaper className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No articles found {selectedTicker !== 'all' && `for ${selectedTicker}`}</p>
          </div>
        )}
      </div>

      {/* Ticker Signals Summary */}
      {ticker_signals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Ticker Signal Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Ticker</th>
                  <th className="text-left py-2 px-4 text-sm font-semibold text-gray-600">Name</th>
                  <th className="text-center py-2 px-4 text-sm font-semibold text-gray-600">Signal</th>
                  <th className="text-center py-2 px-4 text-sm font-semibold text-gray-600">Score</th>
                  <th className="text-center py-2 px-4 text-sm font-semibold text-gray-600">Articles</th>
                </tr>
              </thead>
              <tbody>
                {ticker_signals.slice(0, 20).map((ticker) => (
                  <tr key={ticker.ticker} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-800">{ticker.ticker}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{ticker.name}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getSignalColor(ticker.aggregate?.signal)}`}>
                        {getSignalIcon(ticker.aggregate?.signal)}
                        <span className="ml-1">{ticker.aggregate?.signal}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-medium ${getConfidenceColor(Math.abs(ticker.aggregate?.score || 0) * 20)}`}>
                        {ticker.aggregate?.score?.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-gray-600">
                      {ticker.aggregate?.total_signals || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsSignalDashboard;