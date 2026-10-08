import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Stethoscope,
  Bell,
  Search,
  User,
  UserCheck,
  Command,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export default function Header() {
  const {
    currentUser,
    logout,
    searchQuery,
    setSearchQuery,
    isMobileMenuOpen,
    toggleMobileMenu
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const isLoginPage = location.pathname === '/login';
  const isNurseUser = currentUser?.role === 'nurse' || currentUser?.role === 'clinician';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E8E2D7] shadow-2xs">
      <div className="h-16 px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 max-w-full">
        {/* Left: Mobile Hamburger Toggle + Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {!isLoginPage && (
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-xl text-[#1C1917] hover:bg-[#F4F0E8] border border-[#E8E2D7] transition-colors cursor-pointer flex-shrink-0"
              aria-label="Toggle navigation drawer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-[#CC785C]" /> : <Menu className="w-5 h-5 text-[#1C1917]" />}
            </button>
          )}

          <div
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
            onClick={() => navigate(isNurseUser ? '/nurse' : '/patient')}
          >
            <div className="w-9 h-9 rounded-xl bg-[#CC785C] flex items-center justify-center text-white shadow-sm shadow-[#CC785C]/30 flex-shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-[#1C1917] font-serif truncate">
                  Medi<span className="text-[#CC785C]">Buddy</span>
                </span>
                {!isLoginPage && currentUser?.role && (
                  <span
                    className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                      isNurseUser
                        ? 'bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20'
                        : 'bg-[#CC785C]/10 text-[#CC785C] border border-[#CC785C]/20'
                    }`}
                  >
                    {currentUser.role.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#78716C] font-medium hidden lg:block truncate">
                Post-Discharge Patient Care & Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* If on Login Page, show minimal header action */}
        {isLoginPage ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#78716C] hidden sm:inline">Care Portal Authentication</span>
          </div>
        ) : (
          <>
            {/* Center Desktop Search Input */}
            <div className="hidden md:flex items-center relative max-w-md w-full mx-4 lg:mx-8">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isNurseUser
                    ? 'Search patients, clinical briefs, alerts...'
                    : 'Search medications, care insights, discharge instructions...'
                }
              className="w-full bg-[#F4F0E8] border border-[#E8E2D7] rounded-xl pl-9 pr-10 py-2 text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#CC785C] focus:bg-white focus:ring-2 focus:ring-[#CC785C]/15 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-[#78716C] bg-[#E8E2D7]/60 px-1.5 py-0.5 rounded font-mono border border-[#E8E2D7]">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setShowMobileSearch((prev) => !prev)}
              className="md:hidden p-2 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#F4F0E8] border border-[#E8E2D7] transition-colors cursor-pointer"
              aria-label="Toggle mobile search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Dedicated Authenticated Workspace Badge */}
            <div
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-2xs ${
                isNurseUser
                  ? 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20'
                  : 'bg-[#CC785C]/10 text-[#CC785C] border-[#CC785C]/20'
              }`}
            >
              {isNurseUser ? <UserCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {isNurseUser ? 'Nurse Portal' : 'Patient App'}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-[#FAF8F5] hover:bg-rose-50 border border-[#E8E2D7] hover:border-rose-200 rounded-xl text-xs font-bold text-[#1C1917] hover:text-rose-700 shadow-2xs transition-all cursor-pointer"
              title="Logout from Account"
            >
              <div className="w-5 h-5 rounded-full bg-[#CC785C] text-white font-serif flex items-center justify-center text-[10px] flex-shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              <span className="hidden xl:inline truncate max-w-[100px]">{currentUser?.name || 'User'}</span>
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
            </button>
          </div>
        </>
      )}
    </div>

    {/* Expandable Mobile Search Bar */}
    {showMobileSearch && !isLoginPage && (
      <div className="md:hidden px-3.5 pb-3 pt-1 border-t border-[#E8E2D7]/60 bg-[#FAF8F5] animate-fade-in">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isNurseUser ? 'Search patients, briefs...' : 'Search medications, instructions...'}
            className="w-full bg-white border border-[#E8E2D7] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#CC785C] shadow-2xs"
            autoFocus
          />
        </div>
      </div>
    )}
    </header>
  );
}
