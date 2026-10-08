const assert = require('assert');
const http = require('http');
const app = require('./app');
const { nurseService, dataStore } = require('./services');

const runTests = async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const request = async (path, options = {}) => {
    const res = await fetch(`${baseUrl}${path}`, options);
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  };

  console.log(`Starting Feature 9 test suite on port ${port}...\n`);

  try {
    // ==========================================
    // 1. Output Fields Validation (P001)
    // ==========================================
    console.log('1. Testing Output Fields Validation for P001...');
    const p1Res = await request('/api/nurse/ai-summary/P001');
    assert.strictEqual(p1Res.status, 200, 'Should return 200 OK');
    assert.strictEqual(p1Res.body.success, true, 'Response success should be true');
    const p1Data = p1Res.body.data;

    // Verify all required fields from prompt
    assert.strictEqual(p1Data.patientId, 'P001', 'patientId must match P001');
    assert.ok(p1Data.medicationAdherence, 'medicationAdherence must be present');
    assert.strictEqual(typeof p1Data.medicationAdherence.total, 'number', 'adherence total must be number');
    assert.strictEqual(typeof p1Data.medicationAdherence.confirmed, 'number', 'adherence confirmed must be number');
    assert.strictEqual(typeof p1Data.medicationAdherence.notConfirmed, 'number', 'adherence notConfirmed must be number');
    assert.strictEqual(typeof p1Data.medicationAdherence.missed, 'number', 'adherence missed must be number');

    assert.ok(p1Data.quizPerformance, 'quizPerformance must be present');
    assert.strictEqual(typeof p1Data.quizPerformance.score, 'number', 'quiz score must be number');
    assert.strictEqual(typeof p1Data.quizPerformance.correct, 'number', 'quiz correct must be number');
    assert.strictEqual(p1Data.quizPerformance.total, 5, 'quiz total must be 5');

    assert.ok(Array.isArray(p1Data.flags), 'flags must be an array');
    assert.ok(Array.isArray(p1Data.knowledgeGaps), 'knowledgeGaps must be an array');
    assert.ok(Array.isArray(p1Data.questionsForNurse), 'questionsForNurse must be an array');
    assert.ok(typeof p1Data.recommendedFollowUp === 'string', 'recommendedFollowUp must be string');
    assert.ok(typeof p1Data.aiSummary === 'string' && p1Data.aiSummary.length > 0, 'aiSummary must be non-empty string');
    assert.ok(typeof p1Data.summary === 'string', 'summary alias must be present for nurseBrief compatibility');
    assert.ok(Array.isArray(p1Data.evidenceEventIds), 'evidenceEventIds must be array');
    assert.strictEqual(p1Data.aiGenerated, true, 'aiGenerated must be true');
    assert.ok(p1Data.generatedAt, 'generatedAt must be present');
    assert.strictEqual(p1Data.disclaimer, 'AI-generated — verify before acting.', 'disclaimer must be exact');

    console.log('   ✓ P001 has all required fields including adherence, quiz, gaps, flags, disclaimer');

    // ==========================================
    // 2. Combination of 7 Data Sources
    // ==========================================
    console.log('\n2. Testing Combination of 7 Required Data Sources...');
    // 1. Medication adherence
    assert.ok(p1Data.medicationAdherence.total >= 0, '1. Medication adherence combined');
    // 2. Medication events
    assert.ok(p1Data.evidence && Array.isArray(p1Data.evidence.medicationEvents), '2. Medication events combined');
    // 3. Quiz performance
    assert.ok(p1Data.quizPerformance && typeof p1Data.quizPerformance.score === 'number', '3. Quiz performance combined');
    // 4. Quiz answers
    assert.ok(p1Data.evidence && Array.isArray(p1Data.evidence.quizAnswers), '4. Quiz answers combined');
    // 5. Knowledge gaps
    assert.ok(p1Data.knowledgeGaps.length >= 0, '5. Knowledge gaps combined');
    // 6. Verified discharge instructions
    assert.ok(p1Data.evidence && Array.isArray(p1Data.evidence.verifiedInstructions), '6. Verified discharge instructions combined');
    // 7. Relevant escalations
    assert.ok(p1Data.evidence && Array.isArray(p1Data.evidence.escalations), '7. Relevant escalations combined');

    console.log('   ✓ All 7 sources combined: adherence, med events, quiz perf, quiz answers, gaps, instructions, escalations');

    // ==========================================
    // 3. Evidence Traceability
    // ==========================================
    console.log('\n3. Testing Evidence Traceability...');
    // Verify evidenceEventIds strictly belong to P001
    const p1Events = await dataStore.getEventsByPatient('P001');
    const p1EventIds = new Set(p1Events.map(e => e._id));
    for (const evid of p1Data.evidenceEventIds) {
      assert.ok(p1EventIds.has(evid), `Evidence event ID ${evid} must strictly belong to patient P001`);
    }

    // Verify evidence traces
    assert.ok(Array.isArray(p1Data.evidence.traces), 'evidence traces array must exist');
    p1Data.evidence.traces.forEach(trace => {
      assert.ok(trace.claim, 'Each trace must have a claim');
      assert.ok(trace.sourceType, 'Each trace must have a sourceType');
      assert.ok(trace.sourceId, 'Each trace must have a sourceId');
    });

    console.log(`   ✓ Evidence event IDs strictly verified against patient events (${p1Data.evidenceEventIds.join(', ')})`);
    console.log(`   ✓ Evidence traces verified (${p1Data.evidence.traces.length} traces grounded in data)`);

    // ==========================================
    // 4. Patient Isolation & Multi-Patient Testing
    // ==========================================
    console.log('\n4. Testing Multi-Patient Isolation (P001, P002, P003, P005)...');
    const testPatients = ['P001', 'P002', 'P003', 'P005'];
    for (const patId of testPatients) {
      const res = await request(`/api/nurse/ai-summary/${patId}`);
      assert.strictEqual(res.status, 200, `Patient ${patId} summary should return 200`);
      assert.strictEqual(res.body.data.patientId, patId, `patientId in payload must match ${patId}`);

      const patEvents = await dataStore.getEventsByPatient(patId);
      const patEventIds = new Set(patEvents.map(e => e._id));

      // Ensure no foreign events leaked
      for (const evid of res.body.data.evidenceEventIds) {
        assert.ok(patEventIds.has(evid), `Evidence ID ${evid} for ${patId} must belong to ${patId}`);
      }

      for (const me of res.body.data.evidence.medicationEvents) {
        assert.strictEqual(me.patientId, patId, `Medication event ${me._id} must belong to ${patId}`);
      }

      for (const esc of res.body.data.evidence.escalations) {
        assert.strictEqual(esc.patientId, patId, `Escalation ${esc._id} must belong to ${patId}`);
      }
    }
    console.log('   ✓ Zero cross-patient leakage verified across P001, P002, P003, P005');

    // ==========================================
    // 5. AI Safety Boundary Enforcement
    // ==========================================
    console.log('\n5. Testing AI Safety Boundary Enforcement...');
    // Positive test: Safe summary passes
    nurseService.enforceNurseAISafety('Patient confirmed 2 of 3 medications and scored 80% on quiz. Follow up on walker instructions.');
    console.log('   ✓ Safe clinical summary passes safety check');

    // Negative tests: Forbidden terms must be rejected
    const forbiddenTests = [
      { text: 'Diagnosis: Patient exhibits Stage 2 Hypertension.', label: 'Diagnosis' },
      { text: 'Prescribe 500mg Amoxicillin twice daily for 7 days.', label: 'Prescription' },
      { text: 'Increase dosage of Metformin from 500mg to 1000mg.', label: 'Dosage change' },
      { text: 'Initiate new treatment plan for respiratory distress.', label: 'Treatment plan' },
      { text: 'Stop taking the medication immediately.', label: 'Medication discontinuation' }
    ];

    for (const testCase of forbiddenTests) {
      assert.throws(
        () => nurseService.enforceNurseAISafety(testCase.text),
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.ok(err.message.includes('AI Safety Violation'));
          return true;
        },
        `Must throw AI Safety Violation on ${testCase.label}`
      );
    }
    console.log('   ✓ All 5 forbidden categories (diagnosis, prescription, dosage change, treatment plan, discontinuation) properly rejected with 400');

    // ==========================================
    // 6. Summary Generation Endpoint
    // ==========================================
    console.log('\n6. Testing Summary Generation Endpoint...');
    const genRes = await request('/api/nurse/ai-summary/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: 'P001' })
    });
    assert.strictEqual(genRes.status, 200, 'Generate summary should return 200');
    assert.strictEqual(genRes.body.success, true);
    assert.strictEqual(genRes.body.data.patientId, 'P001');
    assert.strictEqual(genRes.body.data.aiGenerated, true);
    assert.strictEqual(genRes.body.data.disclaimer, 'AI-generated — verify before acting.');
    assert.ok(genRes.body.data.aiSummary.length > 0);
    console.log('   ✓ POST /api/nurse/ai-summary/generate succeeded and produced grounded summary');

    // ==========================================
    // 7. Alternative Route Endpoints & Aliases
    // ==========================================
    console.log('\n7. Testing Route Endpoints and Aliases...');
    const aliasRoutes = [
      '/api/nurse/ai-summary?patientId=P001',
      '/api/nurse/patients/P001/ai-summary',
      '/api/nurse/patients/P001/summary',
      '/api/nurse/dashboard/P001/ai-summary',
      '/api/patients/P001/nurse-ai-summary',
      '/api/patients/P001/nurse-summary'
    ];

    for (const route of aliasRoutes) {
      const res = await request(route);
      assert.strictEqual(res.status, 200, `Route ${route} must return 200`);
      assert.strictEqual(res.body.data.patientId, 'P001', `Route ${route} must return P001`);
    }
    console.log('   ✓ All 6 route aliases for nurse AI summary return consistent 200 responses');

    // ==========================================
    // 8. Error Handling & Edge Cases
    // ==========================================
    console.log('\n8. Testing Error Handling & Edge Cases...');
    const notFoundRes = await request('/api/nurse/ai-summary/P999');
    assert.strictEqual(notFoundRes.status, 404, 'Non-existent patient should return 404');

    const missingParamRes = await request('/api/nurse/ai-summary');
    assert.strictEqual(missingParamRes.status, 400, 'Missing patientId query/param should return 400');

    console.log('   ✓ 404 for non-existent patient and 400 for missing patientId verified');

    console.log('\n=========================================');
    console.log('ALL FEATURE 9 TESTS PASSED SUCCESSFULLY!');
    console.log('=========================================\n');
  } finally {
    server.close();
  }
};

runTests().catch(err => {
  console.error('Feature 9 Test Suite Failed:', err);
  process.exit(1);
});
