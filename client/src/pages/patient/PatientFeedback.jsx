import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import { useApp } from '../../context/AppContext';
import {
  submitFeedback,
  getAvailableSlots,
  bookAppointment,
  getPatientFeedbacks,
  getPatientAppointments,
  clearPatientHistory
} from '../../services/feedbackService';
import {
  MessageSquarePlus,
  AlertTriangle,
  Clock,
  CalendarCheck,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Stethoscope,
  ArrowLeft,
  Send,
  Trash2,
  X
} from 'lucide-react';

const URGENCY_LEVELS = [
  {
    value: 'mild',
    label: 'Mild',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    dot: 'bg-emerald-500',
    description: 'No immediate concern. Schedule at convenience.'
  },
  {
    value: 'moderate',
    label: 'Moderate',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    dot: 'bg-amber-500',
    description: 'Needs attention soon. See doctor within 1-3 days.'
  },
  {
    value: 'urgent',
    label: 'Urgent',
    color: 'bg-red-50 border-red-200 text-red-800',
    dot: 'bg-red-500',
    description: 'Requires immediate attention. All slots opened.'
  },
  {
    value: 'emergency',
    label: 'Emergency',
    color: 'bg-red-100 border-red-300 text-red-900',
    dot: 'bg-red-600 animate-pulse',
    description: 'CRITICAL — All slots available immediately.'
  }
];

// Steps: feedback → slots → done
const BOOKING_STEPS = ['feedback', 'slots', 'done'];

export default function PatientFeedback() {
  const { activePatientId, currentUser } = useApp();
  const patientId = activePatientId || currentUser?.patientId || 'P001';

  // Navigation: 'feedback' | 'feedback-done' | 'slots' | 'done'
  const [currentStep, setCurrentStep] = useState('feedback');

  // Feedback form state
  const [condition, setCondition] = useState('');
  const [urgency, setUrgency] = useState('mild');
  const [notes, setNotes] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState(null);

  // Slot booking state
  const [slotsData, setSlotsData] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Booking state
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // History
  const [pastFeedbacks, setPastFeedbacks] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Submission states
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [patientId]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const [fb, apt] = await Promise.all([
        getPatientFeedbacks(patientId),
        getPatientAppointments(patientId)
      ]);
      setPastFeedbacks(fb);
      setPastAppointments(apt);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const [clearingHistory, setClearingHistory] = useState(false);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your feedback and appointment history?')) return;
    setClearingHistory(true);
    try {
      await clearPatientHistory(patientId);
      setPastFeedbacks([]);
      setPastAppointments([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      setClearingHistory(false);
    }
  };

  // 1. Submit Feedback Only (No appointment)
  const handleSubmitFeedbackOnly = async () => {
    if (!condition.trim()) return;

    setSubmittingFeedback(true);
    try {
      const feedback = await submitFeedback(patientId, {
        condition: condition.trim(),
        urgency,
        notes: notes.trim()
      });
      setSubmittedFeedback(feedback);
      setCurrentStep('feedback-done');
      loadHistory();
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // 2. Book Appointment Flow (Submit feedback & proceed to slots)
  const handleProceedToBooking = async () => {
    if (!condition.trim()) return;

    setLoadingSlots(true);
    try {
      const feedback = await submitFeedback(patientId, {
        condition: condition.trim(),
        urgency,
        notes: notes.trim()
      });
      setSubmittedFeedback(feedback);

      // Load available slots based on urgency
      setSlotsLoading(true);
      const slots = await getAvailableSlots(patientId, urgency);
      setSlotsData(slots);
      if (slots?.diagnosingDoctor) {
        setSelectedProvider(slots.diagnosingDoctor);
      }
      setSlotsLoading(false);

      setCurrentStep('slots');
      loadHistory();
    } catch (err) {
      console.error('Error proceeding to booking:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Book appointment after having submitted feedback
  const handleBookFromSubmittedFeedback = async () => {
    setSlotsLoading(true);
    try {
      const slots = await getAvailableSlots(patientId, urgency);
      setSlotsData(slots);
      if (slots?.diagnosingDoctor) {
        setSelectedProvider(slots.diagnosingDoctor);
      }
      setCurrentStep('slots');
    } catch (err) {
      console.error('Error loading slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedSlot) return;

    setBookingLoading(true);
    try {
      const result = await bookAppointment(patientId, {
        date: selectedDate,
        timeSlot: selectedSlot,
        providerId: selectedProvider?._id || null,
        urgency,
        feedbackId: submittedFeedback?._id || null,
        reason: condition
      });
      setBookingResult(result);
      setCurrentStep('done');
      loadHistory();
    } catch (err) {
      console.error('Error booking appointment:', err);
    } finally {
      setBookingLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('feedback');
    setCondition('');
    setUrgency('mild');
    setNotes('');
    setSubmittedFeedback(null);
    setSlotsData(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSelectedProvider(null);
    setBookingResult(null);
  };

  // Steps indicator configuration
  const isFeedbackOnly = currentStep === 'feedback-done';
  const displaySteps = isFeedbackOnly
    ? [
        { key: 'feedback', label: 'Report Condition' },
        { key: 'feedback-done', label: 'Feedback Logged ✓' }
      ]
    : [
        { key: 'feedback', label: 'Report Condition' },
        { key: 'slots', label: 'Choose Slot & Doctor' },
        { key: 'done', label: 'Booked ✓' }
      ];

  const stepIndex = displaySteps.findIndex(s => s.key === currentStep);

  // ──────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────

  return (
    <PageContainer
      title="Condition Feedback & Appointments"
      subtitle="Report your current condition and book a follow-up appointment based on urgency."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-xs font-bold text-[#78716C] hover:text-[#1C1917] shadow-2xs transition-all cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{showHistory ? 'Hide History' : 'View History'}</span>
          </button>
          {currentStep !== 'feedback' && (
            <button
              onClick={resetForm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#CC785C] hover:bg-[#B86549] text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>New Feedback</span>
            </button>
          )}
        </div>
      }
    >
      {/* Progress Steps */}
      <div className="flex items-center gap-1 sm:gap-2 p-3 sm:p-4 bg-white border border-[#E8E2D7] rounded-2xl shadow-xs overflow-x-auto scrollbar-none">
        {displaySteps.map((step, idx) => {
          const isActive = idx === stepIndex;
          const isCompleted = idx < stepIndex;

          return (
            <React.Fragment key={step.key}>
              {idx > 0 && (
                <div className={`flex-1 h-0.5 rounded-full min-w-[16px] transition-colors ${isCompleted ? 'bg-[#CC785C]' : 'bg-[#E8E2D7]'}`} />
              )}
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive ? 'bg-[#CC785C] text-white shadow-xs' :
                isCompleted ? 'bg-[#CC785C]/10 text-[#CC785C]' :
                'bg-[#FAF8F5] text-[#A8A29E]'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px]" style={{ borderColor: 'currentColor' }}>
                    {idx + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* STEP 1: Feedback Form */}
      {/* ═══════════════════════════════════════════ */}
      {currentStep === 'feedback' && (
        <div className="space-y-5 animate-fade-in">
          {/* Condition Description */}
          <Card title="How are you feeling today?" subtitle="Describe your current condition in your own words">
            <textarea
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g., I've been experiencing discomfort around the surgical site since this morning, and there's some swelling..."
              rows={4}
              className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#CC785C]/30 focus:border-[#CC785C] transition-all resize-none"
            />
          </Card>

          {/* Urgency Selection */}
          <Card title="How Urgent Is This?" subtitle="This determines appointment slot availability">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {URGENCY_LEVELS.map(level => {
                const isSelected = urgency === level.value;
                return (
                  <button
                    key={level.value}
                    onClick={() => setUrgency(level.value)}
                    className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${level.color} border-current shadow-xs ring-2 ring-current/20`
                        : 'bg-white border-[#E8E2D7] hover:border-[#D6CEBE]'
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle2 className="absolute top-2.5 right-2.5 w-5 h-5" />
                    )}
                    <span className={`w-3.5 h-3.5 rounded-full mt-0.5 flex-shrink-0 ${level.dot}`} />
                    <div className="flex-1 min-w-0 pr-5">
                      <p className={`text-sm font-bold ${isSelected ? '' : 'text-[#1C1917]'}`}>
                        {level.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${isSelected ? 'opacity-80' : 'text-[#78716C]'}`}>
                        {level.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {(urgency === 'urgent' || urgency === 'emergency') && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">All appointment slots will be shown as available.</p>
                  <p className="mt-0.5 text-red-700">For immediate emergencies, please call the hospital helpline directly.</p>
                </div>
              </div>
            )}
          </Card>

          {/* Additional Notes */}
          <Card title="Additional Notes" subtitle="Any extra information for your care team (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other details you'd like to share..."
              rows={3}
              className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#CC785C]/30 focus:border-[#CC785C] transition-all resize-none"
            />
          </Card>

          {/* Separate Submit Options */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold text-[#78716C] uppercase tracking-wider">Choose Submission Option</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Submit Feedback Only */}
              <button
                type="button"
                onClick={handleSubmitFeedbackOnly}
                disabled={!condition.trim() || submittingFeedback || loadingSlots}
                className="flex flex-col items-start gap-1 p-4 bg-white hover:bg-[#FAF8F5] border-2 border-[#CC785C] text-[#1C1917] hover:border-[#B86549] disabled:border-[#E8E2D7] disabled:text-[#A8A29E] disabled:bg-[#FAF8F5] disabled:cursor-not-allowed rounded-2xl shadow-xs transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#CC785C]/10 text-[#CC785C] group-hover:bg-[#CC785C] group-hover:text-white flex items-center justify-center transition-colors">
                      <Send className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-[#CC785C]">Submit Feedback</span>
                  </div>
                  {submittingFeedback && (
                    <div className="w-4 h-4 border-2 border-[#CC785C]/30 border-t-[#CC785C] rounded-full animate-spin" />
                  )}
                </div>
                <p className="text-xs text-[#78716C] mt-1">
                  Send your condition update directly to your care team. No doctor visit will be scheduled.
                </p>
              </button>

              {/* Option 2: Book Appointment */}
              <button
                type="button"
                onClick={handleProceedToBooking}
                disabled={!condition.trim() || submittingFeedback || loadingSlots}
                className="flex flex-col items-start gap-1 p-4 bg-[#0D9488] hover:bg-[#0B8578] disabled:bg-[#D6CEBE] disabled:cursor-not-allowed text-white rounded-2xl shadow-xs transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-white">Book Appointment</span>
                  </div>
                  {loadingSlots ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
                  )}
                </div>
                <p className="text-xs text-white/85 mt-1">
                  Find available doctor slots based on your urgency level and schedule a visit.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* STEP: Feedback Submitted (No Appointment) */}
      {/* ═══════════════════════════════════════════ */}
      {currentStep === 'feedback-done' && submittedFeedback && (
        <div className="space-y-5 animate-fade-in">
          {/* Success Banner Card */}
          <div className="text-center p-8 bg-gradient-to-b from-emerald-50 to-white border border-emerald-200 rounded-2xl shadow-xs">
            <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1C1917] font-serif">Feedback Submitted!</h2>
            <p className="text-sm text-[#78716C] mt-2 max-w-md mx-auto">
              Your condition report has been logged and sent to your clinical care team for review.
            </p>
          </div>

          {/* Feedback Details Card */}
          <Card title="Submitted Details" subtitle={`Reference ID: ${submittedFeedback._id}`}>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">Reported Condition</p>
                <p className="text-sm font-semibold text-[#1C1917] mt-1">{submittedFeedback.condition}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E8E2D7]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">Urgency Level</p>
                  <div className="mt-1">
                    <StatusBadge
                      status={submittedFeedback.urgency === 'urgent' || submittedFeedback.urgency === 'emergency' ? 'missed' : submittedFeedback.urgency === 'moderate' ? 'pending' : 'completed'}
                      label={submittedFeedback.urgency.toUpperCase()}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">Submitted At</p>
                  <p className="text-xs font-semibold text-[#1C1917] mt-1">
                    {new Date(submittedFeedback.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                    {new Date(submittedFeedback.submittedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {submittedFeedback.notes && (
                <div className="pt-3 border-t border-[#E8E2D7]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">Additional Notes</p>
                  <p className="text-xs text-[#78716C] mt-1">{submittedFeedback.notes}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Next Steps / Actions */}
          <div className="p-4 bg-[#FAF8F5] border border-[#E8E2D7] rounded-2xl space-y-3">
            <p className="text-xs font-bold text-[#1C1917]">Need to see a doctor for this issue?</p>
            <p className="text-xs text-[#78716C]">
              You can schedule an appointment now based on your condition's urgency, or submit another update anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={handleBookFromSubmittedFeedback}
                disabled={loadingSlots}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#0D9488] hover:bg-[#0B8578] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>{loadingSlots ? 'Loading Slots...' : 'Book Appointment for this Condition'}</span>
              </button>
              <button
                onClick={resetForm}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-[#FAF8F5] border border-[#E8E2D7] text-[#1C1917] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <MessageSquarePlus className="w-4 h-4 text-[#CC785C]" />
                <span>Submit New Feedback</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* STEP 2: Appointment Slots */}
      {/* ═══════════════════════════════════════════ */}
      {currentStep === 'slots' && (
        <div className="space-y-5 animate-fade-in">
          {/* Feedback Summary */}
          {submittedFeedback && (
            <div className="p-4 bg-[#CC785C]/5 border border-[#CC785C]/20 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#CC785C]" />
                  <span className="text-xs font-bold text-[#CC785C]">Feedback Submitted Successfully</span>
                </div>
                <StatusBadge
                  status={urgency === 'urgent' || urgency === 'emergency' ? 'missed' : urgency === 'moderate' ? 'pending' : 'completed'}
                  label={urgency.toUpperCase()}
                />
              </div>
              <p className="text-xs text-[#78716C] line-clamp-2">{submittedFeedback.condition}</p>
            </div>
          )}

          {/* Back button */}
          <button
            onClick={() => setCurrentStep('feedback')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to feedback</span>
          </button>

          {slotsLoading ? (
            <LoadingState message="Finding available appointment slots based on your urgency..." />
          ) : slotsData ? (
            <>
              {/* Urgency explanation banner */}
              <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                slotsData.isUrgent
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : urgency === 'moderate'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                {slotsData.isUrgent ? (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
                ) : (
                  <Clock className="w-4 h-4 flex-shrink-0 text-current" />
                )}
                {slotsData.isUrgent
                  ? 'All appointment slots are available due to the urgency of your condition. Every time slot is open.'
                  : urgency === 'moderate'
                    ? 'Showing available slots for the next 3 days based on doctor availability.'
                    : 'Showing regular appointment slots based on doctor schedules for the next 7 days.'
                }
              </div>

              {/* Day selector tabs */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {slotsData.slots.map(day => (
                  <button
                    key={day.date}
                    onClick={() => {
                      setSelectedDate(day.date);
                      setSelectedSlot(null);
                      setSelectedProvider(null);
                    }}
                    className={`flex-shrink-0 px-4 py-3 rounded-xl border text-center transition-all cursor-pointer min-w-[110px] ${
                      selectedDate === day.date
                        ? 'bg-[#CC785C] text-white border-[#CC785C] shadow-xs'
                        : 'bg-white border-[#E8E2D7] text-[#78716C] hover:border-[#D6CEBE]'
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider">
                      {day.isToday ? 'Today' : day.dayName}
                    </p>
                    <p className="text-sm font-extrabold font-serif mt-0.5">
                      {new Date(day.date + 'T00:00:00').getDate()}{' '}
                      {new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}
                    </p>
                    <p className="text-[10px] mt-0.5">
                      {day.timeSlots.filter(s => s.available).length} slots
                    </p>
                  </button>
                ))}
              </div>

              {/* Time slots grid for selected date */}
              {selectedDate && (
                <Card title={`Available Time Slots`} subtitle={slotsData.slots.find(d => d.date === selectedDate)?.dateLabel}>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                    {slotsData.slots
                      .find(d => d.date === selectedDate)
                      ?.timeSlots.map((slot, idx) => (
                        <button
                          key={idx}
                          disabled={!slot.available}
                          onClick={() => {
                            setSelectedSlot(slot.time);
                            setSelectedProvider(slot.providers?.[0] || null);
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold text-center transition-all ${
                            selectedSlot === slot.time
                              ? 'bg-[#CC785C] text-white border-2 border-[#CC785C] shadow-xs'
                              : slot.available
                                ? 'bg-[#FAF8F5] border border-[#E8E2D7] text-[#1C1917] hover:border-[#CC785C] hover:bg-[#CC785C]/5 cursor-pointer'
                                : 'bg-[#F4F0E8] border border-[#E8E2D7] text-[#A8A29E] cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                  </div>
                </Card>
              )}

              {/* Diagnosing Doctor */}
              {selectedSlot && (
                <Card title="Diagnosing Doctor" subtitle="Follow-up consultation with the doctor who diagnosed and treated you">
                  {(() => {
                    const daySlots = slotsData.slots.find(d => d.date === selectedDate);
                    const slotInfo = daySlots?.timeSlots.find(s => s.time === selectedSlot);
                    const doctor = slotInfo?.providers?.[0] || selectedProvider || slotsData?.diagnosingDoctor;

                    return (
                      <div className="p-4 bg-[#FAF8F5] border-2 border-[#0D9488]/30 rounded-2xl flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-[#0D9488] text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow-xs">
                          <Stethoscope className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-[#1C1917]">{doctor?.name}</p>
                            <span className="px-2 py-0.5 bg-[#0D9488]/10 text-[#0D9488] text-[10px] font-extrabold rounded-md">
                              Diagnosing Physician
                            </span>
                          </div>
                          <p className="text-xs text-[#78716C] mt-0.5">{doctor?.specialty} • {doctor?.hospital}</p>
                          <p className="text-[11px] text-[#A8A29E] mt-1">
                            Your follow-up is scheduled directly with the doctor who diagnosed and managed your care.
                          </p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-[#0D9488] flex-shrink-0" />
                      </div>
                    );
                  })()}
                </Card>
              )}

              {/* Book appointment button */}
              {selectedSlot && (
                <button
                  onClick={handleBookAppointment}
                  disabled={bookingLoading}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-[#0D9488] hover:bg-[#0B8578] disabled:bg-[#D6CEBE] disabled:cursor-not-allowed text-white rounded-2xl text-sm font-bold shadow-xs transition-all cursor-pointer"
                >
                  {bookingLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Booking Appointment...</span>
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-4 h-4" />
                      <span>
                        Book with {selectedProvider?.name || slotsData?.diagnosingDoctor?.name || 'Diagnosing Doctor'} — {selectedSlot} on {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </>
                  )}
                </button>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* STEP 3: Done / Confirmation */}
      {/* ═══════════════════════════════════════════ */}
      {currentStep === 'done' && bookingResult && (
        <div className="space-y-5 animate-fade-in">
          {/* Success Card */}
          <div className="text-center p-8 bg-gradient-to-b from-emerald-50 to-white border border-emerald-200 rounded-2xl shadow-xs">
            <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1C1917] font-serif">Appointment Confirmed!</h2>
            <p className="text-sm text-[#78716C] mt-2 max-w-md mx-auto">
              Your appointment has been successfully booked. We'll send you a reminder before your visit.
            </p>
          </div>

          {/* Appointment Details Card */}
          <Card variant="gradient">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#CC785C] text-white flex items-center justify-center font-bold">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1C1917]">
                    {new Date(bookingResult.date + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-[#78716C]">at {bookingResult.timeSlot}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E8E2D7]">
                <div className="p-3 bg-[#FAF8F5] rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">Doctor</p>
                  <p className="text-xs font-bold text-[#1C1917] mt-1">{bookingResult.providerName}</p>
                  {bookingResult.providerSpecialty && (
                    <p className="text-[11px] text-[#78716C]">{bookingResult.providerSpecialty}</p>
                  )}
                </div>
                <div className="p-3 bg-[#FAF8F5] rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">Location</p>
                  <p className="text-xs font-bold text-[#1C1917] mt-1">{bookingResult.hospital}</p>
                </div>
                <div className="p-3 bg-[#FAF8F5] rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">Urgency</p>
                  <StatusBadge
                    status={bookingResult.urgency === 'urgent' || bookingResult.urgency === 'emergency' ? 'missed' : bookingResult.urgency === 'moderate' ? 'pending' : 'completed'}
                    label={bookingResult.urgency.toUpperCase()}
                  />
                </div>
                <div className="p-3 bg-[#FAF8F5] rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">Booking ID</p>
                  <p className="text-xs font-bold text-[#CC785C] mt-1">{bookingResult._id}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8E2D7]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">Reason</p>
                <p className="text-xs text-[#1C1917] mt-1">{bookingResult.reason}</p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetForm}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#CC785C] hover:bg-[#B86549] text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Submit Another Feedback</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* History Panel (collapsible) */}
      {/* ═══════════════════════════════════════════ */}
      {showHistory && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#1C1917] font-serif flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#CC785C]" />
              Your History
            </h3>
            <div className="flex items-center gap-2">
              {(pastFeedbacks.length > 0 || pastAppointments.length > 0) && (
                <button
                  onClick={handleClearHistory}
                  disabled={clearingHistory}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  title="Clear all feedback and appointment history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{clearingHistory ? 'Clearing...' : 'Clear History'}</span>
                </button>
              )}
              <button onClick={() => setShowHistory(false)} className="p-1.5 rounded-lg hover:bg-[#E8E2D7] transition-colors cursor-pointer">
                <X className="w-4 h-4 text-[#78716C]" />
              </button>
            </div>
          </div>

          {/* Past Appointments */}
          <Card title="Past Appointments" subtitle={`${pastAppointments.length} appointment(s) found`}>
            {pastAppointments.length === 0 ? (
              <p className="text-xs text-[#78716C] text-center py-4">No appointments yet.</p>
            ) : (
              <div className="space-y-2.5">
                {pastAppointments.map(apt => (
                  <div key={apt._id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center flex-shrink-0">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1C1917]">{apt.date} at {apt.timeSlot}</p>
                      <p className="text-[11px] text-[#78716C] truncate">{apt.providerName} — {apt.reason}</p>
                    </div>
                    <StatusBadge status={apt.status === 'confirmed' ? 'completed' : 'pending'} label={apt.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Past Feedbacks */}
          <Card title="Past Condition Reports" subtitle={`${pastFeedbacks.length} report(s) submitted`}>
            {pastFeedbacks.length === 0 ? (
              <p className="text-xs text-[#78716C] text-center py-4">No feedback reports yet.</p>
            ) : (
              <div className="space-y-2.5">
                {pastFeedbacks.map(fb => (
                  <div key={fb._id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#1C1917]">{fb.condition}</span>
                      <StatusBadge
                        status={fb.urgency === 'urgent' || fb.urgency === 'emergency' ? 'missed' : fb.urgency === 'moderate' ? 'pending' : 'completed'}
                        label={fb.urgency}
                      />
                    </div>
                    <p className="text-[11px] text-[#78716C]">
                      Reported on {new Date(fb.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {fb.caregiverNote && (
                      <div className="mt-2 p-2.5 bg-emerald-50/80 border border-emerald-200/90 rounded-lg text-xs text-emerald-950">
                        <span className="font-bold text-emerald-900 block mb-0.5">Reviewed by Family:</span>
                        <p className="italic">"{fb.caregiverNote}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Safety disclaimer */}
      <div className="p-3 bg-[#CC785C]/5 border border-[#CC785C]/15 rounded-xl flex items-center gap-2 text-[11px] text-[#78716C]">
        <AlertTriangle className="w-3.5 h-3.5 text-[#CC785C] flex-shrink-0" />
        <span>
          <strong className="text-[#CC785C]">Note:</strong> This is a feedback tool, not a substitute for emergency medical care. If you are experiencing a medical emergency, call the hospital helpline immediately.
        </span>
      </div>
    </PageContainer>
  );
}
