import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import Title from '../models/Title.js';
import { MovieDoc, SeriesDoc } from '../models/TitleDoc.js';
import { WatchHabitDoc } from '../models/WatchHabitsDoc.js';
import logger from '../utils/logger.js';

export const createTitle = async (req, res) => {
  try {
    const { type, name, year, genres: genStr, description, actors } = req.body;

    const normalizeGenre = g => String(g || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    const normalizedType = (type || '').toLowerCase();
    const titleData = {
      type: normalizedType,
      name,
      year,
      genres: (genStr || '').split(',').map(s => s.trim()).filter(Boolean).map(normalizeGenre),
      description,
      actors: actors || ''
    };

    const files = req.files || {};

    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
    const postersDir = path.join(uploadsRoot, 'posters');
    const thumbnailDir = path.join(uploadsRoot, 'thumbnail');
    const videosDir = path.join(uploadsRoot, 'videos');
    fs.mkdirSync(postersDir, { recursive: true });
    fs.mkdirSync(thumbnailDir, { recursive: true });
    fs.mkdirSync(videosDir, { recursive: true });

    if (files.poster && files.poster[0]) {
      const pf = files.poster[0];
      const ext = path.extname(pf.originalname) || '.jpg';
      const filename = `${Date.now()}-${nanoid(6)}${ext}`;
      const filepath = path.join(postersDir, filename);
      await fs.promises.writeFile(filepath, pf.buffer);
      titleData.posterUrl = `/uploads/posters/${filename}`;
      await logger.logUpload(req, filename, 'poster');
    }

    if (files.thumbnail && files.thumbnail[0]) {
      const tf = files.thumbnail[0];
      const ext = path.extname(tf.originalname) || '.jpg';
      const filename = `${Date.now()}-${nanoid(6)}${ext}`;
      const filepath = path.join(thumbnailDir, filename);
      await fs.promises.writeFile(filepath, tf.buffer);
      titleData.thumbnailUrl = `/uploads/thumbnail/${filename}`;
      await logger.logUpload(req, filename, 'thumbnail');
    }

    // Always fetch and save IMDB poster if available
    const imdbPosterUrl = (req.body && (req.body.imdbPoster || req.body.posterUrl)) || '';
    console.log('IMDB Poster URL received:', imdbPosterUrl);
    if (imdbPosterUrl && imdbPosterUrl !== 'N/A') {
      try {
        console.log('Attempting to fetch IMDB poster from:', imdbPosterUrl);
        const resp = await fetch(imdbPosterUrl);
        console.log('Fetch response status:', resp.status, resp.statusText);
        if (resp && resp.ok) {
          const arrayBuffer = await resp.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          console.log('Downloaded poster buffer size:', buffer.length);
          let ext = '.jpg';
          try {
            const urlPath = new URL(imdbPosterUrl).pathname;
            const maybeExt = path.extname(urlPath);
            if (maybeExt) ext = maybeExt;
          } catch (e) {}
          const filename = `${Date.now()}-${nanoid(6)}-imdb${ext}`;
          const filepath = path.join(postersDir, filename);
          await fs.promises.writeFile(filepath, buffer);
          console.log('Saved IMDB poster to:', filepath);
          // Only set as posterUrl if no poster was uploaded manually
          if (!files.poster || !files.poster[0]) {
            titleData.posterUrl = `/uploads/posters/${filename}`;
            console.log('Set posterUrl to:', titleData.posterUrl);
          } else {
            console.log('Manual poster was uploaded, keeping that instead');
          }
        } else {
          console.warn('Failed to download IMDB poster, response not ok:', resp.status);
        }
      } catch (err) {
        console.warn('Failed to fetch/save IMDB poster:', err && err.message ? err.message : err);
      }
    } else {
      console.log('No IMDB poster URL provided or URL is N/A');
    }

    if (files.video && files.video[0]) {
      const vf = files.video[0];
      const ext = path.extname(vf.originalname) || '.mp4';
      const filename = `${Date.now()}-${nanoid(6)}${ext}`;
      const filepath = path.join(videosDir, filename);
      await fs.promises.writeFile(filepath, vf.buffer);
      await logger.logUpload(req, filename, 'video');
      if (normalizedType === 'movie') {
        titleData.videoUrl = `/uploads/videos/${filename}`;
      } else {
        const season = parseInt(req.body.season) || 1;
        const episodeNumber = parseInt(req.body.episodeNumber) || 1;
        const episodeName = req.body.episodeName || `Episode ${episodeNumber}`;
        const episodeRating = req.body.episodeRating || 'N/A';
        
        let episodeThumbnailUrl = '';
        if (files.episodeThumbnail && files.episodeThumbnail[0]) {
          const etf = files.episodeThumbnail[0];
          const etExt = path.extname(etf.originalname) || '.jpg';
          const etFilename = `${Date.now()}-${nanoid(6)}-ep-thumb${etExt}`;
          const etFilepath = path.join(thumbnailDir, etFilename);
          await fs.promises.writeFile(etFilepath, etf.buffer);
          episodeThumbnailUrl = `/uploads/thumbnail/${etFilename}`;
        }
        
        titleData.episodes = [{ 
          id: nanoid(), 
          season, 
          episodeNumber, 
          name: episodeName, 
          videoUrl: `/uploads/videos/${filename}`,
          thumbnailUrl: episodeThumbnailUrl,
          rating: episodeRating
        }];
      }
    }

    const title = Title.create(titleData);

    let dbSaved = false;
    try {
      console.log('Creating document with titleData:', {
        name: titleData.name,
        posterUrl: titleData.posterUrl,
        thumbnailUrl: titleData.thumbnailUrl,
        videoUrl: titleData.videoUrl
      });
      if (normalizedType === 'movie') {
        const movieData = {
          id: title.id,
          type: title.type,
          name: title.name,
          year: title.year,
          genres: title.genres,
          description: title.description,
          posterUrl: titleData.posterUrl,
          thumbnailUrl: titleData.thumbnailUrl,
          videoUrl: titleData.videoUrl
        };
        console.log('Creating movie with data:', movieData);
        await MovieDoc.create(movieData);
        console.log('Movie document created successfully with posterUrl:', titleData.posterUrl);
      } else {
        const imdbId = req.body.imdbId || '';
        const seriesData = {
          id: title.id,
          type: title.type,
          name: title.name,
          year: title.year,
          genres: title.genres,
          description: title.description,
          posterUrl: titleData.posterUrl,
          thumbnailUrl: titleData.thumbnailUrl,
          imdbId: imdbId,
          actors: title.actors || '',
          episodes: title.episodes
        };
        console.log('Creating series with data:', {name: seriesData.name, posterUrl: seriesData.posterUrl, imdbId: seriesData.imdbId});
        await SeriesDoc.create(seriesData);
        console.log('Series document created successfully with posterUrl:', titleData.posterUrl);
      }
      dbSaved = true;
    } catch (err) {
      console.warn('Failed to save to MongoDB:', err && err.message ? err.message : err);
      await logger.logError(err, req, 'createTitle - MongoDB save');
    }

    await logger.logCreate(req, normalizedType === 'movie' ? 'movie' : 'series', title.id);

    res.json({ id: title.id, dbSaved, posterUrl: title.posterUrl, thumbnailUrl: title.thumbnailUrl, videoUrl: title.videoUrl, genres: title.genres, type: title.type, name: title.name });
  } catch (error) {
    console.error('createTitle error', error);
    await logger.logError(error, req, 'createTitle');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addEpisode = async (req, res) => {
  try {
    const { id } = req.params;
    const { season, episodeNumber, episodeName, episodeRating } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
    const videosDir = path.join(uploadsRoot, 'videos');
    fs.mkdirSync(videosDir, { recursive: true });

    const vf = req.file;
    const ext = path.extname(vf.originalname) || '.mp4';
    const filename = `${Date.now()}-${nanoid(6)}${ext}`;
    const filepath = path.join(videosDir, filename);
    await fs.promises.writeFile(filepath, vf.buffer);

    const episodeData = {
      id: nanoid(),
      season: parseInt(season) || 1,
      episodeNumber: parseInt(episodeNumber) || 1,
      name: episodeName || `Episode ${episodeNumber || 1}`,
      videoUrl: `/uploads/videos/${filename}`,
      rating: episodeRating || 'N/A'
    };

    let dbSaved = false;
    try {
      const series = await SeriesDoc.findOne({ id });
      if (series) {
        series.episodes.push(episodeData);
        await series.save();
        dbSaved = true;
      } else {
        return res.status(404).json({ error: 'Series not found' });
      }
    } catch (err) {
      console.warn('Failed to add episode to MongoDB:', err && err.message ? err.message : err);
      return res.status(500).json({ error: 'Failed to add episode to database' });
    }

    res.json({ 
      success: true, 
      dbSaved, 
      episode: episodeData,
      message: 'Episode added successfully' 
    });
  } catch (error) {
    console.error('addEpisode error', error);
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

export const clearAllWatchHistory = async (req, res) => {
  try {
    const result = await WatchHabitDoc.deleteMany({});
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Cleared ${result.deletedCount} watch history records`
    });
  } catch (error) {
    console.error("clearAllWatchHistory error", error);
    res.status(500).json({ error: "Failed to clear watch history" });
  }
};
