import { nanoid } from 'nanoid';

class WatchHabits {
  constructor() {
    this.watchHabits = [];
  }

  /**
   * Create a new watch habit record
   * @param {Object} habitData - { userId, titleId, watchedDuration, totalDuration, lastWatchedAt, completed, episodeId }
   * @returns {Object} Created watch habit
   */
  create(habitData) {
    const habit = {
      id: nanoid(),
      userId: habitData.userId,
      titleId: habitData.titleId,
      episodeId: habitData.episodeId || null,
      profileId: habitData.profileId ? String(habitData.profileId) : null,
      watchedDuration: habitData.watchedDuration || 0,
      totalDuration: habitData.totalDuration || 0,
      completed: habitData.completed || false,
      lastWatchedAt: habitData.lastWatchedAt || new Date().toISOString(),
      watchCount: habitData.watchCount || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.watchHabits.push(habit);
    return habit;
  }

  /**
   * Find all watch habits with optional filters
   * @param {Object} filters - { userId, titleId, completed, search }
   * @returns {Array} Array of watch habits
   */
  findAll(filters = {}) {
    let results = this.watchHabits.slice();

    // Filter by userId
    if (filters.userId) {
      results = results.filter(h => h.userId === filters.userId);
    }

    // Filter by titleId
    if (filters.titleId) {
      results = results.filter(h => h.titleId === filters.titleId);
    }

    if (filters.profileId !== undefined) {
      const pid = filters.profileId === null ? null : String(filters.profileId);
      results = results.filter(h => (pid === null ? !h.profileId : h.profileId === pid));
    }

    // Filter by completed status
    if (filters.completed !== undefined) {
      results = results.filter(h => h.completed === filters.completed);
    }

    // Search by userId (main search field)
    if (filters.search) {
      const searchLower = String(filters.search).toLowerCase();
      results = results.filter(h =>
        h.userId.toLowerCase().includes(searchLower) ||
        h.titleId.toLowerCase().includes(searchLower)
      );
    }

    return results;
  }

  /**
   * Find watch habit by ID
   * @param {string} id - Watch habit ID
   * @returns {Object|null} Watch habit or null
   */
  findById(id) {
    return this.watchHabits.find(h => h.id === id) || null;
  }

  /**
   * Find watch habit by userId and titleId
   * @param {string} userId - User ID
   * @param {string} titleId - Title ID
   * @param {string} episodeId - Optional episode ID
   * @returns {Object|null} Watch habit or null
   */
  findByUserAndTitle(userId, titleId, episodeId = null, profileId = undefined) {
    return this.watchHabits.find(h =>
      h.userId === userId &&
      h.titleId === titleId &&
      h.episodeId === episodeId &&
      (profileId === undefined ? true : (profileId === null ? !h.profileId : h.profileId === profileId))
    ) || null;
  }

  /**
   * Update watch habit
   * @param {string} id - Watch habit ID
   * @param {Object} updateData - Fields to update
   * @returns {Object|null} Updated watch habit or null
   */
  update(id, updateData) {
    const habit = this.findById(id);
    if (!habit) return null;

    if (updateData.watchedDuration !== undefined) habit.watchedDuration = updateData.watchedDuration;
    if (updateData.totalDuration !== undefined) habit.totalDuration = updateData.totalDuration;
    if (updateData.completed !== undefined) habit.completed = updateData.completed;
    if (updateData.lastWatchedAt !== undefined) habit.lastWatchedAt = updateData.lastWatchedAt;
    if (updateData.watchCount !== undefined) habit.watchCount = updateData.watchCount;
    if (updateData.episodeId !== undefined) habit.episodeId = updateData.episodeId;
    if (updateData.profileId !== undefined) habit.profileId = updateData.profileId ? String(updateData.profileId) : null;

    habit.updatedAt = new Date().toISOString();

    return habit;
  }

  /**
   * Delete watch habit by ID
   * @param {string} id - Watch habit ID
   * @returns {boolean} True if deleted, false otherwise
   */
  delete(id) {
    const index = this.watchHabits.findIndex(h => h.id === id);
    if (index === -1) return false;

    this.watchHabits.splice(index, 1);
    return true;
  }

  /**
   * Update or create watch progress
   * @param {Object} data - { userId, titleId, episodeId, watchedDuration, totalDuration, completed }
   * @returns {Object} Updated or created watch habit
   */
  upsertProgress(data) {
    const prof = data.profileId ? String(data.profileId) : null;
    const existing = this.findByUserAndTitle(data.userId, data.titleId, data.episodeId, prof);

    if (existing) {
      // Update existing habit
      existing.watchedDuration = data.watchedDuration;
      existing.totalDuration = data.totalDuration || existing.totalDuration;
      existing.completed = data.completed || false;
      existing.lastWatchedAt = new Date().toISOString();
      existing.watchCount += 1;
      existing.profileId = prof;
      existing.updatedAt = new Date().toISOString();
      return existing;
    } else {
      // Create new habit
      return this.create({ ...data, profileId: prof });
    }
  }

  /**
   * Get continue watching list for user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of items
   * @returns {Array} Array of incomplete watch habits
   */
  getContinueWatching(userId, limit = 10, profileId = undefined) {
    return this.watchHabits
      .filter(h =>
        h.userId === userId &&
        !h.completed &&
        h.watchedDuration > 0 &&
        (profileId === undefined ? true : (profileId === null ? !h.profileId : h.profileId === profileId))
      )
      .sort((a, b) => new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt))
      .slice(0, limit);
  }

  /**
   * Get watch statistics for user
   * @param {string} userId - User ID
   * @returns {Object} Watch statistics
   */
  getUserStats(userId) {
    const userHabits = this.watchHabits.filter(h => h.userId === userId);
    
    return {
      totalWatched: userHabits.length,
      completed: userHabits.filter(h => h.completed).length,
      inProgress: userHabits.filter(h => !h.completed && h.watchedDuration > 0).length,
      totalWatchTime: userHabits.reduce((sum, h) => sum + h.watchedDuration, 0)
    };
  }

  /**
   * Get all watch habits
   * @returns {Array} All watch habits
   */
  getAll() {
    return this.watchHabits;
  }

  /**
   * Seed initial data
   */
  seed() {
    // Add some sample watch habits if needed
    if (this.watchHabits.length === 0) {
      this.create({
        userId: 'sample-user-id',
        titleId: 'sample-title-id',
        watchedDuration: 300,
        totalDuration: 600,
        completed: false,
        watchCount: 1
      });
    }
  }
}

export default new WatchHabits();
