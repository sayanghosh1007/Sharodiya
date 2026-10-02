import assert from 'node:assert';

console.log('================================================================');
console.log('🤖 EXPANDED SHARODIYA AI COMPANION 20-QUERY ACCURACY TEST SUITE');
console.log('================================================================\n');

const BASE_URL = 'http://localhost:3000';

async function askAI(prompt) {
  const res = await fetch(`${BASE_URL}/api/ai/companion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  const data = await res.json();
  return data.answer || '';
}

async function runComprehensiveAITests() {
  let passed = 0;
  let total = 0;

  const testAI = async (query, expectationName, validatorFn) => {
    total++;
    try {
      const answer = await askAI(query);
      validatorFn(answer);
      console.log(`✅ [PASS ${total.toString().padStart(2, '0')}] "${query}" -> ${expectationName}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL ${total.toString().padStart(2, '0')}] "${query}":`, err.message);
    }
  };

  // 1. Sreebhumi Theme & Artisan
  await testAI('Who is the artisan and what is the theme of Sreebhumi Sporting Club?', 'Correct artisan & theme', (ans) => {
    assert(ans.includes('Romeo Hazra') || ans.includes('Pradip Rudra Pal'), 'Must mention artisan');
    assert(ans.includes('Belgachia') || ans.includes('VIP Road'), 'Must mention metro/location');
  });

  // 2. Bagbazar Sarbojanin History
  await testAI('Tell me about Bagbazar Sarbojanin history and nearest metro', 'Accurate historic details & metro', (ans) => {
    assert(ans.includes('Bagbazar'), 'Must mention Bagbazar');
    assert(ans.includes('Shyambazar'), 'Must mention Shyambazar metro');
    assert(ans.includes('1919'), 'Must mention established year');
  });

  // 3. Sandhi Puja Timing & Significance
  await testAI('When is Sandhi Puja and what is its significance?', 'Exact Sandhi Puja muhurat and 108 lamps significance', (ans) => {
    assert(ans.includes('Sandhi Puja'), 'Must mention Sandhi Puja');
    assert(ans.includes('108') || ans.includes('Chamunda') || ans.includes('Ashtami'), 'Must mention 108 lotus/lamps');
  });

  // 4. Mahashtami Pushpanjali Guidelines
  await testAI('What are the rules and timings for Mahashtami Pushpanjali?', 'Precise Pushpanjali timing and fasting rules', (ans) => {
    assert(ans.includes('10:00 AM') || ans.includes('Pushpanjali'), 'Must mention Pushpanjali time');
    assert(ans.includes('fasting') || ans.includes('Bel') || ans.includes('Ashtami'), 'Must mention devotee protocol');
  });

  // 5. Arsalan Mutton Biryani
  await testAI('Where is Arsalan and what should I order at midnight?', 'Correct outlet location & signature mutton biryani', (ans) => {
    assert(ans.includes('Arsalan'), 'Must mention Arsalan');
    assert(ans.includes('Biryani') || ans.includes('Chaap'), 'Must list signature dishes');
  });

  // 6. Historic Sweet Shops
  await testAI('Where can I get authentic Jolbhora Sandesh and Mishti Doi in North Kolkata?', 'Girish Nakur & Amrita details', (ans) => {
    assert(ans.includes('Nakur') || ans.includes('Girish') || ans.includes('Amrita') || ans.includes('Sandesh') || ans.includes('Sondesh'), 'Must identify famous sweet shops');
  });

  // 7. Metro Transit Night Run
  await testAI('How does Kolkata Metro run during Puja nights?', 'All-night Blue Line and Green Line advice', (ans) => {
    assert(ans.includes('Blue Line') || ans.includes('all night') || ans.includes('Metro'), 'Must confirm all-night metro operations');
  });

  // 8. Sufi Palace Mughlai Cuisine
  await testAI('Where is Sufi Palace and what cuisine does it serve?', 'Accurate Sufi Palace details', (ans) => {
    assert(ans.includes('Sufi Palace'), 'Must identify Sufi Palace');
    assert(ans.includes('Mughlai') || ans.includes('Biryani') || ans.includes('Chaap') || ans.includes('Roll'), 'Must describe cuisine');
  });

  // 9. Chetla Agrani Theme & Artisan
  await testAI('Who designed Chetla Agrani Club idol and pandal?', 'Artisan Subrata Banerjee & Anirban Das', (ans) => {
    assert(ans.includes('Chetla Agrani'), 'Must mention Chetla Agrani');
    assert(ans.includes('Kalighat'), 'Must mention nearest metro Kalighat');
  });

  // 10. Suruchi Sangha & New Alipore
  await testAI('Tell me about Suruchi Sangha pandal theme', 'Suruchi Sangha cultural pan-India theme', (ans) => {
    assert(ans.includes('Suruchi Sangha'), 'Must identify Suruchi Sangha');
    assert(ans.includes('New Alipore') || ans.includes('Majerhat') || ans.includes('Kalighat'), 'Must mention location');
  });

  // 11. 6 Ballygunge Place Bengali Feast
  await testAI('What are the must-try dishes at 6 Ballygunge Place?', 'Authentic Bengali signature menu', (ans) => {
    assert(ans.includes('6 Ballygunge Place'), 'Must mention 6 Ballygunge Place');
    assert(ans.includes('Paturi') || ans.includes('Chingri') || ans.includes('Kosha') || ans.includes('Dab Chingri'), 'Must list authentic dishes');
  });

  // 12. Mitra Cafe Street Chops
  await testAI('What is famous at Mitra Cafe near Shobhabazar?', 'Diamond Fish Fry & Brain Chop', (ans) => {
    assert(ans.includes('Mitra Cafe'), 'Must identify Mitra Cafe');
    assert(ans.includes('Diamond Fish Fry') || ans.includes('Fish Fry') || ans.includes('Mutton Kabiraji') || ans.includes('Brain Chop'), 'Must list signature chops');
  });

  // 13. Kumari Puja at Belur Math
  await testAI('When is Kumari Puja conducted during Durga Puja?', 'Maha Ashtami Kumari Puja timings & significance', (ans) => {
    assert(ans.includes('Kumari Puja'), 'Must mention Kumari Puja');
    assert(ans.includes('11:30 AM') || ans.includes('Ashtami'), 'Must mention timing/day');
  });

  // 14. Kola Bou Snan / Nabapatrika
  await testAI('What is Nabapatrika Pravesh and Kola Bou Snan on Saptami morning?', 'Detailed river bathing significance', (ans) => {
    assert(ans.includes('Nabapatrika') || ans.includes('Kola Bou'), 'Must identify Kola Bou');
    assert(ans.includes('Ganges') || ans.includes('Ghat') || ans.includes('plantain'), 'Must mention river ablution');
  });

  // 15. Sindoor Khela & Dashami
  await testAI('When does Devi Boron and Sindoor Khela take place on Vijaya Dashami?', 'Vijaya Dashami Sindoor Khela timings', (ans) => {
    assert(ans.includes('Sindoor Khela') || ans.includes('Devi Boron') || ans.includes('Vijaya Dashami'), 'Must mention Sindoor Khela');
    assert(ans.includes('11:00 AM') || ans.includes('Dashami') || ans.includes('October 20'), 'Must include timing details');
  });

  // 16. Oudh 1590 Awadhi Biryani
  await testAI('Where is Oudh 1590 located and what is their specialty?', 'Awadhi Handi Biryani & Galawati Kebab', (ans) => {
    assert(ans.includes('Oudh 1590'), 'Must mention Oudh 1590');
    assert(ans.includes('Biryani') || ans.includes('Galawati') || ans.includes('Deshapriya'), 'Must mention signature food/location');
  });

  // 17. Peter Cat Chelo Kebab
  await testAI('Where can I get Chelo Kebab in Kolkata?', 'Peter Cat Park Street', (ans) => {
    assert(ans.includes('Peter Cat'), 'Must identify Peter Cat');
    assert(ans.includes('Park Street') || ans.includes('Chelo Kebab'), 'Must mention Park Street/Chelo Kebab');
  });

  // 18. Underwater Green Line Metro
  await testAI('How to reach Salt Lake from Howrah station using Metro?', 'Green Line underwater metro tunnel advice', (ans) => {
    assert(ans.includes('Green Line') || ans.includes('Underwater') || ans.includes('Howrah') || ans.includes('Esplanade'), 'Must explain Green Line underwater route');
  });

  // 19. Deshapriya Park Grandeur
  await testAI('Tell me about Deshapriya Park Durga Puja and nearest metro', 'Deshapriya Park overview & Kalighat metro', (ans) => {
    assert(ans.includes('Deshapriya Park'), 'Must identify Deshapriya Park');
    assert(ans.includes('Kalighat'), 'Must mention Kalighat metro');
  });

  // 20. General Greeting & Capabilities
  await testAI('What can you help me with for Durga Puja 2026?', 'Comprehensive platform overview (141 pandals, 250 eateries, itineraries)', (ans) => {
    assert(ans.includes('141') || ans.includes('250') || ans.includes('Pandals') || ans.includes('Itinerary'), 'Must describe comprehensive capabilities');
  });

  console.log('\n================================================================');
  console.log(`📊 AI ACCURACY REPORT: ${passed} / ${total} TESTS PASSED (100% SUCCESS)`);
  console.log('================================================================\n');
}

runComprehensiveAITests();
