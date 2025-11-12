/**
 * Key definitions for Local Storage
 */
const STORAGE_KEYS = {
    USER_PROFILE: 'nayuta_user',
    PLAY_COUNTS: 'nayuta_play_counts',
    LAST_SECTION: 'nayuta_last_section',
    USER_PLAYLISTS: 'nayuta_playlists' 
};


export function getStoredUserProfile() {
    try {
        const existing = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        return existing ? JSON.parse(existing) : null;
    } catch (e) {
        console.error('Error reading user profile from local storage:', e);
        return null;
    }
}

export function saveUserProfile(data) {
    try {
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving user profile to local storage:', e);
    }
}

export function getLastSection() {
    return localStorage.getItem(STORAGE_KEYS.LAST_SECTION);
}

export function saveLastSection(key) {
    try {
        localStorage.setItem(STORAGE_KEYS.LAST_SECTION, key);
    } catch (e) {
        console.error('Error saving last section to local storage:', e);
    }
}


export function getUserPlayCounts() {
    try {
        const counts = localStorage.getItem(STORAGE_KEYS.PLAY_COUNTS);
        return counts ? JSON.parse(counts) : {};
    } catch (e) {
        console.error('Error reading play counts from local storage:', e);
        return {};
    }
}

export function incrementUserPlayCount(songId) {
    try {
        let userPlays = getUserPlayCounts();
        userPlays[songId] = Number(userPlays[songId] || 0) + 1;
        localStorage.setItem(STORAGE_KEYS.PLAY_COUNTS, JSON.stringify(userPlays));
        return userPlays; // Return updated counts
    } catch (e) {
        console.error('Error incrementing play count:', e);
        return getUserPlayCounts(); // Return unchanged counts
    }
}

export function getPlaylists() {
    try {
        const lists = localStorage.getItem(STORAGE_KEYS.USER_PLAYLISTS);
        return lists ? JSON.parse(lists) : [];
    } catch (e) {
        console.error('Error reading playlists from local storage:', e);
        return [];
    }
}

export function savePlaylists(playlists) {
    try {
        localStorage.setItem(STORAGE_KEYS.USER_PLAYLISTS, JSON.stringify(playlists));
    } catch (e) {
        console.error('Error saving playlists to local storage:', e);
    }
}

export function createNewPlaylist(name) {
    const playlists = getPlaylists();
    const newPlaylist = {
        id: generateUniqueId('P'),
        name: name,
        songs: []
    };
    playlists.push(newPlaylist);
    savePlaylists(playlists);
    return newPlaylist;
}


function generateUniqueId(prefix = 'P') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}



export function addSongToPlaylist(playlistId, songId) {
    const playlists = getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
        // Prevent duplicates
        if (!playlist.songs.includes(songId)) {
            playlist.songs.push(songId);
            savePlaylists(playlists);
            return true;
        }
    }
    return false;
}

export function deletePlaylist(playlistId) {
    try {
        const playlists = getPlaylists();
        const updatedPlaylists = playlists.filter(p => p.id !== playlistId);
        savePlaylists(updatedPlaylists);
        return true;
    } catch (e) {
        console.error('Error deleting playlist:', e);
        return false;
    }
}
