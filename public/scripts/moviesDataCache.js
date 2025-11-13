/**
 * Global state manager for Movies page data
 * Provides caching to avoid redundant API calls
 * Uses sessionStorage to persist across page reloads
 * Each profile has its own cache to prevent data mixing
 */
const MoviesDataCache = (() => {
  const CACHE_KEY_PREFIX = 'moviesPageCache_';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  let cache = null;
  let currentProfileId = null;

  // Helper to get current profile ID
  function getCurrentProfileId() {
    return localStorage.getItem('selectedProfileId') || 'default';
  }

  // Helper to get cache key for current profile
  function getCacheKey() {
    return CACHE_KEY_PREFIX + getCurrentProfileId();
  }

  // Load cache from sessionStorage on init
  function loadFromStorage() {
    try {
      const profileId = getCurrentProfileId();
      const cacheKey = getCacheKey();
      const stored = sessionStorage.getItem(cacheKey);
      
      if (stored) {
        cache = JSON.parse(stored);
        currentProfileId = profileId;
        console.log('[MoviesDataCache] Loaded from sessionStorage for profile:', profileId, cache ? 'success' : 'failed');
      } else {
        console.log('[MoviesDataCache] No cached data in sessionStorage for profile:', profileId);
        cache = {
          genres: null,
          genreData: null,
          alreadyWatched: null,
          timestamp: null
        };
        currentProfileId = profileId;
      }
    } catch (error) {
      console.error('[MoviesDataCache] Failed to load from sessionStorage:', error);
      cache = {
        genres: null,
        genreData: null,
        alreadyWatched: null,
        timestamp: null
      };
      currentProfileId = getCurrentProfileId();
    }
  }

  // Save cache to sessionStorage
  function saveToStorage() {
    try {
      const profileId = getCurrentProfileId();
      const cacheKey = getCacheKey();
      
      // Update current profile tracking
      currentProfileId = profileId;
      
      sessionStorage.setItem(cacheKey, JSON.stringify(cache));
      console.log('[MoviesDataCache] Saved to sessionStorage for profile:', profileId);
    } catch (error) {
      console.error('[MoviesDataCache] Failed to save to sessionStorage:', error);
    }
  }

  // Initialize cache
  loadFromStorage();

  return {
    /**
     * Check if cache exists and is valid
     */
    hasValidCache() {
      if (!cache.timestamp) {
        console.log('[MoviesDataCache] No timestamp - cache invalid');
        return false;
      }
      const age = Date.now() - cache.timestamp;
      const isValid = age < CACHE_DURATION && (cache.genres || cache.genreData);
      console.log('[MoviesDataCache] hasValidCache check:', {
        timestamp: cache.timestamp,
        age: age,
        ageMinutes: (age / 1000 / 60).toFixed(2),
        isValid: isValid,
        hasGenres: !!cache.genres,
        hasGenreData: !!cache.genreData
      });
      return isValid;
    },

    /**
     * Get cached data
     */
    get(key) {
      if (!this.hasValidCache()) return null;
      return cache[key];
    },

    /**
     * Get all cached data
     */
    getAll() {
      if (!this.hasValidCache()) return null;
      return { ...cache };
    },

    /**
     * Set cache data
     */
    set(key, data) {
      cache[key] = data;
      if (!cache.timestamp) {
        cache.timestamp = Date.now();
      }
      saveToStorage();
    },

    /**
     * Set multiple cache keys at once
     */
    setMultiple(data) {
      Object.keys(data).forEach(key => {
        cache[key] = data[key];
      });
      if (!cache.timestamp) {
        cache.timestamp = Date.now();
      }
      saveToStorage();
    },

    /**
     * Clear cache for current profile only
     */
    clear() {
      cache = {
        genres: null,
        genreData: null,
        alreadyWatched: null,
        timestamp: null
      };
      const cacheKey = getCacheKey();
      sessionStorage.removeItem(cacheKey);
      console.log('[MoviesDataCache] Cache cleared for profile:', currentProfileId);
    },

    /**
     * Clear ALL profile caches (called on logout)
     */
    clearAll() {
      // Clear current cache
      cache = {
        genres: null,
        genreData: null,
        alreadyWatched: null,
        timestamp: null
      };
      
      // Remove all profile caches from sessionStorage
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(CACHE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      console.log('[MoviesDataCache] All profile caches cleared:', keysToRemove.length, 'profiles');
    },

    /**
     * Get cache info for debugging
     */
    getInfo() {
      return {
        hasGenres: !!cache.genres,
        hasGenreData: !!cache.genreData,
        hasAlreadyWatched: !!cache.alreadyWatched,
        genreCount: cache.genres ? cache.genres.length : 0,
        timestamp: cache.timestamp,
        age: cache.timestamp ? Date.now() - cache.timestamp : null,
        isValid: this.hasValidCache()
      };
    }
  };
})();

// Listen for profile switch events to reload cache for new profile
window.addEventListener('profile-switched', () => {
  console.log('[MoviesDataCache] Profile switched, will load cache for new profile on next access');
  // Cache will auto-reload for new profile on next get/set operation
});

// Listen for logout events to clear ALL profile caches
window.addEventListener('user-logout', () => {
  console.log('[MoviesDataCache] User logged out, clearing all profile caches');
  MoviesDataCache.clearAll();
});

// Make it globally available
window.MoviesDataCache = MoviesDataCache;
