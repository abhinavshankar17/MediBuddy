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
   * Get available appointment slots based on urgency.
   * 
   * Logic:
   * - urgent/emergency: ALL slots for next 7 days, every day available
   * - moderate: Regular doctor-availability slots for next 3 days
   * - mild: Regular doctor-availability slots for next 7 days, only on doctor's available days
   */
  async getAvailableSlots(patientId, urgency = 'mild') {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient '${patientId}' not found` };
    }

    // Find relevant providers for this patient's condition
    const providers = await dataStore.getProviders();
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
        // For urgent: ALL time slots available, all providers
        const availableProviders = providers.slice(0, 5).map(p => ({
          _id: p._id,
          name: p.name,
          specialty: p.specialty,
          hospital: p.hospital
        }));

        slots.push({
          date: dateStr,
          dateLabel,
          dayName,
          isToday: d === 0,
          urgencyNote: d === 0 ? '🔴 URGENT — Immediate slots available' : '🔴 Priority booking',
          timeSlots: this.ALL_TIME_SLOTS.map(time => ({
            time,
            available: true,
            providers: availableProviders
          }))
        });
      } else {
        // For moderate/mild: only show slots on doctor's available days
        const availableProviders = providers.filter(p =>
          p.availability && p.availability.includes(dayName)
        ).slice(0, 3);

        if (isModerate || availableProviders.length > 0) {
          const providerInfo = (isModerate && availableProviders.length === 0)
            ? providers.slice(0, 2).map(p => ({
                _id: p._id,
                name: p.name,
                specialty: p.specialty,
                hospital: p.hospital
              }))
            : availableProviders.map(p => ({
                _id: p._id,
                name: p.name,
                specialty: p.specialty,
                hospital: p.hospital
              }));

          // Simulate some slots being taken (for realism)
          const takenSlots = new Set();
          const existingAppointments = await dataStore.getAppointmentsByDate(dateStr);
          existingAppointments.forEach(apt => takenSlots.add(apt.timeSlot));

          // Moderate shows all regular slots; mild only shows regular slots
          const slotsToShow = this.REGULAR_SLOTS;

          slots.push({
            date: dateStr,
            dateLabel,
            dayName,
            isToday: d === 0,
            urgencyNote: isModerate
              ? '🟡 Moderate — Next available slots'
              : '🟢 Routine appointment slots',
            timeSlots: slotsToShow.map(time => ({
              time,
              available: !takenSlots.has(time),
              providers: providerInfo
            }))
          });
        }
      }
    }

    return {
      patientId,
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

    const { date, timeSlot, providerId, urgency, feedbackId, reason } = appointmentData;

    if (!date || !timeSlot) {
      throw { statusCode: 400, message: 'date and timeSlot are required' };
    }

    // Look up provider (optional)
    let provider = null;
    if (providerId) {
      const providers = await dataStore.getProviders();
      provider = providers.find(p => p._id === providerId);
    }

    const appointment = {
      _id: `APT${Date.now()}`,
      patientId,
      patientName: patient.name,
      date,
      timeSlot,
      providerId: providerId || null,
      providerName: provider ? provider.name : 'Assigned at visit',
      providerSpecialty: provider ? provider.specialty : null,
      hospital: provider ? provider.hospital : 'CareBridge Partner Hospital',
      urgency: urgency || 'mild',
      feedbackId: feedbackId || null,
      reason: reason || 'Post-discharge follow-up',
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
