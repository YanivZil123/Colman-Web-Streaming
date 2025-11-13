import { WatchHabitDoc } from '../models/WatchHabitsDoc.js';
import WatchHabits from '../models/WatchHabits.js';
import Like from '../models/Like.js';

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
    const { userId, profileId, titleId, completed, search, page = '1', limit = '20' } = req.query;
    
    const filters = {};
    if (userId) filters.userId = userId;
    if (profileId) filters.profileId = profileId;
    if (titleId) filters.titleId = titleId;
    if (completed !== undefined) filters.completed = completed === 'true';
    if (search) filters.search = search;

    let habits = WatchHabits.findAll(filters);
    
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
      profileId: profileId || null,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null,
      watchedDuration: watchedDuration || 0,
      totalDuration: totalDuration || 0,
      completed: completed || false,
      lastWatchedAt: new Date(),
      watchCount: 0,
      watchHistory: [] // Initialize empty array
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
    
    // Ensure watchHistory exists before deriving watchCount
    if (!habit.watchHistory) {
      habit.watchHistory = [];
    }
    
    // watchCount should be derived from watchHistory.length, not manually set
    // Only allow manual setting if explicitly provided (for backward compatibility)
    if (watchCount !== undefined) {
      habit.watchCount = watchCount;
    } else {
      habit.watchCount = habit.watchHistory.length;
    }
    
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
      profileId: profileId || null,
      titleId,
      episodeId: episodeId || null,
      profileId: profileId || null
    };
    
    // Use findOne first to check if exists, then update appropriately
    let habit = await WatchHabitDoc.findOne(query);
    
    if (habit) {
      // Update existing habit
      habit.watchedDuration = watchedDuration || 0;
      habit.totalDuration = totalDuration || 0;
      habit.completed = completed || false;
      habit.lastWatchedAt = new Date();
      habit.updatedAt = new Date();
      // Ensure watchHistory exists
      if (!habit.watchHistory) {
        habit.watchHistory = [];
      }
      // watchCount derived from watchHistory.length
      habit.watchCount = habit.watchHistory.length;
      await habit.save();
      habit = habit.toObject();
    } else {
      // Create new habit
      habit = await WatchHabitDoc.create({
        userId: req.session.user.id,
        titleId,
        episodeId: episodeId || null,
        profileId: profileId || null,
        watchedDuration: watchedDuration || 0,
        totalDuration: totalDuration || 0,
        completed: completed || false,
        lastWatchedAt: new Date(),
        watchCount: 0,
        watchHistory: []
      });
      habit = habit.toObject();
    }
    
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
    const { profileId, date } = req.query; // Optional: filter by profileId and date
    
    // Only allow users to see their own stats unless admin
    if (userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const query = { userId };
    if (profileId !== undefined) {
      query.profileId = profileId || null;
    }
    
    const userHabits = await WatchHabitDoc.find(query).lean();
    
    // Calculate daily statistics if date is provided
    let dailyWatches = 0;
    let dailyWatchTime = 0;
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      userHabits.forEach(habit => {
        if (habit.watchHistory && habit.watchHistory.length > 0) {
          habit.watchHistory.forEach(event => {
            const eventDate = new Date(event.watchedAt);
            if (eventDate >= startOfDay && eventDate <= endOfDay) {
              dailyWatches++;
              dailyWatchTime += event.duration || 0;
            }
          });
        }
      });
    }
    
    // Calculate total statistics from watch history
    let totalWatchSessions = 0;
    let totalWatchTime = 0;
    userHabits.forEach(habit => {
      if (habit.watchHistory && habit.watchHistory.length > 0) {
        totalWatchSessions += habit.watchHistory.length;
        habit.watchHistory.forEach(event => {
          totalWatchTime += event.duration || 0;
        });
      } else {
        // Fallback to watchedDuration for old records without history
        totalWatchTime += habit.watchedDuration || 0;
      }
    });
    
    const stats = {
      totalWatched: userHabits.length, // Number of unique titles watched
      completed: userHabits.filter(h => h.completed).length,
      inProgress: userHabits.filter(h => !h.completed && h.watchedDuration > 0).length,
      totalWatchTime: totalWatchTime,
      totalWatchSessions: totalWatchSessions, // Total number of watch sessions
      dailyWatches: date ? dailyWatches : undefined, // Number of watches on specific date
      dailyWatchTime: date ? dailyWatchTime : undefined // Total watch time on specific date
    };
    
    res.json(stats);
  } catch (error) {
    console.error('getUserStats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get daily watch statistics for a profile
 */
export const getDailyWatchStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.session.user.id;
    const { profileId, date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD)' });
    }
    
    // Only allow users to see their own stats unless admin
    if (userId !== req.session.user.id && req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const query = { userId };
    if (profileId !== undefined) {
      query.profileId = profileId || null;
    }
    
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const userHabits = await WatchHabitDoc.find(query).lean();
    
    const dailyStats = {
      date: date,
      totalWatches: 0,
      totalWatchTime: 0,
      completedWatches: 0,
      titles: [] // Array of titles watched that day
    };
    
    const titleMap = new Map(); // Track unique titles watched
    
    userHabits.forEach(habit => {
      if (habit.watchHistory && habit.watchHistory.length > 0) {
        habit.watchHistory.forEach(event => {
          const eventDate = new Date(event.watchedAt);
          if (eventDate >= startOfDay && eventDate <= endOfDay) {
            dailyStats.totalWatches++;
            dailyStats.totalWatchTime += event.duration || 0;
            if (event.completed) {
              dailyStats.completedWatches++;
            }
            
            // Track unique titles
            const titleKey = `${habit.titleId}-${habit.episodeId || 'movie'}`;
            if (!titleMap.has(titleKey)) {
              titleMap.set(titleKey, {
                titleId: habit.titleId,
                episodeId: habit.episodeId,
                watchCount: 0
              });
            }
            const titleInfo = titleMap.get(titleKey);
            titleInfo.watchCount++;
          }
        });
      }
    });
    
    dailyStats.titles = Array.from(titleMap.values());
    
    res.json(dailyStats);
  } catch (error) {
    console.error('getDailyWatchStats error:', error);
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
