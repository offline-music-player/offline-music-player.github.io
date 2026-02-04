// Music player variables
let playlist = [];
let currentSongIndex = -1;
let isPlaying = false;
let isDark = true;
let isRepeating = false;
let isShuffling = false;
let playHistory = [];

// ============================================
// WARNING BAR & POPUP CONFIGURATION
// ============================================
// Change these to control visibility across ALL pages:
// bar: 'active' (shows) or 'inactive' (hides)
// popup: 'active' (shows) or 'inactive' (hides)
const WARNING_CONFIG = {
    bar: 'inactive',
    popup: 'inactive'
};
// ============================================
// TEMPLATE FOR NEW HTML FILES
// ============================================
// Copy and paste this into the <body> of any NEW HTML files you create:
/*
    <!-- Warning Bar (Top of Site) -->
    <div class="warning-bar" style="display: none;">
        <div class="warning-bar-content">
            ⚠️ Some features are currently disabled or experiencing issues
        </div>
    </div>

    <!-- Warning Popup Modal -->
    <div class="warning-popup" style="display: none;">
        <div class="warning-popup-content">
            <div class="warning-popup-header">
                <h2>⚠️ Feature Status</h2>
                <button class="warning-popup-close" onclick="closeWarningPopup()">×</button>
            </div>
            <div class="warning-popup-body">
                <p><strong>Currently Experiencing Issues:</strong></p>
                <ul>
                    <li>Spotify integration - Authentication in progress</li>
                    <li>Feature streaming - Under development</li>
                </ul>
                <p style="margin-top: 15px; font-size: 0.9rem; color: var(--text-secondary);">
                    The core music player functionality (uploading and playing local files) is working normally.
                </p>
            </div>
            <div class="warning-popup-footer">
                <button class="warning-popup-btn" onclick="closeWarningPopup()">Got it</button>
            </div>
        </div>
    </div>

Then add at the end of your HTML file (before </body>):
    <script src="script.js"></script>

That's it! The WARNING_CONFIG will automatically control it!
*/
// Streaming Support Configuration
const STREAMING_CONFIG = {
    spotify: {
        enabled: true,
        clientId: '', // Get from Spotify Developer Dashboard
        clientSecret: '', // Get from Spotify Developer Dashboard
        redirectUri: 'http://localhost:3000/callback' // Set in Spotify app settings
    }
};

// DOM elements
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const repeatBtn = document.getElementById('repeatBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const songTitle = document.getElementById('songTitle');
const songInfo = document.getElementById('songInfo');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTime = document.getElementById('currentTime');
const totalTime = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');
const playlistContainer = document.getElementById('playlistContainer');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

// Initialize (only if audio player exists on this page)
if (audioPlayer) {
    audioPlayer.volume = 0.5;

    // Event Listeners
    audioPlayer.addEventListener('loadedmetadata', updateSongInfo);
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', handleSongEnd);
    audioPlayer.addEventListener('play', updateTabTitle);
    audioPlayer.addEventListener('pause', updateTabTitle);

    volumeSlider.addEventListener('input', (e) => {
        audioPlayer.volume = e.target.value / 100;
    });

    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        addFilesToPlaylist(files);
    });
}

// Dropdown Menu Functions
function toggleDropdown() {
    const dropdown = document.getElementById('menuDropdown');
    dropdown.classList.toggle('active');
}

// Close dropdown when clicking outside
window.addEventListener('click', (e) => {
    const dropdown = document.getElementById('menuDropdown');
    if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// Music player functions
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFilesToPlaylist(files);
}

function addFilesToPlaylist(files) {
    const audioFiles = files.filter(file => 
        file.type.startsWith('audio/') || 
        file.name.match(/\.(mp3|wav|ogg|m4a)$/i)
    );

    audioFiles.forEach(file => {
        const url = URL.createObjectURL(file);
        const song = {
            name: file.name.replace(/\.(mp3|wav|ogg|m4a)$/i, ''),
            url: url,
            file: file,
            duration: '0:00'
        };

        playlist.push(song);
        
        // Get duration
        const tempAudio = new Audio(url);
        tempAudio.addEventListener('loadedmetadata', () => {
            song.duration = formatTime(tempAudio.duration);
            renderPlaylist();
        });
    });

    renderPlaylist();
    
    if (currentSongIndex === -1 && playlist.length > 0) {
        loadSong(0);
    }
}

function renderPlaylist() {
    if (playlist.length === 0) {
        playlistContainer.innerHTML = '<div class="empty-playlist">Your playlist is empty. Add some music to get started!</div>';
        return;
    }

    const playlistHTML = playlist.map((song, index) => `
        <div class="playlist-item ${index === currentSongIndex ? 'active' : ''}" onclick="loadSong(${index})">
            <div class="song-number">${index + 1}</div>
            <div class="song-details">
                <div class="song-name">${song.name}</div>
                <div class="song-duration">${song.duration}</div>
            </div>
            <button class="remove-btn" onclick="removeSong(event, ${index})">×</button>
        </div>
    `).join('');

    playlistContainer.innerHTML = playlistHTML;
}

function loadSong(index) {
    if (index < 0 || index >= playlist.length) return;
    
    currentSongIndex = index;
    const song = playlist[index];
    
    audioPlayer.src = song.url;
    songTitle.textContent = song.name;
    updateSongInfo();
    updateTabTitle();
    
    renderPlaylist();
    
    if (isPlaying) {
        audioPlayer.play();
    }
}

function updateTabTitle() {
    if (currentSongIndex !== -1 && playlist[currentSongIndex]) {
        const song = playlist[currentSongIndex];
        const playingStatus = isPlaying ? '▶️' : '⏸️';
        document.title = `${playingStatus} ${song.name} - Music Player`;
    } else {
        document.title = '🎵 Music Player';
    }
}

function togglePlay() {
    if (playlist.length === 0) return;
    
    if (currentSongIndex === -1) {
        loadSong(0);
    }
    
    if (isPlaying) {
        audioPlayer.pause();
        playPauseBtn.textContent = '▶';
        isPlaying = false;
    } else {
        audioPlayer.play();
        playPauseBtn.textContent = '⏸';
        isPlaying = true;
    }
    
    updateTabTitle();
}

function toggleRepeat() {
    isRepeating = !isRepeating;
    repeatBtn.classList.toggle('active', isRepeating);
    updateSongInfo();
}

function toggleShuffle() {
    isShuffling = !isShuffling;
    shuffleBtn.classList.toggle('active', isShuffling);
    
    if (isShuffling) {
        // Reset play history and start playing from a random song
        playHistory = [];
        
        if (playlist.length > 0) {
            // Pick a random song (not the first one to make it feel shuffled)
            const randomIndex = Math.floor(Math.random() * playlist.length);
            playHistory.push(randomIndex);
            loadSong(randomIndex);
            
            // Auto-play the song
            audioPlayer.play();
            playPauseBtn.textContent = '⏸';
            isPlaying = true;
        }
    } else {
        playHistory = [];
    }
    
    updateSongInfo();
}

function getNextShuffleIndex() {
    if (playlist.length <= 1) return 0;
    
    // Get list of unplayed songs
    const unplayedIndices = [];
    for (let i = 0; i < playlist.length; i++) {
        if (!playHistory.includes(i)) {
            unplayedIndices.push(i);
        }
    }
    
    // If all songs have been played, reset history but keep current song
    if (unplayedIndices.length === 0) {
        playHistory = [currentSongIndex];
        // Rebuild unplayed list
        for (let i = 0; i < playlist.length; i++) {
            if (i !== currentSongIndex) {
                unplayedIndices.push(i);
            }
        }
    }
    
    // Pick random unplayed song
    const randomIndex = Math.floor(Math.random() * unplayedIndices.length);
    const nextIndex = unplayedIndices[randomIndex];
    
    playHistory.push(nextIndex);
    return nextIndex;
}

function handleSongEnd() {
    if (isRepeating) {
        // Restart the same song
        audioPlayer.currentTime = 0;
        audioPlayer.play();
    } else {
        // Go to next song
        nextSong();
    }
}

function previousSong() {
    if (playlist.length === 0) return;
    
    if (isShuffling && playHistory.length > 1) {
        // Go to previous song in shuffle history
        playHistory.pop(); // Remove current song
        const prevIndex = playHistory[playHistory.length - 1];
        loadSong(prevIndex);
    } else {
        // Normal previous behavior
        const newIndex = currentSongIndex > 0 ? currentSongIndex - 1 : playlist.length - 1;
        loadSong(newIndex);
    }
}

function nextSong() {
    if (playlist.length === 0) return;
    
    let newIndex;
    if (isShuffling) {
        newIndex = getNextShuffleIndex();
    } else {
        newIndex = currentSongIndex < playlist.length - 1 ? currentSongIndex + 1 : 0;
    }
    
    loadSong(newIndex);
}

function rewind15() {
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 15);
}

function forward15() {
    audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 15);
}

function seekTo(e) {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = percent * audioPlayer.duration;
}

function updateProgress() {
    if (audioPlayer.duration) {
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressFill.style.width = percent + '%';
        currentTime.textContent = formatTime(audioPlayer.currentTime);
    }
}

function updateSongInfo() {
    if (currentSongIndex !== -1) {
        const modes = [];
        if (isRepeating) modes.push('Repeating');
        if (isShuffling) modes.push('Shuffling');
        const modeText = modes.length > 0 ? ' • ' + modes.join(' • ') : '';
        songInfo.textContent = `Track ${currentSongIndex + 1} of ${playlist.length}${modeText}`;
    }
    
    if (audioPlayer.duration) {
        totalTime.textContent = formatTime(audioPlayer.duration);
    }
}

function removeSong(event, index) {
    event.stopPropagation();
    
    // Revoke object URL to free memory
    URL.revokeObjectURL(playlist[index].url);
    
    playlist.splice(index, 1);
    
    // Update play history for shuffle
    playHistory = playHistory.filter(i => i !== index).map(i => i > index ? i - 1 : i);
    
    if (index === currentSongIndex) {
        if (playlist.length === 0) {
            currentSongIndex = -1;
            audioPlayer.src = '';
            songTitle.textContent = 'No song selected';
            songInfo.textContent = 'Select a song to start playing';
            playPauseBtn.textContent = '▶';
            isPlaying = false;
            playHistory = [];
            updateTabTitle();
        } else {
            const newIndex = index >= playlist.length ? 0 : index;
            currentSongIndex = newIndex - 1;
            loadSong(newIndex);
        }
    } else if (index < currentSongIndex) {
        currentSongIndex--;
    }
    
    renderPlaylist();
}

function toggleTheme() {
    const body = document.body;
    const themeToggle = document.querySelector('.theme-toggle');
    
    isDark = !isDark;
    
    if (isDark) {
        body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️ Light Mode';
    } else {
        body.setAttribute('data-theme', 'light');
        themeToggle.textContent = '🌙 Dark Mode';
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Enhanced keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') return;
    
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            e.stopPropagation();
            togglePlay();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            rewind15();
            break;
        case 'ArrowRight':
            e.preventDefault();
            forward15();
            break;
        case 'ArrowUp':
            e.preventDefault();
            previousSong();
            break;
        case 'ArrowDown':
            e.preventDefault();
            nextSong();
            break;
        case 'KeyR':
            e.preventDefault();
            toggleRepeat();
            break;
        case 'KeyS':
            e.preventDefault();
            toggleShuffle();
            break;
    }
});

// Prevent space bar scrolling on keyup
document.addEventListener('keyup', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
    }
});

// Initialize tab title
updateTabTitle();

// ============================================
// INITIALIZE WARNING BAR & POPUP
// ============================================

/**
 * Initialize warning bar and popup visibility based on configuration
 */
function initializeWarningElements() {
    const warningBar = document.querySelector('.warning-bar');
    const warningPopup = document.querySelector('.warning-popup');
    
    // Set bar visibility
    if (warningBar) {
        warningBar.style.display = WARNING_CONFIG.bar === 'active' ? 'block' : 'none';
    }
    
    // Set popup visibility
    if (warningPopup) {
        warningPopup.style.display = WARNING_CONFIG.popup === 'active' ? 'flex' : 'none';
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', initializeWarningElements);

// ============================================
// WARNING POPUP & BAR FUNCTIONS
// ============================================

/**
 * Close the warning bar at the top
 */
function closeWarningBar() {
    const warningBar = document.querySelector('.warning-bar');
    if (warningBar) {
        warningBar.style.display = 'none';
    }
}

/**
 * Show the warning bar at the top
 */
function showWarningBar() {
    const warningBar = document.querySelector('.warning-bar');
    if (warningBar) {
        warningBar.style.display = 'block';
    }
}

/**
 * Show the warning popup
 */
function showWarningPopup() {
    const popup = document.querySelector('.warning-popup');
    if (popup) {
        popup.style.display = 'flex';
    }
}

/**
 * Close the warning popup
 */
function closeWarningPopup() {
    const popup = document.querySelector('.warning-popup');
    if (popup) {
        popup.style.display = 'none';
    }
}

/**
 * Close popup when clicking outside of it
 */
document.addEventListener('click', (e) => {
    const popup = document.querySelector('.warning-popup');
    const popupContent = document.querySelector('.warning-popup-content');
    
    if (popup && e.target === popup) {
        closeWarningPopup();
    }
});

// ============================================
// STREAMING SUPPORT MODULE
// ============================================

/**
 * Check if URL is a Spotify link
 * @param {string} url - The URL to check
 * @returns {object|null} - {type: 'spotify', trackId: id} or null
 */
function detectStreamingLink(url) {
    // Spotify URL patterns
    const spotifyPatterns = [
        /(?:https?:\/\/)?(?:www\.)?open\.spotify\.com\/track\/([a-zA-Z0-9]+)/,
        /spotify:track:([a-zA-Z0-9]+)/
    ];
    
    for (let pattern of spotifyPatterns) {
        const match = url.match(pattern);
        if (match) {
            return { type: 'spotify', trackId: match[1], url: url };
        }
    }
    
    return null;
}

/**
 * Get Spotify Access Token
 * @returns {Promise<string>} - Access token for Spotify API
 */
async function getSpotifyAccessToken() {
    try {
        if (!STREAMING_CONFIG.spotify.clientId || !STREAMING_CONFIG.spotify.clientSecret) {
            throw new Error('Spotify credentials not configured. Please set Client ID and Secret in script.js');
        }

        const credentials = btoa(`${STREAMING_CONFIG.spotify.clientId}:${STREAMING_CONFIG.spotify.clientSecret}`);
        
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            throw new Error('Failed to authenticate with Spotify');
        }

        const data = await response.json();
        return data.access_token;

    } catch (error) {
        console.error('Spotify auth error:', error);
        throw error;
    }
}

/**
 * Fetch track info from Spotify and get preview URL
 * @param {string} trackId - Spotify track ID
 * @returns {Promise<object>} - {url: previewUrl, name: trackName, artist: artistName}
 */
async function fetchSpotifyTrack(trackId) {
    try {
        const accessToken = await getSpotifyAccessToken();
        
        const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Track not found or not available');
        }

        const data = await response.json();

        if (!data.preview_url) {
            throw new Error('No preview available for this track. Premium Spotify account needed to stream full tracks.');
        }

        return {
            url: data.preview_url,
            name: data.name,
            artist: data.artists[0]?.name || 'Unknown Artist',
            duration: Math.floor(data.duration_ms / 1000)
        };

    } catch (error) {
        console.error('Spotify fetch error:', error);
        throw error;
    }
}

/**
 * Add Spotify track to playlist
 * @param {string} url - Spotify track URL or URI
 */
async function addStreamingLink(url) {
    const streamInfo = detectStreamingLink(url);
    
    if (!streamInfo) {
        alert('Please enter a valid Spotify track URL\n\nExample: https://open.spotify.com/track/...');
        return;
    }
    
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.textContent = '🔄 Loading from Spotify...';
    loadingDiv.style.textAlign = 'center';
    loadingDiv.style.padding = '20px';
    loadingDiv.style.color = 'var(--accent)';
    playlistContainer.innerHTML = '';
    playlistContainer.appendChild(loadingDiv);
    
    try {
        const trackData = await fetchSpotifyTrack(streamInfo.trackId);
        
        // Add to playlist
        const song = {
            name: `${trackData.name} - ${trackData.artist}`,
            url: trackData.url,
            duration: formatTime(trackData.duration),
            isStream: true,
            sourceUrl: url
        };
        
        playlist.push(song);
        
        // Load metadata
        const tempAudio = new Audio(trackData.url);
        tempAudio.addEventListener('loadedmetadata', () => {
            song.duration = formatTime(tempAudio.duration);
            renderPlaylist();
        });
        
        renderPlaylist();
        
        if (currentSongIndex === -1 && playlist.length > 0) {
            loadSong(0);
        }
        
    } catch (error) {
        alert('Error: ' + error.message);
        renderPlaylist();
    }
}
