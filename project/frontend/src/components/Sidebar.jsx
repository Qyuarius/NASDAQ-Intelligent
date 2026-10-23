import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboardIcon },
    { path: '/movers', label: 'Movers', icon: TrendingUpIcon },
    { path: '/news', label: 'News', icon: NewspaperIcon },
    { path: '/filter', label: 'Filter', icon: FunnelIcon },
    { path: '/correlations', label: 'Correlations', icon: NetworkIcon },
    { path: '/compare', label: 'Compare', icon: ScaleIcon },
    { path: '/portfolio', label: 'Portfolio', icon: PortfolioIcon },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-16 lg:w-64 border-r border-white/5 bg-[#030407]/90 backdrop-blur-2xl z-40 flex flex-col">
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

function FunnelIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function TrendingUpIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function NetworkIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="6" cy="6" r="2.5" strokeWidth={1.5} />
      <circle cx="18" cy="6" r="2.5" strokeWidth={1.5} />
      <circle cx="6" cy="18" r="2.5" strokeWidth={1.5} />
      <circle cx="18" cy="18" r="2.5" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeWidth={1.5} d="M8.5 6h7M6 8.5v7M18 8.5v7M8.5 18h7M8.5 8.5l7 7M15.5 8.5l-7 7" />
    </svg>
  );
}

function ScaleIcon({ className }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: '1.25rem', lineHeight: 1 }}>
      compare_arrows
    </span>
  );
}

function PortfolioIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13h2l3-9 4 18 3-9h6" />
    </svg>
  );
}
