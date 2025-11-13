import { nanoid } from 'nanoid';

class Like {
  constructor() {
    this.likes = [];
  }

  /**
   * Toggle like for a title by profile
   * @param {Object} likeData - { userId, profileId, titleId }
   * @returns {Object} { liked: boolean, like: Object|null }
   */
  toggle(likeData) {
    const { userId, profileId, titleId } = likeData;
    
    const existingIndex = this.likes.findIndex(l =>
      l.userId === userId &&
      l.profileId === profileId &&
      l.titleId === titleId
    );

    if (existingIndex !== -1) {
      // Unlike - remove the like
      const removed = this.likes.splice(existingIndex, 1)[0];
      return { liked: false, like: null };
    } else {
      // Like - add new like
      const like = {
        id: nanoid(),
        userId,
        profileId,
        titleId,
        createdAt: new Date().toISOString()
      };
      this.likes.push(like);
      return { liked: true, like };
    }
  }

  /**
   * Check if a title is liked by a profile
   * @param {string} userId - User ID
   * @param {string} profileId - Profile ID
   * @param {string} titleId - Title ID
   * @returns {boolean} True if liked
   */
  isLiked(userId, profileId, titleId) {
    return this.likes.some(l =>
      l.userId === userId &&
      l.profileId === profileId &&
      l.titleId === titleId
    );
  }

  /**
   * Get all likes for a profile
   * @param {string} userId - User ID
   * @param {string} profileId - Profile ID
   * @returns {Array} Array of likes
   */
  getByProfile(userId, profileId) {
    return this.likes.filter(l =>
      l.userId === userId &&
      l.profileId === profileId
    );
  }

  /**
   * Get all likes for a user (all profiles)
   * @param {string} userId - User ID
   * @returns {Array} Array of likes
   */
  getByUser(userId) {
    return this.likes.filter(l => l.userId === userId);
  }

  /**
   * Get all likes for a title
   * @param {string} titleId - Title ID
   * @returns {Array} Array of likes
   */
  getByTitle(titleId) {
    return this.likes.filter(l => l.titleId === titleId);
  }

  /**
   * Get all likes
   * @returns {Array} All likes
   */
  getAll() {
    return this.likes;
  }

  /**
   * Delete all likes for a profile
   * @param {string} userId - User ID
   * @param {string} profileId - Profile ID
   * @returns {number} Number of likes deleted
   */
  deleteByProfile(userId, profileId) {
    const initialLength = this.likes.length;
    this.likes = this.likes.filter(l =>
      !(l.userId === userId && l.profileId === profileId)
    );
    return initialLength - this.likes.length;
  }

  /**
   * Seed initial data
   */
  seed() {
    // Can add sample likes if needed
  }
}

export default new Like();
