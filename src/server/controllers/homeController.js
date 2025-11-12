import Title from '../models/Title.js';

export const getContinueWatching = (req, res) => {
  try {
    const titles = Title.getAll();
    const items = titles.slice(0, 4).map(t => ({
      id: t.id,
      name: t.name,
      type: t.type,
      year: t.year,
      posterUrl: t.posterUrl
    }));
    
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPersonalRecommendations = (req, res) => {
  try {
    const titles = Title.getAll();
    const items = titles.slice(1, 5).map(t => ({
      id: t.id,
      name: t.name,
      type: t.type,
      year: t.year,
      posterUrl: t.posterUrl
    }));
    
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPopular = (req, res) => {
  try {
    const titles = Title.getAll();
    const items = titles.slice(0, 8).map(t => ({
      id: t.id,
      name: t.name,
      type: t.type,
      year: t.year,
      posterUrl: t.posterUrl
    }));
    
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
