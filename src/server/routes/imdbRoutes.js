import express from 'express';
import * as imdbController from '../controllers/imdbController.js';

const router = express.Router();

router.get('/search', imdbController.searchTitle);
router.get('/test', async (req, res) => {
  try {
    const testRes = await fetch('https://www.omdbapi.com/?apikey=k_uysal01d&s=Matrix&type=movie');
    const testData = await testRes.json();
    res.json({ testData, status: 'test connection successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
