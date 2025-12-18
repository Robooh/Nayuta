(function () {
  let isPlaylistLoopActive = false;
  let isInitialized = false;

  let currentPlaylist = [];
  let currentIndex = -1;
  let audio = null;

  let titleEl = null;
  let artistEl = null;
  let playBtn = null;
  let prevBtn = null;
  let nextBtn = null;
  let volumeBtn = null;
  let volumeSlider = null;
  let progressBar = null;
  let timeCurrentEl = null;
  let timeTotalEl = null;

  /**
   * Converts seconds to M:SS format.
   */
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "--:--";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  }

  function updatePlayIcon() {
    if (!playBtn) return;
    const icon = playBtn.querySelector("i");

    const target = icon || playBtn;

    if (audio.paused || audio.ended) {
      if (target) {
        target.className = "bx bx-play-circle";
      }
    } else {
      if (target) {
        target.className = "bx bx-pause-circle";
      }
    }
  }

  function updateVolumeIcon() {
    if (!volumeBtn || !audio) return;
    const icon = volumeBtn.querySelector("i");

    const target = icon || volumeBtn;

    if (audio.muted || audio.volume === 0) {
      target.className = "bx bx-volume-mute";
    } else if (audio.volume < 0.5) {
      target.className = "bx bx-volume-low";
    } else {
      target.className = "bx bx-volume-full";
    }
  }

  function updateTime() {
    if (!audio || !progressBar || !timeCurrentEl || !timeTotalEl) return;

    const current = audio.currentTime;
    const duration = audio.duration || 0;

    if (duration > 0 && timeTotalEl.textContent === "0:00") {
      timeTotalEl.textContent = formatTime(duration);
    }

    if (duration > 0) {
      const progressDiv = progressBar.querySelector(".progress");
      if (progressDiv) {
        const progressPercent = (current / duration) * 100;
        progressDiv.style.width = `${progressPercent}%`;
      }
      timeCurrentEl.textContent = formatTime(current);
    } else {
      timeCurrentEl.textContent = formatTime(current);
    }
  }

  function toggleVolumeSliderVisibility() {
    if (volumeSlider) {
      const isVisible = volumeSlider.style.display !== "none";
      volumeSlider.style.display = isVisible ? "none" : "inline-block";
    }
  }

  function loadTrack(track) {
    if (!track || typeof track.audio !== "string" || track.audio.length === 0) {
      console.error(
        "Player Load Error: Track object is missing or 'audio' path is invalid. Data:",
        track
      );
      if (titleEl) titleEl.textContent = "Track Error";
      if (artistEl) artistEl.textContent = "Invalid file path";
      return;
    }

    if (audio.src.includes(track.audio)) {
      return;
    }

    audio.src = track.audio;
    audio.load();

    if (titleEl) titleEl.textContent = track.title || "Unknown Title";
    if (artistEl) artistEl.textContent = track.artist || "Unknown Artist";

    const coverImg = document.getElementById("player-cover");
    if (coverImg && track.cover) {
      coverImg.src = track.cover;
    }

    if (timeTotalEl) timeTotalEl.textContent = "0:00";

    // Dispatch custom event for mobile player and other listeners to sync
    const trackLoadedEvent = new CustomEvent('trackLoaded', {
      detail: { track: track, audio: audio }
    });
    document.dispatchEvent(trackLoadedEvent);
  }

  function playIndex(index) {
    if (index < 0 || index >= currentPlaylist.length) {
      console.log(`[playIndex] Invalid index: ${index}, playlist length: ${currentPlaylist.length}`);
      currentIndex = -1;
      return;
    }
    currentIndex = index;
    console.log(`[playIndex] Loading track at index ${index}:`, currentPlaylist[currentIndex]);
    loadTrack(currentPlaylist[currentIndex]);

    console.log(`[playIndex] Attempting to play audio...`);
    var playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise
        .then((_) => {
          console.log(`[playIndex] Audio play() succeeded`);
          updatePlayIcon();
        })
        .catch((error) => {
          console.warn("[playIndex] Autoplay prevented or error:", error);
          updatePlayIcon();
        });
    } else {
      console.log(`[playIndex] audio.play() returned undefined`);
    }
  }

  function playPause() {
    if (!currentPlaylist.length || currentIndex === -1) {
      if (currentPlaylist.length > 0) {
        playIndex(0);
      }
      return;
    }
    if (audio.paused || audio.ended) {
      audio.play().then(() => updatePlayIcon());
    } else {
      audio.pause();
      updatePlayIcon();
    }
  }

  function playNext() {
    if (currentPlaylist.length === 0) return;

    let nextIndex = currentIndex + 1;
    console.log(`[playNext] currentIndex=${currentIndex}, nextIndex=${nextIndex}, playlistLength=${currentPlaylist.length}, loopActive=${isPlaylistLoopActive}`);

    if (nextIndex >= currentPlaylist.length) {
      if (isPlaylistLoopActive) {
        console.log("[playNext] Reached end of playlist, looping back to start");
        nextIndex = 0;
      } else {
        console.log("[playNext] Reached end of playlist, stopping");
        audio.pause();
        currentIndex = -1;
        updatePlayIcon();
        return;
      }
    }
    console.log(`[playNext] Playing index ${nextIndex}`);
    playIndex(nextIndex);
  }

  function playPrev() {
    if (currentPlaylist.length === 0) return;

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = currentPlaylist.length - 1;
    }
    playIndex(prevIndex);
  }

  function init(selectorOrEl) {
    if (isInitialized) return playerInterface;

    const container =
      typeof selectorOrEl === "string"
        ? document.querySelector(selectorOrEl)
        : selectorOrEl;
    if (!container) return null;

    titleEl = container.querySelector("#player-song-title");
    artistEl = container.querySelector("#player-song-artist");
    playBtn = container.querySelector("#play-btn");
    prevBtn = container.querySelector("#prev-btn");
    nextBtn = container.querySelector("#next-btn");
    volumeBtn = container.querySelector("#volume-btn");
    progressBar = container.querySelector(".progress-bar");
    timeCurrentEl = container.querySelector("#current-time");
    timeTotalEl = container.querySelector("#duration-time");

    audio = new Audio();
    audio.id = "audio-element";
    audio.preload = "metadata";
    audio.volume = 0.7;
    // Add audio element to DOM for external sync (mobile player, etc.)
    if (!document.getElementById("audio-element")) {
      document.body.appendChild(audio);
    }

    volumeSlider = container.querySelector("#volume-slider");
    const controlsEl = container.querySelector(".player-controls");

    if (!volumeSlider && controlsEl) {
      volumeSlider = document.createElement("input");
      volumeSlider.type = "range";
      volumeSlider.id = "volume-slider";
      volumeSlider.min = 0;
      volumeSlider.max = 1;
      volumeSlider.step = 0.01;
      volumeSlider.value = audio.volume;
      volumeSlider.style.display = "none";
      volumeSlider.setAttribute("title", "Volume");

      if (volumeBtn && volumeBtn.parentNode) {
        volumeBtn.parentNode.insertBefore(volumeSlider, volumeBtn.nextSibling);
      } else {
        controlsEl.appendChild(volumeSlider);
      }
    }

    if (volumeSlider) {
      audio.volume = parseFloat(volumeSlider.value);
    }

    if (playBtn) playBtn.addEventListener("click", playPause);
    if (prevBtn) prevBtn.addEventListener("click", playPrev);
    if (nextBtn) nextBtn.addEventListener("click", playNext);

    const loopBtn = container.querySelector("#loop-btn");
    if (loopBtn) loopBtn.addEventListener("click", playerInterface.toggleLoop);

    if (volumeBtn)
      volumeBtn.addEventListener("click", toggleVolumeSliderVisibility);

    if (volumeSlider) {
      volumeSlider.addEventListener("input", function () {
        audio.volume = parseFloat(this.value);
      });
    }

    if (progressBar) {
      progressBar.addEventListener("click", function (e) {
        if (!audio.duration) return;
        const rect = this.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = clickX / rect.width;
        audio.currentTime = percent * audio.duration;
      });
    }

    audio.addEventListener("play", updatePlayIcon);
    audio.addEventListener("pause", updatePlayIcon);
    audio.addEventListener("ended", function() {
      console.log(`[audio.ended] Song ended, currentIndex=${currentIndex}, isPlaylistLoopActive=${isPlaylistLoopActive}`);
      playNext();
    });
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateTime);
    audio.addEventListener("volumechange", updateVolumeIcon);

    updatePlayIcon();
    updateVolumeIcon();

    isInitialized = true;
    return playerInterface;
  }

  const playerInterface = {
    init: init,
    loadList: function (list) {
      currentPlaylist = list || [];
      currentIndex = -1;
    },
    playIndex: playIndex,
    playPause: playPause,
    playNext: playNext,
    playPrev: playPrev,
    toggleLoop: function () {
      isPlaylistLoopActive = !isPlaylistLoopActive;
      console.log(`[toggleLoop] Loop state changed to: ${isPlaylistLoopActive}`);
      const loopBtn = document.getElementById("loop-btn");
      if (loopBtn) {
        loopBtn.classList.toggle("active", isPlaylistLoopActive);
      }
      return isPlaylistLoopActive;
    },
  };

  window.Player = playerInterface;
})();
