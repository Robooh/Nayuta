// DataService: mock de músicas
(function () {
  // Nota: artist pode ser extraído de arquivos cujo nome esteja no formato "Title - Artist.mp3".
  // Adicionamos o campo `genre` e atualizamos alguns nomes de cover para refletir novas imagens.
  // Atualizado a partir do conteúdo real em Src/Music e Src/Card-img
  // Artist é extraído do padrão "Title - Artist.mp3" quando aplicável.
  const musicData = [
    { id: 1, title: 'Tracen Ondo', artist: 'ナリタブライアン (CV. 衣川里佳)', audio: 'Src/Music/Tracen ondo  - ナリタブライアン (CV. 衣川里佳).mp3', cover: 'Src/Card-img/Tracen Ondo.jpg', genre: 'Rock', timesPlayed: 150 },
    { id: 2, title: '2005', artist: 'South Arcade', audio: 'Src/Music/2005 - South Arcade.mp3', cover: 'Src/Card-img/2005.jpg', genre: 'Rock', timesPlayed: 80 },
    { id: 3, title: 'Crushcrushcrush', artist: 'Paramore', audio: 'Src/Music/Crushcrushcrush - Paramore.mp3', cover: 'Src/Card-img/CrushCrush.jpg', genre: 'Rock', timesPlayed: 205 },
    { id: 4, title: 'Hai Yorokonde', artist: 'Kocchi no Kento', audio: 'Src/Music/Hai Yorokonde - Kocchi no Kento.mp3', cover: 'Src/Card-img/Hai Yorokonde.jpg', genre: 'Pop', timesPlayed: 70 },
    { id: 5, title: 'KAGUTSUCHI', artist: 'A.SAKA', audio: 'Src/Music/KAGUTSUCHI - A.SAKA.mp3', cover: 'Src/Card-img/A.saka.jpg', genre: 'Rock', timesPlayed: 60 },
    { id: 6, title: "Let's Play A Game!", artist: 'Vanguard S.S', audio: 'Src/Music/Let Play A Game - Vanguard S.S.mp3', cover: 'Src/Card-img/Let\'s Play.jpg', genre: 'Electronic', timesPlayed: 40 },
    { id: 7, title: 'Resolute Secation', artist: 'Vanguard S.S', audio: 'Src/Music/Resolute Secation - Vanguard S.S.mp3', cover: 'Src/Card-img/PoP - Resolute.jpg', genre: 'Rock', timesPlayed: 95 },
    { id: 8, title: 'Tetoris', artist: 'Teto', audio: 'Src/Music/Tetoris - Teto.mp3', cover: 'Src/Card-img/Tetoris.png', genre: 'Pop', timesPlayed: 30 },
    { id: 9, title: 'UNDEAD', artist: 'YOASOBI', audio: 'Src/Music/UNDEAD - YOASOBI.mp3', cover: 'Src/Card-img/Undead.jpg', genre: 'Pop', timesPlayed: 2984 },
    { id: 10, title: 'ラビットホール', artist: 'DECO*27', audio: 'Src/Music/RabitHole.mp3', cover: 'Src/Card-img/Rh.jpg', genre: 'Pop', timesPlayed: 3100 },
    { id: 11, title: 'Travelers', artist: 'Andrew Prahlow', audio: 'Src/Music/Travelers.mp3', cover: 'Src/Card-img/Ow.jpg', genre: 'Pop', timesPlayed: 5000},
    { id: 12, title: 'Assault TAXI ', artist: '∀Ｓ∀', audio: 'Src/Music/Taxi.mp3', cover: 'Src/Card-img/Taxi.jpg', genre: 'Eletronic', timesPlayed: 190 }
   
  ];

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  window.DataService = {
    getAll: function () { return clone(musicData); },
    getById: function (id) { const m = musicData.find(x => x.id === Number(id)); return m ? clone(m) : null; },
    search: function (query) {
      if (!query) return this.getAll();
      const q = String(query).toLowerCase();
      return clone(musicData.filter(m => m.title.toLowerCase().includes(q) || m.artist.toLowerCase().includes(q)));
    },
    getTop5: function () { return clone(musicData.slice().sort((a,b)=>b.timesPlayed-a.timesPlayed).slice(0,5)); },
    incrementPlayCount: function (id) { const m = musicData.find(x => x.id === Number(id)); if (m) m.timesPlayed = (m.timesPlayed || 0) + 1; }
  };
})();



// Overall Structure
// IIFE: (function () { ... })(); executes immediately, creating a private scope for musicData and helper functions.
// Global Exposure: window.DataService attaches the service object to the global window object, making it accessible as DataService in the browser.
// Data Model
// musicData: An array of objects representing music tracks. Each object has:
// id: Unique identifier (number).
// title: Song title (string).
// artist: Artist name (all set to 'Unknown' here).
// audio: Path to the audio file (e.g., 'Src/Music/After.mp3').
// cover: Path to the album cover image (e.g., 'Src/Card-img/After.jpg').
// timesPlayed: Play count (number, used for sorting).
// Helper Function
// clone(obj): A utility to deep-clone objects using JSON.parse(JSON.stringify(obj)). This ensures methods return copies of data, preventing external mutations of the original musicData array.
// DataService Methods
// The service provides CRUD-like operations for the mock data:

// getAll(): Returns a cloned copy of the entire musicData array.
// getById(id): Finds and returns a cloned copy of the track with the matching id (converted to number). Returns null if not found.
// search(query): Filters tracks where the title or artist (case-insensitive) contains the query string. If no query, returns all data. Results are cloned.
// getTop5(): Sorts the data by timesPlayed descending and returns the top 5 cloned tracks.
// incrementPlayCount(id): Increments the timesPlayed for the matching track (if found). No return value; modifies the original data in place.
// Key Notes
// Mock Nature: This is static data with no persistence (e.g., no database). Changes like play count increments are lost on page reload.
// Immutability: Cloning prevents direct manipulation of internal data, promoting safer usage.
// Usage: Likely used in a music player app (e.g., for displaying tracks, searching, or tracking plays). For example, DataService.getTop5() could populate a "most played" list.
// Potential Improvements: In a real app, this could be replaced with API calls. Error handling (e.g., invalid IDs) is minimal.
// If you need examples of how to use these methods or integration with other parts of your app, let me know.
