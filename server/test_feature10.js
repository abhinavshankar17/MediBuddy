const assert = require('assert');
const http = require('http');
const app = require('./app');
const { escalationService, dataStore } = require('./services');

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

  console.log(`Starting Feature 10 test suite on port ${port}...\n`);

  try {
    // ==========================================
    // 1. Preserve All Existing Escalation Categories
    // ==========================================
    console.log('1. Testing Preservation of All Existing Escalation Categories...');
    const allRes = await request('/api/escalations');
    assert.strictEqual(allRes.status, 200, 'GET /api/escalations should return 200');
    assert.strictEqual(allRes.body.success, true);
    const escalations = allRes.body.data;
    assert.ok(Array.isArray(escalations), 'Response data must be an array');
    assert.ok(escalations.length >= 5, 'Must contain at least the 5 mock escalations');

    const categoriesFound = new Set(escalations.map(e => e.category));
    const expectedExisting = [
      'warning_sign',
      'missed_medication',
      'missing_information',
      'overdue_task',
      'medication_question'
    ];

    for (const cat of expectedExisting) {
      assert.ok(categoriesFound.has(cat), `Existing category '${cat}' must be preserved`);
    }
    console.log(`   ✓ All 5 existing categories preserved: ${expectedExisting.join(', ')}`);

    // ==========================================
    // 2. Escalation Response Structure Verification
    // ==========================================
    console.log('\n2. Testing Escalation Response Structure...');
    for (const esc of escalations) {
      assert.ok(esc.patient, 'Response must have patient');
      assert.ok(esc.patient._id, 'Patient object must have _id');
      assert.strictEqual(typeof esc.category, 'string', 'Category must be string');
      assert.strictEqual(typeof esc.description, 'string', 'Description must be string');
      assert.ok(esc.timestamp, 'Timestamp must be present');
      assert.ok(['OPEN', 'IN_REVIEW', 'RESOLVED'].includes(esc.status), 'Status must be valid enum');
      assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(esc.priority), 'Priority must be LOW/MEDIUM/HIGH');
      assert.ok(esc.relatedEvent, `Escalation ${esc._id} must have relatedEvent`);
      // Verify related event belongs to the same patient
      if (esc.relatedEvent.patientId) {
        assert.strictEqual(esc.relatedEvent.patientId, esc.patient._id, 'Related event must belong to the same patient');
      }
    }
    console.log('   ✓ All escalations return required fields: patient, category, description, timestamp, status, priority, relatedEvent');

    // ==========================================
    // 3. Support Newer Escalation Categories
    // ==========================================
    console.log('\n3. Testing Support for Newer Escalation Categories...');
    const newerCategories = [
      {
        category: 'repeated_missed_medication',
        patientId: 'P005',
        description: 'Patient missed morning Metformin on multiple consecutive days.',
        priority: 'HIGH'
      },
      {
        category: 'low_quiz_score',
        patientId: 'P005',
        description: 'Patient scored 40% on daily recovery quiz. Knowledge reinforcement needed.',
        priority: 'HIGH'
      },
      {
        category: 'knowledge_gap',
        patientId: 'P001',
        description: 'Patient showed knowledge gap on walker mobility aid usage.',
        priority: 'MEDIUM'
      }
    ];

    for (const newCat of newerCategories) {
      const createRes = await request('/api/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat)
      });
      assert.strictEqual(createRes.status, 201, `Creation with category '${newCat.category}' should return 201`);
      assert.strictEqual(createRes.body.data.category, newCat.category);
      assert.strictEqual(createRes.body.data.patient._id, newCat.patientId);
      assert.strictEqual(createRes.body.data.description, newCat.description);
      assert.strictEqual(createRes.body.data.priority, newCat.priority);
    }
    console.log('   ✓ Supported newer categories: repeated_missed_medication, low_quiz_score, knowledge_gap');

    // ==========================================
    // 4. Grounding: Actual Events/Data Evaluation
    // ==========================================
    console.log('\n4. Testing Grounded Escalation Evaluation from Actual Data...');
    // Evaluate P005 who has 2 missed doses and 40% quiz score
    const evalRes = await request('/api/escalations/evaluate/P005', { method: 'POST' });
    assert.strictEqual(evalRes.status, 200, 'Evaluation for P005 should return 200');
    assert.strictEqual(evalRes.body.data.patientId, 'P005');
    const p5Escs = evalRes.body.data.escalations;
    assert.ok(p5Escs.length > 0, 'P005 should have detected escalations');
    const p5Cats = p5Escs.map(e => e.category);
    assert.ok(p5Cats.includes('missed_medication') || p5Cats.includes('repeated_missed_medication'), 'Must identify missed medication from actual records');
    assert.ok(p5Cats.includes('low_quiz_score'), 'Must identify low quiz score (40%) from actual records');
    console.log('   ✓ P005 correctly detected grounded escalations from actual records (missed medication & low quiz score)');

    // ==========================================
    // 5. Cross-Patient Evidence Verification
    // ==========================================
    console.log('\n5. Testing Cross-Patient Event Verification (Anti-Leakage)...');
    // Attempt to associate P001 escalation with P002's event E002
    const crossRes = await request('/api/escalations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'P001',
        category: 'missed_medication',
        description: 'Patient missed scheduled dose.',
        priority: 'MEDIUM',
        relatedEventId: 'E002' // belongs to P002!
      })
    });
    assert.strictEqual(crossRes.status, 400, 'Associating event from another patient must be rejected with 400');
    assert.ok(crossRes.body.message.includes('does not belong to patient'), 'Must explain foreign event mismatch');
    console.log('   ✓ Cross-patient event attachment strictly blocked with 400');

    // Attach legitimate P001 event E107
    const legitRes = await request('/api/escalations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'P001',
        category: 'missed_medication',
        description: 'Patient missed evening Paracetamol dose.',
        priority: 'MEDIUM',
        relatedEventId: 'E107'
      })
    });
    assert.strictEqual(legitRes.status, 201, 'Attaching legitimate patient event must succeed with 201');
    assert.strictEqual(legitRes.body.data.relatedEvent._id, 'E107');
    console.log('   ✓ Legitimate event E107 correctly linked to P001 escalation');

    // ==========================================
    // 6. Critical Safety Rules Enforcement
    // ==========================================
    console.log('\n6. Testing AI & Clinical Safety Boundaries...');
    // Rule: Do not turn missed medication into a diagnosis
    const diagRes = await request('/api/escalations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'P001',
        category: 'missed_medication',
        description: 'Diagnosis: Patient exhibits chronic medication non-compliance pathology.',
        priority: 'MEDIUM'
      })
    });
    assert.strictEqual(diagRes.status, 400, 'Diagnoses in escalations must be rejected with 400');
    assert.ok(diagRes.body.message.includes('Escalation Safety Violation'));
    console.log('   ✓ Clinical diagnosis strictly rejected with 400');

    // Rule: Do not prescribe or modify medication
    const rxRes = await request('/api/escalations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'P001',
        category: 'missed_medication',
        description: 'Prescribe 500mg Amoxicillin to replace missed dose.',
        priority: 'MEDIUM'
      })
    });
    assert.strictEqual(rxRes.status, 400, 'Prescriptions in escalations must be rejected with 400');
    assert.ok(rxRes.body.message.includes('Escalation Safety Violation'));
    console.log('   ✓ Prescriptions strictly rejected with 400');

    // Rule: Do not create emergency classifications unless supported
    const emergPrioRes = await request('/api/escalations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'P001',
        category: 'missed_medication',
        description: 'Patient missed dose.',
        priority: 'EMERGENCY'
      })
    });
    assert.strictEqual(emergPrioRes.status, 400, 'Unsupported priority EMERGENCY must be rejected with 400');
    assert.ok(emergPrioRes.body.message.includes('Emergency classifications are strictly prohibited'));
    console.log('   ✓ Emergency priority classification strictly rejected with 400');

    const emergTextRes = await request('/api/escalations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'P001',
        category: 'warning_sign',
        description: 'Emergency classification: code blue ICU admission required.',
        priority: 'HIGH'
      })
    });
    assert.strictEqual(emergTextRes.status, 400, 'Unsupported emergency classification text must be rejected with 400');
    assert.ok(emergTextRes.body.message.includes('Escalation Safety Violation'));
    console.log('   ✓ Emergency classification description strictly rejected with 400');

    // ==========================================
    // 7. Patient Isolation & Scoped Retrieval
    // ==========================================
    console.log('\n7. Testing Patient Scoped Retrieval & Isolation...');
    const p1EscRes = await request('/api/patients/P001/escalations');
    assert.strictEqual(p1EscRes.status, 200);
    for (const esc of p1EscRes.body.data) {
      assert.strictEqual(esc.patientId, 'P001', 'All returned escalations must belong to P001');
      assert.strictEqual(esc.patient._id, 'P001');
    }

    const p3EscRes = await request('/api/escalations/patient/P003');
    assert.strictEqual(p3EscRes.status, 200);
    for (const esc of p3EscRes.body.data) {
      assert.strictEqual(esc.patientId, 'P003', 'All returned escalations must belong to P003');
      assert.strictEqual(esc.patient._id, 'P003');
    }
    console.log('   ✓ Patient isolation strictly verified for /api/patients/:id/escalations and /api/escalations/patient/:id');

    // ==========================================
    // 8. Escalation Update & Lifecycle
    // ==========================================
    console.log('\n8. Testing Escalation Status & Resolution Updates...');
    const updateRes = await request('/api/escalations/ESC001', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'IN_REVIEW',
        resolution: 'Nurse contacted patient to verify current breathing status.'
      })
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.data.status, 'IN_REVIEW');
    assert.strictEqual(updateRes.body.data.resolution, 'Nurse contacted patient to verify current breathing status.');

    // Invalid status test
    const badStatusRes = await request('/api/escalations/ESC001', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INVALID_STATUS' })
    });
    assert.strictEqual(badStatusRes.status, 400);
    console.log('   ✓ Escalation status update to IN_REVIEW succeeded; invalid status rejected with 400');

    // ==========================================
    // 9. Error Handling & Edge Cases
    // ==========================================
    console.log('\n9. Testing Error Handling & Edge Cases...');
    const notFoundEsc = await request('/api/escalations/ESC99999');
    assert.strictEqual(notFoundEsc.status, 404, 'Non-existent escalation should return 404');

    const notFoundPat = await request('/api/escalations/patient/P999');
    assert.strictEqual(notFoundPat.status, 404, 'Non-existent patient should return 404');

    const invalidCatRes = await request('/api/escalations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'P001',
        category: 'unsupported_category_xyz',
        description: 'Test description.'
      })
    });
    assert.strictEqual(invalidCatRes.status, 400, 'Invalid category must return 400');
    console.log('   ✓ 404 and 400 error handling verified');

    console.log('\n==========================================');
    console.log('ALL FEATURE 10 TESTS PASSED SUCCESSFULLY!');
    console.log('==========================================\n');
  } finally {
    server.close();
  }
};

runTests().catch(err => {
  console.error('Feature 10 Test Suite Failed:', err);
  process.exit(1);
});
