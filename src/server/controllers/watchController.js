import Title from '../models/Title.js';
import { MovieDoc, SeriesDoc } from '../models/TitleDoc.js';
import { WatchHabitDoc } from '../models/WatchHabitsDoc.js';

export const getVideoSource = (req, res) => {
  try {
    const { titleId, episodeId } = req.query;
    // Try MongoDB first
    (async () => {
      try {
        let doc = await MovieDoc.findOne({ id: titleId }).lean();
        if (doc) {
          if (doc.videoUrl && (!episodeId)) {
            console.log('watch/source -> returning movie videoUrl from DB for', titleId, doc.videoUrl);
            return res.json({ url: doc.videoUrl });
          }
        }
        doc = await SeriesDoc.findOne({ id: titleId }).lean();
        if (doc) {
          if (episodeId && doc.episodes) {
            const ep = doc.episodes.find(e => e.id === episodeId);
            if (ep && ep.videoUrl) {
              console.log('watch/source -> returning episode videoUrl from DB for', titleId, episodeId, ep.videoUrl);
              return res.json({ url: ep.videoUrl });
            }
          } else if (doc.videoUrl && !episodeId) {
            console.log('watch/source -> returning series videoUrl from DB for', titleId, doc.videoUrl);
            return res.json({ url: doc.videoUrl });
          }
        }
      } catch (err) {
        // ignore DB error and fallback to in-memory
      }

  const url = Title.getVideoUrl(titleId, episodeId);
  if (!url) return res.status(404).json({ error: 'Video not found' });
  console.log('watch/source -> returning videoUrl from in-memory store for', titleId, episodeId, url);
  return res.json({ url });
    })();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProgress = async (req, res) => {
  try {
    const { titleId, episodeId } = req.query;
    if (!titleId) return res.status(400).json({ error: 'titleId is required' });
    const profileId = req.query.profileId ? String(req.query.profileId) : null;
    const userId = req.session.user.id;
    
    // Build query: always filter by userId, titleId, and profileId
    const query = {
      userId,
      titleId,
      profileId: profileId || null
    };
    
    // If episodeId is provided, find specific episode progress
    if (episodeId) {
      query.episodeId = episodeId;
      const habit = await WatchHabitDoc.findOne(query).lean();
      if (!habit) return res.json({});
      return res.json({ 
        positionSec: habit.watchedDuration || 0, 
        totalDurationSec: habit.totalDuration || 0, 
        episodeId: habit.episodeId || null 
      });
    }
    
    // For movies or series without episodeId, find most recent progress
    // This could be a movie or the most recently watched episode
    const habit = await WatchHabitDoc.findOne(query)
      .sort({ lastWatchedAt: -1 })
      .lean();
    
    if (!habit) return res.json({});
    res.json({ 
      positionSec: habit.watchedDuration || 0, 
      totalDurationSec: habit.totalDuration || 0, 
      episodeId: habit.episodeId || null 
    });
  } catch (error) {
    console.error('getProgress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProgress = async (req, res) => {
  try {
    const { titleId, episodeId, positionSec, durationSec, profileId: rawProfileId } = req.body || {};
    if (!titleId) return res.status(400).json({ error: 'titleId is required' });
    const userId = req.session.user.id;
    const profileId = rawProfileId ? String(rawProfileId) : null;
    const watchedDuration = Number(positionSec) || 0;
    const totalDuration = Number(durationSec) || 0;
    
    const query = {
      userId,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null
    };
    
    const existing = await WatchHabitDoc.findOne(query);
    
    if (existing) {
      existing.watchedDuration = watchedDuration;
      existing.totalDuration = totalDuration || existing.totalDuration;
      existing.completed = false;
      existing.lastWatchedAt = new Date();
      existing.updatedAt = new Date();
      // Ensure watchHistory exists (for backward compatibility)
      if (!existing.watchHistory) {
        existing.watchHistory = [];
      }
      // watchCount should be derived from watchHistory.length
      existing.watchCount = existing.watchHistory.length;
      await existing.save();
      return res.json({ ok: true, positionSec: watchedDuration });
    }
    
    // Create new watch habit
    await WatchHabitDoc.create({
      userId,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null,
      watchedDuration,
      totalDuration,
      completed: false,
      lastWatchedAt: new Date(),
      watchCount: 0,
      watchHistory: [] // Initialize empty array
    });
    
    res.json({ ok: true, positionSec: watchedDuration });
  } catch (error) {
    console.error('updateProgress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markFinished = async (req, res) => {
  try {
    const { titleId, episodeId, durationSec, profileId: rawProfileId, startedAt } = req.body || {};
    if (!titleId) return res.status(400).json({ error: 'titleId is required' });
    const userId = req.session.user.id;
    const profileId = rawProfileId ? String(rawProfileId) : null;
    const targetDuration = Number(durationSec) || 0;
    const watchStartTime = startedAt ? new Date(startedAt) : new Date();
    
    const query = {
      userId,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null
    };
    
    const existing = await WatchHabitDoc.findOne(query);
    const now = new Date();
    
    if (existing) {
      existing.watchedDuration = targetDuration;
      existing.totalDuration = targetDuration || existing.totalDuration;
      existing.completed = true;
      existing.lastWatchedAt = now;
      existing.updatedAt = now;
      
      // Ensure watchHistory exists (for backward compatibility)
      if (!existing.watchHistory) {
        existing.watchHistory = [];
      }
      
      // Add watch event to history for daily statistics
      existing.watchHistory.push({
        watchedAt: now,
        duration: targetDuration,
        completed: true,
        startedAt: watchStartTime
      });
      
      // Update watchCount from history length
      existing.watchCount = existing.watchHistory.length;
      
      await existing.save();
      return res.json({ ok: true });
    }
    
    // Create new completed watch habit
    await WatchHabitDoc.create({
      userId,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null,
      watchedDuration: targetDuration,
      totalDuration: targetDuration,
      completed: true,
      lastWatchedAt: now,
      watchCount: 1,
      watchHistory: [{
        watchedAt: now,
        duration: targetDuration,
        completed: true,
        startedAt: watchStartTime
      }]
    });
    
    res.json({ ok: true });
  } catch (error) {
    console.error('markFinished error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getNextEpisode = (req, res) => {
  try {
    const { titleId, episodeId } = req.query;
    (async () => {
      try {
        const doc = await SeriesDoc.findOne({ id: titleId }).lean();
        if (doc && doc.episodes) {
          if (!episodeId) return res.json(doc.episodes[0] || {});
          const idx = doc.episodes.findIndex(e => e.id === episodeId);
          return res.json(doc.episodes[idx + 1] || {});
        }
      } catch (err) {
        // fallback to in-memory
      }

      const nextEpisode = Title.getNextEpisode(titleId, episodeId);
      res.json(nextEpisode || {});
    })();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
