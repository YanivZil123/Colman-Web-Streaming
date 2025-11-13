/**
 * Global state manager for Series page data
 * Provides caching to avoid redundant API calls
 * Uses sessionStorage to persist across page reloads
 * Stores separate cache per profile
 */
const SeriesDataCache = (() => {
  const CACHE_KEY_PREFIX = 'seriesPageCache_';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  let cache = null;
  let currentProfileId = null;

  // Get current profile ID
  function getCurrentProfileId() {
    return localStorage.getItem('selectedProfileId') || 'default';
  }

  // Get cache key for current profile
  function getCacheKey() {
    const profileId = getCurrentProfileId();
    return CACHE_KEY_PREFIX + profileId;
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
        console.log(`[SeriesDataCache] Loaded from sessionStorage for profile ${profileId}:`, cache ? 'success' : 'failed');
      } else {
        console.log(`[SeriesDataCache] No cached data in sessionStorage for profile ${profileId}`);
        cache = {
          genres: null,
          genreData: null,
          alreadyWatched: null,
          timestamp: null
        };
        currentProfileId = profileId;
      }
    } catch (error) {
      console.error('[SeriesDataCache] Failed to load from sessionStorage:', error);
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
      console.log(`[SeriesDataCache] Saved to sessionStorage for profile ${profileId}`);
    } catch (error) {
      console.error('[SeriesDataCache] Failed to save to sessionStorage:', error);
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
        console.log('[SeriesDataCache] No timestamp - cache invalid');
        return false;
      }
      const age = Date.now() - cache.timestamp;
      const isValid = age < CACHE_DURATION && (cache.genres || cache.genreData);
      console.log('[SeriesDataCache] hasValidCache check:', {
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
     * Clear all cache (called on logout)
     */
    clear() {
      // Clear cache for current profile
      const cacheKey = getCacheKey();
      sessionStorage.removeItem(cacheKey);
      
      cache = {
        genres: null,
        genreData: null,
        alreadyWatched: null,
        timestamp: null
      };
      console.log(`[SeriesDataCache] Cache cleared for profile ${currentProfileId}`);
    },
    
    /**
     * Clear all caches for all profiles (called on logout)
     */
    clearAll() {
      // Clear all profile caches
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
      
      cache = {
        genres: null,
        genreData: null,
        alreadyWatched: null,
        timestamp: null
      };
      console.log('[SeriesDataCache] All profile caches cleared');
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
  console.log('[SeriesDataCache] Profile switched, will load cache for new profile on next access');
  // Cache will auto-reload for new profile on next get/set operation
});

// Listen for logout events to clear ALL profile caches
window.addEventListener('user-logout', () => {
  console.log('[SeriesDataCache] User logged out, clearing all profile caches');
  SeriesDataCache.clearAll();
});

// Make it globally available
window.SeriesDataCache = SeriesDataCache;
