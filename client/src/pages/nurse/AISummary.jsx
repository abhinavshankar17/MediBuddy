import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { Sparkles, Bot, Clock, FileText } from 'lucide-react';

export default function AISummary() {
  return (
    <PageContainer
      title="AI Clinical Intelligence Summaries"
      subtitle="Automated post-discharge patient analysis generated from check-ins, quizzes, and med logs."
      badge={<StatusBadge status="completed" label="Synced Today" />}
    >
      <div className="space-y-6">
        <Card title="Cohort Intelligence Executive Brief" variant="gradient">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-cyan-950/80 rounded-xl text-cyan-400 border border-cyan-800">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-2 text-xs text-slate-200">
              <h3 className="text-sm font-bold text-slate-100">Daily Synthesis • Oct 08, 2026</h3>
              <p className="leading-relaxed text-slate-300">
                Overall cohort recovery remains stable with an 84% medication adherence rate. Patient P005 (Robert Vance) exhibits critical non-compliance with diuretic regimen accompanied by low quiz scores on fluid restrictions. Patient P003 (Eleanor Vance) skipped her morning blood pressure medication. High-risk escalations have been dispatched to the nursing queue.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Individual Patient Briefings">
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-100">Brief NB006 — John Doe (P001)</span>
                <StatusBadge status="completed" label="Medium Priority" />
              </div>
              <p className="text-xs text-slate-400">
                Patient confirmed 2 of 3 medications and scored 80% in today's recovery teach-back quiz. Knowledge gap in wound infection fever thresholds.
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-100">Brief NB010 — Robert Vance (P005)</span>
                <StatusBadge status="missed" label="High Priority" />
              </div>
              <p className="text-xs text-slate-400">
                Patient missed 3 medication doses today and scored 40% on quiz. Multiple knowledge gaps identified in heart failure warning signs.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
