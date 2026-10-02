import assert from 'node:assert';
import http from 'node:http';
import app from '../server/server.js';

console.log('=== RUNNING FULL-STACK BACKEND API TEST SUITE ===\n');

// Start server on dynamic test port
const server = http.createServer(app);
const TEST_PORT = 3456;

server.listen(TEST_PORT, async () => {
  try {
    const baseUrl = `http://localhost:${TEST_PORT}`;

    const apiFetch = async (path, options = {}) => {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      const data = await res.json();
      return { status: res.status, data };
    };

    // 1. Health Check
    const health = await apiFetch('/api/health');
    assert(health.status === 200, 'Health check must return 200');
    assert(health.data.status === 'online', 'Health status must be online');
    console.log('[PASS] GET /api/health returns 200 Online');

    // 2. Pandals API
    const pandalsRes = await apiFetch('/api/pandals');
    assert(pandalsRes.status === 200, 'Pandals API must return 200');
    assert(pandalsRes.data.total === 141, `Expected 141 pandals, got ${pandalsRes.data.total}`);
    assert(pandalsRes.data.pandals.every(p => p.liveCrowd), 'Every pandal must have liveCrowd summary');
    console.log(`[PASS] GET /api/pandals returns all ${pandalsRes.data.total} pandals with live crowd metrics`);

    // 3. Pandal Search & Zone Filter
    const northPandals = await apiFetch('/api/pandals?zone=north');
    assert(northPandals.data.total === 43, `Expected 43 North pandals, got ${northPandals.data.total}`);
    const searchSreebhumi = await apiFetch('/api/pandals?search=sreebhumi');
    assert(searchSreebhumi.data.total >= 1, 'Search for sreebhumi must return results');
    console.log('[PASS] GET /api/pandals?zone=north & ?search=sreebhumi filtering verified');

    // 4. Single Pandal Detail & Crowd Reporting
    const singlePandal = await apiFetch('/api/pandals/sreebhumi');
    assert(singlePandal.status === 200, 'GET /api/pandals/sreebhumi must return 200');
    assert(singlePandal.data.pandal.name.includes('Sreebhumi'), 'Name must match Sreebhumi');

    const crowdPost = await apiFetch('/api/pandals/sreebhumi/crowd-report', {
      method: 'POST',
      body: JSON.stringify({
        crowdLevel: 'High',
        waitMinutes: 45,
        note: 'VIP line moving smoothly',
        reportedBy: 'Devotee Test'
      })
    });
    assert(crowdPost.status === 201, 'POST crowd-report must return 201 Created');
    assert(crowdPost.data.liveSummary.currentLevel === 'High', 'Live crowd level must update');
    console.log('[PASS] POST /api/pandals/sreebhumi/crowd-report records live crowdsourced update');

    // 5. Eateries API
    const eateriesRes = await apiFetch('/api/eateries');
    assert(eateriesRes.status === 200, 'Eateries API must return 200');
    assert(eateriesRes.data.total === 250, `Expected 250 eateries, got ${eateriesRes.data.total}`);
    console.log(`[PASS] GET /api/eateries returns all ${eateriesRes.data.total} eateries across 5 categories`);

    // 6. Backend Itinerary Recommendation Engine
    const recRes = await apiFetch('/api/itinerary/recommend', {
      method: 'POST',
      body: JSON.stringify({
        archetype: 'friends',
        day: 'Maha Ashtami',
        timeWindow: 'midnight',
        zone: 'all',
        cuisine: 'biryani',
        pace: 'balanced'
      })
    });
    assert(recRes.status === 200, 'Recommendation API must return 200');
    assert(recRes.data.itinerary.items.length >= 5, `Expected >= 5 stops, got ${recRes.data.itinerary.items.length}`);
    assert(recRes.data.itinerary.items.some(i => i.type === 'eatery'), 'Must include food stops');
    console.log(`[PASS] POST /api/itinerary/recommend generated ${recRes.data.itinerary.items.length} stop itinerary`);

    // 7. Parikrama Cloud Save & Retrieve
    const saveParikrama = await apiFetch('/api/parikramas', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Automated Test Parikrama',
        day: 'Maha Ashtami',
        squad: 'friends',
        items: recRes.data.itinerary.items
      })
    });
    assert(saveParikrama.status === 201, 'Save Parikrama must return 201');
    const planId = saveParikrama.data.id;
    assert(planId, 'Plan ID must be generated');

    const getParikrama = await apiFetch(`/api/parikramas/${planId}`);
    assert(getParikrama.status === 200, 'GET saved parikrama must return 200');
    assert(getParikrama.data.parikrama.items.length === recRes.data.itinerary.items.length, 'Retrieved items count must match');
    console.log(`[PASS] POST /api/parikramas & GET /api/parikramas/${planId} cloud persistence verified`);

    // 8. Squad Creation, Code Join & Live Check-in
    const createSquad = await apiFetch('/api/squads', {
      method: 'POST',
      body: JSON.stringify({
        name: 'The Dhunuchi Dancers',
        archetype: 'friends',
        captainName: 'Test Captain'
      })
    });
    assert(createSquad.status === 201, 'Create Squad must return 201');
    const squadCode = createSquad.data.code;

    const joinSquad = await apiFetch(`/api/squads/${squadCode}/join`, {
      method: 'POST',
      body: JSON.stringify({ memberName: 'Sourav' })
    });
    assert(joinSquad.data.squad.members.includes('Sourav'), 'Sourav must be in members list');

    const checkin = await apiFetch(`/api/squads/${squadCode}/checkin`, {
      method: 'POST',
      body: JSON.stringify({
        entityType: 'pandal',
        entityId: 'bagbazar',
        entityName: 'Bagbazar Sarbojanin',
        memberName: 'Sourav',
        note: 'Arrived for Morning Aarti'
      })
    });
    assert(checkin.status === 201, 'Checkin must return 201');
    assert(checkin.data.squad.checkins.length >= 1, 'Checkin must be added to squad timeline');
    console.log(`[PASS] Squad lifecycle (${squadCode}): Created, Member Joined, Check-in Recorded`);

    // 9. Schedule API
    const scheduleRes = await apiFetch('/api/schedule');
    assert(scheduleRes.status === 200, 'Schedule API must return 200');
    assert(scheduleRes.data.totalDays === 5, 'Schedule must return 5 Puja days');
    console.log('[PASS] GET /api/schedule returns all 5 festival days');

    // 10. AI Companion API
    const aiRes = await apiFetch('/api/ai/companion', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'When is Mahashtami Pushpanjali?' })
    });
    assert(aiRes.status === 200, 'AI Companion API must return 200');
    assert(aiRes.data.answer.length > 20, 'AI Answer must be detailed');
    console.log(`[PASS] POST /api/ai/companion responded via ${aiRes.data.source}`);

    console.log('\n=============================================');
    console.log('✅ ALL FULL-STACK REST API TESTS PASSED (10/10)');
    console.log('=============================================\n');

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
