import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import Title from '../models/Title.js';
import { MovieDoc, SeriesDoc } from '../models/TitleDoc.js';

export const createTitle = async (req, res) => {
  try {
    const { type, name, year, genres: genStr, description } = req.body;

    const normalizeGenre = g => String(g || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    const normalizedType = (type || '').toLowerCase();
    const titleData = {
      type: normalizedType,
      name,
      year,
      genres: (genStr || '').split(',').map(s => s.trim()).filter(Boolean).map(normalizeGenre),
      description
    };

    const files = req.files || {};

    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
    const postersDir = path.join(uploadsRoot, 'posters');
    const videosDir = path.join(uploadsRoot, 'videos');
    fs.mkdirSync(postersDir, { recursive: true });
    fs.mkdirSync(videosDir, { recursive: true });

    if (files.poster && files.poster[0]) {
      const pf = files.poster[0];
      const ext = path.extname(pf.originalname) || '.jpg';
      const filename = `${Date.now()}-${nanoid(6)}${ext}`;
      const filepath = path.join(postersDir, filename);
      await fs.promises.writeFile(filepath, pf.buffer);
      titleData.posterUrl = `/uploads/posters/${filename}`;
    }

    // If no poster uploaded but an IMDB poster URL was provided by the admin verification,
    // download that image and save it locally under uploads/posters
    const imdbPosterUrl = (req.body && (req.body.imdbPoster || req.body.posterUrl)) || '';
    if ((!files.poster || !files.poster[0]) && imdbPosterUrl && imdbPosterUrl !== 'N/A') {
      try {
        const resp = await fetch(imdbPosterUrl);
        if (resp && resp.ok) {
          const arrayBuffer = await resp.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          let ext = '.jpg';
          try {
            const urlPath = new URL(imdbPosterUrl).pathname;
            const maybeExt = path.extname(urlPath);
            if (maybeExt) ext = maybeExt;
          } catch (e) {}
          const filename = `${Date.now()}-${nanoid(6)}${ext}`;
          const filepath = path.join(postersDir, filename);
          await fs.promises.writeFile(filepath, buffer);
          titleData.posterUrl = `/uploads/posters/${filename}`;
        } else {
          console.warn('Failed to download IMDB poster, response not ok');
        }
      } catch (err) {
        console.warn('Failed to fetch/save IMDB poster:', err && err.message ? err.message : err);
      }
    }

    if (files.video && files.video[0]) {
      const vf = files.video[0];
      const ext = path.extname(vf.originalname) || '.mp4';
      const filename = `${Date.now()}-${nanoid(6)}${ext}`;
      const filepath = path.join(videosDir, filename);
      await fs.promises.writeFile(filepath, vf.buffer);
      if (normalizedType === 'movie') {
        titleData.videoUrl = `/uploads/videos/${filename}`;
      } else {
        titleData.episodes = [{ id: nanoid(), season: 1, episodeNumber: 1, name: 'Episode 1', videoUrl: `/uploads/videos/${filename}` }];
      }
    }

    const title = Title.create(titleData);

    let dbSaved = false;
    try {
      if (normalizedType === 'movie') {
        await MovieDoc.create({
          id: title.id,
          type: title.type,
          name: title.name,
          year: title.year,
          genres: title.genres,
          description: title.description,
          posterUrl: title.posterUrl,
          videoUrl: title.videoUrl
        });
      } else {
        await SeriesDoc.create({
          id: title.id,
          type: title.type,
          name: title.name,
          year: title.year,
          genres: title.genres,
          description: title.description,
          posterUrl: title.posterUrl,
          episodes: title.episodes
        });
      }
      dbSaved = true;
    } catch (err) {
      console.warn('Failed to save to MongoDB:', err && err.message ? err.message : err);
    }

    res.json({ id: title.id, dbSaved, posterUrl: title.posterUrl, videoUrl: title.videoUrl, genres: title.genres, type: title.type, name: title.name });
  } catch (error) {
    console.error('createTitle error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listDbTitles = async (req, res) => {
  try {
    const movies = await MovieDoc.find().sort({ createdAt: -1 }).lean();
    const series = await SeriesDoc.find().sort({ createdAt: -1 }).lean();
    res.json({ movies, series });
  } catch (err) {
    res.status(500).json({ error: 'Failed to query DB' });
  }
};