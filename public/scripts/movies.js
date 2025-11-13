(async()=>{
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
    
    const genreGrids = {
      'action': 'actionGrid',
      'drama': 'dramaGrid',
      'comedy': 'comedyGrid',
      'horror': 'horrorGrid',
      'cartoon': 'cartoonGrid',
      'kids': 'kidsGrid',
      'sci-fi': 'scifiGrid',
      'thriller': 'thrillerGrid'
    };
    
    function initHorizontalScroll(grid, initialItems = []) {
      let scrollInterval = null;
      let currentPage = 1;
      let isLoading = false;
      let hasMore = true;
      let allItemIds = new Set(initialItems.map(item => item.id));
      const genre = Object.keys(genreGrids).find(key => genreGrids[key] === grid.id);
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
        if (!genre || isLoading) return;
        
        isLoading = true;
        currentPage++;
        
        try {
          const response = await api.get(`/api/titles?genre=${encodeURIComponent(genre)}&type=movie&page=${currentPage}&limit=${contentLimit}&sort=popularity`);
          const data = await response.json();
          const items = data.items || [];
          
          if (items.length === 0) {
            allItemIds.clear();
            currentPage = 1;
            const resetResponse = await api.get(`/api/titles?genre=${encodeURIComponent(genre)}&type=movie&page=1&limit=${contentLimit}&sort=popularity`);
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
          console.error(`Failed to load more ${genre} content:`, error);
        } finally {
          isLoading = false;
        }
      }
    }
    
    function createContentCard(t) {
      const card = document.createElement('div');
      card.className = 'content-card';
      card.onclick = () => window.location.href = `/title.html?id=${t.id}`;
      card.innerHTML = `
        <div class="content-thumbnail">
          <img src="${t.posterUrl || '/images/poster-placeholder.jpg'}" alt="${t.name || 'Movie'}" onerror="this.src='/images/poster-placeholder.jpg'">
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
    
    function renderGenreGrid(gridId, items) {
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
      
      initHorizontalScroll(grid, items);
    }
    
    async function loadGenreContent(genreSlug) {
      try {
  const response = await api.get(`/api/titles?genre=${encodeURIComponent(genreSlug)}&type=movie&limit=${contentLimit}&page=1&sort=popularity`);
        const data = await response.json();
        const gridId = genreGrids[genreSlug];
        if (gridId) {
          renderGenreGrid(gridId, data.items || []);
        }
      } catch (error) {
        console.error(`Failed to load ${genreSlug} content:`, error);
      }
    }
    
    const genres = ['action', 'drama', 'comedy', 'horror', 'cartoon', 'kids', 'sci-fi', 'thriller'];
    await Promise.all(genres.map(genre => loadGenreContent(genre)));

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
        await Promise.all(genres.map(genre => loadGenreContent(genre)));
        return;
      }

      const trimmedQuery = query.trim();
      try {
        const response = await api.get(`/api/titles?q=${encodeURIComponent(trimmedQuery)}&type=movie`);
        const data = await response.json();
        
        Object.values(genreGrids).forEach(gridId => {
          const grid = document.getElementById(gridId);
          if (grid) grid.innerHTML = '';
        });

        const firstGridId = Object.values(genreGrids)[0];
        renderGenreGrid(firstGridId, data.items || []);
        
        const firstSection = document.querySelector('.content-section');
        if (firstSection) {
          const heading = firstSection.querySelector('h2');
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
  })();

