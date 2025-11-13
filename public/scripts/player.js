const v=document.getElementById('v');
const bar=document.getElementById('bar');
const progressWrap=document.getElementById('progressTrack');
const overlayBack=document.getElementById('overlayBack');
const overlayBack10=document.getElementById('overlayBack10');
const overlayFwd10=document.getElementById('overlayFwd10');
const overlayPlayPause=document.getElementById('overlayPlayPause');
const overlayFullscreen=document.getElementById('overlayFullscreen');
const overlayEpisodes=document.getElementById('overlayEpisodes');
const episodeSheet=document.getElementById('episodeSheet');
const episodeSheetClose=document.getElementById('episodeSheetClose');
const episodeSheetTitle=document.getElementById('episodeSheetTitle');
const episodeList=document.getElementById('episodeList');
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
let sessionStartTime=Date.now();
let titleData=null;
let episodeProgressMap={};

async function loadTitleDetails(){
  if(!titleId) return;
  try{
    const res=await api.get('/api/titles/'+encodeURIComponent(titleId));
    if(!res.ok) throw new Error('fetch failed');
    titleData=await res.json();
    return titleData;
  }catch(err){
    return null;
  }
}

function sendProgress(payload, preferBeacon){
  if(profileId) payload.profileId = profileId;
  payload.sessionStartTime = sessionStartTime;
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

async function loadEpisodeProgress(){
  if(!titleData || !titleData.episodes || titleData.type!=='series') return;
  try{
    const promises=titleData.episodes.map(ep=>
      api.get('/api/watch/progress?titleId='+encodeURIComponent(titleId)+'&episodeId='+encodeURIComponent(ep.id)+(profileId?('&profileId='+encodeURIComponent(profileId)):''))
        .then(r=>r.json())
        .then(d=>({id:ep.id,progress:d}))
        .catch(()=>({id:ep.id,progress:null}))
    );
    const results=await Promise.all(promises);
    results.forEach(r=>{
      if(r.progress && r.progress.positionSec!==undefined){
        episodeProgressMap[r.id]=r.progress;
      }
    });
  }catch(err){}
}

function renderEpisodeList(){
  if(!episodeList || !titleData || !titleData.episodes || titleData.type!=='series') {
    if(overlayEpisodes) overlayEpisodes.style.display='none';
    return;
  }
  if(overlayEpisodes) overlayEpisodes.style.display='flex';
  episodeList.innerHTML='';
  if(episodeSheetTitle) episodeSheetTitle.textContent='Episodes';
  titleData.episodes.forEach((ep,idx)=>{
    const item=document.createElement('div');
    item.className='episode-item';
    if(ep.id===episodeId) item.classList.add('now-playing');
    const thumbnail=document.createElement('div');
    thumbnail.className='episode-thumbnail';
    if(ep.thumbnailUrl){
      const img=document.createElement('img');
      img.src=ep.thumbnailUrl;
      img.alt=ep.name||`Episode ${idx+1}`;
      thumbnail.appendChild(img);
    }
    const playIcon=document.createElement('div');
    playIcon.className='play-icon';
    playIcon.textContent='▶';
    thumbnail.appendChild(playIcon);
    const info=document.createElement('div');
    info.className='episode-info';
    const number=document.createElement('div');
    number.className='episode-number';
    number.textContent=`Episode ${idx+1}`;
    const title=document.createElement('h3');
    title.className='episode-title';
    title.textContent=ep.name||`Episode ${idx+1}`;
    const desc=document.createElement('p');
    desc.className='episode-description';
    desc.textContent=ep.description||'';
    info.appendChild(number);
    info.appendChild(title);
    if(ep.description) info.appendChild(desc);
    const progress=episodeProgressMap[ep.id];
    if(progress && progress.positionSec>0 && progress.durationSec>0){
      const pct=(progress.positionSec/progress.durationSec)*100;
      if(pct<95){
        const progressBar=document.createElement('div');
        progressBar.className='episode-progress';
        const progressFill=document.createElement('div');
        progressFill.className='episode-progress-bar';
        progressFill.style.width=pct+'%';
        progressBar.appendChild(progressFill);
        info.appendChild(progressBar);
      }
    }
    item.appendChild(thumbnail);
    item.appendChild(info);
    item.onclick=()=>{
      episodeSheet.classList.remove('active');
      location.href='/player.html?titleId='+encodeURIComponent(titleId)+'&episodeId='+encodeURIComponent(ep.id);
    };
    episodeList.appendChild(item);
  });
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
  else { resume=true; }
  v.currentTime = resume ? candidate : 0;
  if(!resume){ saveProgress(true); }
}

(async()=>{
  if(!titleId){ alert('Missing title'); location.href='/views/home.html'; return; }
  await loadTitleDetails();
  await loadEpisodeProgress();
  renderEpisodeList();
  if(overlayBack){
    overlayBack.onclick=()=>{
      if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
      location.href='/title.html?id='+encodeURIComponent(titleId);
    };
  }
  if(overlayEpisodes){
    overlayEpisodes.onclick=(e)=>{
      e.stopPropagation();
      episodeSheet.classList.add('active');
      hideOverlay();
    };
  }
  if(episodeSheetClose){
    episodeSheetClose.onclick=()=>{
      episodeSheet.classList.remove('active');
    };
  }
  if(episodeSheet){
    episodeSheet.onclick=(e)=>{
      if(e.target===episodeSheet){
        episodeSheet.classList.remove('active');
      }
    };
  }
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
    api.post('/api/watch/finish',{
      titleId,
      episodeId,
      durationSec:Math.floor(v.duration||0),
      profileId,
      startedAt: new Date(sessionStartTime).toISOString()
    });
  });

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
  // Close current session when page unloads or becomes hidden
  function closeCurrentSession() {
    if(v && v.currentTime > 5) { // Only if watched at least 5 seconds
      const duration = Math.floor(v.currentTime || 0);
      api.post('/api/watch/session-end', {
        titleId,
        episodeId,
        positionSec: duration,
        durationSec: Math.floor(v.duration || 0),
        profileId,
        startedAt: new Date(sessionStartTime).toISOString()
      }).catch(() => {}); // Ignore errors on unload
    }
  }
  
  window.addEventListener('beforeunload', ()=>{
    saveProgress(true,true);
    closeCurrentSession();
  });
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState==='hidden') {
      saveProgress(true,true);
      closeCurrentSession();
    } else {
      // Start new session when page becomes visible again
      sessionStartTime = Date.now();
    }
  });
  showOverlay();
})();

// ======================================
// Next Episode / Up Next Card Logic
// ======================================
(async function initNextEpisodeFlow() {
  const overlayNextEp = document.getElementById('overlayNextEp');
  const upNextCard = document.getElementById('upNextCard');
  const upNextClose = document.getElementById('upNextClose');
  const upNextContent = document.getElementById('upNextContent');
  const upNextThumbnail = document.getElementById('upNextThumbnail');
  const upNextTitle = document.getElementById('upNextTitle');
  const upNextEpisode = document.getElementById('upNextEpisode');
  const countdownText = document.getElementById('countdownText');
  const countdownRing = document.getElementById('countdownRing');

  let nextEpisode = null;
  let upNextTimer = null;
  let countdownInterval = null;
  let countdownSeconds = 10;
  const UP_NEXT_TRIGGER_TIME = 5; // Show card 5 seconds before end
  const COUNTDOWN_DURATION = 10; // 10-second countdown

  // Find next episode
  async function findNextEpisode() {
    if (!titleData || !titleData.episodes || !episodeId) return null;
    
    const currentIndex = titleData.episodes.findIndex(ep => ep.id === episodeId);
    if (currentIndex === -1 || currentIndex === titleData.episodes.length - 1) {
      return null; // No next episode (last episode or not found)
    }
    
    return titleData.episodes[currentIndex + 1];
  }

  // Load next episode in player
  function loadNextEpisode() {
    if (!nextEpisode) return;
    
    hideUpNextCard();
    
    if(v && v.duration > 0){
      sendProgress({
        titleId,
        episodeId,
        positionSec: Math.floor(v.duration),
        durationSec: Math.floor(v.duration)
      }, true);
    }
    
    const newUrl = `/views/player.html?titleId=${encodeURIComponent(titleId)}&episodeId=${encodeURIComponent(nextEpisode.id)}${profileId ? '&profileId=' + encodeURIComponent(profileId) : ''}`;
    window.location.href = newUrl;
  }

  // Show Up Next card
  function showUpNextCard() {
    if (!nextEpisode || !upNextCard) return;
    
    // Set episode info
    if (upNextTitle) upNextTitle.textContent = nextEpisode.title || 'Untitled Episode';
    if (upNextEpisode) upNextEpisode.textContent = `S${nextEpisode.season} E${nextEpisode.episode}`;
    
    // Set thumbnail
    if (upNextThumbnail) {
      const thumbnailUrl = nextEpisode.thumbnailUrl || nextEpisode.thumbnail || '/images/default-thumbnail.jpg';
      upNextThumbnail.innerHTML = `<img src="${thumbnailUrl}" alt="${nextEpisode.title}" />`;
    }
    
    // Reset countdown
    countdownSeconds = COUNTDOWN_DURATION;
    if (countdownText) countdownText.textContent = countdownSeconds;
    if (countdownRing) {
      countdownRing.style.strokeDashoffset = '0';
    }
    
    // Show card
    upNextCard.classList.add('show');
    
    // Start countdown
    startCountdown();
  }

  // Hide Up Next card
  function hideUpNextCard() {
    if (!upNextCard) return;
    
    upNextCard.classList.remove('show');
    clearTimeout(upNextTimer);
    clearInterval(countdownInterval);
    upNextTimer = null;
    countdownInterval = null;
  }

  // Start countdown timer
  function startCountdown() {
    clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
      countdownSeconds--;
      
      if (countdownText) countdownText.textContent = countdownSeconds;
      
      // Update ring progress (circumference = 2 * PI * r = 283)
      if (countdownRing) {
        const progress = countdownSeconds / COUNTDOWN_DURATION;
        const offset = 283 * (1 - progress);
        countdownRing.style.strokeDashoffset = offset;
      }
      
      // Auto-load when countdown reaches 0
      if (countdownSeconds <= 0) {
        clearInterval(countdownInterval);
        loadNextEpisode();
      }
    }, 1000);
  }

  // Check if we should show Up Next card
  function checkUpNextTrigger() {
    if (!v || !nextEpisode || upNextCard.classList.contains('show')) return;
    
    const timeRemaining = v.duration - v.currentTime;
    
    if (timeRemaining <= UP_NEXT_TRIGGER_TIME && timeRemaining > 0) {
      showUpNextCard();
    }
  }

  // Show/hide Next Episode button based on availability
  function updateNextEpisodeButton() {
    if (!overlayNextEp) return;
    
    if (nextEpisode) {
      overlayNextEp.style.display = 'flex';
    } else {
      overlayNextEp.style.display = 'none';
    }
  }

  // Event listeners
  if (overlayNextEp) {
    overlayNextEp.addEventListener('click', (e) => {
      e.stopPropagation();
      loadNextEpisode();
    });
  }

  if (upNextClose) {
    upNextClose.addEventListener('click', (e) => {
      e.stopPropagation();
      hideUpNextCard();
    });
  }

  if (upNextContent) {
    upNextContent.addEventListener('click', () => {
      loadNextEpisode();
    });
  }

  // Monitor video time for Up Next trigger
  if (v) {
    v.addEventListener('timeupdate', checkUpNextTrigger);
  }

  // Initialize
  await loadTitleDetails();
  nextEpisode = await findNextEpisode();
  updateNextEpisodeButton();
})();
