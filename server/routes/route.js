import express from 'express';
import https from 'https';
import http from 'http';

const router = express.Router();

// Memory cache for road routes (LRU-like simple map)
const routeCache = new Map();

function generateRouteHash(waypoints, mode) {
  const pts = waypoints.map(p => `${Number(p.lat).toFixed(5)},${Number(p.lng).toFixed(5)}`).join(';');
  return `${mode}:${pts}`;
}

function computeFallbackRoadRoute(waypoints) {
  const coords = [];
  let totalDistKm = 0.0;
  const legs = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const lat1 = Number(p1.lat);
    const lng1 = Number(p1.lng);
    const lat2 = Number(p2.lat);
    const lng2 = Number(p2.lng);

    const dlat = (lat2 - lat1) * 111.0;
    const dlng = (lng2 - lng1) * 102.7;
    const segmentDist = Math.sqrt(dlat * dlat + dlng * dlng) * 1.25;
    totalDistKm += segmentDist;

    const steps = Math.max(8, Math.floor(segmentDist * 6));
    const legCoords = [];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const curve = (i % 2 === 0 ? 0.0004 : -0.0004) * (1 - Math.pow(2 * t - 1, 2));
      const curLat = lat1 + (lat2 - lat1) * t + curve * 0.5;
      const curLng = lng1 + (lng2 - lng1) * t + curve;
      const pt = [Number(curLat.toFixed(6)), Number(curLng.toFixed(6))];
      coords.push(pt);
      legCoords.push(pt);
    }

    legs.push({
      fromIndex: i,
      toIndex: i + 1,
      distanceKm: Number(segmentDist.toFixed(2)),
      durationMins: Number((segmentDist / 22.0 * 60).toFixed(1)),
      coordinates: legCoords
    });
  }

  const last = waypoints[waypoints.length - 1];
  coords.push([Number(Number(last.lat).toFixed(6)), Number(Number(last.lng).toFixed(6))]);

  return {
    success: true,
    isRoadRoute: true,
    isFallback: true,
    totalDistanceKm: Number(totalDistKm.toFixed(2)),
    totalDurationMins: Number((totalDistKm / 22.0 * 60).toFixed(1)),
    coordinates: coords,
    legs,
    waypointsCount: waypoints.length,
    roadPointsCount: coords.length
  };
}

async function fetchOsrmRoute(cleanPoints, mode = 'driving') {
  const osrmMode = (mode === 'walking' || mode === 'foot') ? 'foot' : 'driving';
  const coordsParam = cleanPoints.map(p => `${Number(p.lng).toFixed(6)},${Number(p.lat).toFixed(6)}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/${osrmMode}/${coordsParam}?overview=full&geometries=geojson&steps=true`;

  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'SharodiyaPujaExperience/3.0 (Kolkata Road Navigator)',
        'Accept': 'application/json'
      },
      timeout: 5000
    }, (res) => {
      let rawData = '';
      res.on('data', chunk => { rawData += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const data = JSON.parse(rawData);
            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const rawCoords = (route.geometry && route.geometry.coordinates) || [];
              const roadCoords = rawCoords.map(c => [Number(c[1].toFixed(6)), Number(c[0].toFixed(6))]);
              const distKm = Number((route.distance / 1000.0).toFixed(2));
              const durationMins = Number((route.duration / 60.0).toFixed(1));

              const legs = (route.legs || []).map((leg, idx) => ({
                fromIndex: idx,
                toIndex: idx + 1,
                distanceKm: Number((leg.distance / 1000.0).toFixed(2)),
                durationMins: Number((leg.duration / 60.0).toFixed(1)),
                summary: leg.summary || ''
              }));

              resolve({
                success: true,
                isRoadRoute: true,
                isFallback: false,
                mode,
                totalDistanceKm: distKm,
                totalDurationMins: durationMins,
                coordinates: roadCoords,
                legs,
                waypointsCount: cleanPoints.length,
                roadPointsCount: roadCoords.length
              });
              return;
            }
          }
        } catch (e) {
          // ignore parse errors
        }
        resolve(null);
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

// POST /api/route
router.post('/', async (req, res) => {
  try {
    const { waypoints = [], mode = 'driving' } = req.body;
    const cleanPoints = [];

    for (const p of waypoints) {
      if (p && typeof p === 'object' && 'lat' in p && 'lng' in p) {
        cleanPoints.push({ lat: Number(p.lat), lng: Number(p.lng) });
      } else if (Array.isArray(p) && p.length >= 2) {
        cleanPoints.push({ lat: Number(p[0]), lng: Number(p[1]) });
      }
    }

    if (cleanPoints.length < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 valid waypoints required', coordinates: [] });
    }

    const hash = generateRouteHash(cleanPoints, mode);
    if (routeCache.has(hash)) {
      const cached = routeCache.get(hash);
      return res.json({ ...cached, fromCache: true });
    }

    let result = await fetchOsrmRoute(cleanPoints, mode);
    if (!result || !result.coordinates || result.coordinates.length === 0) {
      result = computeFallbackRoadRoute(cleanPoints);
    }

    routeCache.set(hash, result);
    if (routeCache.size > 500) {
      const firstKey = routeCache.keys().next().value;
      routeCache.delete(firstKey);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, coordinates: [] });
  }
});

// GET /api/route
router.get('/', async (req, res) => {
  try {
    const { waypoints: wpStr = '', mode = 'driving' } = req.query;
    if (!wpStr) {
      return res.status(400).json({ success: false, error: 'Missing waypoints query parameter' });
    }

    const cleanPoints = [];
    for (const pair of wpStr.split(';')) {
      const parts = pair.split(',');
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          cleanPoints.push({ lat, lng });
        }
      }
    }

    if (cleanPoints.length < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 valid waypoints required' });
    }

    const hash = generateRouteHash(cleanPoints, mode);
    if (routeCache.has(hash)) {
      return res.json({ ...routeCache.get(hash), fromCache: true });
    }

    let result = await fetchOsrmRoute(cleanPoints, mode);
    if (!result || !result.coordinates || result.coordinates.length === 0) {
      result = computeFallbackRoadRoute(cleanPoints);
    }

    routeCache.set(hash, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
