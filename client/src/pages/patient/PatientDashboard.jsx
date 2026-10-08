import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { Pill, HelpCircle, FileText, Activity, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PatientDashboard() {
  return (
    <PageContainer
      title="Patient Care Dashboard"
      subtitle="Welcome back, John! Track your daily recovery tasks, medications, and recovery quiz."
      badge={<StatusBadge status="active" label="Recovery Day 3" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Today's Medications" subtitle="3 reminders scheduled" variant="stat">
          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-2xl font-bold text-slate-100">2 / 3</p>
              <p className="text-xs text-slate-400">Medications Taken Today</p>
            </div>
            <div className="p-3 bg-cyan-950/60 rounded-xl text-cyan-400 border border-cyan-800/40">
              <Pill className="w-6 h-6" />
            </div>
          </div>
          <Link
            to="/patient/medication"
            className="mt-4 block text-center py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 transition-colors"
          >
            View Reminders &rarr;
          </Link>
        </Card>

        <Card title="Daily Teach-Back Quiz" subtitle="Interactive recovery check" variant="stat">
          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-2xl font-bold text-slate-100">80%</p>
              <p className="text-xs text-slate-400">Latest Quiz Score</p>
            </div>
            <div className="p-3 bg-emerald-950/60 rounded-xl text-emerald-400 border border-emerald-800/40">
              <HelpCircle className="w-6 h-6" />
            </div>
          </div>
          <Link
            to="/patient/quiz"
            className="mt-4 block text-center py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 transition-colors"
          >
            Take Today's Quiz &rarr;
          </Link>
        </Card>

        <Card title="Discharge Plan" subtitle="Post-care guidelines" variant="stat">
          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-2xl font-bold text-slate-100">5 Items</p>
              <p className="text-xs text-slate-400">Extracted Discharge Guidelines</p>
            </div>
            <div className="p-3 bg-teal-950/60 rounded-xl text-teal-400 border border-teal-800/40">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <Link
            to="/patient/discharge"
            className="mt-4 block text-center py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-teal-300 transition-colors"
          >
            View Instructions &rarr;
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card title="Upcoming Medication Reminders" subtitle="Scheduled dosage times for today">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">Paracetamol 500mg</p>
                  <p className="text-xs text-slate-400">8:00 AM • After Meals</p>
                </div>
              </div>
              <StatusBadge status="completed" label="Taken" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">Amoxicillin 250mg</p>
                  <p className="text-xs text-slate-400">2:00 PM • With Water</p>
                </div>
              </div>
              <StatusBadge status="completed" label="Taken" />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">Atorvastatin 10mg</p>
                  <p className="text-xs text-slate-400">9:00 PM • Bedtime</p>
                </div>
              </div>
              <StatusBadge status="pending" label="Scheduled" />
            </div>
          </div>
        </Card>

        <Card title="Recovery Milestones" subtitle="Care progress overview">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-200">Discharge Document Processed</p>
                <p className="text-xs text-slate-400">Medications and restrictions extracted automatically.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-200">High Quiz Comprehension</p>
                <p className="text-xs text-slate-400">Scored 80% on dietary restrictions and wound care.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-cyan-400 mt-0.5 animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-slate-200">Nurse Care Team Monitoring</p>
                <p className="text-xs text-slate-400">Your recovery status is actively reviewed by Nurse Sarah.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
