(async()=>{
  document.getElementById('logoutBtn')?.addEventListener('click', async ()=>{ await api.post('/auth/logout',{}); location.href='/login.html'; });
  const me = await (await api.get('/me')).json();
  if(me?.email){ document.getElementById('who').textContent=' · '+me.email; } else { location.href='/login.html'; return; }
  document.getElementById('searchForm').addEventListener('submit',(e)=>{ e.preventDefault(); location.href='/genre.html?q='+encodeURIComponent(document.getElementById('q').value); });
  const cont = await (await api.get('/home/continue')).json();
  const per = await (await api.get('/home/personal')).json();
  const pop = await (await api.get('/home/popular')).json();
  function render(gridId, arr){
    const grid=document.getElementById(gridId); grid.innerHTML='';
    arr.forEach(t=>{
      const a=document.createElement('a'); a.href='/title.html?id='+t.id; a.className='card';
      a.innerHTML=`<img src="${t.posterUrl||'/images/poster-placeholder.jpg'}"><div class='p16'><div>${t.name}</div><div class='badge'>${t.year} · ${t.type}</div></div>`;
      grid.appendChild(a);
    });
  }
  render('continueGrid',cont.items||[]); render('personalGrid',per.items||[]); render('popularGrid',pop.items||[]);
})();
