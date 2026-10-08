const http = require('http');
const app = require('./app');
const { insightService, dataStore } = require('./services');

const testFeature7 = async () => {
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
    console.log('FEATURE 7: PATIENT INSIGHT FUNCTIONALITY TEST SUITE');
    console.log('======================================================\n');

    // ---------------------------------------------------------
    // TEST 1: Retrieve Patient Insights across multiple patients
    // ---------------------------------------------------------
    console.log('--- 1. Testing Retrieval across Multiple Patients ---');
    const testPatients = ['P001', 'P002', 'P003', 'P004', 'P005', 'P006', 'P008'];

    for (const patientId of testPatients) {
      // Test nested route: GET /api/patients/:id/insight
      const res = await get(`/patients/${patientId}/insight`);
      assert(res.status === 200, `GET /patients/${patientId}/insight returns 200 OK`);

      const insight = res.data.data;
      assert(insight.patientId === patientId, `Insight patientId strictly matches requested ${patientId}`);

      // Verify all required fields from prompt:
      // score, strengths, weaknesses, missedInstructions, aiSummary, priority, evidenceEventIds, generatedAt
      assert(typeof insight.score === 'number', `${patientId} insight has score (${insight.score})`);
      assert(Array.isArray(insight.strengths), `${patientId} insight has strengths array`);
      assert(Array.isArray(insight.weaknesses), `${patientId} insight has weaknesses array`);
      assert(Array.isArray(insight.missedInstructions), `${patientId} insight has missedInstructions array`);
      assert(typeof insight.aiSummary === 'string' && insight.aiSummary.length > 0, `${patientId} insight has aiSummary`);
      assert(['LOW', 'MEDIUM', 'HIGH'].includes(insight.priority), `${patientId} insight has valid priority (${insight.priority})`);
      assert(Array.isArray(insight.evidenceEventIds), `${patientId} insight has evidenceEventIds array`);
      assert(typeof insight.generatedAt === 'string', `${patientId} insight has generatedAt`);

      // Verify frontend disclaimer information
      assert(
        insight.disclaimer === 'AI-generated — verify before acting.',
        `${patientId} insight includes mandatory disclaimer: "${insight.disclaimer}"`
      );

      console.log(`  Patient ${patientId}: score=${insight.score}, priority=${insight.priority}, evidenceEvents=${insight.evidenceEventIds.join(',')}`);
    }

    // ---------------------------------------------------------
    // TEST 2: Grounding & Actual Evidence Verification
    // ---------------------------------------------------------
    console.log('\n--- 2. Testing Grounding & Evidence Points to Actual Records ---');
    for (const patientId of testPatients) {
      const res = await get(`/patients/${patientId}/insight`);
      const insight = res.data.data;

      assert(insight.evidenceEventIds.length > 0, `${patientId} has evidence event references`);

      for (const eventId of insight.evidenceEventIds) {
        // Query event directly from dataStore
        const event = await dataStore.getEventById(eventId);
        assert(event !== null && event !== undefined, `Evidence event ${eventId} exists as an actual record`);
        assert(
          event.patientId === patientId,
          `ZERO LEAKAGE: Evidence event ${eventId} strictly belongs to patient ${patientId} (actual event patientId: ${event.patientId})`
        );
      }
    }

    // ---------------------------------------------------------
    // TEST 3: AI Boundary Enforcement
    // The insight must NOT:
    // - diagnose
    // - prescribe
    // - change medication
    // - recommend dosage changes
    // ---------------------------------------------------------
    console.log('\n--- 3. Testing AI Boundaries (No Diagnosis, Prescriptions, Med/Dose Changes) ---');
    const forbiddenPatterns = [
      /\bdiagnos(e|is|ed|ing)\b/i,
      /\bprescrib(e|ed|ing|tion)\b/i,
      /\b(increase|decrease|change|modify|adjust|double|halve)\s+(the\s+)?(dose|dosage|medication|prescription)\b/i,
      /\b(start|stop|discontinue)\s+(taking\s+)?(the\s+)?(medication|drug|pill|tablets?)\b/i
    ];

    for (const patientId of testPatients) {
      const res = await get(`/patients/${patientId}/insight`);
      const summary = res.data.data.aiSummary;

      for (const pattern of forbiddenPatterns) {
        assert(
          !pattern.test(summary),
          `AI BOUNDARY RESPECTED: Summary for ${patientId} does not violate '${pattern.source}'`
        );
      }
    }

    // Negative unit test for enforceAIBoundary helper
    let caughtDiagnosis = false;
    try {
      insightService.enforceAIBoundary('We diagnose the patient with acute hypertension.');
    } catch (err) {
      caughtDiagnosis = true;
      assert(err.statusCode === 400, 'Diagnosing statement caught with 400 Bad Request');
    }
    assert(caughtDiagnosis, 'AI Boundary strictly blocks diagnosis statements');

    let caughtPrescribe = false;
    try {
      insightService.enforceAIBoundary('Prescribe 500mg Amoxicillin to patient.');
    } catch (err) {
      caughtPrescribe = true;
      assert(err.statusCode === 400, 'Prescribing statement caught with 400 Bad Request');
    }
    assert(caughtPrescribe, 'AI Boundary strictly blocks prescribing statements');

    let caughtDoseChange = false;
    try {
      insightService.enforceAIBoundary('Please increase the dose of Metformin to 1000mg.');
    } catch (err) {
      caughtDoseChange = true;
      assert(err.statusCode === 400, 'Dose modification statement caught with 400 Bad Request');
    }
    assert(caughtDoseChange, 'AI Boundary strictly blocks dose change recommendations');

    // ---------------------------------------------------------
    // TEST 4: Zero Cross-Patient Insight Leakage
    // ---------------------------------------------------------
    console.log('\n--- 4. Testing Zero Cross-Patient Insight Leakage ---');
    const p1Res = await get('/patients/P001/insight');
    const p2Res = await get('/patients/P002/insight');
    const p3Res = await get('/patients/P003/insight');

    const p1 = p1Res.data.data;
    const p2 = p2Res.data.data;
    const p3 = p3Res.data.data;

    assert(p1.patientId === 'P001', 'P001 data belongs to P001');
    assert(p2.patientId === 'P002', 'P002 data belongs to P002');
    assert(p3.patientId === 'P003', 'P003 data belongs to P003');

    // Evidence events must be mutually disjoint between different patients
    const p1Events = new Set(p1.evidenceEventIds);
    const p2Events = new Set(p2.evidenceEventIds);
    const p3Events = new Set(p3.evidenceEventIds);

    const p1p2Intersection = [...p1Events].filter(id => p2Events.has(id));
    const p1p3Intersection = [...p1Events].filter(id => p3Events.has(id));
    assert(p1p2Intersection.length === 0, 'No evidence event overlap between P001 and P002');
    assert(p1p3Intersection.length === 0, 'No evidence event overlap between P001 and P003');

    // Cross-patient access guard on getInsightById
    const crossAccessRes = await get(`/patients/P002/insights/${p1._id}`);
    assert(crossAccessRes.status === 403, 'Cross-patient insight access (P002 requesting P001 insight) blocked with 403 Forbidden');

    // Non-existent patient guard
    const nonExistentRes = await get('/patients/P999/insight');
    assert(nonExistentRes.status === 404, 'Non-existent patient returns 404 Not Found');

    // ---------------------------------------------------------
    // TEST 5: Dynamic Grounded Generation for Patient Without Mock Insight (P007)
    // ---------------------------------------------------------
    console.log('\n--- 5. Testing Dynamic Grounded Generation for P007 ---');
    const p7Res = await get('/patients/P007/insight');
    assert(p7Res.status === 200, 'GET /patients/P007/insight returns 200 via grounded generation fallback');
    const p7 = p7Res.data.data;

    assert(p7.patientId === 'P007', 'P007 insight generated for P007');
    assert(typeof p7.score === 'number', `P007 calculated score: ${p7.score}`);
    assert(Array.isArray(p7.strengths), 'P007 has strengths derived from records');
    assert(Array.isArray(p7.evidenceEventIds), 'P007 has evidenceEventIds');
    assert(p7.disclaimer === 'AI-generated — verify before acting.', 'P007 has AI disclaimer');

    // Verify all P007 evidence events belong to P007
    for (const eid of p7.evidenceEventIds) {
      const ev = await dataStore.getEventById(eid);
      assert(ev.patientId === 'P007', `P007 evidence event ${eid} belongs to P007`);
    }

    // ---------------------------------------------------------
    // TEST 6: Top-level /api/insights routes
    // ---------------------------------------------------------
    console.log('\n--- 6. Testing /api/insights Top-Level Routes ---');
    const topLevelLatestRes = await get('/insights/latest?patientId=P001');
    assert(topLevelLatestRes.status === 200, 'GET /api/insights/latest?patientId=P001 returns 200');
    assert(topLevelLatestRes.data.data.patientId === 'P001', 'Top-level returns P001 insight');

    const topLevelPatientRes = await get('/insights/patient/P002');
    assert(topLevelPatientRes.status === 200, 'GET /api/insights/patient/P002 returns 200');
    assert(Array.isArray(topLevelPatientRes.data.data), 'Returns array of insights');

    const topLevelByIdRes = await get(`/insights/${p1._id}`);
    assert(topLevelByIdRes.status === 200, `GET /api/insights/${p1._id} returns 200`);
    assert(topLevelByIdRes.data.data._id === p1._id, 'Returns requested insight by ID');

    console.log('\n======================================================');
    console.log('ALL FEATURE 7 PATIENT INSIGHT TESTS PASSED FLAWLESSLY!');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
};

testFeature7().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
