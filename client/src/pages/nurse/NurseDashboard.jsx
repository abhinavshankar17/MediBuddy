import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import {
  getNurseCohortOverview,
  getNursePatientList,
  getNurseAlerts
} from '../../services/nurseService';
import { useApp } from '../../context/AppContext';
import {
  Users,
  AlertTriangle,
  Activity,
  BarChart3,
  ChevronRight,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  HelpCircle,
  Pill,
  Clock,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export default function NurseDashboard() {
  const { searchQuery, setSearchQuery } = useApp();
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNurseDashboardData = async (priority, query) => {
    try {
      setLoading(true);
      setError(null);

      const [oData, pList, aList] = await Promise.all([
        getNurseCohortOverview(),
        getNursePatientList(priority, query),
        getNurseAlerts()
      ]);

      setOverview(oData);
      setPatients(pList);
      setAlerts(aList);
    } catch (err) {
      console.error('Failed to load nurse dashboard:', err);
      setError('Unable to load clinical nurse dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNurseDashboardData(priorityFilter, searchQuery);
  }, [priorityFilter, searchQuery]);

  if (loading) {
    return (
      <PageContainer title="Nurse Clinical Dashboard">
        <LoadingState message="Fetching cohort patient directory, med adherence & escalation queue..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Nurse Clinical Dashboard">
        <ErrorState
          title="Clinical Data Unavailable"
          message={error}
          onRetry={() => loadNurseDashboardData(priorityFilter, searchQuery)}
        />
      </PageContainer>
    );
  }

  const priorityBadgeMap = {
    HIGH: { status: 'missed', label: 'HIGH RISK' },
    MEDIUM: { status: 'pending', label: 'MEDIUM RISK' },
    LOW: { status: 'completed', label: 'LOW RISK' }
  };

  const alertCategoryLabels = {
    missed_medication: 'Missed Medication',
    repeated_missed_medication: 'Repeated Missed Medication',
    low_quiz_score: 'Low Quiz Score',
    knowledge_gap: 'Knowledge Gap',
    medication_question: 'Medication Question',
    warning_sign: 'Warning Sign Context',
    missing_information: 'Missing Information'
  };

  return (
    <PageContainer
      title="Nurse Clinical Dashboard"
      subtitle="Cohort recovery directory, medication adherence counts, teach-back scores, and risk escalations."
      actions={
        <div className="flex items-center gap-3">
          <StatusBadge status="info" label={`${overview.totalPatients} Active Patients`} />
          <Link
            to="/nurse/patients"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-xs rounded-xl shadow-2xs transition-all"
          >
            <span>Full Patient Directory</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      }
    >
      {/* Cohort Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total Cohort" variant="stat">
          <div className="flex items-center justify-between mt-1">
            <span className="text-3xl font-extrabold text-[#1C1917] font-serif">{overview.totalPatients}</span>
            <div className="p-2 bg-[#0D9488]/10 text-[#0D9488] rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-[#78716C] mt-2 font-medium">Post-discharge recovery cohort</p>
        </Card>

        <Card title="Active Escalations" variant="stat">
          <div className="flex items-center justify-between mt-1">
            <span className="text-3xl font-extrabold text-[#E11D48] font-serif">{overview.activeEscalations}</span>
            <div className="p-2 bg-[#E11D48]/10 text-[#E11D48] rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-rose-700 mt-2 font-bold">Action queue alerts</p>
        </Card>

        <Card title="Med Adherence Rate" variant="stat">
          <div className="flex items-center justify-between mt-1">
            <span className="text-3xl font-extrabold text-[#059669] font-serif">{overview.medAdherenceRate}%</span>
            <div className="p-2 bg-[#059669]/10 text-[#059669] rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-[#78716C] mt-2 font-medium">Cohort dosage compliance</p>
        </Card>

        <Card title="Active Care Plans" variant="stat">
          <div className="flex items-center justify-between mt-1">
            <span className="text-3xl font-extrabold text-[#0D9488] font-serif">{overview.totalPatients}</span>
            <div className="p-2 bg-[#0D9488]/10 text-[#0D9488] rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-[#78716C] mt-2 font-medium">Post-discharge cohort telemetry</p>
        </Card>
      </div>

      {/* Escalation Category Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <Card title="Clinical Escalations & Risk Alerts" subtitle="Category alerts from patient check-ins and dosage logs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.slice(0, 4).map((alert) => (
              <div
                key={alert._id}
                onClick={() => navigate(`/nurse/patients/${alert.patientId}`)}
                className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-xl flex items-start justify-between gap-3 cursor-pointer hover:border-rose-300 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1C1917]">{alert.patientName} ({alert.patientId})</span>
                      <StatusBadge status="missed" label={alert.severity} />
                    </div>
                    <p className="text-xs text-rose-900 font-medium">
                      Category: <strong>{alertCategoryLabels[alert.category] || alert.category}</strong>
                    </p>
                    <p className="text-[11px] text-[#78716C]">{alert.reason}</p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[#78716C] group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main Patient Directory Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E2D7]">
          <div>
            <h3 className="text-xl font-bold text-[#1C1917] font-serif flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0D9488]" />
              Cohort Patient Directory
            </h3>
            <p className="text-xs text-[#78716C]">High-level medication compliance, risk alerts, and latest events</p>
          </div>

          {/* Priority Filter Buttons */}
          <div className="flex bg-[#F4F0E8] p-1 rounded-xl border border-[#E8E2D7]">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  priorityFilter === p
                    ? 'bg-[#0D9488] text-white shadow-xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Patients Table */}
        {patients.length === 0 ? (
          <EmptyState
            title="No Patients Match Filter"
            description="There are no patients in the cohort matching the selected priority filter."
          />
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] text-[#78716C] font-bold uppercase tracking-wider border-b border-[#E8E2D7]">
                  <tr>
                    <th className="p-4">Patient</th>
                    <th className="p-4">Recovery Context</th>
                    <th className="p-4">Medication Adherence</th>
                    <th className="p-4">Priority / Risk Flags</th>
                    <th className="p-4">Latest Relevant Event</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F0E8]">
                  {patients.map((p) => (
                    <tr
                      key={p._id}
                      onClick={() => navigate(`/nurse/patients/${p._id}`)}
                      className="hover:bg-[#FAF8F5]/80 transition-colors cursor-pointer group"
                    >
                      {/* Patient Name & Demographics */}
                      <td className="p-4 font-bold text-[#1C1917]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#0D9488]/10 text-[#0D9488] font-serif font-bold flex items-center justify-center text-xs">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-serif text-sm font-bold text-[#1C1917] group-hover:text-[#0D9488] transition-colors block">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-[#78716C] font-semibold">
                              ID: {p._id} • {p.gender}, {p.age}y
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Recovery Context */}
                      <td className="p-4 text-[#78716C] max-w-xs truncate">
                        <span className="font-semibold text-[#1C1917] block truncate">{p.recoveryContext}</span>
                      </td>

                      {/* EXACT REQUIRED MEDICATION OVERVIEW FORMAT */}
                      <td className="p-4 font-medium">
                        <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] text-[11px] space-y-0.5">
                          <p className="font-bold text-[#1C1917] text-[10px] uppercase tracking-wider border-b border-[#E8E2D7] pb-0.5 mb-1">
                            Medication adherence
                          </p>
                          <p className="text-[#059669]">Confirmed: <strong>{p.medicationOverview.confirmed}</strong></p>
                          <p className="text-[#D97706]">Not confirmed: <strong>{p.medicationOverview.notConfirmed}</strong></p>
                          <p className="text-[#E11D48]">Missed: <strong>{p.medicationOverview.missed}</strong></p>
                        </div>
                      </td>

                      {/* Priority / Flags */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <StatusBadge
                            status={priorityBadgeMap[p.priority]?.status}
                            label={priorityBadgeMap[p.priority]?.label}
                          />
                          {p.flags && p.flags.length > 0 && (
                            <p className="text-[10px] text-[#78716C] truncate max-w-[140px]">
                              {p.flags.join(', ')}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Latest Event */}
                      <td className="p-4 text-[#78716C] max-w-xs">
                        <span className="text-[11px] bg-[#F4F0E8] px-2 py-1 rounded-lg border border-[#E8E2D7] block truncate font-mono">
                          {p.latestEvent}
                        </span>
                      </td>

                      {/* Patient Detail Navigation Action */}
                      <td className="p-4 text-right">
                        <Link
                          to={`/nurse/patients/${p._id}`}
                          className="inline-flex items-center gap-1 text-[#0D9488] hover:text-[#0B7A70] font-bold text-xs"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
