(async()=>{
  document.getElementById('logoutBtn')?.addEventListener('click', async ()=>{ await api.post('/auth/logout',{}); location.href='/login.html'; });
  const me = await (await api.get('/me')).json();
  if(me?.email){ document.getElementById('who').textContent=' · '+me.email; } else { location.href='/login.html'; return; }
  document.getElementById('searchForm').addEventListener('submit',(e)=>{ e.preventDefault(); location.href='/genre.html?q='+encodeURIComponent(document.getElementById('q').value); });
  const cont = await (await api.get('/home/continue')).json();
  const per = await (await api.get('/home/personal')).json();
  const pop = await (await api.get('/home/popular')).json();
  const fallbackPosters=['/images/movie-title-1.png','/images/movie-title-2.png','/images/movie-title-3.jpg','/images/movie-title-4.jpg','/images/series-title-1.jpg','/images/series-title-2.jpeg','/images/series-title-3.jpg','/images/series-title-4.jpg'];
  let fallbackIdx=0;
  function nextPoster(){ const poster=fallbackPosters[fallbackIdx%fallbackPosters.length]; fallbackIdx++; return poster; }
  function normalizeImage(url){
    if(!url) return nextPoster();
    if(/^https?:/i.test(url)) return url;
    let cleaned=String(url).replace(/^\/+/, '');
    if(cleaned.startsWith('public/')) cleaned=cleaned.replace(/^public\//,'');
    const idx=cleaned.indexOf('uploads/');
    if(idx!==-1) cleaned=cleaned.slice(idx);
    if(!cleaned.startsWith('uploads/')) cleaned='uploads/'+cleaned;
    return '/'+cleaned;
  }
  function render(gridId, arr){
    const grid=document.getElementById(gridId); grid.innerHTML='';
    arr.forEach(t=>{
      const a=document.createElement('a'); a.href='/title.html?id='+t.id; a.className='card';
      a.innerHTML=`<img src="${normalizeImage(t.thumbnailUrl||t.posterUrl)}" onerror="this.src='/images/poster-placeholder.jpg'"><div class='p16'><div>${t.name}</div><div class='badge'>${t.year} · ${t.type}</div></div>`;
      grid.appendChild(a);
    });
  }
  render('continueGrid',cont.items||[]); render('personalGrid',per.items||[]); render('popularGrid',pop.items||[]);
})();
