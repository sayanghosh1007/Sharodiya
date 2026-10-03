import express from 'express';
import { METRO_STATIONS_DATA } from '../../js/data.js';

const router = express.Router();

// GET /api/metro
router.get('/', (req, res) => {
  try {
    const { line, search, q } = req.query;
    const query = (search || q || '').toLowerCase().trim();

    let results = [...METRO_STATIONS_DATA];

    if (line) {
      const l = line.toLowerCase();
      if (l === 'interchange') {
        results = results.filter(m => m.interchange === true);
      } else {
        results = results.filter(m => {
          if (Array.isArray(m.line)) {
            return m.line.some(x => String(x).toLowerCase().includes(l));
          }
          return typeof m.line === 'string' && m.line.toLowerCase().includes(l);
        });
      }
    }

    if (query) {
      results = results.filter(m =>
        (m.stationName && m.stationName.toLowerCase().includes(query)) ||
        (m.name && m.name.toLowerCase().includes(query)) ||
        (m.landmark && m.landmark.toLowerCase().includes(query)) ||
        ((m.nearbyPandals || []).some(p => (p.pandalName || p.name || '').toLowerCase().includes(query)))
      );
    }

    res.json({
      success: true,
      total: results.length,
      metroStations: results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
