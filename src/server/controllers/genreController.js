import Genre from '../models/Genre.js';
import { MovieDoc, SeriesDoc } from '../models/TitleDoc.js';

export const getGenres = async (req, res) => {
  try {
    try {
      const [movieGenres, seriesGenres] = await Promise.all([
        MovieDoc.distinct('genres'),
        SeriesDoc.distinct('genres')
      ]);

      const merged = Array.from(new Set(
        [...movieGenres, ...seriesGenres]
          .filter(Boolean)
          .map(normalizeGenre)
          .filter(Boolean)
      ));

      if (merged.length) {
        return res.json({
          items: merged.map(name => ({
            name,
            slug: slugify(name)
          }))
        });
      }
    } catch (mongoError) {
      console.warn('Falling back to static genres:', mongoError);
    }

    const genres = Genre.getAll();
    res.json({ items: genres });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

function normalizeGenre(value = '') {
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, ' ')
    .split(' ')
    .map(capitalize)
    .join(' ');
}

function capitalize(word = '') {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function slugify(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
