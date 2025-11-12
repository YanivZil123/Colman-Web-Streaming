import express from 'express';
import multer from 'multer';
import * as adminController from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/titles',
  requireAuth,
  requireAdmin,
  upload.fields([{ name: 'poster' }, { name: 'video' }]),
  adminController.createTitle
);

router.get('/debug/titles', requireAuth, requireAdmin, adminController.listDbTitles);

export default router;
