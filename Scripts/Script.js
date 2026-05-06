import {
  getStoredUserProfile,
  saveUserProfile,
  getUserPlayCounts,
  incrementUserPlayCount,
  getPlaylists,
  createNewPlaylist,
  deletePlaylist,
  addSongToPlaylist,
  addToRecents,
  getRecents
} from "./localStorageService.js";

document.addEventListener("DOMContentLoaded", function () {
  const playerContainer = document.querySelector(".player");
  const mainListEl = document.querySelector(".main-list");
  const genreSelect = document.getElementById("genre-select");
  const topListContainer = document.getElementById("music-items");
  const topListTitle = document.getElementById("show-all-songs");
  const playerCover = document.getElementById("player-cover");
  const playerTitle = document.getElementById("player-song-title");
  const playerArtist = document.getElementById("player-song-artist");

  // --- Search Elements ---
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");

  let player = null;
  let currentTopView = "explore";
  const DEFAULT_AVATAR = "Src/Logo/Arisu 2.0.png";

  // Set current year in footer
  const yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (playerCover && !playerCover.getAttribute("src")) {
    playerCover.src = "Src/Card-img/Blank.jpg";
    if (playerTitle) playerTitle.textContent = "Select a Song";
    if (playerArtist) playerArtist.textContent = "Nayuta Player";
  }

  const container = document.querySelector(".container");
  if (container) container.classList.remove("sidebar-active");

  // =============================================
  // 1. PLAY FROM CARD
  // =============================================
  function playSongFromCard(song, listType) {
    if (!player) {
      console.error("Player object is not initialized.");
      return;
    }

    let playlist = [];
    let songIndex = -1;

    if (listType === "personalized") {
      playlist = currentTopView === "explore" ? getTop5List() : getRecentList();
    } else if (listType === "search") {
      playlist = [song];
    } else {
      playlist = getFilteredList();
    }

    if (playlist.length > 0) {
      songIndex = playlist.findIndex((s) => s.id === song.id);
    }

    if (songIndex !== -1) {
      player.loadList(playlist);
      player.playIndex(songIndex);

      incrementUserPlayCount(song.id);
      DataService.incrementPlayCount(song.id);
      addToRecents(song.id);

      renderTopSection();
    } else {
      console.warn(`Song ID ${song.id} not found in playlist for type: ${listType}`);
    }
  }

  // =============================================
  // 2. CARD CREATION
  // =============================================
  function createCard(item, index, listType = "main") {
    const card = document.createElement("div");
    card.className = "music-card";
    card.dataset.id = item.id;

    const playlistBtn = document.createElement("button");
    playlistBtn.className = "add-to-playlist-btn";
    playlistBtn.innerHTML = "<i class='bx bx-plus-medical'></i>";
    playlistBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof window.showAddToPlaylistModal === "function") {
        window.showAddToPlaylistModal(item.id, item.title);
      } else {
        alert("A função de adicionar playlist não está disponível.");
      }
    });
    card.appendChild(playlistBtn);

    const img = document.createElement("img");
    img.className = "music-card-img";
    img.src = item.cover || "Src/Card-img/Undead.jpg";
    img.onerror = function () { this.src = "Src/Card-img/Undead.jpg"; };
    card.appendChild(img);

    const info = document.createElement("div");
    info.className = "music-card-info";

    const title = document.createElement("h4");
    title.textContent = item.title || "Unknown";

    const artist = document.createElement("p");
    artist.textContent = item.artist || "Unknown";

    const genre = document.createElement("small");
    if (listType === "personalized" && currentTopView === "explore") {
      genre.textContent = `Plays: ${item._score || item.timesPlayed || 0}`;
    } else {
      genre.textContent = item.genre || "Music";
    }

    info.appendChild(title);
    info.appendChild(artist);
    info.appendChild(genre);
    card.appendChild(info);

    card.addEventListener("click", () => {
      playSongFromCard(item, listType);
    });

    return card;
  }

  // =============================================
  // 3. DATA GETTERS
  // =============================================
  function getFilteredList() {
    const all = DataService.getAll() || [];
    const sel = genreSelect ? genreSelect.value.toLowerCase() : "";
    return all.filter((item) => {
      const g = (item.genre || "").toLowerCase();
      return !sel || g === sel;
    });
  }

  function getRandom5List() {
    const all = DataService.getAll() || [];
    if (all.length <= 5) return all;
    let shuffled = all.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 5);
  }

  function getTop5List() {
    const all = (DataService.getAll() || []).map((x) => ({ ...x }));
    let userPlays = getUserPlayCounts();
    all.forEach((t) => {
      t._score = (t.timesPlayed || 0) + (userPlays[t.id] || 0);
    });
    return all.sort((a, b) => b._score - a._score).slice(0, 5);
  }

  function getRecentList() {
    const historyIds = getRecents();
    if (historyIds.length === 0) return [];
    const all = DataService.getAll();
    return historyIds.map((id) => all.find((s) => s.id === id)).filter(Boolean).slice(0, 5);
  }

  // =============================================
  // 4. RENDERING
  // =============================================
  function renderTopSection() {
    if (!topListContainer) return;
    topListContainer.innerHTML = "";
    topListContainer.className = "personalized-songs-grid";

    let data = [];
    if (currentTopView === "explore") {
      if (topListTitle) topListTitle.textContent = "Most Played (Top 5)";
      data = getTop5List();
    } else {
      if (topListTitle) topListTitle.textContent = "Recently Played";
      data = getRecentList();
    }

    if (data.length === 0) {
      topListContainer.innerHTML = "<p style='color:#aaa; padding:20px;'>No songs found.</p>";
      return;
    }

    data.forEach((item, idx) => {
      const card = createCard(item, idx, "personalized");
      topListContainer.appendChild(card);
    });
  }

  function renderMainList() {
    if (!mainListEl) return;
    const list = getFilteredList();

    const existingGrid = mainListEl.querySelector(".main-list-grid");
    if (existingGrid) existingGrid.remove();

    const grid = document.createElement("div");
    grid.className = "main-list-grid";

    list.forEach((item, i) => {
      const card = createCard(item, i, "main");
      grid.appendChild(card);
    });

    mainListEl.appendChild(grid);
  }

  function populateGenreSelect() {
    if (!genreSelect) return;
    const all = DataService.getAll() || [];
    const genres = Array.from(new Set(all.map((x) => x.genre).filter(Boolean)));
    const current = genreSelect.value;
    genreSelect.innerHTML = `<option value="">All genres</option>`;
    genres.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      genreSelect.appendChild(opt);
    });
    genreSelect.value = current;
  }

  // =============================================
  // 5. SEARCH
  // =============================================
  if (searchInput && searchResults) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      if (query.length === 0) {
        searchResults.style.display = "none";
        return;
      }

      const results = DataService.search(query);
      searchResults.innerHTML = "";

      if (results.length === 0) {
        searchResults.innerHTML = `<div style="padding:10px; color:#aaa">No results found</div>`;
      } else {
        results.forEach((song) => {
          const row = document.createElement("div");
          row.className = "search-row";
          row.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${song.cover}" class="search-thumb" />
              <div>
                <div class="search-text" style="font-weight:600">${song.title}</div>
                <div class="search-text" style="font-size:12px; color:var(--text-muted)">${song.artist}</div>
              </div>
            </div>
            <button class="search-play"><i class="bx bx-play"></i></button>
          `;
          row.addEventListener("click", () => {
            playSongFromCard(song, "search");
            searchResults.style.display = "none";
            searchInput.value = "";
          });
          searchResults.appendChild(row);
        });
      }

      searchResults.style.display = "block";
    });

    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = "none";
      }
    });
  }

  // =============================================
  // 6. SIDEBAR NAVIGATION
  // =============================================
  const sidebarLinks = document.querySelectorAll(".sidebar .menu ul li a");
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      sidebarLinks.forEach((l) => l.classList.remove("active"));
      this.classList.add("active");

      const section = this.getAttribute("data-section");
      if (section === "explore") {
        currentTopView = "explore";
        renderTopSection();
        window.location.hash = "explore";
      } else if (section === "recent") {
        currentTopView = "recent";
        renderTopSection();
        window.location.hash = "recent";
      }
    });
  });

  // =============================================
  // 7. PLAYER INIT
  // =============================================
  if (playerContainer && typeof Player !== "undefined") {
    player = Player.init(playerContainer);
  }

  // =============================================
  // 7.5 QUEUE SYSTEM - Display playlist songs
  // =============================================
  function updateQueueDisplay() {
    const queueList = document.getElementById("queue-list");
    if (!queueList) return;

    const playlists = getPlaylists();
    const allSongs = DataService.getAll() || [];
    const allSongIds = new Set();
    
    // Collect all unique song IDs from all playlists
    playlists.forEach(playlist => {
      if (playlist.songs && Array.isArray(playlist.songs)) {
        playlist.songs.forEach(songId => allSongIds.add(songId));
      }
    });

    if (allSongIds.size === 0) {
      queueList.innerHTML = '<div class="queue-empty">No songs in queue</div>';
      return;
    }

    // Get song objects
    const queueSongs = allSongs.filter(song => allSongIds.has(song.id));
    
    queueList.innerHTML = '';
    queueSongs.forEach(song => {
      const queueItem = document.createElement("div");
      queueItem.className = "queue-item";
      queueItem.dataset.id = song.id;
      
      queueItem.innerHTML = `
        <img src="${song.cover}" alt="${song.title}" />
        <div class="queue-item-info">
          <h6>${song.title}</h6>
          <p>${song.artist}</p>
        </div>
      `;

      queueItem.addEventListener("click", () => {
        playSongFromCard(song, "queue");
        // Highlight current song
        document.querySelectorAll(".queue-item").forEach(item => {
          item.classList.remove("active");
        });
        queueItem.classList.add("active");
      });

      queueList.appendChild(queueItem);
    });
  }

  // Update queue on initial load
  updateQueueDisplay();

  // Update queue when a song is added to playlist
  document.addEventListener("playlistUpdated", () => {
    updateQueueDisplay();
  });

  // Mobile: open full player overlay on compact bar tap
  (function setupMobilePlayerTap() {
    function addHandler() {
      const pl = document.querySelector(".player");
      if (!pl || pl._mobileHandlerAdded) return;
      pl.addEventListener("click", function (e) {
        if (window.innerWidth > 992) return;
        if (e.target.closest("button, .player-controls, input, a, i")) return;
        e.stopPropagation();
        document.dispatchEvent(new CustomEvent("mobilePlayer", { detail: { source: "player" } }));
      });
      pl._mobileHandlerAdded = true;
    }
    addHandler();
    window.addEventListener("resize", addHandler);
  })();

  // =============================================
  // 8. SLIDESHOW / TRENDING
  // =============================================
  const slideImg    = document.getElementById("slide-image");
  const trendTitle  = document.getElementById("trending-title");
  const trendArtist = document.getElementById("trending-artist");
  const trendGenre  = document.getElementById("trending-genre");
  const listenBtn   = document.getElementById("trending-listen-btn");
  const addBtn      = document.getElementById("trending-add-btn");

  let slideIndex = 0;
  let trendingSongs = [];

  function slideshowTick() {
    if (slideIndex === 0 || trendingSongs.length === 0) {
      trendingSongs = getRandom5List();
    }
    if (!trendingSongs.length || !slideImg) return;

    slideIndex = (slideIndex + 1) % trendingSongs.length;
    const song = trendingSongs[slideIndex];

    slideImg.src = song.cover || "Src/Card-img/Undead.jpg";
    slideImg.onerror = function () { this.src = "Src/Card-img/Undead.jpg"; };

    if (trendTitle)  trendTitle.textContent  = song.title  || "";
    if (trendArtist) trendArtist.textContent = song.artist || "";
    if (trendGenre)  trendGenre.textContent  = song.genre  || "";

    if (listenBtn) {
      listenBtn.onclick = () => {
        if (player) {
          player.loadList(trendingSongs);
          player.playIndex(slideIndex);
          incrementUserPlayCount(song.id);
          addToRecents(song.id);
          renderTopSection();
        }
      };
    }

    if (addBtn) {
      addBtn.onclick = (e) => {
        e.stopPropagation();
        if (typeof window.showAddToPlaylistModal === "function") {
          window.showAddToPlaylistModal(song.id, song.title);
        }
      };
    }
  }

  slideshowTick();
  setInterval(slideshowTick, 5000);

  // =============================================
  // 9. PROFILE & LOGOUT (desktop + mobile)
  // =============================================
  const settingsBtn      = document.getElementById("settings-btn");
  const settingsDrop     = document.getElementById("settings-dropdown");
  const logoutBtn        = document.getElementById("logout-btn");
  const mobileSettingsBtn  = document.getElementById("settings-btn-mobile");
  const mobileSettingsDrop = document.getElementById("settings-dropdown-mobile");
  const mobileLogoutBtn    = document.getElementById("logout-btn-mobile");

  function handleLogout(e) {
    e.preventDefault();
    if (confirm("Log out? Your play history and local profile will be cleared.")) {
      localStorage.removeItem("nayuta_user");
      localStorage.removeItem("nayuta_play_counts");
      localStorage.removeItem("nayuta_recent_history");
      window.location.reload();
    }
  }

  if (settingsBtn && settingsDrop) {
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (mobileSettingsDrop) mobileSettingsDrop.classList.remove("open");
      settingsDrop.classList.toggle("open");
    });
  }

  if (mobileSettingsBtn && mobileSettingsDrop) {
    mobileSettingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (settingsDrop) settingsDrop.classList.remove("open");
      mobileSettingsDrop.classList.toggle("open");
    });
  }

  if (logoutBtn)       logoutBtn.addEventListener("click", handleLogout);
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener("click", handleLogout);

  document.addEventListener("click", () => {
    if (settingsDrop)       settingsDrop.classList.remove("open");
    if (mobileSettingsDrop) mobileSettingsDrop.classList.remove("open");
  });

  // =============================================
  // 10. ONBOARDING (Login Modal)
  // =============================================
  (function initOnboarding() {
    const onboardRoot = document.getElementById("onboard-root");
    const existing = getStoredUserProfile();

    const updateProfileUI = (data) => {
      // Desktop name + mobile name
      document.querySelectorAll("#profile-name, #profile-name-mobile").forEach((el) => {
        if (el) el.textContent = data.name;
      });

      // All avatar images (desktop + mobile)
      document.querySelectorAll(".profile-avatar").forEach((img) => {
        img.src = data.avatar || DEFAULT_AVATAR;
        img.onerror = function () { this.src = DEFAULT_AVATAR; };
      });
    };

    if (existing) {
      updateProfileUI(existing);
      return;
    }

    onboardRoot.setAttribute("aria-hidden", "false");
    onboardRoot.innerHTML = `
      <div class="onboard-overlay" id="onboard-overlay">
        <div class="onboard-card">
          <h3>Welcome to Nayuta!</h3>
          <div class="onboard-row">
            <img id="preview-img" src="${DEFAULT_AVATAR}" />
            <div class="inputs">
              <input type="file" id="file-input" accept="image/*" style="margin-bottom:8px">
              <input type="text" id="name-input" class="onboard-input" placeholder="Your Name">
            </div>
          </div>
          <div class="onboard-actions">
            <button id="btn-skip" class="btn-secondary">Skip</button>
            <button id="btn-save" class="btn-primary">Login</button>
          </div>
        </div>
      </div>
    `;

    const preview = document.getElementById("preview-img");
    const fileIn  = document.getElementById("file-input");

    fileIn.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => (preview.src = ev.target.result);
        reader.readAsDataURL(file);
      }
    });

    const saveAndClose = (name, avatar) => {
      const data = { name: name || "User", avatar, level: "Level 1" };
      saveUserProfile(data);
      updateProfileUI(data);
      onboardRoot.innerHTML = "";
      onboardRoot.setAttribute("aria-hidden", "true");
    };

    document.getElementById("btn-save").addEventListener("click", () => {
      saveAndClose(document.getElementById("name-input").value, preview.src);
    });

    document.getElementById("btn-skip").addEventListener("click", () => {
      saveAndClose("Guest", DEFAULT_AVATAR);
    });
  })();

  // =============================================
  // 11. GENRE SELECT & INITIAL RENDER
  // =============================================
  populateGenreSelect();
  renderMainList();
  renderTopSection();
  genreSelect.addEventListener("change", renderMainList);

  // =============================================
  // 12. SIDEBAR PLAYLISTS
  // =============================================
  const playlistMenu = document.getElementById("playlist-menu");

  function renderSidebarPlaylists() {
    if (!playlistMenu) return;
    playlistMenu.innerHTML = "";

    const createLi = document.createElement("li");
    createLi.className = "playlist-create-item";
    createLi.innerHTML = `<i class='bx bx-plus'></i> <span>Create Playlist</span>`;
    createLi.style.cursor = "pointer";
    createLi.addEventListener("click", () => {
      const name = prompt("Enter playlist name:");
      if (name) {
        createNewPlaylist(name);
        renderSidebarPlaylists();
        // Dispatch event to update queue display
        document.dispatchEvent(new CustomEvent("playlistUpdated"));
      }
    });
    playlistMenu.appendChild(createLi);

    const playlists = getPlaylists();
    playlists.forEach((pl) => {
      const li = document.createElement("li");
      li.className = "playlist-item";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = pl.name;
      nameSpan.className = "playlist-name";
      nameSpan.addEventListener("click", () => {
        if (pl.songs.length > 0 && player) {
          const allSongs = DataService.getAll();
          const playlistSongs = pl.songs.map((id) => allSongs.find((s) => s.id === id)).filter(Boolean);
          player.loadList(playlistSongs);
          player.playIndex(0);
        } else {
          alert("This playlist is empty!");
        }
      });

      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.innerHTML = "<i class='bx bx-trash'></i>";
      delBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete playlist "${pl.name}"?`)) {
          deletePlaylist(pl.id);
          renderSidebarPlaylists();
          // Dispatch event to update queue display
          document.dispatchEvent(new CustomEvent("playlistUpdated"));
        }
      };

      li.appendChild(nameSpan);
      li.appendChild(delBtn);
      playlistMenu.appendChild(li);
    });
  }

  window.refreshSidebarPlaylists = renderSidebarPlaylists;
  renderSidebarPlaylists();

  // =============================================
  // 13. MOBILE SIDEBAR TOGGLE
  // =============================================
  const menuOpenBtn      = document.getElementById("menu-open");
  const sidebarToggleBtn = document.getElementById("sidebar-toggle");

  function toggleSidebar(e) {
    if (e) e.stopPropagation();
    container.classList.toggle("sidebar-active");
  }

  function closeSidebar() {
    container.classList.remove("sidebar-active");
  }

  if (menuOpenBtn)      menuOpenBtn.addEventListener("click", toggleSidebar);
  if (sidebarToggleBtn) sidebarToggleBtn.addEventListener("click", toggleSidebar);

  document.addEventListener("click", (e) => {
    const sidebar = document.querySelector(".sidebar");
    const isClickInsideSidebar = sidebar && sidebar.contains(e.target);
    const isClickOnMenuBtn = menuOpenBtn && menuOpenBtn.contains(e.target);
    if (container.classList.contains("sidebar-active") && !isClickInsideSidebar && !isClickOnMenuBtn) {
      closeSidebar();
    }
  });

  const allSidebarLinks = document.querySelectorAll(
    ".sidebar a, .sidebar .playlist-item, .mobile-profile-container button"
  );
  allSidebarLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 992 && !link.closest(".profile-actions")) {
        closeSidebar();
      }
    });
  });
});

// =============================================
// ADD TO PLAYLIST MODAL (global)
// =============================================
window.showAddToPlaylistModal = function (songId, songTitle) {
  // Dynamically import to avoid circular dep
  import("./localStorageService.js").then(({ getPlaylists, addSongToPlaylist }) => {
    const playlists = getPlaylists();
    if (playlists.length === 0) {
      alert("Please create a playlist in the sidebar first!");
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "onboard-overlay";

    let html = `
      <div class="onboard-card" style="width:300px">
        <h3>Add to Playlist</h3>
        <p style="margin-bottom:12px; color:var(--second-color); font-size:13px;">Song: <b style="color:var(--text-color)">${songTitle}</b></p>
        <div style="display:flex; flex-direction:column; gap:8px; margin:10px 0;">
    `;

    playlists.forEach((p) => {
      html += `<button class="btn-secondary playlist-select-btn" data-pid="${p.id}">${p.name}</button>`;
    });

    html += `</div><button id="close-plist-modal" style="width:100%; margin-top:10px" class="btn-primary">Cancel</button></div>`;
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    overlay.querySelectorAll(".playlist-select-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = btn.dataset.pid;
        const success = addSongToPlaylist(pid, songId);
        if (success) {
          alert("Added!");
          // Dispatch event to update queue display
          document.dispatchEvent(new CustomEvent("playlistUpdated"));
        } else {
          alert("Song already in this playlist.");
        }
        overlay.remove();
      });
    });

    document.getElementById("close-plist-modal").addEventListener("click", () => overlay.remove());
  });
};
