import providersData from '../../../data/mock/providers.json';

const API_BASE = '/api';

/**
 * Submit patient condition feedback
 */
export async function submitFeedback(patientId, feedbackData) {
  try {
    const res = await fetch(`${API_BASE}/patients/${patientId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
    if (res.ok) {
      const json = await res.json();
      return json.data !== undefined ? json.data : json;
    }
  } catch (err) {
    // offline fallback
  }

  // Mock fallback
  return {
    _id: `FB${Date.now()}`,
    patientId,
    ...feedbackData,
    submittedAt: new Date().toISOString(),
    status: 'submitted'
  };
}

/**
 * Get all feedbacks for a patient
 */
export async function getPatientFeedbacks(patientId) {
  try {
    const res = await fetch(`${API_BASE}/patients/${patientId}/feedback`);
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

/**
 * Clear all feedbacks and appointments history for a patient
 */
export async function clearPatientHistory(patientId) {
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
      const providers = providersData.slice(0, 5).map(p => ({
        _id: p._id, name: p.name, specialty: p.specialty, hospital: p.hospital
      }));
      slots.push({
        date: dateStr, dateLabel, dayName, isToday: d === 0,
        urgencyNote: d === 0 ? '🔴 URGENT — Immediate slots available' : '🔴 Priority booking',
        timeSlots: ALL_TIME_SLOTS.map(time => ({ time, available: true, providers }))
      });
    } else {
      const availableProviders = providersData.filter(p =>
        p.availability && p.availability.includes(dayName)
      ).slice(0, 3);

      if (isModerate || availableProviders.length > 0) {
        const providerInfo = (isModerate && availableProviders.length === 0)
          ? providersData.slice(0, 2).map(p => ({ _id: p._id, name: p.name, specialty: p.specialty, hospital: p.hospital }))
          : availableProviders.map(p => ({ _id: p._id, name: p.name, specialty: p.specialty, hospital: p.hospital }));

        slots.push({
          date: dateStr, dateLabel, dayName, isToday: d === 0,
          urgencyNote: isModerate ? '🟡 Moderate — Next available slots' : '🟢 Routine appointment slots',
          timeSlots: REGULAR_SLOTS.map(time => ({ time, available: Math.random() > 0.2, providers: providerInfo }))
        });
      }
    }
  }

  return { patientId, urgency: normalizedUrgency, isUrgent, totalDays: slots.length, slots };
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

  return {
    _id: `APT${Date.now()}`,
    patientId,
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
