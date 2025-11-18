(function () {
    // Flag for playlist looping
    let isPlaylistLoopActive = false;
    let isInitialized = false; 
    
    // Core state variables
    let currentPlaylist = [];
    let currentIndex = -1;
    let audio = null;

    // UI elements (scoped globally within the module)
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
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    // --- UI Update Handlers ---

    function updatePlayIcon() {
        if (!playBtn) return;
        const icon = playBtn.querySelector('i'); 
        
        
        const target = icon || playBtn; 

        if (audio.paused || audio.ended) {
            if (target) {
                target.className = 'bx bx-play-circle'; 
            }
          
        } else {
            if (target) {
                target.className = 'bx bx-pause-circle'; 
            }
           
        }
    }

    function updateVolumeIcon() {
        if (!volumeBtn || !audio) return;
        const icon = volumeBtn.querySelector('i'); // Assuming icon is inside or is the element
        // If volumeBtn IS the icon (<i> tag), use volumeBtn directly. 
        // Your HTML: <i class="bx bx-volume" id="volume-btn"></i>
        const target = icon || volumeBtn; 

        if (audio.muted || audio.volume === 0) {
            target.className = 'bx bx-volume-mute'; 
        } else if (audio.volume < 0.5) {
            target.className = 'bx bx-volume-low'; 
        } else {
            target.className = 'bx bx-volume-full'; 
        }
    }
    
    function updateTime() {
        if (!audio || !progressBar || !timeCurrentEl || !timeTotalEl) return;

        const current = audio.currentTime;
        const duration = audio.duration || 0;

        // Set total duration only once it's available
        if (duration > 0 && timeTotalEl.textContent === '0:00') {
            timeTotalEl.textContent = formatTime(duration);
        }

        if (duration > 0) {
            // Update the width of the internal .progress div
            const progressDiv = progressBar.querySelector('.progress');
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
            const isVisible = volumeSlider.style.display !== 'none';
            volumeSlider.style.display = isVisible ? 'none' : 'inline-block';
        }
    }
    
    // --- Player Core Logic ---

    function loadTrack(track) {
        // ⭐ FIX: Changed 'track.src' to 'track.audio' to match your data structure
        if (!track || typeof track.audio !== 'string' || track.audio.length === 0) {
            console.error("Player Load Error: Track object is missing or 'audio' path is invalid. Data:", track);
            if (titleEl) titleEl.textContent = "Track Error";
            if (artistEl) artistEl.textContent = "Invalid file path";
            return; 
        }
        
        // Only reload if the source is actually different to avoid stutter on re-clicks
        if (audio.src.includes(track.audio)) {
            return; 
        }

        audio.src = track.audio; // ⭐ FIX: Set source to track.audio
        audio.load();

        if (titleEl) titleEl.textContent = track.title || "Unknown Title";
        if (artistEl) artistEl.textContent = track.artist || "Unknown Artist";
        
        const coverImg = document.getElementById('player-cover');
        if (coverImg && track.cover) {
            coverImg.src = track.cover;
        }

        if (timeTotalEl) timeTotalEl.textContent = '0:00'; 
    }

    function playIndex(index) {
        if (index < 0 || index >= currentPlaylist.length) {
            currentIndex = -1;
            return;
        }
        currentIndex = index;
        loadTrack(currentPlaylist[currentIndex]);
        
        // Attempt to play. We expect this might fail if triggered automatically without interaction.
        var playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                updatePlayIcon();
            })
            .catch(error => {
                console.warn("Autoplay prevented. Waiting for user interaction.");
                updatePlayIcon(); // Ensure icon shows 'Play' state
            });
        }
    }

    function playPause() {
        if (!currentPlaylist.length || currentIndex === -1) {
             // If player is idle, try playing the first track
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

        if (nextIndex >= currentPlaylist.length) {
            if (isPlaylistLoopActive) {
                nextIndex = 0;
            } else {
                audio.pause();
                currentIndex = -1; // Reset state
                updatePlayIcon();
                return;
            }
        }
        playIndex(nextIndex);
    }
    
    function playPrev() {
        if (currentPlaylist.length === 0) return;

        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
            // Loop back to the end if at the start
            prevIndex = currentPlaylist.length - 1; 
        }
        playIndex(prevIndex);
    }
    
    // --- Player Initialization ---
    
    function init(selectorOrEl) {
        if (isInitialized) return playerInterface;
        
        const container =
            typeof selectorOrEl === "string"
                ? document.querySelector(selectorOrEl)
                : selectorOrEl;
        if (!container) return null;
        
        // 1. Assign UI elements
        titleEl = container.querySelector("#player-song-title");
        artistEl = container.querySelector("#player-song-artist");
        playBtn = container.querySelector("#play-btn");
        prevBtn = container.querySelector("#prev-btn");
        nextBtn = container.querySelector("#next-btn");
        volumeBtn = container.querySelector("#volume-btn");
        progressBar = container.querySelector(".progress-bar"); // Selecting the container
        timeCurrentEl = container.querySelector("#current-time");
        timeTotalEl = container.querySelector("#duration-time");

        // 2. Create and append Audio element (hidden)
        audio = new Audio();
        audio.id = "audio-element";
        audio.preload = "metadata";
        audio.volume = 0.7; 
        
        // 3. Create Volume Slider if it doesn't exist
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

        // 4. Attach Event Listeners
        
        if (playBtn) playBtn.addEventListener("click", playPause);
        if (prevBtn) prevBtn.addEventListener("click", playPrev);
        if (nextBtn) nextBtn.addEventListener("click", playNext);
        
        if (volumeBtn) volumeBtn.addEventListener("click", toggleVolumeSliderVisibility);

        if (volumeSlider) {
            volumeSlider.addEventListener('input', function() {
                audio.volume = parseFloat(this.value);
            });
        }
        
        // Click on progress bar to seek
        if (progressBar) {
            progressBar.addEventListener('click', function(e) {
                if (!audio.duration) return;
                const rect = this.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percent = clickX / rect.width;
                audio.currentTime = percent * audio.duration;
            });
        }

        // Audio events
        audio.addEventListener("play", updatePlayIcon);
        audio.addEventListener("pause", updatePlayIcon);
        audio.addEventListener("ended", playNext); 
        audio.addEventListener("timeupdate", updateTime);
        audio.addEventListener("loadedmetadata", updateTime); 
        audio.addEventListener("volumechange", updateVolumeIcon); 

        // Initial UI state
        updatePlayIcon();
        updateVolumeIcon();

        isInitialized = true;
        return playerInterface;
    }
    
    // --- Public Player Interface ---

    const playerInterface = {
        init: init,
        loadList: function(list) {
            currentPlaylist = list || [];
            currentIndex = -1; 
        },
        playIndex: playIndex,
        playPause: playPause,
        playNext: playNext,
        playPrev: playPrev,
        toggleLoop: function() {
            isPlaylistLoopActive = !isPlaylistLoopActive;
            const loopBtn = document.getElementById('loop-btn');
            if (loopBtn) {
                 loopBtn.classList.toggle('active', isPlaylistLoopActive);
            }
            return isPlaylistLoopActive;
        }
    };

    // Expose the Player interface globally
    window.Player = playerInterface; 
    
})();