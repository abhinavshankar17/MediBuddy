const dataStore = require('./dataStore');

/**
 * Helper to sanitize questions and strip correctAnswer before completion (API Safety)
 */
const sanitizeQuestionForPatient = (question) => {
  const { correctAnswer, ...safeQuestion } = question;
  return safeQuestion;
};

/**
 * Validate that a question set strictly meets the critical requirement:
 * Exactly 5 questions, no duplicates.
 */
const validateExactFiveQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length !== 5) {
    throw {
      statusCode: 400,
      message: `Validation Error: Every quiz session MUST contain exactly 5 questions. Received ${Array.isArray(questions) ? questions.length : 0} questions.`
    };
  }

  const seenIds = new Set();
  const seenTexts = new Set();
  for (const q of questions) {
    if (q._id && seenIds.has(q._id)) {
      throw {
        statusCode: 400,
        message: `Validation Error: Duplicate question ID '${q._id}' within the same quiz session.`
      };
    }
    const normalizedText = (q.question || '').trim().toLowerCase();
    if (normalizedText && seenTexts.has(normalizedText)) {
      throw {
        statusCode: 400,
        message: `Validation Error: Duplicate question text '${q.question}' within the same quiz session.`
      };
    }
    if (q._id) seenIds.add(q._id);
    if (normalizedText) seenTexts.add(normalizedText);
  }
};

/**
 * Multilingual Question Translations (English, Hindi, Tamil)
 * Preserves clinical medication names, dosages, and safety logic.
 */
const QUESTION_TRANSLATIONS = {
  'When should you take Paracetamol?': {
    hi: {
      question: 'पैरासिटामोल (Paracetamol) आपको कब लेनी चाहिए?',
      options: ['नाश्ते से पहले', 'भोजन के बाद', 'सोते समय', 'केवल दर्द होने पर'],
      correctAnswer: 'भोजन के बाद'
    },
    ta: {
      question: 'பாராசிட்டமால் (Paracetamol) எப்போது உட்கொள்ள வேண்டும்?',
      options: ['காலை உணவுக்கு முன்', 'உணவுக்குப் பிறகு', 'படுக்கைக்குச் செல்லும் முன்', 'வலி இருக்கும் போது மட்டும்'],
      correctAnswer: 'உணவுக்குப் பிறகு'
    }
  },
  'When should you take Omeprazole?': {
    hi: {
      question: 'ओमेप्राजोल (Omeprazole) आपको कब लेनी चाहिए?',
      options: ['दोपहर के भोजन के बाद', 'नाश्ते से पहले', 'सोते समय', 'रात के खाने के बाद'],
      correctAnswer: 'नाश्ते से पहले'
    },
    ta: {
      question: 'ஒமிபிரசோல் (Omeprazole) எப்போது உட்கொள்ள வேண்டும்?',
      options: ['மதிய உணவுக்குப் பிறகு', 'காலை உணவுக்கு முன்', 'படுக்கைக்குச் செல்லும் முன்', 'இரவு உணவுக்குப் பிறகு'],
      correctAnswer: 'காலை உணவுக்கு முன்'
    }
  },
  'How many times a day should you perform knee exercises?': {
    hi: {
      question: 'आपको दिन में कितनी बार घुटने का व्यायाम करना चाहिए?',
      options: ['दिन में एक बार', 'दिन में दो बार', 'दिन में तीन बार', 'केवल जब मन करे'],
      correctAnswer: 'दिन में दो बार'
    },
    ta: {
      question: 'நாளைக்கு எத்தனை முறை முழங்கால் உடற்பயிற்சி செய்ய வேண்டும்?',
      options: ['நாளைக்கு ஒரு முறை', 'நாளைக்கு இரண்டு முறை', 'நாளைக்கு மூன்று முறை', 'தோன்றும் போது மட்டும்'],
      correctAnswer: 'நாளைக்கு இரண்டு முறை'
    }
  },
  'What assistance should you use while walking?': {
    hi: {
      question: 'चलते समय आपको किस सहायता का उपयोग करना चाहिए?',
      options: ['किसी सहायता की आवश्यकता नहीं', 'वॉकर (Walker)', 'व्हीलचेयर (Wheelchair)', 'छड़ी (Cane)'],
      correctAnswer: 'वॉकर (Walker)'
    },
    ta: {
      question: 'நடக்கும் போது எந்த உதவி சாதனத்தைப் பயன்படுத்த வேண்டும்?',
      options: ['எந்த உதவியும் தேவையில்லை', 'வாக்கர் (Walker)', 'சக்கர நாற்காலி (Wheelchair)', 'ஊன்றுகோல் (Cane)'],
      correctAnswer: 'வாக்கர் (Walker)'
    }
  },
  'When is your follow-up clinic visit?': {
    hi: {
      question: 'आपकी अगली क्लिनिक फॉलो-अप जांच कब है?',
      options: ['डिस्चार्ज के 2 सप्ताह बाद', 'डिस्चार्ज के 1 सप्ताह बाद', 'डिस्चार्ज के 1 महीने बाद', 'आवश्यकता नहीं'],
      correctAnswer: 'डिस्चार्ज के 1 सप्ताह बाद'
    },
    ta: {
      question: 'உங்கள் அடுத்த கிளினிக் பரிசோதனை எப்போது?',
      options: ['டிஸ்சார்ஜ் ஆன 2 வாரங்களுக்குப் பிறகு', 'டிஸ்சார்ஜ் ஆன 1 வாரத்திற்குப் பிறகு', 'டிஸ்சார்ஜ் ஆன 1 மாதத்திற்குப் பிறகு', 'தேவையில்லை'],
      correctAnswer: 'டிஸ்சார்ஜ் ஆன 1 வாரத்திற்குப் பிறகு'
    }
  }
};

const localizeSingleQuestion = (q, lang = 'en') => {
  if (!q || !lang || lang === 'en') return q;
  const match = QUESTION_TRANSLATIONS[q.question];
  if (match && match[lang]) {
    const loc = match[lang];
    return {
      ...q,
      question: loc.question,
      options: loc.options,
      correctAnswer: loc.correctAnswer,
      originalQuestion: q.question,
      originalText: q.question,
      originalOptions: q.options,
      originalCorrectAnswer: q.correctAnswer,
      language: lang
    };
  }
  return q;
};

/**
 * Service for daily quiz operations, answer storage, and educational scoring
 */
const quizService = {
  /**
   * Retrieve today's quiz for a patient
   */
  async getTodayQuiz(patientId, date = '2026-10-08', options = {}) {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    const sessions = await dataStore.getQuizSessionsByPatient(patientId);
    let todaySession = sessions.find(s => s.date === date);

    if (!todaySession) {
      return await this.startQuiz(patientId, date);
    }

    const questions = await dataStore.getQuizQuestionsBySessionId(todaySession._id);
    validateExactFiveQuestions(questions);

    const isCompleted = todaySession.status === 'completed';
    const targetLang = (typeof date === 'object' && date.language) ? date.language : (options.language || patient.language || 'en');
    const localized = questions.map(q => localizeSingleQuestion(q, targetLang));
    const safeQuestions = isCompleted
      ? localized
      : localized.map(sanitizeQuestionForPatient);

    const disclaimer = targetLang === 'hi'
      ? 'एआई-जनरेटेड सामग्री — उपयोग करने से पहले सत्यापित करें'
      : targetLang === 'ta'
      ? 'AI உருவாக்கிய உள்ளடக்கம் — செயல்படுவதற்கு முன் சரிபார்க்கவும்'
      : 'AI-generated content — verify before acting';

    return {
      session: todaySession,
      totalQuestions: 5,
      questions: safeQuestions,
      isCompleted,
      language: targetLang,
      disclaimer
    };
  },

  /**
   * Start or create a new daily quiz session for patient
   */
  async startQuiz(patientId, date = '2026-10-08') {
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required' };
    }

    const patient = await dataStore.getPatient(patientId);
    if (!patient) {
      throw { statusCode: 404, message: `Patient with ID '${patientId}' not found` };
    }

    const existingSessions = await dataStore.getQuizSessionsByPatient(patientId);
    const existing = existingSessions.find(s => s.date === date);
    if (existing) {
      const existingQuestions = await dataStore.getQuizQuestionsBySessionId(existing._id);
      validateExactFiveQuestions(existingQuestions);
      return {
        session: existing,
        totalQuestions: 5,
        questions: existing.status === 'completed' ? existingQuestions : existingQuestions.map(sanitizeQuestionForPatient),
        isCompleted: existing.status === 'completed'
      };
    }

    const sessionId = `QS${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
    const extractedItems = await dataStore.getExtractedItemsByPatient(patientId, { all: true });

    const generatedQuestions = [];
    for (let i = 0; i < 5; i++) {
      const item = extractedItems[i % extractedItems.length] || null;
      generatedQuestions.push({
        _id: `QQ_${sessionId}_${i + 1}`,
        quizSessionId: sessionId,
        question: item
          ? `How should you manage your prescribed ${item.name || item.type}?`
          : `What is the recommended recovery activity for milestone ${i + 1}?`,
        options: [
          item && item.sourceSentence ? item.sourceSentence : 'Follow hospital discharge plan',
          'Only as needed without clinician advice',
          'Discontinue immediately',
          'Consult emergency room only'
        ],
        correctAnswer: item && item.sourceSentence ? item.sourceSentence : 'Follow hospital discharge plan',
        sourceItemId: item ? item._id : null,
        sourceSentence: item ? item.sourceSentence : null,
        difficulty: i === 3 ? 'medium' : 'easy'
      });
    }

    validateExactFiveQuestions(generatedQuestions);

    const sessionData = {
      _id: sessionId,
      patientId,
      date,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      completedAt: null,
      score: 0,
      correctAnswers: 0,
      totalQuestions: 5,
      aiGenerated: true
    };

    await dataStore.createQuizSession(sessionData, generatedQuestions);

    return {
      session: sessionData,
      totalQuestions: 5,
      questions: generatedQuestions.map(sanitizeQuestionForPatient),
      isCompleted: false
    };
  },

  /**
   * Retrieve questions for a specific quiz session
   */
  async getQuizQuestions(sessionId, patientId = null, options = {}) {
    if (!sessionId) {
      throw { statusCode: 400, message: 'sessionId is required' };
    }

    const session = await dataStore.getQuizSessionById(sessionId, patientId);
    if (!session) {
      throw {
        statusCode: 404,
        message: patientId
          ? `Quiz session '${sessionId}' not found for patient '${patientId}'`
          : `Quiz session '${sessionId}' not found`
      };
    }

    const questions = await dataStore.getQuizQuestionsBySessionId(sessionId);
    validateExactFiveQuestions(questions);

    let targetLang = options.language || 'en';
    if (!options.language && session.patientId) {
      const patient = await dataStore.getPatient(session.patientId);
      if (patient?.language) targetLang = patient.language;
    }

    const localized = questions.map(q => localizeSingleQuestion(q, targetLang));
    const isCompleted = session.status === 'completed';
    const safeQuestions = isCompleted
      ? localized
      : localized.map(sanitizeQuestionForPatient);

    return {
      sessionId,
      patientId: session.patientId,
      totalQuestions: 5,
      status: session.status,
      isCompleted,
      questions: safeQuestions,
      language: targetLang
    };
  },

  /**
   * Record and store an individual quiz answer with strict validation
   * @param {string} sessionId 
   * @param {Object} payload { patientId, questionId, selectedAnswer }
   */
  async recordAnswer(sessionId, payload = {}) {
    if (!sessionId) {
      throw { statusCode: 400, message: 'sessionId is required' };
    }

    const { patientId, questionId, selectedAnswer } = payload;

    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required to record answer' };
    }
    if (!questionId) {
      throw { statusCode: 400, message: 'questionId is required' };
    }
    if (selectedAnswer === undefined || selectedAnswer === null) {
      throw { statusCode: 400, message: 'selectedAnswer is required' };
    }

    // 1. Validation: session exists
    const session = await dataStore.getQuizSessionById(sessionId);
    if (!session) {
      throw { statusCode: 404, message: `Quiz session '${sessionId}' not found` };
    }

    // 2. Validation: question exists
    const question = await dataStore.getQuestionById(questionId);
    if (!question) {
      throw { statusCode: 404, message: `Question '${questionId}' not found` };
    }

    // 3. Validation: question belongs to session
    if (question.quizSessionId !== sessionId) {
      throw {
        statusCode: 400,
        message: `Validation Error: Question '${questionId}' does not belong to session '${sessionId}'`
      };
    }

    // 4. Validation: session belongs to patient
    if (session.patientId !== patientId) {
      throw {
        statusCode: 403,
        message: `Forbidden: Patient '${patientId}' is not authorized for quiz session '${sessionId}'`
      };
    }

    // 5. Validation: session not already completed
    if (session.status === 'completed') {
      throw {
        statusCode: 409,
        message: `Duplicate Submission Error: Quiz session '${sessionId}' has already been completed`
      };
    }

    // 6. Validation: question has not been improperly answered twice
    const existingAnswer = await dataStore.getQuizAnswer(sessionId, questionId);
    if (existingAnswer) {
      throw {
        statusCode: 409,
        message: `Duplicate Submission Error: Question '${questionId}' has already been answered in session '${sessionId}'`
      };
    }

    // Determine correctness
    const isCorrect = selectedAnswer === question.correctAnswer;
    const now = new Date().toISOString();

    const answerRecord = {
      _id: `QA_${sessionId}_${questionId}`,
      quizSessionId: sessionId,
      questionId,
      selectedAnswer,
      correct: isCorrect,
      answeredAt: now
    };

    await dataStore.saveQuizAnswer(answerRecord);

    // Retrieve all answers for session to evaluate completion status
    const allAnswers = await dataStore.getQuizAnswersBySessionId(sessionId);
    const answeredCount = allAnswers.length;

    // Check if all 5 questions are now answered
    if (answeredCount === 5) {
      const correctAnswers = allAnswers.filter(a => a.correct === true).length;
      const score = Math.round((correctAnswers / 5) * 100);

      const completedSession = await dataStore.updateQuizSession(sessionId, {
        status: 'completed',
        completedAt: now,
        score,
        correctAnswers,
        totalQuestions: 5
      });

      // Record teach-back audit event
      await dataStore.addEvent({
        patientId,
        type: 'teach_back',
        payload: {
          sessionId,
          score,
          correctAnswers,
          totalQuestions: 5
        },
        timestamp: now,
        actor: patientId
      });

      return {
        answer: answerRecord,
        progress: {
          answeredCount: 5,
          totalQuestions: 5,
          isComplete: true
        },
        scoreResult: {
          score,
          correctAnswers,
          totalQuestions: 5,
          engagementSignal: 'educational_knowledge'
        },
        session: completedSession
      };
    }

    return {
      answer: answerRecord,
      progress: {
        answeredCount,
        totalQuestions: 5,
        isComplete: false
      }
    };
  },

  /**
   * Retrieve educational knowledge score after all 5 questions
   * @param {string} sessionId 
   * @param {string} [patientId] 
   */
  async getQuizScore(sessionId, patientId = null) {
    if (!sessionId) {
      throw { statusCode: 400, message: 'sessionId is required' };
    }

    const session = await dataStore.getQuizSessionById(sessionId);
    if (!session) {
      throw {
        statusCode: 404,
        message: `Quiz session '${sessionId}' not found`
      };
    }

    if (patientId && session.patientId !== patientId) {
      throw {
        statusCode: 403,
        message: `Forbidden: Patient '${patientId}' is not authorized for quiz session '${sessionId}'`
      };
    }

    const answers = await dataStore.getQuizAnswersBySessionId(sessionId);

    // Incomplete quiz check
    if (session.status !== 'completed' && answers.length < 5) {
      throw {
        statusCode: 400,
        message: `Incomplete Quiz Error: All 5 questions must be answered to calculate educational knowledge score (answered ${answers.length} of 5)`
      };
    }

    return {
      sessionId,
      patientId: session.patientId,
      status: session.status,
      score: session.score,
      correctAnswers: session.correctAnswers,
      totalQuestions: 5,
      engagementSignal: 'educational_knowledge',
      completedAt: session.completedAt
    };
  },

  /**
   * Submit quiz answers in batch, validate all 5, evaluate score, and return review
   * @param {string} sessionId 
   * @param {Object} payload { patientId, answers: [{ questionId, selectedAnswer }] }
   */
  async submitQuiz(sessionId, payload = {}) {
    if (!sessionId) {
      throw { statusCode: 400, message: 'sessionId is required' };
    }

    const { patientId, answers } = payload;
    if (!patientId) {
      throw { statusCode: 400, message: 'patientId is required to submit quiz' };
    }

    const session = await dataStore.getQuizSessionById(sessionId);
    if (!session) {
      throw { statusCode: 404, message: `Quiz session '${sessionId}' not found` };
    }

    if (session.patientId !== patientId) {
      throw {
        statusCode: 403,
        message: `Forbidden: Patient '${patientId}' is not authorized to submit quiz session '${sessionId}' (belongs to ${session.patientId})`
      };
    }

    // Check duplicate submission
    if (session.status === 'completed') {
      throw {
        statusCode: 409,
        message: `Duplicate Submission Error: Quiz session '${sessionId}' has already been completed`
      };
    }

    // Format answers if passed as an object { [qId]: selectedAnswer }
    let answerList = answers;
    if (answers && !Array.isArray(answers) && typeof answers === 'object') {
      answerList = Object.keys(answers).map(qId => ({
        questionId: qId,
        selectedAnswer: answers[qId]
      }));
    }

    // Incomplete quiz validation
    if (!Array.isArray(answerList) || answerList.length < 5) {
      throw {
        statusCode: 400,
        message: `Incomplete Quiz Error: Cannot calculate score for incomplete quiz. Expected exactly 5 answers, received ${answerList ? answerList.length : 0}.`
      };
    }

    // Check for duplicate answers in submission payload
    const seenQuestionIds = new Set();
    for (const ans of answerList) {
      if (seenQuestionIds.has(ans.questionId)) {
        throw {
          statusCode: 409,
          message: `Duplicate Submission Error: Question '${ans.questionId}' has duplicate answers in submission`
        };
      }
      seenQuestionIds.add(ans.questionId);
    }

    const questions = await dataStore.getQuizQuestionsBySessionId(sessionId);
    validateExactFiveQuestions(questions);

    let correctCount = 0;
    const evaluatedAnswers = [];
    const questionReview = [];
    const now = new Date().toISOString();

    for (const q of questions) {
      const userAns = answerList.find(a => a.questionId === q._id);
      if (!userAns) {
        throw {
          statusCode: 400,
          message: `Incomplete Quiz Error: Missing answer for question '${q._id}'`
        };
      }

      const selectedAnswer = userAns.selectedAnswer;
      let isCorrect = selectedAnswer === q.correctAnswer;
      if (!isCorrect && selectedAnswer) {
        // Evaluate against localized options across supported languages
        for (const testLang of ['hi', 'ta']) {
          const locQ = localizeSingleQuestion(q, testLang);
          if (locQ && locQ.correctAnswer === selectedAnswer) {
            isCorrect = true;
            break;
          }
          if (locQ && Array.isArray(locQ.options)) {
            const selIdx = locQ.options.indexOf(selectedAnswer);
            if (selIdx !== -1 && q.options[selIdx] === q.correctAnswer) {
              isCorrect = true;
              break;
            }
          }
        }
      }

      if (isCorrect) {
        correctCount++;
      }

      evaluatedAnswers.push({
        _id: `QA_${sessionId}_${q._id}`,
        quizSessionId: sessionId,
        questionId: q._id,
        selectedAnswer: selectedAnswer || 'No answer',
        correct: isCorrect,
        answeredAt: now
      });

      questionReview.push({
        questionId: q._id,
        question: q.question,
        selectedAnswer: selectedAnswer || 'No answer',
        correctAnswer: q.correctAnswer,
        isCorrect,
        sourceItemId: q.sourceItemId,
        sourceSentence: q.sourceSentence
      });
    }

    const score = Math.round((correctCount / 5) * 100);

    const updatedSession = await dataStore.updateQuizSession(sessionId, {
      status: 'completed',
      completedAt: now,
      score,
      correctAnswers: correctCount,
      totalQuestions: 5
    });

    await dataStore.saveQuizAnswers(evaluatedAnswers);

    await dataStore.addEvent({
      patientId,
      type: 'teach_back',
      payload: {
        sessionId,
        score,
        correctAnswers: correctCount,
        totalQuestions: 5
      },
      timestamp: now,
      actor: patientId
    });

    return {
      session: updatedSession,
      score,
      correctAnswers: correctCount,
      totalQuestions: 5,
      engagementSignal: 'educational_knowledge',
      review: questionReview
    };
  }
};

module.exports = {
  quizService,
  validateExactFiveQuestions
};
