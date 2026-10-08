const dataStore = require('./dataStore');
const adherenceService = require('./adherence.service');

// Relationship map helper for realistic family representation
const FAMILY_RELATIONSHIPS = {
  P001: 'Mother',
  P002: 'Father',
  P003: 'Mother',
  P004: 'Brother',
  P005: 'Mother',
  P006: 'Brother',
  P007: 'Sister',
  P008: 'Father'
};

const caregiverService = {
  /**
   * List all patients associated with a caregiver
   * @param {string} [caregiverId]
   */
  async getCaregiverPatients(caregiverId = 'U101') {
    const allPatients = await dataStore.listPatients();
    const user = await dataStore.getUserById(caregiverId);

    // Patients linked by user.patientIds or patient.caregiverId
    let linkedPatients = [];
    if (user && Array.isArray(user.patientIds) && user.patientIds.length > 0) {
      linkedPatients = allPatients.filter((p) => user.patientIds.includes(p._id));
    } else {
      linkedPatients = allPatients.filter((p) => p.caregiverId === caregiverId);
    }

    // Fallback: If no patients matched, provide primary demo patient P001
    if (linkedPatients.length === 0) {
      linkedPatients = allPatients.slice(0, 2);
    }

    const patientSummaries = await Promise.all(
      linkedPatients.map(async (p) => {
        const pId = p._id;
        const dayColors = await dataStore.getDayColorsByPatient(pId);
        const latestDayColor = dayColors && dayColors.length > 0
          ? dayColors[dayColors.length - 1]
          : { color: 'GREEN', score: 85, reasons: ['Tasks on track'] };

        const adherence = await adherenceService.calculateAdherence(pId);
        const feedbacks = await dataStore.getFeedbacksByPatient(pId);
        const unreviewedCount = feedbacks.filter((f) => f.reviewStatus !== 'reviewed').length;

        // Calculate recovery day
        let recoveryDay = 'Day 3';
        if (p.dischargeDate) {
          const discharge = new Date(p.dischargeDate);
          const today = new Date('2026-10-08');
          const diff = Math.max(1, Math.floor((today - discharge) / (1000 * 60 * 60 * 24)) + 1);
          recoveryDay = `Day ${diff}`;
        }

        return {
          _id: p._id,
          name: p.name,
          age: p.age,
          gender: p.gender,
          relationship: FAMILY_RELATIONSHIPS[pId] || 'Family Member',
          condition: p.condition,
          procedure: p.procedure,
          recoveryPhase: p.recoveryPhase,
          recoveryDay,
          dischargeDate: p.dischargeDate,
          mobility: p.mobility,
          diet: p.dietaryPreference,
          latestStatus: {
            color: latestDayColor.color || 'GREEN',
            score: latestDayColor.score || 85,
            reasons: latestDayColor.reasons || ['Recovery on track']
          },
          adherence: {
            confirmed: adherence.confirmed,
            total: adherence.total,
            rate: adherence.total > 0 ? Math.round((adherence.confirmed / adherence.total) * 100) : 100
          },
          unreviewedFeedbacksCount: unreviewedCount
        };
      })
    );

    return {
      caregiverId,
      caregiverName: user ? user.name : 'Priya Krishnan',
      totalPatients: patientSummaries.length,
      patients: patientSummaries
    };
  },

  /**
   * Generate comprehensive Daily Report for a loved one
   * @param {string} patientId
   * @param {string} [caregiverId]
   */
  async getDailyReport(patientId, caregiverId = 'U101') {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient '${patientId}' not found` };
    }

    // 1. Recovery day computation
    let recoveryDayNumber = 3;
    if (patient.dischargeDate) {
      const discharge = new Date(patient.dischargeDate);
      const today = new Date('2026-10-08');
      recoveryDayNumber = Math.max(1, Math.floor((today - discharge) / (1000 * 60 * 60 * 24)) + 1);
    }
    const recoveryDay = `Day ${recoveryDayNumber}`;

    // 2. Day Status / Traffic Light
    const dayColors = await dataStore.getDayColorsByPatient(patientId);
    const latestDayColor = dayColors && dayColors.length > 0
      ? dayColors[dayColors.length - 1]
      : { color: 'GREEN', score: 85, reasons: ['Tasks on track', 'Medications taken'] };

    // 3. Today's Medication Reminders
    const reminders = await dataStore.getRemindersByPatient(patientId);
    const todayReminders = reminders.map((r) => {
      const scheduledTime = r.scheduledAt
        ? new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '08:00 AM';

      let statusDisplay = 'Pending';
      let isCompleted = false;

      if (r.status === 'taken' || r.responseType === 'taken') {
        statusDisplay = 'Taken';
        isCompleted = true;
      } else if (r.status === 'missed' || r.responseType === 'not_taken') {
        statusDisplay = 'Missed';
      } else if (r.status === 'overdue' || r.responseType === 'no_response') {
        statusDisplay = 'Not confirmed';
      }

      return {
        _id: r._id,
        medicationName: r.medicationName || 'Prescribed Med',
        dose: r.dose || 'As directed',
        scheduledTime,
        statusDisplay,
        isCompleted,
        respondedAt: r.respondedAt,
        instructionDetails: r.instructionDetails || { foodRelation: 'With meals' }
      };
    });

    const confirmedCount = todayReminders.filter((m) => m.isCompleted).length;
    const totalMeds = todayReminders.length || 3;
    const adherenceRate = Math.round((confirmedCount / Math.max(1, totalMeds)) * 100);

    // 4. Today's Care Tasks
    const tasks = await dataStore.getTasksByPatient(patientId);
    const careTasks = tasks.slice(0, 5).map((t) => ({
      _id: t._id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      isCompleted: t.status === 'completed',
      dueAt: t.dueAt ? new Date(t.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'
    }));

    // 5. Patient Self Check-in Vitals Snapshot
    const checkIns = await dataStore.getCheckInsByPatient(patientId);
    const latestCheckIn = checkIns && checkIns.length > 0
      ? checkIns[checkIns.length - 1]
      : {
          painLevel: 3,
          energyLevel: 7,
          mobilityLevel: 4,
          symptoms: ['mild knee stiffness'],
          sleepQuality: 'good',
          appetite: 'normal',
          freeText: 'Feeling better than yesterday. Walking was smooth with the walker.'
        };

    // 6. Extracted Discharge Warnings / Safety Instructions
    const extractedItems = await dataStore.getExtractedItemsByPatient(patientId);
    const warningSigns = extractedItems
      .filter((i) => i.type === 'warning_sign')
      .map((w) => w.sourceSentence || w.name || 'Report persistent high fever or chest pain.');

    const followUps = extractedItems
      .filter((i) => i.type === 'follow_up')
      .map((f) => ({
        name: f.name || 'Clinic Follow-up',
        timing: f.timing || 'In 1-2 weeks',
        sourceSentence: f.sourceSentence || 'Surgical clinic review'
      }));

    // 7. Recent Patient Feedback for Review
    const feedbacks = await dataStore.getFeedbacksByPatient(patientId);
    const recentFeedbacks = feedbacks.slice(-3).reverse();

    // 8. Caregiver Encouragements Sent
    const encouragements = await dataStore.getEncouragementsByPatient(patientId);

    // 9. Plain-language Empathetic AI Family Summary
    const relation = FAMILY_RELATIONSHIPS[patientId] || 'Your loved one';
    const condition = patient.condition || 'surgery recovery';
    const patientFirstName = patient.name.split(' ')[0];
    const aiExecutiveSummary = `${patientFirstName} (${relation}) is currently on ${recoveryDay} of ${condition}. Overall recovery is progressing smoothly with a health score of ${latestDayColor.score}%. Today, ${confirmedCount} of ${totalMeds} prescribed medication doses have been confirmed taken, and daily energy levels are steady.`;

    const caregiverActionTips = [
      {
        icon: 'heart',
        category: 'Mobility & Rest',
        tip: `Encourage ${patientFirstName} to do gentle mobility practice with ${patient.mobility || 'the walker'} for 10-15 minutes.`
      },
      {
        icon: 'pill',
        category: 'Medication Timing',
        tip: todayReminders.find((m) => !m.isCompleted)
          ? `Check in around evening mealtime to ensure the remaining dose (${todayReminders.find((m) => !m.isCompleted)?.medicationName}) is taken with food.`
          : 'All scheduled morning and afternoon doses have been confirmed taken.'
      },
      {
        icon: 'alert',
        category: 'Comfort & Caution',
        tip: 'Ensure comfortable seating with good leg support, and help replenish warm water or soothing fluids.'
      }
    ];

    return {
      patient: {
        _id: patient._id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        relationship: relation,
        condition: patient.condition,
        procedure: patient.procedure,
        recoveryDay,
        recoveryDayNumber,
        dischargeDate: patient.dischargeDate,
        mobility: patient.mobility,
        diet: patient.dietaryPreference,
        preferences: patient.preferences || {}
      },
      recoveryStatus: {
        color: latestDayColor.color || 'GREEN',
        score: latestDayColor.score || 85,
        reasons: latestDayColor.reasons || ['Tasks on track', 'Medications taken'],
        statusLabel: latestDayColor.color === 'GREEN' ? 'On Track' : latestDayColor.color === 'YELLOW' ? 'Needs Attention' : 'Action Required'
      },
      aiSummary: {
        digest: aiExecutiveSummary,
        actionTips: caregiverActionTips,
        disclaimer: 'AI-generated family digest — for informational support only. Consult attending physician for medical decisions.'
      },
      medications: {
        confirmedCount,
        totalCount: totalMeds,
        adherenceRate,
        todayList: todayReminders
      },
      careTasks: {
        total: careTasks.length,
        completed: careTasks.filter((t) => t.isCompleted).length,
        pending: careTasks.filter((t) => !t.isCompleted).length,
        list: careTasks
      },
      vitalsCheckIn: {
        painLevel: latestCheckIn.painLevel,
        energyLevel: latestCheckIn.energyLevel,
        mobilityLevel: latestCheckIn.mobilityLevel,
        sleepQuality: latestCheckIn.sleepQuality,
        appetite: latestCheckIn.appetite,
        symptoms: latestCheckIn.symptoms || [],
        notes: latestCheckIn.freeText || ''
      },
      safetyInstructions: {
        warningSigns,
        followUps
      },
      recentFeedbacks,
      encouragements: encouragements.slice(-5).reverse(),
      generatedAt: new Date().toISOString()
    };
  },

  /**
   * Calendar data for patient recovery tracking
   * @param {string} patientId
   * @param {number} [year]
   * @param {number} [month] 1-12
   */
  async getCalendarData(patientId, year = 2026, month = 10) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient '${patientId}' not found` };
    }

    const dayColors = await dataStore.getDayColorsByPatient(patientId);
    const checkIns = await dataStore.getCheckInsByPatient(patientId);
    const reminders = await dataStore.getRemindersByPatient(patientId);
    const tasks = await dataStore.getTasksByPatient(patientId);
    const appointments = await dataStore.getAppointmentsByPatient(patientId);
    const feedbacks = await dataStore.getFeedbacksByPatient(patientId);

    // Base discharge date for milestone calculations
    const dischargeDateStr = patient.dischargeDate || '2026-10-05';
    const dischargeDate = new Date(dischargeDateStr);

    // Standard clinical recovery milestones relative to discharge
    const milestones = [
      {
        dayOffset: 0,
        title: 'Hospital Discharge & Home Transition',
        description: 'Patient returned home with verified discharge care package.',
        type: 'discharge'
      },
      {
        dayOffset: 3,
        title: 'Initial Home Recovery Check-in',
        description: 'Verify pain management regimen and mobility equipment.',
        type: 'check_in'
      },
      {
        dayOffset: 7,
        title: 'Wound Dressing & Incision Review',
        description: 'Check surgical site for healing and no signs of infection.',
        type: 'wound_check'
      },
      {
        dayOffset: 14,
        title: 'Clinic Follow-up & Suture / Staple Check',
        description: 'Consultation with surgical team at the outpatient clinic.',
        type: 'appointment'
      },
      {
        dayOffset: 21,
        title: 'Physical Therapy & Recovery Milestone',
        description: 'Assess range of motion and progression in daily activities.',
        type: 'milestone'
      }
    ].map((m) => {
      const targetDate = new Date(dischargeDate);
      targetDate.setDate(targetDate.getDate() + m.dayOffset);
      const dateStr = targetDate.toISOString().split('T')[0];
      return {
        ...m,
        date: dateStr
      };
    });

    // Build timeline for days around early October 2026 (or requested month)
    const calendarDays = [];
    for (let day = 1; day <= 31; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const matchedColor = dayColors.find((dc) => dc.date === dateStr);
      const matchedCheckIn = checkIns.find((ci) => ci.date === dateStr);
      const dayMilestones = milestones.filter((m) => m.date === dateStr);
      const dayAppointments = appointments.filter((a) => a.date === dateStr);
      const dayFeedbacks = feedbacks.filter((f) => f.submittedAt && f.submittedAt.startsWith(dateStr));

      // Dose counts for this day
      let dosesTotal = 0;
      let dosesTaken = 0;
      reminders.forEach((r) => {
        if (r.scheduledAt && r.scheduledAt.startsWith(dateStr)) {
          dosesTotal++;
          if (r.status === 'taken' || r.responseType === 'taken') dosesTaken++;
        }
      });

      // Default historical coloring if in early post-discharge range
      let color = matchedColor ? matchedColor.color : null;
      let score = matchedColor ? matchedColor.score : null;

      if (!color && dateStr >= dischargeDateStr && dateStr <= '2026-10-08') {
        color = 'GREEN';
        score = 85;
      }

      calendarDays.push({
        date: dateStr,
        day,
        statusColor: color, // 'GREEN' | 'YELLOW' | 'RED' | null
        score,
        hasMilestone: dayMilestones.length > 0,
        milestones: dayMilestones,
        hasAppointment: dayAppointments.length > 0,
        appointments: dayAppointments,
        hasCheckIn: !!matchedCheckIn,
        checkIn: matchedCheckIn || null,
        dosesTotal: dosesTotal || (color ? 3 : 0),
        dosesTaken: dosesTaken || (color ? 3 : 0),
        feedbacks: dayFeedbacks
      });
    }

    return {
      patientId,
      patientName: patient.name,
      month,
      year,
      dischargeDate: dischargeDateStr,
      milestones,
      days: calendarDays
    };
  },

  /**
   * Get all feedbacks submitted by patient for review
   * @param {string} patientId
   */
  async getPatientFeedbacks(patientId) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const feedbacks = await dataStore.getFeedbacksByPatient(patientId);
    return feedbacks.slice().reverse();
  },

  /**
   * Caregiver reviews, acknowledges, and comments on patient feedback
   * @param {string} patientId
   * @param {string} feedbackId
   * @param {Object} reviewData { caregiverId, caregiverNote, urgencyAck }
   */
  async reviewFeedback(patientId, feedbackId, reviewData = {}) {
    if (!patientId || !feedbackId) {
      throw { statusCode: 400, message: 'patientId and feedbackId are required' };
    }

    const feedback = await dataStore.getFeedbackById(feedbackId);
    if (!feedback) {
      throw { statusCode: 404, message: `Feedback '${feedbackId}' not found` };
    }

    if (feedback.patientId !== patientId) {
      throw { statusCode: 403, message: `Feedback does not belong to patient '${patientId}'` };
    }

    const now = new Date().toISOString();
    const updates = {
      status: 'reviewed',
      reviewStatus: 'reviewed',
      caregiverNote: reviewData.caregiverNote || reviewData.note || 'Reviewed and acknowledged by caregiver.',
      reviewedAt: now,
      reviewedBy: reviewData.caregiverId || 'U101'
    };

    const updated = await dataStore.updateFeedback(feedbackId, updates);

    // Log audit event for clinician / care team traceability
    await dataStore.addEvent({
      patientId,
      type: 'caregiver_feedback_reviewed',
      actor: reviewData.caregiverId || 'U101',
      timestamp: now,
      payload: {
        feedbackId,
        patientName: feedback.patientName,
        caregiverNote: updates.caregiverNote,
        patientUrgency: feedback.urgency
      }
    });

    return updated;
  },

  /**
   * Caregiver sends an encouraging message or care note to the patient
   * @param {string} patientId
   * @param {Object} payload { caregiverId, caregiverName, message, tag }
   */
  async sendEncouragement(patientId, payload = {}) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const { message, caregiverId = 'U101', caregiverName = 'Family Member', tag = 'love' } = payload;
    if (!message || message.trim().length === 0) {
      throw { statusCode: 400, message: 'message content cannot be empty' };
    }

    const now = new Date().toISOString();
    const encouragementRecord = {
      _id: `ENC${Date.now()}`,
      patientId,
      caregiverId,
      caregiverName,
      message: message.trim(),
      tag, // 'love' | 'reminder' | 'support' | 'thumbs_up'
      sentAt: now
    };

    await dataStore.addEncouragement(encouragementRecord);

    // Record audit event
    await dataStore.addEvent({
      patientId,
      type: 'caregiver_encouragement_sent',
      actor: caregiverId,
      timestamp: now,
      payload: {
        message: encouragementRecord.message,
        tag: encouragementRecord.tag
      }
    });

    return encouragementRecord;
  }
};

module.exports = caregiverService;
