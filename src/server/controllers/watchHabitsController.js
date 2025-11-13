import { WatchHabitDoc } from '../models/WatchHabitsDoc.js';

/**
 * Get all watch habits with optional filters
 */
export const getWatchHabits = async (req, res) => {
  try {
    const { userId, titleId, completed, search, page = '1', limit = '20', profileId } = req.query;
    
    const query = {};
    if (userId) query.userId = userId;
    if (titleId) query.titleId = titleId;
    if (completed !== undefined) query.completed = completed === 'true';
    if (profileId !== undefined) query.profileId = profileId || null;
    
    // Search functionality
    if (search) {
      query.$or = [
        { userId: { $regex: search, $options: 'i' } },
        { titleId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const habits = await WatchHabitDoc.find(query)
      .sort({ lastWatchedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    const total = await WatchHabitDoc.countDocuments(query);
    
    res.json({
      items: habits,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('getWatchHabits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get watch habit by ID
 */
export const getWatchHabitById = async (req, res) => {
  try {
    const habit = await WatchHabitDoc.findById(req.params.id).lean();
    
    if (!habit) {
      return res.status(404).json({ error: 'Watch habit not found' });
    }
    
    res.json(habit);
  } catch (error) {
    console.error('getWatchHabitById error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create new watch habit
 */
export const createWatchHabit = async (req, res) => {
  try {
    const { titleId, episodeId, watchedDuration, totalDuration, completed, profileId } = req.body;
    
    if (!titleId) {
      return res.status(400).json({ error: 'Title ID is required' });
    }
    
    const habit = await WatchHabitDoc.create({
      userId: req.session.user.id,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null,
      watchedDuration: watchedDuration || 0,
      totalDuration: totalDuration || 0,
      completed: completed || false,
      lastWatchedAt: new Date(),
      watchCount: 1
    });
    
    res.status(201).json(habit.toObject());
  } catch (error) {
    console.error('createWatchHabit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update watch habit
 */
export const updateWatchHabit = async (req, res) => {
  try {
    const habit = await WatchHabitDoc.findById(req.params.id);
    
    if (!habit) {
      return res.status(404).json({ error: 'Watch habit not found' });
    }
    
    // Check ownership
    if (habit.userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { watchedDuration, totalDuration, completed, episodeId, watchCount, profileId } = req.body;
    
    if (watchedDuration !== undefined) habit.watchedDuration = watchedDuration;
    if (totalDuration !== undefined) habit.totalDuration = totalDuration;
    if (completed !== undefined) habit.completed = completed;
    if (episodeId !== undefined) habit.episodeId = episodeId;
    if (profileId !== undefined) habit.profileId = profileId || null;
    if (watchCount !== undefined) habit.watchCount = watchCount;
    
    habit.lastWatchedAt = new Date();
    habit.updatedAt = new Date();
    await habit.save();
    
    res.json(habit.toObject());
  } catch (error) {
    console.error('updateWatchHabit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete watch habit
 */
export const deleteWatchHabit = async (req, res) => {
  try {
    const habit = await WatchHabitDoc.findById(req.params.id);
    
    if (!habit) {
      return res.status(404).json({ error: 'Watch habit not found' });
    }
    
    // Check ownership
    if (habit.userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await WatchHabitDoc.findByIdAndDelete(req.params.id);
    
    res.json({ ok: true, message: 'Watch habit deleted' });
  } catch (error) {
    console.error('deleteWatchHabit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update or create watch progress (upsert)
 */
export const upsertWatchProgress = async (req, res) => {
  try {
    const { titleId, episodeId, watchedDuration, totalDuration, completed, profileId } = req.body;
    
    if (!titleId) {
      return res.status(400).json({ error: 'Title ID is required' });
    }
    
    const query = {
      userId: req.session.user.id,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null
    };
    
    const habit = await WatchHabitDoc.findOneAndUpdate(
      query,
      {
        $set: {
          watchedDuration: watchedDuration || 0,
          totalDuration: totalDuration || 0,
          completed: completed || false,
          lastWatchedAt: new Date(),
          updatedAt: new Date()
        },
        $inc: { watchCount: 1 },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true, new: true }
    ).lean();
    
    res.json(habit);
  } catch (error) {
    console.error('upsertWatchProgress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get continue watching list
 */
export const getContinueWatching = async (req, res) => {
  try {
    const { limit = '10', profileId } = req.query;
    const limitNum = parseInt(limit);
    
    const query = {
      userId: req.session.user.id,
      completed: false,
      watchedDuration: { $gt: 0 }
    };
    
    if (profileId !== undefined) {
      query.profileId = profileId || null;
    }
    
    const habits = await WatchHabitDoc.find(query)
      .sort({ lastWatchedAt: -1 })
      .limit(limitNum)
      .lean();
    
    res.json({ items: habits });
  } catch (error) {
    console.error('getContinueWatching error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user watch statistics
 */
export const getUserStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.session.user.id;
    
    // Only allow users to see their own stats unless admin
    if (userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const userHabits = await WatchHabitDoc.find({ userId }).lean();
    
    const stats = {
      totalWatched: userHabits.length,
      completed: userHabits.filter(h => h.completed).length,
      inProgress: userHabits.filter(h => !h.completed && h.watchedDuration > 0).length,
      totalWatchTime: userHabits.reduce((sum, h) => sum + (h.watchedDuration || 0), 0)
    };
    
    res.json(stats);
  } catch (error) {
    console.error('getUserStats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
