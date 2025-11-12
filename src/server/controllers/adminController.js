import Title from '../models/Title.js';

export const createTitle = (req, res) => {
  try {
    const { type, name, year, genres: genStr, description } = req.body;
    
    const titleData = {
      type,
      name,
      year,
      genres: (genStr || '').split(',').map(s => s.trim()).filter(Boolean),
      description
    };
    
    const title = Title.create(titleData);
    res.json({ id: title.id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
