/**
 * Centralized cache invalidation manager
 * Coordinates cache clearing across all page caches when backend events occur
 */
const CacheInvalidator = (() => {
  const LAST_CONTENT_UPDATE_KEY = 'lastContentUpdate';
  const LAST_POPULARITY_UPDATE_KEY = 'lastPopularityUpdate';
  const LAST_WATCH_UPDATE_KEY = 'lastWatchUpdate';

  return {
    /**
     * Call when admin uploads new content
     * Invalidates ALL page caches since content catalog changed
     */
    onContentUploaded() {
      console.log('[CacheInvalidator] Content uploaded - clearing all caches');
      
      // Clear all page caches
      if (window.HomeDataCache) HomeDataCache.clear();
      if (window.SeriesDataCache) SeriesDataCache.clear();
      if (window.MoviesDataCache) MoviesDataCache.clear();
      
      // Mark timestamp of content update
      sessionStorage.setItem(LAST_CONTENT_UPDATE_KEY, Date.now().toString());
    },

    /**
     * Call when user likes/unlikes a title
     * Invalidates Home cache (popularity rankings changed)
     */
    onPopularityChanged() {
      console.log('[CacheInvalidator] Popularity changed - clearing Home cache');
      
      // Clear Home cache (Most Popular sections affected)
      if (window.HomeDataCache) HomeDataCache.clear();
      
      // Mark timestamp of popularity update
      sessionStorage.setItem(LAST_POPULARITY_UPDATE_KEY, Date.now().toString());
    },

    /**
     * Call when user watches content or updates watch progress
     * Invalidates Continue Watching and Already Watched sections
     */
    onWatchProgressChanged() {
      console.log('[CacheInvalidator] Watch progress changed - clearing relevant caches');
      
      // Clear all caches since Continue Watching and Already Watched are everywhere
      if (window.HomeDataCache) HomeDataCache.clear();
      if (window.SeriesDataCache) SeriesDataCache.clear();
      if (window.MoviesDataCache) MoviesDataCache.clear();
      
      // Mark timestamp of watch update
      sessionStorage.setItem(LAST_WATCH_UPDATE_KEY, Date.now().toString());
    },

    /**
     * Call when admin deletes content
     * Invalidates ALL page caches
     */
    onContentDeleted() {
      console.log('[CacheInvalidator] Content deleted - clearing all caches');
      
      if (window.HomeDataCache) HomeDataCache.clear();
      if (window.SeriesDataCache) SeriesDataCache.clear();
      if (window.MoviesDataCache) MoviesDataCache.clear();
      
      sessionStorage.setItem(LAST_CONTENT_UPDATE_KEY, Date.now().toString());
    },

    /**
     * Call when admin updates content metadata
     * Invalidates ALL page caches
     */
    onContentUpdated() {
      console.log('[CacheInvalidator] Content metadata updated - clearing all caches');
      
      if (window.HomeDataCache) HomeDataCache.clear();
      if (window.SeriesDataCache) SeriesDataCache.clear();
      if (window.MoviesDataCache) MoviesDataCache.clear();
      
      sessionStorage.setItem(LAST_CONTENT_UPDATE_KEY, Date.now().toString());
    },

    /**
     * Get info about last updates
     */
    getUpdateInfo() {
      return {
        lastContentUpdate: sessionStorage.getItem(LAST_CONTENT_UPDATE_KEY),
        lastPopularityUpdate: sessionStorage.getItem(LAST_POPULARITY_UPDATE_KEY),
        lastWatchUpdate: sessionStorage.getItem(LAST_WATCH_UPDATE_KEY)
      };
    }
  };
})();

// Make it globally available
window.CacheInvalidator = CacheInvalidator;
