// Mobile player controller
(function () {
  const overlayId = 'mobile-player-overlay';
  const overlay = document.getElementById(overlayId) || (function create() {
    const div = document.createElement('div');
    div.id = overlayId;
    div.className = 'mobile-player-overlay';
    div.setAttribute('aria-hidden', 'true');
    div.innerHTML = `
      <div class="mobile-player-card" role="dialog" aria-modal="true">
        <header class="mp-header">
          <button class="mp-close" aria-label="Fechar">✕</button>
          <div class="mp-title">Now Playing</div>
          <button class="mp-more" aria-label="Mais">⋯</button>
        </header>
        <main class="mp-main">
          <div class="mp-art">
            <img id="mp-cover" src="Src/Card-img/Undead.jpg" alt="cover" />
          </div>
          <div class="mp-info">
            <h3 id="mp-title">Song Title</h3>
            <p id="mp-artist">Artist Name</p>
          </div>
          <div class="mp-progress">
            <div class="mp-time mp-time-current">0:00</div>
            <div class="mp-bar" role="slider" aria-valuemin="0" aria-valuemax="100" tabindex="0">
              <div class="mp-bar-fill"></div>
            </div>
            <div class="mp-time mp-time-total">0:00</div>
          </div>
          <div class="mp-controls">
            <button class="mp-btn mp-loop" title="Loop"><i class="bx bx-repeat"></i></button>
            <button class="mp-btn mp-prev" title="Prev"><i class="bx bx-skip-previous"></i></button>
            <button class="mp-play mp-btn" title="Play"><i class="bx bx-play"></i></button>
            <button class="mp-btn mp-next" title="Next"><i class="bx bx-skip-next"></i></button>
            <button class="mp-btn mp-shuffle" title="Shuffle"><i class="bx bx-shuffle"></i></button>
          </div>
        </main>
      </div>
    `;
    document.body.appendChild(div);
    return div;
  })();

  function $(sel, root = document) { return root.querySelector(sel); }

  const mpClose = $('.mp-close', overlay);
  const mpPlay = $('.mp-play', overlay);
  const mpPrev = $('.mp-prev', overlay);
  const mpNext = $('.mp-next', overlay);
  const mpLoop = $('.mp-loop', overlay);
  const mpCover = $('#mp-cover', overlay);
  const mpTitle = $('#mp-title', overlay);
  const mpArtist = $('#mp-artist', overlay);
  const mpBar = $('.mp-bar', overlay);
  const mpBarFill = $('.mp-bar-fill', overlay);
  const mpTimeCurrent = $('.mp-time-current', overlay);
  const mpTimeTotal = $('.mp-time-total', overlay);

  function openMobilePlayer() {
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    syncWithAudio();
    startTicker();
  }

  function closeMobilePlayer() {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('open');
    stopTicker();
  }

  mpClose.addEventListener('click', closeMobilePlayer);

  function safeCall(fnName) {
    try { if (window.Player && typeof window.Player[fnName] === 'function') window.Player[fnName](); }
    catch (e) { console.warn('mobilePlayer call failed', fnName, e); }
  }

  mpPlay.addEventListener('click', function () { safeCall('playPause'); updatePlayIcon(); });
  mpPrev.addEventListener('click', function () { safeCall('playPrev'); setTimeout(syncWithAudio, 100); });
  mpNext.addEventListener('click', function () { safeCall('playNext'); setTimeout(syncWithAudio, 100); });
  mpLoop.addEventListener('click', function () { const val = safeToggleLoop(); toggleLoopActiveClass(val); });

  function safeToggleLoop() { try { return window.Player && window.Player.toggleLoop ? window.Player.toggleLoop() : false; } catch (e) { return false; } }

  function toggleLoopActiveClass(active) { if (active) mpLoop.classList.add('active'); else mpLoop.classList.remove('active'); }

  function updatePlayIcon() {
    const audio = document.getElementById('audio-element');
    const icon = $('.mp-play i', overlay);
    if (!audio) return;
    if (audio.paused) icon.className = 'bx bx-play'; else icon.className = 'bx bx-pause';
  }

  function syncWithAudio() {
    const audio = document.getElementById('audio-element');
    if (!audio) return;
    const title = document.getElementById('player-song-title');
    const artist = document.getElementById('player-song-artist');
    const cover = document.getElementById('player-cover');
    if (title) mpTitle.textContent = title.textContent || '';
    if (artist) mpArtist.textContent = artist.textContent || '';
    if (cover && cover.src) mpCover.src = cover.src;
    updatePlayIcon();
    mpTimeTotal.textContent = formatTime(audio.duration);
    mpTimeCurrent.textContent = formatTime(audio.currentTime);
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    mpBarFill.style.width = pct + '%';
  }

  function formatTime(s) { if (!s || isNaN(s)) return '0:00'; const m = Math.floor(s/60); const sec = Math.floor(s%60); return m + ':' + (sec<10? '0'+sec:sec); }

  let ticker = null;
  function startTicker() { if (ticker) return; ticker = setInterval(syncWithAudio, 250); }
  function stopTicker() { if (!ticker) return; clearInterval(ticker); ticker = null; }

  mpBar.addEventListener('click', function (e) {
    const audio = document.getElementById('audio-element'); if (!audio || !audio.duration) return;
    const rect = mpBar.getBoundingClientRect(); const pct = Math.min(Math.max(0,(e.clientX-rect.left)/rect.width),1);
    audio.currentTime = pct * audio.duration;
    syncWithAudio();
  });

  // Swipe down to close (touch)
  (function setupSwipeToClose() {
    const card = overlay.querySelector('.mobile-player-card');
    if (!card) return;
    let startY = 0, curY = 0, touching = false;
    function onTouchStart(e) { touching = true; startY = e.touches ? e.touches[0].clientY : e.clientY; card.style.transition = 'none'; }
    function onTouchMove(e) { if (!touching) return; curY = e.touches ? e.touches[0].clientY : e.clientY; const dy = Math.max(0, curY - startY); card.style.transform = `translateY(${dy}px)`; }
    function onTouchEnd(e) { if (!touching) return; touching = false; const dy = Math.max(0, curY - startY); card.style.transition = ''; card.style.transform = ''; if (dy > 120) { closeMobilePlayer(); } }
    card.addEventListener('touchstart', onTouchStart, {passive:true});
    card.addEventListener('touchmove', onTouchMove, {passive:true});
    card.addEventListener('touchend', onTouchEnd);
    // mouse fallback
    card.addEventListener('mousedown', function(e){ onTouchStart(e); function mm(ev){ onTouchMove(ev); } function mu(ev){ onTouchEnd(ev); document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu);} document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu); });
  })();

  document.addEventListener('mobilePlayer', function (e) { openMobilePlayer(); });

  // Listen for trackLoaded event from Player.js to sync track data immediately
  document.addEventListener('trackLoaded', function(e) {
    const track = e.detail.track;
    if (!track) return;
    if (track.cover && mpCover) mpCover.src = track.cover;
    if (track.title && mpTitle) mpTitle.textContent = track.title;
    if (track.artist && mpArtist) mpArtist.textContent = track.artist;
    console.log('[mobilePlayer] Track data synced:', track.title, '-', track.artist);
  });

  const audioEl = document.getElementById('audio-element');
  if (audioEl) {
    audioEl.addEventListener('play', updatePlayIcon);
    audioEl.addEventListener('pause', updatePlayIcon);
    audioEl.addEventListener('timeupdate', function(){
      syncWithAudio();
    });
    audioEl.addEventListener('loadedmetadata', syncWithAudio);
  }

})();
