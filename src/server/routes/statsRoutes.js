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

// New admin-protected routes
// GET /stats/dashboard - Renders the statistics dashboard page (for HTML pages)
router.get('/dashboard', isAdmin, (req, res) => {
  // The routing in app.js will handle serving the HTML file
  // This route just protects access with the isAdmin middleware
  res.redirect('/views/stats-dashboard.html');
});

// GET /api/stats/daily-watch - API endpoint returning aggregated JSON data
router.get('/daily-watch', requireAdmin, statsController.getDailyWatchData);

export default router;
