import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import {
  getPatientFeedbacks,
  reviewFeedback,
  getCaregiverPatients,
  sendEncouragement
} from '../../services/caregiverService';
import { useApp } from '../../context/AppContext';
import {
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Heart,
  Send,
  User,
  Filter,
  Check,
  PhoneCall,
  Activity,
  Smile,
  ShieldCheck,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useRealtimeSync } from '../../utils/realtimeSync';

export default function CaregiverFeedback() {
  const { activePatientId, setActivePatientId, currentUser } = useApp();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [linkedPatients, setLinkedPatients] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'urgent', 'reviewed'

  // Reviewing feedback states
  const [reviewingId, setReviewingId] = useState(null);
  const [caregiverNoteText, setCaregiverNoteText] = useState({});
  const [submittingReview, setSubmittingReview] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Quick Encouragement State
  const [quickEncouragement, setQuickEncouragement] = useState('');
  const [sendingQuick, setSendingQuick] = useState(false);

  const caregiverId = currentUser?.role === 'caregiver' ? currentUser._id : 'U101';
  const patientId = activePatientId || 'P001';

  const loadFeedbacks = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const [patientsRes, feedbacksRes] = await Promise.all([
        getCaregiverPatients(caregiverId),
        getPatientFeedbacks(patientId)
      ]);

      const pts = patientsRes.patients || [];
      setLinkedPatients(pts);

      // If active patient is not in linked patients, automatically align to first linked patient
      if (currentUser?.role === 'caregiver' && pts.length > 0 && !pts.some((p) => p._id === patientId)) {
        const firstId = pts[0]._id;
        setActivePatientId(firstId);
        const realignedFeedbacks = await getPatientFeedbacks(firstId);
        setFeedbacks(Array.isArray(realignedFeedbacks) ? realignedFeedbacks : []);
        return;
      }

      setFeedbacks(Array.isArray(feedbacksRes) ? feedbacksRes : []);
    } catch (err) {
      if (!isSilent) {
        console.error('Failed to load patient feedbacks:', err);
        setError('Unable to load loved one’s feedback entries. Please retry.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Real-time synchronization with patient updates
  const { isLiveConnected, isRefreshing, refreshNow } = useRealtimeSync({
    patientId,
    onUpdate: (isSilent) => loadFeedbacks(isSilent),
    pollingInterval: 3000,
    enabled: true
  });

  useEffect(() => {
    loadFeedbacks(false);
  }, [patientId]);

  const handleReview = async (feedbackId) => {
    try {
      setSubmittingReview(true);
      const note = caregiverNoteText[feedbackId] || 'Acknowledged and noted by family caregiver.';
      const updated = await reviewFeedback(patientId, feedbackId, {
        caregiverId,
        caregiverName: currentUser?.name || 'Family Caregiver',
        caregiverNote: note,
        status: 'reviewed'
      });

      setFeedbacks((prev) =>
        prev.map((f) => (f._id === feedbackId ? { ...f, ...updated, status: 'reviewed', reviewStatus: 'reviewed' } : f))
      );

      setReviewingId(null);
      setToastMessage('Feedback marked as reviewed with your note.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to review feedback:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSendEncouragement = async (e) => {
    e.preventDefault();
    if (!quickEncouragement.trim()) return;

    try {
      setSendingQuick(true);
      await sendEncouragement(patientId, {
        caregiverId,
        caregiverName: currentUser?.name || 'Family Caregiver',
        message: quickEncouragement,
        tag: 'love'
      });
      setQuickEncouragement('');
      setToastMessage('Encouragement note sent to your loved one!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Failed to send encouragement:', err);
    } finally {
      setSendingQuick(false);
    }
  };

  const activePatientObj = linkedPatients.find((p) => p._id === patientId) || {
    _id: patientId,
    name: 'Loved One',
    relationship: 'Family Member'
  };

  const isPendingFeedback = (f) =>
    f.status === 'pending' ||
    f.status === 'pending_review' ||
    f.status === 'submitted' ||
    f.reviewStatus === 'pending' ||
    (!f.reviewedAt && f.status !== 'reviewed');

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter((f) => {
    const isPending = isPendingFeedback(f);
    const isUrgent = f.urgency === 'urgent' || f.urgency === 'high' || f.urgency === 'emergency';

    if (activeFilter === 'pending') return isPending;
    if (activeFilter === 'urgent') return isUrgent;
    if (activeFilter === 'reviewed') return !isPending;
    return true;
  });

  const pendingCount = feedbacks.filter(isPendingFeedback).length;

  return (
    <PageContainer
      title="Patient Feedback Review"
      subtitle={`Review symptom updates, daily feelings, and notes sent by ${activePatientObj.name}`}
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
            <span>Daily Report</span>
          </button>
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            &times;
          </button>
        </div>
      )}

      {/* Hero Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#2B2724] to-[#3D3733] text-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-300">Total Check-in Notes</p>
            <p className="text-2xl font-serif font-bold text-white mt-0.5">{feedbacks.length}</p>
            <p className="text-[11px] text-stone-300 mt-1">Submitted during home recovery</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#CC785C] flex items-center justify-center text-white">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D7] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">Awaiting Caregiver Review</p>
            <p className="text-2xl font-serif font-bold text-[#CC785C] mt-0.5">{pendingCount}</p>
            <p className="text-[11px] text-[#78716C] mt-1">
              {pendingCount > 0 ? 'Action suggested' : 'All feedback reviewed'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D7] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">Caregiver Support</p>
            <p className="text-2xl font-serif font-bold text-emerald-700 mt-0.5">
              {feedbacks.length - pendingCount}
            </p>
            <p className="text-[11px] text-[#78716C] mt-1">Acknowledged with care notes</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Family Encouragement Bar */}
      <Card className="p-4 sm:p-5 mb-6 border border-[#E8E2D7] bg-gradient-to-r from-[#FAF8F5] via-white to-[#FAF8F5] shadow-xs">
        <form onSubmit={handleSendEncouragement} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#CC785C]/15 text-[#CC785C] flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1C1917]">Send Loved One Encouragement</p>
              <p className="text-[10px] text-[#78716C]">Deliver a supportive note right to their dashboard</p>
            </div>
          </div>
          <input
            type="text"
            value={quickEncouragement}
            onChange={(e) => setQuickEncouragement(e.target.value)}
            placeholder={`Send loving words to ${activePatientObj.name} (e.g. "Proud of your walking today, Mom! Take it easy.")`}
            className="flex-1 bg-white border border-[#E8E2D7] rounded-xl px-3.5 py-2 text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#CC785C] focus:ring-2 focus:ring-[#CC785C]/15"
          />
          <button
            type="submit"
            disabled={sendingQuick || !quickEncouragement.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#CC785C] hover:bg-[#B5674E] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingQuick ? 'Sending...' : 'Send Note'}</span>
          </button>
        </form>
      </Card>

      {/* Feed Filter Tabs */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E2D7] flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[#78716C] mr-1" />
          {[
            { id: 'all', label: `All Notes (${feedbacks.length})` },
            { id: 'pending', label: `Needs Review (${pendingCount})` },
            { id: 'urgent', label: 'Urgent / Priority' },
            { id: 'reviewed', label: 'Reviewed' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-[#1C1917] text-white shadow-2xs'
                  : 'bg-[#FAF8F5] text-[#78716C] hover:text-[#1C1917] border border-[#E8E2D7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-[#78716C]">
          Showing {filteredFeedbacks.length} of {feedbacks.length} notes
        </span>
      </div>

      {/* Feedbacks List */}
      {loading ? (
        <LoadingState message="Loading patient feedback notes..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadFeedbacks} />
      ) : filteredFeedbacks.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#FAF8F5] border border-[#E8E2D7]">
          <Smile className="w-8 h-8 text-[#A8A29E] mx-auto mb-2" />
          <p className="text-sm font-bold text-[#1C1917]">No feedback items in this view</p>
          <p className="text-xs text-[#78716C] mt-1">
            {activeFilter === 'pending'
              ? 'Great news! All submitted notes have been acknowledged.'
              : 'Your loved one has not submitted notes matching this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((f) => {
            const isPending = isPendingFeedback(f);
            const isUrgent = f.urgency === 'urgent' || f.urgency === 'high' || f.urgency === 'emergency';
            const isCurrentlyEditing = reviewingId === f._id;

            return (
              <Card
                key={f._id}
                className={`p-5 sm:p-6 transition-all border ${
                  isUrgent
                    ? 'border-rose-300 bg-rose-50/20 shadow-xs'
                    : isPending
                    ? 'border-amber-200 bg-white shadow-2xs'
                    : 'border-[#E8E2D7] bg-[#FAF8F5]/60'
                }`}
              >
                {/* Header: Date + Urgency + Status */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 mb-3 border-b border-[#E8E2D7]/70">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1C1917]">
                      {f.submittedAt
                        ? new Date(f.submittedAt).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Recent Check-in'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : f.urgency === 'moderate'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {f.urgency || 'Normal'} Urgency
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Awaiting Family Review</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Reviewed by Family</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Content: Reported Condition & Patient Notes */}
                <div className="space-y-3 mb-4">
                  {/* Primary Reported Health Condition / Concern */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#FAF8F5] to-white border border-[#E8E2D7]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-[#CC785C]/15 text-[#CC785C] flex items-center justify-center">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                        Patient's Reported Condition:
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#1C1917] ml-8">
                      {f.condition || 'General Post-Discharge Health Check-in'}
                    </p>
                  </div>

                  {/* Symptoms & Feelings Snapshot */}
                  {Array.isArray(f.symptoms) && f.symptoms.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="text-[#78716C] font-semibold">Reported Feelings / Symptoms:</span>
                      {f.symptoms.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E8E2D7] text-[11px] font-medium text-[#1C1917]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Patient's Note / Details */}
                  {f.notes && (
                    <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D7]">
                      <p className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                        Additional Note from {activePatientObj.name}:
                      </p>
                      <p className="text-xs text-[#1C1917] leading-relaxed italic">
                        "{f.notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Caregiver Review Section */}
                {!isPending ? (
                  /* Display existing review info */
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        Caregiver Acknowledgment Note:
                      </span>
                      <span className="text-[10px] text-emerald-700">
                        {f.reviewedAt ? new Date(f.reviewedAt).toLocaleDateString() : 'Acknowledged'}
                      </span>
                    </div>
                    <p className="text-emerald-950 font-medium">
                      "{f.caregiverNote || 'Acknowledged and verified during daily family check-in.'}"
                    </p>
                  </div>
                ) : (
                  /* Action to review */
                  <div className="space-y-3 pt-2 border-t border-[#E8E2D7]">
                    {isCurrentlyEditing ? (
                      <div className="space-y-2 animate-fade-in">
                        <label className="text-xs font-bold text-[#1C1917] block">
                          Add a note or action for family records:
                        </label>
                        <textarea
                          rows={2}
                          value={caregiverNoteText[f._id] || ''}
                          onChange={(e) =>
                            setCaregiverNoteText({
                              ...caregiverNoteText,
                              [f._id]: e.target.value
                            })
                          }
                          placeholder="e.g. Checked on Mom, got her an ice pack and reminded her to rest before dinner."
                          className="w-full p-2.5 rounded-xl border border-[#E8E2D7] text-xs bg-white text-[#1C1917] focus:outline-none focus:border-[#CC785C] focus:ring-2 focus:ring-[#CC785C]/15"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setReviewingId(null)}
                            className="px-3 py-1.5 rounded-xl border border-[#E8E2D7] text-xs font-bold text-[#78716C] hover:bg-[#FAF8F5] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReview(f._id)}
                            disabled={submittingReview}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{submittingReview ? 'Saving...' : 'Confirm Review'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setReviewingId(f._id);
                              if (!caregiverNoteText[f._id]) {
                                setCaregiverNoteText({
                                  ...caregiverNoteText,
                                  [f._id]: 'Acknowledged and checked on loved one.'
                                });
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#CC785C] hover:bg-[#B5674E] text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark as Reviewed</span>
                          </button>

                          <button
                            onClick={() => {
                              setReviewingId(f._id);
                            }}
                            className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F4F0E8] border border-[#E8E2D7] text-xs font-bold text-[#1C1917] rounded-xl transition-all cursor-pointer"
                          >
                            Add Caregiver Note
                          </button>
                        </div>

                        {isUrgent && (
                          <a
                            href="tel:18005550199"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call Clinic Care Team</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
