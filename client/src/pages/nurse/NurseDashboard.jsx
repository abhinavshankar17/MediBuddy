import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { Users, AlertTriangle, Activity, BarChart3, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NurseDashboard() {
  return (
    <PageContainer
      title="Nurse Clinical Dashboard"
      subtitle="Overview of patient recovery status, adherence alerts, and teach-back quiz results."
      badge={<StatusBadge status="info" label="8 Active Patients" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total Patients" variant="stat">
          <div className="flex items-center justify-between mt-1">
            <p className="text-3xl font-extrabold text-slate-100">8</p>
            <Users className="w-6 h-6 text-cyan-400" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Post-discharge cohort</p>
        </Card>

        <Card title="Active Escalations" variant="stat">
          <div className="flex items-center justify-between mt-1">
            <p className="text-3xl font-extrabold text-rose-400">2</p>
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <p className="text-[11px] text-rose-300/80 mt-2">Requires immediate review</p>
        </Card>

        <Card title="Med Adherence Rate" variant="stat">
          <div className="flex items-center justify-between mt-1">
            <p className="text-3xl font-extrabold text-emerald-400">84%</p>
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Cohort average today</p>
        </Card>

        <Card title="Quiz Avg Score" variant="stat">
          <div className="flex items-center justify-between mt-1">
            <p className="text-3xl font-extrabold text-indigo-400">77%</p>
            <BarChart3 className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">7 completed quizzes</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card
          title="High Priority Patient Briefs"
          subtitle="Patients flagged by AI for low adherence or quiz gaps"
          action={
            <Link to="/nurse/patients" className="text-xs font-semibold text-cyan-400 hover:underline">
              View All Patients &rarr;
            </Link>
          }
        >
          <div className="space-y-3">
            <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-800/40 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100">Robert Vance (P005)</span>
                  <StatusBadge status="high" label="HIGH RISK" />
                </div>
                <p className="text-xs text-slate-400 mt-1">Adherence 40% • Quiz 40% (Knowledge gaps on insulin & wound care)</p>
              </div>
              <Link to="/nurse/patients/P005" className="px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg">
                Inspect
              </Link>
            </div>

            <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/40 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100">Eleanor Vance (P003)</span>
                  <StatusBadge status="medium" label="MEDIUM RISK" />
                </div>
                <p className="text-xs text-slate-400 mt-1">Adherence 60% • Quiz 60% (Missed evening blood pressure dose)</p>
              </div>
              <Link to="/nurse/patients/P003" className="px-3 py-1.5 bg-amber-900/80 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg">
                Inspect
              </Link>
            </div>
          </div>
        </Card>

        <Card title="Recent AI Clinical Briefings" subtitle="Automated daily summaries">
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
              <Sparkles className="w-4 h-4" />
              Cohort Daily Overview
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              6 out of 8 patients completed their teach-back quizzes. 2 patients flagged for medication non-compliance. Escalations automatically generated for P005 and P003.
            </p>
            <div className="pt-2">
              <Link to="/nurse/ai-summary" className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1">
                Read Full AI Summary <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
