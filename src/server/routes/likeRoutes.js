import express from 'express';
import * as likeController from '../controllers/likeController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/toggle', requireAuth, likeController.toggleLike);
router.get('/check', requireAuth, likeController.checkLike);
router.get('/profile/:profileId', requireAuth, likeController.getProfileLikes);

export default router;
