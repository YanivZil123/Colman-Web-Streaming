import { MovieDoc, SeriesDoc } from '../models/TitleDoc.js';

function mapTitleItem(doc) {
  return {
    id: doc.id,
    type: doc.type || 'movie',
    name: doc.name,
    year: doc.year,
    genres: doc.genres || [],
    description: doc.description || '',
    posterUrl: doc.posterUrl || '/images/poster-placeholder.jpg',
    thumbnailUrl: doc.thumbnailUrl || doc.posterUrl || '/images/poster-placeholder.jpg',
    imdbRating: doc.imdbRating || null,
    actors: doc.actors || '',
    videoUrl: doc.videoUrl || null,
    episodes: doc.episodes || null,
    createdAt: doc.createdAt
  };
}

export const getLatestByGenre = async (req, res) => {
  try {
    const { genre } = req.params;
    const limit = 10;

    if (!genre) {
      return res.status(400).json({ error: 'Genre parameter is required' });
    }

    const normalizedGenre = genre.toLowerCase().trim();

    const [movies, series] = await Promise.all([
      MovieDoc.aggregate([
        {
          $match: {
            genres: {
              $elemMatch: {
                $regex: new RegExp(`^${normalizedGenre}$`, 'i')
              }
            }
          }
        },
        { $sort: { year: -1 } },
        { $limit: limit }
      ]),
      SeriesDoc.aggregate([
        {
          $match: {
            genres: {
              $elemMatch: {
                $regex: new RegExp(`^${normalizedGenre}$`, 'i')
              }
            }
          }
        },
        { $sort: { year: -1 } },
        { $limit: limit }
      ])
    ]);

    const combined = [...movies, ...series]
      .sort((a, b) => (b.year || 0) - (a.year || 0))
      .slice(0, limit);

    const items = combined.map(mapTitleItem);

    res.json({ items });
  } catch (error) {
    console.error('getLatestByGenre error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLatest = async (req, res) => {
  try {
    const limit = 10;

    const [movies, series] = await Promise.all([
      MovieDoc.find()
        .sort({ year: -1 })
        .limit(limit)
        .lean(),
      SeriesDoc.find()
        .sort({ year: -1 })
        .limit(limit)
        .lean()
    ]);

    const combined = [...movies, ...series]
      .sort((a, b) => (b.year || 0) - (a.year || 0))
      .slice(0, limit);

    const items = combined.map(mapTitleItem);

    res.json({ items });
  } catch (error) {
    console.error('getLatest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
