import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { FileText, ShieldAlert, CheckCircle, Calendar } from 'lucide-react';

export default function DischargeInstructions() {
  return (
    <PageContainer
      title="Discharge Instructions"
      subtitle="Extracted guidelines from your clinical discharge summary."
      actions={
        <StatusBadge status="completed" label="Extracted & Verified" />
      }
    >
      <div className="space-y-6">
        <Card title="Activity & Physical Restrictions">
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              No heavy lifting over 10 lbs for 2 weeks post-surgery.
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Light walking for 15-20 minutes twice daily is encouraged.
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Avoid strenuous cardiovascular exercise until follow-up clearance.
            </li>
          </ul>
        </Card>

        <Card title="Red-Flag Warning Symptoms" variant="gradient">
          <div className="p-3 bg-rose-950/60 rounded-xl border border-rose-800/60 text-xs text-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <ShieldAlert className="w-4 h-4" />
              Contact Nurse Team Immediately If:
            </div>
            <p>• Fever above 100.4°F (38°C) or severe chills</p>
            <p>• Sudden shortness of breath or persistent chest tightness</p>
            <p>• Redness, swelling, or purulent drainage at the surgical incision site</p>
          </div>
        </Card>

        <Card title="Follow-Up Appointments">
          <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs font-bold text-slate-200">Post-Op Wound Review</p>
                <p className="text-[11px] text-slate-400">Dr. Aris Thorne • Oct 14, 2026 at 10:00 AM</p>
              </div>
            </div>
            <StatusBadge status="info" label="Confirmed" />
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
