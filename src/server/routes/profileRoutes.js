import express from 'express';
import * as profileController from '../controllers/profileController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, profileController.getProfiles);
router.post('/', requireAuth, profileController.createProfile);
router.put('/:id', requireAuth, profileController.updateProfile);
router.delete('/:id', requireAuth, profileController.deleteProfile);

export default router;
