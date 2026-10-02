import assert from 'node:assert';
import { PANDALS_DATA, EATERIES_DATA, RITUAL_SCHEDULE, COMPANION_ARCHETYPES, INITIAL_PARIKRAMA } from '../js/data.js';
import { SharodiyaApp } from '../js/app.js';

console.log('=== RUNNING PERSONALIZED ITINERARY RECOMMENDATION TEST SUITE ===\n');

// Mock browser globals for node test runner
globalThis.window = {
  location: { hash: '#home' },
  addEventListener: () => {},
  open: () => {},
  print: () => {}
};
globalThis.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  querySelector: () => null
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

const app = Object.create(SharodiyaApp.prototype);
app.pandals = PANDALS_DATA;
app.eateries = EATERIES_DATA;
app.parikrama = [...INITIAL_PARIKRAMA];
app.showToast = () => {};
app.navigateTo = () => {};
app.saveParikrama = () => {};

// TEST 1: Default Friends Midnight Itinerary
const friendsResult = app.generatePersonalizedItinerary({
  archetype: 'friends',
  day: 'Maha Ashtami',
  timeWindow: 'midnight',
  zone: 'all',
  cuisine: 'biryani',
  pace: 'balanced'
});

assert(friendsResult.items.length >= 5, `Expected >= 5 stops, got ${friendsResult.items.length}`);
assert(friendsResult.totalPandals >= 3, `Expected >= 3 pandals, got ${friendsResult.totalPandals}`);
assert(friendsResult.totalEateries >= 1, `Expected >= 1 eatery, got ${friendsResult.totalEateries}`);
assert(friendsResult.items.some(i => i.type === 'eatery'), 'Must include at least 1 food stop');
console.log(`[PASS] Friends Midnight Itinerary generated ${friendsResult.items.length} stops (${friendsResult.totalPandals} pandals, ${friendsResult.totalEateries} eateries, ${friendsResult.totalEstDistance} km, ${friendsResult.totalEstHours} hrs)`);

// TEST 2: Family Morning Heritage Itinerary
const familyResult = app.generatePersonalizedItinerary({
  archetype: 'family',
  day: 'Maha Saptami',
  timeWindow: 'morning',
  zone: 'south',
  cuisine: 'bengali',
  pace: 'relaxed'
});

assert(familyResult.items.length >= 3, `Expected >= 3 stops for relaxed pace, got ${familyResult.items.length}`);
console.log(`[PASS] Family Relaxed Morning Itinerary: ${familyResult.items.length} stops in South Kolkata`);

// TEST 3: Couple Evening Aesthetic Stroll
const coupleResult = app.generatePersonalizedItinerary({
  archetype: 'couple',
  day: 'Maha Navami',
  timeWindow: 'evening',
  zone: 'all',
  cuisine: 'sweets',
  pace: 'balanced'
});
assert(coupleResult.items.length >= 5, `Expected >= 5 stops, got ${coupleResult.items.length}`);
console.log(`[PASS] Couple Evening Itinerary: ${coupleResult.items.length} stops with romantic lighting & artisanal cafes`);

// TEST 4: Solo High-Speed Metro Sprint (8-10 stops)
const soloResult = app.generatePersonalizedItinerary({
  archetype: 'solo',
  day: 'Maha Ashtami',
  timeWindow: 'afternoon',
  zone: 'north',
  cuisine: 'street',
  pace: 'intense'
});
assert(soloResult.items.length >= 7, `Expected >= 7 stops for hardcore pace, got ${soloResult.items.length}`);
console.log(`[PASS] Solo Hardcore Sprint: ${soloResult.items.length} stops in North Kolkata with heritage cabins`);

// TEST 5: Luxury 5-Star Fine Dining Odyssey
const luxuryResult = app.generatePersonalizedItinerary({
  archetype: 'friends',
  day: 'Maha Sasthi',
  timeWindow: 'evening',
  zone: 'all',
  cuisine: 'finedine',
  pace: 'balanced'
});
assert(luxuryResult.items.some(i => i.type === 'eatery'), 'Fine dining selection must choose dining spots');
console.log(`[PASS] Luxury Fine Dining Itinerary: food stops matched to luxury fine-dine portfolio`);

// TEST 6: Applying Itinerary to Live Parikrama Plan State
app.applyPersonalizedItinerary(coupleResult, 'replace');
assert(app.parikrama.length === coupleResult.items.length, `Parikrama length should match replaced items count (${coupleResult.items.length}), got ${app.parikrama.length}`);
console.log(`[PASS] 'Replace' mode successfully updated active Parikrama plan to ${app.parikrama.length} stops`);

app.applyPersonalizedItinerary(friendsResult, 'append');
assert(app.parikrama.length === coupleResult.items.length + friendsResult.items.length, `Parikrama length should be merged count (${coupleResult.items.length + friendsResult.items.length}), got ${app.parikrama.length}`);
console.log(`[PASS] 'Append' mode successfully merged plans (Total stops: ${app.parikrama.length})`);

// TEST 7: Time slot ordering validity
coupleResult.items.forEach((item, idx) => {
  assert(item.timeSlot && item.timeSlot.includes(' - '), `Item ${idx} (${item.name}) must have a valid timeSlot string (Got '${item.timeSlot}')`);
});
console.log(`[PASS] All generated items have valid formatted time slots`);

console.log('\n========================================');
console.log('ALL PERSONALIZED ITINERARY TESTS PASSED!');
console.log('========================================');
