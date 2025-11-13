const v=document.getElementById('v');
const bar=document.getElementById('bar');
const progressWrap=document.getElementById('progressTrack');
const nextEpLink=document.getElementById('nextEp');
const titleBreadcrumb=document.getElementById('titleBreadcrumb');
const titleName=document.getElementById('titleName');
const titleMeta=document.getElementById('titleMeta');
const moreInfo=document.getElementById('moreInfo');
const overlayBack10=document.getElementById('overlayBack10');
const overlayFwd10=document.getElementById('overlayFwd10');
const overlayPlayPause=document.getElementById('overlayPlayPause');
const overlayFullscreen=document.getElementById('overlayFullscreen');
const overlay=document.querySelector('.video-overlay');
const videoFrame=document.querySelector('.video-frame');
let overlayHideTimer=null;
let lastProgressSave=0;
const qs=new URLSearchParams(location.search);
const titleId = qs.get('titleId') || qs.get('title');
const episodeId = qs.get('episodeId') || qs.get('episode');
const resumeDirective = qs.get('resume');
const resumePositionParam = qs.get('resumePosition');
const resumePositionHint = resumePositionParam && !Number.isNaN(Number(resumePositionParam)) ? Math.max(0, Number(resumePositionParam)) : null;
const profileId = (()=>{ try { return localStorage.getItem('selectedProfileId'); } catch(e){ return null; } })();
let resumePromptShown=false;
let cachedProgress=null;
let metadataLoaded=false;

async function loadTitleDetails(){
  if(!titleId) return;
  try{
    const res=await api.get('/api/titles/'+encodeURIComponent(titleId));
    if(!res.ok) throw new Error('fetch failed');
    const data=await res.json();
    const name=data?.name||'Player';
    if(titleBreadcrumb) titleBreadcrumb.textContent=name;
    if(titleName) titleName.textContent=name;
    if(titleMeta){
      const parts=[];
      if(data?.year) parts.push(data.year);
      if(data?.type) parts.push(data.type==='series'?'Series':'Movie');
      if(data?.genres?.length) parts.push(data.genres.join(', '));
      titleMeta.textContent=parts.join(' · ');
    }
  }catch(err){
    if(titleBreadcrumb) titleBreadcrumb.textContent='Player';
  }
  if(moreInfo) moreInfo.href='/title.html?id='+encodeURIComponent(titleId);
}

function sendProgress(payload, preferBeacon){
  if(profileId) payload.profileId = profileId;
  if(preferBeacon && navigator.sendBeacon){
    try {
      const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
      navigator.sendBeacon('/api/watch/progress', blob);
      return;
    } catch(err) {}
  }
  api.post('/api/watch/progress', payload);
}

function saveProgress(force=false, preferBeacon=false){
  if(!v||!titleId) return;
  const now=Date.now();
  if(!force && now-lastProgressSave<1500) return;
  if(!v.duration && !v.currentTime) return;
  lastProgressSave=now;
  const positionVal=Math.max(0, Math.floor(v.currentTime||0));
  const durationVal=Number.isFinite(v.duration) && v.duration>0 ? Math.floor(v.duration) : 0;
  sendProgress({
    titleId,
    episodeId,
    positionSec:positionVal,
    durationSec:durationVal
  }, preferBeacon);
}

function attachSkip(button,dir){
  if(!button) return;
  button.onclick=()=>{
    v.currentTime=Math.max(0,Math.min(v.duration||Infinity,v.currentTime+dir));
    saveProgress(true);
  };
}

function showOverlay(){
  if(!overlay) return;
  overlay.classList.add('visible');
  clearTimeout(overlayHideTimer);
  overlayHideTimer=setTimeout(()=>overlay.classList.remove('visible'),3000);
}

function hideOverlay(){
  if(!overlay) return;
  clearTimeout(overlayHideTimer);
  overlay.classList.remove('visible');
}

function applyResumeIfReady(){
  if(resumePromptShown) return;
  if(!metadataLoaded) return;
  let candidate=null;
  if(cachedProgress && cachedProgress.positionSec !== undefined){
    const val=Number(cachedProgress.positionSec);
    if(!Number.isNaN(val) && val>0.5){ candidate=Math.min(v.duration || Infinity, val); }
  }
  if((candidate===null || candidate===undefined) && resumePositionHint !== null){
    if(resumePositionHint>0.5){ candidate=Math.min(v.duration || Infinity, resumePositionHint); }
  }
  if(candidate===null || candidate === undefined) return;
  resumePromptShown=true;
  let resume;
  if(resumeDirective==='resume'){ resume=true; }
  else if(resumeDirective==='start'){ resume=false; }
  else { resume=confirm('Resume from your last position? Press Cancel to start from the beginning.'); }
  v.currentTime = resume ? candidate : 0;
  if(!resume){ saveProgress(true); }
}

(async()=>{
  if(!titleId){ alert('Missing title'); location.href='/title.html'; return; }
  await loadTitleDetails();
  const res = await api.get('/api/watch/source?titleId='+encodeURIComponent(titleId)+(episodeId?('&episodeId='+encodeURIComponent(episodeId)):''));
  const meta = await res.json();
  if (!res.ok || !meta || meta.error) {
    if (meta && meta.error === 'auth') return location.href = '/signin.html';
    alert('Failed to load video source.');
    return;
  }

  v.src = meta.url;
  v.load();
  v.addEventListener('loadedmetadata', ()=>{ metadataLoaded=true; applyResumeIfReady(); });

  const updatePlayButton = ()=>{
    const icon = v.paused ? '▶︎' : '❚❚';
    if(overlayPlayPause) overlayPlayPause.textContent = icon;
    showOverlay();
  };
  const togglePlayback = ()=>{ if (v.paused) { v.play(); } else { v.pause(); } };
  if(overlayPlayPause) overlayPlayPause.onclick = togglePlayback;
  v.addEventListener('play', updatePlayButton);
  v.addEventListener('pause', updatePlayButton);
  v.addEventListener('pause', ()=>saveProgress(true));

  attachSkip(overlayBack10,-10);
  attachSkip(overlayFwd10,10);

  if(overlayFullscreen){
    overlayFullscreen.onclick = ()=>{
      if (!document.fullscreenElement) {
        v.requestFullscreen().catch(()=>{});
      } else {
        document.exitFullscreen().catch(()=>{});
      }
      showOverlay();
    };
  }

  v.addEventListener('timeupdate', ()=>{
    if(bar){
      const pct = v.duration ? (v.currentTime / v.duration * 100) : 0;
      bar.style.width = pct + '%';
    }
    saveProgress();
  });

  if(progressWrap){
    progressWrap.addEventListener('click', (e)=>{
      const rect = progressWrap.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      v.currentTime = (v.duration || 0) * pct;
      saveProgress(true);
    });
  }

  v.addEventListener('ended', ()=>{
    saveProgress(true);
    api.post('/api/watch/finish',{titleId,episodeId,durationSec:Math.floor(v.duration||0),profileId});
  });

  if(nextEpLink){
    const nextResp = await api.get('/api/watch/next-episode?titleId='+encodeURIComponent(titleId)+(episodeId?('&episodeId='+encodeURIComponent(episodeId)):''));
    const next = await nextResp.json();
    if(next?.id){ nextEpLink.href='/player.html?titleId='+encodeURIComponent(titleId)+'&episodeId='+encodeURIComponent(next.id); }
    else { nextEpLink.style.display='none'; }
  }

  try {
    const posRes = await api.get('/api/watch/progress?titleId='+encodeURIComponent(titleId)+(episodeId?('&episodeId='+encodeURIComponent(episodeId)):'')+(profileId?('&profileId='+encodeURIComponent(profileId)):'') );
    const posJson = await posRes.json().catch(()=>null);
    if (posJson && posJson.positionSec !== undefined) {
      cachedProgress = posJson;
    }
  } catch (e) {}
  applyResumeIfReady();

  if(videoFrame){
    ['mousemove','click','touchstart','pointermove'].forEach(evt=> videoFrame.addEventListener(evt, showOverlay));
    videoFrame.addEventListener('mouseleave', hideOverlay);
  }
  window.addEventListener('keydown', showOverlay);
  window.addEventListener('beforeunload', ()=>saveProgress(true,true));
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') saveProgress(true,true); });
  showOverlay();
})();
