import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export default function AppLayout() {
  return (
    <div className="app-container min-h-screen flex flex-col bg-slate-50 text-slate-900 bg-ambient font-sans">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="main-content flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
