import React from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Bell, Search, User, UserCheck, Command, Sparkles } from 'lucide-react';

export default function Header() {
  const { portalRole, setPortalRole, searchQuery, setSearchQuery } = useApp();
  const navigate = useNavigate();

  const handlePortalSwitch = (role) => {
    setPortalRole(role);
    if (role === 'nurse') {
      navigate('/nurse');
    } else {
      navigate('/patient');
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E8E2D7] px-4 sm:px-8 flex items-center justify-between shadow-xs">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-9 h-9 rounded-xl bg-[#CC785C] flex items-center justify-center text-white shadow-sm shadow-[#CC785C]/30">
          <Stethoscope className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight text-[#1C1917] font-serif">
              Medi<span className="text-[#CC785C]">Buddy</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#CC785C]/10 text-[#CC785C] border border-[#CC785C]/20">
              CLAUDE UI
            </span>
          </div>
          <p className="text-[11px] text-[#78716C] font-medium hidden sm:block">Post-Discharge Patient Care & Intelligence</p>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="hidden md:flex items-center relative max-w-md w-full mx-8">
        <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={portalRole === 'nurse' ? 'Search patients, clinical briefs, escalations...' : 'Search medications, daily quiz, instructions...'}
          className="w-full bg-[#F4F0E8] border border-[#E8E2D7] rounded-xl pl-9 pr-10 py-2 text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#CC785C] focus:bg-white focus:ring-2 focus:ring-[#CC785C]/15 transition-all"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-[#78716C] bg-[#E8E2D7]/60 px-1.5 py-0.5 rounded font-mono border border-[#E8E2D7]">
          <Command className="w-2.5 h-2.5" />
          <span>K</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Claude Pill Switcher */}
        <div className="flex bg-[#F4F0E8] p-1 rounded-xl border border-[#E8E2D7]">
          <button
            onClick={() => handlePortalSwitch('patient')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              portalRole === 'patient'
                ? 'bg-[#CC785C] text-white shadow-xs'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E8E2D7]/50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Patient App</span>
          </button>

          <button
            onClick={() => handlePortalSwitch('nurse')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              portalRole === 'nurse'
                ? 'bg-[#0D9488] text-white shadow-xs'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#E8E2D7]/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Nurse Portal</span>
          </button>
        </div>

        {/* Notifications Button */}
        <button
          className="relative p-2.5 rounded-xl bg-[#F4F0E8] hover:bg-[#E8E2D7] border border-[#E8E2D7] text-[#78716C] hover:text-[#1C1917] transition-all"
          title="Care Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#CC785C] ring-2 ring-white animate-pulse" />
        </button>
      </div>
    </header>
  );
}
