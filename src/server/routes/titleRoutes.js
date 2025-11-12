import express from 'express';
import * as titleController from '../controllers/titleController.js';

const router = express.Router();

router.get('/', titleController.getTitles);
router.get('/:id', titleController.getTitleById);
router.get('/:id/similar', titleController.getSimilarTitles);

export default router;
