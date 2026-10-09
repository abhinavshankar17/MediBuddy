import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import { getPatientInsight, getEvidenceEvents, getPatientEncouragements } from '../../services/insightService';
import { useApp } from '../../context/AppContext';
import { useRealtimeSync } from '../../utils/realtimeSync';
import {
  Lightbulb,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
  Info,
  CheckCircle2,
  XCircle,
  Eye,
  Heart,
  X
} from 'lucide-react';

export default function PatientInsight() {
  const { t, i18n } = useTranslation();
  const { currentUser, activePatientId } = useApp();
  const patientId = activePatientId || currentUser?.patientId || 'P001';

  const [insight, setInsight] = useState(null);
  const [evidenceEvents, setEvidenceEvents] = useState([]);
  const [encouragements, setEncouragements] = useState([]);
  
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadInsightData = async (targetId = patientId, isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
        setError(null);
      }

      const [pInsight, encs] = await Promise.all([
        getPatientInsight(targetId),
        getPatientEncouragements(targetId)
      ]);
      setInsight(pInsight);
      setEncouragements(Array.isArray(encs) ? encs : []);

      if (pInsight && pInsight.evidenceEventIds && pInsight.evidenceEventIds.length > 0) {
        const events = await getEvidenceEvents(pInsight.evidenceEventIds);
        setEvidenceEvents(events);
      } else {
        setEvidenceEvents([]);
      }
    } catch (err) {
      if (!isSilent) {
        console.error('Failed to load patient insight:', err);
        setError('Unable to load care insights. Please try again.');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useRealtimeSync({
    patientId,
    onUpdate: (isSilent) => loadInsightData(patientId, isSilent !== false),
    pollingInterval: 4000,
    enabled: true
  });

  useEffect(() => {
    loadInsightData(patientId, false);
  }, [patientId]);

  if (loading) {
    return (
      <PageContainer title="Personalized Care Insights">
        <LoadingState message="Synthesizing personalized recovery insights & ground-truth evidence..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Personalized Care Insights">
        <ErrorState
          title="Care Insights Unavailable"
          message={error}
          onRetry={() => loadInsightData(activePatientId || currentUser?.patientId || 'P001')}
        />
      </PageContainer>
    );
  }

  if (!insight) {
    return (
      <PageContainer title="Personalized Care Insights">
        <EmptyState
          title="No Insights Found"
          description="There are currently no care insights available for this patient profile."
        />
      </PageContainer>
    );
  }

  const priorityBadgeMap = {
    HIGH: { status: 'missed', label: 'Priority: HIGH' },
    MEDIUM: { status: 'pending', label: 'Priority: MEDIUM' },
    LOW: { status: 'completed', label: 'Priority: LOW' }
  };

  const formattedDate = insight.generatedAt
    ? new Date(insight.generatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Oct 08, 2026';

  const activeLang = i18n.language || 'en';
  const displayedSummary = activeLang === 'ta' && insight.aiSummaryTa
    ? insight.aiSummaryTa
    : activeLang === 'hi' && insight.aiSummaryHi
    ? insight.aiSummaryHi
    : insight.aiSummary;

  return (
    <PageContainer
      title={t('insights.title', 'Personalized Recovery Insights')}
      subtitle={t('insights.subtitle', 'Synthesized knowledge strengths, gaps, and ground-truth evidence.')}
      actions={
        <StatusBadge
          status={priorityBadgeMap[insight.priority]?.status}
          label={priorityBadgeMap[insight.priority]?.label}
        />
      }
    >
      {/* REQUIRED AI DISCLAIMER LABEL */}
      <div className="p-3 bg-[#CC785C]/10 border border-[#CC785C]/25 rounded-xl flex items-center justify-between text-xs text-[#1C1917]">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="w-4 h-4 text-[#CC785C] flex-shrink-0" />
          <span>
            <strong className="text-[#CC785C]">{t('common.aiGeneratedWarning', 'AI-generated — verify before acting')}.</strong> {t('insights.subtitle', 'Educational insights synthesize patient recovery check-ins and dosage log events.')}
          </span>
        </div>
        <span className="text-[10px] font-bold text-[#78716C] bg-white px-2.5 py-0.5 rounded border border-[#E8E2D7] hidden sm:inline">
          {t('common.date', 'Generated')}: {formattedDate}
        </span>
      </div>

      {/* AI Summary Card */}
      <Card className="bg-gradient-to-br from-white via-[#FAF8F5] to-[#F4F0E8]/50 border-[#E8E2D7]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#CC785C]/15 text-[#CC785C]">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1C1917] font-serif">{t('insights.clinicalSummary', 'Recovery Overview & Focus Signal')}</h3>
                <p className="text-xs text-[#78716C]">{t('insights.comprehensionScore', 'Comprehension Rating')}: {insight.score}%</p>
              </div>
            </div>

            {evidenceEvents.length > 0 && (
              <button
                onClick={() => setShowEvidenceModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-xs font-bold text-[#CC785C] shadow-2xs transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t('insights.evidenceEvents', 'Inspect Evidence')} ({evidenceEvents.length})</span>
              </button>
            )}
          </div>

          <p className="text-xs sm:text-sm text-[#1C1917] leading-relaxed font-medium bg-white p-4 rounded-xl border border-[#E8E2D7]">
            "{displayedSummary}"
          </p>
        </div>
      </Card>

      {/* Family Encouragements & Messages Section */}
      <Card
        className="border-[#E8E2D7] bg-gradient-to-br from-white via-[#FAF8F5] to-rose-50/20 shadow-xs"
        title="Family Encouragements & Messages"
        subtitle="Personal words of love and support sent by your family to cheer on your daily recovery"
        badge={
          encouragements.length > 0 ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <Heart className="w-3 h-3 text-rose-500 fill-current" />
              <span>{encouragements.length} {encouragements.length === 1 ? 'Message' : 'Messages'}</span>
            </span>
          ) : null
        }
      >
        {encouragements.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-[#FAF8F5] border border-[#E8E2D7]">
            <Heart className="w-8 h-8 text-[#A8A29E] mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-[#1C1917]">No family messages yet today</p>
            <p className="text-[11px] text-[#78716C] mt-0.5 max-w-sm mx-auto">
              When your family members send supportive notes from their portal, they will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {encouragements.map((enc) => {
              const tagConfig = {
                love: { label: 'With Love', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: '❤️' },
                thumbs_up: { label: 'High Five', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '👍' },
                support: { label: 'Stay Strong', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: '💪' },
                reminder: { label: 'Care Note', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: '💌' }
              }[enc.tag] || { label: 'Family Note', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: '❤️' };

              return (
                <div
                  key={enc._id}
                  className="p-4 rounded-2xl bg-white border border-[#E8E2D7] shadow-2xs hover:shadow-xs hover:border-[#CC785C]/40 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-100/70 text-rose-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <span className="font-bold text-xs text-[#1C1917]">
                        {enc.caregiverName || 'Family Member'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tagConfig.bg}`}>
                        {tagConfig.icon} {tagConfig.label}
                      </span>
                      <span className="text-[10px] text-[#78716C]">
                        {enc.sentAt
                          ? new Date(enc.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Today'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E2D7]/80">
                    <p className="text-xs text-[#1C1917] leading-relaxed italic font-medium">
                      "{enc.message}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Strengths & Weaknesses Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Knowledge Strengths Card */}
        <Card title="Knowledge Strengths" subtitle="Areas with confirmed understanding">
          {insight.strengths && insight.strengths.length > 0 ? (
            <div className="space-y-2.5">
              {insight.strengths.map((str, idx) => (
                <div key={idx} className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center gap-3 text-xs text-emerald-900 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#059669] flex-shrink-0" />
                  <span>{str}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#78716C]">No specific strengths recorded.</p>
          )}
        </Card>

        {/* Knowledge Gaps & Focus Areas Card */}
        <Card title="Focus Areas & Reinforcement" subtitle="Topics suggested for review">
          {insight.weaknesses && insight.weaknesses.length > 0 ? (
            <div className="space-y-2.5">
              {insight.weaknesses.map((weak, idx) => (
                <div key={idx} className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
                  <div>
                    <span>Review: {weak}</span>
                    <p className="text-[11px] text-amber-800 font-normal mt-0.5">
                      Reinforce this instruction topic during your next care routine.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-900 font-bold">
              ✓ All key instruction topics understood well.
            </div>
          )}
        </Card>
      </div>

      {/* Missed Instructions Grounding */}
      {insight.missedInstructions && insight.missedInstructions.length > 0 && (
        <Card title="Discharge Sentences Suggested for Review" subtitle="Exact source text from discharge instructions">
          <div className="space-y-2.5">
            {insight.missedInstructions.map((sentence, idx) => (
              <div key={idx} className="p-3.5 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl flex items-start gap-3 text-xs text-[#1C1917]">
                <FileText className="w-4 h-4 text-[#CC785C] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">"{sentence}"</p>
                  <p className="text-[10px] text-[#78716C] italic">Source: Clinical Discharge Documentation</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Evidence Grounding Inspection Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-[#E8E2D7] rounded-2xl p-6 max-w-xl w-full shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D7]">
              <div className="flex items-center gap-2 text-[#CC785C] font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Supporting Event Evidence Grounding</span>
              </div>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="p-1 rounded-lg hover:bg-[#F4F0E8] text-[#78716C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#78716C]">
              The following ground-truth log events from the dataset support this AI insight:
            </p>

            <div className="space-y-3">
              {evidenceEvents.map((evt) => (
                <div key={evt._id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-[#1C1917]">
                    <span>Event ID: {evt._id} ({evt.type})</span>
                    <StatusBadge status="info" label={evt.actor || 'Patient'} />
                  </div>
                  {evt.payload && (
                    <p className="text-[#78716C]">
                      Payload: <code className="bg-[#E8E2D7]/50 px-1 rounded text-[11px] font-mono">{JSON.stringify(evt.payload)}</code>
                    </p>
                  )}
                  <p className="text-[10px] text-[#A8A29E]">Timestamp: {new Date(evt.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="px-4 py-2 bg-[#CC785C] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Close Grounding Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
