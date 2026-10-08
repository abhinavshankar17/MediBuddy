const assert = require('assert');
const http = require('http');
const app = require('./app');
const { dataStore, adherenceService, quizService, validateExactFiveQuestions, insightService, nurseService, escalationService } = require('./services');

const runFinalQA = async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const request = async (path, options = {}) => {
    const res = await fetch(`${baseUrl}${path}`, options);
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  };

  console.log(`\n======================================================`);
  console.log(`  STARTING FINAL INTEGRATION & QA TEST SUITE (Port ${port})`);
  console.log(`======================================================\n`);

  try {
    // ========================================================
    // 1. ROUTE AUDIT & CONSISTENCY CHECK
    // ========================================================
    console.log('--- 1. ROUTE AUDIT & RESPONSE FORMAT CONSISTENCY ---');
    const rootRes = await request('/api');
    assert.strictEqual(rootRes.status, 200, 'Root API should return 200');
    assert.strictEqual(rootRes.body.status, 'active');
    assert.ok(rootRes.body.endpoints, 'Root API should declare endpoints map');

    const healthRes = await request('/api/health');
    assert.strictEqual(healthRes.status, 200, 'Health check should return 200');
    assert.strictEqual(healthRes.body.success, true);
    assert.strictEqual(typeof healthRes.body.message, 'string');
    assert.ok(healthRes.body.data.uptimeSeconds >= 0);

    console.log('   ✓ Root and Health endpoints respond with standard format');

    // ========================================================
    // 2. STRICT PATIENT ISOLATION (P001 vs P002 across all 7 domains)
    // ========================================================
    console.log('\n--- 2. STRICT PATIENT ISOLATION (P001 vs P002) ---');

    // Domain A: Medication Reminders
    const p1RemRes = await request('/api/patients/P001/reminders');
    const p2RemRes = await request('/api/patients/P002/reminders');
    assert.strictEqual(p1RemRes.status, 200);
    assert.strictEqual(p2RemRes.status, 200);
    p1RemRes.body.data.forEach(r => assert.strictEqual(r.patientId, 'P001', 'P001 reminders must only be P001'));
    p2RemRes.body.data.forEach(r => assert.strictEqual(r.patientId, 'P002', 'P002 reminders must only be P002'));
    console.log('   ✓ Medication Reminders strictly isolated between P001 and P002');

    // Domain B: Events
    const p1EvtRes = await request('/api/patients/P001/events');
    const p2EvtRes = await request('/api/patients/P002/events');
    assert.strictEqual(p1EvtRes.status, 200);
    assert.strictEqual(p2EvtRes.status, 200);
    p1EvtRes.body.data.forEach(e => assert.strictEqual(e.patientId, 'P001', 'P001 events must only be P001'));
    p2EvtRes.body.data.forEach(e => assert.strictEqual(e.patientId, 'P002', 'P002 events must only be P002'));
    console.log('   ✓ Events strictly isolated between P001 and P002');

    // Domain C: Daily Quiz & Sessions
    const p1QuizRes = await request('/api/patients/P001/quiz/today');
    const p2QuizRes = await request('/api/patients/P002/quiz/today');
    assert.strictEqual(p1QuizRes.status, 200);
    assert.strictEqual(p2QuizRes.status, 200);
    assert.strictEqual(p1QuizRes.body.data.session.patientId, 'P001');
    assert.strictEqual(p2QuizRes.body.data.session.patientId, 'P002');
    console.log('   ✓ Quizzes strictly isolated between P001 and P002');

    // Domain D: Quiz Answers & Scoring
    const p1ScoreRes = await request(`/api/patients/P001/quiz/sessions/${p1QuizRes.body.data.session._id}/score`);
    assert.strictEqual(p1ScoreRes.status, 200);
    assert.strictEqual(p1ScoreRes.body.data.patientId, 'P001');

    // Cross-patient quiz score attempt must be rejected
    const crossScoreRes = await request(`/api/patients/P002/quiz/sessions/${p1QuizRes.body.data.session._id}/score`);
    assert.strictEqual(crossScoreRes.status, 403, 'Attempting to fetch P001 score under P002 must return 403 Forbidden');
    console.log('   ✓ Quiz answers & scores strictly isolated with cross-access protection (403)');

    // Domain E: Insights
    const p1InsightRes = await request('/api/patients/P001/insight');
    const p2InsightRes = await request('/api/patients/P002/insight');
    assert.strictEqual(p1InsightRes.status, 200);
    assert.strictEqual(p2InsightRes.status, 200);
    assert.strictEqual(p1InsightRes.body.data.patientId, 'P001');
    assert.strictEqual(p2InsightRes.body.data.patientId, 'P002');
    console.log('   ✓ Patient Insights strictly isolated between P001 and P002');

    // Domain F: Nurse AI Summary & Briefs
    const p1BriefRes = await request('/api/nurse/ai-summary/P001');
    const p2BriefRes = await request('/api/nurse/ai-summary/P002');
    assert.strictEqual(p1BriefRes.status, 200);
    assert.strictEqual(p2BriefRes.status, 200);
    assert.strictEqual(p1BriefRes.body.data.patientId, 'P001');
    assert.strictEqual(p2BriefRes.body.data.patientId, 'P002');
    p1BriefRes.body.data.evidenceEventIds.forEach(id => {
      assert.ok(!p2EvtRes.body.data.some(e => e._id === id), `P001 evidence event ${id} must not leak from P002`);
    });
    console.log('   ✓ Nurse AI Summaries strictly isolated between P001 and P002');

    // Domain G: Escalations
    const p1EscRes = await request('/api/patients/P001/escalations');
    const p2EscRes = await request('/api/patients/P002/escalations');
    assert.strictEqual(p1EscRes.status, 200);
    assert.strictEqual(p2EscRes.status, 200);
    p1EscRes.body.data.forEach(e => assert.strictEqual(e.patientId, 'P001'));
    p2EscRes.body.data.forEach(e => assert.strictEqual(e.patientId, 'P002'));
    console.log('   ✓ Escalations strictly isolated between P001 and P002');

    // ========================================================
    // 3. QUIZ VALIDATION: EXACTLY 5 QUESTIONS INVARIANT
    // ========================================================
    console.log('\n--- 3. QUIZ VALIDATION: EXACTLY 5 QUESTIONS INVARIANT ---');
    const patients = ['P001', 'P002', 'P003', 'P004', 'P005', 'P006', 'P007', 'P008'];
    for (const patId of patients) {
      const qRes = await request(`/api/patients/${patId}/quiz/today`);
      assert.strictEqual(qRes.status, 200);
      assert.strictEqual(qRes.body.data.session.totalQuestions, 5, `Patient ${patId} totalQuestions must be 5`);
      assert.strictEqual(qRes.body.data.questions.length, 5, `Patient ${patId} questions count must be exactly 5`);
    }
    console.log('   ✓ Every patient quiz session contains exactly 5 questions');

    // Negative validation: prevent invalid session counts
    assert.throws(
      () => validateExactFiveQuestions([{ _id: '1' }, { _id: '2' }, { _id: '3' }, { _id: '4' }]),
      (err) => err.statusCode === 400 && err.message.includes('MUST contain exactly 5 questions'),
      'Must reject 4 questions'
    );
    assert.throws(
      () => validateExactFiveQuestions([{ _id: '1' }, { _id: '2' }, { _id: '3' }, { _id: '4' }, { _id: '5' }, { _id: '6' }]),
      (err) => err.statusCode === 400 && err.message.includes('MUST contain exactly 5 questions'),
      'Must reject 6 questions'
    );
    console.log('   ✓ Validation strictly rejects sessions with 4 or 6 questions');

    // ========================================================
    // 4. MEDICATION SEMANTICS: NO_RESPONSE != DEFINITELY NOT TAKEN
    // ========================================================
    console.log('\n--- 4. MEDICATION SEMANTICS: NO_RESPONSE INTEGRITY ---');
    // Confirm medication with no_response
    const noRespConfirm = await request('/api/reminders/MR003/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'P001',
        response: 'no_response'
      })
    });
    assert.strictEqual(noRespConfirm.status, 200);
    assert.strictEqual(noRespConfirm.body.data.confirmationStatus, 'not confirmed');
    assert.strictEqual(noRespConfirm.body.data.isConfirmed, false);
    assert.strictEqual(noRespConfirm.body.data.responseType, 'no_response');
    assert.notStrictEqual(noRespConfirm.body.data.status, 'missed', 'no_response must NOT automatically become missed');

    // Verify adherence calculation
    const adh = await adherenceService.calculateAdherence('P001');
    assert.ok(adh.notConfirmed >= 1, 'notConfirmed must account for no_response');
    assert.strictEqual(adh.total, adh.confirmed + adh.notConfirmed + adh.missed, 'Adherence total must equal sum');
    console.log('   ✓ no_response correctly mapped to "not confirmed", never "definitely not taken" or "missed"');

    // ========================================================
    // 5. AI SAFETY BOUNDARIES: ZERO DIAGNOSIS OR PRESCRIPTIONS
    // ========================================================
    console.log('\n--- 5. AI SAFETY BOUNDARIES VALIDATION ---');
    const safetyViolations = [
      { text: 'Diagnosis: Acute myocardial infarction.', label: 'Diagnosis' },
      { text: 'Prescribe 500mg Amoxicillin daily.', label: 'Prescription' },
      { text: 'Increase dosage of Metformin from 500mg to 1000mg.', label: 'Dosage change' },
      { text: 'Discontinue medication immediately.', label: 'Medication change' },
      { text: 'Initiate new treatment plan for COPD.', label: 'Treatment plan' },
      { text: 'Emergency classification: code blue ICU required.', label: 'Emergency classification' }
    ];

    for (const v of safetyViolations) {
      assert.throws(
        () => insightService.enforceAIBoundary(v.text),
        (err) => err.statusCode === 400,
        `Insight must block ${v.label}`
      );
      assert.throws(
        () => nurseService.enforceNurseAISafety(v.text),
        (err) => err.statusCode === 400,
        `Nurse AI must block ${v.label}`
      );
      assert.throws(
        () => escalationService.enforceEscalationSafety(v.text),
        (err) => err.statusCode === 400,
        `Escalation must block ${v.label}`
      );
    }
    console.log('   ✓ All AI safety patterns strictly enforced across Insight, Nurse Summary, and Escalation services');

    // Verify disclaimer presence on generated outputs
    const insightData = (await request('/api/patients/P001/insight')).body.data;
    assert.strictEqual(insightData.disclaimer, 'AI-generated — verify before acting.');
    assert.strictEqual(insightData.aiGenerated, true);

    const nurseBriefData = (await request('/api/nurse/ai-summary/P001')).body.data;
    assert.strictEqual(nurseBriefData.disclaimer, 'AI-generated — verify before acting.');
    assert.strictEqual(nurseBriefData.aiGenerated, true);
    console.log('   ✓ Mandatory disclaimer "AI-generated — verify before acting." present on all AI outputs');

    console.log('\n======================================================');
    console.log('  FINAL BACKEND QA & INTEGRATION SUITE PASSED 100%!');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
};

runFinalQA().catch(err => {
  console.error('\n❌ FINAL QA SUITE FAILED:', err);
  process.exit(1);
});
