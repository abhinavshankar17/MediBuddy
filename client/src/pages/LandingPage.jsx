import React from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { User, UserCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function LandingPage() {
  const { setPortalRole } = useApp();

  return (
    <PageContainer>
      <div className="max-w-5xl mx-auto py-6 space-y-10">
        {/* Hero Banner */}
        <div className="text-center space-y-4 relative py-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#CC785C]/10 border border-[#CC785C]/20 text-[#CC785C] text-xs font-bold shadow-2xs">
            <Sparkles className="w-4 h-4 text-[#CC785C] animate-pulse" />
            <span>MERN Post-Discharge Care Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1C1917] font-serif tracking-tight leading-tight">
            Seamless Patient Recovery & <br className="hidden sm:block" />
            <span className="text-[#CC785C]">Clinical Nurse Intelligence</span>
          </h1>

          <p className="text-sm sm:text-base text-[#78716C] max-w-2xl mx-auto leading-relaxed">
            Medi Buddy connects post-discharge patients with automated medication tracking and daily teach-back quizzes, synthesizing real-time clinical briefs for nursing teams.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Patient App Card */}
          <Card className="hover:border-[#CC785C]/40 transition-all p-8 flex flex-col justify-between group relative overflow-hidden bg-white shadow-xs hover:shadow-md" variant="gradient">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-[#CC785C]/10 border border-[#CC785C]/20 flex items-center justify-center text-[#CC785C] shadow-2xs group-hover:scale-105 transition-transform">
                  <User className="w-7 h-7" />
                </div>
                <StatusBadge status="active" label="Patient Portal" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-[#1C1917] font-serif">Patient Care App</h2>
                <p className="text-xs text-[#78716C] mt-2 leading-relaxed font-medium">
                  Interactive post-discharge recovery app designed to keep patients on track with dosages and instructions.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs text-[#1C1917] font-medium">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#CC785C]" />
                  <span>Scheduled Dosage Intake & Reminders</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#CC785C]" />
                  <span>Daily Interactive Teach-Back Quiz</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#CC785C]" />
                  <span>Personalized Knowledge Insights & Guidelines</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E8E2D7]">
              <Link
                to="/patient"
                onClick={() => setPortalRole('patient')}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#CC785C] hover:bg-[#B86549] text-white font-bold text-xs shadow-xs transition-all"
              >
                Launch Patient App <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>

          {/* Nurse Portal Card */}
          <Card className="hover:border-[#0D9488]/40 transition-all p-8 flex flex-col justify-between group relative overflow-hidden bg-white shadow-xs hover:shadow-md" variant="gradient">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488] shadow-2xs group-hover:scale-105 transition-transform">
                  <UserCheck className="w-7 h-7" />
                </div>
                <StatusBadge status="info" label="Clinical Workspace" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-[#1C1917] font-serif">Nurse Intelligence Portal</h2>
                <p className="text-xs text-[#78716C] mt-2 leading-relaxed font-medium">
                  Real-time clinical dashboard providing automated cohort adherence metrics, quiz analytics, and AI risk briefs.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs text-[#1C1917] font-medium">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                  <span>Cohort Adherence & Quiz Performance Metrics</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                  <span>AI Clinical Briefings & Knowledge Gap Detection</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                  <span>High-Priority Escalation Alert Queue</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E8E2D7]">
              <Link
                to="/nurse"
                onClick={() => setPortalRole('nurse')}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-xs shadow-xs transition-all"
              >
                Launch Nurse Portal <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
