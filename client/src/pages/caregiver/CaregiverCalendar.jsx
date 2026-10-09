import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { getCalendarData, getCaregiverPatients } from '../../services/caregiverService';
import { useApp } from '../../context/AppContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Heart,
  Pill,
  Flag,
  Activity,
  User,
  ShieldCheck,
  Stethoscope,
  Smile,
  Info,
  RefreshCw
} from 'lucide-react';
import { useRealtimeSync } from '../../utils/realtimeSync';

export default function CaregiverCalendar() {
  const { t } = useTranslation();
  const { activePatientId, setActivePatientId, currentUser } = useApp();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [linkedPatients, setLinkedPatients] = useState([]);

  // Calendar view state
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(10); // 10 = October
  const [selectedDate, setSelectedDate] = useState('2026-10-09');

  const caregiverId = currentUser?.role === 'caregiver' ? currentUser._id : 'U101';
  const patientId = activePatientId || 'P001';

  const loadCalendar = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const [patientsRes, calRes] = await Promise.all([
        getCaregiverPatients(caregiverId),
        getCalendarData(patientId, currentYear, currentMonth)
      ]);

      setLinkedPatients(patientsRes.patients || []);
      setCalendarData(calRes);
    } catch (err) {
      if (!isSilent) {
        console.error('Failed to load caregiver calendar:', err);
        setError('Unable to load loved one’s recovery calendar. Please retry.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Real-time synchronization hook (SSE + BroadcastChannel + localStorage + 4s polling)
  const { isLiveConnected, isRefreshing, refreshNow } = useRealtimeSync({
    patientId,
    onUpdate: (isSilent) => loadCalendar(isSilent),
    pollingInterval: 4000,
    enabled: true
  });

  useEffect(() => {
    loadCalendar(false);
  }, [patientId, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonthName = monthNames[currentMonth - 1];

  // Helper for grid construction (Oct 2026 starts on Thursday, index 4)
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Find selected day details
  const selectedDayInfo = calendarData?.days?.find((d) => d.date === selectedDate) || {
    date: selectedDate,
    day: parseInt(selectedDate?.split('-')[2] || '9', 10),
    statusColor: 'GREEN',
    score: 85,
    hasMilestone: false,
    hasAppointment: false,
    dosesTotal: 3,
    dosesTaken: 3
  };

  const activePatientObj = linkedPatients.find((p) => p._id === patientId) || {
    _id: patientId,
    name: calendarData?.patientName || 'Loved One',
    relationship: 'Family Member'
  };

  if (loading && !calendarData) {
    return (
      <PageContainer title={t('caregiver.recoveryCalendar', 'Recovery & Care Calendar')} subtitle={t('caregiver.recoverySubtitle', 'Comprehensive view of daily health scores, medication progress, and clinical appointments')}>
        <LoadingState message={t('common.loading', 'Loading care schedule & calendar...')} />
      </PageContainer>
    );
  }

  if (error && !calendarData) {
    return (
      <PageContainer title={t('caregiver.recoveryCalendar', 'Recovery & Care Calendar')} subtitle={t('caregiver.recoverySubtitle', 'Comprehensive view of daily health scores, medication progress, and clinical appointments')}>
        <ErrorState message={error} onRetry={loadCalendar} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t('caregiver.recoveryCalendar', 'Recovery & Care Calendar')}
      subtitle={t('caregiver.recoverySubtitle', 'Comprehensive view of daily health scores, medication progress, and clinical appointments')}
      actions={
        <div className="flex items-center gap-2">
          {linkedPatients.length > 1 && (
            <div className="flex items-center bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl px-2.5 py-1.5 shadow-2xs">
              <User className="w-3.5 h-3.5 text-[#78716C] mr-1.5" />
              <select
                value={patientId}
                onChange={(e) => setActivePatientId(e.target.value)}
                className="text-xs font-bold bg-transparent text-[#1C1917] focus:outline-none cursor-pointer"
              >
                {linkedPatients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.relationship})
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => navigate('/caregiver')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#E8E2D7] text-xs font-bold text-[#1C1917] transition-all shadow-2xs cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-[#CC785C]" />
            <span>{t('nav.dailyReport', 'Daily Report')}</span>
          </button>
        </div>
      }
    >
      {/* Top Banner: Patient Overview & Calendar Summary */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2B2724] via-[#3D3733] to-[#2B2724] text-white p-5 sm:p-6 shadow-md border border-[#E8E2D7]/20">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#CC785C] flex items-center justify-center text-white text-lg font-serif font-bold shadow-sm">
              {activePatientObj.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-serif">{activePatientObj.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white/90 border border-white/20">
                  {activePatientObj.relationship || t('roles.caregiver', 'Family Member')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#059669]/25 text-emerald-300 border border-emerald-400/30">
                  {t('caregiver.postDischarge', 'Post-Discharge')}
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1">
                {t('caregiver.dischargedOn', 'Discharged on')} <span className="text-white font-medium">{calendarData?.dischargeDate || 'Oct 5, 2026'}</span> • {t('caregiver.full30DayMonitoring', 'Full 30-Day Recovery Monitoring')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15">
            <div className="text-center px-2">
              <p className="text-[10px] uppercase font-bold text-stone-300">{t('caregiver.totalDoses', 'Total Doses')}</p>
              <p className="text-base font-extrabold text-white">96% {t('caregiver.dosesTaken', 'Taken')}</p>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div className="text-center px-2">
              <p className="text-[10px] uppercase font-bold text-stone-300">{t('caregiver.milestones', 'Milestones')}</p>
              <p className="text-base font-extrabold text-[#FCD34D]">5 {t('caregiver.scheduled', 'Scheduled')}</p>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div className="text-center px-2">
              <p className="text-[10px] uppercase font-bold text-stone-300">{t('caregiver.nextVisit', 'Next Visit')}</p>
              <p className="text-base font-extrabold text-emerald-300">Oct 12</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar on Left (2/3), Day Inspector & Milestones on Right (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar Grid */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-5 sm:p-6 shadow-sm border border-[#E8E2D7]">
            {/* Calendar Month Navigation Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E8E2D7]">
              <div className="flex items-center gap-2.5">
                <CalendarIcon className="w-5 h-5 text-[#CC785C]" />
                <h3 className="text-lg font-bold font-serif text-[#1C1917]">
                  {currentMonthName} {currentYear}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-[#E8E2D7] bg-[#FAF8F5] hover:bg-[#F4F0E8] text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setCurrentMonth(10);
                    setCurrentYear(2026);
                    setSelectedDate('2026-10-09');
                  }}
                  className="px-2.5 py-1 rounded-lg border border-[#E8E2D7] bg-[#FAF8F5] hover:bg-[#F4F0E8] text-xs font-bold text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer"
                >
                  {t('caregiver.today', 'Today')}
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-[#E8E2D7] bg-[#FAF8F5] hover:bg-[#F4F0E8] text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer"
                  aria-label="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-[11px] font-extrabold uppercase tracking-wider text-[#78716C] py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {/* Blank cells for offset */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`blank-${i}`} className="h-16 sm:h-20 rounded-xl bg-stone-50/40 border border-transparent" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                const dateKey = `${currentYear}-${currentMonth < 10 ? `0${currentMonth}` : currentMonth}-${dStr}`;

                const dayObj = calendarData?.days?.find((d) => d.date === dateKey) || {
                  date: dateKey,
                  day: dayNum,
                  statusColor: dayNum >= 5 && dayNum <= 9 ? 'GREEN' : null,
                  hasMilestone: dayNum === 5 || dayNum === 12 || dayNum === 19,
                  hasAppointment: dayNum === 12,
                  dosesTotal: dayNum >= 5 && dayNum <= 9 ? 3 : 0,
                  dosesTaken: dayNum >= 5 && dayNum <= 9 ? 3 : 0
                };

                const isSelected = selectedDate === dateKey;
                const isToday = dateKey === '2026-10-09';
                const hasDoses = dayObj.dosesTotal > 0;
                const allTaken = hasDoses && dayObj.dosesTaken === dayObj.dosesTotal;

                // Day status badge coloring
                let statusBg = 'bg-white hover:bg-[#FAF8F5] border-[#E8E2D7]';
                if (isSelected) {
                  statusBg = 'bg-[#FAF8F5] border-[#CC785C] ring-2 ring-[#CC785C]/30 shadow-xs';
                } else if (dayObj.statusColor === 'GREEN') {
                  statusBg = 'bg-emerald-50/40 hover:bg-emerald-50/70 border-emerald-200/60';
                } else if (dayObj.statusColor === 'YELLOW') {
                  statusBg = 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-200/60';
                } else if (dayObj.statusColor === 'RED') {
                  statusBg = 'bg-rose-50/40 hover:bg-rose-50/70 border-rose-200/60';
                }

                return (
                  <div
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    className={`h-16 sm:h-20 p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative group ${statusBg}`}
                  >
                    {/* Top Row: Date Number + Indicators */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                          isToday
                            ? 'bg-[#CC785C] text-white font-extrabold'
                            : isSelected
                            ? 'text-[#CC785C] font-extrabold'
                            : 'text-[#1C1917]'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {/* Status indicator dot */}
                      {dayObj.statusColor && (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            dayObj.statusColor === 'GREEN'
                              ? 'bg-[#059669]'
                              : dayObj.statusColor === 'YELLOW'
                              ? 'bg-[#D97706]'
                              : 'bg-[#DC2626]'
                          }`}
                          title={`Recovery status: ${dayObj.statusColor}`}
                        />
                      )}
                    </div>

                    {/* Middle: Dose badge */}
                    {hasDoses && (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-stone-600">
                        <Pill className={`w-2.5 h-2.5 ${allTaken ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <span className="hidden sm:inline">
                          {dayObj.dosesTaken}/{dayObj.dosesTotal}
                        </span>
                      </div>
                    )}

                    {/* Bottom: Milestone or Appointment tag */}
                    <div className="flex items-center gap-1 overflow-hidden">
                      {dayObj.hasMilestone && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Milestone scheduled" />
                      )}
                      {dayObj.hasAppointment && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-extrabold bg-[#0D9488]/15 text-[#0D9488] truncate">
                          Dr Appt
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend Footer */}
            <div className="mt-5 pt-4 border-t border-[#E8E2D7] flex flex-wrap items-center justify-between gap-3 text-xs text-[#78716C]">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                  <span>{t('caregiver.onTrackGreen', 'On Track (Green)')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                  <span>{t('caregiver.needsAttentionYellow', 'Needs Attention (Yellow)')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                  <span>{t('caregiver.doctorReviewRed', 'Doctor Review (Red)')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>{t('caregiver.milestoneVisit', 'Milestone / Visit')}</span>
                </div>
              </div>
              <span className="text-[11px] font-medium text-[#A8A29E]">{t('caregiver.clickDateHint', 'Click any date to inspect details')}</span>
            </div>
          </Card>

          {/* Recovery Milestones Road Map */}
          <Card className="p-5 sm:p-6 shadow-sm border border-[#E8E2D7]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#CC785C]" />
                <h4 className="font-bold text-sm text-[#1C1917]">{t('caregiver.keyMilestones', 'Key Recovery Milestones')}</h4>
              </div>
              <span className="text-xs font-semibold text-[#78716C]">{t('caregiver.thirtyDayPlan', '30-Day Plan')}</span>
            </div>

            <div className="space-y-3">
              {(calendarData?.milestones || [
                { date: '2026-10-05', title: 'Hospital Discharge & Home Transition', type: 'discharge' },
                { date: '2026-10-08', title: 'Initial Home Recovery Check-in', type: 'check_in' },
                { date: '2026-10-12', title: 'Wound Dressing & Incision Review', type: 'wound_check' },
                { date: '2026-10-19', title: 'Clinic Follow-up & Suture / Staple Check', type: 'appointment' },
                { date: '2026-10-26', title: 'Physical Therapy & Recovery Milestone', type: 'milestone' }
              ]).map((m, idx) => {
                const isPassed = new Date(m.date) <= new Date('2026-10-09');
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      isPassed
                        ? 'bg-emerald-50/50 border-emerald-200/70 text-emerald-950'
                        : 'bg-white border-[#E8E2D7] text-[#1C1917]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        isPassed ? 'bg-[#059669] text-white' : 'bg-[#FAF8F5] text-[#78716C] border border-[#E8E2D7]'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold truncate">{m.title}</p>
                        <span className="text-[10px] font-semibold text-[#78716C]">{m.date}</span>
                      </div>
                      <p className="text-[11px] text-[#78716C] mt-0.5">
                        {isPassed ? t('caregiver.completedSuccessfully', 'Completed successfully') : t('caregiver.upcomingCareEvent', 'Upcoming care event')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Day Inspector */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 sm:p-6 shadow-sm border border-[#E8E2D7] bg-white sticky top-20">
            {/* Header with Selected Date */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E2D7]">
              <div>
                <p className="text-[10px] uppercase font-extrabold tracking-wider text-[#78716C]">{t('caregiver.inspectingDate', 'Inspecting Date')}</p>
                <h4 className="font-bold text-base font-serif text-[#1C1917]">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h4>
              </div>
              <StatusBadge
                status={selectedDayInfo.statusColor || 'GREEN'}
                label={
                  selectedDayInfo.statusColor === 'GREEN'
                    ? t('status.onTrack', 'On Track')
                    : selectedDayInfo.statusColor === 'YELLOW'
                    ? t('status.caution', 'Caution')
                    : selectedDayInfo.statusColor === 'RED'
                    ? t('status.reviewNeeded', 'Review Needed')
                    : t('status.scheduled', 'Scheduled')
                }
              />
            </div>

            {/* Daily Score & Adherence Metric */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E2D7]">
                <div className="flex items-center gap-1.5 text-xs text-[#78716C] mb-1">
                  <Activity className="w-3.5 h-3.5 text-[#CC785C]" />
                  <span>{t('caregiver.recoveryScore', 'Recovery Score')}</span>
                </div>
                <p className="text-xl font-extrabold text-[#1C1917]">
                  {selectedDayInfo.score ? `${selectedDayInfo.score}/100` : '85/100'}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Good stability</p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E2D7]">
                <div className="flex items-center gap-1.5 text-xs text-[#78716C] mb-1">
                  <Pill className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>{t('caregiver.dosesTaken', 'Doses Taken')}</span>
                </div>
                <p className="text-xl font-extrabold text-[#1C1917]">
                  {selectedDayInfo.dosesTaken || 3} / {selectedDayInfo.dosesTotal || 3}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">100% {t('caregiver.adherenceRate', 'adherence')}</p>
              </div>
            </div>

            {/* Daily Scheduled Routine */}
            <div className="mb-4">
              <h5 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-2.5">
                {t('caregiver.dailyRegimen', 'Daily Regimen & Care Checklist')}
              </h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E8E2D7] text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                    <span className="font-semibold text-[#1C1917]">Morning Paracetamol 500mg</span>
                  </div>
                  <span className="text-[10px] text-[#78716C]">08:00 AM</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E8E2D7] text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                    <span className="font-semibold text-[#1C1917]">Walking Exercise (10 min)</span>
                  </div>
                  <span className="text-[10px] text-[#78716C]">10:30 AM</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E8E2D7] text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                    <span className="font-semibold text-[#1C1917]">Afternoon Recovery Check-in</span>
                  </div>
                  <span className="text-[10px] text-[#78716C]">02:00 PM</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E8E2D7] text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-[#1C1917]">Night Dose & Cold Compress</span>
                  </div>
                  <span className="text-[10px] text-[#78716C]">08:30 PM</span>
                </div>
              </div>
            </div>

            {/* Clinical Visits / Appointments on this date */}
            {selectedDate === '2026-10-12' && (
              <div className="p-3 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/25 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0D9488] mb-1">
                  <Stethoscope className="w-4 h-4" />
                  <span>{t('caregiver.scheduledConsultation', 'Scheduled Consultation')}</span>
                </div>
                <p className="text-xs text-[#1C1917] font-semibold">Post-Operative Wound Dressing Check</p>
                <p className="text-[11px] text-[#78716C]">Clinic Room 204 • 10:00 AM with Nurse Specialist</p>
              </div>
            )}

            {/* Quick Action Buttons for Family Member */}
            <div className="space-y-2 pt-2 border-t border-[#E8E2D7]">
              <button
                onClick={() => navigate('/caregiver/feedback')}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#FAF8F5] hover:bg-[#F4F0E8] border border-[#E8E2D7] rounded-xl text-xs font-bold text-[#1C1917] transition-all cursor-pointer"
              >
                <Smile className="w-3.5 h-3.5 text-[#CC785C]" />
                <span>{t('caregiver.reviewFeedback', 'Review Patient Feedback')}</span>
              </button>
              <button
                onClick={() => navigate('/caregiver')}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#CC785C] hover:bg-[#B5674E] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>{t('caregiver.returnToSummary', 'Return to Daily Summary')}</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
