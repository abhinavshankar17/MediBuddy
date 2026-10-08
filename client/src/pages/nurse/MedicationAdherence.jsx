import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { Pill, Activity, CheckCircle2, XCircle } from 'lucide-react';

export default function MedicationAdherence() {
  return (
    <PageContainer
      title="Medication Adherence Monitor"
      subtitle="Cohort-wide medication compliance metrics and dosage response logs."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card title="Cohort Compliance" variant="stat">
          <p className="text-3xl font-extrabold text-emerald-400">84.2%</p>
          <p className="text-xs text-slate-400 mt-1">21 of 25 dosages taken on time</p>
        </Card>
        <Card title="Missed Dosages" variant="stat">
          <p className="text-3xl font-extrabold text-rose-400">3</p>
          <p className="text-xs text-slate-400 mt-1">Requires follow-up check-in</p>
        </Card>
        <Card title="Snoozed Reminders" variant="stat">
          <p className="text-3xl font-extrabold text-amber-400">1</p>
          <p className="text-xs text-slate-400 mt-1">Delayed dosage logged</p>
        </Card>
      </div>

      <Card title="Patient Adherence Breakdown">
        <div className="space-y-3">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-100">John Doe (P001)</p>
              <p className="text-[11px] text-slate-400">Paracetamol, Amoxicillin, Atorvastatin</p>
            </div>
            <StatusBadge status="completed" label="80% Adherent" />
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-100">Sarah Connor (P002)</p>
              <p className="text-[11px] text-slate-400">Ciprofloxacin, Ibuprofen</p>
            </div>
            <StatusBadge status="completed" label="100% Adherent" />
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-100">Robert Vance (P005)</p>
              <p className="text-[11px] text-slate-400">Furosemide, Carvedilol, Lisinopril</p>
            </div>
            <StatusBadge status="missed" label="40% Non-Compliant" />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
