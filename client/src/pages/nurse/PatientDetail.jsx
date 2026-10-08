import React from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { UserCheck, Pill, HelpCircle, Sparkles, FileText, AlertTriangle } from 'lucide-react';

export default function PatientDetail() {
  const { id } = useParams();
  const patientId = id || 'P001';

  return (
    <PageContainer
      title={`Patient Record: ${patientId}`}
      subtitle="Comprehensive clinical breakdown, medication tracking, and AI brief."
      badge={<StatusBadge status="medium" label="Priority: MEDIUM" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Demographics & Admission" className="lg:col-span-1">
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Patient ID</span>
              <span className="font-semibold text-slate-200">{patientId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Name</span>
              <span className="font-semibold text-slate-200">John Doe</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Condition</span>
              <span className="font-semibold text-slate-200">Post-CABG Recovery</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Discharge Date</span>
              <span className="font-semibold text-slate-200">Oct 05, 2026</span>
            </div>
          </div>
        </Card>

        <Card title="AI Nurse Briefing" subtitle="Generated summary based on active events" className="lg:col-span-2" variant="gradient">
          <div className="space-y-3 text-xs text-slate-200 leading-relaxed">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Sparkles className="w-4 h-4" />
              Nurse Intelligence Brief (NB006)
            </div>
            <p>
              Patient confirmed 2 of 3 medications and scored 80% in today's recovery teach-back quiz. Knowledge gap detected in wound infection signs (fever threshold). Follow-up consultation scheduled for Oct 14.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <StatusBadge status="completed" label="Adherence: 80%" />
              <StatusBadge status="info" label="Quiz Score: 80%" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card title="Medication Intake Logs">
          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="font-semibold text-slate-200">Paracetamol 500mg</span>
              <StatusBadge status="completed" label="Taken 8:15 AM" />
            </div>
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="font-semibold text-slate-200">Amoxicillin 250mg</span>
              <StatusBadge status="completed" label="Taken 2:05 PM" />
            </div>
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="font-semibold text-slate-200">Atorvastatin 10mg</span>
              <StatusBadge status="pending" label="Scheduled 9:00 PM" />
            </div>
          </div>
        </Card>

        <Card title="Quiz Response Breakdown">
          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="text-slate-200">Q1: Paracetamol Timing</span>
              <span className="text-emerald-400 font-semibold">Correct</span>
            </div>
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="text-slate-200">Q2: Weight Lifting Limits</span>
              <span className="text-emerald-400 font-semibold">Correct</span>
            </div>
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 flex justify-between items-center">
              <span className="text-slate-200">Q3: Infection Warning Fever</span>
              <span className="text-rose-400 font-semibold">Incorrect (Selected &lt;99°F)</span>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
