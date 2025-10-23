(function () {
  function init(selectorOrEl) {
    const container = (typeof selectorOrEl === 'string') ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!container) return null;

  
    const titleEl = container.querySelector('#player-song-title');
    const artistEl = container.querySelector('#player-song-artist');
    const playBtn = container.querySelector('#play-btn');
    const prevBtn = container.querySelector('#prev-btn');
    const nextBtn = container.querySelector('#next-btn');


    const audio = document.createElement('audio');
    audio.id = 'audio-element';
    audio.preload = 'metadata';
    audio.style.display = 'none';
    container.appendChild(audio);


    let progressBar = container.querySelector('.progress-bar');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      const progress = document.createElement('div');
      progress.className = 'progress';
      progressBar.appendChild(progress);
      container.appendChild(progressBar);
    }
    const progressEl = progressBar.querySelector('.progress');

    const state = { list: [], currentIndex: -1 };

    function loadByIndex(i) {
      if (!state.list || i < 0 || i >= state.list.length) return;
      state.currentIndex = i;
      const m = state.list[i];
      audio.src = m.audio;
      if (titleEl) titleEl.textContent = m.title || '-';
      if (artistEl) artistEl.textContent = m.artist || '-';
      const img = container.querySelector('.song-info img');
      if (img && m.cover) img.src = m.cover;
      // increment play count in mock
      if (window.DataService && typeof DataService.incrementPlayCount === 'function') DataService.incrementPlayCount(m.id);
    }

    function togglePlayPause() {
      if (audio.paused) { audio.play(); setPlayIcon(false); }
      else { audio.pause(); setPlayIcon(true); }
    }

    function setPlayIcon(isPlay) {
      if (!playBtn) return;
      if (playBtn.classList.contains('bx')) {
        // icon element
        if (isPlay) { playBtn.classList.remove('bx-pause-circle'); playBtn.classList.add('bx-play-circle'); }
        else { playBtn.classList.remove('bx-play-circle'); playBtn.classList.add('bx-pause-circle'); }
      } else {
        playBtn.textContent = isPlay ? 'Play' : 'Pause';
      }
    }

    if (playBtn) playBtn.addEventListener('click', function () { togglePlayPause(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { if (state.currentIndex > 0) { loadByIndex(state.currentIndex - 1); audio.play(); setPlayIcon(false); } });
    if (nextBtn) nextBtn.addEventListener('click', function () { if (state.currentIndex < state.list.length - 1) { loadByIndex(state.currentIndex + 1); audio.play(); setPlayIcon(false); } });

    audio.addEventListener('timeupdate', function () {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      if (progressEl) progressEl.style.width = pct + '%';
    });

    audio.addEventListener('ended', function () {
      if (state.currentIndex < state.list.length - 1) { loadByIndex(state.currentIndex + 1); audio.play(); }
      else setPlayIcon(true);
    });

    return {
      loadList: function (arr) {
        state.list = arr || [];
        if (state.list.length === 0) {
          // Default song if no list is provided
          state.list = [{ id: 1, title: 'UNDEAD', artist: 'Yoasobi', audio: 'Src/Music/UNDEAD - YOASOBI.mp3', cover: 'Src/Card-img/Undead.jpg' }];
        }
        if (state.list.length > 0 && state.currentIndex === -1) loadByIndex(0);
      },
      playIndex: function (i) { loadByIndex(i); audio.play(); setPlayIcon(false); },
      getCurrent: function () { return state.list[state.currentIndex] || null; }
    };
  }

  window.Player = { init };
})();
