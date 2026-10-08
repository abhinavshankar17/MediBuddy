import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { getAllDemoUsers } from '../services/authService';
import { Stethoscope, User, UserCheck, HeartPulse, LogIn, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { loginUser } = useApp();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('patient'); // 'patient' | 'nurse' | 'caregiver'
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('••••••••');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      const uList = await getAllDemoUsers();
      setUsers(uList);
      setLoading(false);
    }
    loadUsers();
  }, []);

  const handleQuickLogin = (user) => {
    loginUser(user);
    if (user.role === 'nurse' || user.role === 'clinician') {
      navigate('/nurse');
    } else {
      navigate('/patient');
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const matchedUser = users.find((u) => u.email.toLowerCase() === emailInput.toLowerCase()) || users[0];
    handleQuickLogin(matchedUser);
  };

  const filteredUsers = users.filter((u) => {
    if (selectedRole === 'patient') return u.role === 'patient';
    if (selectedRole === 'nurse') return u.role === 'nurse' || u.role === 'clinician';
    if (selectedRole === 'caregiver') return u.role === 'caregiver';
    return true;
  });

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto py-6 space-y-8 animate-fade-in">
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CC785C]/10 border border-[#CC785C]/20 text-[#CC785C] text-xs font-bold shadow-2xs">
            <Stethoscope className="w-4 h-4 text-[#CC785C]" />
            <span>Instant Demo Persona Quick-Login</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] font-serif tracking-tight">
            Select Your User Persona to Log In
          </h1>

          <p className="text-xs sm:text-sm text-[#78716C] max-w-xl mx-auto leading-relaxed">
            Click any demo profile card below to authenticate instantly without typing passwords.
          </p>
        </div>

        {/* Role Tab Switcher */}
        <div className="flex justify-center">
          <div className="flex bg-[#F4F0E8] p-1.5 rounded-2xl border border-[#E8E2D7] shadow-2xs">
            <button
              onClick={() => setSelectedRole('patient')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedRole === 'patient'
                  ? 'bg-[#CC785C] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Patients (8 Accounts)</span>
            </button>

            <button
              onClick={() => setSelectedRole('nurse')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedRole === 'nurse'
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Nurses & Doctors (3 Accounts)</span>
            </button>

            <button
              onClick={() => setSelectedRole('caregiver')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedRole === 'caregiver'
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>Caregivers (5 Accounts)</span>
            </button>
          </div>
        </div>

        {/* 1-Click Persona Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <div
              key={user._id}
              onClick={() => handleQuickLogin(user)}
              className="claude-card p-5 bg-white border border-[#E8E2D7] hover:border-[#CC785C] rounded-2xl cursor-pointer hover:-translate-y-1 transition-all group flex flex-col justify-between shadow-2xs hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#CC785C]/10 border border-[#CC785C]/20 flex items-center justify-center text-[#CC785C] font-bold text-sm font-serif group-hover:scale-105 transition-transform">
                    {user.name.charAt(0)}
                  </div>
                  <StatusBadge
                    status={user.role === 'patient' ? 'completed' : user.role === 'nurse' ? 'info' : 'warning'}
                    label={user.role.toUpperCase()}
                  />
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#1C1917] font-serif group-hover:text-[#CC785C] transition-colors">
                    {user.name}
                  </h3>
                  <p className="text-xs text-[#78716C] mt-0.5">{user.email}</p>
                </div>

                <p className="text-[11px] text-[#A8A29E] bg-[#FAF8F5] p-2 rounded-lg border border-[#E8E2D7]">
                  {user.detail}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F4F0E8] flex items-center justify-between text-xs font-bold text-[#CC785C]">
                <span>1-Click Login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {/* Optional Manual Login Box */}
        <Card title="Or Login With Email" subtitle="Pre-filled credentials demo form">
          <form onSubmit={handleFormSubmit} className="space-y-4 max-w-md mx-auto">
            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1">Demo Email Address</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="patient1@carebridge.demo"
                className="w-full bg-[#F4F0E8] border border-[#E8E2D7] rounded-xl px-3.5 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#CC785C] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#78716C] mb-1">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-[#F4F0E8] border border-[#E8E2D7] rounded-xl px-3.5 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#CC785C] focus:bg-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEmailInput('patient1@carebridge.demo')}
                className="flex-1 py-2 text-xs font-bold bg-[#F4F0E8] hover:bg-[#E8E2D7] text-[#78716C] rounded-xl border border-[#E8E2D7]"
              >
                Auto-fill Patient
              </button>
              <button
                type="button"
                onClick={() => setEmailInput('nurse1@carebridge.demo')}
                className="flex-1 py-2 text-xs font-bold bg-[#F4F0E8] hover:bg-[#E8E2D7] text-[#78716C] rounded-xl border border-[#E8E2D7]"
              >
                Auto-fill Nurse
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#CC785C] hover:bg-[#B86549] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Authenticate & Enter Portal
            </button>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
