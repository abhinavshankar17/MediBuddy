import React from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { Link } from 'react-router-dom';
import { UserCheck, Search, ChevronRight } from 'lucide-react';

export default function PatientList() {
  const patients = [
    { id: 'P001', name: 'John Doe', age: 62, condition: 'Post-CABG Recovery', priority: 'MEDIUM', medAdherence: 80, quizScore: 80 },
    { id: 'P002', name: 'Sarah Connor', age: 45, condition: 'Laparoscopic Cholecystectomy', priority: 'LOW', medAdherence: 100, quizScore: 100 },
    { id: 'P003', name: 'Eleanor Vance', age: 71, condition: 'Total Hip Arthroplasty', priority: 'HIGH', medAdherence: 60, quizScore: 60 },
    { id: 'P004', name: 'Marcus Brody', age: 58, condition: 'Type 2 Diabetes & Foot Ulcer', priority: 'MEDIUM', medAdherence: 80, quizScore: 80 },
    { id: 'P005', name: 'Robert Vance', age: 68, condition: 'Congestive Heart Failure', priority: 'HIGH', medAdherence: 40, quizScore: 40 }
  ];

  return (
    <PageContainer title="Patient Cohort Directory" subtitle="Manage and monitor post-discharge patient care plans.">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Patient</th>
                <th className="p-3">Condition</th>
                <th className="p-3">Priority Risk</th>
                <th className="p-3">Med Adherence</th>
                <th className="p-3">Quiz Score</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="p-3 font-semibold text-slate-100 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    {p.name} ({p.id})
                  </td>
                  <td className="p-3 text-slate-400">{p.condition}</td>
                  <td className="p-3">
                    <StatusBadge status={p.priority} label={p.priority} />
                  </td>
                  <td className="p-3 font-bold text-slate-200">{p.medAdherence}%</td>
                  <td className="p-3 font-bold text-slate-200">{p.quizScore}%</td>
                  <td className="p-3 text-right">
                    <Link
                      to={`/nurse/patients/${p.id}`}
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      Inspect <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  );
}
