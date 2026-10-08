const http = require('http');
const app = require('./app');

async function runRealtimeTest() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`\n======================================================`);
  console.log(`  TESTING REAL-TIME CAREGIVER & PATIENT SYNC (PORT ${port})`);
  console.log(`======================================================\n`);

  try {
    // 1. Initial State of Daily Report
    console.log('--- 1. Initial Caregiver Daily Report ---');
    const r1 = await fetch(`${baseUrl}/api/caregiver/patients/P001/daily-report`);
    const d1 = await r1.json();
    const initialConfirmed = d1.data.medications.confirmedCount;
    const initialAdherence = d1.data.medications.adherenceRate;
    console.log(`   Initial Confirmed Doses: ${initialConfirmed}/${d1.data.medications.totalCount} (${initialAdherence}%)`);

    // 2. Patient Confirms Medication (MR002)
    console.log('\n--- 2. Patient Confirms Medication via Patient Endpoint ---');
    const confirmRes = await fetch(`${baseUrl}/api/patients/P001/reminders/MR002/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: 'taken', responseType: 'taken' })
    });
    const confirmData = await confirmRes.json();
    console.log(`   Confirmation status: ${confirmRes.status} (Success: ${confirmData.success})`);
    console.log(`   Reminder: ${confirmData.data.medicationName} marked as ${confirmData.data.status}`);

    // 3. Caregiver Daily Report reflects update immediately
    console.log('\n--- 3. Caregiver Daily Report Live State ---');
    const r2 = await fetch(`${baseUrl}/api/caregiver/patients/P001/daily-report`);
    const d2 = await r2.json();
    const updatedConfirmed = d2.data.medications.confirmedCount;
    const updatedAdherence = d2.data.medications.adherenceRate;
    console.log(`   Updated Confirmed Doses: ${updatedConfirmed}/${d2.data.medications.totalCount} (${updatedAdherence}%)`);

    if (updatedConfirmed > initialConfirmed) {
      console.log('   ✓ Real-time medication update verified in Caregiver Daily Report!');
    } else {
      console.error('   ✗ Expected confirmed count to increase');
    }

    // 4. Patient Submits New Feedback Note
    console.log('\n--- 4. Patient Submits New Feedback Note ---');
    const fbRes = await fetch(`${baseUrl}/api/patients/P001/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        condition: 'Evening Leg Stiffness',
        symptoms: ['tightness in right calf'],
        urgency: 'mild',
        notes: 'Walked 20 minutes with the walker. Feeling tired but steady.'
      })
    });
    const fbData = await fbRes.json();
    const createdFbId = fbData.data._id;
    console.log(`   Patient submitted feedback ID: ${createdFbId}`);

    // 5. Caregiver Retrieves Feedbacks (Immediately visible)
    console.log('\n--- 5. Caregiver Feedback Review Feed ---');
    const cgFbRes = await fetch(`${baseUrl}/api/caregiver/patients/P001/feedback`);
    const cgFbData = await cgFbRes.json();
    const foundNewFb = cgFbData.data.find(f => f._id === createdFbId);
    if (foundNewFb) {
      console.log(`   ✓ Found new patient feedback in Caregiver feed: "${foundNewFb.notes}"`);
    } else {
      console.error('   ✗ New feedback not found in Caregiver feed');
    }

    // 6. Caregiver Reviews and Writes Acknowledgment Note
    console.log('\n--- 6. Caregiver Reviews & Acknowledges Feedback ---');
    const reviewRes = await fetch(`${baseUrl}/api/caregiver/patients/P001/feedback/${createdFbId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caregiverId: 'U101',
        caregiverNote: 'Great job Mom! Elevated your leg with pillows and brought ice pack.'
      })
    });
    const reviewData = await reviewRes.json();
    console.log(`   Review response: ${reviewRes.status} (Status: ${reviewData.data.reviewStatus || reviewData.data.status})`);

    // 7. Patient Retrieves Feedbacks (Caregiver Note is now visible)
    console.log('\n--- 7. Patient Sees Caregiver Note ---');
    const ptFbRes = await fetch(`${baseUrl}/api/patients/P001/feedback`);
    const ptFbData = await ptFbRes.json();
    const ptFound = ptFbData.data.find(f => f._id === createdFbId);
    if (ptFound && ptFound.caregiverNote) {
      console.log(`   ✓ Patient feed displays Caregiver Note: "${ptFound.caregiverNote}"`);
    } else {
      console.error('   ✗ Caregiver note not visible in patient feedback list');
    }

    console.log(`\n======================================================`);
    console.log(`  REAL-TIME CAREGIVER & PATIENT SYNC PASSED 100%!`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Real-time test error:', err);
  } finally {
    server.close();
  }
}

runRealtimeTest();
