import express from 'express';
import * as statsController from '../controllers/statsController.js';
import { requireAuth, isAdmin, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Existing routes
router.get('/views-by-day', requireAuth, statsController.getViewsByDay);
router.get('/popular-by-genre', statsController.getPopularByGenre);

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
