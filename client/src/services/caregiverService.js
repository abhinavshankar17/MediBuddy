import patientsData from '../../../data/mock/patients.json';
import medicationRemindersData from '../../../data/mock/medicationReminders.json';
import dayColorsData from '../../../data/mock/dayColors.json';
import checkInsData from '../../../data/mock/checkIns.json';
import feedbacksData from '../../../data/mock/feedbacks.json';
import { notifyPatientUpdate } from '../utils/realtimeSync';
import { getLocalFeedbacks, updateLocalFeedbackReview } from './feedbackService';

const API_BASE = '/api';
const STORAGE_KEY = 'medibuddy_confirmed_reminders';

const getStoredStatuses = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

/**
 * Fetch linked patients for a caregiver / family member
 */
export async function getCaregiverPatients(caregiverId = 'U101') {
  try {
    const res = await fetch(`${API_BASE}/caregiver/patients?caregiverId=${caregiverId}`);
    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    // offline fallback
  }

  // High-fidelity fallback
  const relationships = {
    P001: 'Mother',
    P002: 'Father',
    P003: 'Mother',
    P004: 'Brother',
    P005: 'Mother',
    P006: 'Brother',
    P007: 'Sister',
    P008: 'Father'
  };

  const linked = patientsData.slice(0, 2).map((p) => {
    const dayColors = dayColorsData.filter((dc) => dc.patientId === p._id);
    const latestDayColor = dayColors[dayColors.length - 1] || { color: 'GREEN', score: 85, reasons: ['Tasks on track'] };

    return {
      _id: p._id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      relationship: relationships[p._id] || 'Family Member',
      condition: p.condition,
      procedure: p.procedure,
      recoveryPhase: p.recoveryPhase,
      recoveryDay: 'Day 3',
      dischargeDate: p.dischargeDate,
      mobility: p.mobility,
      diet: p.dietaryPreference,
      latestStatus: {
        color: latestDayColor.color || 'GREEN',
        score: latestDayColor.score || 85,
        reasons: latestDayColor.reasons || ['Recovery on track']
      },
      adherence: {
        confirmed: 3,
        total: 3,
        rate: 100
      },
      unreviewedFeedbacksCount: 1
    };
  });

  return {
    caregiverId,
    caregiverName: 'Priya Krishnan',
    totalPatients: linked.length,
    patients: linked
  };
}

/**
 * Fetch comprehensive Daily Report for a loved one
 */
export async function getDailyReport(patientId = 'P001', caregiverId = 'U101') {
  const storedStatuses = getStoredStatuses();

  try {
    const res = await fetch(`${API_BASE}/caregiver/patients/${patientId}/daily-report?caregiverId=${caregiverId}`);
    if (res.ok) {
      const json = await res.json();
      const report = json.data !== undefined ? json.data : json;

      // Sync any local client medication confirmations into backend report
      if (report?.medications?.todayList) {
        report.medications.todayList = report.medications.todayList.map((m) => {
          const stored = storedStatuses[m._id];
          const isTaken = m.isCompleted || stored?.status === 'taken';
          return {
            ...m,
            isCompleted: isTaken,
            statusDisplay: isTaken ? 'Taken' : m.statusDisplay
          };
        });
        const confirmed = report.medications.todayList.filter((m) => m.isCompleted).length;
        const total = report.medications.todayList.length || report.medications.totalCount || 1;
        report.medications.confirmedCount = confirmed;
        report.medications.totalCount = total;
        report.medications.adherenceRate = Math.round((confirmed / total) * 100);
      }

      // Merge fresh patient feedbacks fetched from patient portal
      const freshFeedbacks = await getPatientFeedbacks(patientId);
      if (freshFeedbacks && freshFeedbacks.length > 0) {
        report.recentFeedbacks = freshFeedbacks;
      }

      return report;
    }
  } catch (err) {
    // offline fallback
  }

  const patient = patientsData.find((p) => p._id === patientId) || patientsData[0];
  const reminders = medicationRemindersData.filter((m) => m.patientId === patientId);
  const dayColors = dayColorsData.filter((dc) => dc.patientId === patientId);
  const latestColor = dayColors[dayColors.length - 1] || { color: 'GREEN', score: 85, reasons: ['Tasks on track'] };

  const todayList = reminders.map((r) => ({
    _id: r._id,
    medicationName: r.medicationName || 'Prescribed Med',
    dose: r.dose || 'As directed',
    scheduledTime: r.scheduledAt ? new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:00 AM',
    statusDisplay: r.status === 'taken' || r.responseType === 'taken' ? 'Taken' : 'Pending',
    isCompleted: r.status === 'taken' || r.responseType === 'taken',
    respondedAt: r.respondedAt,
    instructionDetails: r.instructionDetails || { foodRelation: 'With meals' }
  }));

  const confirmedCount = todayList.filter((m) => m.isCompleted).length;

  return {
    patient: {
      _id: patient._id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      relationship: patient._id === 'P001' ? 'Mother' : 'Father',
      condition: patient.condition,
      procedure: patient.procedure,
      recoveryDay: 'Day 4',
      recoveryDayNumber: 4,
      dischargeDate: patient.dischargeDate,
      mobility: patient.mobility,
      diet: patient.dietaryPreference
    },
    recoveryStatus: {
      color: latestColor.color || 'GREEN',
      score: latestColor.score || 85,
      reasons: ['Tasks on track', 'Medications taken on schedule'],
      statusLabel: 'On Track'
    },
    aiSummary: {
      digest: `${patient.name.split(' ')[0]} (Mother) is progressing smoothly on Day 4 of recovery. Morning doses were confirmed taken on time. Walking exercises were completed well and energy levels remain steady.`,
      actionTips: [
        {
          icon: 'heart',
          category: 'Mobility & Rest',
          tip: 'Encourage 10-15 minutes of gentle walking with the walker this afternoon.'
        },
        {
          icon: 'pill',
          category: 'Medication Timing',
          tip: 'Evening Paracetamol 500 mg is scheduled with dinner at 8:00 PM.'
        },
        {
          icon: 'alert',
          category: 'Comfort & Caution',
          tip: 'Apply ice pack wrapped in a clean towel to the knee for 15 minutes before bedtime.'
        }
      ],
      disclaimer: 'AI-generated family digest — for informational support only. Consult attending physician for medical decisions.'
    },
    medications: {
      confirmedCount,
      totalCount: todayList.length || 3,
      adherenceRate: 100,
      todayList
    },
    careTasks: {
      total: 3,
      completed: 2,
      pending: 1,
      list: [
        { _id: 'T1', title: 'Walker-Assisted Walking', description: 'Walk with walker for 10-15 mins', priority: 'medium', isCompleted: true, dueAt: '10:00 AM' },
        { _id: 'T2', title: 'Knee Flexion Exercises', description: 'Perform gentle knee bends', priority: 'high', isCompleted: true, dueAt: '02:00 PM' },
        { _id: 'T3', title: 'Cold Compress / Ice Application', description: 'Apply ice pack for 15 mins', priority: 'low', isCompleted: false, dueAt: '08:30 PM' }
      ]
    },
    vitalsCheckIn: {
      energyLevel: 7,
      mobilityLevel: 4,
      sleepQuality: 'good',
      appetite: 'normal',
      symptoms: ['slight knee stiffness'],
      notes: 'Walking was steady with the walker today. Slept well through the night.'
    },
    safetyInstructions: {
      warningSigns: ['Contact surgical clinic for fever over 101°F or sudden calf swelling.'],
      followUps: [{ name: 'Surgical Clinic Review', timing: 'In 1 week', sourceSentence: 'Review incision healing' }]
    },
    recentFeedbacks: feedbacksData.filter((f) => f.patientId === patientId),
    encouragements: [],
    generatedAt: new Date().toISOString()
  };
}

/**
 * Fetch calendar overview with recovery milestones and day statuses
 */
export async function getCalendarData(patientId = 'P001', year = 2026, month = 10) {
  try {
    const res = await fetch(`${API_BASE}/caregiver/patients/${patientId}/calendar?year=${year}&month=${month}`);
    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    // offline fallback
  }

  // Fallback days generator
  const patient = patientsData.find((p) => p._id === patientId) || patientsData[0];
  const days = [];
  for (let d = 1; d <= 31; d++) {
    const dStr = d < 10 ? `0${d}` : `${d}`;
    const dateStr = `2026-10-${dStr}`;
    let color = null;
    let score = null;
    if (d >= 5 && d <= 8) {
      color = 'GREEN';
      score = 85;
    } else if (d === 9) {
      color = 'GREEN';
      score = 90;
    }
    days.push({
      date: dateStr,
      day: d,
      statusColor: color,
      score,
      hasMilestone: d === 5 || d === 12 || d === 19,
      milestones: d === 5 ? [{ title: 'Hospital Discharge', type: 'discharge', date: dateStr }] : [],
      hasAppointment: d === 12,
      appointments: d === 12 ? [{ title: 'Wound Check Consultation', time: '10:00 AM' }] : [],
      hasCheckIn: d >= 5 && d <= 9,
      dosesTotal: color ? 3 : 0,
      dosesTaken: color ? 3 : 0
    });
  }

  return {
    patientId,
    patientName: patient.name,
    month,
    year,
    dischargeDate: patient.dischargeDate || '2026-10-05',
    milestones: [
      { date: '2026-10-05', title: 'Hospital Discharge & Home Transition', type: 'discharge' },
      { date: '2026-10-08', title: 'Initial Home Recovery Check-in', type: 'check_in' },
      { date: '2026-10-12', title: 'Wound Dressing & Incision Review', type: 'wound_check' },
      { date: '2026-10-19', title: 'Clinic Follow-up & Suture / Staple Check', type: 'appointment' },
      { date: '2026-10-26', title: 'Physical Therapy & Recovery Milestone', type: 'milestone' }
    ],
    days
  };
}

/**
 * Fetch patient feedbacks submitted for caregiver review
 * Directly queries patient endpoint, caregiver endpoint, and local persistence
 */
export async function getPatientFeedbacks(patientId = 'P001') {
  const localList = getLocalFeedbacks(patientId);
  const feedbackMap = new Map();

  // 1. Fetch directly from patient endpoint
  try {
    const resPatient = await fetch(`${API_BASE}/patients/${patientId}/feedback`);
    if (resPatient.ok) {
      const json = await resPatient.json();
      const list = json.data !== undefined ? json.data : json;
      if (Array.isArray(list)) {
        list.forEach((f) => feedbackMap.set(f._id, f));
      }
    }
  } catch (err) {
    // network fallback
  }

  // 2. Fetch from caregiver feedback endpoint
  try {
    const resCg = await fetch(`${API_BASE}/caregiver/patients/${patientId}/feedback`);
    if (resCg.ok) {
      const json = await resCg.json();
      const list = json.data !== undefined ? json.data : json;
      if (Array.isArray(list)) {
        list.forEach((f) => {
          if (feedbackMap.has(f._id)) {
            feedbackMap.set(f._id, { ...feedbackMap.get(f._id), ...f });
          } else {
            feedbackMap.set(f._id, f);
          }
        });
      }
    }
  } catch (err) {
    // network fallback
  }

  // 3. Merge local storage submitted feedbacks from patient portal
  localList.forEach((f) => {
    if (feedbackMap.has(f._id)) {
      feedbackMap.set(f._id, { ...feedbackMap.get(f._id), ...f });
    } else {
      feedbackMap.set(f._id, f);
    }
  });

  // 4. Fallback to mock data if empty
  if (feedbackMap.size === 0) {
    const mock = feedbacksData.filter((f) => f.patientId === patientId);
    (mock.length > 0 ? mock : feedbacksData.slice(0, 2)).forEach((f) => feedbackMap.set(f._id, f));
  }

  return Array.from(feedbackMap.values()).sort(
    (a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
  );
}

/**
 * Caregiver reviews and acknowledges patient feedback
 */
export async function reviewFeedback(patientId, feedbackId, reviewData = {}) {
  // Update local storage record so patient portal immediately reflects review note
  updateLocalFeedbackReview(patientId, feedbackId, reviewData);

  notifyPatientUpdate({
    type: 'feedback_reviewed',
    patientId,
    feedbackId,
    reviewData,
    timestamp: Date.now()
  });

  try {
    const res = await fetch(`${API_BASE}/caregiver/patients/${patientId}/feedback/${feedbackId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    });
    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    // offline fallback
  }

  return {
    _id: feedbackId,
    patientId,
    status: 'reviewed',
    reviewStatus: 'reviewed',
    caregiverNote: reviewData.caregiverNote || reviewData.note || 'Acknowledged by caregiver.',
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewData.caregiverId || 'U101'
  };
}

const STORAGE_ENCOURAGEMENTS_PREFIX = 'medi_buddy_patient_encouragements_';

export function getLocalEncouragements(patientId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_ENCOURAGEMENTS_PREFIX}${patientId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalEncouragements(patientId, items) {
  try {
    localStorage.setItem(`${STORAGE_ENCOURAGEMENTS_PREFIX}${patientId}`, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save local encouragements:', e);
  }
}

/**
 * Caregiver sends encouragement message to patient
 */
export async function sendEncouragement(patientId, payload = {}) {
  const newEnc = {
    _id: `ENC${Date.now()}`,
    patientId,
    caregiverId: payload.caregiverId || 'U101',
    caregiverName: payload.caregiverName || 'Family Member',
    message: payload.message || 'Proud of your recovery progress today!',
    tag: payload.tag || 'love',
    sentAt: new Date().toISOString()
  };

  // 1. Immediately persist to localStorage
  const existing = getLocalEncouragements(patientId);
  saveLocalEncouragements(patientId, [newEnc, ...existing]);

  // 2. Broadcast real-time sync update
  notifyPatientUpdate({
    type: 'encouragement_sent',
    patientId,
    encouragement: newEnc,
    timestamp: Date.now()
  });

  // 3. Sync to backend
  try {
    const res = await fetch(`${API_BASE}/caregiver/patients/${patientId}/encouragement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const json = await res.json();
      const serverEnc = json.data !== undefined ? json.data : json;
      if (serverEnc && serverEnc._id) {
        const current = getLocalEncouragements(patientId);
        const updated = current.map((item) =>
          item._id === newEnc._id ? { ...newEnc, ...serverEnc } : item
        );
        saveLocalEncouragements(patientId, updated);
        return { ...newEnc, ...serverEnc };
      }
    }
  } catch (err) {
    // offline fallback
  }

  return newEnc;
}

/**
 * Get all encouragement messages for a patient
 */
export async function getPatientEncouragements(patientId = 'P001') {
  const localList = getLocalEncouragements(patientId);
  const encMap = new Map();

  // 1. Fetch from patient endpoint
  try {
    const res = await fetch(`${API_BASE}/patients/${patientId}/encouragement`);
    if (res.ok) {
      const json = await res.json();
      const list = json.data !== undefined ? json.data : json;
      if (Array.isArray(list)) {
        list.forEach((e) => encMap.set(e._id, e));
      }
    }
  } catch (e) {}

  // 2. Fetch from caregiver endpoint
  try {
    const res = await fetch(`${API_BASE}/caregiver/patients/${patientId}/encouragement`);
    if (res.ok) {
      const json = await res.json();
      const list = json.data !== undefined ? json.data : json;
      if (Array.isArray(list)) {
        list.forEach((e) => encMap.set(e._id, e));
      }
    }
  } catch (e) {}

  // 3. Merge local storage messages
  localList.forEach((e) => encMap.set(e._id, e));

  return Array.from(encMap.values()).sort(
    (a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0)
  );
}
