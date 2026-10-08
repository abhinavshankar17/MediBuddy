/**
 * Test suite to verify that Caregiver Encouragements sent to a patient
 * are immediately and accurately reflected on patient endpoints.
 */
const http = require('http');

async function testEncouragementSync() {
  console.log('======================================================');
  console.log('  TESTING CAREGIVER ENCOURAGEMENT & PATIENT SYNC');
  console.log('======================================================');

  const baseUrl = 'http://localhost:5000';

  // 1. Initial Patient Encouragements
  console.log('\n--- 1. Initial Patient Encouragements Fetch ---');
  const res1 = await fetch(`${baseUrl}/api/patients/P001/encouragement`);
  const data1 = await res1.json();
  console.log(`   Initial count for P001: ${data1.data ? data1.data.length : 0}`);

  // 2. Caregiver Sends New Encouragement Note
  console.log('\n--- 2. Caregiver Sends New Encouragement Note ---');
  const sendRes = await fetch(`${baseUrl}/api/caregiver/patients/P001/encouragement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caregiverId: 'U101',
      caregiverName: 'Priya Krishnan (Daughter)',
      message: 'Keep going Mom! Your knee mobility is getting better every day. We love you!',
      tag: 'love'
    })
  });
  const sendData = await sendRes.json();
  console.log(`   Send response status: ${sendRes.status} (Success: ${sendData.success})`);
  console.log(`   Message ID: ${sendData.data?._id}`);
  console.log(`   Message Text: "${sendData.data?.message}"`);

  // 3. Patient Portal Retrieves Encouragements
  console.log('\n--- 3. Patient Portal Checks Encouragement Feed ---');
  const res2 = await fetch(`${baseUrl}/api/patients/P001/encouragement`);
  const data2 = await res2.json();
  const found = data2.data?.find(e => e._id === sendData.data?._id);

  if (found) {
    console.log(`   ✓ Found new message in Patient Feed!`);
    console.log(`   ✓ From: ${found.caregiverName}`);
    console.log(`   ✓ Tag: ${found.tag}`);
    console.log(`   ✓ Note: "${found.message}"`);
  } else {
    console.error('   ✗ Encouragement not found in patient feed!');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('  CAREGIVER ENCOURAGEMENT SYNC PASSED 100%!');
  console.log('======================================================\n');
}

testEncouragementSync().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
