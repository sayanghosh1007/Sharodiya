import express from 'express';
import { COMPANION_ARCHETYPES } from '../../js/data.js';

const router = express.Router();

// GET /api/archetypes
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      total: COMPANION_ARCHETYPES.length,
      archetypes: COMPANION_ARCHETYPES
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
