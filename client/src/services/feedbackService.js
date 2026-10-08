import documentsData from '../../../data/mock/documents.json';
import patientsData from '../../../data/mock/patients.json';
import { notifyPatientUpdate } from '../utils/realtimeSync';

const API_BASE = '/api';

/**
 * Helper to get the doctor who diagnosed the patient
 */
export function getDiagnosingDoctor(patientId) {
  const patient = patientsData.find(p => p._id === patientId) || null;
  const doc = documentsData.find(d => d.patientId === patientId) || null;

  const doctorName = doc?.doctorName || patient?.assignedDoctor || 'Dr. Vivek Iyer';
  const hospital = doc?.hospitalName || 'CareBridge Demo Hospital';

  let specialty = 'General & Internal Medicine';
  const text = `${patient?.condition || ''} ${patient?.procedure || ''} ${doc?.rawText || ''}`.toLowerCase();

  if (text.includes('knee') || text.includes('ortho') || text.includes('fracture') || text.includes('joint') || text.includes('ankle')) {
    specialty = 'Orthopedic Surgery';
  } else if (text.includes('cardiac') || text.includes('heart') || text.includes('bypass') || text.includes('coronary')) {
    specialty = 'Cardiology';
  } else if (text.includes('pneumonia') || text.includes('respiratory') || text.includes('lung') || text.includes('breath')) {
    specialty = 'Pulmonology';
  } else if (text.includes('diabet') || text.includes('glucose') || text.includes('endocrine')) {
    specialty = 'Endocrinology';
  } else if (text.includes('hernia') || text.includes('surger')) {
    specialty = 'General Surgery';
  }

  return {
    _id: `DOC_${doctorName.replace(/[^a-zA-Z0-9]/g, '_')}`,
    name: doctorName,
    specialty,
    hospital,
    isDiagnosingDoctor: true
  };
}

const STORAGE_FEEDBACKS_PREFIX = 'medi_buddy_patient_feedbacks_';

export function getLocalFeedbacks(patientId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_FEEDBACKS_PREFIX}${patientId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalFeedbacks(patientId, feedbacks) {
  try {
    localStorage.setItem(`${STORAGE_FEEDBACKS_PREFIX}${patientId}`, JSON.stringify(feedbacks));
  } catch (e) {
    console.error('Failed to save local feedbacks:', e);
  }
}

export function updateLocalFeedbackReview(patientId, feedbackId, reviewData = {}) {
  const localList = getLocalFeedbacks(patientId);
  const updated = localList.map((fb) =>
    fb._id === feedbackId
      ? {
          ...fb,
          status: 'reviewed',
          reviewStatus: 'reviewed',
          caregiverNote: reviewData.caregiverNote || reviewData.note || 'Acknowledged by caregiver.',
          reviewedAt: new Date().toISOString(),
          reviewedBy: reviewData.caregiverId || 'Family Member'
        }
      : fb
  );
  saveLocalFeedbacks(patientId, updated);
}

/**
 * Submit patient condition feedback
 */
export async function submitFeedback(patientId, feedbackData) {
  const newFeedback = {
    _id: `FB${Date.now()}`,
    patientId,
    ...feedbackData,
    submittedAt: new Date().toISOString(),
    status: 'pending_review',
    reviewStatus: 'pending',
    caregiverNote: null,
    reviewedAt: null,
    reviewedBy: null
  };

  // 1. Immediately persist to localStorage
  const existingLocal = getLocalFeedbacks(patientId);
  saveLocalFeedbacks(patientId, [newFeedback, ...existingLocal]);

  // 2. Broadcast real-time update
  notifyPatientUpdate({
    type: 'feedback_submitted',
    patientId,
    feedback: newFeedback,
    timestamp: Date.now()
  });

  // 3. Sync to backend
  try {
    const res = await fetch(`${API_BASE}/patients/${patientId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
    if (res.ok) {
      const json = await res.json();
      const serverFeedback = json.data !== undefined ? json.data : json;
      if (serverFeedback && serverFeedback._id) {
        const currentLocal = getLocalFeedbacks(patientId);
        const updated = currentLocal.map((item) =>
          item._id === newFeedback._id ? { ...newFeedback, ...serverFeedback } : item
        );
        saveLocalFeedbacks(patientId, updated);
        return { ...newFeedback, ...serverFeedback };
      }
    }
  } catch (err) {
    // offline fallback
  }

  return newFeedback;
}

/**
 * Get all feedbacks for a patient
 */
export async function getPatientFeedbacks(patientId) {
  const localList = getLocalFeedbacks(patientId);
  let remoteList = [];

  try {
    const res = await fetch(`${API_BASE}/patients/${patientId}/feedback`);
    if (res.ok) {
      const json = await res.json();
      const data = json.data !== undefined ? json.data : json;
      if (Array.isArray(data)) {
        remoteList = data;
      }
    }
  } catch (err) {
    // offline fallback
  }

  // Merge remote and local (avoiding duplicates by _id)
  const map = new Map();
  remoteList.forEach((fb) => map.set(fb._id, fb));
  localList.forEach((fb) => {
    if (map.has(fb._id)) {
      map.set(fb._id, { ...map.get(fb._id), ...fb });
    } else {
      map.set(fb._id, fb);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
  );
}

/**
 * Clear all feedbacks and appointments history for a patient
 */
export async function clearPatientHistory(patientId) {
  try {
    localStorage.removeItem(`${STORAGE_FEEDBACKS_PREFIX}${patientId}`);
  } catch (e) {}

  try {
    const res = await fetch(`${API_BASE}/patients/${patientId}/feedback`, {
      method: 'DELETE'
    });
    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    // offline fallback
  }
  return { success: true };
}

/**
 * Available time slots
 */
const ALL_TIME_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM'
];

const REGULAR_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Get available appointment slots based on urgency
 * - urgent/emergency: ALL slots, every day
 * - moderate: Regular slots, next 3 days
 * - mild: Regular slots, only on doctor's available days, next 7 days
 */
export async function getAvailableSlots(patientId, urgency = 'mild') {
  try {
    const res = await fetch(`${API_BASE}/patients/${patientId}/appointments/slots?urgency=${urgency}`);
    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    // offline fallback
  }

  // Client-side mock fallback
  const diagnosingDoctor = getDiagnosingDoctor(patientId);
  const normalizedUrgency = urgency.toLowerCase();
  const isUrgent = normalizedUrgency === 'urgent' || normalizedUrgency === 'emergency';
  const isModerate = normalizedUrgency === 'moderate';
  const today = new Date('2026-10-08');
  const daysToShow = isUrgent ? 7 : isModerate ? 3 : 7;
  const slots = [];

  for (let d = 0; d < daysToShow; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dayName = DAY_NAMES[date.getDay()];
    const dateStr = date.toISOString().split('T')[0];
    const dateLabel = date.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    if (isUrgent) {
      slots.push({
        date: dateStr, dateLabel, dayName, isToday: d === 0,
        urgencyNote: d === 0 ? '🔴 URGENT — Immediate slots with diagnosing doctor' : '🔴 Priority booking',
        timeSlots: ALL_TIME_SLOTS.map(time => ({ time, available: true, providers: [diagnosingDoctor] }))
      });
    } else {
      slots.push({
        date: dateStr, dateLabel, dayName, isToday: d === 0,
        urgencyNote: isModerate ? '🟡 Moderate — Next available slots with your doctor' : '🟢 Routine appointment slots with your doctor',
        timeSlots: REGULAR_SLOTS.map(time => ({ time, available: true, providers: [diagnosingDoctor] }))
      });
    }
  }

  return { patientId, diagnosingDoctor, urgency: normalizedUrgency, isUrgent, totalDays: slots.length, slots };
}

/**
 * Book an appointment
 */
export async function bookAppointment(patientId, appointmentData) {
  try {
    const res = await fetch(`${API_BASE}/patients/${patientId}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentData)
    });
    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    // offline fallback
  }

  const diagnosingDoctor = getDiagnosingDoctor(patientId);
  return {
    _id: `APT${Date.now()}`,
    patientId,
    providerId: diagnosingDoctor._id,
    providerName: diagnosingDoctor.name,
    providerSpecialty: diagnosingDoctor.specialty,
    hospital: diagnosingDoctor.hospital,
    ...appointmentData,
    status: 'confirmed',
    bookedAt: new Date().toISOString()
  };
}

/**
 * Get all appointments for a patient
 */
export async function getPatientAppointments(patientId) {
  try {
    const res = await fetch(`${API_BASE}/patients/${patientId}/appointments`);
    if (res.ok) {
      const json = await res.json();
      const data = json.data !== undefined ? json.data : json;
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    // offline fallback
  }
  return [];
}
