import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { ShieldAlert, AlertTriangle, CheckCircle, PhoneCall } from 'lucide-react';

export default function Escalations() {
  const escalations = [
    {
      id: 'ESC001',
      patientId: 'P005',
      patientName: 'Robert Vance',
      reason: 'Low Medication Adherence (40%) & Failed Recovery Quiz (40%)',
      priority: 'HIGH',
      timestamp: '2026-10-08T10:30:00+05:30',
      status: 'OPEN'
    },
    {
      id: 'ESC002',
      patientId: 'P003',
      patientName: 'Eleanor Vance',
      reason: 'Missed Blood Pressure Dosage & Reported Mild Dizziness',
      priority: 'HIGH',
      timestamp: '2026-10-08T11:15:00+05:30',
      status: 'OPEN'
    }
  ];

  return (
    <PageContainer
      title="Clinical Risk Escalations"
      subtitle="Automated alerts requiring nurse outreach or physician review."
      badge={<StatusBadge status="missed" label="2 Active Alerts" />}
    >
      <div className="space-y-4">
        {escalations.map((esc) => (
          <Card key={esc.id} className="border-rose-900/60 bg-rose-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-950 rounded-xl text-rose-400 border border-rose-800">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-100">{esc.patientName} ({esc.patientId})</h3>
                    <StatusBadge status="missed" label={esc.priority} />
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{esc.reason}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Logged: {new Date(esc.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg shadow-md">
                  <PhoneCall className="w-3.5 h-3.5" />
                  Call Patient
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg">
                  Resolve Alert
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
