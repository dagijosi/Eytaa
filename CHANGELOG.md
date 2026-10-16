# Changelog

All notable changes to **EYTAA** will be documented in this file.

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
