import express from 'express';
import * as contentController from '../controllers/contentController.js';

const router = express.Router();

router.get('/latest', contentController.getLatest);
router.get('/latest-by-genre/:genre', contentController.getLatestByGenre);

export default router;
