const v=document.getElementById('v'); const bar=document.getElementById('bar');
const qs=new URLSearchParams(location.search); const titleId=qs.get('title'); const episodeId=qs.get('episode');
(async()=>{
  const meta = await (await api.get('/watch/source?titleId='+titleId+(episodeId?('&episodeId='+episodeId):''))).json();
  v.src = meta.url;
  v.addEventListener('timeupdate', ()=>{ bar.style.width = (v.currentTime / v.duration * 100 || 0) + '%'; });
  document.getElementById('back10').onclick=()=>{ v.currentTime=Math.max(0,v.currentTime-10); api.post('/watch/progress',{titleId,episodeId,positionSec:Math.floor(v.currentTime)}); };
  document.getElementById('fwd10').onclick=()=>{ v.currentTime=Math.min(v.duration,(v.currentTime+10)); api.post('/watch/progress',{titleId,episodeId,positionSec:Math.floor(v.currentTime)}); };
  v.addEventListener('ended', ()=> api.post('/watch/finish',{titleId,episodeId}));
  const next = await (await api.get('/watch/next-episode?titleId='+titleId+(episodeId?('&episodeId='+episodeId):''))).json();
  if(next?.id){ const a=document.getElementById('nextEp'); a.href='/player.html?title='+titleId+'&episode='+next.id; } else { nextEp.style.display='none'; }
})();
