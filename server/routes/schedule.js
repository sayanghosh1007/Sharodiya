import express from 'express';
import { RITUAL_SCHEDULE } from '../../js/data.js';

const router = express.Router();

// GET /api/schedule
router.get('/', (req, res) => {
  try {
    const { day } = req.query;
    if (day) {
      const match = RITUAL_SCHEDULE.find(d => d.day.toLowerCase() === day.toLowerCase());
      if (!match) {
        return res.status(404).json({ success: false, error: 'Schedule day not found' });
      }
      return res.json({ success: true, daySchedule: match });
    }
    res.json({
      success: true,
      totalDays: RITUAL_SCHEDULE.length,
      schedule: RITUAL_SCHEDULE
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
