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

 
  if (playerCover && !playerCover.getAttribute("src")) {
    playerCover.src = "Src/Card-img/Blank.jpg"; 
    if(playerTitle) playerTitle.textContent = "Select a Song";
    if(playerArtist) playerArtist.textContent = "Nayuta Player";
  }

  // Removed redundant mobileLogoutBtn logic check here (now handled in section 8)

  const container = document.querySelector(".container");
  if(container) container.classList.remove("sidebar-active");



/**
 * Carrega a playlist correta e inicia a reprodução de uma música.
 * @param {object} song - O objeto da música a ser tocada.
 * @param {string} listType - O tipo de lista ('main', 'personalized', 'search', etc.).
 */
function playSongFromCard(song, listType) {
    if (!player) {
      console.error("Player object is not initialized.");
      return;
    }

    let playlist = [];
    let songIndex = -1;
    if (listType === "personalized") {
        playlist = currentTopView === 'explore' ? getTop5List() : getRecentList();
    } else if (listType === "search") {
     
        playlist = [song]; 
    } else {
        // 'main' (Lista filtrada por gênero)
        playlist = getFilteredList(); 
    }
    
    // 2. Encontra o índice da música dentro da playlist montada
    if (playlist.length > 0) {
        songIndex = playlist.findIndex((s) => s.id === song.id);
    }

    // Se a música foi encontrada, carrega e toca
    if (songIndex !== -1) {
        player.loadList(playlist);
        player.playIndex(songIndex);
        
        // 3. Atualiza contadores e recentes
        incrementUserPlayCount(song.id);
        DataService.incrementPlayCount(song.id);
        addToRecents(song.id); 
        
        // FIX: Re-render personalized lists after play count/recent history update (The F5 fix)
        renderTopSection(); // <--- ADDED LINE
    } else {
        console.warn(`Song ID ${song.id} not found in the calculated playlist for type: ${listType}`);
    }
}

// --- 1. Card Creation ---
function createCard(item, index, listType = "main") {
  const card = document.createElement("div");
  card.className = "music-card";
  card.dataset.id = item.id;

  
  const playlistBtn = document.createElement("button");
  playlistBtn.className = "add-to-playlist-btn";
  playlistBtn.innerHTML = "<i class='bx bx-plus-medical'></i>";

  playlistBtn.addEventListener("click", (e) => {
      e.stopPropagation(); 
      if (typeof window.showAddToPlaylistModal === 'function') {
          window.showAddToPlaylistModal(item.id, item.title);
      } else {
           alert("A função de adicionar playlist não está disponível.");
      }
  });
  card.appendChild(playlistBtn);

  const img = document.createElement("img");
  img.className = "music-card-img";
  img.src = item.cover || "Src/Card-img/Undead.jpg";
  img.onerror = function() { this.src = "Src/Card-img/Undead.jpg"; }; 
  card.appendChild(img);


  const info = document.createElement("div");
  info.className = "music-card-info";
  const title = document.createElement("h4");
  title.textContent = item.title || "Unknown";
  const artist = document.createElement("p");
  artist.textContent = item.artist || "Unknown";
  
  const genre = document.createElement("small");
  if (listType === "personalized" && currentTopView === 'explore') {
     genre.textContent = `Plays: ${item._score || item.timesPlayed || 0}`;
  }
   else {
     genre.textContent = item.genre || "Music";
  }
  
  info.appendChild(title);
  info.appendChild(artist);
  info.appendChild(genre);
  card.appendChild(info);

  // NOTE: The separate .load-btn element is removed from the DOM creation here.
  // We rely solely on the card click for playback on all devices now.
  
  card.addEventListener("click", () => {
      // The card itself now handles the play action. 
      // This is the desired behavior for mobile, and it will work for desktop too.
      playSongFromCard(item, listType);
  });

  return card;
}

  // --- 2. Data Getters ---

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
    const all = (DataService.getAll() || []).map((x) => ({...x}));
    let userPlays = getUserPlayCounts();
    all.forEach((t) => {
      t._score = (t.timesPlayed || 0) + (userPlays[t.id] || 0);
    });
    return all.sort((a, b) => b._score - a._score).slice(0, 5); 
  }

  function getRecentList() {
      const historyIds = getRecents(); 
      if(historyIds.length === 0) return [];
      const all = DataService.getAll();
      const recentSongs = historyIds.map(id => all.find(s => s.id === id)).filter(Boolean);
      return recentSongs.slice(0, 5);
  }

  // --- 3. Rendering Logic ---

  function renderTopSection() {
    if (!topListContainer) return;
    
    topListContainer.innerHTML = "";
    topListContainer.className = "personalized-songs-grid"; 

    let data = [];
    if (currentTopView === 'explore') {
        if(topListTitle) topListTitle.textContent = "Most Played (Top 5)";
        data = getTop5List();
    } else {
        if(topListTitle) topListTitle.textContent = "Recently Played";
        data = getRecentList();
    }

    if (data.length === 0) {
        topListContainer.innerHTML = "<p style='color: #aaa; padding: 20px;'>No songs found.</p>";
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
    if(existingGrid) existingGrid.remove();

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
    
    genres.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        genreSelect.appendChild(opt);
    });
    genreSelect.value = current;
  }

  // --- 4. Search Functionality (FIXED) ---
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
            results.forEach(song => {
                const row = document.createElement("div");
                row.className = "search-row";
                row.innerHTML = `
                    <div style="display:flex; align-items:center;">
                        <img src="${song.cover}" class="search-thumb">
                        <div>
                            <div class="search-text" style="font-weight:bold">${song.title}</div>
                            <div class="search-text" style="font-size:12px; color:#aaa">${song.artist}</div>
                        </div>
                    </div>
                    <button class="search-play"><i class="bx bx-play"></i></button>
                `;
                
                // Play on click
                row.addEventListener("click", () => {
                    playSongFromCard(song, "search");
                    searchResults.style.display = "none";
                    searchInput.value = ""; // Clear input
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


  // --- 5. Sidebar Navigation Logic ---
  
  const sidebarLinks = document.querySelectorAll(".sidebar .menu ul li a");
  sidebarLinks.forEach(link => {
      link.addEventListener("click", function(e) {
          e.preventDefault();
          
          sidebarLinks.forEach(l => l.classList.remove("active"));
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

  

  // --- 6. Player Init ---
  if (playerContainer && typeof Player !== "undefined") {
    player = Player.init(playerContainer);
  }

  // --- 7. Slideshow Logic ---
  const slideImg = document.getElementById("slide-image");
  const trendingInfo = document.querySelector(".trending .left .info");
  let slideIndex = 0;
  let trendingSongs = []; 
  function slideshowTick() {
      if (slideIndex === 0 || trendingSongs.length === 0) {
          trendingSongs = getRandom5List();
      }

      if (!trendingSongs.length || !slideImg || !trendingInfo) return;

      slideIndex = (slideIndex + 1) % trendingSongs.length;

      const song = trendingSongs[slideIndex];

      slideImg.src = song.cover || "Src/Card-img/Undead.jpg";
      slideImg.onerror = function() { this.src = "Src/Card-img/Undead.jpg"; };
      trendingInfo.querySelector("h2").textContent = song.title;
      trendingInfo.querySelector("h3").textContent = song.artist;
      trendingInfo.querySelector("h4").textContent = song.genre;
      trendingInfo.querySelector("h6").textContent = "Now Trending";

      const btn = trendingInfo.querySelector("button");
      btn.onclick = () => {
          if(player) {
              player.loadList(trendingSongs);
              player.playIndex(slideIndex);

              incrementUserPlayCount(song.id);
              addToRecents(song.id);

              // FIX: Re-render personalized lists after play count/recent history update (The F5 fix)
              renderTopSection(); // <--- ADDED LINE
          }
      };

      // Add event listener for the add-to-playlist button in trending
      const addToPlaylistBtn = trendingInfo.querySelector(".add-to-playlist-btn");
      if (addToPlaylistBtn) {
          addToPlaylistBtn.onclick = (e) => {
              e.stopPropagation();
              if (typeof window.showAddToPlaylistModal === 'function') {
                  window.showAddToPlaylistModal(song.id, song.title);
              } else {
                  alert("A função de adicionar playlist não está disponível.");
              }
          };
      }
  }
  
  slideshowTick(); 
  setInterval(slideshowTick, 5000);

  // --- 8. Profile & Logout Logic (Consolidated for Mobile/Desktop) ---
  const settingsBtn = document.getElementById("settings-btn");
  const settingsDrop = document.getElementById("settings-dropdown");
  const logoutBtn = document.getElementById("logout-btn");

  // New Mobile Profile Elements (requires Main.html changes below)
  const mobileSettingsBtn = document.getElementById("settings-btn-mobile");
  const mobileSettingsDrop = document.getElementById("settings-dropdown-mobile");
  const mobileLogoutBtn = document.getElementById("logout-btn-mobile");

  // Function to handle logout and clear local storage comprehensively
  function handleLogout(e) {
      e.preventDefault();
      if(confirm("Log out? Your play history and local profile will be cleared.")) {
          // Clear all relevant localStorage keys
          localStorage.removeItem("nayuta_user");
          localStorage.removeItem("nayuta_play_counts");
          localStorage.removeItem("nayuta_recent_history");
          window.location.reload(); 
      }
  }

  // Desktop Profile Toggle Logic
  if (settingsBtn && settingsDrop) {
      settingsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          // Close mobile dropdown if open
          if(mobileSettingsDrop) mobileSettingsDrop.classList.remove("open");
          settingsDrop.classList.toggle("open");
      });
  }

  // Mobile Profile Toggle Logic
  if (mobileSettingsBtn && mobileSettingsDrop) {
      mobileSettingsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          // Close desktop dropdown if open
          if(settingsDrop) settingsDrop.classList.remove("open");
          mobileSettingsDrop.classList.toggle("open");
      });
  }

  // Attach Logout Handler to both desktop and mobile buttons
  if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout);
  }
  if (mobileLogoutBtn) {
      mobileLogoutBtn.addEventListener("click", handleLogout);
  }


  // Close Dropdowns on outside click (Updated to close both)
  document.addEventListener("click", () => {
      if(settingsDrop) settingsDrop.classList.remove("open");
      if(mobileSettingsDrop) mobileSettingsDrop.classList.remove("open");
  });


  // --- 9. Onboarding (Login) Logic ---
(function initOnboarding() {
  const onboardRoot = document.getElementById("onboard-root");
  const existing = getStoredUserProfile();
  
  const updateProfileUI = (data) => {
      // 1. Update Profile Name (Targets elements with the IDs on desktop and mobile)
      document.querySelectorAll("#profile-name").forEach(el => {
          if(el) el.textContent = data.name;
      });

      // 2. Update Profile Level (Targets elements with the IDs on desktop and mobile)
      document.querySelectorAll("#profile-level").forEach(el => {
          if(el) el.textContent = data.level || "Level 1";
      });

      // 3. Update Profile Avatar (Targets elements with the CLASS on desktop and mobile)
      document.querySelectorAll(".profile-avatar").forEach(img => {
          img.src = data.avatar || DEFAULT_AVATAR;
          img.onerror = function() { this.src = DEFAULT_AVATAR; }; 
      });
  }; // End of updateProfileUI

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
    const fileIn = document.getElementById("file-input");
    
    fileIn.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = (ev) => preview.src = ev.target.result;
            reader.readAsDataURL(file);
        }
    });

    const saveAndClose = (name, avatar) => {
        const data = { name: name || "User", avatar: avatar, level: "Level 1" }; // Ensuring level is set
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

  populateGenreSelect();
  renderMainList();
  renderTopSection();
  
  genreSelect.addEventListener("change", renderMainList);

  // --- 10. Playlist Sidebar Logic ---
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
        if(pl.songs.length > 0 && player) {
           const allSongs = DataService.getAll();
           const playlistSongs = pl.songs.map(id => allSongs.find(s => s.id === id)).filter(Boolean);
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
          if(confirm(`Delete playlist "${pl.name}"?`)) {
              deletePlaylist(pl.id);
              renderSidebarPlaylists();
          }
      };

      li.appendChild(nameSpan);
      li.appendChild(delBtn);
      playlistMenu.appendChild(li);
    });
  }
  
 
  window.refreshSidebarPlaylists = renderSidebarPlaylists;
  renderSidebarPlaylists();
});



window.showAddToPlaylistModal = function(songId, songTitle) {
    const playlists = getPlaylists();
    if(playlists.length === 0) {
        alert("Please create a playlist in the sidebar first!");
        return;
    }
    
    const overlay = document.createElement("div");
    overlay.className = "onboard-overlay"; 
    
    let html = `
        <div class="onboard-card" style="width:300px">
            <h3>Add to Playlist</h3>
            <p>Song: <b>${songTitle}</b></p>
            <div style="display:flex; flex-direction:column; gap:8px; margin: 10px 0;">
    `;
    
    playlists.forEach(p => {
        html += `<button class="btn-secondary playlist-select-btn" data-pid="${p.id}">${p.name}</button>`;
    });
    
    html += `</div><button id="close-plist-modal" style="width:100%; margin-top:10px" class="btn-primary">Cancel</button></div>`;
    
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    
    overlay.querySelectorAll(".playlist-select-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const pid = btn.dataset.pid;
            const success = addSongToPlaylist(pid, songId);
            alert(success ? "Added!" : "Song already in this playlist.");
            overlay.remove();
        });
    });
    
    document.getElementById("close-plist-modal").addEventListener("click", () => overlay.remove());
};


// Mobile Menu Toggle:
const menuOpenBtn = document.getElementById("menu-open"); 
  const sidebarToggleBtn = document.getElementById("sidebar-toggle"); 
  const container = document.querySelector(".container");

  function toggleSidebar(e) {
      if(e) e.stopPropagation();
      container.classList.toggle("sidebar-active");
  }

  function closeSidebar() {
      container.classList.remove("sidebar-active");
  }

  if(menuOpenBtn) menuOpenBtn.addEventListener("click", toggleSidebar);
  if(sidebarToggleBtn) sidebarToggleBtn.addEventListener("click", toggleSidebar);

  document.addEventListener("click", (e) => {
      const sidebar = document.querySelector(".sidebar");
      const isClickInsideSidebar = sidebar.contains(e.target);
      const isClickOnMenuBtn = menuOpenBtn && menuOpenBtn.contains(e.target);
      
      if (container.classList.contains("sidebar-active") && !isClickInsideSidebar && !isClickOnMenuBtn) {
          closeSidebar();
      }
  });

  const allSidebarLinks = document.querySelectorAll(".sidebar a, .sidebar .playlist-item, .mobile-profile-container button");
  allSidebarLinks.forEach(link => {
      link.addEventListener("click", () => {
          // Check if the click is on an interactive profile element, if so, don't close the sidebar immediately (to allow the dropdown to open)
          if (window.innerWidth <= 992 && !link.closest(".profile-actions")) {
              closeSidebar();
          }
      });
  });