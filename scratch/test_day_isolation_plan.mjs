import assert from 'assert';

// Mock DOM & Leaflet
const mockEl = {
  addEventListener: () => {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {} },
  style: { setProperty: () => {} },
  querySelector: () => ({ textContent: '', classList: { add: () => {}, remove: () => {} } }),
  querySelectorAll: () => [],
  setAttribute: () => {},
  getAttribute: () => null,
  appendChild: () => {},
  value: '',
  textContent: '',
  innerHTML: ''
};

const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { for (let k in store) delete store[k]; }
};

global.window = {
  localStorage: global.localStorage,
  location: { hash: '#landing' },
  addEventListener: () => {},
  scrollTo: () => {},
  matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  print: () => {},
  L: {
    map: () => ({
      invalidateSize: () => {},
      flyTo: () => {},
      fitBounds: () => {},
      removeLayer: () => {}
    }),
    tileLayer: () => ({ addTo: () => {}, bringToBack: () => {} }),
    layerGroup: () => ({ addTo: () => {}, clearLayers: () => {}, addLayer: () => {} }),
    marker: () => ({ bindPopup: function() { return this; } }),
    polyline: () => ({ bindTooltip: function() { return this; } }),
    divIcon: () => ({}),
    latLngBounds: () => ({ pad: () => {} }),
    featureGroup: () => ({ getBounds: () => ({ pad: () => {} }) })
  }
};

global.document = {
  documentElement: { classList: { add: () => {}, remove: () => {} }, style: { colorScheme: '' } },
  getElementById: () => mockEl,
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  createElement: () => mockEl,
  activeElement: null
};

global.navigator = { clipboard: { writeText: async () => {} } };
global.fetch = async () => ({ ok: true, json: async () => ({ status: 'success' }) });

async function runTest() {
  console.log('--- Testing Day Isolation & New Plan Creation on Day Selection ---');
  const mod = await import('../js/app.js');
  const app = new mod.SharodiyaApp();

  // 1. Initial State Check
  assert(app.plans.length >= 1, 'App must initialize with at least one plan');
  const initialPlan = app.getActivePlan();
  console.log(`[1] Initial Active Plan: "${initialPlan.name}" (Day: ${initialPlan.day}, Stops: ${initialPlan.items.length})`);

  // Populate Maha Sasthi plan with a test stop
  initialPlan.items = [{
    id: 'sasthi_pandal_1',
    type: 'pandal',
    itemId: 'pandal_bagbazar',
    name: 'Bagbazar Sarbojanin',
    zone: 'North Kolkata',
    timeSlot: '08:00 AM',
    duration: '60'
  }];
  app.savePlans();
  assert.strictEqual(app.getActivePlan().items.length, 1, 'Maha Sasthi must have 1 stop');
  console.log(`    Added 1 stop to Maha Sasthi plan. Total stops: ${app.getActivePlan().items.length}`);

  // 2. Select "Maha Saptami" (a new day)
  console.log('\n[2] User clicks "Maha Saptami" tab in Planned section...');
  app.selectDayInPlanner('Maha Saptami');

  const saptamiPlan = app.getActivePlan();
  console.log(`    Active Plan is now: "${saptamiPlan.name}" (Day: ${saptamiPlan.day}, Stops: ${saptamiPlan.items.length})`);

  // Assert day isolation: Maha Saptami must NOT have stops from Maha Sasthi!
  assert.strictEqual(saptamiPlan.day, 'Maha Saptami', 'Plan day must be Maha Saptami');
  assert.strictEqual(saptamiPlan.items.length, 0, 'New day plan must NOT reflect stops of other days!');
  assert.notStrictEqual(saptamiPlan.id, initialPlan.id, 'Must be a separate plan ID');

  // 3. Add stops to Maha Saptami plan
  console.log('\n[3] Adding 2 stops to Maha Saptami...');
  saptamiPlan.items.push({
    id: 'saptami_pandal_1',
    type: 'pandal',
    itemId: 'pandal_college_sq',
    name: 'College Square',
    zone: 'Central Kolkata',
    timeSlot: '11:00 AM',
    duration: '45'
  });
  saptamiPlan.items.push({
    id: 'saptami_eatery_1',
    type: 'eatery',
    itemId: 'eatery_arsalan',
    name: 'Arsalan Park Circus',
    zone: 'Central Kolkata',
    timeSlot: '01:30 PM',
    duration: '60'
  });
  app.savePlans();
  assert.strictEqual(app.getActivePlan().items.length, 2, 'Maha Saptami should have 2 stops');
  console.log(`    Maha Saptami now has ${app.getActivePlan().items.length} stops.`);

  // 4. Switch back to "Maha Sasthi"
  console.log('\n[4] User clicks back to "Maha Sasthi"...');
  app.selectDayInPlanner('Maha Sasthi');

  const resumedSasthiPlan = app.getActivePlan();
  console.log(`    Active Plan is now: "${resumedSasthiPlan.name}" (Day: ${resumedSasthiPlan.day}, Stops: ${resumedSasthiPlan.items.length})`);

  // Assert Maha Sasthi is completely unchanged and contains only its original stop
  assert.strictEqual(resumedSasthiPlan.day, 'Maha Sasthi', 'Must be back on Maha Sasthi');
  assert.strictEqual(resumedSasthiPlan.items.length, 1, 'Maha Sasthi must retain its 1 stop and NOT have Saptami stops');
  assert.strictEqual(resumedSasthiPlan.items[0].name, 'Bagbazar Sarbojanin', 'Maha Sasthi stop must match');

  // 5. Select "Maha Ashtami" (another fresh day)
  console.log('\n[5] User clicks "Maha Ashtami"...');
  app.selectDayInPlanner('Maha Ashtami');

  const ashtamiPlan = app.getActivePlan();
  console.log(`    Active Plan is now: "${ashtamiPlan.name}" (Day: ${ashtamiPlan.day}, Stops: ${ashtamiPlan.items.length})`);
  assert.strictEqual(ashtamiPlan.day, 'Maha Ashtami', 'Must be on Maha Ashtami');
  assert.strictEqual(ashtamiPlan.items.length, 0, 'Maha Ashtami must be a fresh new empty plan');

  // 6. Select "Bijoya Dashami"
  console.log('\n[6] User clicks "Bijoya Dashami"...');
  app.selectDayInPlanner('Bijoya Dashami');
  const dashamiPlan = app.getActivePlan();
  console.log(`    Active Plan is now: "${dashamiPlan.name}" (Day: ${dashamiPlan.day}, Stops: ${dashamiPlan.items.length})`);
  assert.strictEqual(dashamiPlan.day, 'Bijoya Dashami', 'Must be on Bijoya Dashami');
  assert.strictEqual(dashamiPlan.items.length, 0, 'Bijoya Dashami must be a fresh new empty plan');

  // 7. Verify all plans in the system
  console.log('\n[7] Summary of all isolated plans:');
  app.plans.forEach(p => {
    console.log(`    • [${p.day || 'Draft'}] "${p.name}" (ID: ${p.id}) -> ${p.items.length} stops`);
  });

  assert(app.plans.find(p => p.day === 'Maha Sasthi').items.length === 1, 'Sasthi has 1 stop');
  assert(app.plans.find(p => p.day === 'Maha Saptami').items.length === 2, 'Saptami has 2 stops');
  assert(app.plans.find(p => p.day === 'Maha Ashtami').items.length === 0, 'Ashtami has 0 stops');
  assert(app.plans.find(p => p.day === 'Bijoya Dashami').items.length === 0, 'Dashami has 0 stops');

  console.log('\n🎉 ALL DAY-ISOLATION & FRESH PLAN TESTS PASSED WITH 100% SUCCESS!\n');
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
