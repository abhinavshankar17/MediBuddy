import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Pill,
  HelpCircle,
  Award,
  Lightbulb,
  FileText,
  Users,
  UserCheck,
  Activity,
  BarChart3,
  Sparkles,
  ShieldAlert,
  HeartPulse,
  LogOut
} from 'lucide-react';

export default function Sidebar() {
  const { currentUser, logout, portalRole, activePatientId } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const isNurse = portalRole === 'nurse' || location.pathname.startsWith('/nurse');

  const patientNavItems = [
    { label: 'Patient Dashboard', path: '/patient', icon: LayoutDashboard },
    { label: 'Medication Schedule', path: '/patient/medication', icon: Pill },
    { label: 'Daily Quiz', path: '/patient/quiz', icon: HelpCircle },
    { label: 'Quiz Results', path: '/patient/quiz/result', icon: Award },
    { label: 'Care Insights', path: '/patient/insights', icon: Lightbulb },
    { label: 'Discharge Plan', path: '/patient/discharge', icon: FileText }
  ];

  const nurseNavItems = [
    { label: 'Nurse Dashboard', path: '/nurse', icon: LayoutDashboard },
    { label: 'Patient Directory', path: '/nurse/patients', icon: Users },
    { label: 'Patient Record', path: `/nurse/patients/${activePatientId || 'P001'}`, icon: UserCheck },
    { label: 'Med Adherence', path: '/nurse/adherence', icon: Activity },
    { label: 'Quiz Analytics', path: '/nurse/quiz-performance', icon: BarChart3 },
    { label: 'AI Summaries', path: '/nurse/ai-summary', icon: Sparkles },
    { label: 'Escalation Alerts', path: '/nurse/escalations', icon: ShieldAlert, badge: '2 Alert' }
  ];

  const navItems = isNurse ? nurseNavItems : patientNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-[#F4F0E8] border-r border-[#E8E2D7] flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] p-4 select-none">
      {/* Workspace Header Badge */}
      <div className="mb-5 px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D7] flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${isNurse ? 'bg-[#0D9488]/15 text-[#0D9488]' : 'bg-[#CC785C]/15 text-[#CC785C]'}`}>
            <HeartPulse className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#78716C]">Active View</p>
            <p className="text-xs font-bold text-[#1C1917]">{isNurse ? 'Nurse Workspace' : 'Patient Portal'}</p>
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-[#059669] ring-4 ring-[#059669]/20 animate-pulse" />
      </div>

      {/* Navigation List */}
      <div className="flex-1 space-y-1">
        <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-[#78716C] mb-2">
          {isNurse ? 'Clinical Controls' : 'Care Navigation'}
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-[#FAF8F5] text-[#CC785C] font-bold border border-[#E8E2D7] border-l-4 border-l-[#CC785C] shadow-2xs'
                  : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF8F5]/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#CC785C]' : 'text-[#A8A29E] group-hover:text-[#78716C]'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E11D48]/10 text-[#E11D48] border border-[#E11D48]/20">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* User Info Footer Card with Logout Button */}
      <div className="mt-auto pt-4 border-t border-[#E8E2D7] space-y-2">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D7]">
          <div className="w-8 h-8 rounded-lg bg-[#CC785C] flex items-center justify-center text-white font-bold text-xs shadow-xs font-serif">
            {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#1C1917] truncate">{currentUser?.name || 'Logged In User'}</p>
            <p className="text-[10px] text-[#78716C] truncate">{currentUser?.role ? currentUser.role.toUpperCase() : 'USER'} • {activePatientId}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-rose-50 border border-[#E8E2D7] hover:border-rose-200 rounded-xl text-[11px] font-bold text-rose-700 transition-colors shadow-2xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out of Account
        </button>
      </div>
    </aside>
  );
}
