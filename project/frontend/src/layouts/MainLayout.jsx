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
