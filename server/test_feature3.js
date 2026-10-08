const http = require('http');
const app = require('./app');

const testFeature3 = async () => {
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
    console.log('\n--- 1. Testing Retrieving Reminders ---');
    const remindersRes = await get('/reminders?patientId=P001');
    assert(remindersRes.status === 200, 'GET /reminders?patientId=P001 returns 200');
    assert(Array.isArray(remindersRes.data.data), 'Reminders returned as array');
    assert(remindersRes.data.data.every(r => r.patientId === 'P001'), 'ALL reminders belong to P001');
    assert(remindersRes.data.data.length > 0, `Found ${remindersRes.data.data.length} reminders for P001`);
    assert(remindersRes.data.data[0].confirmationStatus !== undefined, 'confirmationStatus field present');
    console.log(`  P001 reminder sample: ${remindersRes.data.data[0].medicationName} (${remindersRes.data.data[0].status})`);

    // Test nested route
    const nestedRes = await get('/patients/P001/reminders');
    assert(nestedRes.status === 200, 'GET /patients/P001/reminders returns 200');
    assert(nestedRes.data.data.length === remindersRes.data.data.length, 'Nested route returns same reminders count');

    console.log('\n--- 2. Testing Retrieving a Reminder ---');
    const singleRes = await get('/reminders/MR001');
    assert(singleRes.status === 200, 'GET /reminders/MR001 returns 200');
    assert(singleRes.data.data._id === 'MR001', 'Reminder ID matches MR001');
    assert(singleRes.data.data.medicationName === 'Paracetamol', 'Medication is Paracetamol');
    assert(singleRes.data.data.confirmationStatus === 'confirmed', 'MR001 confirmationStatus is confirmed');

    console.log('\n--- 3. Testing Retrieving Reminder Status ---');
    const statusRes = await get('/reminders/MR001/status');
    assert(statusRes.status === 200, 'GET /reminders/MR001/status returns 200');
    assert(statusRes.data.data.reminderId === 'MR001', 'Status reminderId matches MR001');
    assert(statusRes.data.data.status === 'taken', 'Status is taken');
    assert(statusRes.data.data.isConfirmed === true, 'isConfirmed is true');
    assert(statusRes.data.data.confirmationStatus === 'confirmed', 'confirmationStatus is confirmed');

    console.log('\n--- 4. Testing Successful Confirmation ---');
    // MR022 belongs to P003, scheduled, response is null
    const beforeConfirm = await get('/reminders/MR022');
    assert(beforeConfirm.data.data.status === 'scheduled', 'MR022 initially in scheduled status');

    const confirmRes = await post('/reminders/MR022/confirm', {
      patientId: 'P003',
      response: 'taken',
      respondedAt: '2026-10-08T16:30:00+05:30'
    });
    assert(confirmRes.status === 200, 'Confirmation returns 200 OK');
    assert(confirmRes.data.data.status === 'taken', 'Reminder status updated to taken');
    assert(confirmRes.data.data.responseType === 'taken', 'responseType updated to taken');
    assert(confirmRes.data.data.confirmationStatus === 'confirmed', 'confirmationStatus updated to confirmed');
    assert(confirmRes.data.data.isConfirmed === true, 'isConfirmed is true');

    // Verify status endpoint reflects updated state
    const afterStatus = await get('/reminders/MR022/status');
    assert(afterStatus.data.data.status === 'taken', 'Status endpoint confirms taken');
    assert(afterStatus.data.data.confirmationStatus === 'confirmed', 'Status endpoint confirms confirmed');

    console.log('\n--- 5. Testing Duplicate Confirmation ---');
    // Attempting to confirm MR022 again should trigger duplicate / conflict error
    const duplicateRes = await post('/reminders/MR022/confirm', {
      patientId: 'P003',
      response: 'taken'
    });
    assert(duplicateRes.status === 409, 'Duplicate confirmation rejected with 409 Conflict');
    assert(duplicateRes.data.message.includes('already been completed'), 'Rejection message clarifies duplicate confirmation');

    console.log('\n--- 6. Testing Already Completed Reminder ---');
    // MR001 is already completed from mock data
    const alreadyCompletedRes = await post('/reminders/MR001/confirm', {
      patientId: 'P001',
      response: 'taken'
    });
    assert(alreadyCompletedRes.status === 409, 'Already completed reminder rejected with 409 Conflict');

    console.log('\n--- 7. Testing Invalid Reminder ---');
    const invalidRes = await post('/reminders/MR999/confirm', {
      patientId: 'P001',
      response: 'taken'
    });
    assert(invalidRes.status === 404, 'Invalid reminder MR999 returns 404 Not Found');

    console.log('\n--- 8. Testing Wrong Patient Access ---');
    // MR028 belongs to P006, trying to confirm as P001 must be blocked
    const wrongPatientRes = await post('/reminders/MR028/confirm', {
      patientId: 'P001',
      response: 'taken'
    });
    assert(wrongPatientRes.status === 403, 'Wrong patient confirmation blocked with 403 Forbidden');
    assert(wrongPatientRes.data.message.includes('not authorized'), 'Message explains patient authorization failure');

    console.log('\n--- 9. Testing Critical Semantic Rule: no_response ---');
    // MR024 belongs to P005, scheduled
    const noRespRes = await post('/reminders/MR024/confirm', {
      patientId: 'P005',
      response: 'no_response'
    });
    assert(noRespRes.status === 200, 'no_response request succeeded with 200 OK');
    assert(noRespRes.data.data.responseType === 'no_response', 'responseType is no_response');
    assert(noRespRes.data.data.confirmationStatus === 'not confirmed', 'CRITICAL RULE PASSED: represented as "not confirmed"');
    assert(noRespRes.data.data.confirmationStatus !== 'not taken', 'CRITICAL RULE PASSED: MUST NOT claim "not taken"');
    assert(noRespRes.data.data.isConfirmed === false, 'isConfirmed is false');

    const noRespStatus = await get('/reminders/MR024/status');
    assert(noRespStatus.data.data.confirmationStatus === 'not confirmed', 'Status endpoint returns "not confirmed"');
    assert(noRespStatus.data.data.confirmationStatus !== 'not taken', 'Status endpoint DOES NOT return "not taken"');

    console.log('\n--- 10. Testing Patient Response: not_taken ---');
    // MR028 belongs to P006
    const notTakenRes = await post('/reminders/MR028/confirm', {
      patientId: 'P006',
      response: 'not_taken'
    });
    assert(notTakenRes.status === 200, 'not_taken request succeeded with 200 OK');
    assert(notTakenRes.data.data.responseType === 'not_taken', 'responseType is not_taken');
    assert(notTakenRes.data.data.confirmationStatus === 'not taken', 'confirmationStatus is "not taken"');
    assert(notTakenRes.data.data.status === 'missed', 'status is missed');

    console.log('\nALL FEATURE 3 MEDICATION REMINDER TESTS PASSED PERFECTLY!\n');
  } finally {
    server.close();
  }
};

testFeature3().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
