import Title from '../models/Title.js';

export const getTitles = (req, res) => {
  try {
    const { page = '1', genre, sort = 'popularity', q, type } = req.query;
    
    // MongoDB ready: filter by type (series/movie)
    let titles = Title.findAll({ genre, q, type });
    
    const limit = 12;
    const p = parseInt(page);
    const items = titles.slice((p - 1) * limit, p * limit);
    
    res.json({
      items: items.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        year: t.year,
        posterUrl: t.posterUrl
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTitleById = (req, res) => {
  try {
    const title = Title.findById(req.params.id);
    
    if (!title) {
      return res.status(404).json({ error: 'Title not found' });
    }
    
    res.json(title);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSimilarTitles = (req, res) => {
  try {
    const title = Title.findById(req.params.id);
    
    if (!title) {
      return res.json({ items: [] });
    }
    
    const items = Title.findSimilar(req.params.id).map(t => ({
      id: t.id,
      name: t.name,
      posterUrl: t.posterUrl
    }));
    
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
