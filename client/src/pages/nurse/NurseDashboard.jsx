import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import PrescriptionUploadModal from '../../components/nurse/PrescriptionUploadModal';
import {
  getNurseCohortOverview,
  getNursePatientList,
  getNurseAlerts,
  getPrescriptionList
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
  ArrowUpRight,
  UploadCloud,
  FileText,
  FileCheck,
  Eye,
  Calendar,
  Stethoscope
} from 'lucide-react';

export default function NurseDashboard() {
  const { t } = useTranslation();
  const { searchQuery, setSearchQuery } = useApp();
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'

  // Prescription Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedUploadPatientId, setSelectedUploadPatientId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNurseDashboardData = async (priority, query) => {
    try {
      setLoading(true);
      setError(null);

      const [oData, pList, aList, docList] = await Promise.all([
        getNurseCohortOverview(),
        getNursePatientList(priority, query),
        getNurseAlerts(),
        getPrescriptionList()
      ]);

      setOverview(oData);
      setPatients(pList);
      setAlerts(aList);
      setPrescriptions(docList || []);
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

  const handleUploadSuccess = (newDoc) => {
    // Refresh prescription list and patient directory
    getPrescriptionList().then((list) => {
      if (list) setPrescriptions(list);
    });
  };

  const openUploadForPatient = (e, pId) => {
    e.stopPropagation();
    setSelectedUploadPatientId(pId);
    setIsUploadModalOpen(true);
  };

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
      title={t('nurse.dashboardTitle', 'Clinical Nurse Dashboard')}
      subtitle={t('nurse.dashboardSubtitle', 'Patient census, non-adherence monitoring, and automated escalation briefs.')}
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge status="info" label={`${overview?.totalPatients || 0} ${t('nurse.totalPatients', 'Active Patients')}`} />
          
          {/* Main Action: Upload Prescription PDF */}
          <button
            type="button"
            onClick={() => {
              setSelectedUploadPatientId(null);
              setIsUploadModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{t('nurse.uploadPrescription', 'Upload Prescription PDF')}</span>
          </button>

          <Link
            to="/nurse/patients"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4F0E8] hover:bg-[#E8E2D7] text-[#1C1917] font-bold text-xs rounded-xl border border-[#E8E2D7] transition-all"
          >
            <span>{t('nurse.patientDirectory', 'Patient Directory')}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      }
    >
      {/* Cohort Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title={t('nurse.totalCohort', 'Total Cohort')} variant="stat">
          <div className="flex items-center justify-between mt-1">
            <span className="text-3xl font-extrabold text-[#1C1917] font-serif">{overview.totalPatients}</span>
            <div className="p-2 bg-[#0D9488]/10 text-[#0D9488] rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-[#78716C] mt-2 font-medium">Post-discharge recovery cohort</p>
        </Card>

        <Card title={t('nurse.activeEscalations', 'Active Escalations')} variant="stat">
          <div className="flex items-center justify-between mt-1">
            <span className="text-3xl font-extrabold text-[#E11D48] font-serif">{overview.activeEscalations}</span>
            <div className="p-2 bg-[#E11D48]/10 text-[#E11D48] rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-rose-700 mt-2 font-bold">Action queue alerts</p>
        </Card>

        <Card title={t('nurse.medAdherenceRate', 'Med Adherence Rate')} variant="stat">
          <div className="flex items-center justify-between mt-1">
            <span className="text-3xl font-extrabold text-[#059669] font-serif">{overview.medAdherenceRate}%</span>
            <div className="p-2 bg-[#059669]/10 text-[#059669] rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-[#78716C] mt-2 font-medium">Cohort dosage compliance</p>
        </Card>

        <Card title={t('nurse.prescriptionsRecords', 'Prescriptions & Records')} variant="stat">
          <div className="flex items-center justify-between mt-1">
            <span className="text-3xl font-extrabold text-[#0D9488] font-serif">{prescriptions.length || overview.totalPatients}</span>
            <div className="p-2 bg-[#0D9488]/10 text-[#0D9488] rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-[#78716C] mt-2 font-medium">{t('nurse.verifiedClinicalDocs', 'Verified clinical documents')}</p>
        </Card>
      </div>

      {/* Prescription PDF Upload Banner / Quick Action Section */}
      <Card
        title="Prescription & Clinical Document Records"
        subtitle="Upload and manage verified PDF prescriptions, discharge instructions, and orders"
        actions={
          <button
            type="button"
            onClick={() => {
              setSelectedUploadPatientId(null);
              setIsUploadModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New PDF</span>
          </button>
        }
      >
        {prescriptions.length === 0 ? (
          <div className="p-6 border-2 border-dashed border-[#E8E2D7] rounded-2xl text-center bg-[#FAF8F5]">
            <FileText className="w-8 h-8 text-[#78716C] mx-auto mb-2 opacity-60" />
            <h4 className="text-xs font-bold text-[#1C1917]">No Uploaded Prescriptions Yet</h4>
            <p className="text-[11px] text-[#78716C] mt-1 max-w-sm mx-auto">
              Upload patient prescriptions or clinical summaries in PDF format for instant ingestion and verification.
            </p>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0D9488] hover:bg-[#0B7A70] text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload First Prescription PDF</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {prescriptions.slice(0, 6).map((doc) => {
              const pObj = patients.find((p) => p._id === doc.patientId);
              return (
                <div
                  key={doc._id}
                  className="p-3.5 bg-white border border-[#E8E2D7] rounded-xl hover:border-[#0D9488]/50 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-[#1C1917] block truncate max-w-[170px]">
                            {doc.fileName || `${doc.documentType || 'Prescription'}.pdf`}
                          </span>
                          <span className="text-[10px] text-[#78716C]">
                            {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FAF8F5] text-[#0D9488] border border-[#E8E2D7] rounded-md uppercase">
                        {doc.documentType === 'discharge_summary' ? 'Discharge' : 'Prescription'}
                      </span>
                    </div>

                    <div className="pt-1 text-[11px] space-y-0.5 text-[#78716C]">
                      <p>
                        Patient: <strong className="text-[#1C1917]">{pObj?.name || doc.patientName || doc.patientId}</strong> ({doc.patientId})
                      </p>
                      <p className="truncate">
                        Doctor: <span className="text-[#1C1917]">{doc.doctorName || 'Dr. Attending'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F4F0E8] text-xs">
                    {doc.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#0D9488] hover:text-[#0B7A70] font-bold text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View PDF</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-[#78716C] italic">Embedded Document</span>
                    )}

                    <Link
                      to={`/nurse/patients/${doc.patientId}`}
                      className="inline-flex items-center gap-1 text-[#78716C] hover:text-[#1C1917] font-semibold text-[11px]"
                    >
                      <span>Patient Profile</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
            <p className="text-xs text-[#78716C]">High-level medication compliance, risk alerts, and prescription actions</p>
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
                    <th className="p-4 text-right">Actions</th>
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

                      {/* Patient Actions (Upload PDF & Inspect) */}
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            title="Upload Prescription PDF for this patient"
                            onClick={(e) => openUploadForPatient(e, p._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FAF8F5] hover:bg-[#0D9488] text-[#0D9488] hover:text-white font-bold text-[11px] rounded-lg border border-[#0D9488]/30 transition-all cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Upload PDF</span>
                          </button>

                          <Link
                            to={`/nurse/patients/${p._id}`}
                            className="inline-flex items-center gap-0.5 text-[#78716C] hover:text-[#0D9488] font-bold text-xs px-2 py-1 rounded-lg hover:bg-[#FAF8F5]"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Prescription PDF Upload Modal */}
      <PrescriptionUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
        patients={patients}
        preselectedPatientId={selectedUploadPatientId}
      />
    </PageContainer>
  );
}
