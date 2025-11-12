import Title from '../models/Title.js';
import { MovieDoc, SeriesDoc } from '../models/TitleDoc.js';

export const getContinueWatching = (req, res) => {
  try {
    (async () => {
      try {
        const movies = await MovieDoc.find().sort({ createdAt: -1 }).limit(2).lean();
        const series = await SeriesDoc.find().sort({ createdAt: -1 }).limit(2).lean();
        const docs = [...movies, ...series].slice(0, 4);
        const items = docs.map(t => ({ id: t.id, name: t.name, type: t.type, year: t.year, posterUrl: t.posterUrl }));
        return res.json({ items });
      } catch (err) {
        const titles = Title.getAll();
        const items = titles.slice(0, 4).map(t => ({ id: t.id, name: t.name, type: t.type, year: t.year, posterUrl: t.posterUrl }));
        return res.json({ items });
      }
    })();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPersonalRecommendations = (req, res) => {
  try {
    (async () => {
      try {
        const movies = await MovieDoc.find().sort({ createdAt: -1 }).limit(2).lean();
        const series = await SeriesDoc.find().sort({ createdAt: -1 }).limit(2).lean();
        const docs = [...movies, ...series].slice(0, 4);
        const items = docs.map(t => ({ id: t.id, name: t.name, type: t.type, year: t.year, posterUrl: t.posterUrl }));
        return res.json({ items });
      } catch (err) {
        const titles = Title.getAll();
        const items = titles.slice(1, 5).map(t => ({ id: t.id, name: t.name, type: t.type, year: t.year, posterUrl: t.posterUrl }));
        return res.json({ items });
      }
    })();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPopular = (req, res) => {
  try {
    (async () => {
      try {
        const movies = await MovieDoc.find().sort({ createdAt: -1 }).limit(4).lean();
        const series = await SeriesDoc.find().sort({ createdAt: -1 }).limit(4).lean();
        const docs = [...movies, ...series].slice(0, 8);
        const items = docs.map(t => ({ id: t.id, name: t.name, type: t.type, year: t.year, posterUrl: t.posterUrl }));
        return res.json({ items });
      } catch (err) {
        const titles = Title.getAll();
        const items = titles.slice(0, 8).map(t => ({ id: t.id, name: t.name, type: t.type, year: t.year, posterUrl: t.posterUrl }));
        return res.json({ items });
      }
    })();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
