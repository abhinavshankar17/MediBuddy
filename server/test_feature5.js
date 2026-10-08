const http = require('http');
const app = require('./app');
const { validateExactFiveQuestions } = require('./services');

const testFeature5 = async () => {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  console.log(`Test server running on port ${port}`);

  const assert = (condition, message) => {
    if (!condition) {
      console.error(`FAILED: ${message}`);
      process.exit(1);
    }
    console.log(`PASSED: ${message}`);
  };

  const get = async (path) => {
    const res = await fetch(`${baseUrl}${path}`);
    const data = await res.json();
    return { status: res.status, data };
  };

  const post = async (path, body) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { status: res.status, data };
  };

  try {
    console.log('\n--- 1. Testing Every Patient: Exactly 5 Questions per Session ---');
    const allPatients = ['P001', 'P002', 'P003', 'P004', 'P005', 'P006', 'P007', 'P008'];

    for (const patientId of allPatients) {
      const todayQuiz = await get(`/quiz/today?patientId=${patientId}`);
      assert(todayQuiz.status === 200, `GET /quiz/today?patientId=${patientId} returns 200`);
      assert(todayQuiz.data.data.session.patientId === patientId, `${patientId} quiz belongs to requested patient`);
      assert(Array.isArray(todayQuiz.data.data.questions), `${patientId} questions is array`);
      
      // CRITICAL REQUIREMENT CHECK
      assert(
        todayQuiz.data.data.questions.length === 5,
        `CRITICAL REQUIREMENT VERIFIED: ${patientId} session has EXACTLY 5 questions (received ${todayQuiz.data.data.questions.length})`
      );

      // Verify question grounding
      for (const q of todayQuiz.data.data.questions) {
        assert(q.question && q.question.length > 0, `${patientId} question text present`);
        assert(Array.isArray(q.options) && q.options.length >= 2, `${patientId} question has selectable options`);
        // Check grounding traceability fields
        assert(q.sourceItemId !== undefined, `${patientId} question traceable to sourceItemId (${q.sourceItemId})`);
        assert(q.sourceSentence !== undefined, `${patientId} question traceable to sourceSentence (${q.sourceSentence ? q.sourceSentence.slice(0, 30) + '...' : 'none'})`);
      }

      console.log(`  Patient ${patientId}: Session ${todayQuiz.data.data.session._id} -> Exactly 5 questions verified`);
    }

    console.log('\n--- 2. Testing API Safety: Masking correctAnswer Before Submission ---');
    // For an uncompleted session or uncompleted questions retrieval
    const startRes = await post('/quiz/start', {
      patientId: 'P001',
      date: '2026-10-09' // new date
    });
    assert(startRes.status === 201 || startRes.status === 200, 'Started new quiz session');
    assert(startRes.data.data.questions.length === 5, 'New session has exactly 5 questions');

    // Verify correctAnswer is NOT exposed
    for (const q of startRes.data.data.questions) {
      assert(
        q.correctAnswer === undefined,
        `API SAFETY VERIFIED: correctAnswer is hidden from patient (question: "${q.question.slice(0, 30)}...")`
      );
    }

    const sessionId = startRes.data.data.session._id;
    const questionsRes = await get(`/quiz/sessions/${sessionId}/questions`);
    assert(questionsRes.status === 200, 'GET /quiz/sessions/:id/questions returns 200');
    assert(questionsRes.data.data.questions.length === 5, 'Questions endpoint returns exactly 5 questions');
    for (const q of questionsRes.data.data.questions) {
      assert(
        q.correctAnswer === undefined,
        'API SAFETY VERIFIED: correctAnswer remains hidden on questions endpoint'
      );
    }

    console.log('\n--- 3. Testing Critical Validation: Rejecting 4 questions, 6 questions, or duplicates ---');
    // Test helper validation with 4 questions
    let rejectedFour = false;
    try {
      validateExactFiveQuestions([{ _id: 'Q1' }, { _id: 'Q2' }, { _id: 'Q3' }, { _id: 'Q4' }]);
    } catch (err) {
      rejectedFour = true;
      assert(err.statusCode === 400, 'Rejection of 4 questions yields 400 Bad Request');
      assert(err.message.includes('MUST contain exactly 5 questions'), 'Error explains exactly 5 questions required');
    }
    assert(rejectedFour, 'CRITICAL VALIDATION PASSED: 4 questions rejected');

    // Test helper validation with 6 questions
    let rejectedSix = false;
    try {
      validateExactFiveQuestions([
        { _id: 'Q1' }, { _id: 'Q2' }, { _id: 'Q3' }, { _id: 'Q4' }, { _id: 'Q5' }, { _id: 'Q6' }
      ]);
    } catch (err) {
      rejectedSix = true;
      assert(err.statusCode === 400, 'Rejection of 6 questions yields 400 Bad Request');
      assert(err.message.includes('MUST contain exactly 5 questions'), 'Error explains exactly 5 questions required');
    }
    assert(rejectedSix, 'CRITICAL VALIDATION PASSED: 6 questions rejected');

    // Test helper validation with duplicate questions
    let rejectedDuplicate = false;
    try {
      validateExactFiveQuestions([
        { _id: 'Q1', question: 'What is dose?' },
        { _id: 'Q2', question: 'When to exercise?' },
        { _id: 'Q3', question: 'When to follow up?' },
        { _id: 'Q4', question: 'What is diet?' },
        { _id: 'Q1', question: 'Duplicate ID' } // duplicate ID
      ]);
    } catch (err) {
      rejectedDuplicate = true;
      assert(err.statusCode === 400, 'Rejection of duplicate question yields 400 Bad Request');
      assert(err.message.includes('Duplicate question'), 'Error explains duplicate question prevented');
    }
    assert(rejectedDuplicate, 'CRITICAL VALIDATION PASSED: Duplicate questions rejected');

    console.log('\n--- 4. Testing Submitting Quiz & Post-Submission Review ---');
    // Submit answers for the newly created session
    const answersToSubmit = questionsRes.data.data.questions.map((q, idx) => ({
      questionId: q._id,
      selectedAnswer: q.options[0] // pick first option
    }));

    const submitRes = await post(`/quiz/sessions/${sessionId}/submit`, {
      patientId: 'P001',
      answers: answersToSubmit
    });
    assert(submitRes.status === 200, 'Quiz submission succeeded with 200 OK');
    assert(submitRes.data.data.session.status === 'completed', 'Session status updated to completed');
    assert(submitRes.data.data.totalQuestions === 5, 'Submission returns totalQuestions: 5');
    assert(typeof submitRes.data.data.score === 'number', `Score calculated: ${submitRes.data.data.score}%`);
    assert(Array.isArray(submitRes.data.data.review), 'Review returned as array');
    assert(submitRes.data.data.review.length === 5, 'Review contains exactly 5 question evaluations');

    // After submission, review provides full explanations including correctAnswer
    for (const item of submitRes.data.data.review) {
      assert(item.correctAnswer !== undefined, 'Review safely exposes correctAnswer post-submission');
      assert(typeof item.isCorrect === 'boolean', 'Review specifies isCorrect boolean');
    }
    console.log(`  Quiz submitted successfully! Score: ${submitRes.data.data.score}% (${submitRes.data.data.correctAnswers}/5 correct)`);

    console.log('\n--- 5. Testing Patient Isolation & Negative Guards ---');
    // Wrong patient submission
    const wrongPatientSubmit = await post(`/quiz/sessions/${sessionId}/submit`, {
      patientId: 'P002', // session belongs to P001
      answers: answersToSubmit
    });
    assert(wrongPatientSubmit.status === 403, 'Cross-patient submission (P002 on P001 session) blocked with 403 Forbidden');

    // Non-existent session
    const invalidSession = await get('/quiz/sessions/QS999/questions');
    assert(invalidSession.status === 404, 'Non-existent session QS999 returns 404 Not Found');

    // Nested route verification
    const nestedToday = await get('/patients/P001/quiz/today');
    assert(nestedToday.status === 200, 'GET /patients/P001/quiz/today returns 200');
    assert(nestedToday.data.data.questions.length === 5, 'Nested route returns exactly 5 questions');

    console.log('\nALL FEATURE 5 DAILY QUIZ TESTS PASSED PERFECTLY!\n');
  } finally {
    server.close();
  }
};

testFeature5().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
