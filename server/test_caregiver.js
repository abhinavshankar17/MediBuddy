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
  console.log(`  TESTING CAREGIVER & FAMILY DASHBOARD BACKEND (PORT ${port})`);
  console.log(`======================================================\n`);

  try {
    // 1. Linked Patients
    console.log('--- 1. Linked Patients List ---');
    const patientsRes = await makeRequest(port, 'GET', '/api/caregiver/patients?caregiverId=U101');
    assert(patientsRes.status === 200, 'GET /api/caregiver/patients returns 200');
    assert(patientsRes.data.success === true, 'Response envelope has success: true');
    assert(Array.isArray(patientsRes.data.data.patients), 'Patients returned as array');
    assert(patientsRes.data.data.patients.length > 0, 'Found linked patients for caregiver U101');
    const p1 = patientsRes.data.data.patients.find(p => p._id === 'P001');
    assert(p1 && p1.name === 'Meena Krishnan', 'Linked patient Meena Krishnan found');
    assert(p1.relationship === 'Mother', 'Relationship correctly determined as Mother');

    // 2. Daily Report
    console.log('\n--- 2. Executive Daily Report for Loved One ---');
    const reportRes = await makeRequest(port, 'GET', '/api/caregiver/patients/P001/daily-report');
    assert(reportRes.status === 200, 'GET /api/caregiver/patients/P001/daily-report returns 200');
    const report = reportRes.data.data;
    assert(report.patient._id === 'P001', 'Report patient ID is P001');
    assert(report.recoveryStatus.color !== undefined, 'Recovery status traffic light present');
    assert(report.aiSummary.digest !== undefined, 'Executive family AI summary digest present');
    assert(Array.isArray(report.aiSummary.actionTips), 'Family action tips present as array');
    assert(report.medications.todayList !== undefined, 'Today medication schedule present');
    assert(report.careTasks.list !== undefined, 'Care tasks list present');
    assert(report.vitalsCheckIn.painLevel !== undefined, 'Vitals check-in snapshot present');

    // 3. Calendar View
    console.log('\n--- 3. Patient Recovery Calendar & Milestones ---');
    const calRes = await makeRequest(port, 'GET', '/api/caregiver/patients/P001/calendar');
    assert(calRes.status === 200, 'GET /api/caregiver/patients/P001/calendar returns 200');
    const cal = calRes.data.data;
    assert(cal.patientId === 'P001', 'Calendar is for P001');
    assert(Array.isArray(cal.days) && cal.days.length === 31, 'Calendar contains 31 days for October');
    assert(Array.isArray(cal.milestones) && cal.milestones.length > 0, 'Recovery milestones present');

    // 4. Patient Feedback for Review
    console.log('\n--- 4. Patient Feedback for Review ---');
    const fbRes = await makeRequest(port, 'GET', '/api/caregiver/patients/P001/feedback');
    assert(fbRes.status === 200, 'GET /api/caregiver/patients/P001/feedback returns 200');
    assert(Array.isArray(fbRes.data.data), 'Feedbacks returned as array');
    assert(fbRes.data.data.length > 0, 'Found submitted feedback items for P001');

    // 5. Review & Acknowledge Feedback
    console.log('\n--- 5. Review & Acknowledge Feedback ---');
    const firstFb = fbRes.data.data[0];
    const reviewRes = await makeRequest(
      port,
      'POST',
      `/api/caregiver/patients/P001/feedback/${firstFb._id}/review`,
      {
        caregiverId: 'U101',
        caregiverNote: 'Reviewed by Priya. Will bring warm compress when visiting.'
      }
    );
    assert(reviewRes.status === 200, 'POST feedback review returns 200');
    assert(reviewRes.data.data.status === 'reviewed', 'Feedback status updated to reviewed');
    assert(reviewRes.data.data.caregiverNote.includes('Priya'), 'Caregiver note stored correctly');

    // 6. Caregiver Encouragement Note
    console.log('\n--- 6. Caregiver Encouragement Note ---');
    const encRes = await makeRequest(
      port,
      'POST',
      '/api/caregiver/patients/P001/encouragement',
      {
        caregiverId: 'U101',
        caregiverName: 'Priya Krishnan (Daughter)',
        message: 'Proud of you mom! Keep up the gentle walking exercises.',
        tag: 'love'
      }
    );
    assert(encRes.status === 201, 'POST encouragement returns 201 Created');
    assert(encRes.data.data.message.includes('Proud of you mom'), 'Encouragement message recorded');

    console.log(`\n======================================================`);
    console.log(`  ALL CAREGIVER BACKEND TESTS PASSED 100%!`);
    console.log(`======================================================\n`);
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('Caregiver test failed:', err);
  process.exit(1);
});
