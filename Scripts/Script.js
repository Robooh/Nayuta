// Inicialização da aplicação: Player, MusicList e SlideShow
document.addEventListener('DOMContentLoaded', function () {
	const playerApi = Player.init('#player');
	const listContainerSelector = '.music-list .header';

	// Criar um container para a lista abaixo do header
	const header = document.querySelector(listContainerSelector);
	if (header) {
		const wrapper = document.createElement('div');
		wrapper.className = 'list-wrapper';
		wrapper.innerHTML = '<div class="search-controls"><input id="music-search" placeholder="Search songs..." /></div><div id="music-items" class="music-items"></div>';
		header.parentNode.appendChild(wrapper);

		const musicItemsSelector = '#music-items';
		const musicList = MusicList.init(musicItemsSelector, '#music-search', function (index) {
			// when user clicks on an item -> load list into player and play selected index
			const all = DataService.getAll();
			playerApi.loadList(all);
			playerApi.playIndex(index);
		});
	}

	// Inicializar slideshow
	SlideShow.init('.slideshow', 3500);
});

