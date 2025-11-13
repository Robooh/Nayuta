// main.js

// Import all necessary Local Storage functions
import {
  getStoredUserProfile,
  saveUserProfile,
  getLastSection,
  saveLastSection,
  getUserPlayCounts,
  incrementUserPlayCount,
  getPlaylists,
  createNewPlaylist,
  deletePlaylist,
  addSongToPlaylist,
} from "./localStorageService.js";

document.addEventListener("DOMContentLoaded", function () {
  const playerContainer = document.querySelector(".player");
  const mainListEl = document.querySelector(".main-list");
  const genreSelect = document.getElementById("genre-select");
  let player = null;
  let currentDataHash = "";

  // --- Utility Functions (createCard, getFilteredList, etc.) ---

  function createCard(item, index) {
    const card = document.createElement("div");
    card.className = "music-card";
    card.dataset.id = item.id;

    const img = document.createElement("img");
    img.className = "music-card-img";
    img.src = item.cover || "Src/Card-img/Undead.jpg";
    img.alt = item.title || "";
    card.appendChild(img);

    const info = document.createElement("div");
    info.className = "music-card-info";
    const title = document.createElement("h4");
    title.textContent = item.title || "-";
    const artist = document.createElement("p");
    artist.textContent = item.artist || "-";
    const genre = document.createElement("small");
    genre.textContent = item.genre || "";
    info.appendChild(title);
    info.appendChild(artist);
    info.appendChild(genre);
    card.appendChild(info);

    const btn = document.createElement("button");
    btn.className = "load-btn";
    btn.style.display = "none";
    btn.textContent = "Load";
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!player) return;
      player.playIndex(index);
    });
    card.appendChild(btn);

    card.addEventListener("click", function () {
      if (!player) return;
      btn.style.display = "inline-block";
      setTimeout(() => {
        btn.style.display = "none";
      }, 2000);
      player.playIndex(index);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "add-playlist-btn";
    addBtn.textContent = "+ playlist";
    addBtn.dataset.songId = item.id; // Store the song's ID
    addBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      handleAddToPlaylist(item.id); // Call the new handler function
    });
    card.appendChild(addBtn);

    return card;
  }

  function getFilteredList() {
    const all = DataService.getAll() || [];
    const sel = genreSelect
      ? String(genreSelect.value || "")
          .trim()
          .toLowerCase()
      : "";
    return all.filter((item) => {
      const g = String(item.genre || "").toLowerCase();
      if (sel && sel !== "" && g !== sel) return false;
      return true;
    });
  }

  function populateGenreSelect() {
    if (!genreSelect) return;
    const all = DataService.getAll() || [];
    const genres = Array.from(
      new Set(all.map((x) => (x.genre || "").trim()).filter(Boolean))
    );
    const prev = genreSelect.value;
    genreSelect.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "All genres";
    genreSelect.appendChild(optAll);
    genres.forEach((g) => {
      const o = document.createElement("option");
      o.value = g;
      o.textContent = g;
      genreSelect.appendChild(o);
    });
    if (prev) {
      const match = Array.from(genreSelect.options).some(
        (o) => o.value === prev
      );
      if (match) genreSelect.value = prev;
      else genreSelect.value = "";
    }
  }

  function renderMainList() {
    if (!mainListEl) return;
    const list = getFilteredList();
    const hash =
      list.length +
      "|" +
      list.map((x) => x.id + ":" + (x.timesPlayed || 0)).join(",");
    if (hash === currentDataHash) return;
    currentDataHash = hash;

    const header = mainListEl.querySelector(".main-list-header");
    mainListEl.innerHTML = "";
    if (header) mainListEl.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "main-list-grid";

    list.forEach((item, i) => {
      const card = createCard(item, i);
      grid.appendChild(card);
    });

    mainListEl.appendChild(grid);

    if (player) player.loadList(list);
  }

  // --- Player Initialization ---
  if (playerContainer) {
    player = Player.init(playerContainer);
    const musicList = DataService.getAll();
    player.loadList(musicList);
  }

  // --- Suggested List / Recommendation Rendering ---
  function renderSuggested() {
    const container = document.getElementById("music-items");
    if (!container) return;
    container.innerHTML = "";

    const all = (DataService.getAll() || []).map((x) => Object.assign({}, x));

    // 🛑 Replaced direct localStorage access with function call
    let userPlays = getUserPlayCounts();

    all.forEach((t) => {
      const extra = Number(userPlays[t.id] || 0);
      t._score = Number(t.timesPlayed || 0) + extra;
    });

    const suggested = all
      .slice()
      .sort((a, b) => b._score - a._score)
      .slice(0, 5);
    suggested.forEach((t, idx) => {
      const item = document.createElement("div");
      item.className = "top-item";
      item.innerHTML = `<div class="top-item-left"><img src="${
        t.cover || "Src/Card-img/Undead.jpg"
      }" alt="${t.title}"/></div>
                <div class="top-item-right">
                    <div class="top-item-meta"><span class="rank">#${
                      idx + 1
                    }</span><span class="genre">${t.genre || ""}</span></div>
                    <h5 class="top-title">${t.title}</h5>
                    <p class="top-artist">${t.artist}</p>
                    <small class="plays">Plays: ${t._score || 0}</small>
                </div>`;
      item.addEventListener("click", function () {
        if (!player) return;
        player.loadList(suggested);
        player.playIndex(idx);
        // 🛑 Replaced direct localStorage increment with function call
        userPlays = incrementUserPlayCount(t.id);
      });
      container.appendChild(item);
    });
  }

  renderSuggested();
  setInterval(renderSuggested, 5000);

  // --- Slideshow (Trending) Logic ---
  (function initSlideshow() {
    const slideImg = document.getElementById("slide-image");
    const infoBox = document.querySelector(".trending .left .info");
    const listenBtn = document.querySelector(
      ".trending .left .info .btn button"
    );
    if (!slideImg || !infoBox) return;
    let slides = DataService.getTop5() || [];
    let idx = 0;
    let currentShown = 0;

    function show(i) {
      if (!slides || slides.length === 0) return;
      const t = slides[i % slides.length];
      currentShown = i % slides.length;
      slideImg.src = t.cover || "";
      const hs = infoBox.querySelector("h2");
      if (hs) hs.textContent = t.title || "";
      const h3 = infoBox.querySelector("h3");
      if (h3) h3.textContent = t.artist || "";
      const h4 = infoBox.querySelector("h4");
      if (h4) h4.textContent = t.album || "";
      const h6 = infoBox.querySelector("h6");
      if (h6) h6.textContent = "Number of Plays: " + (t.timesPlayed || 0);
    }

    if (listenBtn) {
      listenBtn.addEventListener("click", function () {
        if (!player) return;
        const top = DataService.getTop5() || [];
        player.loadList(top);
        const playIndex =
          (typeof currentShown === "number" ? currentShown : 0) %
          (top.length || 1);
        player.playIndex(playIndex);
      });
    }

    function tick() {
      slides = DataService.getTop5() || slides;
      show(idx);
      idx = (idx + 1) % (slides.length || 1);
    }

    tick();
    setInterval(tick, 6000);
  })();

  // --- Mobile Layout Adjustments Logic ---
  (function initMobileLayout() {
    const breakpoint = 992;
    const playerEl = document.querySelector(
      ".container .right-section .player"
    );
    let playerOriginalParent = playerEl ? playerEl.parentNode : null;

    function applyLayout() {
      const isMobile = window.innerWidth <= breakpoint;
      if (playerEl) {
        if (isMobile) {
          if (playerEl.parentNode !== document.body) {
            if (!playerOriginalParent)
              playerOriginalParent = playerEl.parentNode;
            document.body.appendChild(playerEl);
            playerEl.classList.add("mobile-moved");
          }
        } else {
          if (
            playerOriginalParent &&
            playerEl.parentNode !== playerOriginalParent
          ) {
            playerOriginalParent.appendChild(playerEl);
            playerEl.classList.remove("mobile-moved");
            playerOriginalParent = null;
          }
        }
      }
    }

    applyLayout();
    window.addEventListener("resize", applyLayout);
    window.addEventListener("orientationchange", function () {
      setTimeout(applyLayout, 60);
    });
  })();

  // --- Sidebar Interactions / Routing Logic ---
  (function initSidebarInteractions() {
    const sidebarLinks = Array.from(
      document.querySelectorAll(
        ".container .sidebar .menu ul li a[data-section]"
      )
    );
    const mainEl = document.querySelector("main");

    const sectionTitles = {
      explore: "Explore",
      albums: "Albums",
      artists: "Artists",
      recent: "Recent",
      "library-albums": "Albums (Library)",
      favorites: "Favorites",
      "create-playlist": "Create Playlist",
    };

    function renderBanner(key) {
      // ... (banner rendering logic remains the same)
    }

    function applySection(key, updateHash = true) {
      if (!key) return;
      sidebarLinks.forEach((a) =>
        a.classList.toggle("active", a.getAttribute("data-section") === key)
      );
      // 🛑 Replaced direct localStorage access with function call
      saveLastSection(key);
      renderBanner(key);
      if (updateHash) {
        const target = "#" + key;
        if (location.hash !== target) location.hash = key;
      }
    }

    sidebarLinks.forEach((a) => {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        const k = a.getAttribute("data-section");
        applySection(k, true);
      });
    });

    window.addEventListener("hashchange", function () {
      const key = window.location.hash.replace(/^#/, "");
      if (key) applySection(key, false);
    });

    // 🛑 Replaced direct localStorage access with function call
    const initial =
      (window.location.hash && window.location.hash.replace(/^#/, "")) ||
      getLastSection() ||
      (sidebarLinks[0] && sidebarLinks[0].getAttribute("data-section"));
    if (initial) applySection(initial, false);
  })();

  // --- Onboarding modal Logic ---
(function initOnboarding() {
    const onboardRoot = document.getElementById("onboard-root");
    const profileNameEl = document.getElementById("profile-name");
    const profileAvatarEls = document.querySelectorAll(
        ".profile-avatar, .profile .user .left img"
    );
    const playingTopImg = document.querySelector(
        ".container .sidebar .playing .top img"
    );

    // Default avatar path (assuming it exists)
    const DEFAULT_AVATAR = "Src/Logo/Arisu 2.0.png";

    function populateProfile(data) {
        if (!data) return;
        if (profileNameEl && data.name) profileNameEl.textContent = data.name;
        if (data.avatar) {
            profileAvatarEls.forEach((img) => {
                img.src = data.avatar;
            });
            if (playingTopImg) playingTopImg.src = data.avatar;
        }
    }

    const existing = getStoredUserProfile();

    if (existing) {
        populateProfile(existing);
        return; // Profile already set, exit function
    }
    
    // =======================================================
    // FIX: Modal Creation and Insertion (Missing Step)
    // This runs ONLY if the profile does not exist.
    // =======================================================
    if (onboardRoot) {
        onboardRoot.setAttribute('aria-hidden', 'false');
        onboardRoot.innerHTML = `
            <div id="onboard-overlay" class="onboard-overlay">
                <div class="onboard-modal">
                    <h2>Welcome to Nayuta!</h2>
                    <p>Let's set up your profile.</p>
                    <div class="onboard-avatar-section">
                        <img id="onboard-preview" src="${DEFAULT_AVATAR}" alt="Profile Preview" class="onboard-preview-img"/>
                        <label for="onboard-file" class="upload-label">
                            Upload Avatar
                            <input type="file" id="onboard-file" accept="image/*" style="display:none;"/>
                        </label>
                    </div>
                    <div class="onboard-input-section">
                        <label for="onboard-name">Your Name:</label>
                        <input type="text" id="onboard-name" placeholder="Enter name (e.g., Guest User)"/>
                    </div>
                    <div class="onboard-actions">
                        <button id="onboard-skip" class="btn-secondary">Skip</button>
                        <button id="onboard-save" class="btn-primary">Save Profile</button>
                    </div>
                </div>
            </div>
        `;
    }
    // =======================================================
    
    // Now that the elements are in the DOM, we can select them
    const overlay = document.getElementById("onboard-overlay");
    const preview = document.getElementById("onboard-preview");
    const inputName = document.getElementById("onboard-name");
    const inputFile = document.getElementById("onboard-file");
    const btnSave = document.getElementById("onboard-save");
    const btnSkip = document.getElementById("onboard-skip");

    // Check if critical elements were actually created before proceeding
    if (!preview || !inputFile || !btnSave || !btnSkip) {
        console.error("Onboarding modal elements failed to load.");
        return; 
    }
    
    let avatarData = preview.src; // This line now works!

    inputFile.addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                preview.src = event.target.result;
                avatarData = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    function closeOnboard() {
        if (onboardRoot) {
             onboardRoot.setAttribute('aria-hidden', 'true');
             onboardRoot.innerHTML = ''; // Clean up modal content
        }
    }

    btnSave.addEventListener("click", function () {
        const name = (inputName.value || "").trim() || "User";
        const data = { name: name, avatar: avatarData };
        saveUserProfile(data);
        populateProfile(data);
        closeOnboard();
    });

    btnSkip.addEventListener("click", function () {
        // Use the default avatar path if the user skips
        const data = { name: "User", avatar: DEFAULT_AVATAR };
        saveUserProfile(data);
        populateProfile(data);
        closeOnboard();
    });

    // Handle escape key and outside click to close/skip
    if (overlay) {
        overlay.addEventListener("click", function(e) {
            if (e.target === overlay) {
                btnSkip.click(); // Treat outside click as skip
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && onboardRoot.getAttribute('aria-hidden') === 'false') {
            btnSkip.click();
        }
    });

})(); // End of initOnboarding


  // initial render
  populateGenreSelect();
  renderMainList();

  // --- Search Autocomplete Logic ---
  (function initSearch() {
    const searchInput = document.getElementById("search-input");
    const searchResults = document.getElementById("search-results");

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener("input", function () {
      const query = searchInput.value.trim();
      if (!query) {
        searchResults.style.display = "none";
        return;
      }

      const results = DataService.search(query);
      searchResults.innerHTML = "";

      if (results.length === 0) {
        searchResults.style.display = "none";
        return;
      }

      results.forEach((song) => {
        const row = document.createElement("div");
        row.className = "search-row";

        const img = document.createElement("img");
        img.className = "search-thumb";
        img.src = song.cover || "Src/Card-img/Undead.jpg";
        img.alt = song.title;

        const textDiv = document.createElement("div");
        textDiv.className = "search-text";
        textDiv.innerHTML = `<strong>${song.title}</strong><br><small>${song.artist}</small>`;

        const playBtn = document.createElement("button");
        playBtn.className = "search-play";
        playBtn.textContent = "Play";
        playBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          playSong(song);
        });

        row.appendChild(img);
        row.appendChild(textDiv);
        row.appendChild(playBtn);

        row.addEventListener("click", function () {
          playSong(song);
        });

        searchResults.appendChild(row);
      });

      searchResults.style.display = "block";
    });

    searchInput.addEventListener("blur", function () {
      setTimeout(() => {
        searchResults.style.display = "none";
      }, 150); // Delay to allow click on results
    });

    function playSong(song) {
      if (!player) return;
      const allSongs = DataService.getAll();
      const index = allSongs.findIndex((s) => s.id === song.id);
      if (index !== -1) {
        player.loadList(allSongs);
        player.playIndex(index);
      }
      searchResults.style.display = "none";
      searchInput.value = "";
    }
  })();

  // wire filter events
  if (genreSelect) genreSelect.addEventListener("change", renderMainList);

  setInterval(function () {
    populateGenreSelect();
    renderMainList();
  }, 2000);

  function handleCreatePlaylist() {
    const playlistName = prompt("Enter a name for your new playlist:");

    if (playlistName && playlistName.trim()) {
      const newPlaylist = createNewPlaylist(playlistName.trim());
      alert(`Playlist "${newPlaylist.name}" created!`);

      updateSidebarMessages();
    } else if (playlistName !== null) {
      alert("Playlist name cannot be empty.");
    }
  }

  function handleViewPlaylist(playlistId) {
    const playlists = getPlaylists();
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      alert("Playlist not found.");
      return;
    }

    if (playlist.songs.length === 0) {
      alert(`Playlist "${playlist.name}" is empty.`);
      return;
    }

    // Get all songs and filter to playlist songs
    const allSongs = DataService.getAll() || [];
    const playlistSongs = allSongs.filter((song) =>
      playlist.songs.includes(song.id)
    );

    if (playlistSongs.length === 0) {
      alert(`No songs found in playlist "${playlist.name}".`);
      return;
    }

    // Load playlist into player and start playing first song
    if (player) {
      player.loadList(playlistSongs);
      player.playIndex(0);
      alert(
        `Playing playlist "${playlist.name}" with ${playlistSongs.length} songs.`
      );
    } else {
      alert("Player not initialized.");
    }
  }

  function handleDeletePlaylist(playlistId) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this playlist?"
    );
    if (!confirmDelete) return;

    const success = deletePlaylist(playlistId);
    if (success) {
      alert("Playlist deleted successfully.");
      updateSidebarMessages();
    } else {
      alert("Failed to delete playlist.");
    }
  }

  function updateSidebarMessages() {
    const playlistMenu = document.getElementById("playlist-menu");
    const artistMenu = document.getElementById("artist-menu");

    const playlists = getPlaylists();
    const hasPlaylists = playlists.length > 0;

    // Playlists
    if (playlistMenu) {
      // Clear existing playlist items
      const existingPlaylists = playlistMenu.querySelectorAll(".playlist-item");
      existingPlaylists.forEach((li) => li.remove());

      if (hasPlaylists) {
        // Render each playlist as simple inline item
        playlists.forEach((playlist) => {
          const li = document.createElement("li");
          li.className = "playlist-item";
          li.dataset.playlistId = playlist.id;

          const nameH5 = document.createElement("h5");
          nameH5.textContent = playlist.name;
          nameH5.className = "playlist-name";
          nameH5.style.display = "inline";
          nameH5.addEventListener("click", function () {
            handleViewPlaylist(playlist.id);
          });

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Delete";
          deleteBtn.className = "playlist-btn delete-btn";
          deleteBtn.style.float = "right";
          deleteBtn.addEventListener("click", function () {
            showDeleteModal(playlist);
          });

          li.appendChild(nameH5);
          li.appendChild(deleteBtn);
          playlistMenu.appendChild(li);
        });
      } else {
        // Show create button when no playlists
        let li = playlistMenu.querySelector(".empty-message");
        if (!li) {
          li = document.createElement("li");
          li.className = "empty-message";
          const btn = document.createElement("button");
          btn.className = "menu-empty-btn";
          li.appendChild(btn);
          playlistMenu.appendChild(li);
        }
        const btn = li.querySelector(".menu-empty-btn");
        btn.textContent = "Create Playlist";
        btn.onclick = function () {
          handleCreatePlaylist();
        };
      }
    }

    // Artists
    // ... (Artist menu logic remains the same)
  }

  function showDeleteModal(playlist) {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "delete-modal-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0, 0, 0, 0.6)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "200";

    // Modal content
    const modal = document.createElement("div");
    modal.className = "delete-modal-content";
    modal.style.background = "linear-gradient(180deg, #0f0f11, #151518)";
    modal.style.border = "1px solid rgba(255, 255, 255, 0.04)";
    modal.style.borderRadius = "12px";
    modal.style.padding = "18px";
    modal.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.6)";
    modal.style.color = "var(--text-color)";
    modal.style.maxWidth = "400px";
    modal.style.width = "100%";

    const title = document.createElement("h3");
    title.textContent = `Delete Playlist: ${playlist.name}`;
    title.style.margin = "0 0 8px 0";
    title.style.fontSize = "18px";
    title.style.color = "var(--main-color)";

    const info = document.createElement("p");
    info.textContent = `Songs in playlist: ${playlist.songs.length}`;
    info.style.margin = "0 0 12px 0";

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.justifyContent = "flex-end";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "btn-secondary";
    cancelBtn.addEventListener("click", function () {
      overlay.remove();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "btn-primary";
    deleteBtn.addEventListener("click", function () {
      handleDeletePlaylist(playlist.id);
      overlay.remove();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(deleteBtn);

    modal.appendChild(title);
    modal.appendChild(info);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  updateSidebarMessages();

  setInterval(updateSidebarMessages, 2000);

  (function initProfileActions() {})();
});

// Set current year in footer

document.getElementById("current-year").textContent = new Date().getFullYear();

/**
 * Handles the UI flow for adding a specific song to a user's playlist.
 * @param {string} songId - The ID of the song to be added.
 */

function handleAddToPlaylist(songId) {
  const playlists = getPlaylists();
  if (playlists.length === 0) {
    alert("No playlists found. Please create a playlist first.");
    return;
  }

  const playListOptions = playlists
    .map((p, index) => `{index + 1}. ${p.name}`)
    .join("\n");

  const selection = prompt(
    `Select a playlist to add the song:\n${playListOptions}\nEnter the number of the playlist:`
  );

  if (selection === null || selection.trim() === "") {
    return;
  }

  const selectedIndex = parseInt(selection.trim()) - 1;
  if (selectedIndex >= 0 && selectedIndex < playlists.length) {
    const selectedPlaylist = playlists[selectedIndex];

    const success = addSongToPlaylist(selectedPlaylist.id, songId);

    if (success) {
      alert(`Successfully added song to playlist: "${selectedPlaylist.name}"`);
    } else {
      alert(`Song is already in playlist: "${selectedPlaylist.name}"`);
    }
  } else {
    alert("Invalid selection. Please enter a valid number.");
  }
}
