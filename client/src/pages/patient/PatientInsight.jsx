import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import { getPatientInsight, getEvidenceEvents } from '../../services/insightService';
import { useApp } from '../../context/AppContext';
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
  X
} from 'lucide-react';

export default function PatientInsight() {
  const { currentUser, activePatientId } = useApp();

  const [insight, setInsight] = useState(null);
  const [evidenceEvents, setEvidenceEvents] = useState([]);
  
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadInsightData = async (patientId) => {
    try {
      setLoading(true);
      setError(null);

      const pInsight = await getPatientInsight(patientId);
      setInsight(pInsight);

      if (pInsight && pInsight.evidenceEventIds && pInsight.evidenceEventIds.length > 0) {
        const events = await getEvidenceEvents(pInsight.evidenceEventIds);
        setEvidenceEvents(events);
      } else {
        setEvidenceEvents([]);
      }
    } catch (err) {
      console.error('Failed to load patient insight:', err);
      setError('Unable to load care insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsightData(activePatientId || currentUser?.patientId || 'P001');
  }, [activePatientId, currentUser]);

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

  return (
    <PageContainer
      title="Personalized Recovery Insights"
      subtitle="Synthesized knowledge strengths, gaps, and ground-truth evidence."
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
            <strong className="text-[#CC785C]">AI-generated — verify before acting.</strong> Educational insights synthesize patient recovery check-ins and dosage log events.
          </span>
        </div>
        <span className="text-[10px] font-bold text-[#78716C] bg-white px-2.5 py-0.5 rounded border border-[#E8E2D7] hidden sm:inline">
          Generated: {formattedDate}
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
                <h3 className="text-lg font-bold text-[#1C1917] font-serif">Recovery Overview & Focus Signal</h3>
                <p className="text-xs text-[#78716C]">Comprehension Rating: {insight.score}%</p>
              </div>
            </div>

            {evidenceEvents.length > 0 && (
              <button
                onClick={() => setShowEvidenceModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-xs font-bold text-[#CC785C] shadow-2xs transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Inspect Evidence ({evidenceEvents.length})</span>
              </button>
            )}
          </div>

          <p className="text-xs sm:text-sm text-[#1C1917] leading-relaxed font-medium bg-white p-4 rounded-xl border border-[#E8E2D7]">
            "{insight.aiSummary}"
          </p>
        </div>
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
