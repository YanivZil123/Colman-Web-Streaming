import express from 'express';
import * as watchHabitsController from '../controllers/watchHabitsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all watch habits (with search support, requires authentication)
router.get('/', requireAuth, watchHabitsController.getWatchHabits);

// Get watch habit by ID (requires authentication)
router.get('/:id', requireAuth, watchHabitsController.getWatchHabitById);

// Create new watch habit (requires authentication)
router.post('/', requireAuth, watchHabitsController.createWatchHabit);

// Update watch habit (requires authentication)
router.put('/:id', requireAuth, watchHabitsController.updateWatchHabit);

// Delete watch habit (requires authentication)
router.delete('/:id', requireAuth, watchHabitsController.deleteWatchHabit);

// Upsert watch progress (requires authentication)
router.post('/progress', requireAuth, watchHabitsController.upsertWatchProgress);

// Get continue watching list (requires authentication)
router.get('/user/continue-watching', requireAuth, watchHabitsController.getContinueWatching);

// Get user watch statistics (requires authentication)
router.get('/user/stats/:userId?', requireAuth, watchHabitsController.getUserStats);

// Get daily watch statistics (requires authentication)
router.get('/user/daily-stats/:userId?', requireAuth, watchHabitsController.getDailyWatchStats);

export default router;
