(async()=>{
    // Check authentication (server already handles redirects)
    let me;
    try {
      me = await (await api.get('/me')).json();
      if(!me?.email){ 
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
        grid.innerHTML = '<p style="color: hsl(var(--disney-muted)); padding: 20px;">No series available in this genre.</p>';
        return;
      }
      
      items.forEach(t => {
        const card = document.createElement('div');
        card.className = 'content-card';
        card.onclick = () => window.location.href = `/title.html?id=${t.id}`;
        card.innerHTML = `
          <div class="content-thumbnail">
            <img src="${t.posterUrl || '/images/poster-placeholder.jpg'}" alt="${t.name || 'Series'}" onerror="this.src='/images/poster-placeholder.jpg'">
            <div class="play-overlay">
              <span class="play-icon">▶</span>
            </div>
          </div>
          <div class="content-info">
            <h3 class="content-title">${t.name || 'Series Title'}</h3>
            <p class="content-meta">${t.year || '2024'} • ${t.type === 'series' ? 'Series' : 'Movie'}</p>
          </div>
        `;
        grid.appendChild(card);
      });
    }
    
    // Load content for each genre (MongoDB ready - will pull from DB)
    async function loadGenreContent(genreSlug) {
      try {
        // Filter by genre and type=series for series page
        const response = await api.get(`/titles?genre=${genreSlug}&type=series`);
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
  })();