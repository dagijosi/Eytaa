# Changelog

All notable changes to **EYTAA (Vistara Player)** will be documented in this file.

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
