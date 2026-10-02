import express from 'express';
import { PANDALS_DATA } from '../../js/data.js';
import { db } from '../db.js';

const router = express.Router();

// GET /api/pandals (Search, Zone, Category filters)
router.get('/', (req, res) => {
  try {
    const { zone, category, search, sort } = req.query;
    let results = [...PANDALS_DATA];

    if (zone && zone !== 'all') {
      results = results.filter(p => p.zoneKey === zone.toLowerCase());
    }

    if (category && category !== 'all') {
      results = results.filter(p => {
        if (Array.isArray(p.category)) return p.category.includes(category);
        return p.category === category;
      });
    }

    if (search) {
      const q = search.toLowerCase().trim();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (p.theme && p.theme.toLowerCase().includes(q)) ||
        (p.nearestMetro && p.nearestMetro.toLowerCase().includes(q)) ||
        (p.artisan && p.artisan.toLowerCase().includes(q))
      );
    }

    // Attach live crowd summary to each pandal
    const enhanced = results.map(pandal => {
      const liveCrowd = db.getLiveCrowdSummary(pandal.id);
      return {
        ...pandal,
        liveCrowd: liveCrowd || {
          currentLevel: pandal.crowdLevel || 'Moderate',
          estimatedWaitMinutes: parseInt(pandal.estWaitTime || '20', 10),
          totalReports: 0
        }
      };
    });

    if (sort === 'rating') {
      enhanced.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'wait') {
      enhanced.sort((a, b) => a.liveCrowd.estimatedWaitMinutes - b.liveCrowd.estimatedWaitMinutes);
    }

    res.json({
      success: true,
      total: enhanced.length,
      pandals: enhanced
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pandals/:id
router.get('/:id', (req, res) => {
  try {
    const targetId = req.params.id.toLowerCase();
    const pandal = PANDALS_DATA.find(p => p.id === targetId || p.id.startsWith(targetId) || p.id.includes(targetId));
    if (!pandal) {
      return res.status(404).json({ success: false, error: 'Pandal not found' });
    }

    const liveCrowd = db.getLiveCrowdSummary(pandal.id);
    const recentReports = db.getCrowdReports(pandal.id);
    const reviews = db.getReviews(pandal.id);

    res.json({
      success: true,
      pandal: {
        ...pandal,
        liveCrowd: liveCrowd || {
          currentLevel: pandal.crowdLevel,
          estimatedWaitMinutes: parseInt(pandal.estWaitTime || '20', 10),
          totalReports: 0
        },
        recentCrowdReports: recentReports,
        reviews
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pandals/:id/crowd-report
router.post('/:id/crowd-report', (req, res) => {
  try {
    const targetId = req.params.id.toLowerCase();
    const pandal = PANDALS_DATA.find(p => p.id === targetId || p.id.startsWith(targetId) || p.id.includes(targetId));
    if (!pandal) {
      return res.status(404).json({ success: false, error: 'Pandal not found' });
    }

    const { crowdLevel, waitMinutes, note, reportedBy } = req.body;
    if (!crowdLevel) {
      return res.status(400).json({ success: false, error: 'crowdLevel is required' });
    }

    const report = db.addCrowdReport(pandal.id, {
      crowdLevel,
      waitMinutes,
      note,
      reportedBy
    });

    const liveSummary = db.getLiveCrowdSummary(pandal.id);

    res.status(201).json({
      success: true,
      message: 'Crowd report recorded successfully',
      report,
      liveSummary
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pandals/:id/reviews
router.post('/:id/reviews', (req, res) => {
  try {
    const pandal = PANDALS_DATA.find(p => p.id === req.params.id);
    if (!pandal) {
      return res.status(404).json({ success: false, error: 'Pandal not found' });
    }

    const { rating, comment, userName } = req.body;
    const review = db.addReview({
      entityType: 'pandal',
      entityId: pandal.id,
      rating,
      comment,
      userName
    });

    res.status(201).json({
      success: true,
      message: 'Review added',
      review
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
