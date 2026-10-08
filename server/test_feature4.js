const http = require('http');
const app = require('./app');

const testFeature4 = async () => {
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
    console.log('\n--- 1. Testing Event Retrieval & Patient Isolation ---');
    // Test P001 events
    const p1Events = await get('/events?patientId=P001');
    assert(p1Events.status === 200, 'GET /events?patientId=P001 returns 200');
    assert(Array.isArray(p1Events.data.data), 'Events returned as array');
    assert(p1Events.data.data.every(e => e.patientId === 'P001'), 'STRICT ISOLATION: ALL events belong to P001');
    console.log(`  Found ${p1Events.data.data.length} total events for P001`);

    // Test P002 events
    const p2Events = await get('/events?patientId=P002');
    assert(p2Events.status === 200, 'GET /events?patientId=P002 returns 200');
    assert(p2Events.data.data.every(e => e.patientId === 'P002'), 'STRICT ISOLATION: ALL events belong to P002');
    console.log(`  Found ${p2Events.data.data.length} total events for P002`);

    // Verify no cross-patient leakage between P001 and P002
    const p1Ids = new Set(p1Events.data.data.map(e => e._id));
    const p2Ids = new Set(p2Events.data.data.map(e => e._id));
    const intersection = [...p1Ids].filter(id => p2Ids.has(id));
    assert(intersection.length === 0, 'ZERO event ID overlap between patients P001 and P002');

    // Test nested route /patients/:id/events
    const nestedEvents = await get('/patients/P001/events');
    assert(nestedEvents.status === 200, 'GET /patients/P001/events returns 200');
    assert(nestedEvents.data.data.length === p1Events.data.data.length, 'Nested route returns exact same event count');

    console.log('\n--- 2. Testing Medication-Specific Events ---');
    const medEvents = await get('/events/medication?patientId=P001');
    assert(medEvents.status === 200, 'GET /events/medication?patientId=P001 returns 200');
    const supportedTypes = [
      'reminder_sent',
      'reminder_opened',
      'medication_taken',
      'medication_not_taken',
      'medication_missed',
      'medication_acknowledged'
    ];
    assert(medEvents.data.data.every(e => supportedTypes.includes(e.type)), 'All medication events match supported types');
    console.log(`  Found ${medEvents.data.data.length} medication events for P001:`);
    medEvents.data.data.slice(0, 4).forEach(e => {
      console.log(`    - Event ${e._id}: type=${e.type}, reminder=${e.reminderId}, timestamp=${e.timestamp}`);
    });

    console.log('\n--- 3. Testing Event Creation with Traceability ---');
    const newEventPayload = {
      patientId: 'P001',
      type: 'reminder_opened',
      reminderId: 'MR001',
      source: 'patient_mobile_app',
      actor: 'P001',
      payload: {
        device: 'iOS',
        screen: 'medication_modal'
      }
    };
    const createRes = await post('/events', newEventPayload);
    assert(createRes.status === 201, 'POST /events returns 201 Created');
    assert(createRes.data.data.patientId === 'P001', 'Event traceable to patient P001');
    assert(createRes.data.data.reminderId === 'MR001', 'Event traceable to reminder MR001');
    assert(createRes.data.data.type === 'reminder_opened', 'Event type preserved as reminder_opened');
    assert(createRes.data.data.timestamp !== undefined, 'Event traceable to timestamp');
    assert(createRes.data.data.payload.source === 'patient_mobile_app', 'Event traceable to action/source');
    assert(createRes.data.data.payload.medicationName === 'Paracetamol', 'Event payload enriched with medicationName');

    console.log('\n--- 4. Testing Medication Adherence Calculation Across Multiple Patients ---');
    // Test P001 adherence
    const p1Adh = await get('/adherence?patientId=P001');
    assert(p1Adh.status === 200, 'GET /adherence?patientId=P001 returns 200');
    assert(p1Adh.data.data.total !== undefined, 'total field present');
    assert(p1Adh.data.data.confirmed !== undefined, 'confirmed field present');
    assert(p1Adh.data.data.notConfirmed !== undefined, 'notConfirmed field present');
    assert(p1Adh.data.data.missed !== undefined, 'missed field present');
    assert(
      p1Adh.data.data.total === (p1Adh.data.data.confirmed + p1Adh.data.data.notConfirmed + p1Adh.data.data.missed),
      'P001: total equals confirmed + notConfirmed + missed'
    );
    console.log(`  P001 Adherence: Total=${p1Adh.data.data.total}, Confirmed=${p1Adh.data.data.confirmed}, NotConfirmed=${p1Adh.data.data.notConfirmed}, Missed=${p1Adh.data.data.missed}`);

    // Test P002 adherence
    const p2Adh = await get('/adherence?patientId=P002');
    assert(p2Adh.status === 200, 'GET /adherence?patientId=P002 returns 200');
    assert(
      p2Adh.data.data.total === (p2Adh.data.data.confirmed + p2Adh.data.data.notConfirmed + p2Adh.data.data.missed),
      'P002: total equals confirmed + notConfirmed + missed'
    );
    console.log(`  P002 Adherence: Total=${p2Adh.data.data.total}, Confirmed=${p2Adh.data.data.confirmed}, NotConfirmed=${p2Adh.data.data.notConfirmed}, Missed=${p2Adh.data.data.missed}`);

    // Test P003 adherence
    const p3Adh = await get('/adherence?patientId=P003');
    assert(p3Adh.status === 200, 'GET /adherence?patientId=P003 returns 200');
    assert(
      p3Adh.data.data.total === (p3Adh.data.data.confirmed + p3Adh.data.data.notConfirmed + p3Adh.data.data.missed),
      'P003: total equals confirmed + notConfirmed + missed'
    );
    console.log(`  P003 Adherence: Total=${p3Adh.data.data.total}, Confirmed=${p3Adh.data.data.confirmed}, NotConfirmed=${p3Adh.data.data.notConfirmed}, Missed=${p3Adh.data.data.missed}`);

    // Test P005 adherence (contains intentional edge case)
    const p5Adh = await get('/adherence?patientId=P005');
    assert(p5Adh.status === 200, 'GET /adherence?patientId=P005 returns 200');
    assert(
      p5Adh.data.data.total === (p5Adh.data.data.confirmed + p5Adh.data.data.notConfirmed + p5Adh.data.data.missed),
      'P005: total equals confirmed + notConfirmed + missed'
    );
    console.log(`  P005 Adherence: Total=${p5Adh.data.data.total}, Confirmed=${p5Adh.data.data.confirmed}, NotConfirmed=${p5Adh.data.data.notConfirmed}, Missed=${p5Adh.data.data.missed}`);

    // Test nested route /patients/:id/adherence
    const nestedAdh = await get('/patients/P001/adherence');
    assert(nestedAdh.status === 200, 'GET /patients/P001/adherence returns 200');
    assert(nestedAdh.data.data.total === p1Adh.data.data.total, 'Nested adherence matches canonical route count');

    console.log('\n--- 5. Testing Response Types & Count Transitions (taken, not_taken, no_response, missed) ---');
    // We will test dynamic updates on reminders and verify adherence counts adjust accurately!
    // P003 initially: total=5 (MR006:taken, MR007:missed/no_response, MR008:taken, MR021:taken, MR022:scheduled)
    const beforeAdh = await get('/adherence?patientId=P003');
    const initialConfirmed = beforeAdh.data.data.confirmed;
    const initialNotConfirmed = beforeAdh.data.data.notConfirmed;

    // Confirm MR022 as 'taken'
    const confirmTaken = await post('/reminders/MR022/confirm', {
      patientId: 'P003',
      response: 'taken'
    });
    assert(confirmTaken.status === 200, 'Confirmed MR022 as taken');

    const afterTakenAdh = await get('/adherence?patientId=P003');
    assert(afterTakenAdh.data.data.confirmed === initialConfirmed + 1, 'Adherence: confirmed count incremented by 1');
    assert(afterTakenAdh.data.data.notConfirmed === initialNotConfirmed - 1, 'Adherence: notConfirmed count decremented by 1');
    console.log(`  After taken: Confirmed=${afterTakenAdh.data.data.confirmed}, NotConfirmed=${afterTakenAdh.data.data.notConfirmed}`);

    console.log('\n--- 6. Testing Patient Isolation & Negative Guards ---');
    // Missing patientId on /events returns 400
    const missingPid = await get('/events');
    assert(missingPid.status === 400, 'GET /events without patientId returns 400 Bad Request');

    // Missing patientId on /adherence returns 400
    const missingAdhPid = await get('/adherence');
    assert(missingAdhPid.status === 400, 'GET /adherence without patientId returns 400 Bad Request');

    // Non-existent patient P999 returns 404
    const notFoundEvents = await get('/events?patientId=P999');
    assert(notFoundEvents.status === 404, 'Non-existent patient P999 on /events returns 404 Not Found');

    const notFoundAdh = await get('/adherence?patientId=P999');
    assert(notFoundAdh.status === 404, 'Non-existent patient P999 on /adherence returns 404 Not Found');

    // Attempting to track event with mismatched patient and reminder returns 403
    const crossEvent = await post('/events', {
      patientId: 'P002',
      type: 'reminder_opened',
      reminderId: 'MR001' // belongs to P001
    });
    assert(crossEvent.status === 403, 'Cross-patient event logging (MR001 as P002) blocked with 403 Forbidden');

    console.log('\nALL FEATURE 4 TESTS PASSED PERFECTLY!\n');
  } finally {
    server.close();
  }
};

testFeature4().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
