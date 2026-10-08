import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { Pill, Check, Clock, AlertCircle } from 'lucide-react';

export default function Medication() {
  const medications = [
    {
      id: 'MR001',
      name: 'Paracetamol',
      dosage: '500mg',
      instructions: 'Take 1 tablet after breakfast and dinner',
      schedule: '8:00 AM & 8:00 PM',
      status: 'completed',
      statusLabel: 'Taken (8:15 AM)'
    },
    {
      id: 'MR002',
      name: 'Amoxicillin',
      dosage: '250mg',
      instructions: 'Take 1 capsule 3 times daily with full glass of water',
      schedule: '8:00 AM, 2:00 PM, 8:00 PM',
      status: 'completed',
      statusLabel: 'Taken (2:05 PM)'
    },
    {
      id: 'MR003',
      name: 'Atorvastatin',
      dosage: '10mg',
      instructions: 'Take 1 tablet at bedtime',
      schedule: '9:00 PM',
      status: 'pending',
      statusLabel: 'Scheduled for 9:00 PM'
    }
  ];

  return (
    <PageContainer
      title="Medication Schedule"
      subtitle="Track your daily dosages and log intake times."
      actions={
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-950">
          <Pill className="w-4 h-4" />
          Log Extra Medication
        </button>
      }
    >
      <div className="space-y-4">
        {medications.map((med) => (
          <Card key={med.id} className="hover:border-cyan-500/40 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-cyan-950/80 rounded-xl text-cyan-400 border border-cyan-800/50">
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-slate-100">{med.name}</h3>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-800 text-cyan-300">
                      {med.dosage}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{med.instructions}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Schedule: {med.schedule}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <StatusBadge status={med.status} label={med.statusLabel} />
                {med.status === 'pending' ? (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors">
                    <Check className="w-3.5 h-3.5" />
                    Mark Taken
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Logged
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
