import WatchHabits from '../models/WatchHabits.js';

/**
 * Get all watch habits with optional filters
 */
export const getWatchHabits = (req, res) => {
  try {
    const { userId, titleId, completed, search, page = '1', limit = '20', profileId } = req.query;
    
    const filters = {};
    if (userId) filters.userId = userId;
    if (titleId) filters.titleId = titleId;
    if (completed !== undefined) filters.completed = completed === 'true';
    if (search) filters.search = search;
    if (profileId !== undefined) filters.profileId = profileId || null;

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
    const { titleId, episodeId, watchedDuration, totalDuration, completed, profileId } = req.body;
    
    if (!titleId) {
      return res.status(400).json({ error: 'Title ID is required' });
    }
    
    const habitData = {
      userId: req.session.user.id,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null,
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
    
    const { watchedDuration, totalDuration, completed, episodeId, watchCount, profileId } = req.body;
    const updateData = {};
    
    if (watchedDuration !== undefined) updateData.watchedDuration = watchedDuration;
    if (totalDuration !== undefined) updateData.totalDuration = totalDuration;
    if (completed !== undefined) updateData.completed = completed;
    if (episodeId !== undefined) updateData.episodeId = episodeId;
    if (profileId !== undefined) updateData.profileId = profileId || null;
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
    const { titleId, episodeId, watchedDuration, totalDuration, completed, profileId } = req.body;
    
    if (!titleId) {
      return res.status(400).json({ error: 'Title ID is required' });
    }
    
    const data = {
      userId: req.session.user.id,
      titleId,
      episodeId: episodeId || null,
      watchedDuration: watchedDuration || 0,
      totalDuration: totalDuration || 0,
      completed: completed || false,
      profileId: profileId || null
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
    const { limit = '10', profileId } = req.query;
    const habits = WatchHabits.getContinueWatching(req.session.user.id, parseInt(limit), profileId !== undefined ? (profileId || null) : undefined);
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
    
    // Only allow users to see their own stats unless admin
    if (userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const stats = WatchHabits.getUserStats(userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
