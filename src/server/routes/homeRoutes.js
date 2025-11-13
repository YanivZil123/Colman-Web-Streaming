import express from 'express';
import * as homeController from '../controllers/homeController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/continue', requireAuth, homeController.getContinueWatching);
router.get('/personal', requireAuth, homeController.getPersonalRecommendations);
router.get('/popular', homeController.getPopular);
router.get('/recommended', requireAuth, homeController.getRecommendedForProfile);

export default router;
