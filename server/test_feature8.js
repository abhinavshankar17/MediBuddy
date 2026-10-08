const http = require('http');
const app = require('./app');

const testFeature8 = async () => {
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

  try {
    console.log('\n======================================================');
    console.log('FEATURE 8: NURSE DASHBOARD BACKEND APIS TEST SUITE');
    console.log('======================================================\n');

    // ---------------------------------------------------------
    // TEST 1: Patient List & Aggregate Dashboard
    // ---------------------------------------------------------
    console.log('--- 1. Testing Patient List / Dashboard Overview ---');
    const dashboardRes = await get('/nurse/dashboard');
    assert(dashboardRes.status === 200, 'GET /api/nurse/dashboard returns 200 OK');
    const dashboardData = dashboardRes.data.data;

    assert(typeof dashboardData.totalPatients === 'number', 'Dashboard contains totalPatients');
    assert(Array.isArray(dashboardData.patients), 'Dashboard contains patients array');
    assert(dashboardData.patients.length >= 8, `Dashboard returned all patients (count: ${dashboardData.patients.length})`);
    assert(typeof dashboardData.highPriorityCount === 'number', `High priority count: ${dashboardData.highPriorityCount}`);

    // Verify alias route: GET /api/nurse/patients
    const patientsAliasRes = await get('/nurse/patients');
    assert(patientsAliasRes.status === 200, 'GET /api/nurse/patients alias returns 200 OK');
    assert(patientsAliasRes.data.data.patients.length === dashboardData.patients.length, 'Alias returns identical patient count');

    // ---------------------------------------------------------
    // TEST 2: Every Patient Card Provides Required Fields
    // patient, medication adherence, quiz performance, knowledge gaps, flags, latest relevant events
    // ---------------------------------------------------------
    console.log('\n--- 2. Testing Required Fields for Every Patient in Dashboard ---');
    for (const card of dashboardData.patients) {
      const pid = card.patient._id;

      // 1. Patient profile
      assert(card.patient !== undefined, `${pid} has patient object`);
      assert(card.patient._id === pid, `${pid} patient._id matches`);
      assert(typeof card.patient.name === 'string', `${pid} patient has name (${card.patient.name})`);
      assert(typeof card.patient.surgery === 'string', `${pid} patient has surgery (${card.patient.surgery})`);

      // 2. Medication adherence: total, confirmed, notConfirmed, missed
      assert(card.medicationAdherence !== undefined, `${pid} has medicationAdherence`);
      assert(typeof card.medicationAdherence.total === 'number', `${pid} adherence has total (${card.medicationAdherence.total})`);
      assert(typeof card.medicationAdherence.confirmed === 'number', `${pid} adherence has confirmed (${card.medicationAdherence.confirmed})`);
      assert(typeof card.medicationAdherence.notConfirmed === 'number', `${pid} adherence has notConfirmed (${card.medicationAdherence.notConfirmed})`);
      assert(typeof card.medicationAdherence.missed === 'number', `${pid} adherence has missed (${card.medicationAdherence.missed})`);
      assert(
        card.medicationAdherence.confirmed + card.medicationAdherence.notConfirmed + card.medicationAdherence.missed <= card.medicationAdherence.total + 1,
        `${pid} adherence counts sum coherently`
      );

      // 3. Quiz performance: score, correct, total (or null if not taken)
      if (card.quizPerformance) {
        assert(typeof card.quizPerformance.score === 'number', `${pid} quiz has score (${card.quizPerformance.score})`);
        assert(typeof card.quizPerformance.correct === 'number', `${pid} quiz has correct (${card.quizPerformance.correct})`);
        assert(card.quizPerformance.total === 5, `${pid} quiz total is strictly 5 (${card.quizPerformance.total})`);
      }

      // 4. Knowledge gaps
      assert(Array.isArray(card.knowledgeGaps), `${pid} has knowledgeGaps array`);

      // 5. Flags
      assert(Array.isArray(card.flags), `${pid} has flags array`);

      // 6. Latest relevant events
      assert(Array.isArray(card.latestRelevantEvents), `${pid} has latestRelevantEvents array`);
      for (const ev of card.latestRelevantEvents) {
        assert(ev.patientId === pid, `STRICT ISOLATION: Event ${ev._id} belongs strictly to ${pid} (found: ${ev.patientId})`);
      }

      console.log(`  Patient ${pid} (${card.patient.name}): Adherence=${card.medicationAdherence.confirmed}/${card.medicationAdherence.total}, Quiz=${card.quizPerformance ? card.quizPerformance.score + '%' : 'N/A'}, Priority=${card.priority}`);
    }

    // ---------------------------------------------------------
    // TEST 3: Patient Detail View
    // ---------------------------------------------------------
    console.log('\n--- 3. Testing Single Patient Detail Views ---');
    const testPatients = ['P001', 'P003', 'P005', 'P008'];

    for (const pid of testPatients) {
      const detailRes = await get(`/nurse/dashboard/patient/${pid}`);
      assert(detailRes.status === 200, `GET /api/nurse/dashboard/patient/${pid} returns 200 OK`);
      const detail = detailRes.data.data;

      assert(detail.patient._id === pid, `Detail view belongs strictly to patient ${pid}`);
      assert(detail.medicationAdherence !== undefined, `${pid} detail has medication adherence`);
      assert(detail.quizPerformance !== undefined, `${pid} detail has quiz performance`);
      assert(Array.isArray(detail.knowledgeGaps), `${pid} detail has knowledge gaps`);
      assert(Array.isArray(detail.flags), `${pid} detail has flags`);
      assert(Array.isArray(detail.latestRelevantEvents), `${pid} detail has latest relevant events`);
      assert(Array.isArray(detail.questionsForNurse), `${pid} detail has questionsForNurse`);
      assert(typeof detail.recommendedFollowUp === 'string', `${pid} detail has recommendedFollowUp`);

      // Test alias routes
      const alias1 = await get(`/nurse/dashboard/${pid}`);
      assert(alias1.status === 200, `GET /api/nurse/dashboard/${pid} returns 200`);
      const alias2 = await get(`/nurse/patients/${pid}`);
      assert(alias2.status === 200, `GET /api/nurse/patients/${pid} returns 200`);
      const nestedPatient = await get(`/patients/${pid}/nurse-dashboard`);
      assert(nestedPatient.status === 200, `GET /api/patients/${pid}/nurse-dashboard returns 200`);
    }

    // Negative test: non-existent patient
    const notFoundRes = await get('/nurse/dashboard/patient/P999');
    assert(notFoundRes.status === 404, 'Querying non-existent patient P999 returns 404 Not Found');

    // ---------------------------------------------------------
    // TEST 4: Medication Adherence Accuracy & Semantic Rule
    // ---------------------------------------------------------
    console.log('\n--- 4. Testing Medication Adherence Counts & Semantic Integrity ---');
    // P001: adherence metrics match calculateAdherence
    const p1Detail = (await get('/nurse/dashboard/patient/P001')).data.data;
    assert(p1Detail.medicationAdherence.confirmed >= 2, `P001 confirmed count (${p1Detail.medicationAdherence.confirmed}) >= 2`);
    assert(p1Detail.medicationAdherence.notConfirmed >= 1, `P001 notConfirmed count (${p1Detail.medicationAdherence.notConfirmed}) >= 1 (no_response rule)`);
    assert(
      p1Detail.medicationAdherence.total === p1Detail.medicationAdherence.confirmed + p1Detail.medicationAdherence.notConfirmed + p1Detail.medicationAdherence.missed,
      'P001 total equals confirmed + notConfirmed + missed'
    );

    // P003: 1 missed (Amoxicillin afternoon missed)
    const p3Detail = (await get('/nurse/dashboard/patient/P003')).data.data;
    assert(p3Detail.medicationAdherence.missed >= 1, `P003 has missed medication (${p3Detail.medicationAdherence.missed})`);
    assert(p3Detail.flags.includes('Missed medication'), 'P003 flags include "Missed medication"');

    // P005: missed Metformin
    const p5Detail = (await get('/nurse/dashboard/patient/P005')).data.data;
    assert(p5Detail.medicationAdherence.missed >= 1, `P005 has missed medication (${p5Detail.medicationAdherence.missed})`);
    assert(p5Detail.priority === 'HIGH', 'P005 is marked HIGH priority due to missed meds & low score');

    // ---------------------------------------------------------
    // TEST 5: Quiz Score Correctness
    // ---------------------------------------------------------
    console.log('\n--- 5. Testing Quiz Score Association ---');
    // P001: score 80, correct 4, total 5
    assert(p1Detail.quizPerformance.score === 80, 'P001 quiz score is 80%');
    assert(p1Detail.quizPerformance.correct === 4, 'P001 correct answers = 4');
    assert(p1Detail.quizPerformance.total === 5, 'P001 total questions = 5');

    // P002: score 100, correct 5, total 5
    const p2Detail = (await get('/nurse/dashboard/patient/P002')).data.data;
    assert(p2Detail.quizPerformance.score === 100, 'P002 quiz score is 100%');
    assert(p2Detail.quizPerformance.correct === 5, 'P002 correct answers = 5');
    assert(p2Detail.quizPerformance.total === 5, 'P002 total questions = 5');

    // P005: score 40, correct 2, total 5
    assert(p5Detail.quizPerformance.score === 40, 'P005 quiz score is 40%');
    assert(p5Detail.quizPerformance.correct === 2, 'P005 correct answers = 2');
    assert(p5Detail.quizPerformance.total === 5, 'P005 total questions = 5');

    // ---------------------------------------------------------
    // TEST 6: Knowledge Gaps Association
    // ---------------------------------------------------------
    console.log('\n--- 6. Testing Knowledge Gaps Association ---');
    // P001 knowledge gap: Mobility aid usage
    assert(
      p1Detail.knowledgeGaps.some(g => g.toLowerCase().includes('mobility')),
      'P001 knowledge gaps include mobility aid usage'
    );

    // P002 has 100% score -> empty knowledge gaps
    assert(p2Detail.knowledgeGaps.length === 0, 'P002 has 0 knowledge gaps (100% quiz score)');

    // P003 knowledge gaps: Antibiotic duration, Warning sign recognition
    assert(
      p3Detail.knowledgeGaps.some(g => g.toLowerCase().includes('duration') || g.toLowerCase().includes('antibiotic')),
      'P003 knowledge gaps include antibiotic duration'
    );
    assert(
      p3Detail.knowledgeGaps.some(g => g.toLowerCase().includes('warning')),
      'P003 knowledge gaps include warning signs'
    );

    // ---------------------------------------------------------
    // TEST 7: Events Association & Zero Cross-Patient Mixing
    // ---------------------------------------------------------
    console.log('\n--- 7. Testing Strict Event Association (Zero Cross-Patient Mixing) ---');
    const allPatientsRes = await get('/nurse/dashboard');
    const patientsList = allPatientsRes.data.data.patients;

    for (const item of patientsList) {
      const pid = item.patient._id;
      for (const ev of item.latestRelevantEvents) {
        assert(ev.patientId === pid, `Event ${ev._id} belongs strictly to patient ${pid}`);
      }
    }

    // Compare event IDs between P001 and P002 to ensure zero intersection
    const p1EventIds = new Set(p1Detail.latestRelevantEvents.map(e => e._id));
    const p2EventIds = new Set(p2Detail.latestRelevantEvents.map(e => e._id));
    const p3EventIds = new Set(p3Detail.latestRelevantEvents.map(e => e._id));

    const p1p2Common = [...p1EventIds].filter(id => p2EventIds.has(id));
    const p1p3Common = [...p1EventIds].filter(id => p3EventIds.has(id));
    assert(p1p2Common.length === 0, 'Zero event leakage between P001 and P002');
    assert(p1p3Common.length === 0, 'Zero event leakage between P001 and P003');

    // ---------------------------------------------------------
    // TEST 8: Filtering by Priority & Search
    // ---------------------------------------------------------
    console.log('\n--- 8. Testing Query Filtering (Priority & Search) ---');
    const highPriorityRes = await get('/nurse/dashboard?priority=HIGH');
    assert(highPriorityRes.status === 200, 'Filter by priority=HIGH returns 200 OK');
    for (const card of highPriorityRes.data.data.patients) {
      assert(card.priority === 'HIGH', `Filtered item ${card.patient._id} has priority HIGH`);
    }

    const searchRes = await get('/nurse/dashboard?search=Arjun');
    assert(searchRes.status === 200, 'Search by name returns 200 OK');
    assert(searchRes.data.data.patients.length >= 1, 'Search finds matching patient');
    assert(searchRes.data.data.patients[0].patient.name.includes('Arjun'), 'Search result matches "Arjun"');

    console.log('\n======================================================');
    console.log('ALL FEATURE 8 NURSE DASHBOARD TESTS PASSED FLAWLESSLY!');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
};

testFeature8().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
