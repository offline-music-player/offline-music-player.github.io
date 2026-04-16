# Offline Music Player

A lightweight, browser-based music player for local audio files. No backend required. The app runs entirely in the browser and stores playlist data locally.

This project is designed to be:
- Simple to use (open a file and play music)
- Offline-friendly (no network needed for playback)
- Easy to modify (plain HTML/CSS/JS, no build pipeline)

## Highlights
- 100% client-side: no servers, no accounts
- Supports common audio formats: MP3, WAV, OGG, M4A
- Clean UI with themes and light/dark mode
- Picture-in-Picture mini-player with visualizer
- Offline single-file build included

## Features
- Upload local audio files by browsing or drag-and-drop
- Playlist management with persistent data stored in the browser
- Play, pause, next/previous, and 15-second seek
- Shuffle and repeat modes
- Progress bar with seek
- Volume control
- Update log modal
- Theme engine with multiple presets
- Picture-in-Picture mini-player (PiP) with visualizer and queue ticker

## Quick Start
1. Open `index.html` in your browser.
2. Drop audio files into the upload area or use **Browse Files**.
3. Click a track to play.

## Offline Single-File Build
Use `offline-music-player.html` for a fully self-contained version with all HTML, CSS, and JS in one file. This is ideal for offline use, sharing, or running from removable media.

## Project Structure
- `index.html` – main app shell
- `styles.css` – styles
- `script.js` – player logic
- `themes.js` – theme engine
- `offline-music-player.html` – single-file offline build
- `changelog.html` – detailed change history
- `features.html` – feature overview (detailed list of every feature and features coming soon)
- `ideas.html` – feature request and roadmap page

## Controls
- **Play/Pause**: ▶ / ⏸
- **Next/Previous**: ⏭ / ⏮
- **Seek**: ⏪ / ⏩ (15 seconds)
- **Shuffle**: 🔀
- **Repeat**: 🔁
- **Volume**: slider

## Data & Privacy
- Audio files are loaded locally and are not uploaded.
- Playlist and settings are stored in your browser (IndexedDB/local storage).
- Google Analytics (GA4) is enabled in `index.html` and the offline build.

## Browser Support
Works best in modern Chromium-based browsers and recent Firefox/Safari versions. Picture-in-Picture support depends on browser capabilities.

## Development
No build step is required. Edit the HTML/CSS/JS files directly.

### Updating the Offline Build
The offline file is a fully inlined version of `index.html`, `styles.css`, `themes.js`, and `script.js`. If you change any of those files, regenerate `offline-music-player.html` by re-inlining them.

## Accessibility Notes
- All core controls are visible and labeled.
- Ensure your browser allows audio playback from local files.

## Known Limitations
- Files are loaded locally per session and cannot be accessed by other devices.
- The app does not scan folders; files must be selected manually.
- PiP availability depends on browser support.

## Architecture Walkthrough
The app is a single-page HTML shell with separate CSS and JS files. Runtime state lives entirely in memory and browser storage.

### Runtime State
- `playlist` holds the current list of tracks (name, URL, duration, file reference).
- `currentSongIndex` tracks the active song.
- `isPlaying`, `isRepeating`, `isShuffling` drive UI state and playback behavior.
- `settingsDb` (IndexedDB) stores persistent UI and update-log preferences.

### Audio Flow
1. Files are selected or dropped into the app.
2. Each file is converted to a `blob:` URL.
3. Metadata is read by creating a temporary `Audio` element.
4. The main `audioPlayer` element handles playback.
5. UI updates are driven by `timeupdate`, `loadedmetadata`, and `ended` events.

### UI Flow
1. Upload area collects files and triggers playlist updates.
2. Playlist UI is re-rendered from `playlist`.
3. Control buttons call functions for playback, seek, shuffle, and repeat.
4. Theme engine reads DOM state and applies theme variables.

### PiP Flow
1. PiP is opened via `documentPictureInPicture` where supported.
2. A lightweight UI is injected into the PiP window.
3. Canvas visualizer runs while PiP is open.

## UI Element Map
- Header: theme select, theme toggle, and menu dropdown
- Upload Area: file input, action buttons
- Current Song: title and info display
- Controls: playback, seek, shuffle, repeat
- Progress: seekable progress bar and time display
- Volume: slider control
- Playlist: rendered list with active track highlight
- Update Log: modal showing the latest updates
- Warning Bar/Popup: status messaging
- PiP: compact player with mini queue and visualizer

## Step-by-Step Feature Manual
1. Add music
2. Play or pause a track
3. Seek within a track
4. Adjust volume
5. Enable shuffle
6. Enable repeat
7. Change theme
8. Open and close PiP
9. Clear the playlist
10. Read the update log

## Supporting Pages
### Change Log (`changelog.html`)
- Contains a dated list of updates and fixes
- Useful for tracking feature additions and UI changes
- Can be linked from the main menu

### Features (`features.html`)
- Lists available features and their status
- Helps users discover hidden or advanced functionality
- Useful as a lightweight product overview page

### Ideas (`ideas.html`)
- Feature request and roadmap page
- Captures community suggestions and planned improvements
- Useful for prioritization and visibility

## License
See `LICENSE`.
