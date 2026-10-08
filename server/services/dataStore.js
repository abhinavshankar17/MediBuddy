const { loadMockJson } = require('../seed/seed');
const { getDBStatus } = require('../config/db');
const { Patient, Document, ExtractedItem, Task, MedicationReminder, Event, QuizSession, QuizQuestion, QuizAnswer, PatientInsight, NurseBrief } = require('../models');

// In-memory cache loaded from authoritative data/mock/
let memoryCache = {
  patients: null,
  documents: null,
  extractedItems: null,
  tasks: null,
  medicationReminders: null,
  events: null,
  quizSessions: null,
  quizQuestions: null,
  quizAnswers: null,
  patientInsights: null,
  nurseBriefs: null
};

const getCache = () => {
  if (!memoryCache.patients) {
    memoryCache.patients = loadMockJson('patients.json') || [];
    memoryCache.documents = loadMockJson('documents.json') || [];
    memoryCache.extractedItems = loadMockJson('extractedItems.json') || [];
    memoryCache.tasks = loadMockJson('tasks.json') || [];
    memoryCache.medicationReminders = loadMockJson('medicationReminders.json') || [];
    memoryCache.events = loadMockJson('events.json') || [];
    memoryCache.quizSessions = loadMockJson('quizSessions.json') || [];
    memoryCache.quizQuestions = loadMockJson('quizQuestions.json') || [];
    memoryCache.quizAnswers = loadMockJson('quizAnswers.json') || [];
    memoryCache.patientInsights = loadMockJson('patientInsights.json') || [];
    memoryCache.nurseBriefs = loadMockJson('nurseBriefs.json') || [];
  }
  return memoryCache;
};

/**
 * DataStore providing unified access with MongoDB support and in-memory mock fallback
 */
const dataStore = {
  /**
   * Find patient by ID
   * @param {string} patientId 
   */
  async getPatient(patientId) {
    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const doc = await Patient.findById(patientId).lean();
        if (doc) return doc;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { patients } = getCache();
    return patients.find(p => p._id === patientId || p.syntheticId === patientId) || null;
  },

  /**
   * List all patients with optional filtering
   * @param {Object} filter 
   */
  async listPatients(filter = {}) {
    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const docs = await Patient.find(filter).lean();
        if (docs && docs.length > 0) return docs;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { patients } = getCache();
    let result = [...patients];

    if (filter.caregiverId) {
      result = result.filter(p => p.caregiverId === filter.caregiverId);
    }
    if (filter.language) {
      result = result.filter(p => p.language === filter.language);
    }
    if (filter.recoveryPhase) {
      result = result.filter(p => p.recoveryPhase === filter.recoveryPhase);
    }

    return result;
  },

  /**
   * Get discharge document strictly by patientId
   * @param {string} patientId 
   */
  async getDocumentByPatient(patientId) {
    if (!patientId) return null;

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const doc = await Document.findOne({ patientId }).lean();
        if (doc) return doc;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { documents } = getCache();
    return documents.find(d => d.patientId === patientId) || null;
  },

  /**
   * Get document by its ID, with optional patientId verification for strict isolation
   * @param {string} documentId 
   * @param {string} [patientId] 
   */
  async getDocumentById(documentId, patientId = null) {
    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const query = { _id: documentId };
        if (patientId) query.patientId = patientId;
        const doc = await Document.findOne(query).lean();
        if (doc) return doc;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { documents } = getCache();
    const doc = documents.find(d => d._id === documentId);
    if (!doc) return null;

    if (patientId && doc.patientId !== patientId) {
      return null;
    }

    return doc;
  },

  /**
   * Get extracted instructions strictly isolated by patientId
   * @param {string} patientId 
   * @param {Object} [options] 
   */
  async getExtractedItemsByPatient(patientId, options = {}) {
    if (!patientId) return [];

    const isVerifiedOnly = options.verifiedOnly !== false && !options.includeUnverified && !options.all;

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const query = { patientId };
        if (options.status) {
          query.status = options.status;
        } else if (isVerifiedOnly) {
          query.status = 'APPROVED';
          query.verifiedSource = true;
        }
        if (options.type) query.type = options.type;
        const docs = await ExtractedItem.find(query).lean();
        if (docs && docs.length > 0) return docs;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { extractedItems } = getCache();
    let items = extractedItems.filter(i => i.patientId === patientId);

    if (options.status) {
      items = items.filter(i => i.status === options.status);
    } else if (isVerifiedOnly) {
      items = items.filter(i => i.verifiedSource === true && i.status === 'APPROVED');
    }

    if (options.type) {
      items = items.filter(i => i.type === options.type);
    }

    return items;
  },

  /**
   * Get tasks strictly isolated by patientId
   * @param {string} patientId 
   * @param {Object} [options] 
   */
  async getTasksByPatient(patientId, options = {}) {
    if (!patientId) return [];

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const query = { patientId };
        if (options.status) query.status = options.status;
        if (options.priority) query.priority = options.priority;
        const docs = await Task.find(query).lean();
        if (docs && docs.length > 0) return docs;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { tasks } = getCache();
    let patientTasks = tasks.filter(t => t.patientId === patientId);

    if (options.status) {
      patientTasks = patientTasks.filter(t => t.status === options.status);
    }
    if (options.priority) {
      patientTasks = patientTasks.filter(t => t.priority === options.priority);
    }

    return patientTasks;
  },

  /**
   * Get medication reminders strictly isolated by patientId
   * @param {string} patientId 
   * @param {Object} [options] 
   */
  async getRemindersByPatient(patientId, options = {}) {
    if (!patientId) return [];

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const query = { patientId };
        if (options.status) query.status = options.status;
        const docs = await MedicationReminder.find(query).lean();
        if (docs && docs.length > 0) return docs;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { medicationReminders } = getCache();
    let reminders = medicationReminders.filter(r => r.patientId === patientId);

    if (options.status) {
      reminders = reminders.filter(r => r.status === options.status);
    }

    return reminders;
  },

  /**
   * Get a reminder by ID, with optional patientId validation
   * @param {string} reminderId 
   * @param {string} [patientId] 
   */
  async getReminderById(reminderId, patientId = null) {
    if (!reminderId) return null;

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const query = { _id: reminderId };
        if (patientId) query.patientId = patientId;
        const doc = await MedicationReminder.findOne(query).lean();
        if (doc) return doc;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { medicationReminders } = getCache();
    const reminder = medicationReminders.find(r => r._id === reminderId);
    if (!reminder) return null;

    if (patientId && reminder.patientId !== patientId) {
      return null;
    }

    return reminder;
  },

  /**
   * Update a medication reminder in database or memory
   * @param {string} reminderId 
   * @param {Object} updates 
   */
  async updateReminder(reminderId, updates) {
    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const updated = await MedicationReminder.findByIdAndUpdate(reminderId, updates, { new: true }).lean();
        if (updated) return updated;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { medicationReminders } = getCache();
    const idx = medicationReminders.findIndex(r => r._id === reminderId);
    if (idx === -1) return null;

    medicationReminders[idx] = {
      ...medicationReminders[idx],
      ...updates
    };

    return medicationReminders[idx];
  },

  /**
   * Add an audit/recovery event
   * @param {Object} eventData 
   */
  async addEvent(eventData) {
    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const newEvent = new Event(eventData);
        await newEvent.save();
        return newEvent.toObject();
      } catch (err) {
        // Fallback to cache
      }
    }

    const { events } = getCache();
    const event = {
      _id: eventData._id || `E${Date.now().toString().slice(-4)}`,
      timestamp: eventData.timestamp || new Date().toISOString(),
      ...eventData
    };
    events.push(event);
    return event;
  },

  /**
   * Get events strictly isolated by patientId
   * @param {string} patientId 
   * @param {Object} [options] 
   */
  async getEventsByPatient(patientId, options = {}) {
    if (!patientId) return [];

    const MEDICATION_EVENT_TYPES = [
      'reminder_sent',
      'reminder_opened',
      'medication_taken',
      'medication_not_taken',
      'medication_missed',
      'medication_acknowledged'
    ];

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const query = { patientId };
        if (options.type) query.type = options.type;
        if (options.medicationOnly) query.type = { $in: MEDICATION_EVENT_TYPES };
        if (options.reminderId) query.reminderId = options.reminderId;
        const docs = await Event.find(query).sort({ timestamp: -1 }).lean();
        if (docs && docs.length > 0) return docs;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { events } = getCache();
    let patientEvents = events.filter(e => e.patientId === patientId);

    if (options.type) {
      patientEvents = patientEvents.filter(e => e.type === options.type);
    }
    if (options.medicationOnly) {
      patientEvents = patientEvents.filter(e => MEDICATION_EVENT_TYPES.includes(e.type));
    }
    if (options.reminderId) {
      patientEvents = patientEvents.filter(e => e.reminderId === options.reminderId);
    }

    return patientEvents;
  },

  /**
   * Get single event by ID with optional patient verification
   * @param {string} eventId 
   * @param {string} [patientId] 
   */
  async getEventById(eventId, patientId = null) {
    if (!eventId) return null;

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const query = { _id: eventId };
        if (patientId) query.patientId = patientId;
        const doc = await Event.findOne(query).lean();
        if (doc) return doc;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { events } = getCache();
    const event = events.find(e => e._id === eventId);
    if (!event) return null;

    if (patientId && event.patientId !== patientId) {
      return null;
    }

    return event;
  },

  /**
   * Get quiz sessions for a patient
   * @param {string} patientId 
   */
  async getQuizSessionsByPatient(patientId) {
    if (!patientId) return [];

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const docs = await QuizSession.find({ patientId }).sort({ date: -1 }).lean();
        if (docs && docs.length > 0) return docs;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { quizSessions } = getCache();
    return quizSessions.filter(s => s.patientId === patientId);
  },

  /**
   * Get quiz session by ID with optional patient verification
   * @param {string} sessionId 
   * @param {string} [patientId] 
   */
  async getQuizSessionById(sessionId, patientId = null) {
    if (!sessionId) return null;

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const query = { _id: sessionId };
        if (patientId) query.patientId = patientId;
        const doc = await QuizSession.findOne(query).lean();
        if (doc) return doc;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { quizSessions } = getCache();
    const session = quizSessions.find(s => s._id === sessionId);
    if (!session) return null;

    if (patientId && session.patientId !== patientId) {
      return null;
    }

    return session;
  },

  /**
   * Get questions for a quiz session
   * @param {string} sessionId 
   */
  async getQuizQuestionsBySessionId(sessionId) {
    if (!sessionId) return [];

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const docs = await QuizQuestion.find({ quizSessionId: sessionId }).lean();
        if (docs && docs.length > 0) return docs;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { quizQuestions } = getCache();
    return quizQuestions.filter(q => q.quizSessionId === sessionId);
  },

  /**
   * Create a quiz session with CRITICAL REQUIREMENT validation: EXACTLY 5 questions
   * @param {Object} sessionData 
   * @param {Array} questions 
   */
  async createQuizSession(sessionData, questions) {
    // CRITICAL REQUIREMENT VALIDATION:
    // Every quiz session MUST contain exactly 5 questions.
    if (!Array.isArray(questions) || questions.length !== 5) {
      throw {
        statusCode: 400,
        message: `Validation Error: Every quiz session MUST contain exactly 5 questions. Received ${Array.isArray(questions) ? questions.length : 0} questions.`
      };
    }

    // Validation: prevent duplicate questions within session
    const seenIds = new Set();
    const seenTexts = new Set();
    for (const q of questions) {
      if (q._id && seenIds.has(q._id)) {
        throw {
          statusCode: 400,
          message: `Validation Error: Duplicate question ID '${q._id}' within the same quiz session.`
        };
      }
      if (q.question && seenTexts.has(q.question.trim().toLowerCase())) {
        throw {
          statusCode: 400,
          message: `Validation Error: Duplicate question text '${q.question}' within the same quiz session.`
        };
      }
      if (q._id) seenIds.add(q._id);
      if (q.question) seenTexts.add(q.question.trim().toLowerCase());
    }

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const newSession = new QuizSession(sessionData);
        await newSession.save();
        await QuizQuestion.insertMany(questions);
        return newSession.toObject();
      } catch (err) {
        // Fallback to cache
      }
    }

    const { quizSessions, quizQuestions } = getCache();
    quizSessions.push(sessionData);
    for (const q of questions) {
      quizQuestions.push(q);
    }

    return sessionData;
  },

  /**
   * Update quiz session (e.g. status, score, completedAt)
   * @param {string} sessionId 
   * @param {Object} updates 
   */
  async updateQuizSession(sessionId, updates) {
    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const doc = await QuizSession.findByIdAndUpdate(sessionId, updates, { new: true }).lean();
        if (doc) return doc;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { quizSessions } = getCache();
    const idx = quizSessions.findIndex(s => s._id === sessionId);
    if (idx === -1) return null;

    quizSessions[idx] = {
      ...quizSessions[idx],
      ...updates
    };

    return quizSessions[idx];
  },

  /**
   * Save patient answers
   * @param {Array} answers 
   */
  async saveQuizAnswers(answers) {
    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        await QuizAnswer.insertMany(answers);
      } catch (err) {
        // Fallback to cache
      }
    }

    const { quizAnswers } = getCache();
    for (const ans of answers) {
      quizAnswers.push(ans);
    }
    return answers;
  },

  /**
   * Get single question by ID
   * @param {string} questionId 
   */
  async getQuestionById(questionId) {
    if (!questionId) return null;

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const doc = await QuizQuestion.findById(questionId).lean();
        if (doc) return doc;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { quizQuestions } = getCache();
    return quizQuestions.find(q => q._id === questionId) || null;
  },

  /**
   * Get answers stored for a session
   * @param {string} sessionId 
   */
  async getQuizAnswersBySessionId(sessionId) {
    if (!sessionId) return [];

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const docs = await QuizAnswer.find({ quizSessionId: sessionId }).lean();
        if (docs && docs.length > 0) return docs;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { quizAnswers } = getCache();
    return quizAnswers.filter(a => a.quizSessionId === sessionId);
  },

  /**
   * Check if a question has already been answered in a session
   * @param {string} sessionId 
   * @param {string} questionId 
   */
  async getQuizAnswer(sessionId, questionId) {
    if (!sessionId || !questionId) return null;

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const doc = await QuizAnswer.findOne({ quizSessionId: sessionId, questionId }).lean();
        if (doc) return doc;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { quizAnswers } = getCache();
    return quizAnswers.find(a => a.quizSessionId === sessionId && a.questionId === questionId) || null;
  },

  /**
   * Save a single quiz answer
   * @param {Object} answer 
   */
  async saveQuizAnswer(answer) {
    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const newAns = new QuizAnswer(answer);
        await newAns.save();
        return newAns.toObject();
      } catch (err) {
        // Fallback to cache
      }
    }

    const { quizAnswers } = getCache();
    quizAnswers.push(answer);
    return answer;
  },

  /**
   * Get all patient insights for a patient
   * @param {string} patientId 
   */
  async getPatientInsightsByPatient(patientId) {
    if (!patientId) return [];

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const docs = await PatientInsight.find({ patientId }).sort({ generatedAt: -1 }).lean();
        if (docs && docs.length > 0) return docs;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { patientInsights } = getCache();
    return patientInsights.filter(pi => pi.patientId === patientId);
  },

  /**
   * Get latest patient insight for a patient
   * @param {string} patientId 
   */
  async getLatestPatientInsight(patientId) {
    if (!patientId) return null;

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const doc = await PatientInsight.findOne({ patientId }).sort({ generatedAt: -1 }).lean();
        if (doc) return doc;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { patientInsights } = getCache();
    const insights = patientInsights
      .filter(pi => pi.patientId === patientId)
      .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));

    return insights.length > 0 ? insights[0] : null;
  },

  /**
   * Get patient insight by ID with optional patient verification
   * @param {string} insightId 
   * @param {string} [patientId] 
   */
  async getPatientInsightById(insightId, patientId = null) {
    if (!insightId) return null;

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const query = { _id: insightId };
        if (patientId) query.patientId = patientId;
        const doc = await PatientInsight.findOne(query).lean();
        if (doc) return doc;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { patientInsights } = getCache();
    const insight = patientInsights.find(pi => pi._id === insightId);
    if (!insight) return null;

    if (patientId && insight.patientId !== patientId) {
      return null;
    }

    return insight;
  },

  /**
   * Save or persist a patient insight
   * @param {Object} insightData 
   */
  async savePatientInsight(insightData) {
    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const newInsight = new PatientInsight(insightData);
        await newInsight.save();
        return newInsight.toObject();
      } catch (err) {
        // Fallback to cache
      }
    }

    const { patientInsights } = getCache();
    const idx = patientInsights.findIndex(pi => pi._id === insightData._id);
    if (idx !== -1) {
      patientInsights[idx] = { ...patientInsights[idx], ...insightData };
      return patientInsights[idx];
    } else {
      patientInsights.push(insightData);
      return insightData;
    }
  },

  /**
   * Get all nurse briefs
   */
  async getNurseBriefs() {
    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const docs = await NurseBrief.find().sort({ generatedAt: -1 }).lean();
        if (docs && docs.length > 0) return docs;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { nurseBriefs } = getCache();
    return [...nurseBriefs];
  },

  /**
   * Get latest nurse brief for a specific patient
   * @param {string} patientId 
   */
  async getNurseBriefByPatient(patientId) {
    if (!patientId) return null;

    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const doc = await NurseBrief.findOne({ patientId }).sort({ generatedAt: -1 }).lean();
        if (doc) return doc;
      } catch (err) {
        // Fallback to cache
      }
    }

    const { nurseBriefs } = getCache();
    // Return latest brief for patient
    const matches = nurseBriefs
      .filter(nb => nb.patientId === patientId)
      .sort((a, b) => new Date(b.generatedAt || 0) - new Date(a.generatedAt || 0));

    return matches.length > 0 ? matches[0] : null;
  },

  /**
   * Save a nurse brief
   * @param {Object} briefData 
   */
  async saveNurseBrief(briefData) {
    const dbStatus = getDBStatus();
    if (dbStatus.connected) {
      try {
        const newDoc = new NurseBrief(briefData);
        await newDoc.save();
        return newDoc.toObject();
      } catch (err) {
        // Fallback to cache
      }
    }

    const { nurseBriefs } = getCache();
    const idx = nurseBriefs.findIndex(nb => nb._id === briefData._id);
    if (idx !== -1) {
      nurseBriefs[idx] = { ...nurseBriefs[idx], ...briefData };
      return nurseBriefs[idx];
    } else {
      nurseBriefs.push(briefData);
      return briefData;
    }
  }
};

module.exports = dataStore;
