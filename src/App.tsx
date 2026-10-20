import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react";
import { useShallow } from "zustand/react/shallow";
import { usePlayerStore } from "./stores/playerStore";
import { useThemeStore, syncSubtitlesToMpv } from "./stores/themeStore";
import { TopBar } from "./components/TopBar";
import { ControlBar } from "./components/ControlBar";
import { CenterOSD } from "./components/CenterOSD";
import { SkipIndicator } from "./components/SkipIndicator";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { PlaylistDrawer } from "./components/PlaylistDrawer";
import { SleepTimerModal } from "./components/SleepTimerModal";
import { SiblingPromptToast } from "./components/SiblingPromptToast";
import { DragDropOverlay } from "./components/DragDropOverlay";
import { PiPOverlay } from "./components/PiPOverlay";
import { UpdateNotificationToast } from "./components/UpdateNotificationToast";

// Heavy overlays are code-split so the initial window paints immediately.
const SettingsModal = lazy(() =>
  import("./components/SettingsModal").then((m) => ({ default: m.SettingsModal })),
);
const MediaLibraryModal = lazy(() =>
  import("./components/MediaLibraryModal").then((m) => ({ default: m.MediaLibraryModal })),
);
import { UpdateCheckToast } from "./components/UpdateCheckToast";
import { ContextMenu } from "./components/ContextMenu";
import { TooltipLayer } from "./components/TooltipLayer";
import { StatsOverlay } from "./components/StatsOverlay";
import { OpenUrlModal } from "./components/OpenUrlModal";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { playerService } from "./services/player/mpvPlayerService";
import { localShortcutsService } from "./services/shortcuts/localShortcutsService";
import { toggleWindowFullscreen } from "./utils/windowControls";
import { libraryService } from "./services/library/libraryService";

export default function App() {
  const {
    isInitialized,
    status,
    mediaMetadata,
    isControlsVisible,
    isPlaylistOpen,
    isSettingsOpen,
    isSleepTimerOpen,
    toggleSleepTimer,
    initialize,
    openFile,
    addToPlaylist,
    togglePlayback,
    pause,
    seekRelative,
    changeVolume,
    toggleMute,
    changePlaybackRate,
    setPlaybackRate,
    loadSubtitle,
    selectSubtitleTrack,
    subtitleTracks,
    audioTracks,
    currentAudioTrackId,
    selectAudioTrack,
    currentSubtitleTrackId,
    togglePlaylistDrawer,
    toggleSettingsModal,
    isLibraryOpen,
    toggleLibraryModal,
    setControlsVisible,
    isPiP,
    togglePiP,
    cycleProfile,
    cycleRepeatMode,
    toggleNightListening,
    pauseOnSystemSleep,
    showOSD,
    scrollVolumeEnabled,
    toggleUrlModal,
    takeScreenshot,
    toggleStats,
  } = usePlayerStore(
    useShallow((s) => ({
      isInitialized: s.isInitialized,
      status: s.status,
      mediaMetadata: s.mediaMetadata,
      isControlsVisible: s.isControlsVisible,
      isPlaylistOpen: s.isPlaylistOpen,
      isSettingsOpen: s.isSettingsOpen,
      isSleepTimerOpen: s.isSleepTimerOpen,
      toggleSleepTimer: s.toggleSleepTimer,
      initialize: s.initialize,
      openFile: s.openFile,
      addToPlaylist: s.addToPlaylist,
      togglePlayback: s.togglePlayback,
      pause: s.pause,
      seekRelative: s.seekRelative,
      changeVolume: s.changeVolume,
      toggleMute: s.toggleMute,
      changePlaybackRate: s.changePlaybackRate,
      setPlaybackRate: s.setPlaybackRate,
      loadSubtitle: s.loadSubtitle,
      selectSubtitleTrack: s.selectSubtitleTrack,
      subtitleTracks: s.subtitleTracks,
      audioTracks: s.audioTracks,
      currentAudioTrackId: s.currentAudioTrackId,
      selectAudioTrack: s.selectAudioTrack,
      currentSubtitleTrackId: s.currentSubtitleTrackId,
      togglePlaylistDrawer: s.togglePlaylistDrawer,
      toggleSettingsModal: s.toggleSettingsModal,
      isLibraryOpen: s.isLibraryOpen,
      toggleLibraryModal: s.toggleLibraryModal,
      setControlsVisible: s.setControlsVisible,
      isPiP: s.isPiP,
      togglePiP: s.togglePiP,
      cycleProfile: s.cycleProfile,
      cycleRepeatMode: s.cycleRepeatMode,
      toggleNightListening: s.toggleNightListening,
      pauseOnSystemSleep: s.pauseOnSystemSleep,
      showOSD: s.showOSD,
      scrollVolumeEnabled: s.scrollVolumeEnabled,
      toggleUrlModal: s.toggleUrlModal,
      takeScreenshot: s.takeScreenshot,
      toggleStats: s.toggleStats,
    })),
  );

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mouseY, setMouseY] = useState(window.innerHeight / 2);
  const [isMouseActive, setIsMouseActive] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [activeDropZone, setActiveDropZone] = useState<"play" | "playlist">("play");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const hideControlsTimerRef = useRef<number | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const videoCanvasRef = useRef<HTMLDivElement | null>(null);
  const wheelAccumRef = useRef(0);

  const { initializeTheme, subMarginY } = useThemeStore();

  // Initialize theme, MPV, and check for launch media file
  useEffect(() => {
    initializeTheme();
    if (!isInitialized) {
      initialize()
        .then(async () => {
          try {
            const launchFile = await invoke<string | null>("get_launch_file");
            if (launchFile) {
              await openFile(launchFile);
            }
          } catch (e) {
            console.warn("Launch file check failed:", e);
          }
        })
        .catch((err) => {
          console.error("MPV Initialization failed:", err);
        });
    }
  }, [isInitialized, initialize, initializeTheme, openFile]);

  // Whenever a new file is loaded or subtitle track changes, re-sync subtitle settings so MPV applies user styling
  useEffect(() => {
    if (mediaMetadata?.filePath && isInitialized) {
      const theme = useThemeStore.getState();
      syncSubtitlesToMpv(theme);
    }
  }, [mediaMetadata?.filePath, currentSubtitleTrackId, isInitialized]);

  // Fade out the startup splash once the app is initialized (fallback timeout in case init stalls).
  useEffect(() => {
    const splash = document.getElementById("startup-splash");
    if (!splash) return;

    const hideSplash = () => {
      splash.classList.add("splash-hidden");
      window.setTimeout(() => splash.remove(), 360);
    };

    if (isInitialized) {
      hideSplash();
      return;
    }

    const fallback = window.setTimeout(hideSplash, 6000);
    return () => window.clearTimeout(fallback);
  }, [isInitialized]);

  // Warm up the code-split overlays once the app is idle so opening them feels instant.
  useEffect(() => {
    const preload = () => {
      import("./components/MediaLibraryModal");
      import("./components/SettingsModal");
    };
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(preload);
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(preload, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  // Listen for file open requests forwarded from subsequent single instances
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<string>("open-file-requested", async (event) => {
      if (event.payload) {
        await openFile(event.payload);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [openFile]);

  // Live library watcher: refresh any open library view when files are added,
  // changed, or removed in a watched folder (no manual rescan required).
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<{ saved: number; removed: number }>("library_changed", () => {
      libraryService.notifyLibraryChanged();
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Sync fullscreen state
  useEffect(() => {
    const checkFullscreen = async () => {
      try {
        const appWindow = getCurrentWindow();
        setIsFullscreen(await appWindow.isFullscreen());
      } catch (e) {
        console.warn("Fullscreen check error:", e);
      }
    };
    checkFullscreen();

    let unlistenResize: (() => void) | null = null;
    getCurrentWindow()
      .listen("tauri://resize", async () => {
        checkFullscreen();
      })
      .then((unlisten) => {
        unlistenResize = unlisten;
      });

    return () => {
      if (unlistenResize) unlistenResize();
    };
  }, []);

  // System Sleep / Wake Detector: auto-pauses when PC sleeps/resumes
  useEffect(() => {
    let lastTick = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (now - lastTick > 3500) {
        if (pauseOnSystemSleep && status === "playing") {
          pause();
          showOSD("Playback paused (System sleep detected)");
        }
      }
      lastTick = now;
    }, 1000);
    return () => window.clearInterval(interval);
  }, [pauseOnSystemSleep, status, pause, showOSD]);

  // Controls auto-hide timer logic
  const resetHideTimer = useCallback(() => {
    setIsMouseActive(true);
    setControlsVisible(true);

    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current);
    }

    if (status === "playing" && !isPlaylistOpen && !isSettingsOpen) {
      hideControlsTimerRef.current = window.setTimeout(() => {
        setIsMouseActive(false);
        setControlsVisible(false);
      }, 2500);
    }
  }, [status, isPlaylistOpen, isSettingsOpen, setControlsVisible]);

  // Track mouse coordinates for edge proximity
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
      resetHideTimer();
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideControlsTimerRef.current) {
        window.clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [resetHideTimer]);

  const handleDroppedPaths = useCallback(
    async (paths: string[], mode: "play" | "playlist") => {
      if (!paths || paths.length === 0) return;

      // Detect if dropped file is an external subtitle file (.srt, .vtt, .ass, .ssa, .sub, .lrc)
      const ext = paths[0].split(".").pop()?.toLowerCase() || "";
      const SUBTITLE_EXTS = new Set(["srt", "vtt", "ass", "ssa", "sub", "lrc"]);
      if (SUBTITLE_EXTS.has(ext) && (status === "playing" || status === "paused")) {
        await loadSubtitle(paths[0]);
        return;
      }

      if (mode === "play") {
        await openFile(paths[0]);
        if (paths.length > 1) {
          addToPlaylist(paths.slice(1));
        }
      } else {
        addToPlaylist(paths);
      }
    },
    [status, loadSubtitle, openFile, addToPlaylist],
  );

  // Tauri Native Drag-and-Drop listener
  useEffect(() => {
    let unlistenDragDrop: (() => void) | null = null;

    getCurrentWindow()
      .onDragDropEvent((event) => {
        if (event.payload.type === "over") {
          setIsDragging(true);
          const x = event.payload.position.x;
          const half = window.innerWidth / 2;
          setActiveDropZone(x < half ? "play" : "playlist");
        } else if (event.payload.type === "drop") {
          setIsDragging(false);
          const paths = event.payload.paths;
          const x = event.payload.position.x;
          const zone = x < window.innerWidth / 2 ? "play" : "playlist";
          handleDroppedPaths(paths, zone);
        } else {
          // 'leave' or 'cancelled'
          setIsDragging(false);
        }
      })
      .then((unlisten) => {
        unlistenDragDrop = unlisten;
      })
      .catch((err) => {
        console.warn("Tauri drag-drop setup error:", err);
      });

    return () => {
      if (unlistenDragDrop) unlistenDragDrop();
    };
  }, [handleDroppedPaths]);

  // Fullscreen toggle helper
  const handleToggleFullscreen = async () => {
    const newFs = await toggleWindowFullscreen();
    setIsFullscreen(newFs);
  };

  // Global Keyboard Shortcuts (rebindable via localShortcutsService)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      // Don't let Space/Enter double-fire on a focused button or control
      if (
        (e.key === " " || e.key === "enter") &&
        e.target instanceof HTMLElement &&
        (e.target.tagName === "BUTTON" || e.target.tagName === "A")
      ) {
        return;
      }

      resetHideTimer();

      // Escape stays hardcoded: closes overlays/menus, never rebindable
      if (e.key === "escape") {
        setContextMenu(null);
        if (isPiP) togglePiP();
        if (isSleepTimerOpen) toggleSleepTimer(false);
        if (isLibraryOpen) toggleLibraryModal(false);
        if (isPlaylistOpen) togglePlaylistDrawer();
        if (isSettingsOpen) toggleSettingsModal();
        if (usePlayerStore.getState().isUrlModalOpen) toggleUrlModal(false);
        return;
      }

      // New Player Window shortcut (Ctrl+N / Cmd+N)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        try {
          await invoke("open_new_window");
        } catch (err) {
          console.error("Open new window error:", err);
        }
        return;
      }

      const action = localShortcutsService.resolveAction(e);
      if (!action) return;

      switch (action) {
        case "toggle-playback":
          e.preventDefault();
          await togglePlayback();
          break;
        case "seek-backward":
          e.preventDefault();
          await seekRelative(e.shiftKey ? -30 : -10);
          break;
        case "seek-forward":
          e.preventDefault();
          await seekRelative(e.shiftKey ? 30 : 10);
          break;
        case "volume-up":
          e.preventDefault();
          await changeVolume(5);
          break;
        case "volume-down":
          e.preventDefault();
          await changeVolume(-5);
          break;
        case "mute":
          e.preventDefault();
          await toggleMute();
          break;
        case "toggle-fullscreen":
          e.preventDefault();
          await handleToggleFullscreen();
          break;
        case "speed-down":
          e.preventDefault();
          await changePlaybackRate(-0.25);
          break;
        case "speed-up":
          e.preventDefault();
          await changePlaybackRate(0.25);
          break;
        case "reset-speed":
          e.preventDefault();
          await setPlaybackRate(1.0);
          break;
        case "cycle-subtitle": {
          e.preventDefault();
          if (subtitleTracks.length > 0) {
            const trackIds = [0, ...subtitleTracks.map((t) => t.id)];
            const currentIdx = trackIds.indexOf(currentSubtitleTrackId || 0);
            const nextIdx = (currentIdx + 1) % trackIds.length;
            await selectSubtitleTrack(trackIds[nextIdx]);
          }
          break;
        }
        case "open-file": {
          e.preventDefault();
          try {
            const selected = await openDialog({
              multiple: false,
              directory: false,
              filters: [
                {
                  name: "Media Files",
                  extensions: [
                    "mp4",
                    "mkv",
                    "webm",
                    "avi",
                    "mov",
                    "mp3",
                    "flac",
                    "wav",
                    "m4a",
                    "ts",
                  ],
                },
                { name: "All Files", extensions: ["*"] },
              ],
            });
            if (selected && typeof selected === "string") {
              await openFile(selected);
            }
          } catch (err) {
            console.error("Open file error:", err);
          }
          break;
        }
        case "toggle-playlist":
          e.preventDefault();
          if (e.shiftKey) {
            togglePiP();
          } else {
            togglePlaylistDrawer();
          }
          break;
        case "picture-in-picture":
          e.preventDefault();
          togglePiP();
          break;
        case "toggle-library":
          e.preventDefault();
          toggleLibraryModal();
          break;
        case "cycle-profile":
          e.preventDefault();
          cycleProfile();
          break;
        case "cycle-audio": {
          e.preventDefault();
          if (audioTracks.length > 1) {
            const ids = audioTracks.map((t) => t.id);
            const currentIdx = ids.indexOf(currentAudioTrackId ?? ids[0]);
            const nextId = ids[(currentIdx + 1) % ids.length];
            await selectAudioTrack(nextId);
          } else if (audioTracks.length === 1) {
            await selectAudioTrack(audioTracks[0].id);
          } else {
            showOSD("No alternate audio tracks");
          }
          break;
        }
        case "cycle-repeat":
          e.preventDefault();
          await cycleRepeatMode();
          break;
        case "open-url":
          e.preventDefault();
          toggleUrlModal(true);
          break;
        case "screenshot":
          e.preventDefault();
          await takeScreenshot();
          break;
        case "toggle-stats":
          e.preventDefault();
          toggleStats();
          break;
        case "toggle-night-listening":
          e.preventDefault();
          toggleNightListening();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    resetHideTimer,
    togglePlayback,
    seekRelative,
    changeVolume,
    toggleMute,
    changePlaybackRate,
    setPlaybackRate,
    subtitleTracks,
    currentSubtitleTrackId,
    audioTracks,
    currentAudioTrackId,
    selectAudioTrack,
    selectSubtitleTrack,
    openFile,
    isPlaylistOpen,
    isSettingsOpen,
    isLibraryOpen,
    toggleLibraryModal,
    isSleepTimerOpen,
    toggleSleepTimer,
    togglePlaylistDrawer,
    toggleSettingsModal,
    isPiP,
    togglePiP,
    cycleProfile,
    cycleRepeatMode,
    toggleNightListening,
    toggleUrlModal,
    takeScreenshot,
    toggleStats,
    showOSD,
  ]);

  // Scroll wheel volume control over the video surface
  useEffect(() => {
    const el = videoCanvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!scrollVolumeEnabled) return;
      if (status !== "playing" && status !== "paused") return;

      // Normalize line-based delta modes (deltaMode 1 = lines, 2 = pages)
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY;
      wheelAccumRef.current += delta;

      const NOTCH_PX = 100;
      const VOLUME_PER_NOTCH = 3;
      if (Math.abs(wheelAccumRef.current) >= NOTCH_PX) {
        const notches = Math.trunc(wheelAccumRef.current / NOTCH_PX);
        wheelAccumRef.current -= notches * NOTCH_PX;
        changeVolume(notches * VOLUME_PER_NOTCH);
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [scrollVolumeEnabled, status, changeVolume]);

  // Custom right-click context menu (replaces the Chromium default menu)
  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    // Preserve native edit menus inside text inputs
    if (target && target.closest("input, textarea, [contenteditable='true']")) {
      return;
    }
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Click & Double-click on video canvas
  const handleVideoCanvasClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;

    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      handleToggleFullscreen();
    } else {
      clickTimerRef.current = window.setTimeout(() => {
        clickTimerRef.current = null;
        togglePlayback();
      }, 250);
    }
  };

  // HTML5 Drag and Drop fallbacks for WebView
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const x = e.clientX;
    setActiveDropZone(x < window.innerWidth / 2 ? "play" : "playlist");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const x = e.clientX;
    const zone = x < window.innerWidth / 2 ? "play" : "playlist";

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files: string[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        const path = (file as unknown as { path?: string }).path;
        if (path) files.push(path);
      }
      if (files.length > 0) {
        await handleDroppedPaths(files, zone);
      }
    }
  };

  const hasMedia = status !== "idle" && Boolean(mediaMetadata?.filePath);
  const isPlaying = status === "playing";

  // Proximity calculations:
  // - Top bar reveals if cursor approaches top edge (<= 70px)
  // - Bottom bar reveals if cursor approaches bottom edge (>= window.innerHeight - 95px)
  const isNearTop = mouseY <= 70;
  const isNearBottom = mouseY >= window.innerHeight - 95;

  // In fullscreen, strictly reveal based on edge proximity
  const showTopBar =
    !hasMedia ||
    !isPlaying ||
    isPlaylistOpen ||
    isSettingsOpen ||
    (isFullscreen ? isNearTop && isMouseActive : isControlsVisible || isNearTop);

  const showBottomBar =
    hasMedia &&
    (!isPlaying ||
      isPlaylistOpen ||
      isSettingsOpen ||
      (isFullscreen ? isNearBottom && isMouseActive : isControlsVisible || isNearBottom));

  // Auto-hide mouse cursor during active playback when not hovering controls
  const showCursor =
    isMouseActive ||
    showTopBar ||
    showBottomBar ||
    !isPlaying ||
    !hasMedia ||
    isPlaylistOpen ||
    isSettingsOpen;

  // Elevate subtitles above the bottom control bar so they are never obscured, respecting user's base margin
  useEffect(() => {
    const baseMargin = subMarginY ?? 65;
    if (showBottomBar) {
      playerService.setSubtitleMarginY(baseMargin + 24);
    } else {
      playerService.setSubtitleMarginY(baseMargin);
    }
  }, [showBottomBar, subMarginY]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
      className={`relative h-screen w-screen overflow-hidden flex flex-col font-sans select-none transition-cursor ${
        showCursor ? "cursor-default" : "cursor-none"
      }`}
      style={{ backgroundColor: "transparent" }}
    >
      {/* 
        Native MPV Video Canvas:
        100% transparent so the underlying HWND MPV renderer shows through with zero occlusion.
      */}
      <div
        ref={videoCanvasRef}
        onClick={handleVideoCanvasClick}
        className="absolute inset-0 z-0 bg-transparent"
      />

      {/* Welcome Screen when no video is loaded */}
      {!hasMedia && <WelcomeScreen />}

      {/* Floating Center / Top OSD Feedback */}
      <CenterOSD />

      {/* Playback Stats Overlay (F9) */}
      <StatsOverlay />

      {/* Side-Screen Skip Indicator */}
      <SkipIndicator />

      {/* Sibling Season Episodes Toast Alert */}
      <SiblingPromptToast />

      {/* Drag & Drop Visual Split Overlay ("Play Now" vs "Add to Playlist") */}
      <DragDropOverlay isDragging={isDragging} activeZone={activeDropZone} />

      {/* Picture-in-Picture Floating Mini Overlay */}
      {isPiP && <PiPOverlay />}

      {/* Top Header Bar with Proximity Edge Animation */}
      {!isPiP && (
        <div
          className={`transition-all duration-300 ease-out z-30 ${
            showTopBar
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <TopBar />
        </div>
      )}

      {/* Middle Spacer */}
      <div className="flex-1 pointer-events-none" />

      {/* Bottom Floating Control Bar with Proximity Edge Animation */}
      {hasMedia && !isPiP && (
        <div
          className={`transition-all duration-300 ease-out z-30 ${
            showBottomBar
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <ControlBar />
        </div>
      )}

      {/* Slide-in Playlist Drawer */}
      <PlaylistDrawer />

      {/* Settings / Shortcuts Modal (code-split) */}
      <Suspense fallback={null}>
        <SettingsModal />

        {/* Local Media Library Modal (code-split) */}
        <MediaLibraryModal />
      </Suspense>

      {/* Night Listening & Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={isSleepTimerOpen}
        onClose={() => toggleSleepTimer(false)}
      />

      {/* Discreet Update Alert Toast */}
      <UpdateNotificationToast />

      {/* Manual Update Check Result Toast */}
      <UpdateCheckToast />

      {/* Network Stream / URL Opener */}
      <OpenUrlModal />

      {/* Custom Right-Click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Consistent, app-wide hover tooltips (replaces the native title tooltip) */}
      <TooltipLayer />
    </div>
  );
}
