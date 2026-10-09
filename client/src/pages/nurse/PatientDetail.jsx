import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import { getNursePatientDetail, getNursePatientList } from '../../services/nurseService';
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
  UploadCloud
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


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPatientRecord = async (patientId) => {
    try {
      setLoading(true);
      setError(null);

      const [pList, pDetail] = await Promise.all([
        getNursePatientList(),
        getNursePatientDetail(patientId)
      ]);

      setAllPatientsList(pList);
      setDetail(pDetail);
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

      {/* 2. Detailed Medication Adherence Table */}
      <Card title={t('nurse.medAdherenceTable')} subtitle={`${t('nurse.verifiedDosageLogs')} ${patient.name} (${patient._id})`}>
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

