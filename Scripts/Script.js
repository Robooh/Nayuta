// Initialize the music player and load the default music list
document.addEventListener('DOMContentLoaded', function() {
  const playerContainer = document.querySelector('.player');
  const mainListEl = document.querySelector('.main-list');
  const genreSelect = document.getElementById('genre-select');
  let player = null;
  let currentDataHash = '';

  function createCard(item, index) {
    const card = document.createElement('div');
    card.className = 'music-card';
  card.dataset.id = item.id;

    const img = document.createElement('img');
    img.className = 'music-card-img';
    img.src = item.cover || 'Src/Card-img/Undead.jpg';
    img.alt = item.title || '';
    card.appendChild(img);

    const info = document.createElement('div');
    info.className = 'music-card-info';
    const title = document.createElement('h4'); title.textContent = item.title || '-';
    const artist = document.createElement('p'); artist.textContent = item.artist || '-';
    const genre = document.createElement('small'); genre.textContent = item.genre || '';
    info.appendChild(title); info.appendChild(artist); info.appendChild(genre);
    card.appendChild(info);

    // hidden button that will load the song into player
    const btn = document.createElement('button');
    btn.className = 'load-btn';
    btn.style.display = 'none';
    btn.textContent = 'Load';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!player) return;
      console.log('[card] load-btn clicked, index=', index, 'player=', !!player);
      player.playIndex(index);
    });
    card.appendChild(btn);
    
  // (star removed)

    // clicking the card will reveal the hidden button and load the song
    card.addEventListener('click', function () {
      if (!player) return;
  console.log('[card] clicked index=', index);
      // reveal button briefly for accessibility (optional)
      btn.style.display = 'inline-block';
      setTimeout(() => { btn.style.display = 'none'; }, 2000);
      player.playIndex(index);
    });

    return card;
  }

  function getFilteredList() {
    const all = DataService.getAll() || [];
    const sel = genreSelect ? String(genreSelect.value||'').trim().toLowerCase() : '';
    return all.filter(item => {
      const g = String(item.genre||'').toLowerCase();
      if (sel && sel !== '' && g !== sel) return false;
      return true;
    });
  }

  function populateGenreSelect() {
    if (!genreSelect) return;
    const all = DataService.getAll() || [];
    const genres = Array.from(new Set(all.map(x => (x.genre||'').trim()).filter(Boolean)));
    // preserve selection
    const prev = genreSelect.value;
    genreSelect.innerHTML = '';
    const optAll = document.createElement('option'); optAll.value = ''; optAll.textContent = 'All genres'; genreSelect.appendChild(optAll);
    genres.forEach(g => {
      const o = document.createElement('option'); o.value = g; o.textContent = g; genreSelect.appendChild(o);
    });
      // restore previous selection if still available
      if (prev) {
        const match = Array.from(genreSelect.options).some(o => o.value === prev);
        if (match) genreSelect.value = prev;
        else genreSelect.value = '';
      }
  }

  function renderMainList() {
    if (!mainListEl) return;
    const list = getFilteredList();
    // simple hash to detect changes (based on length + last timesPlayed)
    const hash = list.length + '|' + list.map(x => x.id + ':' + (x.timesPlayed||0)).join(',');
    if (hash === currentDataHash) return; // no change
    currentDataHash = hash;

    // clear
    // keep the header (first child) intact
    const header = mainListEl.querySelector('.main-list-header');
    mainListEl.innerHTML = '';
    if (header) mainListEl.appendChild(header);

    // create a container grid
    const grid = document.createElement('div');
    grid.className = 'main-list-grid';

    list.forEach((item, i) => {
      const card = createCard(item, i);
      grid.appendChild(card);
    });

    mainListEl.appendChild(grid);

    // if player exists, reload its list with the filtered list
    if (player) player.loadList(list);
  }

  // playing mark logic removed

  if (playerContainer) {
    player = Player.init(playerContainer);
    const musicList = DataService.getAll();
    player.loadList(musicList);
    // register player event listeners after player is initialized
    // player event handlers for UI highlighting were removed
  }

  // Top Songs: populate #music-items with top 5 tracks
  // Suggested list based on DataService timesPlayed + per-user localStorage play counts
  function renderSuggested() {
    const container = document.getElementById('music-items');
    if (!container) return;
    container.innerHTML = '';
    // base data
    const all = (DataService.getAll() || []).map(x => Object.assign({}, x));
    // merge in per-user play counts
    let userPlays = {};
    try { userPlays = JSON.parse(localStorage.getItem('nayuta_play_counts') || '{}'); } catch (e) { userPlays = {}; }
    all.forEach(t => {
      const extra = Number(userPlays[t.id] || 0);
      t._score = (Number(t.timesPlayed || 0) + extra);
    });
    const suggested = all.slice().sort((a,b)=>b._score - a._score).slice(0,5);
    suggested.forEach((t, idx) => {
      const item = document.createElement('div');
      item.className = 'top-item';
      item.innerHTML = `<div class="top-item-left"><img src="${t.cover || 'Src/Card-img/Undead.jpg'}" alt="${t.title}"/></div>
        <div class="top-item-right">
          <div class="top-item-meta"><span class="rank">#${idx+1}</span><span class="genre">${t.genre || ''}</span></div>
          <h5 class="top-title">${t.title}</h5>
          <p class="top-artist">${t.artist}</p>
          <small class="plays">Plays: ${t._score || 0}</small>
        </div>`;
      item.addEventListener('click', function () {
        if (!player) return;
        // load full ordered suggested list into player and play selected index
        player.loadList(suggested);
        player.playIndex(idx);
        // increment per-user play count
        try {
          userPlays[t.id] = Number(userPlays[t.id] || 0) + 1;
          localStorage.setItem('nayuta_play_counts', JSON.stringify(userPlays));
        } catch (e) {}
      });
      container.appendChild(item);
    });
  }

  // initial top songs render
  renderSuggested();
  // refresh suggested list periodically in case counts change
  setInterval(renderSuggested, 5000);

  // Slideshow for trending: cycle through top 5 covers and update left info
  (function initSlideshow() {
    const slideImg = document.getElementById('slide-image');
    const infoBox = document.querySelector('.trending .left .info');
    const listenBtn = document.querySelector('.trending .left .info .btn button');
    if (!slideImg || !infoBox) return;
    let slides = DataService.getTop5() || [];
    let idx = 0;
    let currentShown = 0;

    function show(i) {
      if (!slides || slides.length === 0) return;
      const t = slides[i % slides.length];
      currentShown = i % slides.length;
      slideImg.src = t.cover || '';
      const hs = infoBox.querySelector('h2'); if (hs) hs.textContent = t.title || '';
      const h3 = infoBox.querySelector('h3'); if (h3) h3.textContent = t.artist || '';
      const h4 = infoBox.querySelector('h4'); if (h4) h4.textContent = t.album || '';
      const h6 = infoBox.querySelector('h6'); if (h6) h6.textContent = 'Number of Plays: ' + (t.timesPlayed||0);
    }

    if (listenBtn) {
      listenBtn.addEventListener('click', function () {
        if (!player) return;
        const top = DataService.getTop5() || [];
        player.loadList(top);
        const playIndex = (typeof currentShown === 'number' ? currentShown : 0) % (top.length || 1);
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

  // Mobile layout adjustments: move player out for mobile
  (function initMobileLayout() {
    const breakpoint = 992;
    const playerEl = document.querySelector('.container .right-section .player');
    let playerOriginalParent = playerEl ? playerEl.parentNode : null;

    function applyLayout() {
      const isMobile = window.innerWidth <= breakpoint;

      // player: move out of right-section into body for mobile so fixed positioning works
      if (playerEl) {
        if (isMobile) {
          if (playerEl.parentNode !== document.body) {
            // remember original parent if not set
            if (!playerOriginalParent) playerOriginalParent = playerEl.parentNode;
            document.body.appendChild(playerEl);
            playerEl.classList.add('mobile-moved');
          }
        } else {
          if (playerOriginalParent && playerEl.parentNode !== playerOriginalParent) {
            playerOriginalParent.appendChild(playerEl);
            playerEl.classList.remove('mobile-moved');
            playerOriginalParent = null;
          }
        }
      }
    }

    // run on load and resize
    applyLayout();
    window.addEventListener('resize', function () { applyLayout(); });
    window.addEventListener('orientationchange', function () { setTimeout(applyLayout, 60); });
  })();

  // Sidebar interaction: map sections, use hash-based routing, persist selection, and render readable banner
  (function initSidebarInteractions() {
    const sidebarLinks = Array.from(document.querySelectorAll('.container .sidebar .menu ul li a[data-section]'));
    const storageKey = 'nayuta_last_section';
    const mainEl = document.querySelector('main');

    const sectionTitles = {
      'explore': 'Explore',
      'albums': 'Albums',
      'artists': 'Artists',
      'recent': 'Recent',
      'library-albums': 'Albums (Library)',
      'favorites': 'Favorites',
      'create-playlist': 'Create Playlist'
    };

    function renderBanner(key) {
      let title = sectionTitles[key] || key || '';
      let banner = document.getElementById('section-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'section-banner';
        banner.style.padding = '10px 16px';
        banner.style.background = 'linear-gradient(90deg, rgba(255,255,255,0.02), transparent)';
        banner.style.borderRadius = '8px';
        banner.style.marginBottom = '12px';
        const containerMain = mainEl.querySelector('.trending') || mainEl;
        if (containerMain) containerMain.parentNode.insertBefore(banner, containerMain);
      }
      banner.textContent = title ? title : '';
    }

    function applySection(key, updateHash = true) {
      if (!key) return;
      sidebarLinks.forEach(a => a.classList.toggle('active', a.getAttribute('data-section') === key));
      try { localStorage.setItem(storageKey, key); } catch (e) {}
      renderBanner(key);
      if (updateHash) {
        const target = '#' + key;
        if (location.hash !== target) location.hash = key;
      }
    }

    // wire click handlers: set hash (routing will handle applying)
    sidebarLinks.forEach(a => {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        const k = a.getAttribute('data-section');
        applySection(k, true);
      });
    });

    // respond to hash changes (back/forward and direct links)
    window.addEventListener('hashchange', function () {
      const key = window.location.hash.replace(/^#/, '');
      if (key) applySection(key, false);
    });

    // initialize: prefer hash, then last saved, then first link
    const initial = (window.location.hash && window.location.hash.replace(/^#/, '')) || localStorage.getItem(storageKey) || (sidebarLinks[0] && sidebarLinks[0].getAttribute('data-section'));
    if (initial) applySection(initial, false);
  })();

  // Mobile menu open/close handlers
  (function initMobileMenu() {
    const menuOpen = document.getElementById('menu-open');
    const menuClose = document.getElementById('menu-close');
    const cont = document.querySelector('.container');
    if (!cont) return;
    function open() { cont.classList.add('sidebar-open'); }
    function close() { cont.classList.remove('sidebar-open'); }
    if (menuOpen) menuOpen.addEventListener('click', function (e) { e.stopPropagation(); open(); });
    if (menuClose) menuClose.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    // also close on outside click for mobile
    document.addEventListener('click', function (e) { if (!cont.querySelector('.sidebar').contains(e.target)) close(); });
  })();

  // Onboarding modal: prompt for username and avatar on first visit
  (function initOnboarding() {
    const storageKey = 'nayuta_user';
    const existing = localStorage.getItem(storageKey);
    const onboardRoot = document.getElementById('onboard-root');
    const profileNameEl = document.getElementById('profile-name');
    const profileAvatarEls = document.querySelectorAll('.profile-avatar, .profile .user .left img');
    const playingTopImg = document.querySelector('.container .sidebar .playing .top img');

    function populateProfile(data) {
      if (!data) return;
      if (profileNameEl && data.name) profileNameEl.textContent = data.name;
      if (data.avatar) {
        profileAvatarEls.forEach(img => { img.src = data.avatar; });
        if (playingTopImg) playingTopImg.src = data.avatar;
      }
    }

    if (existing) {
      try { const d = JSON.parse(existing); populateProfile(d); } catch (e) {}
      return; // already set
    }

    // build modal
    if (!onboardRoot) return;
    onboardRoot.innerHTML = `
      <div class="onboard-overlay" id="onboard-overlay">
        <div class="onboard-card" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
          <h3 id="onboard-title">Bem-vindo ao Nayuta</h3>
          <div class="onboard-row">
            <img id="onboard-preview" src="Src/Logo/Arisu 2.0.png" alt="avatar preview">
            <div class="inputs">
              <input id="onboard-name" class="onboard-input" placeholder="Qual nome você quer usar?" />
              <input id="onboard-file" type="file" accept="image/*" class="onboard-input" />
            </div>
          </div>
          <div class="onboard-actions">
            <button id="onboard-skip" class="btn-secondary">Pular</button>
            <button id="onboard-save" class="btn-primary">Salvar</button>
          </div>
        </div>
      </div>
    `;

    onboardRoot.setAttribute('aria-hidden', 'false');

    const overlay = document.getElementById('onboard-overlay');
    const preview = document.getElementById('onboard-preview');
    const inputName = document.getElementById('onboard-name');
    const inputFile = document.getElementById('onboard-file');
    const btnSave = document.getElementById('onboard-save');
    const btnSkip = document.getElementById('onboard-skip');

    let avatarData = preview.src;

    inputFile.addEventListener('change', function (e) {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = function (ev) { avatarData = ev.target.result; preview.src = avatarData; };
      reader.readAsDataURL(f);
    });

    function closeOnboard() {
      if (onboardRoot) { onboardRoot.innerHTML = ''; onboardRoot.setAttribute('aria-hidden', 'true'); }
    }

    btnSave.addEventListener('click', function () {
      const name = (inputName.value || '').trim() || 'User';
      const data = { name: name, avatar: avatarData };
      try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch (e) {}
      populateProfile(data);
      closeOnboard();
    });

    btnSkip.addEventListener('click', function () {
      // set a placeholder to avoid showing again
      const data = { name: 'User', avatar: preview.src };
      try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch (e) {}
      populateProfile(data);
      closeOnboard();
    });

    // close on Esc or click outside
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeOnboard(); } });
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) closeOnboard(); });

  })();

  // initial render
  populateGenreSelect();
  renderMainList();
  // playing state logic removed

  // Search autocomplete dropdown
  (function initSearch() {
    const input = document.getElementById('search-input');
    const resultsEl = document.getElementById('search-results');
    let timer = null;
    if (!input || !resultsEl) return;

    function clearResults() { resultsEl.innerHTML = ''; resultsEl.style.display = 'none'; }

    function renderResults(list) {
      resultsEl.innerHTML = '';
      if (!list || list.length === 0) { clearResults(); return; }
      list.forEach(item => {
        const row = document.createElement('div');
          row.className = 'search-row';
          const thumb = document.createElement('img'); thumb.className = 'search-thumb'; thumb.src = item.cover || 'Src/Card-img/Undead.jpg';
          const text = document.createElement('div'); text.className = 'search-text'; text.textContent = item.title + ' — ' + item.artist;
          const play = document.createElement('button'); play.className = 'search-play'; play.textContent = 'Play';
        play.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!player) return;
          // load the full list and play the specific song by id
          const all = DataService.getAll();
          player.loadList(all);
          const idx = all.findIndex(x => x.id === item.id);
          if (idx >= 0) player.playIndex(idx);
          clearResults();
          input.value = '';
        });
  row.appendChild(thumb); row.appendChild(text); row.appendChild(play);
        resultsEl.appendChild(row);
      });
      resultsEl.style.display = 'block';
    }

    function doSearch(q) {
      const res = DataService.search(q || '');
      // show best matches first (title matched)
      renderResults(res.slice(0, 8));
    }

    input.addEventListener('input', function (e) {
      const q = String(input.value || '').trim();
      if (timer) clearTimeout(timer);
      if (!q) { clearResults(); return; }
      timer = setTimeout(() => doSearch(q), 250);
    });

    // hide on outside click
    document.addEventListener('click', function (e) { if (!resultsEl.contains(e.target) && e.target !== input) clearResults(); });
  })();

  // wire filter events
  if (genreSelect) genreSelect.addEventListener('change', function () { renderMainList(); });

  // poll for data changes every 2s (since DataService is in-memory mock)
  setInterval(function () { populateGenreSelect(); renderMainList(); }, 2000);
  
  // Profile actions: settings dropdown and notifications placeholder
  (function initProfileActions() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsDropdown = document.getElementById('settings-dropdown');
    const notifyBtn = document.getElementById('notify-btn');
    if (settingsBtn && settingsDropdown) {
      const menuItems = Array.from(settingsDropdown.querySelectorAll('a[tabindex="-1"]'));

      function closeMenu() {
        settingsDropdown.classList.remove('open');
        settingsDropdown.setAttribute('aria-hidden', 'true');
        settingsBtn.setAttribute('aria-expanded', 'false');
      }
      function openMenu() {
        settingsDropdown.classList.add('open');
        settingsDropdown.setAttribute('aria-hidden', 'false');
        settingsBtn.setAttribute('aria-expanded', 'true');
      }

      settingsBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (settingsDropdown.classList.contains('open')) closeMenu();
        else openMenu();
      });

      // keyboard support for the button
      settingsBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (settingsDropdown.classList.contains('open')) closeMenu(); else openMenu();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          openMenu();
          // focus first item
          if (menuItems.length > 0) menuItems[0].focus();
        }
      });

      // close on outside click
      document.addEventListener('click', function (ev) {
        if (!settingsDropdown.contains(ev.target) && ev.target !== settingsBtn) {
          closeMenu();
        }
      });

      // handle keyboard navigation inside menu
      settingsDropdown.addEventListener('keydown', function (e) {
        const idx = menuItems.indexOf(document.activeElement);
        if (e.key === 'Escape') { closeMenu(); settingsBtn.focus(); }
        else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = (idx + 1) % menuItems.length; menuItems[next].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = (idx - 1 + menuItems.length) % menuItems.length; menuItems[prev].focus();
        }
      });
    }
    if (notifyBtn) {
      notifyBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        // placeholder for notifications; could open a panel
        notifyBtn.classList.add('active');
        setTimeout(() => notifyBtn.classList.remove('active'), 600);
      });
    }
  })();
});

document.getElementById('current-year').textContent = new Date().getFullYear();

