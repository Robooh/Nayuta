# TODO: Implement Search Autocomplete Functionality

## Overview
Implement autocomplete search in Script.js for the #search-input. On typing, show a dropdown list of closest matching songs (by title/artist) in #search-results. Clicking a result plays the song using the player.

## Steps to Complete
- [ ] Read current Script.js to locate the initSearch() placeholder.
- [ ] Implement initSearch() function:
  - Add event listener to #search-input for 'input' event.
  - On input: get query, call DataService.search(query), populate #search-results with results.
  - Each result: <div> with title and artist, click handler to play song (find index in full list, load and play).
  - Hide results on blur or empty query.
- [ ] Check Css/Style.css for .search-results styling; add if missing (position absolute, etc.).
- [ ] Test: Type in search, see dropdown, click to play song.
- [ ] Update this TODO.md as steps are completed.
