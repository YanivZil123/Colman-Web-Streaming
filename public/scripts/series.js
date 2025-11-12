(async()=>{
    // Check authentication
    let me;
    try {
      me = await (await api.get('/me')).json();
      if(!me?.email){ 
        location.href='/login.html'; 
        return; 
      }
    } catch (error) {
      location.href='/login.html';
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
            <img src="${t.posterUrl || '/images/poster-placeholder.jpg'}" alt="${t.name}" onerror="this.src='/images/poster-placeholder.jpg'">
            <div class="play-overlay">
              <span class="play-icon">▶</span>
            </div>
          </div>
          <div class="content-info">
            <h3 class="content-title">${t.name}</h3>
            <p class="content-meta">${t.year} • ${t.type}</p>
          </div>
        `;
        grid.appendChild(card);
      });
    }
    
    // Load content for each genre
    async function loadGenreContent(genreSlug) {
      try {
        const response = await api.get(`/titles?genre=${genreSlug}`);
        const data = await response.json();
        const gridId = genreGrids[genreSlug];
        if (gridId) {
          renderGenreGrid(gridId, data.items || []);
        }
      } catch (error) {
        console.error(`Failed to load ${genreSlug} content:`, error);
        const gridId = genreGrids[genreSlug];
        if (gridId) {
          const grid = document.getElementById(gridId);
          if (grid) {
            grid.innerHTML = '<p style="color: hsl(var(--disney-muted)); padding: 20px;">Failed to load content.</p>';
          }
        }
      }
    }
    
    // Load all genres
    const genres = ['action', 'drama', 'comedy', 'horror', 'cartoon', 'kids', 'sci-fi', 'thriller'];
    await Promise.all(genres.map(genre => loadGenreContent(genre)));
  })();