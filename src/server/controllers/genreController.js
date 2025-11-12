import Genre from '../models/Genre.js';

export const getGenres = (req, res) => {
  try {
    const genres = Genre.getAll();
    res.json({ items: genres });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
