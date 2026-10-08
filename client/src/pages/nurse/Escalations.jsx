import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { getNurseAlerts, resolveNurseEscalation } from '../../services/nurseService';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  AlertTriangle,
  Pill,
  HelpCircle,
  BrainCircuit,
  MessageSquare,
  Clock,
  CheckCircle2,
  FileText,
  UserCheck,
  Search,
  ListFilter,
  ArrowRight,
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';

export default function Escalations() {
  const navigate = useNavigate();
  const { setActivePatientId } = useApp();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Resolution modal state
  const [selectedAlertForResolution, setSelectedAlertForResolution] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNurseAlerts(categoryFilter, statusFilter);
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load nurse escalation alerts:', err);
      setError('Unable to load clinical risk escalations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [categoryFilter, statusFilter]);

  const handlePatientNavigate = (patientId) => {
    if (!patientId) return;
    setActivePatientId(patientId);
    navigate(`/nurse/patients/${patientId}`);
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveNurseEscalation(alertId, resolutionNotes || 'Addressed and verified by nurse during clinical check-in.');
      setSelectedAlertForResolution(null);
      setResolutionNotes('');
      await loadAlerts();
    } catch (err) {
      console.error('Failed to resolve escalation alert:', err);
    }
  };

  // Category Icon & Color Mapping
  const getCategoryMeta = (cat) => {
    switch (cat) {
      case 'missed_medication':
        return {
          icon: Pill,
          bg: 'bg-[#CC785C]/10',
          text: 'text-[#CC785C]',
          border: 'border-[#CC785C]/20',
          badgeStatus: 'missed',
          label: 'Missed Medication'
        };
      case 'repeated_missed_medication':
        return {
          icon: AlertTriangle,
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          badgeStatus: 'missed',
          label: 'Repeated Missed Medication'
        };
      case 'low_quiz_score':
        return {
          icon: HelpCircle,
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          badgeStatus: 'pending',
          label: 'Low Quiz Score'
        };
      case 'knowledge_gap':
        return {
          icon: BrainCircuit,
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          border: 'border-indigo-200',
          badgeStatus: 'info',
          label: 'Knowledge Gap'
        };
      case 'medication_question':
        return {
          icon: MessageSquare,
          bg: 'bg-cyan-50',
          text: 'text-cyan-700',
          border: 'border-cyan-200',
          badgeStatus: 'info',
          label: 'Medication Question'
        };
      case 'warning_sign':
        return {
          icon: ShieldAlert,
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          badgeStatus: 'missed',
          label: 'Warning Sign Alert'
        };
      case 'missing_information':
        return {
          icon: FileText,
          bg: 'bg-stone-100',
          text: 'text-stone-700',
          border: 'border-stone-200',
          badgeStatus: 'pending',
          label: 'Missing Information'
        };
      case 'overdue_task':
        return {
          icon: Clock,
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          badgeStatus: 'pending',
          label: 'Overdue Task'
        };
      default:
        return {
          icon: AlertCircle,
          bg: 'bg-stone-100',
          text: 'text-stone-700',
          border: 'border-stone-200',
          badgeStatus: 'info',
          label: cat.replace(/_/g, ' ')
        };
    }
  };

  // Exact severity mapping - preserving backend priority values exactly
  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'HIGH':
        return <StatusBadge status="missed" label="HIGH PRIORITY" />;
      case 'MEDIUM':
        return <StatusBadge status="pending" label="MEDIUM PRIORITY" />;
      case 'LOW':
        return <StatusBadge status="completed" label="LOW PRIORITY" />;
      default:
        return <StatusBadge status="info" label={severity || 'ROUTINE'} />;
    }
  };

  const filteredAlerts = alerts.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.patientName.toLowerCase().includes(q) ||
      item.patientId.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q) ||
      item.formattedCategory.toLowerCase().includes(q)
    );
  });

  const activeAlertCount = alerts.filter((a) => a.status === 'OPEN' || a.status === 'IN_REVIEW').length;

  if (loading) {
    return (
      <PageContainer title="Clinical Risk Escalations">
        <LoadingState message="Loading risk escalations, category telemetry, and patient associations..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Clinical Risk Escalations">
        <ErrorState
          title="Escalations Unavailable"
          message={error}
          onRetry={loadAlerts}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Clinical Risk Escalations"
      subtitle="Prioritized clinical risk alerts requiring nurse review, teach-back reinforcement, or patient outreach."
      badge={
        <StatusBadge
          status={activeAlertCount > 0 ? 'missed' : 'completed'}
          label={`${activeAlertCount} Active Escalation${activeAlertCount === 1 ? '' : 's'}`}
        />
      }
    >
      {/* Category Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'ALL', label: 'All Categories' },
          { id: 'missed_medication', label: 'Missed Medication' },
          { id: 'repeated_missed_medication', label: 'Repeated Missed' },
          { id: 'low_quiz_score', label: 'Low Quiz Score' },
          { id: 'knowledge_gap', label: 'Knowledge Gap' },
          { id: 'medication_question', label: 'Medication Question' },
          { id: 'warning_sign', label: 'Warning Signs' }
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-2xs cursor-pointer ${
              categoryFilter === cat.id
                ? 'bg-[#0D9488] text-white border border-[#0D9488]'
                : 'bg-white text-[#78716C] border border-[#E8E2D7] hover:border-[#0D9488] hover:text-[#1C1917]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search & Filter Toolbar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
            <input
              type="text"
              placeholder="Search by patient, category, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#0D9488] shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-bold text-[#78716C]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-[#E8E2D7] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1C1917] focus:outline-none focus:border-[#0D9488] shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Only</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Escalation Cards List */}
      {filteredAlerts.length === 0 ? (
        <Card className="text-center py-12">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-[#1C1917] font-serif">No Matching Escalations</h3>
            <p className="text-xs text-[#78716C]">
              There are no risk escalation alerts matching your selected category and status filters.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((esc) => {
            const catMeta = getCategoryMeta(esc.category);
            const Icon = catMeta.icon;
            const isResolved = esc.status === 'RESOLVED';

            return (
              <Card
                key={esc._id}
                className={`transition-all ${
                  isResolved
                    ? 'bg-[#FAF8F5]/60 border-[#E8E2D7] opacity-80'
                    : 'bg-white border-[#E8E2D7] hover:border-[#0D9488] shadow-2xs'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Header: Patient Context + Category + Exact Severity + Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F4F0E8]">
                    {/* Patient Context with Clickable Navigation */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${catMeta.bg} ${catMeta.text} border ${catMeta.border} flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handlePatientNavigate(esc.patientId)}
                            className="text-base font-extrabold text-[#1C1917] font-serif hover:text-[#0D9488] transition-colors flex items-center gap-1 cursor-pointer text-left"
                            title="Navigate to patient record"
                          >
                            <span>{esc.patientName}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#0D9488]" />
                          </button>
                          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#E8E2D7]/60 text-[#78716C]">
                            {esc.patientId}
                          </span>
                          {esc.patientAge && (
                            <span className="text-xs text-[#78716C] font-semibold">
                              ({esc.patientGender}, {esc.patientAge} yrs)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#78716C] mt-0.5">{esc.recoveryContext}</p>
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${catMeta.bg} ${catMeta.text} ${catMeta.border}`}>
                        {esc.formattedCategory}
                      </span>
                      {getSeverityBadge(esc.severity)}
                      <StatusBadge
                        status={esc.status === 'OPEN' ? 'missed' : esc.status === 'IN_REVIEW' ? 'pending' : 'completed'}
                        label={esc.status}
                      />
                    </div>
                  </div>

                  {/* Body: Reason Description */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#1C1917] leading-relaxed">
                      {esc.reason}
                    </p>

                    {/* Related Medication / Event Metadata */}
                    <div className="flex items-center gap-4 flex-wrap text-xs text-[#78716C] pt-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
                        <span>Logged: <strong>{esc.formattedTimestamp}</strong></span>
                      </span>

                      {esc.relatedMedication && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <Pill className="w-3.5 h-3.5 text-[#CC785C]" />
                          <span>Related Med: <strong className="text-[#1C1917]">{esc.relatedMedication}</strong></span>
                        </span>
                      )}

                      {esc.relatedEvent && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <FileText className="w-3.5 h-3.5 text-[#0D9488]" />
                          <span>Event Ref: <code className="font-mono bg-[#E8E2D7]/50 px-1 rounded text-[#1C1917]">{esc.relatedEvent}</code></span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Supporting Evidence List */}
                  {esc.evidence && esc.evidence.length > 0 && (
                    <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#78716C]">
                        <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
                        <span>Supporting Telemetry Evidence</span>
                      </div>
                      <ul className="space-y-1">
                        {esc.evidence.map((item, idx) => (
                          <li key={idx} className="text-xs text-[#1C1917] font-medium flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Resolution Footnote if resolved */}
                  {isResolved && esc.resolution && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span><strong>Resolution:</strong> {esc.resolution} (Resolved by {esc.resolvedBy})</span>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <span className="text-[11px] font-mono text-[#78716C]">
                      Alert ID: {esc._id} • Assigned: {esc.assignedTo}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePatientNavigate(esc.patientId)}
                        className="px-3 py-1.5 bg-white hover:bg-[#FAF8F5] border border-[#E8E2D7] text-[#0D9488] font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>View Patient Detail</span>
                      </button>

                      {!isResolved && (
                        <button
                          onClick={() => setSelectedAlertForResolution(esc)}
                          className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0f766e] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Resolve Alert</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolve Alert Modal */}
      {selectedAlertForResolution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-[#E8E2D7] rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D7]">
              <div className="flex items-center gap-2 text-[#0D9488] font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Resolve Clinical Escalation</span>
              </div>
              <button
                onClick={() => setSelectedAlertForResolution(null)}
                className="p-1 rounded-lg hover:bg-[#F4F0E8] text-[#78716C] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#78716C]">Patient:</span>
                <p className="font-bold text-[#1C1917]">
                  {selectedAlertForResolution.patientName} ({selectedAlertForResolution.patientId})
                </p>
              </div>

              <div>
                <span className="text-[#78716C]">Escalation Reason:</span>
                <p className="font-semibold text-[#1C1917] mt-0.5">{selectedAlertForResolution.reason}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1C1917]">Resolution Documentation:</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g., Contacted patient by phone; confirmed medication schedule and reinforced meal timing instructions..."
                  className="w-full p-3 bg-[#FAF8F5] border border-[#E8E2D7] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedAlertForResolution(null)}
                className="px-3 py-1.5 bg-white border border-[#E8E2D7] text-[#78716C] font-bold text-xs rounded-xl cursor-pointer hover:bg-[#FAF8F5]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveAlert(selectedAlertForResolution._id)}
                className="px-4 py-1.5 bg-[#0D9488] hover:bg-[#0f766e] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
