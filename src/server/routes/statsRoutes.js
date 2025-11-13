import express from 'express';
import * as statsController from '../controllers/statsController.js';
import { requireAuth, isAdmin, requireAdmin } from '../middleware/auth.js';
import { WatchHabitDoc } from '../models/WatchHabitsDoc.js';

const router = express.Router();

// Existing routes
router.get('/views-by-day', requireAuth, statsController.getViewsByDay);
router.get('/popular-by-genre', statsController.getPopularByGenre);

// Debug route to check watch habits data
router.get('/debug/watch-habits', requireAdmin, async (req, res) => {
  try {
    const total = await WatchHabitDoc.countDocuments();
    const withProfile = await WatchHabitDoc.countDocuments({ profileId: { $ne: null } });
    const sample = await WatchHabitDoc.find().limit(5).lean();
    
    res.json({
      total,
      withProfile,
      sample: sample.map(s => ({
        userId: s.userId,
        profileId: s.profileId,
        titleId: s.titleId,
        lastWatchedAt: s.lastWatchedAt,
        watchHistoryLength: s.watchHistory?.length || 0,
        watchHistory: s.watchHistory
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New stats routes
// GET /stats/dashboard - Renders the statistics dashboard page (for HTML pages)
router.get('/dashboard', requireAuth, (req, res) => {
  // Any authenticated user can access their own stats
  res.redirect('/views/stats-dashboard.html');
});

// GET /api/stats/daily-watch - API endpoint returning aggregated JSON data
// Regular users see only their own profile data, admins see all users
router.get('/daily-watch', requireAuth, statsController.getDailyWatchData);

export default router;
