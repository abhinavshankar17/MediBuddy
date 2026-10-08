const http = require('http');
const app = require('./app');

const testPatientData = async () => {
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
    // 1. Health check still works
    const health = await get('/health');
    assert(health.status === 200 && health.data.data.status === 'ok', 'Health check still operational');

    // Test patients: P001, P002, P005, P003, P008
    const testPatients = ['P001', 'P002', 'P005', 'P003', 'P008'];

    for (const patientId of testPatients) {
      console.log(`\n--- Testing Patient ${patientId} ---`);

      // 2. Patient Profile
      const profileRes = await get(`/patients/${patientId}`);
      assert(profileRes.status === 200, `${patientId} profile status 200`);
      assert(profileRes.data.data._id === patientId, `${patientId} profile matches requested ID`);
      assert(profileRes.data.data.name !== undefined, `${patientId} has name: ${profileRes.data.data.name}`);
      assert(profileRes.data.data.condition !== undefined, `${patientId} has condition: ${profileRes.data.data.condition}`);

      // 3. Recovery Information
      const recoveryRes = await get(`/patients/${patientId}/recovery`);
      assert(recoveryRes.status === 200, `${patientId} recovery status 200`);
      assert(recoveryRes.data.data.patientId === patientId, `${patientId} recovery strictly isolated`);
      assert(recoveryRes.data.data.recoveryPhase !== undefined, `${patientId} recoveryPhase present`);
      assert(recoveryRes.data.data.procedure !== undefined, `${patientId} procedure present`);

      // 4. Tasks (isolated by patient)
      const tasksRes = await get(`/patients/${patientId}/tasks`);
      assert(tasksRes.status === 200, `${patientId} tasks status 200`);
      assert(Array.isArray(tasksRes.data.data), `${patientId} tasks is array`);
      assert(tasksRes.data.data.every(t => t.patientId === patientId), `${patientId} ALL tasks belong to this patient`);
      console.log(`  Found ${tasksRes.data.data.length} tasks for ${patientId}`);

      // 5. Tasks via /tasks?patientId=...
      const tasksQueryRes = await get(`/tasks?patientId=${patientId}`);
      assert(tasksQueryRes.status === 200, `${patientId} query tasks status 200`);
      assert(tasksQueryRes.data.data.every(t => t.patientId === patientId), `${patientId} query tasks strictly isolated`);

      // 6. Discharge Document
      const docRes = await get(`/patients/${patientId}/document`);
      assert(docRes.status === 200, `${patientId} document status 200`);
      assert(docRes.data.data.patientId === patientId, `${patientId} document matches patientId`);
      assert(docRes.data.data.rawText && docRes.data.data.rawText.length > 0, `${patientId} document contains rawText`);
      assert(docRes.data.data.doctorName !== undefined, `${patientId} doctorName: ${docRes.data.data.doctorName}`);

      // Document via /documents/patient/:patientId
      const docByPatientRes = await get(`/documents/patient/${patientId}`);
      assert(docByPatientRes.status === 200, `${patientId} document via /documents/patient/ status 200`);
      assert(docByPatientRes.data.data.patientId === patientId, `${patientId} document isolation confirmed`);

      // 7. Verified Extracted Instructions
      const instrRes = await get(`/patients/${patientId}/instructions`);
      assert(instrRes.status === 200, `${patientId} instructions status 200`);
      assert(instrRes.data.data.patientId === patientId, `${patientId} instructions isolated`);
      assert(Array.isArray(instrRes.data.data.instructions), `${patientId} instructions is array`);
      assert(instrRes.data.data.instructions.every(i => i.patientId === patientId), `${patientId} ALL instructions belong to this patient`);
      
      const { categories } = instrRes.data.data;
      console.log(`  Instructions: ${instrRes.data.data.totalInstructions} total (Medications: ${categories.medications.length}, Activities: ${categories.activities.length}, Warnings: ${categories.warningSigns.length}, Follow-ups: ${categories.followUps.length})`);

      // Verify instruction structure fields
      if (categories.medications.length > 0) {
        const med = categories.medications[0];
        assert(med.name && (med.dose || med.frequency || med.foodRelation || med.sourceSentence), `${patientId} medication structure contains clinical attributes`);
      }

      // 8. Full Discharge Summary Package
      const summaryRes = await get(`/patients/${patientId}/discharge-summary`);
      assert(summaryRes.status === 200, `${patientId} discharge-summary status 200`);
      assert(summaryRes.data.data.patientId === patientId, `${patientId} discharge-summary isolated`);
      assert(summaryRes.data.data.document._id === docRes.data.data._id, `${patientId} discharge summary document matches`);
      assert(summaryRes.data.data.instructions.length === instrRes.data.data.instructions.length, `${patientId} instructions count matches`);
    }

    // --- Strict Isolation and Negative Cases ---
    console.log('\n--- Testing Strict Patient Isolation & Negative Cases ---');

    // Non-existent patient returns 404
    const notFound = await get('/patients/P999');
    assert(notFound.status === 404, 'Non-existent patient P999 returns 404');

    const notFoundRecovery = await get('/patients/P999/recovery');
    assert(notFoundRecovery.status === 404, 'Non-existent patient P999/recovery returns 404');

    const notFoundDoc = await get('/patients/P999/document');
    assert(notFoundDoc.status === 404, 'Non-existent patient P999/document returns 404');

    const notFoundTasks = await get('/patients/P999/tasks');
    assert(notFoundTasks.status === 404, 'Non-existent patient P999/tasks returns 404');

    // /tasks without patientId query returns 400
    const badTasks = await get('/tasks');
    assert(badTasks.status === 400, 'GET /tasks without patientId returns 400 Bad Request for patient isolation');

    // Cross-patient document access prevention: document D001 belongs to P001, queried with patientId=P002 should fail
    const crossDoc = await get('/documents/D001?patientId=P002');
    assert(crossDoc.status === 404, 'Cross-patient document query (D001 with patientId=P002) blocked (404)');

    console.log('\nALL FEATURE 2 TESTS PASSED PERFECTLY!\n');
  } finally {
    server.close();
  }
};

testPatientData().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
