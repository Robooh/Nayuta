// Initialize the music player and load the default music list
document.addEventListener('DOMContentLoaded', function() {
  const playerContainer = document.querySelector('.player');
  if (playerContainer) {
    const player = Player.init(playerContainer);
    // Load the music list from DataService
    const musicList = DataService.getAll();
    player.loadList(musicList);
  }
});
