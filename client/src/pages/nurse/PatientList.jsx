import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { getNursePatientList } from '../../services/nurseService';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Search,
  ChevronRight,
  UserCheck,
  Pill,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Activity,
  Filter
} from 'lucide-react';

export default function PatientList() {
  const navigate = useNavigate();
  const { setActivePatientId } = useApp();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getNursePatientList(priorityFilter, searchQuery);
      setPatients(list);
    } catch (err) {
      console.error('Failed to load patient directory:', err);
      setError('Unable to load cohort patient directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [priorityFilter, searchQuery]);

  const handlePatientSelect = (pId) => {
    setActivePatientId(pId);
    navigate(`/nurse/patients/${pId}`);
  };

  const priorityBadgeMap = {
    HIGH: { status: 'missed', label: 'HIGH RISK' },
    MEDIUM: { status: 'pending', label: 'MEDIUM RISK' },
    LOW: { status: 'completed', label: 'LOW RISK' }
  };

  const highRiskCount = patients.filter((p) => p.priority === 'HIGH').length;
  const mediumRiskCount = patients.filter((p) => p.priority === 'MEDIUM').length;
  const lowRiskCount = patients.filter((p) => p.priority === 'LOW').length;

  if (loading) {
    return (
      <PageContainer title="Clinical Patient Directory">
        <LoadingState message="Fetching patient directory, active care plans, and risk metrics..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Clinical Patient Directory">
        <ErrorState
          title="Directory Unavailable"
          message={error}
          onRetry={loadPatients}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Clinical Patient Directory"
      subtitle="Comprehensive post-discharge cohort management, recovery progress, and clinical risk monitoring for nurses and physicians."
      badge={
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 text-xs font-bold">
          <Users className="w-3.5 h-3.5" />
          <span>{patients.length} Active Patients</span>
        </div>
      }
    >
      {/* 1. Cohort Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Total Cohort</span>
          <p className="text-2xl font-extrabold text-[#1C1917] font-serif">{patients.length}</p>
          <span className="text-[11px] text-[#0D9488] font-semibold">Active monitoring</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">High Risk</span>
          <p className="text-2xl font-extrabold text-rose-700 font-serif">{highRiskCount}</p>
          <span className="text-[11px] text-rose-600 font-semibold">Priority check-in</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Medium Risk</span>
          <p className="text-2xl font-extrabold text-amber-700 font-serif">{mediumRiskCount}</p>
          <span className="text-[11px] text-amber-600 font-semibold">Routine follow-up</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Stable (Low Risk)</span>
          <p className="text-2xl font-extrabold text-emerald-700 font-serif">{lowRiskCount}</p>
          <span className="text-[11px] text-emerald-600 font-semibold">On track recovery</span>
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
            <input
              type="text"
              placeholder="Search by patient name, ID, diagnosis, procedure..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#0D9488] shadow-2xs"
            />
          </div>

          {/* Priority Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'All Patients' },
              { id: 'HIGH', label: 'High Risk' },
              { id: 'MEDIUM', label: 'Medium Risk' },
              { id: 'LOW', label: 'Low Risk' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPriorityFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  priorityFilter === tab.id
                    ? 'bg-[#0D9488] text-white shadow-2xs'
                    : 'bg-[#FAF8F5] text-[#78716C] border border-[#E8E2D7] hover:border-[#0D9488]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 3. Patient Directory Table */}
      <Card title="Cohort Directory" subtitle={`Showing ${patients.length} registered post-discharge patients`}>
        {patients.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs text-[#78716C]">No patients found matching your search and filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#78716C] font-bold uppercase tracking-wider border-b border-[#E8E2D7]">
                <tr>
                  <th className="p-3.5">Patient Details</th>
                  <th className="p-3.5">Recovery Context</th>
                  <th className="p-3.5">Risk Level</th>
                  <th className="p-3.5">Medication Adherence</th>
                  <th className="p-3.5">Quiz Score</th>
                  <th className="p-3.5">Latest Telemetry</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {patients.map((p) => (
                  <tr key={p._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                    {/* Patient Name & Demographics */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold text-sm font-serif flex-shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <button
                            onClick={() => handlePatientSelect(p._id)}
                            className="font-extrabold text-[#1C1917] hover:text-[#0D9488] text-xs font-serif transition-colors text-left cursor-pointer flex items-center gap-1"
                          >
                            <span>{p.name}</span>
                            <ChevronRight className="w-3 h-3 text-[#0D9488]" />
                          </button>
                          <p className="text-[11px] text-[#78716C]">
                            ID: <strong className="font-mono">{p._id}</strong> • {p.gender}, {p.age} yrs
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Recovery Context */}
                    <td className="p-3.5 max-w-[200px]">
                      <p className="font-semibold text-[#1C1917] truncate">{p.recoveryContext}</p>
                      {p.flags && p.flags.length > 0 && (
                        <p className="text-[10px] text-[#D97706] truncate mt-0.5">
                          ⚠️ {p.flags[0]}
                        </p>
                      )}
                    </td>

                    {/* Priority Risk */}
                    <td className="p-3.5">
                      <StatusBadge
                        status={priorityBadgeMap[p.priority]?.status}
                        label={priorityBadgeMap[p.priority]?.label}
                      />
                    </td>

                    {/* Medication Adherence */}
                    <td className="p-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[#1C1917]">
                          <Pill className="w-3.5 h-3.5 text-[#CC785C]" />
                          <span>
                            {p.medicationOverview.confirmed} Confirmed
                            {p.medicationOverview.notConfirmed > 0 && (
                              <span className="text-[#D97706] font-normal text-[11px] ml-1">
                                ({p.medicationOverview.notConfirmed} pending)
                              </span>
                            )}
                          </span>
                        </div>
                        {p.medicationOverview.missed > 0 && (
                          <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 inline-block">
                            {p.medicationOverview.missed} Missed
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Quiz Score */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-[#0D9488]" />
                        <span className="font-extrabold text-[#1C1917]">{p.quizOverview.scoreDisplay}</span>
                        <span className="text-[10px] font-semibold text-[#78716C]">
                          ({p.quizOverview.percentage}%)
                        </span>
                      </div>
                    </td>

                    {/* Latest Telemetry */}
                    <td className="p-3.5 max-w-[180px]">
                      <p className="text-[11px] text-[#78716C] truncate font-medium">
                        {p.latestEvent}
                      </p>
                    </td>

                    {/* Action Buttons */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/nurse/ai-summary?patientId=${p._id}`)}
                          className="px-2.5 py-1 bg-white hover:bg-[#FAF8F5] border border-[#E8E2D7] rounded-lg text-xs font-bold text-[#78716C] hover:text-[#0D9488] shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                          title="View AI Summary"
                        >
                          <Sparkles className="w-3 h-3 text-[#CC785C]" />
                          <span className="hidden md:inline">AI Brief</span>
                        </button>

                        <button
                          onClick={() => handlePatientSelect(p._id)}
                          className="px-3 py-1 bg-[#0D9488] hover:bg-[#0f766e] text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Record</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
