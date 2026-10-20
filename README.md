# EYTAA (Vistara Player)

A high-performance Windows and Apple Silicon macOS desktop media player inspired by VLC and PotPlayer, built with **Tauri 2**, **React 19 + TypeScript + Vite**, **Tailwind CSS v4**, **Zustand**, **SQLite**, and **MPV / libmpv**.

> **macOS builds** require macOS 15+ on Apple Silicon and are currently unsigned. If macOS blocks the first launch, right-click EYTAA in Applications and choose **Open**, or run `xattr -dr com.apple.quarantine /Applications/EYTAA.app`.

> 📖 **Comprehensive Documentation**: For a full breakdown of the system architecture, features, keyboard shortcuts, and file structures, see **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)**.

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Loom Player Application                         │
├────────────────────────────────────────────────────────────────────────┤
│  Frontend (React 19 + TypeScript + Vite + Tailwind CSS v4)              │
│  ├── Test Harness UI (Transparent Web Canvas)                          │
│  ├── Zustand State Store (usePlayerStore)                              │
│  ├── Typed Player Service (MpvPlayerService)                           │
│  └── Storage Service (StorageService -> SQLite bridge)                 │
├────────────────────────────────────────────────────────────────────────┤
│  IPC Boundary (Tauri 2 Core & Plugin Commands / Capabilities)          │
│  ├── libmpv:default  (init, destroy, command, set/get_property)        │
│  ├── dialog:default  (native Windows file picker)                      │
│  ├── fs:default      (local media access)                              │
│  └── db:*            (SQLite preferences, resume positions, history)   │
├────────────────────────────────────────────────────────────────────────┤
│  Native Backend (Rust 2021)                                            │
│  ├── DLL Search Path Loader (SetDllDirectoryW dynamic linking)         │
│  ├── SQLite Persistence Layer (rusqlite bundled)                       │
│  └── Tauri Libmpv Plugin (tauri-plugin-libmpv)                          │
├────────────────────────────────────────────────────────────────────────┤
│  Media Engine (MPV / libmpv)                                           │
│  ├── libmpv-wrapper.dll (Tauri C/FFI bridge)                           │
│  ├── libmpv-2.dll (LGPL v2.1+ / v3 build, FFmpeg, hwdec, libass)       │
│  └── Embedded HWND Surface (Rendered behind transparent WebView)       │
└────────────────────────────────────────────────────────────────────────┘
```

### Embedded Rendering Model
On Windows, WebView2 is hosted inside a native Win32 window (`HWND`). When `tauri.conf.json` enables window transparency (`"transparent": true`) and CSS sets `html, body { background: transparent; }`, the web layer acts as an interactive overlay. MPV attaches directly to the window handle (`wid`) and renders high-frame-rate, hardware-accelerated video beneath the transparent web layer, allowing rich custom HTML/CSS controls without performance overhead or tearing.

---

## 2. Project Structure

```
d:/Projects/Personal/player/
├── package.json                   # NPM scripts & dependencies
├── vite.config.ts                 # Vite + Tailwind v4 + Tauri configuration
├── tsconfig.json                  # Strict TypeScript configuration
├── src/
│   ├── main.tsx                   # React root mount
│   ├── index.css                  # Tailwind v4 import & transparency styles
│   ├── App.tsx                    # Technical verification test harness
│   ├── stores/
│   │   └── playerStore.ts         # Zustand store (transient state + persistent sync)
│   └── services/
│       ├── player/
│       │   ├── types.ts           # Typed PlayerState, TrackInfo, Errors
│       │   └── mpvPlayerService.ts# Clean MediaPlayerService implementation
│       └── storage/
│           └── storageService.ts  # SQLite client for history & preferences
└── src-tauri/
    ├── Cargo.toml                 # Rust dependencies & release profile
    ├── tauri.conf.json            # Tauri v2 window, security & capability configs
    ├── capabilities/
    │   └── default.json           # Explicit permissions (libmpv, dialog, fs, db)
    ├── lib/                       # Windows Native DLLs
    │   ├── libmpv-2.dll           # Core LGPL libmpv media engine (~101 MB)
    │   └── libmpv-wrapper.dll     # FFI bridge DLL (~391 KB)
    └── src/
        ├── lib.rs                 # Tauri builder, plugins & DLL search path logic
        ├── main.rs                # Executable entry point
        └── db.rs                  # Rusqlite SQLite persistence layer
```

---

## 3. Technology Stack & Dependencies

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Desktop Shell** | Tauri 2.12 (`@tauri-apps/api`, `@tauri-apps/cli`) | Lightweight native Windows wrapper |
| **Frontend Framework** | React 19 + TypeScript | UI view layer |
| **Build Tool** | Vite 8 + `@tailwindcss/vite` | Rapid HMR & optimized production bundles |
| **Styling** | Tailwind CSS v4 (`@import "tailwindcss";`) | Modern design system without postcss.config |
| **Media Engine** | MPV (`tauri-plugin-libmpv`, `tauri-plugin-libmpv-api`) | Native hardware-accelerated video/audio engine |
| **State Management** | Zustand 5 | Transient playback state & service bindings |
| **Persistence** | SQLite (`rusqlite` bundled) | Durable playback history, resume points, preferences |
| **System Integrations** | `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs` | Native Windows file picker & secure filesystem access |

---

## 4. Native MPV Installation & Windows DLL Management

### Required DLLs
1. **`libmpv-2.dll`**: Full LGPL build of MPV by zhongfly (`mpv-dev-lgpl-x86_64`), containing FFmpeg codecs, hardware decoders (D3D11va, DXVA2, NVDEC), and `libass` subtitle renderer.
2. **`libmpv-wrapper.dll`**: Dynamic C wrapper bridging the Tauri plugin to `libmpv`.

### Automated Setup Command
To download and verify the native libraries automatically:
```bash
npm run setup:lib
```
This downloads and extracts the exact architecture-matched libraries into `src-tauri/lib/`.

### Runtime DLL Resolution on Windows
In `src-tauri/src/lib.rs`, `setup_dll_environment()` runs before any plugin loads:
* Locates `src-tauri/lib` relative to the running binary or project root.
* Automatically creates hard links/copies next to the executable (`target/debug` or `target/release`).
* Invokes Win32 `SetDllDirectoryW` to add the directory to Windows' DLL search order.

### Release Packaging
In `src-tauri/tauri.conf.json`, `bundle.resources` is configured:
```json
"bundle": {
  "resources": [
    "lib/**/*"
  ]
}
```
During `npm run tauri:build`, the DLLs are packaged into the installer and bundled directory alongside the executable.

### macOS Packaging
The macOS build is self-contained: `dylibbundler` collects libmpv, FFmpeg, and their Homebrew dependencies into `EYTAA.app/Contents/MacOS/lib`, and a bundled `ffmpeg` powers thumbnails.

```bash
brew install mpv ffmpeg dylibbundler
npm run setup:lib
npm run tauri:build
```

The `beforeBundleCommand` hook runs `scripts/prepare-macos-libs.sh` automatically. macOS releases currently target Apple Silicon (arm64) and macOS 15+.

---

## 5. Development & Verification Commands

### Prerequisites
* **Node.js**: v20+ (v22 installed)
* **Rust & Cargo**: Rust 1.77+ (rustc 1.97 installed)
* **Visual Studio C++ Build Tools**: Windows 10/11 SDK + MSVC toolchain

### Scripts Reference

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs the Vite frontend development server on port 1420 |
| `npm run build` | Compiles TypeScript and builds production frontend bundle |
| `npm run typecheck` | Validates TypeScript types across the entire project |
| `npm run tauri:dev` | Launches the complete Tauri desktop application with embedded MPV |
| `npm run tauri:build` | Compiles release binary and creates Windows installer |
| `npm run rust:check` | Checks Rust backend syntax and dependency compilation |
| `npm run setup:lib` | Downloads or refreshes the `libmpv` wrapper for the current platform |
| `npm run setup:mac` | Stages libmpv, FFmpeg, and dependencies for a macOS `.app` (macOS only) |

> 🚀 **Release & Versioning Process**: For step-by-step instructions on version bumping, pre-flight verification, committing, pushing, and tagging releases that trigger GitHub Actions builds, see **[RELEASE_PROCESS.md](RELEASE_PROCESS.md)**.

---

## 6. Verification Test Harness

The application contains a dedicated test harness in `src/App.tsx` designed to verify all 8 required criteria:

1. **Application Launch**: Tauri window opens with transparent rendering surface.
2. **Engine Initialization**: Click **"Initialize MPV Engine"** to initialize `libmpv`. Status changes to `READY`.
3. **Local File Playback**: Click **"Open File..."** to open any `.mp4`, `.mkv`, `.webm`, or `.mp3` via native Windows file dialog.
4. **Embedded Video Rendering**: Video renders directly inside the dashed bounding box of the window (embedded HWND).
5. **Playback Controls**: Test Play, Pause, Seek slider, Volume slider, Mute, and Playback Speed (0.5x - 2.0x).
6. **State Reporting**: Live `time-pos`, `duration`, `volume`, audio/subtitle tracks, and event log display real MPV updates.
7. **Media Replacement**: Click **"Replace Test"** to verify that swapping media items sequentially does not crash the native engine.
8. **Resource Disposal**: Click **"Shutdown / Release Engine"** to verify that `destroy()` cleanly releases native handles without leaking.

---

## 7. Known Antivirus Note (Kaspersky / Real-Time Protection)

When compiling Rust packages on Windows with third-party antivirus installed (such as Kaspersky):
* Kaspersky's real-time file scanner may intercept newly generated `build-script-build*.exe` executables in `target/debug/build/`, causing `Access is denied (os error 5)` or file lock errors (`os error 32`).
* **Resolution**: In Kaspersky / Antivirus Settings -> **Protection** -> **Threats and Exclusions** -> **Exclusions**, add the project directory:
  `D:\Projects\Personal\player\`
  as an excluded path for file antivirus.

---

## 8. Licensing & Redistribution

* **MPV / libmpv**: Sourced from the **LGPL v2.1+ / v3** build of `mpv-dev-lgpl-x86_64` (zhongfly). Because the LGPL build is used dynamically linked (`libmpv-2.dll`), proprietary or custom desktop applications can distribute it under LGPL compliance by allowing end users to replace the shared library.
* **tauri-plugin-libmpv**: Licensed under the **Mozilla Public License 2.0 (MPL-2.0)**.
* **Tauri 2**: Dual-licensed under MIT / Apache-2.0.
#   E y t a a  
 