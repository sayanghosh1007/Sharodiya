import express from 'express';
import { EATERIES_DATA } from '../../js/data.js';
import { db } from '../db.js';

const router = express.Router();

// GET /api/eateries (Search, Category, Cuisine, Featured filters)
router.get('/', (req, res) => {
  try {
    const { category, search, cuisine, featured, sort } = req.query;
    let results = [...EATERIES_DATA];

    if (category && category !== 'all') {
      results = results.filter(e => e.category === category);
    }

    if (cuisine) {
      const c = cuisine.toLowerCase();
      results = results.filter(e => e.cuisine.toLowerCase().includes(c));
    }

    if (featured === 'true') {
      results = results.filter(e => e.isFeatured);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      results = results.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.cuisine.toLowerCase().includes(q) ||
        e.tagline.toLowerCase().includes(q) ||
        (e.mustTry && e.mustTry.some(m => m.toLowerCase().includes(q)))
      );
    }

    if (sort === 'rating') {
      results.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'reviews') {
      results.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    res.json({
      success: true,
      total: results.length,
      eateries: results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/eateries/:id
router.get('/:id', (req, res) => {
  try {
    const targetId = req.params.id.toLowerCase();
    const eatery = EATERIES_DATA.find(e => e.id === targetId || e.id.startsWith(targetId) || e.id.includes(targetId));
    if (!eatery) {
      return res.status(404).json({ success: false, error: 'Eatery not found' });
    }
    const reviews = db.getReviews(eatery.id);
    res.json({
      success: true,
      eatery: {
        ...eatery,
        reviews
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/eateries/:id/reviews
router.post('/:id/reviews', (req, res) => {
  try {
    const targetId = req.params.id.toLowerCase();
    const eatery = EATERIES_DATA.find(e => e.id === targetId || e.id.startsWith(targetId) || e.id.includes(targetId));
    if (!eatery) {
      return res.status(404).json({ success: false, error: 'Eatery not found' });
    }

    const { rating, comment, userName } = req.body;
    const review = db.addReview({
      entityType: 'eatery',
      entityId: eatery.id,
      rating,
      comment,
      userName
    });

    res.status(201).json({
      success: true,
      message: 'Review recorded',
      review
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
