import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import NewsPage from './pages/NewsPage';
import FilterPage from './pages/FilterPage';
import MoversPage from './pages/MoversPage';
import CorrelationsPage from './pages/CorrelationsPage';
import ComparePage from './pages/ComparePage';
import PortfolioPage from './pages/PortfolioPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="filter" element={<FilterPage />} />
          <Route path="movers" element={<MoversPage />} />
          <Route path="correlations" element={<CorrelationsPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
