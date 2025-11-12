import express from 'express';
import * as genreController from '../controllers/genreController.js';

const router = express.Router();

router.get('/', genreController.getGenres);

export default router;
