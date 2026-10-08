const http = require('http');
const app = require('./app');

const testFeature6 = async () => {
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
    console.log('\n======================================================');
    console.log('FEATURE 6: QUIZ ANSWER STORAGE AND SCORING TEST SUITE');
    console.log('======================================================\n');

    // Setup: Start a new quiz session for patient P001 on date '2026-10-15'
    const testPatientId = 'P001';
    const testDate = `2026-10-15-${Date.now()}`;
    const startRes = await post('/quiz/start', {
      patientId: testPatientId,
      date: testDate
    });
    assert(startRes.status === 201 || startRes.status === 200, 'Started fresh quiz session');
    const session = startRes.data.data.session;
    const sessionId = session._id;
    const questions = startRes.data.data.questions;

    assert(sessionId !== undefined, `Quiz session created with ID: ${sessionId}`);
    assert(Array.isArray(questions) && questions.length === 5, 'Session initialized with exactly 5 questions');

    const [q1, q2, q3, q4, q5] = questions;

    // ---------------------------------------------------------
    // TEST 1: Incomplete quiz score retrieval rejection
    // ---------------------------------------------------------
    console.log('\n--- 1. Testing Incomplete Quiz: Score Request Rejection ---');
    const prematureScoreRes = await get(`/quiz/sessions/${sessionId}/score`);
    assert(prematureScoreRes.status === 400, 'GET /sessions/:id/score on incomplete quiz returns 400 Bad Request');
    assert(
      prematureScoreRes.data.message && prematureScoreRes.data.message.includes('Incomplete Quiz Error'),
      'Error message clarifies all 5 questions must be answered'
    );

    const prematureNestedScoreRes = await get(`/patients/${testPatientId}/quiz/sessions/${sessionId}/score`);
    assert(prematureNestedScoreRes.status === 400, 'GET /:patientId/quiz/sessions/:id/score on incomplete quiz returns 400 Bad Request');

    // ---------------------------------------------------------
    // TEST 2: Validation - Invalid question
    // ---------------------------------------------------------
    console.log('\n--- 2. Testing Validation: Invalid Question Rejection ---');
    const invalidQuestionRes = await post(`/quiz/sessions/${sessionId}/answer`, {
      patientId: testPatientId,
      questionId: 'NON_EXISTENT_QUESTION_ID',
      selectedAnswer: 'Some Answer'
    });
    assert(invalidQuestionRes.status === 404, 'Answering non-existent question returns 404 Not Found');
    assert(
      invalidQuestionRes.data.message && invalidQuestionRes.data.message.includes('not found'),
      'Error confirms question was not found'
    );

    // ---------------------------------------------------------
    // TEST 3: Validation - Question belongs to session
    // ---------------------------------------------------------
    console.log('\n--- 3. Testing Validation: Question Not Belonging to Session ---');
    // Start session B for P002 to get a question from another session
    const otherSessionRes = await post('/quiz/start', {
      patientId: 'P002',
      date: `2026-10-16-${Date.now()}`
    });
    const otherSessionQuestion = otherSessionRes.data.data.questions[0];

    const foreignQuestionRes = await post(`/quiz/sessions/${sessionId}/answer`, {
      patientId: testPatientId,
      questionId: otherSessionQuestion._id,
      selectedAnswer: otherSessionQuestion.options[0]
    });
    assert(foreignQuestionRes.status === 400, 'Question belonging to different session returns 400 Bad Request');
    assert(
      foreignQuestionRes.data.message && foreignQuestionRes.data.message.includes('does not belong to session'),
      'Error confirms question does not belong to target session'
    );

    // ---------------------------------------------------------
    // TEST 4: Validation - Wrong patient authorization
    // ---------------------------------------------------------
    console.log('\n--- 4. Testing Validation: Wrong Patient Authorization ---');
    const wrongPatientRes = await post(`/quiz/sessions/${sessionId}/answer`, {
      patientId: 'P002', // Wrong patient! Session belongs to P001
      questionId: q1._id,
      selectedAnswer: q1.options[0]
    });
    assert(wrongPatientRes.status === 403, 'Cross-patient answer submission rejected with 403 Forbidden');
    assert(
      wrongPatientRes.data.message && wrongPatientRes.data.message.includes('not authorized'),
      'Error confirms patient is not authorized for session'
    );

    // Also check wrong patient on nested route
    const wrongNestedScore = await get(`/patients/P002/quiz/sessions/${sessionId}/score`);
    assert(wrongNestedScore.status === 403, 'Cross-patient score retrieval rejected with 403 Forbidden');

    // ---------------------------------------------------------
    // TEST 5: Correct answer recording & storage schema
    // ---------------------------------------------------------
    console.log('\n--- 5. Testing Correct Answer Storage & Schema ---');
    // In our generated questions, options[0] is the correct answer
    const ans1Payload = {
      patientId: testPatientId,
      questionId: q1._id,
      selectedAnswer: q1.options[0]
    };
    const answer1Res = await post(`/quiz/sessions/${sessionId}/answer`, ans1Payload);
    assert(answer1Res.status === 200, 'Recording answer returns 200 OK');
    const ans1 = answer1Res.data.data.answer;

    // Verify stored answer fields: quizSessionId, questionId, selectedAnswer, correct, answeredAt
    assert(ans1.quizSessionId === sessionId, `Answer stores quizSessionId (${ans1.quizSessionId})`);
    assert(ans1.questionId === q1._id, `Answer stores questionId (${ans1.questionId})`);
    assert(ans1.selectedAnswer === q1.options[0], `Answer stores selectedAnswer (${ans1.selectedAnswer})`);
    assert(ans1.correct === true, 'Correct answer marked correct: true');
    assert(typeof ans1.answeredAt === 'string' && ans1.answeredAt.length > 0, `Answer stores answeredAt timestamp (${ans1.answeredAt})`);
    assert(answer1Res.data.data.progress.isComplete === false, 'Quiz progress not complete after 1 of 5');
    assert(answer1Res.data.data.progress.answeredCount === 1, 'Answer count is 1');

    // ---------------------------------------------------------
    // TEST 6: Duplicate submission - Answering same question twice
    // ---------------------------------------------------------
    console.log('\n--- 6. Testing Validation: Duplicate Answer Submission ---');
    const duplicateAnsRes = await post(`/quiz/sessions/${sessionId}/answer`, ans1Payload);
    assert(duplicateAnsRes.status === 409, 'Submitting duplicate answer for same question returns 409 Conflict');
    assert(
      duplicateAnsRes.data.message && duplicateAnsRes.data.message.includes('Duplicate Submission Error'),
      'Error specifies question already answered in session'
    );

    // ---------------------------------------------------------
    // TEST 7: Incorrect answer recording
    // ---------------------------------------------------------
    console.log('\n--- 7. Testing Incorrect Answer Storage ---');
    // options[1] is 'Only as needed without clinician advice' (incorrect)
    const ans2Payload = {
      patientId: testPatientId,
      questionId: q2._id,
      selectedAnswer: q2.options[1]
    };
    const answer2Res = await post(`/quiz/sessions/${sessionId}/answer`, ans2Payload);
    assert(answer2Res.status === 200, 'Recording incorrect answer returns 200 OK');
    const ans2 = answer2Res.data.data.answer;
    assert(ans2.correct === false, 'Incorrect answer marked correct: false');
    assert(ans2.quizSessionId === sessionId, 'Answer stores quizSessionId');
    assert(ans2.questionId === q2._id, 'Answer stores questionId');
    assert(ans2.selectedAnswer === q2.options[1], 'Answer stores selectedAnswer');
    assert(typeof ans2.answeredAt === 'string', 'Answer stores answeredAt');
    assert(answer2Res.data.data.progress.answeredCount === 2, 'Answer count is 2');

    // ---------------------------------------------------------
    // TEST 8: Answering remaining questions to reach all 5 questions
    // ---------------------------------------------------------
    console.log('\n--- 8. Testing Quiz Completion: 5 of 5 Questions & Auto-Scoring ---');
    // Q3 -> correct (options[0])
    const answer3Res = await post(`/quiz/sessions/${sessionId}/answer`, {
      patientId: testPatientId,
      questionId: q3._id,
      selectedAnswer: q3.options[0]
    });
    assert(answer3Res.status === 200, 'Q3 answered successfully');
    assert(answer3Res.data.data.answer.correct === true, 'Q3 is correct');

    // Q4 -> correct (options[0])
    const answer4Res = await post(`/quiz/sessions/${sessionId}/answer`, {
      patientId: testPatientId,
      questionId: q4._id,
      selectedAnswer: q4.options[0]
    });
    assert(answer4Res.status === 200, 'Q4 answered successfully');
    assert(answer4Res.data.data.answer.correct === true, 'Q4 is correct');

    // Before Q5: still incomplete
    const pre5ScoreRes = await get(`/quiz/sessions/${sessionId}/score`);
    assert(pre5ScoreRes.status === 400, 'Still incomplete with 4 of 5 questions answered');

    // Q5 -> incorrect (options[1]) - This is the 5th and final question!
    // Expected: 3 correct out of 5 -> score = Math.round((3/5)*100) = 60%
    const answer5Res = await post(`/quiz/sessions/${sessionId}/answer`, {
      patientId: testPatientId,
      questionId: q5._id,
      selectedAnswer: q5.options[1]
    });
    assert(answer5Res.status === 200, 'Q5 answered successfully');
    assert(answer5Res.data.data.answer.correct === false, 'Q5 is incorrect');
    assert(answer5Res.data.data.progress.isComplete === true, 'Quiz marked complete upon 5th answer');
    assert(answer5Res.data.data.progress.answeredCount === 5, 'All 5 questions answered');

    // Check auto-score returned on 5th question
    const scoreResult = answer5Res.data.data.scoreResult;
    assert(scoreResult !== undefined, 'Score result calculated and returned on completion');
    assert(scoreResult.totalQuestions === 5, 'Score totalQuestions = 5');
    assert(scoreResult.correctAnswers === 3, 'Score correctAnswers = 3 (Q1, Q3, Q4 correct; Q2, Q5 incorrect)');
    assert(scoreResult.score === 60, 'Score calculated: 60%');

    // CRITICAL SEMANTIC RULE CHECK:
    // "The score is an educational knowledge/engagement signal.
    // Do not call it: clinical score, medical risk score, diagnosis."
    assert(scoreResult.engagementSignal === 'educational_knowledge', 'Score is marked educational_knowledge signal');
    assert(scoreResult.clinicalScore === undefined, 'No clinical score field present');
    assert(scoreResult.medicalRiskScore === undefined, 'No medical risk score field present');
    assert(scoreResult.diagnosis === undefined, 'No diagnosis field present');

    // ---------------------------------------------------------
    // TEST 9: Completed quiz score endpoint retrieval
    // ---------------------------------------------------------
    console.log('\n--- 9. Testing Completed Quiz Score Endpoint ---');
    const finalScoreRes = await get(`/quiz/sessions/${sessionId}/score`);
    assert(finalScoreRes.status === 200, 'GET /quiz/sessions/:id/score returns 200 on completed quiz');
    const finalScore = finalScoreRes.data.data;
    assert(finalScore.sessionId === sessionId, 'Score data includes sessionId');
    assert(finalScore.patientId === testPatientId, 'Score data includes patientId');
    assert(finalScore.status === 'completed', 'Status is completed');
    assert(finalScore.score === 60, 'Final score matches calculated 60%');
    assert(finalScore.correctAnswers === 3, 'Final correctAnswers matches 3');
    assert(finalScore.totalQuestions === 5, 'Final totalQuestions = 5');
    assert(finalScore.engagementSignal === 'educational_knowledge', 'Educational knowledge signal preserved');

    // Test nested route: GET /api/patients/:patientId/quiz/sessions/:id/score
    const nestedFinalScoreRes = await get(`/patients/${testPatientId}/quiz/sessions/${sessionId}/score`);
    assert(nestedFinalScoreRes.status === 200, 'GET /patients/:patientId/quiz/sessions/:id/score returns 200');
    assert(nestedFinalScoreRes.data.data.score === 60, 'Nested score matches 60%');

    // ---------------------------------------------------------
    // TEST 10: Duplicate submission after completed quiz
    // ---------------------------------------------------------
    console.log('\n--- 10. Testing Duplicate Submission on Completed Quiz ---');
    const postCompleteAnsRes = await post(`/quiz/sessions/${sessionId}/answer`, {
      patientId: testPatientId,
      questionId: q1._id,
      selectedAnswer: q1.options[0]
    });
    assert(postCompleteAnsRes.status === 409, 'Submitting answer to already completed quiz returns 409 Conflict');
    assert(
      postCompleteAnsRes.data.message && postCompleteAnsRes.data.message.includes('Duplicate Submission Error'),
      'Error indicates session is already completed'
    );

    // ---------------------------------------------------------
    // TEST 11: Batch submission endpoint validation & scoring
    // ---------------------------------------------------------
    console.log('\n--- 11. Testing Batch Submission Incomplete & Complete Flows ---');
    const batchSessionRes = await post('/quiz/start', {
      patientId: 'P003',
      date: `2026-10-17-${Date.now()}`
    });
    const batchSessionId = batchSessionRes.data.data.session._id;
    const batchQuestions = batchSessionRes.data.data.questions;

    // Incomplete batch submit (only 3 answers)
    const incompleteBatchSubmit = await post(`/quiz/sessions/${batchSessionId}/submit`, {
      patientId: 'P003',
      answers: [
        { questionId: batchQuestions[0]._id, selectedAnswer: batchQuestions[0].options[0] },
        { questionId: batchQuestions[1]._id, selectedAnswer: batchQuestions[1].options[0] },
        { questionId: batchQuestions[2]._id, selectedAnswer: batchQuestions[2].options[0] }
      ]
    });
    assert(incompleteBatchSubmit.status === 400, 'Batch submission with fewer than 5 answers returns 400 Bad Request');
    assert(
      incompleteBatchSubmit.data.message && incompleteBatchSubmit.data.message.includes('Incomplete Quiz Error'),
      'Error indicates exactly 5 answers required'
    );

    // Complete batch submit (all 5 answers with 5/5 correct)
    const completeBatchSubmit = await post(`/quiz/sessions/${batchSessionId}/submit`, {
      patientId: 'P003',
      answers: batchQuestions.map(q => ({
        questionId: q._id,
        selectedAnswer: q.options[0] // all correct
      }))
    });
    assert(completeBatchSubmit.status === 200, 'Full batch submission returns 200 OK');
    assert(completeBatchSubmit.data.data.score === 100, '100% score for 5/5 correct');
    assert(completeBatchSubmit.data.data.correctAnswers === 5, 'correctAnswers = 5');
    assert(completeBatchSubmit.data.data.totalQuestions === 5, 'totalQuestions = 5');
    assert(completeBatchSubmit.data.data.engagementSignal === 'educational_knowledge', 'Signal is educational_knowledge');

    console.log('\n======================================================');
    console.log('ALL FEATURE 6 TESTS PASSED FLAWLESSLY!');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
};

testFeature6().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
