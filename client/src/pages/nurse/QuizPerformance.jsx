import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { BarChart3, HelpCircle, CheckCircle, AlertCircle } from 'lucide-react';

export default function QuizPerformance() {
  return (
    <PageContainer
      title="Cohort Teach-Back Quiz Analytics"
      subtitle="Comprehension rates, score distributions, and identified knowledge gaps."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card title="Completed Quizzes" variant="stat">
          <p className="text-3xl font-extrabold text-cyan-400">7 / 8</p>
          <p className="text-xs text-slate-400 mt-1">1 patient pending completion</p>
        </Card>
        <Card title="Average Cohort Score" variant="stat">
          <p className="text-3xl font-extrabold text-indigo-400">77%</p>
          <p className="text-xs text-slate-400 mt-1">Target threshold: &ge;75%</p>
        </Card>
        <Card title="Primary Knowledge Gap" variant="stat">
          <p className="text-lg font-bold text-amber-400">Wound Infection</p>
          <p className="text-xs text-slate-400 mt-1">3 patients missed fever threshold</p>
        </Card>
      </div>

      <Card title="Patient Quiz Scores">
        <div className="space-y-3">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-100">P002 • Sarah Connor</span>
            <StatusBadge status="completed" label="100% (5/5)" />
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-100">P001 • John Doe</span>
            <StatusBadge status="completed" label="80% (4/5)" />
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-100">P005 • Robert Vance</span>
            <StatusBadge status="missed" label="40% (2/5) - GAP DETECTED" />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
