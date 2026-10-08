import quizSessionsData from '../../../data/mock/quizSessions.json';
import quizQuestionsData from '../../../data/mock/quizQuestions.json';

const STORAGE_QUIZ_KEY = 'medi_buddy_quiz_progress_';

/**
 * Service adapter for Daily Gamified Quiz.
 * Guarantees EXACTLY 5 questions per quiz session.
 */
export async function getPatientQuizSession(patientId = 'P001') {
  try {
    const res = await fetch(`/api/patients/${patientId}/quiz-session`);
    if (res.ok) {
      const data = await res.json();
      const payload = data.data !== undefined ? data.data : data;
      if (payload.questions && payload.questions.length === 5) {
        let savedState = null;
        try {
          const local = localStorage.getItem(`${STORAGE_QUIZ_KEY}${patientId}`);
          if (local) {
            savedState = JSON.parse(local);
          }
        } catch (e) {
          console.warn('Could not restore saved quiz progress:', e);
        }

        const sanitizedQuestions = payload.questions.slice(0, 5).map((q, idx) => ({
          _id: q._id || `QQ_${idx + 1}`,
          quizSessionId: payload.session?._id,
          questionNumber: idx + 1,
          question: q.question,
          options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: q.correctAnswer,
          sourceSentence: q.sourceSentence || '',
          type: q.options && q.options.length === 2 ? 'true_false' : 'multiple_choice'
        }));

        return {
          session: payload.session,
          questions: sanitizedQuestions,
          savedAnswers: savedState?.answers || {},
          savedCurrentIndex: savedState?.currentIndex || 0,
          isCompleted: savedState?.isCompleted || payload.isCompleted || payload.session?.status === 'completed'
        };
      }
    }
  } catch (err) {
    // Backend endpoint offline, fallback to structured mock dataset
  }

  // Find quiz session for patient
  let session = quizSessionsData.find((qs) => qs.patientId === patientId);
  if (!session) {
    session = {
      _id: `QS_${patientId}`,
      patientId,
      date: new Date().toISOString().split('T')[0],
      status: 'started',
      startedAt: new Date().toISOString(),
      completedAt: null,
      score: null,
      correctAnswers: null,
      totalQuestions: 5
    };
  }

  // Get questions matching session or patient
  let questions = quizQuestionsData.filter((qq) => qq.quizSessionId === session._id);
  if (questions.length !== 5) {
    // Fallback: take 5 questions from default dataset
    questions = quizQuestionsData.slice(0, 5);
  }

  // Ensure EXACTLY 5 questions
  const sanitizedQuestions = questions.slice(0, 5).map((q, idx) => ({
    _id: q._id || `QQ_${idx + 1}`,
    quizSessionId: session._id,
    questionNumber: idx + 1,
    question: q.question,
    options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswer: q.correctAnswer,
    sourceSentence: q.sourceSentence || '',
    type: q.options && q.options.length === 2 ? 'true_false' : 'multiple_choice'
  }));

  // Restore saved in-progress state if refreshed
  let savedState = null;
  try {
    const local = localStorage.getItem(`${STORAGE_QUIZ_KEY}${patientId}`);
    if (local) {
      savedState = JSON.parse(local);
    }
  } catch (e) {
    console.warn('Could not restore saved quiz progress:', e);
  }

  return {
    session,
    questions: sanitizedQuestions,
    savedAnswers: savedState?.answers || {},
    savedCurrentIndex: savedState?.currentIndex || 0,
    isCompleted: savedState?.isCompleted || session.status === 'completed'
  };
}

export function saveQuizProgress(patientId, answers, currentIndex, isCompleted = false) {
  try {
    localStorage.setItem(
      `${STORAGE_QUIZ_KEY}${patientId}`,
      JSON.stringify({ answers, currentIndex, isCompleted, timestamp: new Date().toISOString() })
    );
  } catch (e) {
    console.error('Failed to save quiz progress:', e);
  }
}

export async function submitQuizSession(patientId, sessionId, questions, answers) {
  let correctCount = 0;
  const answerDetails = [];

  questions.forEach((q) => {
    const selected = answers[q._id];
    const isCorrect = selected === q.correctAnswer;
    if (isCorrect) correctCount += 1;

    answerDetails.push({
      questionId: q._id,
      question: q.question,
      selectedAnswer: selected,
      correctAnswer: q.correctAnswer,
      isCorrect
    });
  });

  const score = Math.round((correctCount / 5) * 100); // out of 5 questions = 20% each
  const completionData = {
    sessionId,
    patientId,
    completedAt: new Date().toISOString(),
    score,
    correctCount,
    totalQuestions: 5,
    answers: answerDetails,
    passed: score >= 60
  };

  const answersArray = Array.isArray(answers)
    ? answers
    : Object.keys(answers).map((qId) => ({
        questionId: qId,
        selectedAnswer: answers[qId]
      }));

  try {
    const res = await fetch(`/api/quiz-sessions/${sessionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        answers: answersArray
      })
    });
    if (res.ok) {
      const json = await res.json();
      const result = json.data !== undefined ? json.data : json;
      saveQuizProgress(patientId, answers, 4, true);
      return {
        ...completionData,
        ...result,
        correctCount: result.correctAnswers ?? result.correctCount ?? correctCount,
        passed: (result.score ?? score) >= 60
      };
    }
  } catch (err) {
    console.warn('[quizService] Backend POST endpoint offline. Saved quiz completion locally.');
  }

  // Persist completed state
  saveQuizProgress(patientId, answers, 4, true);

  return completionData;
}

export function resetPatientQuiz(patientId) {
  try {
    localStorage.removeItem(`${STORAGE_QUIZ_KEY}${patientId}`);
  } catch (e) {
    console.error('Failed to reset quiz progress:', e);
  }
}
