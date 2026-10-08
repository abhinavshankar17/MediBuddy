const http = require('http');
const app = require('./app');

function makeRequest(port, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`   ✓ ${message}`);
}

async function run() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`\n======================================================`);
  console.log(`  TESTING FRONTEND-BACKEND INTEGRATION ON PORT ${port}`);
  console.log(`======================================================\n`);

  try {
    // 1. Nurse Cohort Overview
    console.log('--- 1. Nurse Cohort Overview ---');
    const overviewRes = await makeRequest(port, 'GET', '/api/nurse/dashboard-overview');
    assert(overviewRes.status === 200, 'GET /api/nurse/dashboard-overview returns 200');
    assert(overviewRes.data.success === true, 'Response envelope has success: true');
    assert(typeof overviewRes.data.data.totalPatients === 'number', 'totalPatients is number');
    assert(typeof overviewRes.data.data.medAdherenceRate === 'number', 'medAdherenceRate is number');

    // 2. Nurse Patient List
    console.log('\n--- 2. Nurse Patient List ---');
    const nursePatientsRes = await makeRequest(port, 'GET', '/api/nurse/patients');
    assert(nursePatientsRes.status === 200, 'GET /api/nurse/patients returns 200');
    assert(Array.isArray(nursePatientsRes.data.data.patients), 'patients is an array');
    assert(nursePatientsRes.data.data.patients.length > 0, 'Found registered patients');
    const firstNursePatient = nursePatientsRes.data.data.patients[0];
    assert(firstNursePatient.patient && firstNursePatient.medicationAdherence, 'Patient has medicationAdherence and details');

    // 3. Nurse Alerts
    console.log('\n--- 3. Nurse Alerts ---');
    const alertsRes = await makeRequest(port, 'GET', '/api/nurse/alerts');
    assert(alertsRes.status === 200, 'GET /api/nurse/alerts returns 200');
    assert(Array.isArray(alertsRes.data.data), 'Alerts returned as array in envelope');

    // 4. Nurse Patient Detail
    console.log('\n--- 4. Nurse Patient Detail ---');
    const p1DetailRes = await makeRequest(port, 'GET', '/api/nurse/patients/P001');
    assert(p1DetailRes.status === 200, 'GET /api/nurse/patients/P001 returns 200');
    assert(p1DetailRes.data.data.patient._id === 'P001', 'Patient detail is for P001');
    assert(p1DetailRes.data.data.medicationAdherence !== undefined, 'Contains medication adherence');

    // 5. Nurse AI Briefs
    console.log('\n--- 5. Nurse AI Briefs ---');
    const briefsRes = await makeRequest(port, 'GET', '/api/nurse/briefs/P001');
    assert(briefsRes.status === 200, 'GET /api/nurse/briefs/P001 returns 200');
    assert(briefsRes.data.data.patientId === 'P001', 'Brief strictly matches P001');

    // 6. Patient Profile & Instructions
    console.log('\n--- 6. Patient Profile & Discharge Instructions ---');
    const patientRes = await makeRequest(port, 'GET', '/api/patients/P001');
    assert(patientRes.status === 200, 'GET /api/patients/P001 returns 200');
    assert(patientRes.data.data._id === 'P001', 'Patient profile ID matches P001');

    const instrRes = await makeRequest(port, 'GET', '/api/patients/P001/instructions');
    assert(instrRes.status === 200, 'GET /api/patients/P001/instructions returns 200');
    const items = Array.isArray(instrRes.data.data) ? instrRes.data.data : (instrRes.data.data.instructions || []);
    assert(Array.isArray(items) && items.length > 0, 'Extracted instructions returned');

    // 7. Medication Reminders & Confirmations
    console.log('\n--- 7. Medication Reminders & Confirmations ---');
    const remRes = await makeRequest(port, 'GET', '/api/patients/P001/reminders');
    assert(remRes.status === 200, 'GET /api/patients/P001/reminders returns 200');
    assert(Array.isArray(remRes.data.data), 'Reminders returned as array');

    const remAliasRes = await makeRequest(port, 'GET', '/api/patients/P001/medication-reminders');
    assert(remAliasRes.status === 200, 'GET /api/patients/P001/medication-reminders alias returns 200');

    // 8. Quiz Session & Submission
    console.log('\n--- 8. Daily Quiz Session (Exactly 5 Questions) ---');
    const quizRes = await makeRequest(port, 'GET', '/api/patients/P001/quiz-session');
    assert(quizRes.status === 200, 'GET /api/patients/P001/quiz-session returns 200');
    assert(quizRes.data.data.questions.length === 5, 'Daily quiz has EXACTLY 5 questions');

    const sessionId = quizRes.data.data.session._id;
    const questions = quizRes.data.data.questions;
    const submitPayload = {
      patientId: 'P001',
      answers: questions.map(q => ({
        questionId: q._id,
        selectedAnswer: (q.options && q.options[0]) || 'Option A'
      }))
    };

    const submitRes = await makeRequest(port, 'POST', `/api/quiz-sessions/${sessionId}/submit`, submitPayload);
    // Note: session might be already completed or newly submitted
    assert(submitRes.status === 200 || submitRes.status === 409, 'POST /api/quiz-sessions/:id/submit responds with 200 or 409');

    // 9. Patient Insight
    console.log('\n--- 9. Patient Insight ---');
    const insightRes = await makeRequest(port, 'GET', '/api/patients/P001/insight');
    assert(insightRes.status === 200, 'GET /api/patients/P001/insight returns 200');
    assert(insightRes.data.data.patientId === 'P001', 'Insight matches patient P001');

    console.log(`\n======================================================`);
    console.log(`  ALL FRONTEND-BACKEND INTEGRATION CHECKS PASSED 100%!`);
    console.log(`======================================================\n`);
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('Integration test failed with error:', err);
  process.exit(1);
});
