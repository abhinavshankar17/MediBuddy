/**
 * Comprehensive Automated Test Suite for Medication Reminder Notification Workflow
 * 
 * Verifies:
 * - Deterministic time logic (+10m follow-up, +25m simulated call & caregiver notification)
 * - Patient swipe (confirm) immediately stops future notifications
 * - Event history and timeline preservation
 * - Idempotency and duplicate prevention across multiple runs
 * - Designated caregiver lookup
 * - Semantic wording adherence (no medical escalation vocabulary)
 */

const assert = require('assert');
const notificationService = require('./services/notification.service');
const reminderService = require('./services/reminder.service');
const dataStore = require('./services/dataStore');

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Starting Medication Reminder Notification Workflow Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // Helper to assert condition with message
  function test(name, fn) {
    return async () => {
      try {
        await fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
      } catch (err) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Error: ${err.message}`);
        failed++;
      }
    };
  }

  // TEST 1: Patient swipes before 10 min (+5 min)
  await test('Test 1: Medication due -> Patient swipes at +5m -> No followup/call/caregiver notifications', async () => {
    const scheduledTime = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
    const reminderId = `TEST_REMINDER_T1_${Date.now()}`;
    const patientId = 'P001';

    // 1. Create reminder
    await dataStore.addReminder({
      _id: reminderId,
      patientId,
      medicationName: 'Paracetamol',
      dose: '500 mg',
      scheduledAt: scheduledTime,
      status: 'scheduled',
      notificationState: {}
    });

    // 2. Patient swipes to confirm taken at +5m
    await reminderService.confirmMedication(reminderId, {
      patientId,
      response: 'taken',
      note: 'Swiped on device'
    });

    // 3. Run notification processor at current time (+5m) and even later (+15m, +30m)
    const futureTime = new Date(new Date(scheduledTime).getTime() + 30 * 60 * 1000);
    await notificationService.processMedicationReminderNotifications({
      currentTime: futureTime,
      patientId
    });

    // 4. Verify no notifications were generated for this reminder
    const notifs = await dataStore.getNotifications({ reminderId });
    assert.strictEqual(notifs.length, 0, 'Should have 0 notifications since patient swiped');

    const reminder = await dataStore.getReminderById(reminderId);
    assert.strictEqual(reminder.status, 'taken', 'Reminder status should be taken');
  })();

  // TEST 2: Medication due -> No swipe -> +10 minutes
  await test('Test 2: Medication due -> No swipe at +10m -> Patient follow-up notification sent', async () => {
    const scheduledTime = '2026-10-08T10:00:00.000Z';
    const checkTime = '2026-10-08T10:10:01.000Z'; // +10m
    const reminderId = `TEST_REMINDER_T2_${Date.now()}`;
    const patientId = 'P001';

    await dataStore.addReminder({
      _id: reminderId,
      patientId,
      medicationName: 'Paracetamol',
      dose: '500 mg',
      scheduledAt: scheduledTime,
      status: 'scheduled',
      notificationState: {}
    });

    // Run processor at +10 min
    await notificationService.processMedicationReminderNotifications({
      currentTime: checkTime,
      patientId
    });

    const notifs = await dataStore.getNotifications({ reminderId });
    assert.strictEqual(notifs.length, 1, 'Should have 1 notification at +10m');
    assert.strictEqual(notifs[0].type, 'medication_followup', 'Notification type must be medication_followup');
    assert.strictEqual(notifs[0].recipientId, patientId, 'Recipient must be patient');
    assert.ok(notifs[0].title.includes('Medication Reminder'), 'Title should be Medication Reminder');
    assert.ok(notifs[0].message.includes('has not been confirmed'), 'Message must state reminder has not been confirmed');

    // Forbidden wording checks
    const lowerMessage = notifs[0].message.toLowerCase();
    assert.ok(!lowerMessage.includes('medical escalation'), 'Must NOT contain medical escalation');
    assert.ok(!lowerMessage.includes('clinical alert'), 'Must NOT contain clinical alert');
    assert.ok(!lowerMessage.includes('emergency'), 'Must NOT contain emergency');
    assert.ok(!lowerMessage.includes('missed your medication'), 'Must NOT say missed your medication');
    assert.ok(!lowerMessage.includes('medication failure'), 'Must NOT say medication failure');
  })();

  // TEST 3: Medication due -> No swipe -> +25 minutes
  await test('Test 3: Medication due -> No swipe at +25m -> Simulated call event + Patient call notif + Caregiver notif', async () => {
    const scheduledTime = '2026-10-08T10:00:00.000Z';
    const checkTime = '2026-10-08T10:25:01.000Z'; // +25m
    const reminderId = `TEST_REMINDER_T3_${Date.now()}`;
    const patientId = 'P001'; // P001 caregiver is U101 (Meena Krishnan)

    await dataStore.addReminder({
      _id: reminderId,
      patientId,
      medicationName: 'Paracetamol',
      dose: '500 mg',
      scheduledAt: scheduledTime,
      status: 'scheduled',
      notificationState: {}
    });

    // Process at +25 min
    await notificationService.processMedicationReminderNotifications({
      currentTime: checkTime,
      patientId
    });

    const notifs = await dataStore.getNotifications({ reminderId });
    // Should have follow-up (+10m), patient call (+25m), and caregiver (+25m)
    const patientFollowUp = notifs.find(n => n.type === 'medication_followup');
    const patientCall = notifs.find(n => n.type === 'simulated_call');
    const caregiverNotif = notifs.find(n => n.type === 'caregiver_medication_notification');

    assert.ok(patientFollowUp, 'Must have patient followup notification');
    assert.ok(patientCall, 'Must have patient simulated call notification');
    assert.ok(caregiverNotif, 'Must have caregiver notification');

    assert.strictEqual(caregiverNotif.recipientId, 'U101', 'Caregiver recipient must be U101');
    assert.ok(patientCall.message.includes('Simulated call — not answered'), 'Patient call must mention Simulated call — not answered');
    assert.ok(caregiverNotif.message.includes('Demo notification — no real call was placed'), 'Caregiver notif must clarify demo');

    // Verify simulated call event in event log
    const allEvents = await dataStore.getEvents(patientId);
    const callEvent = allEvents.find(e => e.reminderId === reminderId && e.type === 'simulated_call_attempt');
    assert.ok(callEvent, 'Simulated call event must be recorded in timeline');
    assert.strictEqual(callEvent.payload.result, 'no_answer', 'Call result must be no_answer');
    assert.strictEqual(callEvent.payload.demo, true, 'Call payload demo must be true');
  })();

  // TEST 4: Medication due -> No swipe -> +10 notification -> Swipe at +18m
  await test('Test 4: +10m notification sent -> Patient swipes at +18m -> No +25m call or caregiver notification', async () => {
    const scheduledTime = '2026-10-08T10:00:00.000Z';
    const reminderId = `TEST_REMINDER_T4_${Date.now()}`;
    const patientId = 'P001';

    await dataStore.addReminder({
      _id: reminderId,
      patientId,
      medicationName: 'Paracetamol',
      dose: '500 mg',
      scheduledAt: scheduledTime,
      status: 'scheduled',
      notificationState: {}
    });

    // Step A: +10 min notification
    await notificationService.processMedicationReminderNotifications({
      currentTime: '2026-10-08T10:10:01.000Z',
      patientId
    });

    let notifs = await dataStore.getNotifications({ reminderId });
    assert.strictEqual(notifs.length, 1, 'Only 1 notif at +10m');

    // Step B: Patient swipes at +18 min
    await reminderService.confirmMedication(reminderId, {
      patientId,
      response: 'taken',
      respondedAt: '2026-10-08T10:18:00.000Z'
    });

    // Step C: Worker runs at +25 min and +30 min
    await notificationService.processMedicationReminderNotifications({
      currentTime: '2026-10-08T10:25:01.000Z',
      patientId
    });
    await notificationService.processMedicationReminderNotifications({
      currentTime: '2026-10-08T10:30:00.000Z',
      patientId
    });

    // Verify no new notifications were created
    notifs = await dataStore.getNotifications({ reminderId });
    assert.strictEqual(notifs.length, 1, 'Still only 1 notification (no call, no caregiver notif)');
    assert.strictEqual(notifs[0].type, 'medication_followup');
  })();

  // TEST 5: Patient swipes AFTER caregiver notification (+30m) -> history preserved
  await test('Test 5: Patient swipes at +30m after caregiver notification -> Status updated to taken & history preserved', async () => {
    const scheduledTime = '2026-10-08T10:00:00.000Z';
    const reminderId = `TEST_REMINDER_T5_${Date.now()}`;
    const patientId = 'P001';

    await dataStore.addReminder({
      _id: reminderId,
      patientId,
      medicationName: 'Paracetamol',
      dose: '500 mg',
      scheduledAt: scheduledTime,
      status: 'scheduled',
      notificationState: {}
    });

    // Run at +25m to trigger all notifications
    await notificationService.processMedicationReminderNotifications({
      currentTime: '2026-10-08T10:25:01.000Z',
      patientId
    });

    const notifsBeforeSwipe = await dataStore.getNotifications({ reminderId });
    assert.strictEqual(notifsBeforeSwipe.length, 3, 'Must have 3 notifications before swipe');

    // Patient swipes at +30m
    await reminderService.confirmMedication(reminderId, {
      patientId,
      response: 'taken',
      respondedAt: '2026-10-08T10:30:00.000Z'
    });

    // Run worker again at +35m
    await notificationService.processMedicationReminderNotifications({
      currentTime: '2026-10-08T10:35:00.000Z',
      patientId
    });

    // Verify history is intact
    const notifsAfterSwipe = await dataStore.getNotifications({ reminderId });
    assert.strictEqual(notifsAfterSwipe.length, 3, 'History of 3 notifications must be fully preserved');

    const reminder = await dataStore.getReminderById(reminderId);
    assert.strictEqual(reminder.status, 'taken', 'Reminder status must be taken');
  })();

  // TEST 6: Duplicate Prevention / Idempotency
  await test('Test 6: Worker runs repeatedly -> Exactly ONE notification per threshold (no duplicates)', async () => {
    const scheduledTime = '2026-10-08T10:00:00.000Z';
    const reminderId = `TEST_REMINDER_T6_${Date.now()}`;
    const patientId = 'P001';

    await dataStore.addReminder({
      _id: reminderId,
      patientId,
      medicationName: 'Paracetamol',
      dose: '500 mg',
      scheduledAt: scheduledTime,
      status: 'scheduled',
      notificationState: {}
    });

    // Run 5 times between +10m and +15m
    for (let m = 10; m <= 15; m++) {
      await notificationService.processMedicationReminderNotifications({
        currentTime: `2026-10-08T10:${m}:00.000Z`,
        patientId
      });
    }

    let notifs = await dataStore.getNotifications({ reminderId });
    const followUps = notifs.filter(n => n.type === 'medication_followup');
    assert.strictEqual(followUps.length, 1, 'Must have exactly 1 follow-up notification despite repeated worker runs');

    // Run 5 times between +25m and +30m
    for (let m = 25; m <= 30; m++) {
      await notificationService.processMedicationReminderNotifications({
        currentTime: `2026-10-08T10:${m}:00.000Z`,
        patientId
      });
    }

    notifs = await dataStore.getNotifications({ reminderId });
    const patientCalls = notifs.filter(n => n.type === 'simulated_call');
    const caregiverNotifs = notifs.filter(n => n.type === 'caregiver_medication_notification');

    assert.strictEqual(patientCalls.length, 1, 'Must have exactly 1 simulated call notification');
    assert.strictEqual(caregiverNotifs.length, 1, 'Must have exactly 1 caregiver notification');
  })();

  console.log('\n====================================================');
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
