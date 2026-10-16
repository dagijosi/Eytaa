import { useEffect, useRef, useState, useCallback } from "react";
import { usePlayerStore } from "./stores/playerStore";
import { useThemeStore } from "./stores/themeStore";
import { TopBar } from "./components/TopBar";
import { ControlBar } from "./components/ControlBar";
import { CenterOSD } from "./components/CenterOSD";
import { SkipIndicator } from "./components/SkipIndicator";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { PlaylistDrawer } from "./components/PlaylistDrawer";
import { SettingsModal } from "./components/SettingsModal";
import { SleepTimerModal } from "./components/SleepTimerModal";
import { SiblingPromptToast } from "./components/SiblingPromptToast";
import { DragDropOverlay } from "./components/DragDropOverlay";
import { PiPOverlay } from "./components/PiPOverlay";
import { MediaLibraryModal } from "./components/MediaLibraryModal";
import { UpdateNotificationToast } from "./components/UpdateNotificationToast";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { playerService } from "./services/player/mpvPlayerService";
import { toggleWindowFullscreen } from "./utils/windowControls";

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
    currentSubtitleTrackId,
    togglePlaylistDrawer,
    toggleSettingsModal,
    isLibraryOpen,
    toggleLibraryModal,
    setControlsVisible,
    isPiP,
    togglePiP,
    cycleProfile,
    toggleNightListening,
    pauseOnSystemSleep,
    showOSD,
  } = usePlayerStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mouseY, setMouseY] = useState(window.innerHeight / 2);
  const [isMouseActive, setIsMouseActive] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [activeDropZone, setActiveDropZone] = useState<"play" | "playlist">("play");

  const hideControlsTimerRef = useRef<number | null>(null);
  const clickTimerRef = useRef<number | null>(null);

  const { initializeTheme } = useThemeStore();

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

  // Show window once DOM is fully mounted to eliminate white / transparent lag on startup
  useEffect(() => {
    const showTimer = setTimeout(async () => {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.show();
      } catch (e) {
        console.warn("Error showing window:", e);
      }
    }, 60);
    return () => clearTimeout(showTimer);
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
  }, []);

  const handleDroppedPaths = async (paths: string[], mode: "play" | "playlist") => {
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
  };

  // Fullscreen toggle helper
  const handleToggleFullscreen = async () => {
    const newFs = await toggleWindowFullscreen();
    setIsFullscreen(newFs);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      resetHideTimer();

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          await togglePlayback();
          break;
        case "arrowleft":
          e.preventDefault();
          await seekRelative(e.shiftKey ? -30 : -10);
          break;
        case "arrowright":
          e.preventDefault();
          await seekRelative(e.shiftKey ? 30 : 10);
          break;
        case "arrowup":
          e.preventDefault();
          await changeVolume(5);
          break;
        case "arrowdown":
          e.preventDefault();
          await changeVolume(-5);
          break;
        case "m":
          e.preventDefault();
          await toggleMute();
          break;
        case "f":
          e.preventDefault();
          await handleToggleFullscreen();
          break;
        case "[":
          e.preventDefault();
          await changePlaybackRate(-0.25);
          break;
        case "]":
          e.preventDefault();
          await changePlaybackRate(0.25);
          break;
        case "backspace":
          e.preventDefault();
          await setPlaybackRate(1.0);
          break;
        case "s": {
          e.preventDefault();
          if (subtitleTracks.length > 0) {
            const trackIds = [0, ...subtitleTracks.map((t) => t.id)];
            const currentIdx = trackIds.indexOf(currentSubtitleTrackId || 0);
            const nextIdx = (currentIdx + 1) % trackIds.length;
            await selectSubtitleTrack(trackIds[nextIdx]);
          }
          break;
        }
        case "o": {
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
        case "p":
          e.preventDefault();
          if (e.shiftKey) {
            togglePiP();
          } else {
            togglePlaylistDrawer();
          }
          break;
        case "i":
          e.preventDefault();
          togglePiP();
          break;
        case "b":
          e.preventDefault();
          toggleLibraryModal();
          break;
        case "f7":
          e.preventDefault();
          cycleProfile();
          break;
        case "f8":
          e.preventDefault();
          toggleNightListening();
          break;
        case "escape":
          if (isPiP) togglePiP();
          if (isSleepTimerOpen) toggleSleepTimer(false);
          if (isLibraryOpen) toggleLibraryModal(false);
          if (isPlaylistOpen) togglePlaylistDrawer();
          if (isSettingsOpen) toggleSettingsModal();
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
    toggleNightListening,
  ]);

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

  // Elevate subtitles above the bottom control bar so they are never obscured
  useEffect(() => {
    if (showBottomBar) {
      playerService.setSubtitleMarginY(80);
      playerService.setSubtitlePosition(86);
    } else {
      playerService.setSubtitleMarginY(40);
      playerService.setSubtitlePosition(92);
    }
  }, [showBottomBar]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
        onClick={handleVideoCanvasClick}
        className="absolute inset-0 z-0 bg-transparent"
      />

      {/* Welcome Screen when no video is loaded */}
      {!hasMedia && <WelcomeScreen />}

      {/* Floating Center / Top OSD Feedback */}
      <CenterOSD />

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

      {/* Settings / Shortcuts Modal */}
      <SettingsModal />

      {/* Local Media Library Modal */}
      <MediaLibraryModal />

      {/* Night Listening & Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={isSleepTimerOpen}
        onClose={() => toggleSleepTimer(false)}
      />

      {/* Discreet Update Alert Toast */}
      <UpdateNotificationToast />
    </div>
  );
}
