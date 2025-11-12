import express from 'express';
import * as statsController from '../controllers/statsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/views-by-day', requireAuth, statsController.getViewsByDay);
router.get('/popular-by-genre', statsController.getPopularByGenre);

export default router;
