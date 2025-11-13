import WatchHabits from '../models/WatchHabits.js';
import Like from '../models/Like.js';

/**
 * Get all watch habits with optional filters
 */
export const getWatchHabits = (req, res) => {
  try {
    const { userId, profileId, titleId, completed, search, page = '1', limit = '20' } = req.query;
    
    const filters = {};
    if (userId) filters.userId = userId;
    if (profileId) filters.profileId = profileId;
    if (titleId) filters.titleId = titleId;
    if (completed !== undefined) filters.completed = completed === 'true';
    if (search) filters.search = search;

    let habits = WatchHabits.findAll(filters);
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedResults = habits.slice(startIndex, endIndex);
    
    res.json({
      items: paginatedResults,
      total: habits.length,
      page: pageNum,
      totalPages: Math.ceil(habits.length / limitNum)
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get watch habit by ID
 */
export const getWatchHabitById = (req, res) => {
  try {
    const habit = WatchHabits.findById(req.params.id);
    
    if (!habit) {
      return res.status(404).json({ error: 'Watch habit not found' });
    }
    
    res.json(habit);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create new watch habit
 */
export const createWatchHabit = (req, res) => {
  try {
    const { titleId, profileId, episodeId, watchedDuration, totalDuration, completed } = req.body;
    
    if (!titleId) {
      return res.status(400).json({ error: 'Title ID is required' });
    }
    
    const habitData = {
      userId: req.session.user.id,
      profileId: profileId || null,
      titleId,
      episodeId: episodeId || null,
      watchedDuration: watchedDuration || 0,
      totalDuration: totalDuration || 0,
      completed: completed || false
    };
    
    const habit = WatchHabits.create(habitData);
    res.status(201).json(habit);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update watch habit
 */
export const updateWatchHabit = (req, res) => {
  try {
    const habit = WatchHabits.findById(req.params.id);
    
    if (!habit) {
      return res.status(404).json({ error: 'Watch habit not found' });
    }
    
    // Check ownership
    if (habit.userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { watchedDuration, totalDuration, completed, episodeId, watchCount } = req.body;
    const updateData = {};
    
    if (watchedDuration !== undefined) updateData.watchedDuration = watchedDuration;
    if (totalDuration !== undefined) updateData.totalDuration = totalDuration;
    if (completed !== undefined) updateData.completed = completed;
    if (episodeId !== undefined) updateData.episodeId = episodeId;
    if (watchCount !== undefined) updateData.watchCount = watchCount;
    
    updateData.lastWatchedAt = new Date().toISOString();
    
    const updated = WatchHabits.update(req.params.id, updateData);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete watch habit
 */
export const deleteWatchHabit = (req, res) => {
  try {
    const habit = WatchHabits.findById(req.params.id);
    
    if (!habit) {
      return res.status(404).json({ error: 'Watch habit not found' });
    }
    
    // Check ownership
    if (habit.userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const deleted = WatchHabits.delete(req.params.id);
    
    if (deleted) {
      res.json({ ok: true, message: 'Watch habit deleted' });
    } else {
      res.status(404).json({ error: 'Watch habit not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update or create watch progress (upsert)
 */
export const upsertWatchProgress = (req, res) => {
  try {
    const { titleId, profileId, episodeId, watchedDuration, totalDuration, completed } = req.body;
    
    if (!titleId) {
      return res.status(400).json({ error: 'Title ID is required' });
    }
    
    const data = {
      userId: req.session.user.id,
      profileId: profileId || null,
      titleId,
      episodeId: episodeId || null,
      watchedDuration: watchedDuration || 0,
      totalDuration: totalDuration || 0,
      completed: completed || false
    };
    
    const habit = WatchHabits.upsertProgress(data);
    res.json(habit);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get continue watching list
 */
export const getContinueWatching = (req, res) => {
  try {
    const { profileId, limit = '10' } = req.query;
    const habits = WatchHabits.getContinueWatching(
      req.session.user.id, 
      profileId || null,
      parseInt(limit)
    );
    res.json({ items: habits });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user watch statistics
 */
export const getUserStats = (req, res) => {
  try {
    const userId = req.params.userId || req.session.user.id;
    const { profileId } = req.query;
    
    // Only allow users to see their own stats unless admin
    if (userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const stats = WatchHabits.getUserStats(userId, profileId || null);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get comprehensive profile watch habits (watched + liked content)
 */
export const getProfileHabits = (req, res) => {
  try {
    const { profileId } = req.params;
    const userId = req.session.user.id;
    
    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }
    
    // Get watched content for this profile
    const watched = WatchHabits.findAll({ 
      userId, 
      profileId, 
      completed: true 
    });
    
    // Get in-progress content
    const inProgress = WatchHabits.findAll({ 
      userId, 
      profileId, 
      completed: false 
    }).filter(h => h.watchedDuration > 0);
    
    // Get liked content for this profile
    const liked = Like.getByProfile(userId, profileId);
    
    // Get stats
    const stats = WatchHabits.getUserStats(userId, profileId);
    
    res.json({
      profileId,
      watched: {
        items: watched,
        total: watched.length
      },
      inProgress: {
        items: inProgress,
        total: inProgress.length
      },
      liked: {
        items: liked,
        total: liked.length
      },
      stats
    });
  } catch (error) {
    console.error('Get profile habits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
