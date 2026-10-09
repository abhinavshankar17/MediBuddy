import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import {
  getDailyReport,
  getCaregiverPatients,
  sendEncouragement
} from '../../services/caregiverService';
import { useApp } from '../../context/AppContext';
import { useRealtimeSync } from '../../utils/realtimeSync';
import {
  Heart,
  Pill,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  ShieldCheck,
  Activity,
  Smile,
  ChevronRight,
  User,
  Coffee,
  Moon,
  Info,
  PhoneCall,
  RefreshCw
} from 'lucide-react';

export default function CaregiverDashboard() {
  const { t } = useTranslation();
  const { activePatientId, setActivePatientId, currentUser } = useApp();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [linkedPatients, setLinkedPatients] = useState([]);

  // Encouragement form state
  const [showEncouragementModal, setShowEncouragementModal] = useState(false);
  const [encouragementMsg, setEncouragementMsg] = useState('');
  const [selectedTag, setSelectedTag] = useState('love');
  const [sendingEncouragement, setSendingEncouragement] = useState(false);
  const [encouragementSuccess, setEncouragementSuccess] = useState(false);

  const caregiverId = currentUser?.role === 'caregiver' ? currentUser._id : 'U101';
  const patientId = activePatientId || 'P001';

  const loadDashboard = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);

      const [patientsData, reportData] = await Promise.all([
        getCaregiverPatients(caregiverId),
        getDailyReport(patientId, caregiverId)
      ]);

      const pts = patientsData.patients || [];
      setLinkedPatients(pts);

      // Auto-align active patient if current is not in linked list
      if (currentUser?.role === 'caregiver' && pts.length > 0 && !pts.some((p) => p._id === patientId)) {
        const firstId = pts[0]._id;
        setActivePatientId(firstId);
        const realignedReport = await getDailyReport(firstId, caregiverId);
        setReport(realignedReport);
        return;
      }

      setReport(reportData);
    } catch (err) {
      if (!isSilent) {
        console.error('Failed to load caregiver daily report:', err);
        setError('Unable to load loved one’s recovery report. Please retry.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Real-time synchronization hook (SSE + BroadcastChannel + localStorage + 3s polling)
  const { isLiveConnected, isRefreshing, lastSyncTime, refreshNow } = useRealtimeSync({
    patientId,
    onUpdate: (isSilent) => loadDashboard(isSilent),
    pollingInterval: 3000,
    enabled: true
  });

  useEffect(() => {
    loadDashboard(false);
  }, [patientId]);

  const handlePatientSwitch = (newId) => {
    setActivePatientId(newId);
  };

  const handleSendEncouragement = async (e) => {
    e.preventDefault();
    if (!encouragementMsg.trim()) return;

    try {
      setSendingEncouragement(true);
      const res = await sendEncouragement(patientId, {
        caregiverId,
        caregiverName: currentUser?.name || 'Family Member',
        message: encouragementMsg,
        tag: selectedTag
      });

      setReport((prev) => ({
        ...prev,
        encouragements: [res, ...(prev.encouragements || [])]
      }));

      setEncouragementMsg('');
      setEncouragementSuccess(true);
      setTimeout(() => {
        setEncouragementSuccess(false);
        setShowEncouragementModal(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to send encouragement:', err);
    } finally {
      setSendingEncouragement(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Family & Caretaker Dashboard">
        <LoadingState message="Fetching loved one's daily recovery report, medication logs & check-in..." />
      </PageContainer>
    );
  }

  if (error || !report) {
    return (
      <PageContainer title="Family & Caretaker Dashboard">
        <ErrorState
          title="Daily Report Unavailable"
          message={error || 'Unable to retrieve patient daily report.'}
          onRetry={loadDashboard}
        />
      </PageContainer>
    );
  }

  const { patient, recoveryStatus, medications, careTasks, vitalsCheckIn, safetyInstructions, recentFeedbacks, encouragements } = report;

  const statusColorMap = {
    GREEN: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      badge: 'completed',
      dot: 'bg-emerald-500'
    },
    YELLOW: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      badge: 'pending',
      dot: 'bg-amber-500'
    },
    RED: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      badge: 'missed',
      dot: 'bg-rose-500'
    }
  };

  const currentStatusStyle = statusColorMap[recoveryStatus.color] || statusColorMap.GREEN;

  return (
    <PageContainer
      title={`${t('caregiver.dashboardTitle', 'Daily Recovery Report')}: ${patient.name}`}
      subtitle={`Dedicated family care oversight for your ${patient.relationship.toLowerCase()} recovering from ${patient.condition}.`}
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Patient Switcher if multiple linked */}
          {linkedPatients.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white border border-[#E8E2D7] rounded-xl px-3 py-1.5 shadow-2xs">
              <span className="text-xs text-[#78716C] font-semibold">{t('roles.caregiver', 'Caring For')}:</span>
              <select
                value={patient._id}
                onChange={(e) => handlePatientSwitch(e.target.value)}
                className="text-xs font-bold text-[#1C1917] bg-transparent focus:outline-none cursor-pointer"
              >
                {linkedPatients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.relationship})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Send Encouragement Button */}
          <button
            onClick={() => setShowEncouragementModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#E07A5F] hover:bg-[#CC785C] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>{t('caregiver.sendEncouragement', 'Send Encouragement')}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Active Caregiver Medication & Phone Call Alerts */}
        {report.activeAlerts && report.activeAlerts.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            {report.activeAlerts.map((alert) => (
              <div
                key={alert._id}
                className="p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-amber-950"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    <PhoneCall className="w-5 h-5 animate-bounce" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-amber-950 font-serif">{alert.title}</span>
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Call Not Answered • 5m elapsed
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 whitespace-pre-line leading-relaxed font-medium">
                      {alert.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 1. Loved One Hero Banner */}
        <Card className="bg-gradient-to-r from-white via-[#FAF8F5] to-[#F4F0E8]/50 border-[#E8E2D7]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#E07A5F] text-white flex items-center justify-center font-bold text-2xl shadow-xs flex-shrink-0 font-serif">
                {patient.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-2xl font-extrabold text-[#1C1917] font-serif">{patient.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E07A5F]/15 text-[#E07A5F] border border-[#E07A5F]/25">
                    {patient.relationship}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF8F5] text-[#78716C] border border-[#E8E2D7]">
                    {patient.gender}, {patient.age} yrs
                  </span>
                </div>

                <p className="text-xs text-[#78716C] font-semibold">
                  <strong className="text-[#1C1917]">Procedure:</strong> {patient.procedure || patient.condition} • Discharged {patient.dischargeDate}
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#78716C] pt-1">
                  <span>🚶 <strong>Mobility:</strong> {patient.mobility}</span>
                  <span>🥗 <strong>Diet:</strong> {patient.diet}</span>
                  <span>📅 <strong>Recovery Stage:</strong> {patient.recoveryDay}</span>
                </div>
              </div>
            </div>

            {/* Recovery Traffic Light Status */}
            <div className={`p-4 rounded-2xl border ${currentStatusStyle.bg} flex flex-col items-center md:items-end justify-center min-w-[200px] shadow-2xs`}>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${currentStatusStyle.dot} animate-pulse`} />
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Overall Status</span>
              </div>
              <span className="text-2xl font-black font-serif mt-1">{recoveryStatus.statusLabel}</span>
              <span className="text-xs font-semibold opacity-90 mt-0.5">Health Score: {recoveryStatus.score}%</span>
            </div>
          </div>
        </Card>

        {/* 2. Key Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Medication Adherence */}
          <Card className="hover:border-[#E07A5F]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Medication Intake</span>
              <div className="w-7 h-7 rounded-lg bg-[#CC785C]/15 text-[#CC785C] flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-[#1C1917] font-serif">
                {medications.confirmedCount} / {medications.totalCount}
              </span>
              <span className="text-xs font-bold text-[#059669]">{medications.adherenceRate}% Confirmed</span>
            </div>
            <p className="text-[11px] text-[#78716C] mt-1">Doses recorded for today</p>
          </Card>

          {/* Care Tasks */}
          <Card className="hover:border-[#E07A5F]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Care Activities</span>
              <div className="w-7 h-7 rounded-lg bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-[#1C1917] font-serif">
                {careTasks.completed} / {careTasks.total}
              </span>
              <span className="text-xs font-bold text-[#78716C]">{careTasks.pending} Pending</span>
            </div>
            <p className="text-[11px] text-[#78716C] mt-1">Exercises, walking & wound care</p>
          </Card>

          {/* Energy & Rest State */}
          <Card className="hover:border-[#E07A5F]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Energy & Rest</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Smile className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-[#1C1917] font-serif">
                {vitalsCheckIn.energyLevel || 7} <span className="text-sm font-normal text-[#78716C]">/ 10</span>
              </span>
              <span className="text-xs font-bold text-emerald-700 capitalize">
                {vitalsCheckIn.sleepQuality || 'Good'} Rest
              </span>
            </div>
            <p className="text-[11px] text-[#78716C] mt-1">Appetite: {vitalsCheckIn.appetite || 'Normal'} • Mobility: Level {vitalsCheckIn.mobilityLevel || 4}</p>
          </Card>

          {/* Patient Feedback Alert */}
          <Card
            className="hover:border-[#E07A5F] transition-all cursor-pointer bg-gradient-to-br from-white to-[#F4F0E8]/40"
            onClick={() => navigate('/caregiver/feedback')}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">Patient Notes</span>
              <div className="w-7 h-7 rounded-lg bg-[#E07A5F]/15 text-[#E07A5F] flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-[#1C1917] font-serif">
                {recentFeedbacks.length}
              </span>
              <span className="text-xs font-bold text-[#E07A5F] flex items-center gap-1">
                Review Notes <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-[11px] text-[#78716C] mt-1">Direct feedback from loved one</p>
          </Card>
        </div>

        {/* 3. Two Columns: Today's Meds & Care Plan + Patient Check-in Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Today's Medication Schedule */}
          <Card
            title="Today's Medication Schedule"
            subtitle="Real-time confirmation of scheduled doses"
            badge={
              <span className="text-xs font-bold text-[#059669] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {medications.confirmedCount}/{medications.totalCount} Taken
              </span>
            }
          >
            <div className="space-y-3">
              {medications.todayList.map((med) => (
                <div
                  key={med._id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    med.isCompleted
                      ? 'bg-emerald-50/50 border-emerald-200/70 text-emerald-950'
                      : 'bg-[#FAF8F5] border-[#E8E2D7] text-[#1C1917]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        med.isCompleted ? 'bg-emerald-500 text-white' : 'bg-white border border-[#E8E2D7] text-[#78716C]'
                      }`}
                    >
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs">{med.medicationName}</h4>
                      <p className="text-[11px] text-[#78716C]">{med.dose} • {med.instructionDetails?.foodRelation || 'With water'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs font-bold justify-end">
                      <Clock className="w-3 h-3 text-[#78716C]" />
                      <span>{med.scheduledTime}</span>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        med.isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {med.statusDisplay}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Right Column: Vitals Check-in & Care Tasks */}
          <div className="space-y-6">
            {/* Patient Check-in Details */}
            <Card title="Latest Self-Reported Vitals" subtitle="Submitted during patient's morning check-in">
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7]">
                    <span className="text-[10px] text-[#78716C] uppercase font-bold block">Mobility</span>
                    <span className="font-bold text-[#1C1917] mt-0.5 block">{vitalsCheckIn.mobilityLevel}/5 Level</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7]">
                    <span className="text-[10px] text-[#78716C] uppercase font-bold block">Sleep</span>
                    <span className="font-bold text-[#1C1917] mt-0.5 block capitalize">{vitalsCheckIn.sleepQuality}</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7]">
                    <span className="text-[10px] text-[#78716C] uppercase font-bold block">Appetite</span>
                    <span className="font-bold text-[#1C1917] mt-0.5 block capitalize">{vitalsCheckIn.appetite}</span>
                  </div>
                  <div className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7]">
                    <span className="text-[10px] text-[#78716C] uppercase font-bold block">Energy</span>
                    <span className="font-bold text-[#1C1917] mt-0.5 block">{vitalsCheckIn.energyLevel}/10</span>
                  </div>
                </div>

                {vitalsCheckIn.notes && (
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] text-[#1C1917]">
                    <span className="font-bold text-[11px] text-[#78716C] block mb-0.5">Patient's Check-in Note:</span>
                    <p className="italic">"{vitalsCheckIn.notes}"</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Red Flag Warning Signs */}
            <Card title="Red Flag Warning Signs" subtitle="Contact attending clinic immediately if observed">
              <div className="space-y-2">
                {safetyInstructions.warningSigns.map((w, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{w}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* 4. Recent Patient Feedback & Condition Updates */}
        <Card
          title="Recent Patient Feedback & Condition Reports"
          subtitle={`Real-time health updates and check-in reports submitted by ${patient.name} from the patient portal`}
          badge={
            <button
              onClick={() => navigate('/caregiver/feedback')}
              className="text-xs font-bold text-[#E07A5F] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Feedback Review Center</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {(!recentFeedbacks || recentFeedbacks.length === 0) ? (
            <div className="p-6 text-center rounded-xl bg-[#FAF8F5] border border-[#E8E2D7]">
              <MessageSquare className="w-6 h-6 text-[#A8A29E] mx-auto mb-1.5" />
              <p className="text-xs font-bold text-[#1C1917]">No feedback reports submitted yet</p>
              <p className="text-[11px] text-[#78716C] mt-0.5">
                When {patient.name} logs a condition or note on their portal, it appears here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentFeedbacks.slice(0, 3).map((fb) => {
                const isPending =
                  fb.status === 'pending' ||
                  fb.status === 'pending_review' ||
                  fb.status === 'submitted' ||
                  fb.reviewStatus === 'pending' ||
                  (!fb.reviewedAt && fb.status !== 'reviewed');
                const isUrgent = fb.urgency === 'urgent' || fb.urgency === 'high' || fb.urgency === 'emergency';

                return (
                  <div
                    key={fb._id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isUrgent
                        ? 'border-rose-200 bg-rose-50/30'
                        : isPending
                        ? 'border-amber-200 bg-amber-50/20'
                        : 'border-[#E8E2D7] bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-[#1C1917]">
                          {fb.condition || 'Health Check-in Report'}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isUrgent
                              ? 'bg-rose-100 text-rose-800'
                              : fb.urgency === 'moderate'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {fb.urgency || 'Normal'}
                        </span>
                        {isPending ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Needs Review
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Reviewed
                          </span>
                        )}
                      </div>

                      {fb.notes && (
                        <p className="text-xs text-[#1C1917] italic truncate">
                          "{fb.notes}"
                        </p>
                      )}

                      {fb.caregiverNote && (
                        <p className="text-[11px] text-emerald-800 font-medium">
                          Family response: "{fb.caregiverNote}"
                        </p>
                      )}

                      <p className="text-[10px] text-[#78716C]">
                        Submitted {fb.submittedAt ? new Date(fb.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : 'Recently'}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate('/caregiver/feedback')}
                      className="self-start sm:self-center px-3 py-1.5 rounded-lg text-xs font-bold text-[#E07A5F] hover:bg-[#E07A5F]/10 border border-[#E07A5F]/30 transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
                    >
                      <span>Review Details</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 5. Encouragement Board Section */}
        {encouragements.length > 0 && (
          <Card
            title="Family Encouragements & Care Messages"
            subtitle="Personal notes sent to your loved one to brighten their recovery"
            badge={
              <button
                onClick={() => setShowEncouragementModal(true)}
                className="text-xs font-bold text-[#E07A5F] hover:underline cursor-pointer"
              >
                + Send Another Note
              </button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {encouragements.map((enc) => (
                <div key={enc._id} className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D7] space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1C1917] flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-[#E07A5F] fill-current" />
                      {enc.caregiverName}
                    </span>
                    <span className="text-[10px] text-[#78716C]">
                      {new Date(enc.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#1C1917] italic">"{enc.message}"</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Encouragement Modal */}
      {showEncouragementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E8E2D7] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E2D7] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E07A5F]/15 text-[#E07A5F] flex items-center justify-center">
                  <Heart className="w-4 h-4 fill-current" />
                </div>
                <h3 className="text-base font-bold text-[#1C1917] font-serif">Send Encouragement</h3>
              </div>
              <button
                onClick={() => setShowEncouragementModal(false)}
                className="text-[#78716C] hover:text-[#1C1917] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {encouragementSuccess ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm text-[#1C1917]">Encouragement Delivered!</h4>
                <p className="text-xs text-[#78716C]">Your loved one will see your note on their patient portal.</p>
              </div>
            ) : (
              <form onSubmit={handleSendEncouragement} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#78716C] mb-1">
                    Message to {patient.name}:
                  </label>
                  <textarea
                    rows={3}
                    value={encouragementMsg}
                    onChange={(e) => setEncouragementMsg(e.target.value)}
                    placeholder="e.g., Proud of your walking practice today mom! Keep resting and I will see you soon."
                    className="w-full p-3 rounded-xl border border-[#E8E2D7] text-xs text-[#1C1917] focus:outline-none focus:border-[#E07A5F]"
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#78716C] font-semibold">Mood / Theme:</span>
                  {['love', 'thumbs_up', 'support'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTag(t)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedTag === t
                          ? 'bg-[#E07A5F] text-white shadow-xs'
                          : 'bg-[#FAF8F5] text-[#78716C] border border-[#E8E2D7]'
                      }`}
                    >
                      {t === 'love' ? '❤️ Love' : t === 'thumbs_up' ? '👍 High Five' : '💪 Stay Strong'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEncouragementModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#78716C] hover:bg-[#FAF8F5] border border-[#E8E2D7] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingEncouragement || !encouragementMsg.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#E07A5F] hover:bg-[#CC785C] text-white shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingEncouragement ? 'Sending...' : 'Send Note'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
