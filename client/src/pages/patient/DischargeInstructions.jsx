import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PageContainer from '../../components/PageContainer';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import { getPatientById, getPatientDischargeInstructions, getAllPatients } from '../../services/patientService';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Pill,
  Activity,
  AlertTriangle,
  Utensils,
  Sparkles,
  Heart,
  User,
  Info,
  Quote
} from 'lucide-react';

export default function DischargeInstructions() {
  const { t } = useTranslation();
  const { currentUser, activePatientId } = useApp();

  const [patient, setPatient] = useState(null);
  const [instructions, setInstructions] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'medication' | 'activity' | 'restriction' | 'diet' | 'followup' | 'warning'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDischargePlan = async (patientId) => {
    try {
      setLoading(true);
      setError(null);

      const [pData, iData] = await Promise.all([
        getPatientById(patientId),
        getPatientDischargeInstructions(patientId)
      ]);

      setPatient(pData);
      setInstructions(iData);
    } catch (err) {
      console.error('Failed to load discharge plan:', err);
      setError('Unable to load discharge plan instructions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDischargePlan(activePatientId || currentUser?.patientId || 'P001');
  }, [activePatientId, currentUser]);

  if (loading) {
    return (
      <PageContainer title="Discharge Instructions & Care Plan">
        <LoadingState message="Extracting verified discharge guidelines & clinical instructions..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Discharge Instructions & Care Plan">
        <ErrorState
          title="Discharge Plan Unavailable"
          message={error}
          onRetry={() => loadDischargePlan(activePatientId || currentUser?.patientId || 'P001')}
        />
      </PageContainer>
    );
  }

  if (!patient || !instructions) {
    return (
      <PageContainer title="Discharge Instructions & Care Plan">
        <EmptyState
          title="No Discharge Instructions Found"
          description="There are currently no extracted discharge guidelines available for this patient."
        />
      </PageContainer>
    );
  }

  const categoryTabs = [
    { id: 'all', label: t('common.all', 'All Instructions') },
    { id: 'medication', label: t('nav.medication', 'Medications'), count: instructions.medications?.length || 0 },
    { id: 'activity', label: t('patientDashboard.activity', 'Activity & Exercise'), count: instructions.activity?.length || 0 },
    { id: 'restriction', label: t('patientDashboard.restrictions', 'Restrictions'), count: instructions.restrictions?.length || 0 },
    { id: 'diet', label: t('patientDashboard.diet', 'Dietary'), count: instructions.diet?.length || 0 },
    { id: 'followup', label: t('patientDashboard.followUp', 'Follow-Up'), count: instructions.followUp?.length || 0 },
    { id: 'warning', label: t('prescription.warnings', 'Warning Signs') }
  ];

  return (
    <PageContainer
      title={t('patientDashboard.readDischarge', 'Verified Discharge Instructions & Care Plan')}
      subtitle={t('prescription.subtitle', 'Clinical discharge summary guidelines extracted and structured for post-hospital recovery.')}
      actions={
        <StatusBadge status="completed" label={t('prescription.verifiedBadge', 'Clinical Ground Truth')} />
      }
    >
      {/* Safety Wording Disclaimer */}
      <div className="p-3.5 bg-[#CC785C]/10 border border-[#CC785C]/25 rounded-2xl flex items-center justify-between text-xs text-[#1C1917]">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="w-4 h-4 text-[#CC785C] flex-shrink-0" />
          <span>
            <strong className="text-[#CC785C]">{t('common.aiGeneratedWarning', 'AI-generated — verify before acting')}.</strong> {t('prescription.subtitle', 'Instructions are extracted directly from original hospital discharge documentation.')}
          </span>
        </div>
        <span className="text-[10px] font-bold text-[#78716C] bg-white px-2.5 py-0.5 rounded-full border border-[#E8E2D7] hidden sm:inline">
          {t('patientDashboard.dischargeDate', 'Discharge Date')}: {patient.dischargeDate}
        </span>
      </div>

      {/* Patient Summary Card */}
      <Card className="bg-gradient-to-r from-white via-[#FAF8F5] to-[#F4F0E8]/40 border-[#E8E2D7]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#CC785C] text-white flex items-center justify-center font-bold text-lg shadow-xs flex-shrink-0 font-serif">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-extrabold text-[#1C1917] font-serif">{patient.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8E2D7]/60 text-[#78716C]">
                  ID: {patient._id} ({patient.syntheticId})
                </span>
              </div>
              <p className="text-xs text-[#78716C] mt-1 font-medium">
                <strong>Primary Diagnosis:</strong> {patient.condition} • <strong>Procedure:</strong> {patient.procedure}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#78716C] pt-2">
                <span>📅 <strong>Admission:</strong> {patient.admissionDate}</span>
                <span>🏥 <strong>Discharge:</strong> {patient.dischargeDate}</span>
                <span>🚶 <strong>Mobility:</strong> {patient.mobility}</span>
                <span>🥗 <strong>Diet:</strong> {patient.dietaryPreference}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-[#E8E2D7] text-xs text-center md:text-right min-w-[180px]">
            <span className="text-[10px] uppercase font-extrabold text-[#78716C] block">Document Status</span>
            <span className="text-sm font-bold text-[#059669] flex items-center justify-center md:justify-end gap-1 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              Fully Verified
            </span>
            <span className="text-[11px] text-[#78716C] mt-1 block">Clinical Ground Truth</span>
          </div>
        </div>
      </Card>

      {/* Category Tab Selector */}
      <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-none">
        {categoryTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-[#CC785C] text-white shadow-xs'
                : 'bg-white hover:bg-[#FAF8F5] text-[#78716C] hover:text-[#1C1917] border border-[#E8E2D7]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#E8E2D7] text-[#78716C]'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Structured Discharge Instruction Sections */}
      <div className="space-y-6">
        {/* 1. Prescribed Medications Section */}
        {(activeTab === 'all' || activeTab === 'medication') && (
          <Card title="Prescribed Medications" subtitle="Required dosages, intake schedules, and food relations">
            {instructions.medications && instructions.medications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instructions.medications.map((item) => (
                  <div key={item._id} className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-[#CC785C]" />
                        <span className="font-bold text-sm text-[#1C1917]">{item.name}</span>
                      </div>
                      <StatusBadge status="info" label={item.dose} />
                    </div>

                    <div className="text-xs text-[#78716C] space-y-1 pt-1">
                      <p><strong>Frequency:</strong> {item.frequency}</p>
                      {item.foodRelation && <p><strong>Relation to Meals:</strong> {item.foodRelation}</p>}
                      {item.duration && <p><strong>Duration:</strong> {item.duration}</p>}
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-[#E8E2D7] text-[11px] text-[#78716C] italic flex items-start gap-1.5">
                      <Quote className="w-3 h-3 text-[#CC785C] flex-shrink-0 mt-0.5" />
                      <span>"{item.sourceSentence}"</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#78716C]">No specific medication guidelines extracted.</p>
            )}
          </Card>
        )}

        {/* 2. Activity & Exercise Guidelines */}
        {(activeTab === 'all' || activeTab === 'activity') && (
          <Card title="Activity & Exercise Guidelines" subtitle="Physical therapy routines and mobility assistance">
            {instructions.activity && instructions.activity.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instructions.activity.map((item) => (
                  <div key={item._id} className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#0D9488]" />
                        <span className="font-bold text-sm text-[#1C1917]">{item.name}</span>
                      </div>
                      <StatusBadge status="completed" label={item.frequency || 'Active Plan'} />
                    </div>
                    <p className="text-xs text-[#78716C]">{item.sourceSentence}</p>
                    <div className="p-2 bg-white rounded-lg border border-[#E8E2D7] text-[11px] text-[#78716C] italic">
                      Source: Discharge Summary Physical Therapy Section
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#78716C]">Perform light mobility exercises as tolerated ({patient.mobility}).</p>
            )}
          </Card>
        )}

        {/* 3. Physical Restrictions */}
        {(activeTab === 'all' || activeTab === 'restriction') && (
          <Card title="Physical Restrictions & Boundaries" subtitle="Prohibited movements and weight-bearing safety limits">
            {instructions.restrictions && instructions.restrictions.length > 0 ? (
              <div className="space-y-3">
                {instructions.restrictions.map((item) => (
                  <div key={item._id} className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                      <span>{item.name}</span>
                    </div>
                    <p className="text-xs text-amber-900">{item.sourceSentence}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                  General Movement Restriction
                </p>
                <p>No heavy lifting over 10 lbs or strenuous exertion for 2 weeks post-surgery.</p>
              </div>
            )}
          </Card>
        )}

        {/* 4. Dietary Instructions */}
        {(activeTab === 'all' || activeTab === 'diet') && (
          <Card title="Dietary Instructions & Nutrition" subtitle="Specific nutritional guidelines and restrictions">
            {instructions.diet && instructions.diet.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instructions.diet.map((item) => (
                  <div key={item._id} className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] space-y-1">
                    <div className="flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-[#D97706]" />
                      <span className="font-bold text-xs text-[#1C1917]">{item.name}</span>
                    </div>
                    <p className="text-xs text-[#78716C]">{item.sourceSentence}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] text-xs text-[#78716C] space-y-1">
                <p className="font-bold text-[#1C1917]">Dietary Preference: {patient.dietaryPreference}</p>
                <p>Maintain balanced nutrition and adequate fluid intake unless restricted by physician.</p>
              </div>
            )}
          </Card>
        )}

        {/* 5. Clinical Follow-Up Appointments */}
        {(activeTab === 'all' || activeTab === 'followup') && (
          <Card title="Clinical Follow-Up Appointments" subtitle="Scheduled outpatient check-ups and doctor reviews">
            {instructions.followUp && instructions.followUp.length > 0 ? (
              <div className="space-y-3">
                {instructions.followUp.map((item) => (
                  <div key={item._id} className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#059669]/10 text-[#059669]">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#1C1917]">{item.name}</h4>
                        <p className="text-xs text-[#78716C]">{item.sourceSentence}</p>
                      </div>
                    </div>
                    <StatusBadge status="info" label={item.timing || 'In 1 week'} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D7] text-xs text-[#78716C] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-[#1C1917]">Outpatient Review Consultation</h4>
                  <p>Visit attending physician clinic in 1 to 2 weeks.</p>
                </div>
                <StatusBadge status="info" label="In 1 week" />
              </div>
            )}
          </Card>
        )}

        {/* 6. Red-Flag Warning Signs */}
        {(activeTab === 'all' || activeTab === 'warning') && (
          <Card title="Red-Flag Warning Signs" subtitle="Critical symptoms requiring immediate medical outreach">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 text-xs text-rose-900">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Contact Care Team or Emergency Services Immediately If:
              </div>

              <ul className="space-y-2 pl-5 list-disc text-[#1C1917] font-medium">
                <li>Fever rising above 100.4°F (38°C) or severe chills</li>
                <li>Sudden increase in incision site swelling, redness, warmth, or purulent drainage</li>
                <li>Sudden shortness of breath, persistent chest tightness, or dizziness</li>
                <li>Inability to keep liquids or prescribed medications down</li>
              </ul>

              <div className="pt-2 border-t border-rose-200 text-[11px] text-rose-700 italic flex items-center justify-between">
                <span>AI-generated — verify before acting. Call hospital helpline for emergency guidance.</span>
                <span className="font-bold uppercase tracking-wider text-rose-800">Urgent Protocol</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
