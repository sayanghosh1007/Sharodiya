import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET /api/parikramas (List all public/saved parikramas)
router.get('/', (req, res) => {
  try {
    const list = db.listParikramas();
    res.json({
      success: true,
      total: list.length,
      parikramas: list
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/parikramas (Save new parikrama)
router.post('/', (req, res) => {
  try {
    const { name, day, squad, items, description, createdBy } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    const id = 'plan_' + Math.random().toString(36).substring(2, 9);
    const parikrama = db.saveParikrama(id, {
      name: name || 'My Puja Parikrama 2026',
      day: day || 'Maha Ashtami',
      squad: squad || 'friends',
      items,
      description: description || '',
      createdBy: createdBy || 'Devotee',
      shareUrl: `/parikrama/${id}`
    });

    res.status(201).json({
      success: true,
      message: 'Parikrama plan saved successfully',
      id,
      parikrama
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/parikramas/:id (Retrieve saved parikrama)
router.get('/:id', (req, res) => {
  try {
    const parikrama = db.getParikrama(req.params.id);
    if (!parikrama) {
      return res.status(404).json({ success: false, error: 'Parikrama not found' });
    }
    res.json({
      success: true,
      parikrama
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/parikramas/:id (Update saved parikrama)
router.put('/:id', (req, res) => {
  try {
    const existing = db.getParikrama(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Parikrama not found' });
    }
    const updated = db.saveParikrama(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Parikrama updated',
      parikrama: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
