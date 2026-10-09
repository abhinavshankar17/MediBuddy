import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { getNurseAIBrief, getNurseAIBriefsList, getNursePatientList } from '../../services/nurseService';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  AlertTriangle,
  Pill,
  HelpCircle,
  BrainCircuit,
  FileText,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle2,
  ListFilter,
  UserCheck,
  Search,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function AISummary() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setActivePatientId } = useApp();

  const activePatientId = searchParams.get('patientId') || 'P001';

  const [brief, setBrief] = useState(null);
  const [allBriefs, setAllBriefs] = useState([]);
  const [patientList, setPatientList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Accordion expanded evidence states
  const [expandedEvidence, setExpandedEvidence] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const loadBriefData = async (pId) => {
    try {
      setLoading(true);
      setError(null);

      const [singleBrief, briefsList, pList] = await Promise.all([
        getNurseAIBrief(pId),
        getNurseAIBriefsList(),
        getNursePatientList()
      ]);

      setBrief(singleBrief);
      setAllBriefs(briefsList);
      setPatientList(pList);
      setActivePatientId(pId);
    } catch (err) {
      console.error('Failed to load AI summaries:', err);
      setError('Unable to fetch AI clinical intelligence brief.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBriefData(activePatientId);
  }, [activePatientId]);

  const toggleEvidence = (eventId) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const handleSelectPatient = (pId) => {
    setSearchParams({ patientId: pId });
  };

  if (loading) {
    return (
      <PageContainer title="AI Patient Summary & Clinical Intelligence">
        <LoadingState message="Loading AI patient summary, evidence groundings, and nurse question items..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="AI Patient Summary & Clinical Intelligence">
        <ErrorState
          title="AI Summary Unavailable"
          message={error}
          onRetry={() => loadBriefData(activePatientId)}
        />
      </PageContainer>
    );
  }

  const priorityBadgeMap = {
    HIGH: { status: 'missed', label: 'HIGH RISK' },
    MEDIUM: { status: 'pending', label: 'MEDIUM RISK' },
    LOW: { status: 'completed', label: 'LOW RISK' }
  };

  const filteredCohortBriefs = allBriefs.filter((b) => {
    const matchesPriority = priorityFilter === 'ALL' || b.priority === priorityFilter;
    const matchesQuery =
      !searchQuery ||
      b.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.keyObservation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesQuery;
  });

  return (
    <PageContainer
      title={t('nurse.aiSummaryTitle', 'AI Patient Summary & Clinical Intelligence')}
      subtitle={t('nurse.dashboardSubtitle', 'Structured patient briefings synthesized from check-ins, quiz results, and medication adherence logs.')}
      badge={
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('nurse.aiBriefs', 'Synced Backend Briefs')}</span>
        </div>
      }
      actions={
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#78716C] hidden sm:inline">{t('roles.patient', 'Active Patient')}:</span>
          <select
            value={activePatientId}
            onChange={(e) => handleSelectPatient(e.target.value)}
            className="bg-white border border-[#E8E2D7] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1C1917] focus:outline-none focus:border-[#0D9488] shadow-2xs cursor-pointer"
          >
            {patientList.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p._id})
              </option>
            ))}
          </select>
        </div>
      }
    >
      {/* 1. Mandatory AI Disclaimer Banner */}
      <div className="p-3.5 bg-[#FFFBEB] border border-[#FCD34D] rounded-2xl flex items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#F59E0B]/20 text-[#D97706] flex-shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-extrabold text-[#92400E]">{t('common.aiGeneratedWarning', 'AI-generated — verify before acting')}.</p>
            <p className="text-[11px] text-[#B45309]">
              Summaries are extracted automatically from backend telemetry. Always validate claims using the supporting evidence drawer.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FCD34D]/40 text-[#78350F] px-2.5 py-1 rounded-lg border border-[#F59E0B]/30 hidden md:inline">
          {t('common.aiGeneratedShort', 'AI-Generated')}
        </span>
      </div>

      {brief && (
        <div className="space-y-6">
          {/* 2. Primary AI Patient Summary Card */}
          <Card className="bg-gradient-to-br from-white via-[#FAF8F5] to-[#F4F0E8]/40 border-[#E8E2D7] shadow-sm">
            <div className="space-y-6">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D7]">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#0D9488] text-white rounded-2xl shadow-xs font-serif font-bold text-lg">
                    {brief.patientName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-extrabold text-[#1C1917] font-serif">AI Patient Summary</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8E2D7]/60 text-[#78716C]">
                        {brief.patientName} ({brief.patientId})
                      </span>
                    </div>
                    <p className="text-xs text-[#78716C] mt-0.5">{brief.recoveryContext}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={priorityBadgeMap[brief.priority]?.status}
                    label={priorityBadgeMap[brief.priority]?.label}
                  />
                  <button
                    onClick={() => navigate(`/nurse/patients/${brief.patientId}`)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E8E2D7] rounded-xl text-xs font-bold text-[#0D9488] hover:bg-[#FAF8F5] transition-all shadow-2xs cursor-pointer"
                  >
                    <span>Full Patient Record</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Grid Metrics & Key Observation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Metric 1: Medication Adherence */}
                <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Medication Adherence</span>
                    <Pill className="w-4 h-4 text-[#CC785C]" />
                  </div>
                  <p className="text-2xl font-extrabold text-[#1C1917] font-serif">{brief.medicationAdherenceDisplay}</p>
                  <p className="text-[11px] font-semibold text-[#059669]">Confirmed against scheduled dosage</p>
                </div>

                {/* Metric 2: Clinical Care Status */}
                <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Care Status</span>
                    <Activity className="w-4 h-4 text-[#0D9488]" />
                  </div>
                  <p className="text-2xl font-extrabold text-[#1C1917] font-serif">Active</p>
                  <p className="text-[11px] font-semibold text-[#78716C]">Grounded recovery telemetry</p>
                </div>

                {/* Metric 3: Knowledge Gaps */}
                <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Knowledge Gaps</span>
                    <BrainCircuit className="w-4 h-4 text-[#D97706]" />
                  </div>
                  {brief.knowledgeGaps.length === 0 ? (
                    <p className="text-xs font-bold text-[#059669] pt-1">None identified</p>
                  ) : (
                    <ul className="space-y-1 pt-0.5">
                      {brief.knowledgeGaps.map((gap, idx) => (
                        <li key={idx} className="text-xs font-bold text-[#B45309] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                          <span>{gap}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Key Observation Section */}
              <div className="p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-[#0D9488] font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span className="uppercase tracking-wider">Key Clinical Observation</span>
                </div>
                <p className="text-sm font-medium text-[#1C1917] leading-relaxed">
                  "{brief.keyObservation}"
                </p>
              </div>
            </div>
          </Card>

          {/* 3. Questions for Nurse Section */}
          <Card
            title="Questions for Nurse"
            subtitle="Backend-provided verification topics to confirm during patient check-in."
          >
            {brief.questionsForNurse.length === 0 ? (
              <p className="text-xs text-[#78716C]">No specific verification questions flagged for this patient.</p>
            ) : (
              <div className="space-y-3">
                {brief.questionsForNurse.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] flex items-start gap-3 shadow-2xs"
                  >
                    <div className="p-2 bg-[#0D9488]/15 text-[#0D9488] rounded-lg mt-0.5 flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#78716C]">
                        Verification Item #{idx + 1}
                      </span>
                      <p className="text-xs font-bold text-[#1C1917] leading-normal">{q}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 4. Expandable Evidence Grounding Section */}
          <Card
            title="Supporting Evidence & Grounding"
            subtitle="Inspect raw event telemetry and source discharge records supporting every AI claim."
          >
            {brief.evidenceEvents.length === 0 ? (
              <p className="text-xs text-[#78716C]">No supporting evidence event IDs linked to this brief.</p>
            ) : (
              <div className="space-y-3">
                {brief.evidenceEvents.map((evt) => {
                  const isExpanded = !!expandedEvidence[evt._id];

                  return (
                    <div
                      key={evt._id}
                      className="border border-[#E8E2D7] rounded-xl bg-[#FAF8F5] overflow-hidden transition-all shadow-2xs"
                    >
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleEvidence(evt._id)}
                        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#F4F0E8]/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded-lg bg-white border border-[#E8E2D7] text-[#0D9488]">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs font-mono text-[#1C1917]">{evt._id}</span>
                              <StatusBadge status="info" label={evt.category} />
                              <span className="text-[11px] font-semibold text-[#78716C]">{evt.type}</span>
                            </div>
                            <p className="text-[11px] text-[#78716C] truncate mt-0.5">
                              Actor: {evt.actor} • Timestamp: {evt.timestamp}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-bold text-[#0D9488]">
                            {isExpanded ? 'Collapse' : 'Inspect'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[#0D9488]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#0D9488]" />
                          )}
                        </div>
                      </button>

                      {/* Expandable Accordion Body */}
                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-[#E8E2D7] space-y-3 text-xs animate-fade-in">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E2D7]">
                            <div>
                              <span className="text-[#78716C] font-semibold">Evidence Category:</span>
                              <p className="font-bold text-[#1C1917]">{evt.category}</p>
                            </div>
                            <div>
                              <span className="text-[#78716C] font-semibold">Logged Timestamp:</span>
                              <p className="font-bold text-[#1C1917]">{evt.timestamp}</p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-[#78716C]">Raw Grounding Event Payload:</span>
                            <pre className="p-3 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-[11px] font-mono text-[#1C1917] overflow-x-auto">
                              {JSON.stringify(evt.payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 5. Cohort AI Summaries Directory */}
          <Card
            title="Cohort AI Summaries Directory"
            subtitle="Browse AI patient summaries across all active post-discharge patients."
            actions={
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#78716C]" />
                  <input
                    type="text"
                    placeholder="Search summaries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-white border border-[#E8E2D7] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#0D9488] shadow-2xs"
                  />
                </div>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-white border border-[#E8E2D7] rounded-xl px-2.5 py-1 text-xs font-bold text-[#1C1917] shadow-2xs cursor-pointer"
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="HIGH">High Risk Only</option>
                  <option value="MEDIUM">Medium Risk Only</option>
                  <option value="LOW">Low Risk Only</option>
                </select>
              </div>
            }
          >
            <div className="space-y-3">
              {filteredCohortBriefs.map((b) => (
                <div
                  key={b.patientId}
                  onClick={() => handleSelectPatient(b.patientId)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    b.patientId === activePatientId
                      ? 'bg-[#FAF8F5] border-[#0D9488] ring-2 ring-[#0D9488]/20'
                      : 'bg-white border-[#E8E2D7] hover:border-[#CC785C]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-xs text-[#1C1917] font-serif">{b.patientName}</span>
                      <span className="text-xs font-mono text-[#78716C]">({b.patientId})</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#78716C]">Meds: {b.medicationAdherenceDisplay}</span>
                      <StatusBadge
                        status={priorityBadgeMap[b.priority]?.status}
                        label={priorityBadgeMap[b.priority]?.label}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-[#78716C] line-clamp-2">
                    {b.keyObservation}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
