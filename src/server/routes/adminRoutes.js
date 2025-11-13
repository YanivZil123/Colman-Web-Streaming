import express from 'express';
import multer from 'multer';
import * as adminController from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import ErrorLog from '../models/ErrorLog.js';
import { EventLog } from '../utils/logger.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/titles',
  requireAuth,
  requireAdmin,
  upload.fields([{ name: 'poster' }, { name: 'thumbnail' }, { name: 'video' }]),
  adminController.createTitle
);

router.post(
  '/titles/:id/episodes',
  requireAuth,
  requireAdmin,
  upload.single('video'),
  adminController.addEpisode
);

router.get('/debug/titles', requireAuth, requireAdmin, adminController.listDbTitles);

router.delete('/watch-history', requireAuth, requireAdmin, adminController.clearAllWatchHistory);

router.get('/logs/errors', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const errors = await ErrorLog.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    const total = await ErrorLog.countDocuments();
    res.json({ items: errors, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch error logs' });
  }
});

router.get('/logs/events', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, page = 1, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = type ? { type } : {};
    const events = await EventLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    const total = await EventLog.countDocuments(query);
    res.json({ items: events, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event logs' });
  }
});

export default router;
