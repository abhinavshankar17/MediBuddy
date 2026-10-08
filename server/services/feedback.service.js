const dataStore = require('./dataStore');

/**
 * Service handling patient feedback and appointment booking logic.
 * 
 * Urgency-based slot availability:
 *  - URGENT / EMERGENCY → All time slots shown as available (doctor overrides schedule)
 *  - MODERATE → Shows today + next 2 days available slots based on doctor availability
 *  - MILD → Shows only regular doctor availability slots within next 7 days
 */
const feedbackService = {
  /**
   * Available time slots template
   */
  ALL_TIME_SLOTS: [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM'
  ],

  REGULAR_SLOTS: [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'
  ],

  DAY_NAMES: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

  /**
   * Submit patient condition feedback
   */
  async submitFeedback(patientId, feedbackData) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    // Verify patient exists
    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient '${patientId}' not found` };
    }

    const { condition, symptoms, painLevel, urgency, notes } = feedbackData;

    if (!condition || !urgency) {
      throw { statusCode: 400, message: 'condition and urgency are required fields' };
    }

    const validUrgencies = ['mild', 'moderate', 'urgent', 'emergency'];
    if (!validUrgencies.includes(urgency.toLowerCase())) {
      throw { statusCode: 400, message: `Invalid urgency level. Must be one of: ${validUrgencies.join(', ')}` };
    }

    const feedback = {
      _id: `FB${Date.now()}`,
      patientId,
      patientName: patient.name,
      condition,
      symptoms: symptoms || [],
      painLevel: painLevel || 0,
      urgency: urgency.toLowerCase(),
      notes: notes || '',
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    };

    // Store in dataStore
    await dataStore.addFeedback(feedback);

    return feedback;
  },

  /**
   * Get all feedbacks for a patient
   */
  async getPatientFeedbacks(patientId) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient '${patientId}' not found` };
    }

    return await dataStore.getFeedbacksByPatient(patientId);
  },

  /**
   * Clear all feedbacks for a patient
   */
  async clearPatientFeedbacks(patientId) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient '${patientId}' not found` };
    }

    await dataStore.clearFeedbacksByPatient(patientId);
    await dataStore.clearAppointmentsByPatient(patientId);
    return { success: true, message: `Feedback and appointment history cleared for patient ${patientId}` };
  },

  /**
   * Helper to retrieve the specific doctor who diagnosed/treated this patient
   */
  getDiagnosingDoctor(patient, doc) {
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
  },

  /**
   * Get available appointment slots based on urgency.
   * Locked to the specific doctor who diagnosed the patient.
   * 
   * Logic:
   * - urgent/emergency: ALL slots for next 7 days, every day available with diagnosing doctor
   * - moderate: Regular slots for next 3 days with diagnosing doctor
   * - mild: Regular slots for next 7 days with diagnosing doctor
   */
  async getAvailableSlots(patientId, urgency = 'mild') {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient '${patientId}' not found` };
    }

    // Retrieve the patient's clinical document to find who diagnosed him
    const doc = await dataStore.getDocumentByPatient(patientId);
    const diagnosingDoctor = this.getDiagnosingDoctor(patient, doc);

    const normalizedUrgency = urgency.toLowerCase();
    const isUrgent = normalizedUrgency === 'urgent' || normalizedUrgency === 'emergency';
    const isModerate = normalizedUrgency === 'moderate';

    const today = new Date('2026-10-08'); // Project mock date
    const daysToShow = isUrgent ? 7 : isModerate ? 3 : 7;
    const slots = [];

    for (let d = 0; d < daysToShow; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const dayName = this.DAY_NAMES[date.getDay()];
      const dateStr = date.toISOString().split('T')[0];
      const dateLabel = date.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (isUrgent) {
        // For urgent: ALL time slots available with diagnosing doctor
        slots.push({
          date: dateStr,
          dateLabel,
          dayName,
          isToday: d === 0,
          urgencyNote: d === 0 ? '🔴 URGENT — Immediate slots with diagnosing doctor' : '🔴 Priority booking',
          timeSlots: this.ALL_TIME_SLOTS.map(time => ({
            time,
            available: true,
            providers: [diagnosingDoctor]
          }))
        });
      } else {
        // Simulate taken slots from existing booked appointments
        const takenSlots = new Set();
        const existingAppointments = await dataStore.getAppointmentsByDate(dateStr);
        existingAppointments.forEach(apt => takenSlots.add(apt.timeSlot));

        const slotsToShow = this.REGULAR_SLOTS;

        slots.push({
          date: dateStr,
          dateLabel,
          dayName,
          isToday: d === 0,
          urgencyNote: isModerate
            ? '🟡 Moderate — Next available slots with your doctor'
            : '🟢 Routine appointment slots with your doctor',
          timeSlots: slotsToShow.map(time => ({
            time,
            available: !takenSlots.has(time),
            providers: [diagnosingDoctor]
          }))
        });
      }
    }

    return {
      patientId,
      diagnosingDoctor,
      urgency: normalizedUrgency,
      isUrgent,
      totalDays: slots.length,
      slots
    };
  },

  /**
   * Book an appointment
   */
  async bookAppointment(patientId, appointmentData) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient '${patientId}' not found` };
    }

    const { date, timeSlot, urgency, feedbackId, reason } = appointmentData;

    if (!date || !timeSlot) {
      throw { statusCode: 400, message: 'date and timeSlot are required' };
    }

    // Always assign the doctor who diagnosed the patient
    const doc = await dataStore.getDocumentByPatient(patientId);
    const diagnosingDoctor = this.getDiagnosingDoctor(patient, doc);

    const appointment = {
      _id: `APT${Date.now()}`,
      patientId,
      patientName: patient.name,
      date,
      timeSlot,
      providerId: diagnosingDoctor._id,
      providerName: diagnosingDoctor.name,
      providerSpecialty: diagnosingDoctor.specialty,
      hospital: diagnosingDoctor.hospital,
      urgency: urgency || 'mild',
      feedbackId: feedbackId || null,
      reason: reason || 'Follow-up with diagnosing physician',
      status: 'confirmed',
      bookedAt: new Date().toISOString()
    };

    await dataStore.addAppointment(appointment);

    return appointment;
  },

  /**
   * Get all appointments for a patient
   */
  async getPatientAppointments(patientId) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient '${patientId}' not found` };
    }

    return await dataStore.getAppointmentsByPatient(patientId);
  }
};

module.exports = feedbackService;
