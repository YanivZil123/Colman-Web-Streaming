import Title from '../models/Title.js';
import { MovieDoc, SeriesDoc } from '../models/TitleDoc.js';
import WatchHabits from '../models/WatchHabits.js';

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

export const getProgress = (req, res) => {
  try {
    const { titleId, episodeId } = req.query;
    if (!titleId) return res.status(400).json({ error: 'titleId is required' });
    const profileId = req.query.profileId ? String(req.query.profileId) : null;
    const userId = req.session.user.id;
    let habit = null;
    if (episodeId) {
      habit = WatchHabits.findByUserAndTitle(userId, titleId, episodeId, profileId);
    } else {
      const matches = WatchHabits.findAll({ userId, titleId, profileId }) || [];
      if (matches.length) {
        habit = matches.sort((a, b) => new Date(b.lastWatchedAt || 0) - new Date(a.lastWatchedAt || 0))[0];
      } else {
        habit = WatchHabits.findByUserAndTitle(userId, titleId, null, profileId);
      }
    }
    if (!habit) return res.json({});
    res.json({ positionSec: habit.watchedDuration || 0, totalDurationSec: habit.totalDuration || 0, episodeId: habit.episodeId || null });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProgress = (req, res) => {
  try {
    const { titleId, episodeId, positionSec, durationSec, profileId: rawProfileId } = req.body || {};
    if (!titleId) return res.status(400).json({ error: 'titleId is required' });
    const userId = req.session.user.id;
    const profileId = rawProfileId ? String(rawProfileId) : null;
    const existing = WatchHabits.findByUserAndTitle(userId, titleId, episodeId || null, profileId);
    const watchedDuration = Number(positionSec) || 0;
    const totalDuration = Number(durationSec) || 0;
    if (existing) {
      WatchHabits.update(existing.id, { watchedDuration, totalDuration: totalDuration || existing.totalDuration, completed: false, lastWatchedAt: new Date().toISOString(), profileId });
      return res.json({ ok: true, positionSec: watchedDuration });
    }
    WatchHabits.create({ userId, titleId, episodeId: episodeId || null, watchedDuration, totalDuration, completed: false, profileId });
    res.json({ ok: true, positionSec: watchedDuration });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markFinished = (req, res) => {
  try {
    const { titleId, episodeId, durationSec, profileId: rawProfileId } = req.body || {};
    if (!titleId) return res.status(400).json({ error: 'titleId is required' });
    const userId = req.session.user.id;
    const profileId = rawProfileId ? String(rawProfileId) : null;
    const targetDuration = Number(durationSec) || 0;
    const existing = WatchHabits.findByUserAndTitle(userId, titleId, episodeId || null, profileId);
    if (existing) {
      WatchHabits.update(existing.id, { watchedDuration: targetDuration, totalDuration: targetDuration || existing.totalDuration, completed: true, lastWatchedAt: new Date().toISOString(), profileId });
      return res.json({ ok: true });
    }
    WatchHabits.create({ userId, titleId, episodeId: episodeId || null, watchedDuration: targetDuration, totalDuration: targetDuration, completed: true, profileId });
    res.json({ ok: true });
  } catch (error) {
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
