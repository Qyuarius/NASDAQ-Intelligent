# Sidebar Navigation and News Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sidebar navigation to the existing NASDAQ Intel dashboard, rename the current page to "Dashboard", and create a new "News" page for reading news articles.

**Architecture:** Add React Router for client-side routing between pages. Create a reusable Sidebar component that appears on both pages. Extract news-related content from Dashboard.jsx into a dedicated NewsPage component. The sidebar will be fixed on the left with navigation links to Dashboard and News pages.

**Tech Stack:** React 18, React Router v6, Tailwind CSS, existing terminal-style design system

---

## File Structure

**New Files:**
- `project/frontend/src/components/Sidebar.jsx` - Navigation sidebar component
- `project/frontend/src/pages/NewsPage.jsx` - News reading page
- `project/frontend/src/layouts/MainLayout.jsx` - Layout wrapper with sidebar

**Modified Files:**
- `project/frontend/src/App.jsx` - Add React Router routes
- `project/frontend/src/pages/Dashboard.jsx` - Remove news sections (moved to NewsPage)

**Dependencies to Add:**
- `react-router-dom` for client-side routing

---

### Task 1: Install React Router Dependency

**Files:**
- Modify: `project/frontend/package.json` (dependencies section)

- [ ] **Step 1: Install react-router-dom package**

Run: `cd project/frontend && npm install react-router-dom`

Expected: Package installs successfully, package.json updated

- [ ] **Step 2: Commit**

```bash
git add project/frontend/package.json project/frontend/package-lock.json
git commit -m "deps: add react-router-dom for client-side navigation"
```

---

### Task 2: Create Sidebar Component

**Files:**
- Create: `project/frontend/src/components/Sidebar.jsx`

- [ ] **Step 1: Create Sidebar component with navigation links**

```jsx
import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboardIcon },
    { path: '/news', label: 'News', icon: NewspaperIcon },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-16 lg:w-64 border-r border-white/5 bg-[#030407]/90 backdrop-blur-2xl z-40 flex flex-col">
      {/* Logo */}
      <div className="flex h-16 lg:h-20 items-center justify-center lg:justify-start lg:px-6 border-b border-white/5">
        <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 font-display text-lg lg:text-xl font-black text-[var(--terminal-accent)]">
          I
        </div>
        <span className="hidden lg:block ml-3 text-sm font-bold text-white">NASDAQ Intel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 lg:py-6 space-y-1 lg:space-y-2 px-2 lg:px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-[var(--terminal-accent)]/10 text-[var(--terminal-accent)] border border-[var(--terminal-accent)]/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="hidden lg:block text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 p-4 lg:p-6">
        <div className="flex items-center justify-center lg:justify-start gap-2">
          <div className="h-2 w-2 rounded-full bg-[var(--terminal-green)] animate-pulse" />
          <span className="hidden lg:block text-xs text-slate-500">System Online</span>
        </div>
      </div>
    </aside>
  );
}

// Icon Components
function LayoutDashboardIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function NewspaperIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add project/frontend/src/components/Sidebar.jsx
git commit -m "feat: add sidebar navigation component with Dashboard and News links"
```

---

### Task 3: Create MainLayout Component

**Files:**
- Create: `project/frontend/src/layouts/MainLayout.jsx`

- [ ] **Step 1: Create MainLayout wrapper component**

```jsx
import React from 'react';
import Sidebar from '../components/Sidebar';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-[var(--terminal-bg)]">
      <Sidebar />
      <div className="ml-16 lg:ml-64 min-h-screen transition-all duration-300">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add project/frontend/src/layouts/MainLayout.jsx
git commit -m "feat: add MainLayout wrapper with sidebar integration"
```

---

### Task 4: Create NewsPage Component

**Files:**
- Create: `project/frontend/src/pages/NewsPage.jsx`

- [ ] **Step 1: Create NewsPage component with news content**

```jsx
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
          <span className="font-mono text-[10px] text-slate-500">
            ({news.length + cnbcNews.length} Articles)
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Yahoo Finance News Section */}
          <section className="terminal-panel rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <div>
                <h2 className="terminal-title text-[10px] sm:text-xs">Yahoo Finance News</h2>
                <span className="font-mono text-[9px] text-slate-500">{news.length} Articles</span>
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
                <h2 className="terminal-title text-[10px] sm:text-xs">CNBC Market Intelligence</h2>
                <span className="font-mono text-[9px] text-slate-500">{cnbcNews.length} Articles</span>
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
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-[var(--terminal-accent)]">
              {article.publisher || 'Yahoo Finance'}
            </span>
            {article.published_at && (
              <>
                <span className="text-slate-600 text-[8px]">/</span>
                <span className="font-mono text-[8px] text-slate-500">
                  {formatTime(article.published_at)}
                </span>
              </>
            )}
          </div>
          <div className="font-mono text-xs font-bold leading-relaxed text-white text-left">
            {article.title}
          </div>
        </div>
        <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-[8px] font-black uppercase tracking-wider ${sigColor}`}>
          <span className={`h-1 w-1 rounded-full ${article.signal === 'BULLISH' ? 'bg-emerald-500' : article.signal === 'BEARISH' ? 'bg-rose-500' : 'bg-slate-400'}`} />
          {article.signal || 'NEUTRAL'}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          {article.summary && (
            <p className="font-mono text-[10px] text-slate-400 leading-relaxed text-left">
              {article.summary}
            </p>
          )}
          {article.link && (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-all hover:border-[var(--terminal-accent)] hover:text-[var(--terminal-accent)]"
            >
              Read Full Article
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-emerald-400">
              CNBC
            </span>
            {article.published_date && (
              <>
                <span className="text-slate-600 text-[8px]">/</span>
                <span className="font-mono text-[8px] text-slate-500">
                  {new Date(article.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            )}
          </div>
          <div className="font-mono text-xs font-bold leading-relaxed text-white text-left">
            {article.title}
          </div>
        </div>
        <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-[8px] font-black uppercase tracking-wider ${sigColor}`}>
          <span className={`h-1 w-1 rounded-full ${article.signal === 'BULLISH' ? 'bg-emerald-500' : article.signal === 'BEARISH' ? 'bg-rose-500' : 'bg-slate-400'}`} />
          {article.signal || 'NEUTRAL'}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          {article.summary && (
            <p className="font-mono text-[10px] text-slate-400 leading-relaxed text-left">
              {article.summary}
            </p>
          )}
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-all hover:border-[var(--terminal-accent)] hover:text-[var(--terminal-accent)]"
            >
              Read on CNBC
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add project/frontend/src/pages/NewsPage.jsx
git commit -m "feat: create NewsPage component with Yahoo Finance and CNBC news feeds"
```

---

### Task 5: Update App.jsx with React Router

**Files:**
- Modify: `project/frontend/src/App.jsx`

- [ ] **Step 1: Replace App.jsx content with router setup**

```jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import NewsPage from './pages/NewsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add project/frontend/src/App.jsx
git commit -m "feat: add React Router with Dashboard and News routes"
```

---

### Task 6: Remove News Sections from Dashboard

**Files:**
- Modify: `project/frontend/src/pages/Dashboard.jsx` (remove news-related state and JSX)

- [ ] **Step 1: Remove news-related state from Dashboard**

In `Dashboard.jsx`, remove these state declarations (around lines 20-24):
- `const [news, setNews] = useState([])`
- `const [expandedNews, setExpandedNews] = useState(null)`
- `const [cnbcNews, setCnbcNews] = useState([])`
- `const [expandedCnbcNews, setExpandedCnbcNews] = useState(null)`

- [ ] **Step 2: Remove news API calls from loadData function**

In the `loadData` function (around line 51), remove news-related API calls from the Promise.all:
- Remove `axios.get(/output/news.json?t=${cacheKey}).catch(() => null)`
- Remove `axios.get(/output/news_signals.json?t=${cacheKey}).catch(() => null)`
- Remove `newsRes` and `cnbcRes` from destructuring
- Remove news data parsing lines:
  ```javascript
  const newsData = parseJsonResponse(newsRes?.data)
  if (newsData?.articles) setNews(newsData.articles)
  ```
  ```javascript
  const cnbcData = parseJsonResponse(cnbcRes?.data)
  if (cnbcData?.data?.articles) setCnbcNews(cnbcData.data.articles)
  ```

- [ ] **Step 3: Remove news JSX sections from Dashboard render**

Remove the entire news section (around lines 276-485) that includes:
- The Yahoo Finance News section with `{news.length > 0 && (...)}`
- The CNBC News section with `{cnbcNews.length > 0 && (...)}`

- [ ] **Step 4: Commit**

```bash
git add project/frontend/src/pages/Dashboard.jsx
git commit -m "refactor: remove news sections from Dashboard (moved to NewsPage)"
```

---

### Task 7: Update MainLayout to Use Outlet

**Files:**
- Modify: `project/frontend/src/layouts/MainLayout.jsx`

- [ ] **Step 1: Update MainLayout to use Outlet for nested routes**

```jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[var(--terminal-bg)]">
      <Sidebar />
      <div className="ml-16 lg:ml-64 min-h-screen transition-all duration-300">
        <Outlet />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add project/frontend/src/layouts/MainLayout.jsx
git commit -m "feat: update MainLayout to use Outlet for nested routing"
```

---

### Task 8: Test and Verify Implementation

**Files:**
- Test: Run development server and verify navigation

- [ ] **Step 1: Start the development server**

Run: `cd project/frontend && npm run dev`

Expected: Server starts on http://localhost:5173 (or similar port)

- [ ] **Step 2: Verify Dashboard page loads correctly**

Navigate to http://localhost:5173/

Expected:
- Sidebar is visible on the left
- Dashboard content loads without errors
- No news sections visible (moved to News page)

- [ ] **Step 3: Verify navigation to News page**

Click on "News" in the sidebar or navigate to http://localhost:5173/news

Expected:
- News page loads successfully
- Yahoo Finance and CNBC news articles are displayed
- Articles can be expanded/collapsed

- [ ] **Step 4: Verify navigation back to Dashboard**

Click on "Dashboard" in the sidebar

Expected:
- Returns to Dashboard page
- Sidebar remains visible throughout navigation

- [ ] **Step 5: Commit final verification**

```bash
git log --oneline -5
```

Expected: All commits from Tasks 1-7 are present

---

## Summary

This implementation adds:

1. **Sidebar Navigation** - Fixed left sidebar with Dashboard and News links, responsive design (collapses to icons on mobile)

2. **React Router** - Client-side routing between / (Dashboard) and /news (NewsPage)

3. **NewsPage Component** - Dedicated news reading page with Yahoo Finance and CNBC news feeds, expandable articles

4. **Dashboard Refactor** - Removed news sections from Dashboard, focusing on market fundamentals, rankings, and stock charts

All components follow the existing terminal-style design system with proper CSS variables and responsive breakpoints.
