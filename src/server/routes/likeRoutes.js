import express from 'express';
import * as likeController from '../controllers/likeController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/toggle', requireAuth, likeController.toggleLike);

export default router;
