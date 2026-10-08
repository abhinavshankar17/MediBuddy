import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { Award, CheckCircle2, AlertCircle, ArrowRight, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function QuizResult() {
  return (
    <PageContainer
      title="Quiz Performance Summary"
      subtitle="Review your latest teach-back quiz score and personalized insights."
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-xl shadow-emerald-950">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-100">80% Score</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Great job! You passed 4 out of 5 questions correctly regarding your post-discharge instructions.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/patient/insights"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold text-xs rounded-xl shadow-md"
            >
              <Lightbulb className="w-4 h-4" />
              View Personal Insights
            </Link>
            <Link
              to="/patient"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl"
            >
              Return to Dashboard
            </Link>
          </div>
        </Card>

        <Card title="Detailed Breakdown">
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">Paracetamol Dosage Timing</span>
              </div>
              <StatusBadge status="completed" label="Correct" />
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">Heavy Lifting Restrictions</span>
              </div>
              <StatusBadge status="completed" label="Correct" />
            </div>

            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-semibold text-slate-200">Warning Signs for Wound Infection</span>
              </div>
              <StatusBadge status="missed" label="Needs Review" />
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
