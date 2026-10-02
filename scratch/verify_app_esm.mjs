
import fs from 'fs';
import path from 'path';

const mockEl = {
  addEventListener: () => {},
  classList: { add: () => {}, remove: () => {} },
  style: { setProperty: () => {} },
  querySelector: () => ({ textContent: '', classList: { add: () => {}, remove: () => {} } }),
  querySelectorAll: () => [],
  setAttribute: () => {},
  getAttribute: () => null,
  appendChild: () => {},
  value: ''
};

// Mock DOM
global.window = {
  location: { hash: '#landing' },
  addEventListener: () => {},
  scrollTo: () => {},
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
  addEventListener: () => {},
  createElement: () => mockEl
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

import('../js/app.js').then((mod) => {
  console.log('SUCCESS: app.js loaded and exported:', Object.keys(mod));
  const app = new mod.SharodiyaApp();
  console.log('SUCCESS: SharodiyaApp instantiated cleanly!');
  console.log('App isPlanMapMode default:', app.isPlanMapMode);
  console.log('App active plan:', app.getActivePlan().name, 'day:', app.getActivePlan().day);
  console.log('Parikrama items:', app.parikrama.length);

  // Test opening plan in map
  app.openPlanInMap();
  console.log('After openPlanInMap -> isPlanMapMode:', app.isPlanMapMode);
  
  // Test map pandals update
  app.updateMapPandals();
  console.log('Plan map pandals markers count:', app.mapPandalMarkers.size);

  // Test map eateries update
  app.updateMapEateries();
  console.log('Plan map eateries markers count:', app.mapEateryMarkers.size);

  // Test exit plan map mode
  app.exitPlanMapMode();
  console.log('After exitPlanMapMode -> isPlanMapMode:', app.isPlanMapMode);
  app.updateMapPandals();
  console.log('Normal map pandals markers count:', app.mapPandalMarkers.size);
  app.updateMapEateries();
  console.log('Normal map eateries markers count:', app.mapEateryMarkers.size);

  process.exit(0);
}).catch(err => {
  console.error('FAILED TO LOAD app.js:', err);
  process.exit(1);
});
