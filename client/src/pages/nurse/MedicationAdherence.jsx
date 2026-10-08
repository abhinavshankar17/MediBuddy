import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { getMedicationAdherenceCohort } from '../../services/nurseService';
import { useApp } from '../../context/AppContext';
import {
  Pill,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  ChevronRight,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';

export default function MedicationAdherence() {
  const navigate = useNavigate();
  const { setActivePatientId } = useApp();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'FULL' | 'PENDING' | 'MISSED'

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMedicationAdherenceCohort();
      setData(res);
    } catch (err) {
      console.error('Failed to load medication adherence cohort:', err);
      setError('Unable to load cohort medication adherence metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePatientSelect = (pId) => {
    setActivePatientId(pId);
    navigate(`/nurse/patients/${pId}`);
  };

  if (loading) {
    return (
      <PageContainer title="Medication Adherence Monitor">
        <LoadingState message="Aggregating cohort medication adherence logs & verification telemetry..." />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer title="Medication Adherence Monitor">
        <ErrorState
          title="Adherence Data Unavailable"
          message={error}
          onRetry={loadData}
        />
      </PageContainer>
    );
  }

  const { summary, patientRows } = data;

  const filteredRows = patientRows.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.medications.some((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesFilter = true;
    if (filterType === 'FULL') matchesFilter = p.adherenceRate === 100;
    else if (filterType === 'PENDING') matchesFilter = p.notConfirmedCount > 0;
    else if (filterType === 'MISSED') matchesFilter = p.missedCount > 0;

    return matchesSearch && matchesFilter;
  });

  return (
    <PageContainer
      title="Medication Adherence Monitor"
      subtitle="Cohort-wide medication compliance analytics, dosage verification logs, and patient response tracking for clinicians."
      badge={
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CC785C]/10 text-[#CC785C] border border-[#CC785C]/20 text-xs font-bold">
          <Pill className="w-3.5 h-3.5" />
          <span>{summary.overallComplianceRate}% Adherence Rate</span>
        </div>
      }
    >
      {/* 1. Stat Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Cohort Compliance</span>
            <Activity className="w-4 h-4 text-[#0D9488]" />
          </div>
          <p className="text-3xl font-extrabold text-[#0D9488] font-serif">{summary.overallComplianceRate}%</p>
          <span className="text-[11px] text-[#059669] font-semibold">{summary.totalConfirmed} of {summary.totalDosages} doses taken</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Confirmed Doses</span>
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          </div>
          <p className="text-3xl font-extrabold text-[#1C1917] font-serif">{summary.totalConfirmed}</p>
          <span className="text-[11px] text-[#059669] font-semibold">Verified patient responses</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Not Confirmed</span>
            <Clock className="w-4 h-4 text-[#D97706]" />
          </div>
          <p className="text-3xl font-extrabold text-[#D97706] font-serif">{summary.totalNotConfirmed}</p>
          <span className="text-[11px] text-[#D97706] font-semibold">Awaiting patient check-in</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Missed Doses</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-extrabold text-rose-700 font-serif">{summary.totalMissed}</p>
          <span className="text-[11px] text-rose-600 font-semibold">Requires clinical outreach</span>
        </div>
      </div>

      {/* 2. Semantic Guidance Callout */}
      <div className="p-3.5 bg-[#FAF8F5] border border-[#E8E2D7] rounded-2xl flex items-start gap-3 shadow-2xs text-xs text-[#78716C]">
        <Info className="w-4 h-4 text-[#0D9488] flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-[#1C1917]">Clinical Semantic Rule:</strong> Reminders without a patient response are classified as <code className="bg-white px-1.5 py-0.5 rounded border border-[#E8E2D7] font-semibold text-[#D97706]">Not confirmed</code>, not automatically marked as "Not taken". Only explicit patient check-ins or overdue escalation flags are marked as missed.
        </p>
      </div>

      {/* 3. Toolbar: Search & Compliance Filter */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
            <input
              type="text"
              placeholder="Search by patient name, medication..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#0D9488] shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'All Patients' },
              { id: 'FULL', label: '100% Adherent' },
              { id: 'PENDING', label: 'Pending Confirmation' },
              { id: 'MISSED', label: 'Missed Doses' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterType(btn.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterType === btn.id
                    ? 'bg-[#0D9488] text-white shadow-2xs'
                    : 'bg-[#FAF8F5] text-[#78716C] border border-[#E8E2D7] hover:border-[#0D9488]'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 4. Patient Adherence Detailed Cards List */}
      <div className="space-y-4">
        {filteredRows.map((p) => {
          const isHighRisk = p.missedCount > 0;

          return (
            <Card
              key={p.patientId}
              className={`transition-all ${
                isHighRisk
                  ? 'border-rose-200 bg-gradient-to-r from-white via-[#FAF8F5] to-rose-50/20'
                  : 'border-[#E8E2D7] bg-white'
              }`}
            >
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F4F0E8]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold text-base font-serif flex-shrink-0">
                      {p.patientName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handlePatientSelect(p.patientId)}
                          className="font-extrabold text-base text-[#1C1917] font-serif hover:text-[#0D9488] transition-colors text-left cursor-pointer flex items-center gap-1"
                        >
                          <span>{p.patientName}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#0D9488]" />
                        </button>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#E8E2D7]/60 text-[#78716C]">
                          {p.patientId}
                        </span>
                        <span className="text-xs text-[#78716C]">
                          ({p.patientGender}, {p.patientAge} yrs)
                        </span>
                      </div>
                      <p className="text-xs text-[#78716C] mt-0.5">{p.recoveryContext}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-[#1C1917] font-serif block">
                        {p.adherenceRate}% Adherence
                      </span>
                      <span className="text-[11px] text-[#78716C]">
                        {p.confirmedCount} / {p.totalCount} Confirmed
                      </span>
                    </div>

                    <button
                      onClick={() => handlePatientSelect(p.patientId)}
                      className="px-3 py-1.5 bg-white hover:bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-xs font-bold text-[#0D9488] shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Inspect Log</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Medication Regimen Breakdown Pills */}
                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">
                    Today's Prescribed Regimen
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {p.medications.map((m) => (
                      <div
                        key={m._id}
                        className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Pill className="w-4 h-4 text-[#CC785C] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#1C1917] truncate">{m.name} {m.dose}</p>
                            <p className="text-[11px] text-[#78716C] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#0D9488]" />
                              <span>{m.scheduledAt}</span>
                            </p>
                          </div>
                        </div>

                        <StatusBadge status={m.badgeType} label={m.statusDisplay} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
