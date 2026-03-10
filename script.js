// Music player variables
let playlist = [];
let currentSongIndex = -1;
let isPlaying = false;
let isDark = true;
let isRepeating = false;
let isShuffling = false;
let playHistory = [];
let audioContext = null;
let analyser = null;
let analyserData = null;
let visualizerRaf = null;
let visualizerActive = false;
let pipAutoOpened = false;
let pipUserClosed = false;
let updateLogSignature = '';

// ============================================
// WARNING BAR & POPUP CONFIGURATION
// ============================================
// bar: 'active' (shows) or 'inactive' (hides)
// popup: 'active' (shows) or 'inactive' (hides)
const WARNING_CONFIG = {
    bar: 'inactive',
    popup: 'active'
};

// ============================================
// UPDATE LOG CONFIGURATION
// ============================================
const UPDATE_LOG_CONFIG = {
    enabled: true,
    version: 'Feb 11, 2026',
    displayDate: 'Feb 11, 2026',
    title: 'Updates in Progress',
    items: [
        'Updates coming soon: Search for a song and play it directly from your playlist. '
    ]
};

const SITE_VERSION = 'v1.3.1';
const SETTINGS_DB_NAME = 'offlineMusicPlayerSettings';
const SETTINGS_DB_VERSION = 1;
const SETTINGS_STORE = 'settings';
let settingsDbPromise = null;
// ============================================
// TEMPLATE FOR NEW HTML FILES
// ============================================
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
const albumArt = document.getElementById('albumArt');
const pipContent = document.getElementById('pipContent');
const pipAnchor = document.getElementById('pipAnchor');
const clearModalOverlay = document.getElementById('clearModalOverlay');
const clearModalConfirmBtn = document.getElementById('clearModalConfirmBtn');
const clearModalCancelBtn = document.getElementById('clearModalCancelBtn');
const pipVisualizer = document.getElementById('pipVisualizer');
const pipQueueText = document.getElementById('pipQueueText');
const themeSelect = document.getElementById('themeSelect');

const PIP_DIMENSIONS = { width: 300, height: 350 };
let pipWindow = null;
let pipOpening = false;

// Initialize (only if audio player exists on this page)
if (audioPlayer) {
    audioPlayer.volume = 0.5;

    // Event Listeners
    audioPlayer.addEventListener('loadedmetadata', updateSongInfo);
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', handleSongEnd);
    audioPlayer.addEventListener('play', updateTabTitle);
    audioPlayer.addEventListener('pause', updateTabTitle);
    audioPlayer.addEventListener('play', () => {
        ensureAudioContext();
        if (pipWindow) startVisualizer();
    });

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

    setupPiPBehavior();
}

if (window.ThemeEngine) {
    window.ThemeEngine.init({ albumArtEl: albumArt });
}

// Dropdown Menu Functions
function toggleDropdown() {
    const dropdown = document.getElementById('menuDropdown');
    dropdown.classList.toggle('active');
}

// Close dropdown when clicking outside
window.addEventListener('click', (e) => {
    const dropdown = document.getElementById('menuDropdown');
    if (!dropdown) return;
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
    updateMiniQueue();
    
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
    applyDynamicThemeFromArt();
    updateMiniQueue();
    
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
        ensureAudioContext();
        audioPlayer.play();
        playPauseBtn.textContent = '⏸';
        isPlaying = true;
    }
    
    updateTabTitle();
}

function toggleRepeat() {
    isRepeating = !isRepeating;
    repeatBtn.classList.toggle('active', isRepeating);
    if (audioPlayer) {
        audioPlayer.loop = isRepeating;
    }
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
    updateMiniQueue();
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
    if (isRepeating) return;
    // Go to next song
    nextSong();
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
    updateMiniQueue();
}

function toggleTheme() {
    const root = document.documentElement;
    const themeToggle = document.querySelector('.theme-toggle');
    
    isDark = !isDark;
    
    if (isDark) {
        root.setAttribute('data-mode', 'dark');
        themeToggle.textContent = '☀️ Light Mode';
    } else {
        root.setAttribute('data-mode', 'light');
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
// PICTURE-IN-PICTURE (MINI PLAYER)
// ============================================

function setupPiPBehavior() {
    if (!pipContent || !pipAnchor) return;

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (!pipWindow && !pipUserClosed && !audioPlayer.paused) {
                openPiPWindow({ reason: 'visibility' });
            }
        } else if (pipWindow && pipAutoOpened) {
            closePiPWindow({ reason: 'visibility' });
        }
    });

    window.addEventListener('pagehide', () => {
        closePiPWindow({ reason: 'visibility' });
    });

    const themeObserver = new MutationObserver(syncPiPTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });
}

async function openPiPWindow({ reason } = {}) {
    if (pipWindow || pipOpening || !pipContent || !pipAnchor) return;
    pipOpening = true;

    try {
        if (!('documentPictureInPicture' in window) || !documentPictureInPicture.requestWindow) {
            console.warn('Document PiP not supported in this browser.');
            return;
        }

        const pip = await documentPictureInPicture.requestWindow({
            width: PIP_DIMENSIONS.width,
            height: PIP_DIMENSIONS.height
        });
        pipAutoOpened = reason === 'visibility';
        pipUserClosed = false;
        setupPiPWindow(pip);
    } catch (error) {
        console.warn('PiP unavailable:', error);
    } finally {
        pipOpening = false;
    }
}

function setupPiPWindow(pip) {
    pipWindow = pip;

    /**
     * How it works:
     * The PiP window is a separate document. We move the existing player DOM
     * into the PiP document, clone stylesheets, and then sync theme attributes
     * plus CSS variables so the mini window stays visually consistent.
     */
    pipWindow.previousSong = previousSong;
    pipWindow.rewind15 = rewind15;
    pipWindow.togglePlay = togglePlay;
    pipWindow.forward15 = forward15;
    pipWindow.nextSong = nextSong;
    pipWindow.toggleRepeat = toggleRepeat;
    pipWindow.toggleShuffle = toggleShuffle;
    pipWindow.seekTo = seekTo;
    pipWindow.loadSong = loadSong;
    pipWindow.removeSong = removeSong;

    const baseTag = pipWindow.document.createElement('base');
    baseTag.href = document.baseURI;
    pipWindow.document.head.appendChild(baseTag);

    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        pipWindow.document.head.appendChild(link.cloneNode(true));
    });

    const pipStyle = pipWindow.document.createElement('style');
    pipStyle.textContent = 'body{margin:0;overflow:auto;}';
    pipWindow.document.head.appendChild(pipStyle);

    pipWindow.document.title = 'Music Player';
    pipWindow.document.documentElement.classList.add('pip-mode');
    pipWindow.document.body.classList.add('pip-mode');
    syncPiPTheme();
    pipWindow.document.body.appendChild(pipContent);
    ensureAudioContext();
    resizeVisualizer();
    setTimeout(resizeVisualizer, 60);
    startVisualizer();

    pipWindow.addEventListener('pagehide', restorePiPContent);
    pipWindow.addEventListener('beforeunload', restorePiPContent);
    attachPiPShortcuts();
}

function forcePiPSize() {
    if (!pipWindow || !pipWindow.resizeTo) return;
    const resize = () => {
        try {
            pipWindow.resizeTo(PIP_DIMENSIONS.width, PIP_DIMENSIONS.height);
        } catch (error) {
            console.warn('PiP resize failed:', error);
        }
    };
    resize();
    setTimeout(resize, 50);
    setTimeout(resize, 200);
}

function syncPiPTheme() {
    if (!pipWindow || !pipWindow.document || !document.documentElement) return;
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const currentMode = document.documentElement.getAttribute('data-mode');
    const targetRoot = pipWindow.document.documentElement;

    if (currentTheme) {
        targetRoot.setAttribute('data-theme', currentTheme);
    } else {
        targetRoot.removeAttribute('data-theme');
    }
    if (currentMode) {
        targetRoot.setAttribute('data-mode', currentMode);
    } else {
        targetRoot.removeAttribute('data-mode');
    }

    const source = getComputedStyle(document.documentElement);
    const vars = [
        '--ui-accent',
        '--ui-accent-2',
        '--ui-bg',
        '--ui-surface',
        '--ui-surface-2',
        '--ui-progress-fill',
        '--ui-glow',
        '--ui-border',
        '--ui-text',
        '--ui-text-muted',
        '--ui-progress-bg'
    ];
    vars.forEach((name) => {
        targetRoot.style.setProperty(name, source.getPropertyValue(name));
    });
}

function restorePiPContent() {
    if (!pipContent || !pipAnchor || pipContent.ownerDocument === document) return;
    detachPiPShortcuts();
    pipAnchor.parentElement.insertBefore(pipContent, pipAnchor);
    pipWindow = null;
    stopVisualizer();
}

function closePiPWindow({ reason } = {}) {
    if (!pipWindow) return;
    try {
        pipWindow.close();
    } catch (error) {
        console.warn('PiP close failed:', error);
    }
    if (reason !== 'visibility') {
        pipUserClosed = true;
    }
    pipAutoOpened = false;
    restorePiPContent();
}

// ============================================
// PIP SHORTCUTS
// ============================================

let pipKeydownHandler = null;
let pipKeyupHandler = null;

function attachPiPShortcuts() {
    if (!pipWindow || !pipWindow.document || pipKeydownHandler) return;

    pipKeydownHandler = (e) => {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

        switch (e.code) {
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
    };

    pipKeyupHandler = (e) => {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
        if (e.code === 'Space') {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    pipWindow.document.addEventListener('keydown', pipKeydownHandler, { capture: true });
    pipWindow.document.addEventListener('keyup', pipKeyupHandler, { capture: true });
}

function detachPiPShortcuts() {
    if (!pipWindow || !pipWindow.document) return;
    if (pipKeydownHandler) {
        pipWindow.document.removeEventListener('keydown', pipKeydownHandler, { capture: true });
        pipKeydownHandler = null;
    }
    if (pipKeyupHandler) {
        pipWindow.document.removeEventListener('keyup', pipKeyupHandler, { capture: true });
        pipKeyupHandler = null;
    }
}

// ============================================
// INITIALIZE WARNING BAR & POPUP
// ============================================

function getCookieValue(name) {
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const cookie of cookies) {
        const [cookieName, ...rest] = cookie.split('=');
        if (cookieName === name) {
            return decodeURIComponent(rest.join('='));
        }
    }
    return '';
}

function setCookieValue(name, value, days) {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; samesite=lax`;
}

function initSettingsDb() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (settingsDbPromise) return settingsDbPromise;
    settingsDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(SETTINGS_DB_NAME, SETTINGS_DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                db.createObjectStore(SETTINGS_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return settingsDbPromise;
}

async function getSetting(key) {
    try {
        const db = await initSettingsDb();
        if (!db) return null;
        return await new Promise((resolve) => {
            const tx = db.transaction(SETTINGS_STORE, 'readonly');
            const store = tx.objectStore(SETTINGS_STORE);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => resolve(null);
        });
    } catch (error) {
        return null;
    }
}

async function setSetting(key, value) {
    try {
        const db = await initSettingsDb();
        if (!db) return;
        await new Promise((resolve) => {
            const tx = db.transaction(SETTINGS_STORE, 'readwrite');
            const store = tx.objectStore(SETTINGS_STORE);
            const req = store.put(value, key);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
        });
    } catch (error) {
        // Ignore settings persistence errors
    }
}

/**
 * Initialize update log modal visibility based on cookie and configuration
 */
function getUpdateLogSignature(payload) {
    return payload.join('|');
}

async function initializeUpdateLog() {
    const updateLog = document.querySelector('.update-log');
    if (!updateLog) return;

    const title = updateLog.querySelector('[data-update-log-title]');
    const version = updateLog.querySelector('[data-update-log-version]');
    const list = updateLog.querySelector('[data-update-log-items]');

    const fallbackTitle = title ? title.textContent.trim() : '';
    const fallbackVersion = version ? version.textContent.trim() : '';
    const fallbackItems = list
        ? Array.from(list.querySelectorAll('li')).map(item => item.textContent.trim()).filter(Boolean)
        : [];

    const useConfig = UPDATE_LOG_CONFIG && UPDATE_LOG_CONFIG.enabled;
    const hasFallbackTitle = Boolean(fallbackTitle);
    const hasFallbackVersion = Boolean(fallbackVersion);
    const hasFallbackItems = fallbackItems.length > 0;

    // Prefer HTML content when it exists so manual edits show on the site.
    const appliedTitle = hasFallbackTitle ? fallbackTitle : (useConfig ? UPDATE_LOG_CONFIG.title : '');
    const appliedVersion = hasFallbackVersion ? fallbackVersion : (useConfig ? UPDATE_LOG_CONFIG.displayDate : '');
    const appliedItems = hasFallbackItems
        ? fallbackItems
        : (useConfig && Array.isArray(UPDATE_LOG_CONFIG.items) ? UPDATE_LOG_CONFIG.items : []);

    const signature = getUpdateLogSignature([
        appliedTitle,
        appliedVersion,
        ...appliedItems
    ]);
    updateLogSignature = signature;

    const updateLogKey = updateLog.dataset.updateLogKey || 'update_log_seen';
    const stored = await getSetting(updateLogKey);
    const cookieSeen = getCookieValue(updateLogKey);
    const shouldShow = UPDATE_LOG_CONFIG && UPDATE_LOG_CONFIG.enabled &&
        stored !== signature && cookieSeen !== signature;

    if (title && appliedTitle) title.textContent = appliedTitle;
    if (version && appliedVersion) version.textContent = appliedVersion;
    if (list) {
        list.innerHTML = appliedItems.map(item => `<li>${item}</li>`).join('');
    }

    updateLog.style.display = shouldShow ? 'flex' : 'none';
}

function initializeSiteVersion() {
    const versionBadge = document.querySelector('[data-site-version]');
    if (!versionBadge) return;
    versionBadge.textContent = SITE_VERSION;
}

/**
 * Initialize warning bar and popup visibility based on configuration
 */
function initializeWarningElements() {
    const warningBar = document.querySelector('.warning-bar');
    const warningPopup = document.querySelector('.warning-popup');
    
    // Set bar visibility
    if (warningBar) {
        const barActive = WARNING_CONFIG.bar === 'active';
        warningBar.style.display = barActive ? 'block' : 'none';
        document.body.classList.toggle('warning-bar-active', barActive);
    }
    
    // Set popup visibility
    if (warningPopup) {
        warningPopup.style.display = WARNING_CONFIG.popup === 'active' ? 'flex' : 'none';
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeWarningElements();
    initializeUpdateLog();
    initializeSiteVersion();

    if (clearModalConfirmBtn) {
        clearModalConfirmBtn.addEventListener('click', confirmClearSongs);
    }
    if (clearModalCancelBtn) {
        clearModalCancelBtn.addEventListener('click', closeClearConfirm);
    }
    if (clearModalOverlay) {
        clearModalOverlay.addEventListener('click', (e) => {
            if (e.target === clearModalOverlay) {
                closeClearConfirm();
            }
        });
    }

    if (themeSelect) {
        const savedTheme = localStorage.getItem('ui-theme') || document.documentElement.getAttribute('data-theme') || 'classic';
        themeSelect.value = savedTheme;
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (window.ThemeEngine) {
            window.ThemeEngine.setThemePreset(savedTheme);
        }

        themeSelect.addEventListener('change', (e) => {
            const nextTheme = e.target.value;
            document.documentElement.setAttribute('data-theme', nextTheme);
            if (window.ThemeEngine) {
                window.ThemeEngine.setThemePreset(nextTheme);
            }
            localStorage.setItem('ui-theme', nextTheme);
            if (pipWindow) {
                syncPiPTheme();
            }
        });
    }

    updateMiniQueue();
});


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
        document.body.classList.remove('warning-bar-active');
    }
}

/**
 * Show the warning bar at the top
 */
function showWarningBar() {
    const warningBar = document.querySelector('.warning-bar');
    if (warningBar) {
        warningBar.style.display = 'block';
        document.body.classList.add('warning-bar-active');
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

// ============================================
// CLEAR SONGS MODAL
// ============================================

function openClearConfirm() {
    if (clearModalOverlay) {
        clearModalOverlay.hidden = false;
        clearModalOverlay.setAttribute('aria-hidden', 'false');
        clearModalOverlay.classList.add('active');
    }
}

function closeClearConfirm() {
    if (clearModalOverlay) {
        clearModalOverlay.classList.remove('active');
        clearModalOverlay.setAttribute('aria-hidden', 'true');
        clearModalOverlay.hidden = true;
    }
}

function confirmClearSongs() {
    closeClearConfirm();
    clearAllSongs();
}

function clearAllSongs() {
    if (playlist.length === 0) {
        renderPlaylist();
        return;
    }

    playlist.forEach(song => {
        if (song.url) {
            URL.revokeObjectURL(song.url);
        }
    });

    playlist = [];
    currentSongIndex = -1;
    isPlaying = false;
    playHistory = [];

    audioPlayer.pause();
    audioPlayer.src = '';
    playPauseBtn.textContent = '▶';
    songTitle.textContent = 'No song selected';
    songInfo.textContent = 'Select a song to start playing';
    progressFill.style.width = '0%';
    currentTime.textContent = '0:00';
    totalTime.textContent = '0:00';

    renderPlaylist();
    updateTabTitle();
    updateMiniQueue();
}

/**
 * Close the update log popup and remember it for this version
 */
function closeUpdateLog() {
    const updateLog = document.querySelector('.update-log');
    if (!updateLog) return;
    updateLog.style.display = 'none';
    const updateLogKey = updateLog.dataset.updateLogKey || 'update_log_seen';
    const signature = updateLogSignature || '';
    if (signature) {
        setCookieValue(updateLogKey, signature, 365);
        setSetting(updateLogKey, signature);
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

/**
 * Close update log when clicking outside of it
 */
document.addEventListener('click', (e) => {
    const updateLog = document.querySelector('.update-log');
    if (updateLog && e.target === updateLog) {
        closeUpdateLog();
    }
});

// ============================================
// THEME ENGINE INTEGRATION
// ============================================

function applyDynamicThemeFromArt() {
    if (!window.ThemeEngine || !albumArt) return;
    if (albumArt.src) {
        window.ThemeEngine.applyVibrantFromImage(albumArt);
    }
}

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

// ============================================
// AUDIO CONTEXT + VISUALIZER
// ============================================

/**
 * How it works:
 * We create a single AudioContext + AnalyserNode for the HTMLAudioElement.
 * The analyser reads frequency data for a lightweight canvas renderer
 * that only runs while the PiP window is open.
 */
function ensureAudioContext() {
    if (!audioContext) {
        audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audioPlayer);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.85;
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        analyserData = new Uint8Array(analyser.frequencyBinCount);
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
    }
}

function startVisualizer() {
    if (!pipVisualizer || !analyser || visualizerRaf) return;
    visualizerActive = true;
    resizeVisualizer();
    const ctx = pipVisualizer.getContext('2d');

    const draw = () => {
        if (!visualizerActive) return;
        analyser.getByteFrequencyData(analyserData);
        const { width, height } = pipVisualizer;

        ctx.clearRect(0, 0, width, height);
        const barCount = Math.min(48, analyserData.length);
        const barWidth = width / barCount;

        for (let i = 0; i < barCount; i++) {
            const value = analyserData[i] / 255;
            const barHeight = Math.max(4, value * height);
            const x = i * barWidth;
            const y = height - barHeight;
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ui-accent').trim() || '#00b3ff';
            ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
        }

        visualizerRaf = requestAnimationFrame(draw);
    };

    draw();
}

function stopVisualizer() {
    visualizerActive = false;
    if (visualizerRaf) {
        cancelAnimationFrame(visualizerRaf);
        visualizerRaf = null;
    }
}

function resizeVisualizer() {
    if (!pipVisualizer) return;
    const rect = pipVisualizer.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    pipVisualizer.width = Math.floor(rect.width * ratio);
    pipVisualizer.height = Math.floor(rect.height * ratio);
}

// ============================================
// MINI QUEUE (PiP)
// ============================================

function updateMiniQueue() {
    if (!pipQueueText) return;
    if (!playlist.length) {
        pipQueueText.textContent = 'No tracks queued';
        return;
    }

    if (isRepeating && currentSongIndex !== -1) {
        pipQueueText.textContent = `Repeating: ${playlist[currentSongIndex].name}`;
        return;
    }

    if (isShuffling) {
        const remaining = playlist.length - playHistory.length;
        pipQueueText.textContent = `Shuffle mode • ${Math.max(0, remaining)} remaining`;
        return;
    }

    const nextIndex = currentSongIndex === -1
        ? 0
        : (currentSongIndex < playlist.length - 1 ? currentSongIndex + 1 : 0);

    const nextTrack = playlist[nextIndex];
    pipQueueText.textContent = nextTrack ? `Next: ${nextTrack.name}` : 'No tracks queued';
}
