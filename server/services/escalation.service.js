const dataStore = require('./dataStore');

/**
 * Supported Escalation Categories
 * Both pre-existing categories and newer required categories
 */
const SUPPORTED_ESCALATION_CATEGORIES = [
  // Existing categories preserved
  'warning_sign',
  'missed_medication',
  'missing_information',
  'overdue_task',
  'medication_question',
  // Newer categories
  'repeated_missed_medication',
  'low_quiz_score',
  'knowledge_gap'
];

/**
 * Supported Priorities / Severities
 * Critical rule: Do not invent emergency classifications unless supported.
 */
const ALLOWED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

/**
 * AI & Clinical Safety Boundary Enforcement
 * Critical rules:
 * - Do not turn a missed medication into a diagnosis
 * - Do not prescribe or recommend medication changes
 * - Do not create emergency classifications (e.g., EMERGENCY, CRITICAL CARE, CODE BLUE)
 */
const FORBIDDEN_ESCALATION_PATTERNS = [
  /\bdiagnos(e|is|ed|ing)\b/i,
  /\bprescrib(e|ed|ing|tion)\b/i,
  /\b(increase|decrease|adjust|double|halve)\s+(the\s+)?(dose|dosage|medication)\b/i,
  /\b(start|stop|discontinue)\s+(taking\s+)?(the\s+)?(medication|drug|pill|tablets?)\b/i,
  /\btreatment\s+plan\b/i,
  /\b(chronic\s+non-?compliance|refractory\s+condition|patholog(y|ic|ical))\b/i,
  /\b(emergency\s+classification|code\s+blue|critical\s+care|icu\s+admission|life-threatening)\b/i
];

const enforceEscalationSafety = (text) => {
  if (!text || typeof text !== 'string') return;
  for (const pattern of FORBIDDEN_ESCALATION_PATTERNS) {
    if (pattern.test(text)) {
      throw {
        statusCode: 400,
        message: `Escalation Safety Violation: Escalation must not contain clinical diagnosis, prescription, dosage changes, or unsupported emergency classifications. Violation matched: '${pattern.source}'`
      };
    }
  }
};

/**
 * Helper to format an escalation response fulfilling Feature 10 specification:
 * - patient
 * - category
 * - description
 * - timestamp
 * - status
 * - priority if already supported
 * - related event
 */
const formatEscalationResponse = (escalation, patientObj = null, patientEvents = []) => {
  const patientData = patientObj || {
    _id: escalation.patientId,
    name: escalation.patientName || `Patient ${escalation.patientId}`
  };

  const priorityVal = escalation.priority || escalation.severity || 'MEDIUM';
  const descVal = escalation.description || escalation.reason || '';

  let relEvent = escalation.relatedEvent;
  if (!relEvent && escalation.relatedEventId) {
    relEvent = { _id: escalation.relatedEventId };
  }
  if (!relEvent && Array.isArray(patientEvents) && patientEvents.length > 0) {
    if (escalation.category === 'missed_medication' || escalation.category === 'repeated_missed_medication') {
      relEvent = patientEvents.find(e => e.type === 'medication_missed' || e.type === 'medication_not_taken');
    } else if (escalation.category === 'medication_question') {
      relEvent = patientEvents.find(e => e.type === 'teach_back' || (e.payload && e.payload.question));
    } else if (escalation.category === 'overdue_task') {
      relEvent = patientEvents.find(e => e.type === 'task_skipped' || e.type === 'task_snoozed' || e.taskId);
    } else if (escalation.category === 'warning_sign') {
      relEvent = patientEvents.find(e => e.type === 'task_snoozed' || e.type === 'check_in' || (e.payload && e.payload.warningSign));
    }
    if (!relEvent) {
      relEvent = patientEvents[0];
    }
  }

  return {
    _id: escalation._id,
    patientId: escalation.patientId,
    patient: {
      _id: patientData._id,
      name: patientData.name,
      age: patientData.age,
      condition: patientData.condition,
      procedure: patientData.procedure || patientData.condition
    },
    category: escalation.category,
    description: descVal,
    reason: descVal, // Compatibility with existing escalations.json
    timestamp: escalation.timestamp || escalation.createdAt || new Date().toISOString(),
    status: escalation.status || 'OPEN',
    priority: priorityVal,
    severity: priorityVal, // Compatibility with existing escalations.json
    relatedEvent: relEvent || null,
    relatedEventId: escalation.relatedEventId || (relEvent ? relEvent._id : null),
    evidence: Array.isArray(escalation.evidence) ? escalation.evidence : (escalation.evidence ? [escalation.evidence] : []),
    trigger: escalation.trigger || 'event',
    itemId: escalation.itemId || null,
    assignedTo: escalation.assignedTo || null,
    resolvedBy: escalation.resolvedBy || null,
    resolution: escalation.resolution || null
  };
};

/**
 * Escalation Service (Feature 10)
 */
const escalationService = {
  SUPPORTED_ESCALATION_CATEGORIES,
  ALLOWED_PRIORITIES,
  enforceEscalationSafety,
  formatEscalationResponse,

  /**
   * List escalations with optional filters
   * @param {Object} [filters] { patientId, category, status, priority, severity }
   */
  async getEscalations(filters = {}) {
    const rawList = await dataStore.listEscalations(filters);
    const patients = await dataStore.listPatients();
    const patientMap = new Map(patients.map(p => [p._id, p]));

    const formatted = [];
    for (const item of rawList) {
      const patientObj = patientMap.get(item.patientId);
      const patientEvents = await dataStore.getEventsByPatient(item.patientId);
      formatted.push(formatEscalationResponse(item, patientObj, patientEvents));
    }
    return formatted;
  },

  /**
   * Get single escalation by ID
   * @param {string} id 
   */
  async getEscalationById(id) {
    if (!id) {
      throw { statusCode: 400, message: 'Escalation ID is required' };
    }
    const escalation = await dataStore.getEscalationById(id);
    if (!escalation) {
      throw { statusCode: 404, message: `Escalation with ID '${id}' not found` };
    }

    const patient = await dataStore.getPatient(escalation.patientId);
    const patientEvents = await dataStore.getEventsByPatient(escalation.patientId);
    return formatEscalationResponse(escalation, patient, patientEvents);
  },

  /**
   * Get all escalations for a specific patient
   * @param {string} patientId 
   */
  async getEscalationsByPatient(patientId) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }
    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    const escalations = await dataStore.getEscalationsByPatient(patientId);
    const patientEvents = await dataStore.getEventsByPatient(patientId);
    return escalations.map(e => formatEscalationResponse(e, patient, patientEvents));
  },

  /**
   * Create an escalation using actual events/data
   * @param {Object} data 
   */
  async createEscalation(data) {
    const {
      patientId,
      category,
      description,
      reason,
      priority,
      severity,
      relatedEvent,
      relatedEventId,
      evidence,
      trigger,
      itemId,
      status,
      assignedTo
    } = data;

    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    if (!category) {
      throw { statusCode: 400, message: 'category is required' };
    }

    if (!SUPPORTED_ESCALATION_CATEGORIES.includes(category)) {
      throw {
        statusCode: 400,
        message: `Invalid escalation category '${category}'. Supported categories: ${SUPPORTED_ESCALATION_CATEGORIES.join(', ')}`
      };
    }

    const desc = description || reason;
    if (!desc || typeof desc !== 'string' || desc.trim().length === 0) {
      throw { statusCode: 400, message: 'description/reason is required' };
    }

    // Safety validation: Critical rule check
    enforceEscalationSafety(desc);

    const prio = (priority || severity || 'MEDIUM').toUpperCase();
    if (!ALLOWED_PRIORITIES.includes(prio)) {
      throw {
        statusCode: 400,
        message: `Invalid priority/severity '${prio}'. Emergency classifications are strictly prohibited. Supported: ${ALLOWED_PRIORITIES.join(', ')}`
      };
    }

    // Grounding: If relatedEventId is provided, verify it belongs strictly to this patient
    let resolvedRelatedEvent = relatedEvent;
    if (relatedEventId) {
      const patientEvents = await dataStore.getEventsByPatient(patientId);
      const matchedEvent = patientEvents.find(e => e._id === relatedEventId);
      if (!matchedEvent) {
        throw {
          statusCode: 400,
          message: `Related event '${relatedEventId}' does not exist or does not belong to patient '${patientId}'`
        };
      }
      resolvedRelatedEvent = matchedEvent;
    }

    const newEscalation = {
      _id: data._id || `ESC_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      patientId,
      category,
      reason: desc,
      description: desc,
      severity: prio,
      priority: prio,
      trigger: trigger || 'event',
      evidence: Array.isArray(evidence) ? evidence : (evidence ? [evidence] : []),
      relatedEvent: resolvedRelatedEvent || null,
      relatedEventId: relatedEventId || (resolvedRelatedEvent ? resolvedRelatedEvent._id : null),
      itemId: itemId || null,
      status: status || 'OPEN',
      assignedTo: assignedTo || patient.caregiverId || 'N001',
      timestamp: data.timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const saved = await dataStore.saveEscalation(newEscalation);
    const patientEvents = await dataStore.getEventsByPatient(patientId);
    return formatEscalationResponse(saved, patient, patientEvents);
  },

  /**
   * Update an existing escalation status or resolution
   * @param {string} id 
   * @param {Object} updates 
   */
  async updateEscalation(id, updates = {}) {
    if (!id) {
      throw { statusCode: 400, message: 'Escalation ID is required' };
    }

    const existing = await dataStore.getEscalationById(id);
    if (!existing) {
      throw { statusCode: 404, message: `Escalation with ID '${id}' not found` };
    }

    if (updates.status && !['OPEN', 'IN_REVIEW', 'RESOLVED'].includes(updates.status)) {
      throw { statusCode: 400, message: `Invalid status '${updates.status}'. Allowed: OPEN, IN_REVIEW, RESOLVED` };
    }

    if (updates.priority && !ALLOWED_PRIORITIES.includes(updates.priority.toUpperCase())) {
      throw { statusCode: 400, message: `Invalid priority '${updates.priority}'. Allowed: ${ALLOWED_PRIORITIES.join(', ')}` };
    }

    if (updates.description) {
      enforceEscalationSafety(updates.description);
      updates.reason = updates.description;
    }

    if (updates.resolution) {
      enforceEscalationSafety(updates.resolution);
    }

    const updated = await dataStore.updateEscalation(id, updates);
    const patient = await dataStore.getPatient(existing.patientId);
    const patientEvents = await dataStore.getEventsByPatient(existing.patientId);
    return formatEscalationResponse(updated, patient, patientEvents);
  },

  /**
   * Detect and evaluate potential escalations strictly based on actual patient events and data.
   * Grounded in:
   * - missed medication events / reminders (missed_medication, repeated_missed_medication)
   * - daily recovery quiz score (low_quiz_score)
   * - incorrect quiz answers (knowledge_gap)
   * - patient teach-back / question box (medication_question)
   * - warning signs in check-ins (warning_sign)
   *
   * @param {string} patientId 
   */
  async evaluateEscalations(patientId) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    const events = await dataStore.getEventsByPatient(patientId);
    const reminders = await dataStore.getRemindersByPatient(patientId);
    const quizSessions = await dataStore.getQuizSessionsByPatient(patientId);
    const existingEscalations = await dataStore.getEscalationsByPatient(patientId);

    const detected = [];

    // 1. Medication Missed Evaluation (missed_medication / repeated_missed_medication)
    const missedReminders = reminders.filter(r => r.status === 'missed' || r.responseType === 'not_taken');
    const missedEvents = events.filter(e => e.type === 'medication_missed' || e.type === 'medication_not_taken');
    const totalMissedCount = Math.max(missedReminders.length, missedEvents.length);

    if (totalMissedCount >= 2) {
      const latestMissedEvent = missedEvents[0] || (missedReminders[0] ? { _id: missedReminders[0]._id, type: 'medication_missed' } : null);
      detected.push({
        patientId,
        category: 'repeated_missed_medication',
        description: `Patient has repeated missed medication doses (${totalMissedCount} doses missed). Follow-up required.`,
        priority: 'HIGH',
        trigger: 'medication_reminder',
        relatedEvent: latestMissedEvent,
        relatedEventId: latestMissedEvent ? latestMissedEvent._id : null,
        evidence: missedReminders.map(r => `Missed ${r.medicationName || 'medication'}`).concat(missedEvents.map(e => `Event ${e._id}: ${e.type}`))
      });
    } else if (totalMissedCount === 1) {
      const missedRem = missedReminders[0];
      const missedEvt = missedEvents[0];
      const medName = missedRem ? missedRem.medicationName : 'scheduled medication';
      detected.push({
        patientId,
        category: 'missed_medication',
        description: `Patient missed scheduled dose of ${medName}. Review with patient or caregiver.`,
        priority: 'MEDIUM',
        trigger: 'medication_reminder',
        relatedEvent: missedEvt || null,
        relatedEventId: missedEvt ? missedEvt._id : null,
        evidence: [missedRem ? `Missed dose: ${medName}` : `Event ${missedEvt._id}`]
      });
    }

    // 2. Quiz Performance Evaluation (low_quiz_score)
    const latestQuizSession = quizSessions && quizSessions.length > 0 ? quizSessions[0] : null;
    if (latestQuizSession) {
      const answers = await dataStore.getQuizAnswersBySessionId(latestQuizSession._id);
      const score = typeof latestQuizSession.score === 'number'
        ? latestQuizSession.score
        : (answers.length > 0 ? Math.round((answers.filter(a => a.correct).length / 5) * 100) : 100);

      if (score < 70) {
        detected.push({
          patientId,
          category: 'low_quiz_score',
          description: `Patient scored ${score}% on recovery quiz (${answers.filter(a => a.correct).length}/5 correct). Reinforcement advised.`,
          priority: score < 50 ? 'HIGH' : 'MEDIUM',
          trigger: 'quiz',
          relatedEvent: null,
          evidence: [`Quiz session ${latestQuizSession._id} scored ${score}%`]
        });
      }

      // 3. Knowledge Gap Evaluation (knowledge_gap)
      const wrongAnswers = answers.filter(a => !a.correct);
      if (wrongAnswers.length > 0) {
        const questions = await dataStore.getQuizQuestionsBySessionId(latestQuizSession._id);
        for (const wa of wrongAnswers) {
          const q = questions.find(item => item._id === wa.questionId);
          detected.push({
            patientId,
            category: 'knowledge_gap',
            description: `Patient demonstrated knowledge gap regarding: "${q ? q.question.slice(0, 70) : 'recovery guideline'}".`,
            priority: 'MEDIUM',
            trigger: 'quiz',
            itemId: q ? q.sourceItemId : null,
            relatedEvent: null,
            evidence: [
              `Question: ${q ? q.question : wa.questionId}`,
              `Selected: ${wa.selectedAnswer || 'none'}`,
              `Source: ${q ? q.sourceSentence : 'verified instructions'}`
            ]
          });
        }
      }
    }

    // 4. Medication Question Evaluation (medication_question)
    const questionEvents = events.filter(e =>
      (e.type === 'teach_back' && e.payload && e.payload.question) ||
      (e.type === 'patient_question')
    );
    for (const qe of questionEvents) {
      detected.push({
        patientId,
        category: 'medication_question',
        description: `Patient submitted treatment/medication question: "${qe.payload.question || qe.payload.query || 'timing inquiry'}".`,
        priority: 'HIGH',
        trigger: 'question_box',
        relatedEvent: qe,
        relatedEventId: qe._id,
        evidence: [qe.payload.question || qe.payload.query || 'Medication question']
      });
    }

    // Return combined formatted escalations without duplicates
    const existingCategories = new Set(existingEscalations.map(e => e.category));
    const newToSave = detected.filter(d => !existingCategories.has(d.category));

    const savedNew = [];
    for (const item of newToSave) {
      const created = await this.createEscalation({
        ...item,
        status: 'OPEN'
      });
      savedNew.push(created);
    }

    const allFormatted = (await dataStore.getEscalationsByPatient(patientId))
      .map(e => formatEscalationResponse(e, patient));

    return {
      patientId,
      patient: {
        _id: patient._id,
        name: patient.name,
        condition: patient.condition
      },
      totalEscalations: allFormatted.length,
      newEscalationsDetected: savedNew.length,
      escalations: allFormatted
    };
  }
};

module.exports = escalationService;
