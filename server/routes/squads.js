import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// POST /api/squads (Create a new squad room)
router.post('/', (req, res) => {
  try {
    const { name, archetype, captainName, sharedRoute } = req.body;
    const generatedCode = 'SHARODIYA-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const squad = db.createSquad(generatedCode, {
      name: name || `Squad ${generatedCode}`,
      archetype: archetype || 'friends',
      members: [captainName || 'Captain (You)'],
      sharedRoute: sharedRoute || []
    });

    res.status(201).json({
      success: true,
      message: 'Squad created successfully',
      code: generatedCode,
      squad
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/squads/:code (Get squad details and checkins)
router.get('/:code', (req, res) => {
  try {
    const squad = db.getSquad(req.params.code);
    if (!squad) {
      return res.status(404).json({ success: false, error: 'Squad code not found' });
    }
    res.json({
      success: true,
      squad
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/squads/:code/join (Join a squad by member name)
router.post('/:code/join', (req, res) => {
  try {
    const { memberName } = req.body;
    if (!memberName) {
      return res.status(400).json({ success: false, error: 'memberName is required' });
    }
    const squad = db.joinSquad(req.params.code, memberName);
    if (!squad) {
      return res.status(404).json({ success: false, error: 'Squad code not found' });
    }
    res.json({
      success: true,
      message: `Joined squad ${squad.code}!`,
      squad
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/squads/:code/checkin (Check in at a pandal or eatery)
router.post('/:code/checkin', (req, res) => {
  try {
    const { entityType, entityId, entityName, memberName, note } = req.body;
    if (!entityId || !entityName) {
      return res.status(400).json({ success: false, error: 'entityId and entityName are required' });
    }

    const checkin = db.addSquadCheckin(req.params.code, {
      entityType: entityType || 'pandal',
      entityId,
      entityName,
      memberName: memberName || 'Squad Member',
      note: note || ''
    });

    if (!checkin) {
      return res.status(404).json({ success: false, error: 'Squad code not found' });
    }

    const squad = db.getSquad(req.params.code);
    res.status(201).json({
      success: true,
      message: `Checked in at ${entityName}!`,
      checkin,
      squad
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
