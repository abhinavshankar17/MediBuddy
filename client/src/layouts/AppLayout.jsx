import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export default function AppLayout() {
  const location = useLocation();
  const isAuthOrLandingPage = location.pathname === '/login' || location.pathname === '/';

  return (
    <div className="app-container min-h-screen flex flex-col bg-[#FAF8F5] text-[#1C1917] font-sans antialiased selection:bg-[#CC785C]/20 selection:text-[#CC785C]">
      <Header />
      <div className="flex flex-1 relative w-full overflow-hidden">
        {!isAuthOrLandingPage && <Sidebar />}
        <main className="main-content flex-1 min-w-0 w-full overflow-y-auto max-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
