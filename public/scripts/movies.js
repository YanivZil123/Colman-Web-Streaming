(async()=>{
    // Check authentication (server already handles redirects)
    let me;
    try {
      me = await (await api.get('/api/auth/me')).json();
      if(!me?.username){ 
        // Server should have redirected already, just return
        return; 
      }
    } catch (error) {
      // Server should have redirected already, just return
      return;
    }
    
    
    // Genre to grid ID mapping
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
    
    // Function to render content for a genre
    function renderGenreGrid(gridId, items) {
      const grid = document.getElementById(gridId);
      if (!grid) return;
      grid.innerHTML = '';
      
      if (!items || items.length === 0) {
        grid.innerHTML = '<p style="color: hsl(var(--disney-muted)); padding: 20px;">No movies available in this genre.</p>';
        return;
      }
      
      items.forEach(t => {
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
        grid.appendChild(card);
      });
    }
    
    // Load content for each genre (MongoDB ready - will pull from DB)
    async function loadGenreContent(genreSlug) {
      try {
        // Filter by genre and type=movie for movies page
  const response = await api.get(`/api/titles?genre=${encodeURIComponent(genreSlug)}&type=movie`);
        const data = await response.json();
        const gridId = genreGrids[genreSlug];
        if (gridId) {
          renderGenreGrid(gridId, data.items || []);
        }
      } catch (error) {
        console.error(`Failed to load ${genreSlug} content:`, error);
      }
    }
    
    // Load all genres
    const genres = ['action', 'drama', 'comedy', 'horror', 'cartoon', 'kids', 'sci-fi', 'thriller'];
    await Promise.all(genres.map(genre => loadGenreContent(genre)));

    // Search functionality
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

