(function () {
  function init(selectorOrEl) {
    const container = (typeof selectorOrEl === 'string') ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!container) return null;

  
    const titleEl = container.querySelector('#player-song-title');
    const artistEl = container.querySelector('#player-song-artist');
    const playBtn = container.querySelector('#play-btn');
    const prevBtn = container.querySelector('#prev-btn');
    const nextBtn = container.querySelector('#next-btn');
    const loopBtn = container.querySelector('#loop-btn');
    const volumeBtn = container.querySelector('#volume-btn');
    // create the audio element first (required before initializing slider)
  const audio = document.createElement('audio');
    audio.id = 'audio-element';
    audio.preload = 'metadata';
    audio.style.display = 'none';
  // start volume at 100% as requested
  audio.volume = 1;
    container.appendChild(audio);

    // create or locate a volume slider inside player-controls
    const controlsEl = container.querySelector('.player-controls');
    let volumeSlider = controlsEl ? controlsEl.querySelector('#volume-slider') : null;
    if (!volumeSlider && controlsEl) {
      volumeSlider = document.createElement('input');
      volumeSlider.type = 'range';
      volumeSlider.id = 'volume-slider';
      volumeSlider.min = 0;
      volumeSlider.max = 1;
      volumeSlider.step = 0.01;
      volumeSlider.value = (typeof audio.volume === 'number') ? audio.volume : 1;
      // hidden by default; will be toggled when user clicks the volume button
      volumeSlider.style.display = 'none';
      volumeSlider.setAttribute('title', 'Volume');
      // small inline style; can be overridden by CSS
      volumeSlider.style.width = '96px';
      volumeSlider.style.marginLeft = '8px';
      // insert the slider after the volume button if possible
      if (volumeBtn && volumeBtn.parentNode) volumeBtn.parentNode.insertBefore(volumeSlider, volumeBtn.nextSibling);
      else if (controlsEl) controlsEl.appendChild(volumeSlider);
    }


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
      // notify listeners that a track was loaded (index detail)
      try { container.dispatchEvent(new CustomEvent('player:loaded', { detail: { index: state.currentIndex, track: m } })); } catch (e) { }
    }

    function togglePlayPause() {
      if (audio.paused) { audio.play(); setPlayIcon(false); try { container.dispatchEvent(new CustomEvent('player:play', { detail: { index: state.currentIndex } })); } catch (e) { } }
      else { audio.pause(); setPlayIcon(true); try { container.dispatchEvent(new CustomEvent('player:pause', { detail: { index: state.currentIndex } })); } catch (e) { } }
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
  if (prevBtn) prevBtn.addEventListener('click', function () { if (state.currentIndex > 0) { loadByIndex(state.currentIndex - 1); audio.play(); setPlayIcon(false); try { container.dispatchEvent(new CustomEvent('player:play', { detail: { index: state.currentIndex } })); } catch (e) {} } });
  if (nextBtn) nextBtn.addEventListener('click', function () { if (state.currentIndex < state.list.length - 1) { loadByIndex(state.currentIndex + 1); audio.play(); setPlayIcon(false); try { container.dispatchEvent(new CustomEvent('player:play', { detail: { index: state.currentIndex } })); } catch (e) {} } });

  // loop toggle: enable/disable HTMLAudioElement.loop
  if (loopBtn) {
    loopBtn.addEventListener('click', function () {
      audio.loop = !audio.loop;
      loopBtn.classList.toggle('active', audio.loop);
      try { container.dispatchEvent(new CustomEvent('player:loop', { detail: { loop: audio.loop } })); } catch (e) {}
    });
  }

  // volume handling: slider + mute/unmute toggle with icon update
    if (volumeBtn) {
      // remember previous non-zero volume to restore if needed
      let prevVolume = audio.volume || 1;
      function updateVolumeIcon() {
        if (!volumeBtn) return;
        // remove potential classes
        volumeBtn.classList.remove('bx-volume-mute','bx-volume-low','bx-volume','bx-volume-full');
        const vol = Number(audio.volume || 0);
        if (vol === 0) {
          volumeBtn.classList.add('bx-volume-mute');
        } else if (vol < 0.35) {
          volumeBtn.classList.add('bx-volume-low');
        } else if (vol < 0.75) {
          volumeBtn.classList.add('bx-volume');
        } else {
          volumeBtn.classList.add('bx-volume-full');
        }
      }

      // clicking volume button toggles visibility of the slider only
      volumeBtn.addEventListener('click', function (e) {
        if (!volumeSlider) return;
        const isHidden = volumeSlider.style.display === 'none' || volumeSlider.style.display === '';
        volumeSlider.style.display = isHidden ? 'inline-block' : 'none';
        if (isHidden) {
          // ensure slider reflects current volume
          volumeSlider.value = audio.volume;
          volumeSlider.focus();
        }
      });

      // slider changes volume
      if (volumeSlider) {
        volumeSlider.addEventListener('input', function () {
          const v = Number(volumeSlider.value);
          audio.volume = v;
          if (v > 0) prevVolume = v;
          updateVolumeIcon();
          try { container.dispatchEvent(new CustomEvent('player:volume', { detail: { muted: v === 0, volume: audio.volume } })); } catch (e) {}
        });
      }

      // set initial icon state
      updateVolumeIcon();
    }

    audio.addEventListener('timeupdate', function () {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      if (progressEl) progressEl.style.width = pct + '%';
    });

    audio.addEventListener('ended', function () {
      if (state.currentIndex < state.list.length - 1) { loadByIndex(state.currentIndex + 1); audio.play(); try { container.dispatchEvent(new CustomEvent('player:play', { detail: { index: state.currentIndex } })); } catch (e) {} }
      else { setPlayIcon(true); try { container.dispatchEvent(new CustomEvent('player:pause', { detail: { index: state.currentIndex } })); } catch (e) {} }
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
      playIndex: function (i) { loadByIndex(i); audio.play(); setPlayIcon(false); try { container.dispatchEvent(new CustomEvent('player:play', { detail: { index: state.currentIndex } })); } catch (e) {} },
      getCurrent: function () { return state.list[state.currentIndex] || null; }
    };
  }

  window.Player = { init };
})();
