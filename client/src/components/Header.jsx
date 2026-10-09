import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications
} from '../services/notificationService';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import {
  Stethoscope,
  Bell,
  Search,
  User,
  UserCheck,
  Command,
  LogOut,
  Menu,
  X,
  CheckCheck,
  Trash2
} from 'lucide-react';

export default function Header() {
  const { t } = useTranslation();
  const {
    currentUser,
    activePatientId,
    logout,
    searchQuery,
    setSearchQuery,
    isMobileMenuOpen,
    toggleMobileMenu
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toastNotification, setToastNotification] = useState(null);
  const seenNotifIdsRef = React.useRef(new Set());
  const toastTimeoutRef = React.useRef(null);

  const isLoginPage = location.pathname === '/login';
  const isCaregiverUser = currentUser?.role === 'caregiver' || location.pathname.startsWith('/caregiver');
  const isNurseUser = !isCaregiverUser && (currentUser?.role === 'nurse' || currentUser?.role === 'clinician');

  useEffect(() => {
    if (isLoginPage) return;

    const fetchUserNotifications = async () => {
      try {
        const filter = {};
        if (isCaregiverUser) {
          filter.recipientRole = 'caregiver';
        } else if (isNurseUser) {
          filter.patientId = activePatientId || 'P001';
        } else {
          filter.patientId = currentUser?.patientId || currentUser?._id || activePatientId || 'P001';
        }

        const list = (await getNotifications(filter)) || [];

        setNotifications(prev => {
          if (Array.isArray(prev) && prev.length === list.length && prev.every((item, idx) => list[idx] && item._id === list[idx]._id && item.read === list[idx].read)) {
            return prev;
          }
          return list;
        });

        // Check for new unread notifications that haven't been shown in toast
        const newUnread = list.find(n => !n.read && !seenNotifIdsRef.current.has(`${n._id}_${n.createdAt || ''}_${n.metadata?.scheduledAt || ''}`));
        if (newUnread) {
          const key = `${newUnread._id}_${newUnread.createdAt || ''}_${newUnread.metadata?.scheduledAt || ''}`;
          seenNotifIdsRef.current.add(key);
          setToastNotification(newUnread);

          if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
          }
          // Auto-dismiss after exactly 5 seconds (5000ms)
          toastTimeoutRef.current = setTimeout(() => {
            setToastNotification(null);
          }, 5000);
        }
      } catch (e) {
        // graceful fallback
      }
    };

    fetchUserNotifications();
    const interval = setInterval(fetchUserNotifications, 3000);
    return () => {
      clearInterval(interval);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [currentUser, activePatientId, isLoginPage, isCaregiverUser, isNurseUser]);

  // Immediately clear notification alerts & toast when user takes a medication
  useEffect(() => {
    const handleMedTaken = (e) => {
      const { reminderId } = e.detail || {};
      if (reminderId) {
        setNotifications(prev => prev.filter(n => n.reminderId !== reminderId && !n._id.includes(reminderId)));
        setToastNotification(prev => {
          if (prev && (prev.reminderId === reminderId || prev._id?.includes(reminderId))) {
            return null;
          }
          return prev;
        });
      }
    };
    window.addEventListener('medication-taken', handleMedTaken);
    return () => window.removeEventListener('medication-taken', handleMedTaken);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

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
            onClick={() => navigate(isCaregiverUser ? '/caregiver' : isNurseUser ? '/nurse' : '/patient')}
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
                    className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${isCaregiverUser
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : isNurseUser
                          ? 'bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20'
                          : 'bg-[#CC785C]/10 text-[#CC785C] border border-[#CC785C]/20'
                      }`}
                  >
                    {isCaregiverUser ? 'FAMILY' : currentUser.role.toUpperCase()}
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
            <span className="text-xs font-bold text-[#78716C] hidden sm:inline">
              {t('login.tag', 'Care Portal Authentication')}
            </span>
            <LanguageSwitcher />
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
                  isCaregiverUser
                    ? 'Search recovery reports, notes, calendar events...'
                    : isNurseUser
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

              {/* Notification Bell Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(prev => !prev)}
                  className="relative p-2 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#F4F0E8] border border-[#E8E2D7] transition-colors cursor-pointer flex items-center justify-center"
                  aria-label="View notifications"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#CC785C] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#FAF8F5] shadow-xs animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Popover */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E8E2D7] rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 bg-[#FAF8F5] border-b border-[#E8E2D7] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#CC785C]" />
                        <span className="text-xs font-bold text-[#1C1917]">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#CC785C]/10 text-[#CC785C]">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {notifications.length > 0 && (
                          <>
                            {unreadCount > 0 && (
                              <button
                                onClick={async () => {
                                  const filter = isCaregiverUser ? { recipientRole: 'caregiver' } : { patientId: currentUser?.patientId || currentUser?._id || activePatientId || 'P001' };
                                  await markAllNotificationsAsRead(filter);
                                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                                }}
                                className="text-[10px] text-[#0D9488] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                title="Mark all as read"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>Mark all read</span>
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                const filter = isCaregiverUser ? { recipientRole: 'caregiver' } : { patientId: currentUser?.patientId || currentUser?._id || activePatientId || 'P001' };
                                await clearAllNotifications(filter);
                                setNotifications([]);
                              }}
                              className="text-[10px] text-rose-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                              title="Clear all notifications"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Clear</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-[#78716C] hover:text-[#1C1917] text-xs p-1"
                          aria-label="Close popover"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-[#E8E2D7]/50">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#78716C]">
                          No active notifications.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif._id}
                            className={`p-3.5 text-xs transition-colors hover:bg-[#FAF8F5]/80 ${!notif.read ? 'bg-amber-50/40' : ''
                              }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-bold text-[#1C1917] flex items-center gap-1.5">
                                {notif.title}
                                {!notif.read && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#CC785C] inline-block" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] text-[#A8A29E]">
                                  {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                <button
                                  onClick={async () => {
                                    await deleteNotification(notif._id);
                                    setNotifications(prev => prev.filter(n => n._id !== notif._id));
                                  }}
                                  className="text-[#A8A29E] hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                                  title="Dismiss notification"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="mt-1 text-[#57534E] text-[11px] leading-relaxed whitespace-pre-line">
                              {notif.message}
                            </p>
                            {!notif.read && (
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={async () => {
                                    await markNotificationAsRead(notif._id);
                                    setNotifications(prev =>
                                      prev.map(n => n._id === notif._id ? { ...n, read: true } : n)
                                    );
                                  }}
                                  className="text-[10px] text-[#0D9488] hover:underline font-semibold cursor-pointer"
                                >
                                  Mark as read
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Dedicated Authenticated Workspace Badge */}
              <div
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-2xs ${isCaregiverUser
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : isNurseUser
                      ? 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20'
                      : 'bg-[#CC785C]/10 text-[#CC785C] border-[#CC785C]/20'
                  }`}
              >
                {isCaregiverUser ? (
                  <User className="w-3.5 h-3.5 text-amber-700" />
                ) : isNurseUser ? (
                  <UserCheck className="w-3.5 h-3.5" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isCaregiverUser ? 'Family Portal' : isNurseUser ? 'Nurse Portal' : 'Patient App'}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-[#FAF8F5] hover:bg-rose-50 border border-[#E8E2D7] hover:border-rose-200 rounded-xl text-xs font-bold text-[#1C1917] hover:text-rose-700 shadow-2xs transition-all cursor-pointer"
                title={t('common.logout', 'Logout from Account')}
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

      {/* 5-Second Real-Time On-Screen Notification Toast Popup */}
      {toastNotification && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-sm w-full bg-white/95 backdrop-blur-md border-2 border-[#CC785C]/40 shadow-2xl rounded-2xl overflow-hidden animate-fade-in transition-all">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#CC785C]/15 border border-[#CC785C]/30 flex items-center justify-center flex-shrink-0 text-base">
                  {toastNotification.type === 'simulated_call' ? '📞' : toastNotification.type === 'caregiver_medication_notification' ? '🚨' : '💊'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-[#1C1917] tracking-tight">
                      {toastNotification.title}
                    </h4>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#CC785C]/10 text-[#CC785C]">
                      JUST NOW
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#57534E] leading-relaxed line-clamp-3 whitespace-pre-line">
                    {toastNotification.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setToastNotification(null)}
                className="text-[#A8A29E] hover:text-[#1C1917] p-1 transition-colors cursor-pointer flex-shrink-0"
                title="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px]">
              <button
                onClick={() => {
                  setShowNotifications(true);
                  setToastNotification(null);
                }}
                className="font-bold text-[#CC785C] hover:underline cursor-pointer"
              >
                View in notifications →
              </button>
              <span className="text-[#A8A29E]">Disappearing in 5s</span>
            </div>
          </div>

          {/* 5-second Countdown Progress Bar */}
          <div className="w-full bg-[#E8E2D7]/40 h-1 overflow-hidden">
            <div className="h-full bg-[#CC785C] animate-[toastProgress_5s_linear_forwards]" />
          </div>
        </div>
      )}

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
