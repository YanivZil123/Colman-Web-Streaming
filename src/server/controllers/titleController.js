import Title from '../models/Title.js';
import { MovieDoc, SeriesDoc } from '../models/TitleDoc.js';

export const getTitles = (req, res) => {
  try {
    const { page = '1', genre, sort = 'popularity', q, type } = req.query;
    const limit = 12;
    const p = Math.max(1, parseInt(page));

    (async () => {
      try {
        const query = {};
        if (genre) query.genres = genre;
        if (q) query.name = { $regex: String(q), $options: 'i' };

        let sortObj = { createdAt: -1 };
        if (sort === 'name') sortObj = { name: 1 };

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
            if (sortObj.name) return a.name.localeCompare(b.name);
            return 0;
          }).slice((p - 1) * limit, p * limit);
        }

        const items = docs.map(t => ({
          id: t.id,
          name: t.name,
          type: t.type,
          year: t.year,
          posterUrl: t.posterUrl
        }));

        return res.json({ items });
      } catch (err) {
        const titles = Title.findAll({ genre, q, type });
        const items = titles.slice((p - 1) * limit, p * limit).map(t => ({
          id: t.id,
          name: t.name,
          type: t.type,
          year: t.year,
          posterUrl: t.posterUrl
        }));
        return res.json({ items });
      }
    })();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTitleById = (req, res) => {
  try {
    (async () => {
      try {
        let doc = await MovieDoc.findOne({ id: req.params.id }).lean();
        if (doc) return res.json(doc);
        doc = await SeriesDoc.findOne({ id: req.params.id }).lean();
        if (doc) return res.json(doc);
      } catch (err) {
        // ignore and fallback
      }

      const title = Title.findById(req.params.id);
      if (!title) return res.status(404).json({ error: 'Title not found' });
      res.json(title);
    })();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSimilarTitles = (req, res) => {
  try {
    (async () => {
      try {
        let base = await MovieDoc.findOne({ id: req.params.id }).lean();
        if (!base) base = await SeriesDoc.findOne({ id: req.params.id }).lean();
        if (!base) throw new Error('no-base');

        const movieItems = await MovieDoc.find({
          id: { $ne: req.params.id },
          genres: { $in: base.genres || [] }
        }).limit(8).lean();

        const seriesItems = await SeriesDoc.find({
          id: { $ne: req.params.id },
          genres: { $in: base.genres || [] }
        }).limit(8).lean();

        const items = [...movieItems, ...seriesItems].slice(0, 8);

        return res.json({ items: items.map(t => ({ id: t.id, name: t.name, posterUrl: t.posterUrl })) });
      } catch (err) {
        const title = Title.findById(req.params.id);
        if (!title) return res.json({ items: [] });
        const items = Title.findSimilar(req.params.id).map(t => ({ id: t.id, name: t.name, posterUrl: t.posterUrl }));
        return res.json({ items });
      }
    })();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
