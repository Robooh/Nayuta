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
  function renderTopSongs() {
    const container = document.getElementById('music-items');
    if (!container) return;
    container.innerHTML = '';
    const top = DataService.getTop5() || [];
    top.forEach((t, idx) => {
      const item = document.createElement('div');
      item.className = 'top-item';
      // include rank, title, artist, genre and plays
      item.innerHTML = `<div class="top-item-left"><img src="${t.cover || 'Src/Card-img/Undead.jpg'}" alt="${t.title}"/></div>
        <div class="top-item-right">
          <div class="top-item-meta"><span class="rank">#${idx+1}</span><span class="genre">${t.genre || ''}</span></div>
          <h5 class="top-title">${t.title}</h5>
          <p class="top-artist">${t.artist}</p>
          <small class="plays">Plays: ${t.timesPlayed || 0}</small>
        </div>`;
      item.addEventListener('click', function () {
        // load the top list into player and play the clicked index
        if (!player) return;
        const topList = DataService.getTop5();
        player.loadList(topList);
        player.playIndex(idx);
      });
      container.appendChild(item);
    });
  }

  // initial top songs render
  renderTopSongs();
  // refresh top songs periodically in case counts change
  setInterval(renderTopSongs, 5000);

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
});
