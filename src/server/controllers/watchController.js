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
        episodeId: habit.episodeId || null,
        completed: habit.completed || false
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
      episodeId: habit.episodeId || null,
      completed: habit.completed || false
    });
  } catch (error) {
    console.error('getProgress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProgress = async (req, res) => {
  try {
    const { titleId, episodeId, positionSec, durationSec, profileId: rawProfileId, sessionStartTime } = req.body || {};
    if (!titleId) return res.status(400).json({ error: 'titleId is required' });
    const userId = req.session.user.id;
    const profileId = rawProfileId ? String(rawProfileId) : null;
    const watchedDuration = Number(positionSec) || 0;
    const totalDuration = Number(durationSec) || 0;
    const sessionStart = sessionStartTime ? new Date(sessionStartTime) : new Date();
    
    const query = {
      userId,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null
    };
    
    const existing = await WatchHabitDoc.findOne(query);
    const now = new Date();
    
    if (existing) {
      // Ensure watchHistory exists
      if (!existing.watchHistory) {
        existing.watchHistory = [];
      }
      
      // Check if we need to start a new session (gap > 30 minutes)
      const lastUpdate = existing.lastWatchedAt || existing.updatedAt;
      const gapMinutes = (now - lastUpdate) / (1000 * 60);
      const SESSION_GAP_MINUTES = 30;
      
      // If gap is too large, close previous session and start new one
      if (gapMinutes > SESSION_GAP_MINUTES && existing.watchedDuration > 5) {
        // Close previous session (use lastUpdate as both watchedAt and startedAt since we don't track exact start)
        existing.watchHistory.push({
          watchedAt: lastUpdate,
          duration: existing.watchedDuration,
          completed: false,
          startedAt: new Date(lastUpdate.getTime() - (existing.watchedDuration * 1000)) // Estimate start time
        });
      }
      
      const isCompleted = totalDuration > 0 && watchedDuration >= totalDuration;
      
      if(isCompleted && episodeId){
        const title = await Title.findById(titleId);
        if(title && title.type === 'series' && title.episodes && title.episodes.length > 0){
          const lastEpisode = title.episodes[title.episodes.length - 1];
          if(lastEpisode.id === episodeId){
            await WatchHabitDoc.deleteMany({
              userId,
              titleId,
              profileId: profileId || null
            });
            return res.json({ ok: true, positionSec: 0 });
          }
        }
      }
      
      existing.watchedDuration = isCompleted ? 0 : watchedDuration;
      existing.totalDuration = totalDuration || existing.totalDuration;
      existing.completed = isCompleted;
      existing.lastWatchedAt = now;
      existing.updatedAt = now;
      
      // watchCount derived from watchHistory.length
      existing.watchCount = existing.watchHistory.length;
      await existing.save();
      
      return res.json({ ok: true, positionSec: watchedDuration });
    }
    
    // Create new watch habit
    const isCompleted = totalDuration > 0 && watchedDuration >= totalDuration;
    
    if(isCompleted && episodeId){
      const title = await Title.findById(titleId);
      if(title && title.type === 'series' && title.episodes && title.episodes.length > 0){
        const lastEpisode = title.episodes[title.episodes.length - 1];
        if(lastEpisode.id === episodeId){
          await WatchHabitDoc.deleteMany({
            userId,
            titleId,
            profileId: profileId || null
          });
          return res.json({ ok: true, positionSec: 0 });
        }
      }
    }
    
    await WatchHabitDoc.create({
      userId,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null,
      watchedDuration: isCompleted ? 0 : watchedDuration,
      totalDuration,
      completed: isCompleted,
      lastWatchedAt: now,
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
      const lastUpdate = existing.lastWatchedAt || existing.updatedAt;
      const gapMinutes = (now - lastUpdate) / (1000 * 60);
      const SESSION_GAP_MINUTES = 30;
      
      if (!existing.watchHistory) {
        existing.watchHistory = [];
      }
      
      // Check if session with same startedAt already exists (prevent duplicates)
      const existingSession = existing.watchHistory.find(s => 
        s.startedAt && watchStartTime && 
        Math.abs(new Date(s.startedAt).getTime() - watchStartTime.getTime()) < 1000
      );
      
      if (existingSession) {
        // Update existing session
        existingSession.watchedAt = now;
        existingSession.duration = targetDuration;
        existingSession.completed = true;
      } else if (gapMinutes > SESSION_GAP_MINUTES) {
        // New session after gap
        existing.watchHistory.push({
          watchedAt: now,
          duration: targetDuration,
          completed: true,
          startedAt: watchStartTime
        });
        existing.watchCount = existing.watchHistory.length;
      } else if (existing.watchHistory.length > 0) {
        // Check if last session has different startedAt - if so, add new entry
        const lastSession = existing.watchHistory[existing.watchHistory.length - 1];
        const lastStartedAt = lastSession.startedAt ? new Date(lastSession.startedAt).getTime() : 0;
        const currentStartedAt = watchStartTime.getTime();
        
        if (Math.abs(lastStartedAt - currentStartedAt) >= 1000) {
          // Different session - add new entry
          existing.watchHistory.push({
            watchedAt: now,
            duration: targetDuration,
            completed: true,
            startedAt: watchStartTime
          });
          existing.watchCount = existing.watchHistory.length;
        } else {
          // Same session - update last entry
          lastSession.watchedAt = now;
          lastSession.duration = targetDuration;
          lastSession.completed = true;
        }
      } else {
        // First session
        existing.watchHistory.push({
          watchedAt: now,
          duration: targetDuration,
          completed: true,
          startedAt: watchStartTime
        });
        existing.watchCount = existing.watchHistory.length;
      }
      
      existing.watchedDuration = 0;
      existing.totalDuration = targetDuration || existing.totalDuration;
      existing.completed = true;
      existing.lastWatchedAt = now;
      existing.updatedAt = now;
      
      await existing.save();
      return res.json({ ok: true });
    }
    
    // Create new completed watch habit
    await WatchHabitDoc.create({
      userId,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null,
      watchedDuration: 0,
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

export const endWatchSession = async (req, res) => {
  try {
    const { titleId, episodeId, positionSec, durationSec, profileId: rawProfileId, startedAt } = req.body || {};
    if (!titleId) return res.status(400).json({ error: 'titleId is required' });
    const userId = req.session.user.id;
    const profileId = rawProfileId ? String(rawProfileId) : null;
    const watchedDuration = Number(positionSec) || 0;
    const watchStartTime = startedAt ? new Date(startedAt) : new Date();
    const now = new Date();
    
    const query = {
      userId,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null
    };
    
    const existing = await WatchHabitDoc.findOne(query);
    
    if (existing && watchedDuration > 5) {
      const lastUpdate = existing.lastWatchedAt || existing.updatedAt;
      const gapMinutes = (now - lastUpdate) / (1000 * 60);
      const SESSION_GAP_MINUTES = 30;
      
      if (!existing.watchHistory) {
        existing.watchHistory = [];
      }
      
      // Check if session with same startedAt already exists (prevent duplicates)
      const existingSession = existing.watchHistory.find(s => 
        s.startedAt && watchStartTime && 
        Math.abs(new Date(s.startedAt).getTime() - watchStartTime.getTime()) < 1000
      );
      
      if (existingSession) {
        // Update existing session
        existingSession.watchedAt = now;
        existingSession.duration = watchedDuration;
      } else if (gapMinutes > SESSION_GAP_MINUTES) {
        // New session after gap
        existing.watchHistory.push({
          watchedAt: now,
          duration: watchedDuration,
          completed: false,
          startedAt: watchStartTime
        });
        existing.watchCount = existing.watchHistory.length;
      } else if (existing.watchHistory.length > 0) {
        // Check if last session has different startedAt - if so, add new entry
        const lastSession = existing.watchHistory[existing.watchHistory.length - 1];
        const lastStartedAt = lastSession.startedAt ? new Date(lastSession.startedAt).getTime() : 0;
        const currentStartedAt = watchStartTime.getTime();
        
        if (Math.abs(lastStartedAt - currentStartedAt) >= 1000) {
          // Different session - add new entry
          existing.watchHistory.push({
            watchedAt: now,
            duration: watchedDuration,
            completed: false,
            startedAt: watchStartTime
          });
          existing.watchCount = existing.watchHistory.length;
        } else {
          // Same session - update last entry
          lastSession.watchedAt = now;
          lastSession.duration = watchedDuration;
        }
      } else {
        // First session
        existing.watchHistory.push({
          watchedAt: now,
          duration: watchedDuration,
          completed: false,
          startedAt: watchStartTime
        });
        existing.watchCount = existing.watchHistory.length;
      }
      
      existing.lastWatchedAt = now;
      existing.updatedAt = now;
      
      await existing.save();
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('endWatchSession error:', error);
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
