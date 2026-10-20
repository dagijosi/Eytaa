# Changelog

All notable changes to **EYTAA** will be documented in this file.

---

## [0.2.9] - 2026-10-20

### 🍎 macOS Packaging & Runtime Launch Fix
- **Bundled Dynamic Libraries Packaging**: Configured the GitHub Actions macOS build pipeline to explicitly run `prepare-macos-libs.sh` and pass `--config src-tauri/tauri.macos.conf.json`. This ensures `libmpv.dylib`, `libmpv-wrapper.dylib`, and all dependent Homebrew dynamic libraries are correctly staged into `EYTAA.app/Contents/MacOS/lib/`.
- **Eliminated dyld Launch Abort**: Fixed the missing library dependency issue that prevented the macOS `.app` from launching and caused it to silently exit upon double-clicking.
- **macOS Gatekeeper First-Launch Guide**: Added detailed in-app and documentation guidance for macOS users to bypass Apple's unsigned application quarantine attribute via a 1-click terminal command (`xattr -cr /Applications/EYTAA.app`) or System Settings.

---

## [0.2.8] - 2026-10-20

### 🪟 Responsive Window Geometry & Screen Scaling
- **Dynamic Work Area Sizing**: The window now computes its initial width (~68%) and height (~66%) dynamically from the connected monitor's actual usable work area (excluding taskbars, start menu, and OS docks) instead of using a rigid, oversized fixed resolution.
- **Taskbar & Start Menu Clearance**: Centering and bounds checking now anchor strictly within `monitor.workArea`, ensuring the window never sits under the Windows taskbar, start menu, or display edges on any screen resolution (1080p, 768p, 2K, 4K, or high-DPI scaling).
- **Proportional Ultra-wide Capping**: Aspect ratio is automatically balanced on ultra-wide screens (e.g. 21:9 or 32:9) so the initial window frames content naturally without stretching across the entire display.
- **Automatic Storage Migration**: Upgraded window geometry persistence key to `v2`, ensuring any legacy oversized window dimensions from prior releases are cleanly reset to the new responsive screen-proportional defaults.

### 🪟 Multi-Instance & Multiple Windows Mode
- **Multi-Process SQLite Concurrency**: Enabled SQLite `WAL` mode (`PRAGMA journal_mode = WAL`) and a 5-second `busy_timeout` in the Rust backend, eliminating database file locks when multiple player instances run concurrently.
- **Cross-Platform Read-Only Preference Detection**: `should_reuse_single_window()` now accesses user preferences with non-locking read-only flags (`SQLITE_OPEN_READ_ONLY`) across Windows, macOS, and Linux, ensuring new processes accurately detect when "Allow Multiple Player Windows" is enabled.
- **New Player Window Action & Shortcut**: Added "New Player Window" (`Ctrl+N` / `Cmd+N`) to the TopBar quick menu and keyboard shortcuts, and registered the `open_new_window` Tauri command to spawn fresh player instances on demand.
- **Preference Alignment**: Synchronized the default state between the frontend and native backend so enabling "Allow Multiple Player Windows" immediately allows launching multiple player windows side-by-side.

### macOS Distribution
- **Apple Silicon Release Builds**: Added a macOS 15+ arm64 GitHub Actions release job that produces a `.dmg` alongside the existing Windows installers.
- **Self-Contained Media Stack**: `dylibbundler` now collects libmpv and its FFmpeg/Homebrew dependencies into `EYTAA.app/Contents/MacOS/lib`, and a bundled `ffmpeg` binary powers thumbnails without requiring Homebrew.
- **Separate Updater Artifacts**: macOS updater artifacts are disabled for now so the Windows updater manifest remains valid while macOS packaging is validated.

---

## [0.2.7] - 2026-10-20

### 📺 Media Center & Series Management
- **Deterministic Series Poster Query**: Upgraded the `db_get_series_overview` database query with an ordered subquery that selects custom series posters prioritized deterministically by season and episode sequence (rather than an arbitrary max string), ensuring series cards consistently display the intended cover artwork.
- **Unified Poster Resolver**: Introduced a centralized `useResolvedPoster` React hook and `mediaPoster` utility module (`resolvePoster`, `pickPosterItem`, `isDirectPosterUrl`), consolidating thumbnail and custom cover resolution logic across `MediaCard`, `EditMetadataModal`, and `SeriesDetailView`.
- **Series Detail Cover Management**: Enhanced `SeriesDetailView` cover actions to pick the first episode with a custom poster, cleanly handling "Add Cover", "Change Cover", and conditional "Reset Cover" states.

### 🎛️ Player & Drag-and-Drop Stability
- **Scrubber Event Listener Optimization**: Memoized `flushPendingSeek` callback within `ProgressScrubber` to eliminate unnecessary window mouseup listener churn during rapid playback scrubbing.
- **Native Drag-and-Drop Memoization**: Stabilized the native file and subtitle drag-and-drop listener callback in `App.tsx` for cleaner effect lifecycle and reliable drop handling.

---

## [0.2.6] - 2026-10-19

### 🎨 UI & Readability
- **High-Contrast Active States**: Reworked every active/selected control to use a solid accent fill with the theme’s guaranteed-contrast accent text, eliminating faded accent-on-accent icons and labels. Applied across playlist queue/saved tabs, auto-play next, repeat, audio/subtitle tracks, playback profiles, always-on-top pin, PiP restore, sleep timer, update badges and toasts, media library filters, metadata editor, and settings panels.
- **Theme-Aware Profile Icons**: Selected profile icons now inherit the active foreground color instead of blending into the accent background.

### 📺 Media Center
- **One-Click Season Pills**: Replaced the scrolling season tab strip with compact season pills that wrap onto multiple rows, showing watched/total progress per season plus an All Episodes option. Every season remains directly selectable in a single click, with no dropdown or extra step.

### 🔄 Updater
- **Persistent Update State**: Update check results are now cached and restored across sessions, with version-aware comparison (`isNewerVersion`) so stale or equal-version results no longer surface as available updates.
- **Stale Indicator Cleanup**: The TopBar update dot, menu badge, and update toasts now clear automatically when the installed app is already up to date.

---

## [0.2.5] - 2026-10-17

### 🎨 Deep Theming & Aesthetic Customization
- **12 Curated Design Skins**: Expanded full-theme presets to 12 production-ready aesthetic skins, introducing *Nord Arctic* (polar cyan minimalism), *Gruvbox Earth* (retro analog sepia), *OLED Cinema* (true black + emerald contrast), *Forest Night* (deep nocturnal mist), *Synthwave 84* (neon cyberpunk magenta), and *Mocha Latte* (warm coffee tones).
- **Active Theme Sync Banner**: Added a status indicator in Appearance Settings clarifying when accent colors are linked to a full design skin, with seamless one-click unlocking for standalone custom colors.
- **Advanced Subtitle Engine**: Deep subtitle typography controls including custom font family selection, full-spectrum custom font colors (with quick swatches and hex wheel), outline stroke thickness, shadow depth, cinema box backgrounds, and vertical margins.
- **Clean Borderless TopBar**: Removed distracting divider lines beneath the main TopNav for a completely unified, edge-to-edge frosted glass aesthetic.

### 🎛️ Playback Profiles System Overhaul
- **Expanded Built-in Profiles (9 Total)**: Added 4 new genre-tuned playback profiles:
  - *Late Night (Night Shift)*: Subdued brightness, warm gamma, quiet night loudnorm EQ, and soft amber subtitles for dark rooms.
  - *HDR Vivid Pop*: Deep blacks, boosted contrast, and rich saturation to make flat SDR content pop.
  - *Action & Blockbuster*: Punchy contrast and dynamic loudness compression to balance explosion audio against dialogue.
  - *Vintage Cinema (Analog)*: Muted saturation and warm sepia tones with classic cinema typography.
- **In-Place Interactive Profile Customizer**: Full visual editor to calibrate video picture (contrast, brightness, saturation, gamma), audio processing (Studio Flat, Night Mode Loudnorm, Vocal Clarity Boost), default speed, and subtitle typography presets.
- **Universal Profile Duplication**: One-click "Clone" button to duplicate any built-in or custom profile and tailor it into a personal preset.
- **Live Player Preview**: "Test in Player Now" button pushes calibrated profile settings to MPV immediately for zero-friction auditioning before saving.
- **Profile Categories & Search**: Category filtering (All, Cinema & Video, Audio & Voice, Night & Ambient, Custom) and instant search by keyword.
- **Profile JSON Backup & Sharing**: Import and export custom playback profiles via JSON with clipboard feedback.

---

## [0.2.4] - 2026-10-17

### ✨ New Features & Performance
- **Live Media Watcher**: Background filesystem watcher (`notify` crate) actively monitors indexed library folders, automatically updating the library and UI on file additions, deletions, or renames without requiring manual rescans.
- **Virtualized Media Grid**: Integrated `@tanstack/react-virtual` in the Media Center for lightning-fast scrolling and rendering of large media libraries without DOM overload.
- **Window Geometry Persistence**: Automatically persists and restores window position, size, and maximized state across app launches without display flash or misalignment.
- **Application Error Boundary**: Safe React Error Boundary wrapping the entire interface to catch runtime errors gracefully with instant reload/recovery options.
- **Library Pagination**: Added database-level limit and offset query support for responsive browsing.

### 🔧 Architecture & Refactoring
- **Modular Database Engine**: Decomposed the monolithic `db.rs` into clear submodules (`schema`, `library`, `playback`, `playlists`, `preferences`).
- **Modular Frontend Architecture**: Refactored monolithic components into maintainable sub-modules for `ControlBar`, `SettingsModal`, and `playerStore`.

---

## [0.2.3] - 2026-10-17

### ✨ New Features
- **Open Network Stream**: New "Open URL" dialog (`U`) that plays direct media and streaming links (HTTPS, HLS/m3u8, RTSP, RTMP, SRT, UDP, …) with inline validation and sane protocol handling.
- **Playback Stats Overlay**: Toggleable (`F9`) diagnostics panel showing resolution, container/render FPS, video & audio codecs, hardware-decode mode, dropped frames, and current speed.
- **Screenshots**: Save the current frame to disk with `E`, with an on-screen confirmation and graceful handling of streams.
- **Chapters**: The libmpv chapter list is now read and exposed, enabling chapter-aware navigation.
- **OS "Now Playing" Integration**: Media Session support surfaces title, artwork, and transport controls to the operating system — the Windows SMTC flyout, taskbar media preview, lock screen, and hardware media keys — with play/pause/next/previous/seek handlers.
- **Saved Playlists**: Create, load, and delete named playlists, backed by four new database commands.

### 🎛️ Controls & UX
- **Separate Auto-Play Next & Repeat**: These are now distinct controls — a dedicated Auto-Play Next toggle alongside a direct-select Repeat dropdown (Off / Repeat Playlist / Repeat One), with quick actions in the More menu. Their combined state stays in sync and is always reflected in the UI.
- **Playlist: Queue & Saved Tabs**: Playlist drawer now has tabs to switch between the current playback queue and saved playlists. Searching, list, and counts are tab-aware; saved playlists refresh on open and when switching tabs.
- **Playlist Drag-to-Reorder**: Live drag-and-drop reordering of queue items with smooth layout animations (framer-motion) and whole-row drag with 5px threshold; scrolls to keep the dragged row visible.
- **Scroll-to-Current on Open**: Opening the playlist scrolls the currently playing track to center in the visible list.
- **Consistent Tooltips**: A single app-wide tooltip layer replaces the browser's slow and unreliable native `title` tooltips, giving every icon button a fast, uniform, viewport-clamped hint.
- **New Shortcuts**: Cycle Audio Track (`A`), Cycle Repeat Mode (`R`), Open Network Stream (`U`), Save Screenshot (`E`), and Toggle Playback Stats (`F9`). Bare-key shortcuts no longer fire through Ctrl/Alt/Meta, so browser and OS combinations are left untouched.
- **Instant Window**: The window is now revealed as soon as the new startup splash (logo + spinner) paints, eliminating the blank window during boot.

### 🔧 Internals
- **Playlist Drawer Rework**: Reworked the playlist drawer's pointer-drag handling and layout for smoother reordering and interaction.
- **Player Service**: Added chapter, screenshot, and enhanced repeat-mode support to the mpv service layer.

---

## [0.2.2] - 2026-10-16

### ✨ Controls & Customization
- **Rebindable Keyboard Shortcuts**: Full settings-based shortcut editor grouped by Playback, Seeking, Volume, View, and Tools. Every action can be rebound with a capture flow (press the new key), per-row reset, and "Restore Defaults". `Enter` now toggles fullscreen by default.
- **Scroll-Wheel Volume**: Scroll over the video area to adjust volume in fine increments, with a toggle under Settings > Mouse Controls.
- **Custom Right-Click Menu**: Native-feeling frosted context menu with Open File(s)…, Media Library, Toggle Fullscreen, Always on Top, Settings…, Check for Updates, and About EYTAA.
- **Manual Update Check Toast**: New status toast for the "Check for Updates" action (checking, up-to-date, update available, or error) that reveals the Updates tab when a release is found.

### 🎵 Media Center
- **Music Tab**: Dedicated Music library view with track count, grid of media cards, All/Unplayed/Played filters, and sorting by recent, title, year, or duration.
- **Canonical Series Grouping**: Introduced a persisted `series_key` so naming variants of the same show group together, shares one count, and keeps resume/favorite/history intact. Added `db_get_series_overview` powering accurate series stats and the next-unwatched episode.
- **Specials-Aware Ordering**: Season 0 (specials) is sorted last and never auto-suggested by "Up Next" or series auto-queue.
- **Instant Library Close on Play**: The library modal now closes immediately when a file is opened instead of waiting for playback to resolve.
- **Sidebar Settings Shortcut**: Quick button at the bottom of the library sidebar to jump straight to Settings.

### ⚡ Performance
- **Lazy-Loaded Modals**: Settings and Media Library modals are code-split and idle-preloaded for a faster first paint.
- **Parallel Startup Preferences**: Volume, recents, profiles, and window preferences now load in a single `Promise.all` batch instead of sequential IPC round-trips.
- **Smarter Re-Parse**: Full library re-parsing now runs only when the stored parser version changes, dramatically speeding up routine startups.

### 🔧 Library Scanner
- **Robust Scene-Name Parsing**: Rewritten `strip_scene_noise` with exact-token matching (fixes truncation like "Dune" → "dv"), bracket-group stripping, and broader tag removal.
- **Folder-Based Series Names**: Resolves show names by walking ancestor folders and skipping generic ones ("Season 1", "Movies", "TV") with file-stem fallback.
- **Correct Season Detection**: "Show - 01" files now honor the season folder, and explicit `SxxExx` seasons are no longer overridden by folder-derived seasons.
- **Non-Destructive Metadata Edits**: Blank fields no longer erase existing media metadata (`COALESCE`-based updates), plus a startup self-repair pass for series rows missing season/episode numbers.

### 🐛 Fixes
- **Window Now Appears on Launch**: Added `core:window:allow-show` so the hidden-at-start window is correctly revealed by the frontend (fixes "app runs but no window is visible").
- **Accurate Version Display**: Top bar and Settings now show the real app version instead of hardcoded values.

---

## [0.2.1] - 2026-10-16

### ✨ Improvements & Fixes
- **Side-Screen Skip Indicators**: Replaced intrusive center `+10s`/`-10s` popups with sleek, edge-aligned fast-forward and rewind animations that never block video action or subtitles. Added setting toggle in Settings > Playback to enable/disable skip badges.
- **Clean Play / Pause Experience**: Removed obstructive "Play" and "Pause" center text overlays, keeping frame inspection clean when paused.
- **Top-Center Status HUD**: Repositioned general status notifications (volume, speed, tracks, sleep timer) into a compact Apple TV / Dynamic Island style capsule at top-center.
- **Responsive Media Center Header**: Global search bar now dynamically flexes with guaranteed minimum width so search text is always legible across narrow and split-screen layouts.
- **Balanced Media Hub Hero Card**: Fixed horizontal layout and responsive poster sizing on the hero spotlight banner to eliminate empty space and text clipping on medium-width windows.
- **Window Controls & Dragging**: Added native-feel minimize, maximize/restore, and close buttons to Media Library modal header alongside full window dragging.

---

## [0.2.0] - 2026-10-15

### 🚀 Smart Media Center (Version 2.0)
- **Collapsible Navigation Rail**: Upgraded left sidebar with smooth Framer Motion spring physics, icon-rail mode (`w-16`), and internal hamburger toggle button.
- **Smart TV Series & Episode Architecture**:
  - Automatic series grouping, season counts, episode grouping, and drill-down detail views (`SeriesDetailView`).
  - Frosted capsule "View Episodes • {count}" on hover without overlapping play buttons.
  - Dedicated series cover changer and metadata editor (`EditMetadataModal`).
- **Cinema-Grade Artwork System**:
  - Zero-crop presentation: `object-contain` foreground artwork backed by an ambient `object-cover blur-xl opacity-45 scale-125` glow layer.
  - Default 16:9 Landscape widescreen mode with seamless toggle to 2:3 Portrait posters on subheader toolbar.
  - Procedural backdrop generator for files without embedded or downloaded posters (`ProceduralPoster`).
- **Refined Media Cards**:
  - Smoked-glass jewel play button and clean duration pills.
  - Non-clipped resume badge & remaining time indicator.
  - Hover action tray positioned in bottom-left (`bottom-1.5 left-1.5`) for maximum artwork visibility.
- **Instant Welcome Screen Sync**:
  - Finished or marked watched media immediately clears from Continue Watching on the Welcome Screen and Media Hub without application restart.

---

## [0.1.5] - 2026-10-15

### 🚀 Highlights
- **Resilient Media Library**: Added fast fingerprint hashing (<0.1ms) to automatically detect moved, renamed, and duplicate media files without losing watch progress, history, or favorites.
- **Smart Unchanged File Skipping**: Folder scans instantly verify existing files by cached size and modification time, accelerating rescans from minutes to milliseconds.
- **Scan Cancellation & Live Progress**: Added non-blocking background folder scan cancellation and real-time progress reporting (current directory, files scanned, and item counts).
- **Removable Drive & Offline Folder Protection**: External USB drives and disconnected folders are safely preserved with "Drive Offline" and "OFFLINE" badges instead of wiping library records.
- **Duplicate Media Detection**: Added a dedicated "Duplicates" library tab and badge indicators to help users identify and clean redundant media files.
- **Thumbnail Cache Maintenance**: Built-in thumbnail cache disk usage statistics and one-click cache purge and offline record cleanup tools.
- **Gentle 24-Hour Update Notifications**: Unobtrusive update notification system featuring 15-second auto-expiring toasts, playback suppression (never interrupts active viewing), 24-hour rate limiting, and dismissal memory.
- **Full EYTAA Brand & Publisher Identity**: Standardized application identity across crate (`eytaa`, `eytaa_player_lib`), Windows bundle (`Dagmawi Y`, `Copyright © 2026 EYTAA`), database (`eytaa.db` with automated legacy migration), and capabilities.

### 🎬 Media Library Resilience
- Implemented `compute_quick_hash` in Rust reading sampled bytes + file size in under 0.1ms.
- Automatically migrates resume positions, favorites, and playback history when a file is renamed or moved across folders.
- Added `db_reconcile_missing_items` to differentiate temporarily offline external drives from deleted files.
- Added `db_clean_missing_items` to purge obsolete records on demand.
- Reordered database migrations in `db.rs` so column alterations run before index creation, eliminating schema initialization panics.

### 🔔 Unobtrusive Update Alerts
- Implemented `UpdateNotificationToast` with auto-dismiss countdown (15s) and playback state awareness.
- Added subtle glowing update badge to TopBar logo and Settings menu.
- Added "Automatic Update Checks" user preference toggles in Settings.

---

## [0.1.4] - 2026-10-15

### 🚀 Highlights
- **Native Media Library System**: Added local folder scanning, SQLite media indexing, on-demand thumbnail generation, favorites, unfinished video resumer, and M3U8/JSON playlist import & export.
- **Hardware Acceleration Fallback**: Automatic GPU decode failure detection with graceful CPU software decoding (`hwdec="no"`) fallback and non-blocking OSD alerts.
- **Custom Playback Profiles**: Create, tune, save, reset, and delete named audio/video playback profiles in SQLite.
- **Simple vs. Advanced Settings**: Re-architected settings modal separating everyday media preferences from expert tuning with WCAG AAA accessibility compliance.
- **Performance & Virtualization**: Progressive infinite scroll rendering (48-item chunks), debounced search, and negative thumbnail caching preventing UI lag on 1,000+ item libraries.
- **Playback Hardening**: Concurrency load sequence protection against rapid file switching race conditions, auto-skipping damaged files, and drag-and-drop subtitle auto-attachment.
- **Clean Windows Single-Instance Window Reuse**: Fixed single-instance activation so double-clicking media files in Windows Explorer on clean installations brings the active player to focus without opening duplicate windows.

### 🎬 Media Library & Native Features
- Added recursive multithreaded directory scanner (`scan_local_folder`) in Rust with depth control and symlink protection.
- Built native video frame thumbnailer (`get_thumbnail`) with a background semaphore concurrency limiter (max 2 ffmpeg processes) and negative caching (`.no_thumb`).
- Created SQLite performance indexes on `library_items` (`folder_path`, `media_type`, `title`, `file_path`) and related tables for sub-millisecond querying.
- Implemented `MediaLibraryModal` with Grid and List views, multi-tab filters (*All, Favorites, Unfinished, Movies, Series, Audio*), and playlist export/import.
- Added 250ms debounced search to eliminate IPC database hammering while typing.

### ⚙️ Settings & Customization
- Added "Restore All Defaults" feature that cleanly resets themes, profiles, MPV properties, and app settings back to factory state.
- Split settings modal into **Simple Mode** (volume, auto-play next, basic subtitles, accent theme, single-window behavior) and **Advanced Mode** (fine-grained MPV filters, sleep/night timer, global shortcuts, history manager, profile editor, updates).
- Enhanced focus rings and color indicators for custom themes to preserve full contrast and readability.

### 🛡️ Reliability & Playback Hardening
- Added `hwdec-current` property observation to MPV engine.
- Implemented automatic CPU fallback on hardware decoder error (`end-file` with `reason="error"`), seamlessly replaying the file via software decoding.
- Wrapped subtitle loading in guarded try/catch with user-friendly OSD feedback.
- Drag-and-drop detection for external subtitle files (`.srt`, `.vtt`, `.ass`, `.ssa`, `.sub`, `.lrc`), instantly mounting them to running video.
- Added `activeLoadSequence` counter guard to `openFile` to discard stale async operations during rapid file switching.
- Sleep/resume clock-drift detector safely pauses playback before system sleep to prevent D3D11 device loss upon wake.
- Updated single-instance window reuse logic in `src-tauri/src/lib.rs` to default to `true` on clean Windows installations.

---

## [0.1.3] - 2026-10-14
- Multi-window playback support and hover window snap layouts.
- Dynamic runtime versioning.
- Windows "Open With" file associations and single-instance CLI playback.
- Picture-in-Picture mode with high-DPI monitor coordinate calculation.

---

## [0.1.2] - 2026-10-14
- Quick always-on-top button in TopBar.
- Granular playback history deletion.
- Enhanced video hover progress scrub preview.

---

## [0.1.1] - 2026-10-13
- Signed updater pipeline integration and release build scripts.
- Global media hotkeys support via Windows API.

---

## [0.1.0] - 2026-10-12
- Initial release of EYTAA (Vistara Player).
- Transparent overlay rendering model with Tauri 2 and libmpv.
- Native hardware-accelerated playback with Direct3D11 / NVDEC / DXVA2.
- Smart TV series & sibling episode detection.
