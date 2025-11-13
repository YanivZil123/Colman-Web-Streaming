(async()=>{
    const startTime = performance.now();
    console.log('[Movies] Loading content...');
    console.log('[Movies] Cache status:', window.MoviesDataCache ? MoviesDataCache.getInfo() : 'Cache not available');
    
    let me;
    try {
      me = await (await api.get('/api/auth/me')).json();
      if(!me?.username){ 
        return; 
      }
    } catch (error) {
      return;
    }
    
    let contentLimit = 20;
    try {
      const configRes = await api.get('/api/config/content-limit');
      const configData = await configRes.json();
      contentLimit = configData.limit || 20;
    } catch (error) {
      console.error('Failed to load content limit config:', error);
    }
    
    const defaultGenres = [
      { name: 'Action', slug: 'action' },
      { name: 'Drama', slug: 'drama' },
      { name: 'Comedy', slug: 'comedy' },
      { name: 'Horror', slug: 'horror' },
      { name: 'Cartoon', slug: 'cartoon' },
      { name: 'Kids', slug: 'kids' },
      { name: 'Sci-Fi', slug: 'sci-fi' },
      { name: 'Thriller', slug: 'thriller' }
    ];
    const genreSections = {};
    const container = document.getElementById('moviesGenreContainer');
    
    // Store loaded data for caching (raw API responses)
    const loadedGenreData = {};
    let loadedAlreadyWatched = [];

    function renderGenreSections(genres) {
      if (!container) return;
      container.innerHTML = '';
      Object.keys(genreSections).forEach(key => delete genreSections[key]);

      (genres || []).forEach(genre => {
        const slug = genre.slug || slugify(genre.name);
        const gridId = `movies-${slug}-grid`;
        const section = document.createElement('section');
        section.className = 'content-section';
        section.dataset.genre = slug;
        section.innerHTML = `
          <h2 class="section-title">${genre.name || slug}</h2>
          <div class="content-grid" id="${gridId}"></div>
        `;
        genreSections[slug] = { gridId, name: genre.name || slug };
        container.appendChild(section);
      });
    }

    async function loadGenreList() {
      let genresToUse = defaultGenres;
      try {
        const response = await api.get('/api/genres');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.items) && data.items.length) {
            genresToUse = data.items;
          }
        }
      } catch (error) {
        console.error('Failed to load genres:', error);
      }
      renderGenreSections(genresToUse);
    }
    
    function resetSectionHeadings() {
      Object.entries(genreSections).forEach(([slug, info]) => {
        const sectionEl = document.querySelector(`section[data-genre="${slug}"]`);
        if (sectionEl) {
          const heading = sectionEl.querySelector('h2');
          if (heading) heading.textContent = info.name;
        }
      });
    }
    
    function initHorizontalScroll(grid, initialItems = [], genreSlug) {
      let scrollInterval = null;
      let currentPage = 1;
      let isLoading = false;
      let allItemIds = new Set(initialItems.map(item => item.id));
      const section = grid.closest('.content-section');
      
      const leftArrow = document.createElement('button');
      leftArrow.className = 'scroll-arrow scroll-arrow-left';
      leftArrow.innerHTML = '◀';
      leftArrow.onclick = () => scrollGrid(-1);
      
      const rightArrow = document.createElement('button');
      rightArrow.className = 'scroll-arrow scroll-arrow-right';
      rightArrow.innerHTML = '▶';
      rightArrow.onclick = () => scrollGrid(1);
      
      if (section) {
        const existingArrows = section.querySelectorAll('.scroll-arrow');
        existingArrows.forEach(btn => btn.remove());
        section.appendChild(leftArrow);
        section.appendChild(rightArrow);
      }
      
      function scrollGrid(direction) {
        const scrollAmount = grid.clientWidth * 0.8;
        grid.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
      }
      
      grid.addEventListener('scroll', () => {
        const scrollLeft = grid.scrollLeft;
        const scrollWidth = grid.scrollWidth;
        const clientWidth = grid.clientWidth;
        
        if (scrollLeft + clientWidth >= scrollWidth - 100 && !isLoading) {
          loadMoreContent();
        }
      });
      
      grid.addEventListener('mouseenter', (e) => {
        grid.addEventListener('mousemove', handleMouseMove);
      });
      
      grid.addEventListener('mouseleave', () => {
        grid.removeEventListener('mousemove', handleMouseMove);
        stopScroll();
      });
      
      function handleMouseMove(e) {
        const rect = grid.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const edgeThreshold = 150;
        
        if (x < edgeThreshold) {
          const speed = (edgeThreshold - x) / edgeThreshold * 10;
          startScroll(-speed);
        } else if (x > width - edgeThreshold) {
          const speed = (x - (width - edgeThreshold)) / edgeThreshold * 10;
          startScroll(speed);
          
          if (x > width - 100 && !isLoading) {
            loadMoreContent();
          }
        } else {
          stopScroll();
        }
      }
      
      function startScroll(speed) {
        stopScroll();
        scrollInterval = setInterval(() => {
          grid.scrollLeft += speed;
        }, 16);
      }
      
      function stopScroll() {
        if (scrollInterval) {
          clearInterval(scrollInterval);
          scrollInterval = null;
        }
      }
      
      async function loadMoreContent() {
        if (!genreSlug || isLoading) return;
        
        isLoading = true;
        currentPage++;
        
        try {
          const response = await api.get(`/api/titles?genre=${encodeURIComponent(genreSlug)}&type=movie&page=${currentPage}&limit=${contentLimit}&sort=popularity`);
          const data = await response.json();
          const items = data.items || [];
          
          if (items.length === 0) {
            allItemIds.clear();
            currentPage = 1;
            const resetResponse = await api.get(`/api/titles?genre=${encodeURIComponent(genreSlug)}&type=movie&page=1&limit=${contentLimit}&sort=popularity`);
            const resetData = await resetResponse.json();
            const resetItems = resetData.items || [];
            
            resetItems.forEach(t => {
              allItemIds.add(t.id);
              const card = createContentCard(t);
              grid.appendChild(card);
            });
          } else {
            items.forEach(t => {
              if (!allItemIds.has(t.id)) {
                allItemIds.add(t.id);
                const card = createContentCard(t);
                grid.appendChild(card);
              }
            });
          }
        } catch (error) {
          console.error(`Failed to load more ${genreSlug} content:`, error);
        } finally {
          isLoading = false;
        }
      }
    }
    
    function createContentCard(t) {
      const card = document.createElement('div');
      card.className = 'content-card';
      card.dataset.id = t.id; // Store ID for reference
      card.onclick = () => window.location.href = `/title.html?id=${t.id}`;
      card.innerHTML = `
        <div class="content-thumbnail">
          <img src="${resolveImageUrl(t.thumbnailUrl || t.posterUrl)}" alt="${t.name || 'Movie'}" onerror="this.src='/images/poster-placeholder.jpg'">
          <div class="play-overlay">
            <span class="play-icon">▶</span>
          </div>
        </div>
        <div class="content-info">
          <h3 class="content-title">${t.name || 'Movie Title'}</h3>
          <p class="content-meta">${t.year || '2024'} • ${t.type === 'series' ? 'Series' : 'Movie'}</p>
        </div>
      `;
      return card;
    }
    
    function resolveImageUrl(url) {
      if (!url) return '/images/poster-placeholder.jpg';
      if (/^https?:/i.test(url)) return url;
      let cleaned = String(url).replace(/^\/+/, '');
      if (cleaned.startsWith('public/')) cleaned = cleaned.replace(/^public\//, '');
      const idx = cleaned.indexOf('uploads/');
      if (idx !== -1) cleaned = cleaned.slice(idx);
      if (!cleaned.startsWith('uploads/')) cleaned = 'uploads/' + cleaned;
      return '/' + cleaned;
    }
    
    function renderGenreGrid(gridId, items, genreSlug) {
      const grid = document.getElementById(gridId);
      if (!grid) return;
      grid.innerHTML = '';
      
      if (!items || items.length === 0) {
        grid.innerHTML = '<p style="color: hsl(var(--disney-muted)); padding: 20px;">No movies available in this genre.</p>';
        return;
      }
      
      items.forEach(t => {
        grid.appendChild(createContentCard(t));
      });
      
      initHorizontalScroll(grid, items, genreSlug);
    }
    
    async function loadGenreContent(genreSlug) {
      try {
  const response = await api.get(`/api/titles?genre=${encodeURIComponent(genreSlug)}&type=movie&limit=${contentLimit}&page=1&sort=popularity`);
        const data = await response.json();
        const section = genreSections[genreSlug];
        if (section) {
          const items = data.items || [];
          loadedGenreData[genreSlug] = items; // Store for caching
          renderGenreGrid(section.gridId, items, genreSlug);
        }
      } catch (error) {
        console.error(`Failed to load ${genreSlug} content:`, error);
      }
    }
    
    // ========== WARM LOAD CHECK ==========
    // Check if we have cached data (WARM LOAD)
    const hasCachedData = window.MoviesDataCache && MoviesDataCache.hasValidCache();
    
    if (hasCachedData) {
        // WARM LOAD - Instant render with cached data
        console.log('[Movies] WARM LOAD - Using cached data (no loading screen)');
        
        // CRITICAL: Remove loading immediately to show content
        document.body.classList.remove('loading');
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        const cachedData = MoviesDataCache.getAll();
        
        // Render genre sections structure
        if (cachedData.genres && cachedData.genres.length > 0) {
            renderGenreSections(cachedData.genres);
        }
        
        // Render cached genre data
        if (cachedData.genreData) {
            Object.keys(cachedData.genreData).forEach(slug => {
                const section = genreSections[slug];
                if (section && cachedData.genreData[slug]) {
                    const grid = document.getElementById(section.gridId);
                    if (grid) {
                        grid.innerHTML = '';
                        cachedData.genreData[slug].forEach(item => {
                            grid.appendChild(createContentCard(item));
                        });
                        initHorizontalScroll(grid, cachedData.genreData[slug], slug);
                    }
                }
            });
        }
        
        // Render already watched movies
        if (cachedData.alreadyWatched && cachedData.alreadyWatched.length > 0) {
            const alreadyWatchedGrid = document.getElementById('alreadyWatchedMoviesGrid');
            if (alreadyWatchedGrid) {
                alreadyWatchedGrid.innerHTML = '';
                cachedData.alreadyWatched.forEach(item => {
                    alreadyWatchedGrid.appendChild(createContentCard(item));
                });
                initHorizontalScroll(alreadyWatchedGrid, cachedData.alreadyWatched, 'already-watched');
            }
        }
        
        const endTime = performance.now();
        console.log(`[Movies] Warm load completed in ${endTime - startTime}ms`);
        return; // Exit early, skip cold load
    }
    
    // ========== COLD LOAD ==========
    console.log('[Movies] COLD LOAD - Fetching from API (showing loading screen)');
    document.body.classList.add('loading');
    
    await loadGenreList();
    const genreSlugs = Object.keys(genreSections);

    const profileId = localStorage.getItem('selectedProfileId');
    const alreadyWatchedGrid = document.getElementById('alreadyWatchedMoviesGrid');
    if (alreadyWatchedGrid) {
      try {
        const alreadyWatchedResp = await api.get(`/api/home/already-watched-movies${profileId ? '?profileId=' + encodeURIComponent(profileId) : ''}`);
        const alreadyWatchedData = await alreadyWatchedResp.json();
        const items = alreadyWatchedData.items || [];
        loadedAlreadyWatched = items; // Store for caching
        renderGenreGrid('alreadyWatchedMoviesGrid', items, 'already-watched');
      } catch (error) {
        console.error('Failed to load already watched movies:', error);
      }
    }

    await Promise.all(genreSlugs.map(genre => loadGenreContent(genre)));

    // Cache the data after loading - use actual API data, not DOM extraction
    if (window.MoviesDataCache) {
        MoviesDataCache.setMultiple({
            genres: Object.values(genreSections).map(s => ({ 
                name: s.name, 
                slug: Object.keys(genreSections).find(k => genreSections[k] === s) 
            })),
            genreData: loadedGenreData, // Use the raw API data
            alreadyWatched: loadedAlreadyWatched // Use the raw API data
        });
        console.log('[Movies] Data cached successfully');
    }

    // Hide loading screen after content is loaded
    if (typeof hideLoadingScreen === 'function') {
      hideLoadingScreen();
    } else {
      const loadingScreen = document.getElementById('loadingScreen');
      const body = document.body;
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        body.classList.remove('loading');
        setTimeout(() => {
          if (loadingScreen.parentNode) {
            loadingScreen.parentNode.removeChild(loadingScreen);
          }
        }, 500);
      }
    }

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');
    let searchTimeout;

    async function performSearch(query) {
      if (!query || query.trim().length === 0) {
        resetSectionHeadings();
        await Promise.all(genreSlugs.map(genre => loadGenreContent(genre)));
        return;
      }

      const trimmedQuery = query.trim();
      try {
        const response = await api.get(`/api/titles?q=${encodeURIComponent(trimmedQuery)}&type=movie`);
        const data = await response.json();
        
        Object.values(genreSections).forEach(section => {
          const grid = document.getElementById(section.gridId);
          if (grid) grid.innerHTML = '';
        });

        const firstSection = Object.values(genreSections)[0];
        if (firstSection) {
          renderGenreGrid(firstSection.gridId, data.items || [], null);
        }
        
        const firstSectionEl = document.querySelector('.content-section');
        if (firstSectionEl) {
          const heading = firstSectionEl.querySelector('h2');
          if (heading) heading.textContent = `Search Results for "${trimmedQuery}"`;
        }
      } catch (error) {
        console.error('Search failed:', error);
      }
    }

    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch(e.target.value);
      }, 300);
    });

    searchBtn.addEventListener('click', () => {
      performSearch(searchInput.value);
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performSearch(searchInput.value);
      }
    });
    
    function slugify(value = '') {
      return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'genre';
    }
  })();
