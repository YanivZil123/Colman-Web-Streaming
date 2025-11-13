/**
 * Staggered data loader for Home page
 * Loads high-priority content first, then lazy-loads the rest
 */
const HomeDataLoader = (() => {
  
  /**
   * Load high-priority data (Continue Watching + Hero)
   * This should load very fast
   */
  async function loadPriorityData() {
    if (HomeDataCache.isLoadingSection('continueWatching')) {
      console.log('[HomeDataLoader] Priority data already loading');
      return HomeDataCache.get('continueWatching');
    }

    HomeDataCache.setLoading('continueWatching', true);

    try {
      const response = await api.get('/api/home/continue-watching?limit=10');
      const data = await response.json();
      
      HomeDataCache.set('continueWatching', data.items || []);
      return data.items || [];
    } catch (error) {
      console.error('[HomeDataLoader] Failed to load priority data:', error);
      return [];
    } finally {
      HomeDataCache.setLoading('continueWatching', false);
    }
  }

  /**
   * Load low-priority data (Genre recommendations)
   * This can load in the background
   */
  async function loadRecommendations() {
    if (HomeDataCache.isLoadingSection('recommendations')) {
      console.log('[HomeDataLoader] Recommendations already loading');
      return HomeDataCache.get('recommendations');
    }

    HomeDataCache.setLoading('recommendations', true);

    try {
      // Load genres first
      let genres = HomeDataCache.get('genres');
      if (!genres) {
        const genresResponse = await api.get('/api/genres');
        const genresData = await genresResponse.json();
        genres = genresData.items || [];
        HomeDataCache.set('genres', genres);
      }

      return genres;
    } catch (error) {
      console.error('[HomeDataLoader] Failed to load recommendations:', error);
      return [];
    } finally {
      HomeDataCache.setLoading('recommendations', false);
    }
  }

  /**
   * Main loading orchestrator
   * Implements the warm vs cold load strategy
   */
  async function load(options = {}) {
    const { onPriorityLoaded, onRecommendationsLoaded, forceRefresh = false } = options;

    // Check for warm load (cached data exists)
    if (!forceRefresh && HomeDataCache.hasValidCache()) {
      console.log('[HomeDataLoader] WARM LOAD - Using cached data');
      
      const cachedData = HomeDataCache.getAll();
      
      // Immediately return cached priority data
      if (onPriorityLoaded && cachedData.continueWatching) {
        onPriorityLoaded(cachedData.continueWatching);
      }

      // Immediately return cached recommendations
      if (onRecommendationsLoaded && cachedData.genres) {
        onRecommendationsLoaded(cachedData.genres);
      }

      return {
        continueWatching: cachedData.continueWatching || [],
        genres: cachedData.genres || [],
        cached: true
      };
    }

    // Cold load - fetch from API
    console.log('[HomeDataLoader] COLD LOAD - Fetching from API');

    // Step 1: Load and render priority content first
    const continueWatching = await loadPriorityData();
    if (onPriorityLoaded) {
      onPriorityLoaded(continueWatching);
    }

    // Step 2: Load recommendations in background (non-blocking)
    const genres = await loadRecommendations();
    if (onRecommendationsLoaded) {
      onRecommendationsLoaded(genres);
    }

    return {
      continueWatching,
      genres,
      cached: false
    };
  }

  /**
   * Force refresh (clears cache and reloads)
   */
  async function refresh(options = {}) {
    HomeDataCache.clear();
    return load({ ...options, forceRefresh: true });
  }

  return {
    load,
    refresh,
    loadPriorityData,
    loadRecommendations
  };
})();

// Make it globally available
window.HomeDataLoader = HomeDataLoader;
