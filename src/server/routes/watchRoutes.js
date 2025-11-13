import express from 'express';
import * as watchController from '../controllers/watchController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/source', requireAuth, watchController.getVideoSource);
router.get('/progress', requireAuth, watchController.getProgress);
router.post('/progress', requireAuth, watchController.updateProgress);
router.post('/finish', requireAuth, watchController.markFinished);
router.post('/session-end', requireAuth, watchController.endWatchSession);
router.get('/next-episode', requireAuth, watchController.getNextEpisode);

export default router;
