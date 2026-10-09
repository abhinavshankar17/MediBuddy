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
            Medi Buddy connects post-discharge patients with automated medication tracking and personalized care guidelines, synthesizing real-time clinical briefs for nursing teams.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Patient App Card */}
          <Card className="hover:border-[#CC785C]/40 transition-all p-6 sm:p-7 flex flex-col justify-between group relative overflow-hidden bg-white shadow-xs hover:shadow-md" variant="gradient">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#CC785C]/10 border border-[#CC785C]/20 flex items-center justify-center text-[#CC785C] shadow-2xs group-hover:scale-105 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <StatusBadge status="active" label="Patient" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#1C1917] font-serif">Patient Care App</h2>
                <p className="text-xs text-[#78716C] mt-1.5 leading-relaxed font-medium">
                  Interactive post-discharge recovery app to stay on track with dosages, exercises, and care guidelines.
                </p>
              </div>

              <div className="space-y-2 pt-1 text-xs text-[#1C1917] font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#CC785C] flex-shrink-0" />
                  <span>Scheduled Dosage Intake & Reminders</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#CC785C] flex-shrink-0" />
                  <span>Digital Discharge Plan & Care Tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#CC785C] flex-shrink-0" />
                  <span>Daily Condition Check-ins & Quizzes</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#E8E2D7]">
              <Link
                to="/patient"
                onClick={() => setPortalRole('patient')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#CC785C] hover:bg-[#B86549] text-white font-bold text-xs shadow-xs transition-all"
              >
                Launch Patient App <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Family Portal Card */}
          <Card className="hover:border-amber-400/60 transition-all p-6 sm:p-7 flex flex-col justify-between group relative overflow-hidden bg-white shadow-xs hover:shadow-md" variant="gradient">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-800 shadow-2xs group-hover:scale-105 transition-transform">
                  <UserCheck className="w-6 h-6 text-amber-700" />
                </div>
                <StatusBadge status="warning" label="Family Portal" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#1C1917] font-serif">Family</h2>
                <p className="text-xs text-[#78716C] mt-1.5 leading-relaxed font-medium">
                  Stay closely connected with daily AI recovery reports, interactive care calendar, and review loved ones' feedback.
                </p>
              </div>

              <div className="space-y-2 pt-1 text-xs text-[#1C1917] font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>Daily Non-Clinical Recovery Digest</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>Interactive 30-Day Recovery Calendar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>Review Patient Feedback & Send Love</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#E8E2D7]">
              <Link
                to="/caregiver"
                onClick={() => setPortalRole('caregiver')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-xs transition-all"
              >
                Launch Family Portal <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Nurse Portal Card */}
          <Card className="hover:border-[#0D9488]/40 transition-all p-6 sm:p-7 flex flex-col justify-between group relative overflow-hidden bg-white shadow-xs hover:shadow-md" variant="gradient">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488] shadow-2xs group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <StatusBadge status="info" label="Clinical Hub" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#1C1917] font-serif">Nurse Intelligence</h2>
                <p className="text-xs text-[#78716C] mt-1.5 leading-relaxed font-medium">
                  Real-time clinical dashboard providing automated cohort adherence metrics, risk triage, and AI summaries.
                </p>
              </div>

              <div className="space-y-2 pt-1 text-xs text-[#1C1917] font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488] flex-shrink-0" />
                  <span>Cohort Adherence & Compliance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488] flex-shrink-0" />
                  <span>AI Clinical Briefs & Knowledge Gaps</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488] flex-shrink-0" />
                  <span>High-Priority Escalation Alert Queue</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#E8E2D7]">
              <Link
                to="/nurse"
                onClick={() => setPortalRole('nurse')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-xs shadow-xs transition-all"
              >
                Launch Nurse Portal <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
