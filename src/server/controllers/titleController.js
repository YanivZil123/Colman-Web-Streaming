import Title from '../models/Title.js';
import { MovieDoc, SeriesDoc } from '../models/TitleDoc.js';

export const getTitles = (req, res) => {
  try {
    const { page = '1', genre, sort = 'popularity', q, type, limit: queryLimit } = req.query;
    const MAX_LIMIT = 100;
    const MAX_PAGE = 1000;
    const limit = queryLimit ? Math.min(parseInt(queryLimit), MAX_LIMIT) : 12;
    const p = Math.max(1, Math.min(parseInt(page), MAX_PAGE));

    (async () => {
      try {
        const query = {};
        if (genre) query.genres = { $in: [genre] };
        if (q) {
          query.$or = [
            { name: { $regex: String(q), $options: 'i' } },
            { genres: { $in: [new RegExp(String(q), 'i')] } }
          ];
        }

        let sortObj = { createdAt: -1 };
        if (sort === 'name') sortObj = { name: 1 };
        if (sort === 'year') sortObj = { year: -1 };
        if (sort === 'popularity') sortObj = { imdbRating: -1, year: -1 };

        let docs = [];
        if (type === 'movie') {
          docs = await MovieDoc.find(query)
            .sort(sortObj)
            .skip((p - 1) * limit)
            .limit(limit)
            .lean();
        } else if (type === 'series') {
          docs = await SeriesDoc.find(query)
            .sort(sortObj)
            .skip((p - 1) * limit)
            .limit(limit)
            .lean();
        } else {
          const movies = await MovieDoc.find(query).sort(sortObj).lean();
          const series = await SeriesDoc.find(query).sort(sortObj).lean();
          docs = [...movies, ...series].sort((a, b) => {
            if (sortObj.createdAt === -1) return b.createdAt - a.createdAt;
            if (sortObj.year === -1) return b.year - a.year;
            if (sortObj.imdbRating === -1) return (b.imdbRating || 0) - (a.imdbRating || 0) || b.year - a.year;
            if (sortObj.name) return a.name.localeCompare(b.name);
            return 0;
          }).slice((p - 1) * limit, p * limit);
        }

        const items = docs.map(mapTitleItem);

        return res.json({ items });
      } catch (err) {
        const titles = Title.findAll({ genre, q, type });
        const items = titles.slice((p - 1) * limit, p * limit).map(mapTitleItem);
        return res.json({ items });
      }
    })();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTitleById = async (req, res) => {
  try {
    try {
      let doc = await MovieDoc.findOne({ id: req.params.id }).lean();
      if (doc) return res.json(doc);
      doc = await SeriesDoc.findOne({ id: req.params.id }).lean();
      if (doc) return res.json(doc);
    } catch (err) {
      console.error('MongoDB query error:', err);
      // Fallback to in-memory data
    }

    const title = Title.findById(req.params.id);
    if (!title) return res.status(404).json({ error: 'Title not found' });
    res.json(title);
  } catch (error) {
    console.error('getTitleById error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSimilarTitles = (req, res) => {
  try {
    (async () => {
      try {
        let base = await MovieDoc.findOne({ id: req.params.id }).lean();
        let isMovie = true;
        
        if (!base) {
          base = await SeriesDoc.findOne({ id: req.params.id }).lean();
          isMovie = false;
        }
        
        if (!base) throw new Error('no-base');

        let items = [];
        
        if (isMovie) {
          items = await MovieDoc.find({
            id: { $ne: req.params.id },
            genres: { $in: (base.genres || []) }
          }).limit(12).lean();
        } else {
          items = await SeriesDoc.find({
            id: { $ne: req.params.id },
            genres: { $in: (base.genres || []) }
          }).limit(12).lean();
        }

        return res.json({ 
          items: items.map(t => ({ 
            id: t.id, 
            name: t.name, 
            type: isMovie ? 'movie' : 'series',
            posterUrl: normalizeAsset(t.posterUrl), 
            thumbnailUrl: normalizeAsset(t.thumbnailUrl) 
          })),
          sourceType: isMovie ? 'movie' : 'series'
        });
      } catch (err) {
        const title = Title.findById(req.params.id);
        if (!title) return res.json({ items: [], sourceType: 'unknown' });
        const items = Title.findSimilar(req.params.id).map(t => ({ id: t.id, name: t.name, posterUrl: normalizeAsset(t.posterUrl), thumbnailUrl: normalizeAsset(t.thumbnailUrl) }));
        return res.json({ items, sourceType: title.type || 'unknown' });
      }
    })();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

function mapTitleItem(t) {
  return {
    id: t.id,
    name: t.name,
    type: t.type,
    year: t.year,
    posterUrl: normalizeAsset(t.posterUrl),
    thumbnailUrl: normalizeAsset(t.thumbnailUrl),
    defaultEpisodeId: t.type === 'series' && t.episodes && t.episodes.length ? t.episodes[0].id : undefined
  };
}

function normalizeAsset(url) {
  if (!url) return null;
  if (/^https?:/i.test(url)) return url;
  let cleaned = String(url).replace(/^\/+/,'');
  if (cleaned.startsWith('public/')) cleaned = cleaned.replace(/^public\//,'');
  const idx = cleaned.indexOf('uploads/');
  if (idx !== -1) cleaned = cleaned.slice(idx);
  if (!cleaned.startsWith('uploads/')) cleaned = 'uploads/' + cleaned;
  return '/' + cleaned;
}
