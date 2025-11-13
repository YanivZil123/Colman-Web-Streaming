import Title from '../models/Title.js';
import { MovieDoc, SeriesDoc } from '../models/TitleDoc.js';
import { WatchHabitDoc } from '../models/WatchHabitsDoc.js';

export const getContinueWatching = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profileId = req.query.profileId || null;
    const limit = Math.min(parseInt(req.query.limit || '10'), 50);

    const query = {
      userId,
      profileId: profileId || null,
      watchedDuration: { $gt: 0 }
    };

    const habits = await WatchHabitDoc.find(query)
      .sort({ lastWatchedAt: -1 })
      .lean();

    const enrichedItems = [];
    const seenTitles = new Set();

    for (const habit of habits) {
      if (!habit.totalDuration || habit.totalDuration === 0) continue;
      
      const progressPercent = (habit.watchedDuration / habit.totalDuration) * 100;
      
      if (progressPercent <= 5 || progressPercent >= 95) continue;

      if (seenTitles.has(habit.titleId)) continue;

      let titleDoc = await MovieDoc.findOne({ id: habit.titleId }).lean();
      let isMovie = true;
      
      if (!titleDoc) {
        titleDoc = await SeriesDoc.findOne({ id: habit.titleId }).lean();
        isMovie = false;
      }

      if (!titleDoc) continue;

      seenTitles.add(habit.titleId);

      if (isMovie) {
        enrichedItems.push({
          type: 'movie',
          titleId: titleDoc.id,
          title: titleDoc.name,
          posterUrl: titleDoc.posterUrl || '/images/poster-placeholder.jpg',
          thumbnailUrl: titleDoc.thumbnailUrl || titleDoc.posterUrl || '/images/poster-placeholder.jpg',
          progressPercent: progressPercent,
          watchedDuration: habit.watchedDuration,
          totalDuration: habit.totalDuration,
          lastWatchedAt: habit.lastWatchedAt
        });
      } else {
        let targetEpisode = null;
        let targetEpisodeIndex = -1;

        if (habit.episodeId && titleDoc.episodes) {
          targetEpisodeIndex = titleDoc.episodes.findIndex(ep => ep.id === habit.episodeId);
          
          if (targetEpisodeIndex !== -1) {
            if (progressPercent >= 95 && targetEpisodeIndex < titleDoc.episodes.length - 1) {
              targetEpisode = titleDoc.episodes[targetEpisodeIndex + 1];
              targetEpisodeIndex = targetEpisodeIndex + 1;
            } else {
              targetEpisode = titleDoc.episodes[targetEpisodeIndex];
            }
          }
        }

        if (!targetEpisode && titleDoc.episodes && titleDoc.episodes.length > 0) {
          targetEpisode = titleDoc.episodes[0];
          targetEpisodeIndex = 0;
        }

        if (!targetEpisode) continue;

        let episodeProgressPercent = 0;
        if (targetEpisode.id === habit.episodeId) {
          episodeProgressPercent = progressPercent;
        }

        enrichedItems.push({
          type: 'series',
          titleId: titleDoc.id,
          seriesTitle: titleDoc.name,
          episodeId: targetEpisode.id,
          episodeTitle: targetEpisode.name || `Episode ${targetEpisode.episodeNumber || targetEpisodeIndex + 1}`,
          season: targetEpisode.season || 1,
          episodeNumber: targetEpisode.episodeNumber || targetEpisodeIndex + 1,
          thumbnailUrl: targetEpisode.thumbnailUrl || titleDoc.thumbnailUrl || titleDoc.posterUrl || '/images/poster-placeholder.jpg',
          progressPercent: episodeProgressPercent,
          watchedDuration: episodeProgressPercent > 0 ? habit.watchedDuration : 0,
          totalDuration: episodeProgressPercent > 0 ? habit.totalDuration : 0,
          lastWatchedAt: habit.lastWatchedAt
        });
      }

      if (enrichedItems.length >= limit) break;
    }

    return res.json({ items: enrichedItems });
  } catch (error) {
    console.error('getContinueWatching error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPersonalRecommendations = (req, res) => {
  try {
    (async () => {
      try {
        const movies = await MovieDoc.find().sort({ createdAt: -1 }).limit(2).lean();
        const series = await SeriesDoc.find().sort({ createdAt: -1 }).limit(2).lean();
        const docs = [...movies, ...series].slice(0, 4);
        const items = docs.map(mapTitleItem);
        return res.json({ items });
      } catch (err) {
        const titles = Title.getAll();
        const items = titles.slice(1, 5).map(mapTitleItem);
        return res.json({ items });
      }
    })();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPopular = (req, res) => {
  try {
    (async () => {
      try {
        const movies = await MovieDoc.find().sort({ createdAt: -1 }).limit(4).lean();
        const series = await SeriesDoc.find().sort({ createdAt: -1 }).limit(4).lean();
        const docs = [...movies, ...series].slice(0, 8);
        const items = docs.map(mapTitleItem);
        return res.json({ items });
      } catch (err) {
        const titles = Title.getAll();
        const items = titles.slice(0, 8).map(mapTitleItem);
        return res.json({ items });
      }
    })();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRecommendedForProfile = async (req, res) => {
  try {
    const { profileId } = req.query;
    const userId = req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!profileId) {
      // If no profileId, return empty recommendations
      return res.json({ items: [] });
    }
    
    // Step 2.1: Get watched titleIds for this profile
    const watchedTitleIds = await WatchHabitDoc.distinct('titleId', {
      userId,
      profileId,
      $or: [
        { watchedDuration: { $gt: 0 } },
        { watchCount: { $gt: 0 } }
      ]
    });
    
    if (!watchedTitleIds || watchedTitleIds.length === 0) {
      // No watch history - return empty recommendations
      return res.json({ items: [] });
    }
    
    // Step 2.2: Get actual titles from MongoDB to extract genres
    const watchedMovies = await MovieDoc.find({ id: { $in: watchedTitleIds } }).lean();
    const watchedSeries = await SeriesDoc.find({ id: { $in: watchedTitleIds } }).lean();
    const watchedTitles = [...watchedMovies, ...watchedSeries];
    
    // Extract all genres and count frequency
    const genreCounts = {};
    watchedTitles.forEach(title => {
      if (title.genres && Array.isArray(title.genres)) {
        title.genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });
    
    // Step 2.3: Find top genre(s) - get the most popular genre
    const genreEntries = Object.entries(genreCounts);
    if (genreEntries.length === 0) {
      // No genres found - return empty recommendations
      return res.json({ items: [] });
    }
    
    // Sort by frequency and get top genre
    genreEntries.sort((a, b) => b[1] - a[1]);
    const topGenre = genreEntries[0][0];
    
    // Query recommendations: titles matching top genre, excluding watched titles
    // Get both movies and series, sort by popularity (imdbRating), limit to 5
    const movieRecommendations = await MovieDoc.find({
      genres: { $in: [topGenre] },
      id: { $nin: watchedTitleIds }
    })
      .sort({ imdbRating: -1, year: -1 })
      .limit(5)
      .lean();
    
    const seriesRecommendations = await SeriesDoc.find({
      genres: { $in: [topGenre] },
      id: { $nin: watchedTitleIds }
    })
      .sort({ imdbRating: -1, year: -1 })
      .limit(5)
      .lean();
    
    // Combine and limit to top 5 total
    const allRecommendations = [...movieRecommendations, ...seriesRecommendations]
      .sort((a, b) => {
        const ratingA = a.imdbRating || 0;
        const ratingB = b.imdbRating || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return (b.year || 0) - (a.year || 0);
      })
      .slice(0, 5);
    
    const items = allRecommendations.map(mapTitleItem);
    
    return res.json({ items });
  } catch (error) {
    console.error('getRecommendedForProfile error:', error);
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
    thumbnailUrl: normalizeAsset(t.thumbnailUrl)
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
