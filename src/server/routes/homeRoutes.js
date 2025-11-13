import express from 'express';
import * as homeController from '../controllers/homeController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/continue', requireAuth, homeController.getContinueWatching);
router.get('/personal', requireAuth, homeController.getPersonalRecommendations);
router.get('/popular', homeController.getPopular);
router.get('/recommended', requireAuth, homeController.getRecommendedForProfile);
router.get('/most-liked-movies', homeController.getMostLikedMovies);
router.get('/most-liked-series', homeController.getMostLikedSeries);
router.get('/already-watched', requireAuth, homeController.getAlreadyWatched);
router.get('/already-watched-movies', requireAuth, homeController.getAlreadyWatchedMovies);
router.get('/already-watched-series', requireAuth, homeController.getAlreadyWatchedSeries);

export default router;
