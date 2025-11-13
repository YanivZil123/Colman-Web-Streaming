(function() {
  let actionTimer = null;

  function ensureLayer() {
    let layer = document.querySelector('.profile-transition-overlay');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'profile-transition-overlay';
      layer.innerHTML = `
        <div class="profile-transition-core">
          <div class="profile-transition-pulse"></div>
          <div class="profile-transition-pulse profile-transition-pulse-delayed"></div>
          <div class="profile-transition-spinner"></div>
        </div>
        <div class="profile-transition-label">Switching Profile</div>
      `;
      document.body.appendChild(layer);
    }
    return layer;
  }

  function showLayer() {
    const layer = ensureLayer();
    requestAnimationFrame(() => {
      layer.classList.add('show');
    });
    document.body.classList.add('profile-transition-active');
    return layer;
  }

  function hideLayer() {
    const layer = document.querySelector('.profile-transition-overlay');
    if (layer) {
      layer.classList.remove('show');
    }
    document.body.classList.remove('profile-transition-active');
  }

  window.profileTransition = {
    play(action) {
      showLayer();
      if (actionTimer) {
        clearTimeout(actionTimer);
      }
      actionTimer = setTimeout(() => {
        if (typeof action === 'function') {
          action();
        } else {
          hideLayer();
        }
      }, 650);
    },
    cancel() {
      if (actionTimer) {
        clearTimeout(actionTimer);
        actionTimer = null;
      }
      hideLayer();
    }
  };
})();
