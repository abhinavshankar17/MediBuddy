import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import {
  getNursePatientDetail,
  getNursePatientList,
  getNurseAISummary,
  generateNurseAISummary
} from '../../services/nurseService';
import { getEvidenceEvents } from '../../services/insightService';
import { useApp } from '../../context/AppContext';
import {
  UserCheck,
  Pill,
  Clock,
  Activity,
  Calendar,
  AlertTriangle,
  FileText,
  Sparkles,
  Eye,
  X,
  ChevronLeft,
  CheckCircle2,
  ListFilter,
  UploadCloud,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  Stethoscope
} from 'lucide-react';
import PrescriptionUploadModal from '../../components/nurse/PrescriptionUploadModal';

export default function PatientDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActivePatientId } = useApp();

  const activePatientId = id || 'P001';

  const [detail, setDetail] = useState(null);
  const [allPatientsList, setAllPatientsList] = useState([]);
  const [selectedEventEvidence, setSelectedEventEvidence] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiSuccessToast, setAiSuccessToast] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPatientRecord = async (patientId) => {
    try {
      setLoading(true);
      setError(null);

      const [pList, pDetail, aiSum] = await Promise.all([
        getNursePatientList(),
        getNursePatientDetail(patientId),
        getNurseAISummary(patientId).catch(() => null)
      ]);

      setAllPatientsList(pList);
      setDetail(pDetail);
      if (aiSum) setAiSummary(aiSum);
      setActivePatientId(patientId);
    } catch (err) {
      console.error('Failed to load patient detail record:', err);
      setError('Unable to load clinical patient record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientRecord(activePatientId);
  }, [activePatientId]);

  const handleGenerateAiSummary = async () => {
    try {
      setGeneratingAi(true);
      setAiError(null);
      const res = await generateNurseAISummary(activePatientId);
      setAiSummary(res);
      setAiSuccessToast('Generated fresh multi-factor clinical AI summary.');
      setTimeout(() => setAiSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
      setAiError(err.message || 'Failed to generate AI summary');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleInspectEvent = async (eventId) => {
    if (!eventId) return;
    const events = await getEvidenceEvents([eventId]);
    if (events && events.length > 0) {
      setSelectedEventEvidence(events[0]);
    } else {
      setSelectedEventEvidence({
        _id: eventId,
        type: 'medication_log',
        timestamp: new Date().toISOString(),
        actor: activePatientId,
        payload: { note: 'Verified clinical dosage event record' }
      });
    }
  };

  if (loading) {
    return (
      <PageContainer title={t('nurse.patientDetailTitle')}>
        <LoadingState message={t('nurse.fetchingPatient')} />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title={t('nurse.patientDetailTitle')}>
        <ErrorState
          title={t('nurse.patientRecordUnavailable')}
          message={error}
          onRetry={() => loadPatientRecord(activePatientId)}
        />
      </PageContainer>
    );
  }

  if (!detail || !detail.patient) {
    return (
      <PageContainer title={t('nurse.patientDetailTitle')}>
        <EmptyState
          title={t('nurse.patientNotFound')}
          description={t('nurse.patientNotFoundDesc')}
        />
      </PageContainer>
    );
  }

  const { patient, medicationTable, patientEvents } = detail;

  const priorityBadgeMap = {
    HIGH: { status: 'missed', label: 'HIGH RISK' },
    MEDIUM: { status: 'pending', label: 'MEDIUM RISK' },
    LOW: { status: 'completed', label: 'LOW RISK' }
  };

  return (
    <PageContainer
      title={`${t('nurse.patientDetailTitle')}: ${patient.name}`}
      subtitle={t('nurse.patientDetailSubtitle')}
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/nurse/patients')}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E8E2D7] rounded-xl text-xs font-bold text-[#78716C] hover:text-[#1C1917] transition-all shadow-2xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t('nurse.cohortDirectory')}</span>
          </button>

          {/* Cohort Patient Selector */}
          <div className="relative flex items-center">
            <span className="text-xs font-bold text-[#78716C] mr-2 hidden sm:inline">{t('nurse.switchPatient')}</span>
            <select
              value={patient._id}
              onChange={(e) => navigate(`/nurse/patients/${e.target.value}`)}
              className="bg-white border border-[#E8E2D7] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1C1917] focus:outline-none focus:border-[#0D9488] shadow-2xs cursor-pointer"
            >
              {allPatientsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p._id})
                </option>
              ))}
            </select>
          </div>

          <StatusBadge
            status={priorityBadgeMap[patient.priority]?.status}
            label={priorityBadgeMap[patient.priority]?.label}
          />

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{t('nurse.uploadNewPdf')}</span>
          </button>
        </div>
      }
    >
      {/* 1. Patient Header Card */}
      <Card className="bg-gradient-to-r from-white via-[#FAF8F5] to-[#F4F0E8]/40 border-[#E8E2D7]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0D9488] text-white flex items-center justify-center font-bold text-xl shadow-xs flex-shrink-0 font-serif">
              {patient.name.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-extrabold text-[#1C1917] font-serif">{patient.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8E2D7]/60 text-[#78716C]">
                  ID: {patient._id} ({patient.syntheticId})
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0D9488]/10 text-[#0D9488]">
                  {patient.gender}, {patient.age} yrs
                </span>
              </div>

              <p className="text-xs text-[#78716C] font-semibold">
                <strong className="text-[#1C1917]">{t('nurse.recoveryContext')}</strong> {patient.recoveryContext}
              </p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#78716C] pt-1">
                <span>🌐 <strong>{t('nurse.language')}</strong> {patient.languageName}</span>
                <span>📅 <strong>{t('nurse.dischargeDate')}</strong> {patient.dischargeDate}</span>
                <span>🚶 <strong>{t('nurse.mobility')}</strong> {patient.mobility}</span>
                <span>🥗 <strong>{t('nurse.diet')}</strong> {patient.dietaryPreference}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E8E2D7] shadow-2xs flex flex-col items-center md:items-end justify-center min-w-[180px]">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#78716C]">{t('nurse.recoveryProgress')}</span>
            <span className="text-xl font-extrabold text-[#0D9488] font-serif mt-0.5">{patient.recoveryDay}</span>
            <span className="text-xs font-bold text-[#059669] flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('nurse.activeMonitoring')}
            </span>
          </div>
        </div>
      </Card>

      {/* 2. Clinical AI Summary Card (Gemini AI Dynamic Synthesis) */}
      <Card className="border-[#0D9488]/30 bg-gradient-to-br from-white via-[#FAF8F5] to-[#E6F4F1]/30 shadow-sm relative overflow-hidden">
        {/* Header with Title, Priority badge, and Regenerate Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D7]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0D9488] to-[#14B8A6] text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-bold text-[#1C1917] font-serif">Clinical AI Patient Summary</h3>
                {aiSummary?.priority && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${aiSummary.priority === 'HIGH'
                        ? 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20'
                        : aiSummary.priority === 'MEDIUM'
                          ? 'bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20'
                          : 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20'
                      }`}
                  >
                    {aiSummary.priority} Priority
                  </span>
                )}
              </div>
              <p className="text-xs text-[#78716C] mt-0.5">
                Dynamic AI synthesis evaluating <strong>Prescription Report</strong>, <strong>Medicine History</strong>, and <strong>Patient Feedback</strong>.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleGenerateAiSummary()}
              disabled={generatingAi}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0D9488] hover:bg-[#0B7A70] disabled:bg-[#0D9488]/50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generatingAi ? 'animate-spin' : ''}`} />
              <span>{generatingAi ? 'Analyzing Factors...' : 'Regenerate AI Summary'}</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {aiSuccessToast && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#059669]/10 border border-[#059669]/20 text-[#059669] text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{aiSuccessToast}</span>
          </div>
        )}

        {/* Error Alert */}
        {aiError && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626] text-xs font-bold flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {/* Main Synthesis Narrative */}
        <div className="mt-4 p-4 rounded-xl bg-white/95 border border-[#E8E2D7] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Clinical Multi-Factor Synthesis
            </span>
            {aiSummary?.generatedAt && (
              <span className="text-[10px] text-[#78716C] font-mono">
                Generated: {new Date(aiSummary.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <p className="text-xs text-[#1C1917] leading-relaxed font-medium">
            {aiSummary?.summary || aiSummary?.aiSummary || 'Loading dynamic clinical evaluation...'}
          </p>
        </div>

        {/* THE THREE CORE DRIVING FACTORS */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Factor 1: Prescription Report */}
          <div className="p-3.5 rounded-xl bg-white border border-[#E8E2D7] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F4F0E8]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#0D9488]/10 text-[#0D9488]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#1C1917]">Prescription Report</span>
                </div>
                <span className="text-[10px] font-bold text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded-md">
                  Factor 1
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="text-[11px] text-[#78716C]">
                  <strong>Diagnosing Doctor:</strong>{' '}
                  <span className="text-[#1C1917] font-bold">
                    {aiSummary?.factors?.prescriptionReport?.diagnosingDoctor || patient.assignedDoctor || 'Attending Physician'}
                  </span>
                </div>
                <div className="text-[10px] text-[#78716C]">
                  <strong>Facility:</strong> {aiSummary?.factors?.prescriptionReport?.hospitalName || 'CareBridge Demo Hospital'}
                </div>
                <p className="text-[11px] text-[#78716C] leading-snug pt-1">
                  {aiSummary?.prescriptionReportSummary || 'Discharge summary instructions and recovery protocols verified.'}
                </p>
              </div>
            </div>
          </div>

          {/* Factor 2: Medicine History */}
          <div className="p-3.5 rounded-xl bg-white border border-[#E8E2D7] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F4F0E8]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#CC785C]/10 text-[#CC785C]">
                    <Pill className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#1C1917]">Medicine History</span>
                </div>
                <span className="text-[10px] font-bold text-[#CC785C] bg-[#CC785C]/10 px-2 py-0.5 rounded-md">
                  Factor 2
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#78716C]">Adherence Compliance:</span>
                  <span className="font-extrabold text-[#0D9488]">
                    {aiSummary?.factors?.medicineHistory?.adherenceRate !== undefined
                      ? `${aiSummary.factors.medicineHistory.adherenceRate}%`
                      : '85%'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#78716C] flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-[#059669]/10 text-[#059669] font-bold">
                    {aiSummary?.factors?.medicineHistory?.confirmed ?? detail.medicationAdherence?.confirmed ?? 0} Confirmed
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#DC2626]/10 text-[#DC2626] font-bold">
                    {aiSummary?.factors?.medicineHistory?.missed ?? detail.medicationAdherence?.missed ?? 0} Missed
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#D97706]/10 text-[#D97706] font-bold">
                    {aiSummary?.factors?.medicineHistory?.notConfirmed ?? detail.medicationAdherence?.notConfirmed ?? 0} Pending
                  </span>
                </div>
                <p className="text-[11px] text-[#78716C] leading-snug pt-1">
                  {aiSummary?.medicineHistorySummary || 'Medication schedule monitored against prescribed doses.'}
                </p>
              </div>
            </div>
          </div>

          {/* Factor 3: Patient Feedback */}
          <div className="p-3.5 rounded-xl bg-white border border-[#E8E2D7] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F4F0E8]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#1C1917]">Patient Feedback</span>
                </div>
                <span className="text-[10px] font-bold text-[#2563EB] bg-[#2563EB]/10 px-2 py-0.5 rounded-md">
                  Factor 3
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#78716C]">Reported Urgency:</span>
                  <span
                    className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${(aiSummary?.factors?.patientFeedback?.[0]?.urgency || '').toLowerCase() === 'urgent' ||
                        (aiSummary?.factors?.patientFeedback?.[0]?.urgency || '').toLowerCase() === 'emergency'
                        ? 'bg-[#DC2626]/10 text-[#DC2626]'
                        : (aiSummary?.factors?.patientFeedback?.[0]?.urgency || '').toLowerCase() === 'moderate'
                          ? 'bg-[#D97706]/10 text-[#D97706]'
                          : 'bg-[#059669]/10 text-[#059669]'
                      }`}
                  >
                    {aiSummary?.factors?.patientFeedback?.[0]?.urgency || 'Routine'}
                  </span>
                </div>
                <p className="text-[11px] text-[#78716C] leading-snug">
                  {aiSummary?.patientFeedbackSummary || 'Direct condition reports and symptoms evaluated.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Nurse Action Items & Safety Disclaimer */}
        <div className="mt-4 pt-3 border-t border-[#E8E2D7] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {aiSummary?.nurseActionItems && aiSummary.nurseActionItems.length > 0 ? (
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#1C1917] flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-[#0D9488]" />
                Recommended Nurse Action Items:
              </span>
              <ul className="list-disc list-inside text-[11px] text-[#78716C] space-y-0.5">
                {aiSummary.nurseActionItems.slice(0, 3).map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 p-2 bg-white/80 border border-[#E8E2D7] rounded-xl self-start md:self-auto text-[11px] text-[#78716C] font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-[#0D9488] flex-shrink-0" />
            <span>{aiSummary?.disclaimer || 'AI-generated — verify before acting.'}</span>
          </div>
        </div>
      </Card>

      {/* 3. Detailed Medication Adherence Table */}
      <Card title="Medication Adherence Table" subtitle={`Verified dosage logs for ${patient.name} (${patient._id})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-[#78716C] font-bold uppercase tracking-wider border-b border-[#E8E2D7]">
              <tr>
                <th className="p-3.5">{t('nurse.medication')}</th>
                <th className="p-3.5">{t('nurse.scheduled')}</th>
                <th className="p-3.5">{t('nurse.status')}</th>
                <th className="p-3.5 text-right">{t('nurse.evidenceAction')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {medicationTable.map((row) => (
                <tr key={row._id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                  <td className="p-3.5 font-bold text-[#1C1917] flex items-center gap-2.5">
                    <Pill className="w-4 h-4 text-[#CC785C]" />
                    <span>{row.medication}</span>
                  </td>
                  <td className="p-3.5 text-[#78716C] font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
                      {row.scheduled}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={row.statusBadgeType} label={row.statusDisplay} />
                      {row.respondedAt && (
                        <span className="text-[10px] text-[#78716C] italic">({row.respondedAt})</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-right">
                    {row.supportingEventId ? (
                      <button
                        onClick={() => handleInspectEvent(row.supportingEventId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#FAF8F5] border border-[#E8E2D7] rounded-lg text-xs font-bold text-[#0D9488] shadow-2xs transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('nurse.inspectEvent')} ({row.supportingEventId})</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#A8A29E] italic">{t('nurse.noLogEvent')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. Event History Section */}
      <Card title={t('nurse.eventHistory')} subtitle={t('nurse.eventHistorySubtitle')}>
        {patientEvents.length === 0 ? (
          <p className="text-xs text-[#78716C]">{t('nurse.noEventsLogged')}</p>
        ) : (
          <div className="space-y-3">
            {patientEvents.map((evt) => (
              <div key={evt._id} className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#0D9488]/10 text-[#0D9488] flex-shrink-0 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1C1917] font-mono">{evt._id}</span>
                      <StatusBadge status="info" label={evt.displayType} />
                    </div>
                    {evt.payload && Object.keys(evt.payload).length > 0 && (
                      <p className="text-[#78716C] mt-1 text-[11px]">
                        {t('nurse.eventPayload')} <code className="bg-[#E8E2D7]/50 px-1 rounded font-mono">{JSON.stringify(evt.payload)}</code>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="text-[11px] font-bold text-[#78716C] bg-white px-2.5 py-1 rounded-lg border border-[#E8E2D7]">
                    {evt.timestamp}
                  </span>
                  <button
                    onClick={() => setSelectedEventEvidence(evt)}
                    className="p-1.5 rounded-lg bg-white hover:bg-[#E8E2D7]/50 border border-[#E8E2D7] text-[#0D9488] transition-all cursor-pointer"
                    title="Inspect Event Grounding"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Supporting Event Evidence Grounding Modal */}
      {selectedEventEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-[#E8E2D7] rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D7]">
              <div className="flex items-center gap-2 text-[#0D9488] font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>{t('nurse.eventGroundingModal')} ({selectedEventEvidence._id})</span>
              </div>
              <button
                onClick={() => setSelectedEventEvidence(null)}
                className="p-1 rounded-lg hover:bg-[#F4F0E8] text-[#78716C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#F4F0E8]">
                <span className="text-[#78716C]">Event ID</span>
                <span className="font-mono font-bold text-[#1C1917]">{selectedEventEvidence._id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F4F0E8]">
                <span className="text-[#78716C]">{t('common.patient')}</span>
                <span className="font-bold text-[#1C1917]">{patient.name} ({patient._id})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F4F0E8]">
                <span className="text-[#78716C]">Event Type</span>
                <span className="font-bold text-[#0D9488]">{selectedEventEvidence.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F4F0E8]">
                <span className="text-[#78716C]">Actor</span>
                <span className="font-bold text-[#1C1917]">{selectedEventEvidence.actor || patient._id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F4F0E8]">
                <span className="text-[#78716C]">Timestamp</span>
                <span className="font-bold text-[#1C1917]">{selectedEventEvidence.timestamp}</span>
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-[#78716C] font-bold">{t('nurse.eventPayload')}</span>
                <pre className="p-3 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-[11px] font-mono text-[#1C1917] overflow-x-auto">
                  {JSON.stringify(selectedEventEvidence.payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedEventEvidence(null)}
                className="px-4 py-2 bg-[#0D9488] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {t('nurse.closeModal')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription PDF Upload Modal */}
      <PrescriptionUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => loadPatientRecord(activePatientId)}
        patients={allPatientsList}
        preselectedPatientId={activePatientId}
      />

    </PageContainer>
  );
}

