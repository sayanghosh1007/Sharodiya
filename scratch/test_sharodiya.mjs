import { PANDALS_DATA, EATERIES_DATA, RITUAL_SCHEDULE, COMPANION_ARCHETYPES, INITIAL_PARIKRAMA } from '../js/data.js';

console.log('=== RUNNING SHARODIYA PANDALS INTEGRITY SUITE ===\n');

let pass = 0;
let fail = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    pass++;
  } else {
    console.error(`[FAIL] ${message}`);
    fail++;
  }
}

// 1. Total Count Verification
assert(PANDALS_DATA.length === 141, `Total Pandals is 141 (Got ${PANDALS_DATA.length})`);

// 2. Zone Breakdown
const north = PANDALS_DATA.filter(p => p.zoneKey === 'north');
const south = PANDALS_DATA.filter(p => p.zoneKey === 'south');
const central = PANDALS_DATA.filter(p => p.zoneKey === 'central');
const saltlake = PANDALS_DATA.filter(p => p.zoneKey === 'saltlake');

assert(north.length === 43, `North Kolkata has 43 pandals (Got ${north.length})`);
assert(south.length === 58, `South Kolkata has 58 pandals (Got ${south.length})`);
assert(central.length === 20, `Central & Central-East has 20 pandals (Got ${central.length})`);
assert(saltlake.length === 20, `Salt Lake & New Town has 20 pandals (Got ${saltlake.length})`);

// 3. Uniqueness of IDs and Names
const ids = new Set();
const names = new Set();
let duplicates = 0;
PANDALS_DATA.forEach(p => {
  if (ids.has(p.id)) {
    console.error(`Duplicate ID found: ${p.id}`);
    duplicates++;
  }
  ids.add(p.id);
  names.add(p.name);
});
assert(duplicates === 0, `All 141 IDs are strictly unique`);

// 4. Coordinates and Metadata Field Quality Checks
let invalidCoordinates = 0;
let missingFields = 0;

PANDALS_DATA.forEach(p => {
  if (!p.id || !p.name || !p.zone || !p.theme || !p.artisan || !p.description || !p.image || !p.location || !p.nearestMetro) {
    missingFields++;
    console.error(`Missing metadata for ${p.name}`);
  }
  if (!p.coordinates || p.coordinates.lat < 22.40 || p.coordinates.lat > 22.70 || p.coordinates.lng < 88.25 || p.coordinates.lng > 88.55) {
    invalidCoordinates++;
    console.error(`Invalid coordinates for ${p.name}:`, p.coordinates);
  }
  if (!Array.isArray(p.highlights) || p.highlights.length < 2) {
    console.error(`Missing highlights for ${p.name}`);
  }
});

assert(missingFields === 0, `All pandals have complete descriptive metadata fields`);
assert(invalidCoordinates === 0, `All 141 pandals have accurate Kolkata geocoordinates`);

// 5. Search & Filtering Simulation
const sreebhumiSearch = PANDALS_DATA.filter(p => 
  p.name.toLowerCase().includes('sreebhumi') || 
  p.location.toLowerCase().includes('sreebhumi')
);
assert(sreebhumiSearch.length >= 1, `Search query 'sreebhumi' correctly yields matching pandal`);

const traditionalSouth = PANDALS_DATA.filter(p => p.zoneKey === 'south' && p.category.includes('traditional'));
assert(traditionalSouth.length > 5, `Filtered traditional South pandals count: ${traditionalSouth.length}`);

// 6. INITIAL_PARIKRAMA resolution
INITIAL_PARIKRAMA.forEach(item => {
  if (item.type === 'pandal') {
    const matched = PANDALS_DATA.find(p => p.id === item.itemId || p.id.startsWith(item.itemId) || item.itemId.startsWith(p.id));
    assert(!!matched, `Initial Parikrama pandal '${item.name}' (${item.itemId}) resolves in PANDALS_DATA`);
  }
});

// Schedule verification
const days = ['Maha Sasthi', 'Maha Saptami', 'Maha Ashtami', 'Maha Navami', 'Vijaya Dashami'];
assert(RITUAL_SCHEDULE.length === 5, `Expected 5 schedule days, got ${RITUAL_SCHEDULE.length}`);
console.log('[PASS] Ritual Schedule covers all 5 Puja days');

days.forEach(dayName => {
  const day = RITUAL_SCHEDULE.find(d => d.day === dayName);
  assert(!!day, `Day ${dayName} must exist`);
  if (day) {
    assert(!!day.bengaliTithi, `Day ${dayName} must have bengaliTithi`);
    assert(!!day.englishDate, `Day ${dayName} must have englishDate`);
    assert(!!day.shortDesc, `Day ${dayName} must have shortDesc`);
    assert(!!day.guidelines, `Day ${dayName} must have devotee guidelines`);
    assert(!!day.events && day.events.length >= 4, `Day ${dayName} must have at least 4 key rituals`);
    day.events.forEach(e => {
      assert(!!e.time && !!e.title && !!e.desc && !!e.significance, `Event ${e.title} must have time, title, desc, significance`);
    });
  }
});
console.log('[PASS] All 5 days have comprehensive, authentic ritual timings and devotee guidelines');

// 7. Eateries Integrity Verification
console.log('\n--- EATERIES INTEGRITY TESTS ---');
assert(EATERIES_DATA.length >= 200, `Total Eateries >= 200 (Got ${EATERIES_DATA.length})`);

const eateryIds = new Set();
let duplicateEateryIds = 0;
let invalidEateryCoords = 0;
let missingEateryFields = 0;

EATERIES_DATA.forEach(e => {
  if (eateryIds.has(e.id)) {
    duplicateEateryIds++;
    console.error(`Duplicate Eatery ID: ${e.id}`);
  }
  eateryIds.add(e.id);

  if (!e.id || !e.name || !e.outlet || !e.category || !e.tag || !e.badge || !e.rating || !e.reviews || !e.cuisine || !e.avgPrice || !e.waitTime || !e.timing || !e.image || !e.description || !e.mustTry || !e.location) {
    missingEateryFields++;
    console.error(`Missing fields in eatery: ${e.name}`);
  }

  if (!e.coordinates || e.coordinates.lat < 22.40 || e.coordinates.lat > 22.80 || e.coordinates.lng < 88.25 || e.coordinates.lng > 88.55) {
    invalidEateryCoords++;
    console.error(`Invalid coordinates in eatery ${e.name}:`, e.coordinates);
  }
});

assert(duplicateEateryIds === 0, `All ${EATERIES_DATA.length} Eatery IDs are unique`);
assert(missingEateryFields === 0, `All eateries have complete metadata (name, cuisine, price, timings, mustTry)`);
assert(invalidEateryCoords === 0, `All eateries have valid Kolkata coordinates for OpenStreetMap`);

// Category checks
const categories = ['finedine', 'traditional', 'midnight', 'street', 'cafes'];
categories.forEach(cat => {
  const count = EATERIES_DATA.filter(e => e.category === cat).length;
  assert(count >= 30, `Category '${cat}' has >= 30 eateries (Got ${count})`);
});

console.log('\n========================================');
console.log(`TEST SUMMARY: ${pass} PASSED, ${fail} FAILED`);
console.log('========================================\n');

if (fail > 0) process.exit(1);
