(function () {
  function init(selectorOrEl) {
    const container =
      typeof selectorOrEl === "string"
        ? document.querySelector(selectorOrEl)
        : selectorOrEl;
    if (!container) return null;

    const titleEl = container.querySelector("#player-song-title");
    const artistEl = container.querySelector("#player-song-artist");
    const playBtn = container.querySelector("#play-btn");
    const prevBtn = container.querySelector("#prev-btn");
    const nextBtn = container.querySelector("#next-btn");
    const loopBtn = container.querySelector("#loop-btn");
    const volumeBtn = container.querySelector("#volume-btn");
    // create the audio element first (required before initializing slider)
    const audio = document.createElement("audio");
    audio.id = "audio-element";
    audio.preload = "metadata";
    audio.style.display = "none";

    audio.volume = 0.7;
    container.appendChild(audio);

    const controlsEl = container.querySelector(".player-controls");
    let volumeSlider = controlsEl
      ? controlsEl.querySelector("#volume-slider")
      : null;
    if (!volumeSlider && controlsEl) {
      volumeSlider = document.createElement("input");
      volumeSlider.type = "range";
      volumeSlider.id = "volume-slider";
      volumeSlider.min = 0;
      volumeSlider.max = 1;
      volumeSlider.step = 0.01;
      volumeSlider.value = typeof audio.volume === "number" ? audio.volume : 1;

      volumeSlider.style.display = "none";
      volumeSlider.setAttribute("title", "Volume");

      volumeSlider.style.width = "96px";
      volumeSlider.style.marginLeft = "8px";

      if (volumeBtn && volumeBtn.parentNode)
        volumeBtn.parentNode.insertBefore(volumeSlider, volumeBtn.nextSibling);
      else if (controlsEl) controlsEl.appendChild(volumeSlider);
    }

    let progressBar = container.querySelector(".progress-bar");
    if (!progressBar) {
      progressBar = document.createElement("div");
      progressBar.className = "progress-bar";
      const progress = document.createElement("div");
      progress.className = "progress";
      progressBar.appendChild(progress);
      container.appendChild(progressBar);
    }
    const progressEl = progressBar.querySelector(".progress");
    const currentTimeEl = container.querySelector("#current-time");
    const durationTimeEl = container.querySelector("#duration-time");

    const state = { list: [], currentIndex: -1 };

    function loadByIndex(i) {
      if (!state.list || i < 0 || i >= state.list.length) return;
      state.currentIndex = i;
      const m = state.list[i];
      audio.src = m.audio;
      if (titleEl) titleEl.textContent = m.title || "-";
      if (artistEl) artistEl.textContent = m.artist || "-";
      const img = container.querySelector(".song-info img");
      if (img && m.cover) img.src = m.cover;
      // increment play count in mock
      if (
        window.DataService &&
        typeof DataService.incrementPlayCount === "function"
      )
        DataService.incrementPlayCount(m.id);
      // notify listeners that a track was loaded (index detail)
      try {
        container.dispatchEvent(
          new CustomEvent("player:loaded", {
            detail: { index: state.currentIndex, track: m },
          })
        );
      } catch (e) {}
    }

    function togglePlayPause() {
      if (audio.paused) {
        audio.play();
        setPlayIcon(false);
        try {
          container.dispatchEvent(
            new CustomEvent("player:play", {
              detail: { index: state.currentIndex },
            })
          );
        } catch (e) {}
      } else {
        audio.pause();
        setPlayIcon(true);
        try {
          container.dispatchEvent(
            new CustomEvent("player:pause", {
              detail: { index: state.currentIndex },
            })
          );
        } catch (e) {}
      }
    }

    function setPlayIcon(isPlay) {
      if (!playBtn) return;
      if (playBtn.classList.contains("bx")) {
        // icon element
        if (isPlay) {
          playBtn.classList.remove("bx-pause-circle");
          playBtn.classList.add("bx-play-circle");
        } else {
          playBtn.classList.remove("bx-play-circle");
          playBtn.classList.add("bx-pause-circle");
        }
      } else {
        playBtn.textContent = isPlay ? "Play" : "Pause";
      }
    }

    if (playBtn)
      playBtn.addEventListener("click", function () {
        togglePlayPause();
      });
    if (prevBtn)
      prevBtn.addEventListener("click", function () {
        if (state.currentIndex > 0) {
          loadByIndex(state.currentIndex - 1);
          audio.play();
          setPlayIcon(false);
          try {
            container.dispatchEvent(
              new CustomEvent("player:play", {
                detail: { index: state.currentIndex },
              })
            );
          } catch (e) {}
        }
      });
    if (nextBtn)
      nextBtn.addEventListener("click", function () {
        if (state.currentIndex < state.list.length - 1) {
          loadByIndex(state.currentIndex + 1);
          audio.play();
          setPlayIcon(false);
          try {
            container.dispatchEvent(
              new CustomEvent("player:play", {
                detail: { index: state.currentIndex },
              })
            );
          } catch (e) {}
        }
      });

    if (loopBtn) {
      loopBtn.addEventListener("click", function () {
        audio.loop = !audio.loop;
        loopBtn.classList.toggle("active", audio.loop);
        try {
          container.dispatchEvent(
            new CustomEvent("player:loop", { detail: { loop: audio.loop } })
          );
        } catch (e) {}
      });
    }

    if (volumeBtn) {
      let prevVolume = audio.volume || 1;
      function updateVolumeIcon() {
        if (!volumeBtn) return;
        volumeBtn.classList.remove(
          "bx-volume-mute",
          "bx-volume-low",
          "bx-volume",
          "bx-volume-full"
        );
        const vol = Number(audio.volume || 0);
        if (vol === 0) {
          volumeBtn.classList.add("bx-volume-mute");
        } else if (vol < 0.35) {
          volumeBtn.classList.add("bx-volume-low");
        } else if (vol < 0.75) {
          volumeBtn.classList.add("bx-volume");
        } else {
          volumeBtn.classList.add("bx-volume-full");
        }
      }

      volumeBtn.addEventListener("click", function (e) {
        if (!volumeSlider) return;
        const isHidden =
          volumeSlider.style.display === "none" ||
          volumeSlider.style.display === "";
        volumeSlider.style.display = isHidden ? "inline-block" : "none";
        if (isHidden) {
          volumeSlider.value = audio.volume;
          volumeSlider.focus();
        }
      });

      if (volumeSlider) {
        volumeSlider.addEventListener("input", function () {
          const v = Math.min(1, Math.max(0, Number(volumeSlider.value)));
          audio.volume = v;
          if (v > 0) prevVolume = v;
          updateVolumeIcon();
          try {
            container.dispatchEvent(
              new CustomEvent("player:volume", {
                detail: { muted: v === 0, volume: audio.volume },
              })
            );
          } catch (e) {}
        });
      }

      updateVolumeIcon();
    }

    function formatTime(s) {
      if (!s || isNaN(s)) return "0:00";
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return m + ":" + (sec < 10 ? "0" + sec : sec);
    }

    audio.addEventListener("loadedmetadata", function () {
      if (durationTimeEl)
        durationTimeEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener("timeupdate", function () {
      if (!audio.duration) return;
      const pct = Math.min(100, (audio.currentTime / audio.duration) * 100);
      if (progressEl) progressEl.style.width = pct + "%";
      if (currentTimeEl)
        currentTimeEl.textContent = formatTime(audio.currentTime);
    });

    (function makeSeekable() {
      if (!progressBar) return;
      let isDown = false;
      function seekToEvent(e) {
        const rect = progressBar.getBoundingClientRect();
        const clientX =
          e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
        const pct =
          Math.min(Math.max(0, clientX - rect.left), rect.width) / rect.width;
        if (!audio.duration) return;
        if (progressEl) progressEl.style.width = pct * 100 + "%";

        audio.currentTime = pct * audio.duration;
      }
      progressBar.addEventListener("mousedown", function (e) {
        isDown = true;
        seekToEvent(e);
        e.preventDefault();
      });
      document.addEventListener("mousemove", function (e) {
        if (isDown){
          seekToEvent(e);

          e.preventDefault();
        } 
      });
      document.addEventListener("mouseup", function () {
        isDown = false;
      });

      // touch support
      progressBar.addEventListener("touchstart", function (e) {
        isDown = true;
        seekToEvent(e);
        e.preventDefault();
      });
      progressBar.addEventListener("touchmove", function (e) {
        if (isDown) seekToEvent(e);
      });
      progressBar.addEventListener("touchend", function () {
        isDown = false;
      });
    })();

    audio.addEventListener("ended", function () {
      if (progressEl) progressEl.style.width = "100%";
      if (state.currentIndex < state.list.length - 1) {
        loadByIndex(state.currentIndex + 1);
        audio.play();
        try {
          container.dispatchEvent(
            new CustomEvent("player:play", {
              detail: { index: state.currentIndex },
            })
          );
        } catch (e) {}
      } else {
        setPlayIcon(true);
        try {
          container.dispatchEvent(
            new CustomEvent("player:pause", {
              detail: { index: state.currentIndex },
            })
          );
        } catch (e) {}
      }
    });

    return {
      loadList: function (arr) {
        state.list = arr || [];
        if (state.list.length === 0) {
          // Default song if no list is provided
          state.list = [
            {
              id: 1,
              title: "UNDEAD",
              artist: "Yoasobi",
              audio: "Src/Music/UNDEAD - YOASOBI.mp3",
              cover: "Src/Card-img/Undead.jpg",
            },
          ];
        }
        if (state.list.length > 0 && state.currentIndex === -1) loadByIndex(0);
      },
      playIndex: function (i) {
        loadByIndex(i);
        audio.play();
        setPlayIcon(false);
        try {
          container.dispatchEvent(
            new CustomEvent("player:play", {
              detail: { index: state.currentIndex },
            })
          );
        } catch (e) {}
      },
      getCurrent: function () {
        return state.list[state.currentIndex] || null;
      },
    };
  }

  window.Player = { init };
})();
