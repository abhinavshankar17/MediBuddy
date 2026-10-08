import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { Lightbulb, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function PatientInsight() {
  return (
    <PageContainer
      title="Personalized Patient Insights"
      subtitle="AI-synthesized knowledge strengths, gaps, and care recommendations."
      badge={<StatusBadge status="completed" label="Medium Priority" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Knowledge Strengths" subtitle="Areas with top quiz performance">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-emerald-950/40 rounded-lg border border-emerald-800/40">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Medication Timing</h4>
                <p className="text-xs text-slate-400 mt-0.5">Accurately identified Paracetamol & Amoxicillin intake intervals.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-emerald-950/40 rounded-lg border border-emerald-800/40">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Exercise Restrictions</h4>
                <p className="text-xs text-slate-400 mt-0.5">Understands strict 10lb lifting restriction for 2 weeks.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Knowledge Gaps & Focus Areas" subtitle="Topics requiring reinforcement">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-950/40 rounded-lg border border-amber-800/40">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Wound Care & Infection Signs</h4>
                <p className="text-xs text-slate-400 mt-0.5">Missed question regarding fever threshold (&gt;100.4°F) as an escalation trigger.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-cyan-950/40 rounded-lg border border-cyan-800/40">
              <Lightbulb className="w-5 h-5 text-cyan-400 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Follow-Up Schedule</h4>
                <p className="text-xs text-slate-400 mt-0.5">Remember to confirm Cardiology follow-up on Oct 14th.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
