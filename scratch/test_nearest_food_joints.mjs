import assert from 'node:assert';
import { PANDALS_DATA, EATERIES_DATA } from '../js/data.js';

console.log('====================================================');
console.log('📍 TESTING NEAREST FOOD JOINTS & PROXIMITY ENGINE');
console.log('====================================================\n');

// Mock SharodiyaApp Proximity Methods
class MockSharodiyaApp {
  constructor() {
    this.pandals = PANDALS_DATA;
    this.eateries = EATERIES_DATA;
    this.parikrama = [];
  }

  getPlannedPandals() {
    const plannedPandalIds = new Set(
      this.parikrama
        .filter(item => item.type === 'pandal')
        .map(item => item.itemId)
    );
    return this.pandals.filter(p => plannedPandalIds.has(p.id) || this.parikrama.some(item => item.itemId === p.id || (item.itemId && (item.itemId.startsWith(p.id) || p.id.startsWith(item.itemId)))));
  }

  getHaversineDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  getNearestEateriesToSelectedPandals() {
    const plannedPandals = this.getPlannedPandals();
    if (plannedPandals.length === 0) {
      return [];
    }

    return this.eateries.map(eatery => {
      let minDistance = Infinity;
      let closestPandal = null;

      plannedPandals.forEach(pandal => {
        if (pandal.coordinates && eatery.coordinates) {
          const dist = this.getHaversineDistance(
            pandal.coordinates.lat, pandal.coordinates.lng,
            eatery.coordinates.lat, eatery.coordinates.lng
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestPandal = pandal;
          }
        }
      });

      return {
        ...eatery,
        minDistance: Math.round(minDistance * 10) / 10,
        nearestPandalName: closestPandal ? closestPandal.name : 'Planned Pandal'
      };
    }).sort((a, b) => a.minDistance - b.minDistance);
  }

  togglePandalBookmark(id) {
    const pandal = this.pandals.find(p => p.id === id || p.id.startsWith(id));
    if (!pandal) return;
    const idx = this.parikrama.findIndex(i => i.itemId === pandal.id);
    if (idx >= 0) {
      this.parikrama.splice(idx, 1);
    } else {
      this.parikrama.push({
        id: 'item_' + Date.now(),
        type: 'pandal',
        itemId: pandal.id,
        name: pandal.name
      });
    }
  }

  toggleEateryBookmark(id) {
    const eatery = this.eateries.find(e => e.id === id || e.id.startsWith(id));
    if (!eatery) return;
    const idx = this.parikrama.findIndex(i => i.itemId === eatery.id);
    if (idx >= 0) {
      this.parikrama.splice(idx, 1);
    } else {
      this.parikrama.push({
        id: 'item_' + Date.now(),
        type: 'eatery',
        itemId: eatery.id,
        name: eatery.name
      });
    }
  }
}

const app = new MockSharodiyaApp();

// 1. Initial State: No pandals planned
assert(app.getPlannedPandals().length === 0, 'Initially no pandals should be planned');
assert(app.getNearestEateriesToSelectedPandals().length === 0, 'No nearest eateries if no pandals planned');
console.log('[PASS 1] Initial empty state handled correctly');

// 2. Select Sreebhumi Sporting Club (Lake Town / North Kolkata)
app.togglePandalBookmark('sreebhumi-sporting-club-lake-town-north');
assert(app.getPlannedPandals().length === 1, 'Should have 1 planned pandal');
assert(app.getPlannedPandals()[0].name.includes('Sreebhumi'), 'Planned pandal should be Sreebhumi');

const nearestToSreebhumi = app.getNearestEateriesToSelectedPandals();
assert(nearestToSreebhumi.length === 250, 'All 250 eateries should be ranked by proximity');
assert(nearestToSreebhumi[0].minDistance < 2.0, `Top eatery should be < 2 km from Sreebhumi (Got ${nearestToSreebhumi[0].minDistance} km for ${nearestToSreebhumi[0].name})`);
assert(nearestToSreebhumi[0].nearestPandalName.includes('Sreebhumi'), 'Nearest pandal name should be Sreebhumi');
console.log(`[PASS 2] Sreebhumi match: Closest food joint is "${nearestToSreebhumi[0].name}" (${nearestToSreebhumi[0].minDistance} km)`);

// 3. Add Bagbazar Sarbojanin
app.togglePandalBookmark('bagbazar-sarbojonin-north');
assert(app.getPlannedPandals().length === 2, 'Should have 2 planned pandals');
const nearestToBoth = app.getNearestEateriesToSelectedPandals();
assert(nearestToBoth.length === 250, 'Should rank all eateries');
console.log(`[PASS 3] Multi-pandal match: Top 3 closest are:`);
nearestToBoth.slice(0, 3).forEach(e => console.log(`   - ${e.name} (${e.minDistance} km from ${e.nearestPandalName})`));

// 4. Add Eatery to Parikrama Plan
const topEatery = nearestToBoth[0];
app.toggleEateryBookmark(topEatery.id);
assert(app.parikrama.some(i => i.type === 'eatery' && i.itemId === topEatery.id), 'Eatery must be added to Parikrama plan');
console.log(`[PASS 4] Successfully added "${topEatery.name}" to Parikrama plan`);

// 5. Verify distance sorting is ascending
for (let i = 0; i < nearestToBoth.length - 1; i++) {
  assert(nearestToBoth[i].minDistance <= nearestToBoth[i + 1].minDistance, 'Eateries must be sorted in ascending order of distance');
}
console.log('[PASS 5] Distance ordering strictly ascending from closest to farthest');

console.log('\n====================================================');
console.log('✅ ALL NEAREST FOOD JOINTS & PROXIMITY TESTS PASSED!');
console.log('====================================================\n');
