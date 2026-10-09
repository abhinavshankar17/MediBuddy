// Test script to verify multilingual APIs and dynamic localized AI content
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Multilingual Backend API Verification ---');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${message}`);
    }
  }

  try {
    // 1. Get initial patient language
    console.log('\n[Test 1] GET /api/patients/P001/language');
    const resGetLang = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/patients/P001/language',
      method: 'GET'
    });
    assert(resGetLang.status === 200, `Status is 200 (got ${resGetLang.status})`);
    assert(resGetLang.body.success === true, 'Success flag is true');
    const getLangData = resGetLang.body.data || resGetLang.body;
    assert(Array.isArray(getLangData.availableLanguages), 'availableLanguages is an array');
    assert(getLangData.availableLanguages.includes('hi') && getLangData.availableLanguages.includes('ta'), 'Supports hi and ta');

    // 2. Update language to Hindi ('hi')
    console.log('\n[Test 2] PUT /api/patients/P001/language -> hi');
    const resPutHi = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/patients/P001/language',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { language: 'hi' });
    assert(resPutHi.status === 200, `Status is 200 (got ${resPutHi.status})`);
    const putHiData = resPutHi.body.data || resPutHi.body;
    assert(putHiData.language === 'hi', `Language is now 'hi' (got ${putHiData.language})`);

    // 3. Test invalid language validation
    console.log('\n[Test 3] PUT /api/patients/P001/language with invalid language -> fr');
    const resPutInvalid = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/patients/P001/language',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { language: 'fr' });
    assert(resPutInvalid.status === 400, `Invalid language rejected with 400 (got ${resPutInvalid.status})`);

    // 4. Update language to Tamil ('ta') via PATCH
    console.log('\n[Test 4] PATCH /api/patients/P001/language -> ta');
    const resPatchTa = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/patients/P001/language',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    }, { language: 'ta' });
    assert(resPatchTa.status === 200, `Status is 200 (got ${resPatchTa.status})`);
    const patchTaData = resPatchTa.body.data || resPatchTa.body;
    assert(patchTaData.language === 'ta', `Language is now 'ta' (got ${patchTaData.language})`);

    // 5. Test Dynamic Multilingual Quiz in Hindi
    console.log('\n[Test 5] GET /api/patients/P001/quiz/today?language=hi');
    const resQuizHi = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/patients/P001/quiz/today?language=hi',
      method: 'GET'
    });
    assert(resQuizHi.status === 200, `Status is 200 (got ${resQuizHi.status})`);
    const quizHiData = resQuizHi.body.data || resQuizHi.body;
    assert(quizHiData.language === 'hi', 'Returned quiz language is hi');
    assert(quizHiData.disclaimer && (quizHiData.disclaimer.includes('सत्यापित') || quizHiData.disclaimer.includes('AI-generated')), 'Disclaimer is translated to Hindi');
    assert(quizHiData.questions && quizHiData.questions.length > 0, `Returned ${quizHiData.questions?.length} questions`);
    const q1Hi = quizHiData.questions[0];
    console.log(`   Sample question in Hindi: "${q1Hi.question.substring(0, 50)}..."`);
    assert(q1Hi.originalText !== undefined, 'Preserves original English text for clinical verification');

    // 6. Test Dynamic Multilingual Quiz in Tamil
    console.log('\n[Test 6] GET /api/patients/P001/quiz/today?language=ta');
    const resQuizTa = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/patients/P001/quiz/today?language=ta',
      method: 'GET'
    });
    assert(resQuizTa.status === 200, `Status is 200 (got ${resQuizTa.status})`);
    const quizTaData = resQuizTa.body.data || resQuizTa.body;
    assert(quizTaData.language === 'ta', 'Returned quiz language is ta');
    assert(quizTaData.disclaimer && (quizTaData.disclaimer.includes('செயல்படுவதற்கு') || quizTaData.disclaimer.includes('AI-generated')), 'Disclaimer is translated to Tamil');
    const q1Ta = quizTaData.questions[0];
    console.log(`   Sample question in Tamil: "${q1Ta.question.substring(0, 50)}..."`);
    assert(q1Ta.originalText !== undefined, 'Preserves original English text for clinical verification');

    // 7. Test Dynamic Multilingual AI Insights Summary
    console.log('\n[Test 7] GET /api/patients/P001/insight?language=hi');
    const resInsightHi = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/patients/P001/insight?language=hi',
      method: 'GET'
    });
    assert(resInsightHi.status === 200, `Status is 200 (got ${resInsightHi.status})`);
    const insightHiData = resInsightHi.body.data || resInsightHi.body;
    assert(insightHiData.language === 'hi', `Insight language is hi (got ${insightHiData.language})`);
    assert(insightHiData.disclaimer && (insightHiData.disclaimer.includes('सत्यापित') || insightHiData.disclaimer.includes('AI-generated')), 'Insight disclaimer in Hindi');

    console.log('\n[Test 8] GET /api/patients/P001/insight?language=ta');
    const resInsightTa = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/patients/P001/insight?language=ta',
      method: 'GET'
    });
    assert(resInsightTa.status === 200, `Status is 200 (got ${resInsightTa.status})`);
    const insightTaData = resInsightTa.body.data || resInsightTa.body;
    assert(insightTaData.language === 'ta', `Insight language is ta (got ${insightTaData.language})`);
    assert(insightTaData.disclaimer && (insightTaData.disclaimer.includes('செயல்படும்') || insightTaData.disclaimer.includes('AI-generated')), 'Insight disclaimer in Tamil');

    // 8. Restore language back to 'en'
    console.log('\n[Test 9] Reset language to English');
    const resResetEn = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/patients/P001/language',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { language: 'en' });
    const resetData = resResetEn.body.data || resResetEn.body;
    assert(resetData.language === 'en', `Language safely reset to en (got ${resetData.language})`);

    console.log(`\n========================================`);
    console.log(`TEST RESULTS: ${passed}/${total} passed (${Math.round(passed/total * 100)}%)`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

runTests();
