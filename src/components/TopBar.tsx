import { useState, useEffect, useRef } from "react";
import {
  FolderOpen,
  Minus,
  Square,
  Copy,
  X,
  ListVideo,
  Sliders,
  ChevronDown,
  Pin,
  LayoutGrid,
  Film,
} from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { formatMediaTitle } from "../utils/mediaTitle";
import { updaterService } from "../services/updater/updaterService";

import { EytaaLogo } from "./EytaaLogo";

type SnapZone =
  | "left-half"
  | "right-half"
  | "left-two-thirds"
  | "right-one-third"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"
  | "pip-corner"
  | "maximize";

export function TopBar() {
  const { accentColor, accentGlow } = useThemeStore();
  const {
    mediaMetadata,
    playlist,
    currentPlaylistIndex,
    openFile,
    openMultipleFiles,
    status,
    togglePlaylistDrawer,
    toggleSettingsModal,
    toggleLibraryModal,
    isAlwaysOnTop,
    toggleAlwaysOnTop,
    showOSD,
    availableUpdate,
  } = usePlayerStore();

  const [isMaximized, setIsMaximized] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSnapMenuOpen, setIsSnapMenuOpen] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState("0.1.4");

  const menuRef = useRef<HTMLDivElement>(null);
  const snapMenuRef = useRef<HTMLDivElement>(null);
  const snapHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    updaterService.getAppVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const appWindow = getCurrentWindow();
        setIsMaximized(await appWindow.isMaximized());
      } catch (e) {
        console.warn("Maximized check error:", e);
      }
    };

    checkMaximized();

    const appWindow = getCurrentWindow();
    const unlistenPromise = appWindow.onResized(async () => {
      try {
        setIsMaximized(await appWindow.isMaximized());
      } catch (e) {
        console.warn("Resize error:", e);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    };
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (snapMenuRef.current && !snapMenuRef.current.contains(e.target as Node)) {
        setIsSnapMenuOpen(false);
      }
    };
    if (isMenuOpen || isSnapMenuOpen) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isMenuOpen, isSnapMenuOpen]);

  const clearSnapTimers = () => {
    if (snapHoverTimer.current) {
      clearTimeout(snapHoverTimer.current);
      snapHoverTimer.current = null;
    }
    if (snapCloseTimer.current) {
      clearTimeout(snapCloseTimer.current);
      snapCloseTimer.current = null;
    }
  };

  const handleMouseEnterMaximize = () => {
    if (snapCloseTimer.current) {
      clearTimeout(snapCloseTimer.current);
      snapCloseTimer.current = null;
    }
    if (!isSnapMenuOpen) {
      snapHoverTimer.current = setTimeout(() => {
        setIsSnapMenuOpen(true);
      }, 250);
    }
  };

  const handleMouseLeaveMaximize = () => {
    if (snapHoverTimer.current) {
      clearTimeout(snapHoverTimer.current);
      snapHoverTimer.current = null;
    }
    snapCloseTimer.current = setTimeout(() => {
      setIsSnapMenuOpen(false);
    }, 300);
  };

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (e) {
      console.warn("Minimize error:", e);
    }
  };

  const handleToggleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    clearSnapTimers();
    setIsSnapMenuOpen(false);
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
      setIsMaximized(await appWindow.isMaximized());
    } catch (e) {
      console.warn("Toggle maximize error:", e);
    }
  };

  const handleSnap = async (zone: SnapZone) => {
    clearSnapTimers();
    setIsSnapMenuOpen(false);
    try {
      const appWindow = getCurrentWindow();
      if (zone === "maximize") {
        await appWindow.maximize();
        setIsMaximized(true);
        showOSD("Maximized Window");
        return;
      }

      const monitor = await currentMonitor();
      if (!monitor) {
        await appWindow.maximize();
        return;
      }

      const workArea = monitor.workArea || {
        position: monitor.position,
        size: monitor.size,
      };

      const mx = workArea.position.x;
      const my = workArea.position.y;
      const mw = workArea.size.width;
      const mh = workArea.size.height;

      let targetX = mx;
      let targetY = my;
      let targetW = mw;
      let targetH = mh;
      let osdLabel = "Window Snapped";

      const halfW = Math.floor(mw / 2);
      const halfH = Math.floor(mh / 2);

      switch (zone) {
        case "left-half":
          targetX = mx;
          targetY = my;
          targetW = halfW;
          targetH = mh;
          osdLabel = "Snapped: Left Half (50%)";
          break;
        case "right-half":
          targetX = mx + halfW;
          targetY = my;
          targetW = mw - halfW;
          targetH = mh;
          osdLabel = "Snapped: Right Half (50%)";
          break;
        case "left-two-thirds":
          targetX = mx;
          targetY = my;
          targetW = Math.floor(mw * 0.65);
          targetH = mh;
          osdLabel = "Snapped: Left Focus (65%)";
          break;
        case "right-one-third":
          targetX = mx + Math.floor(mw * 0.65);
          targetY = my;
          targetW = mw - Math.floor(mw * 0.65);
          targetH = mh;
          osdLabel = "Snapped: Right Side (35%)";
          break;
        case "top-left":
          targetX = mx;
          targetY = my;
          targetW = halfW;
          targetH = halfH;
          osdLabel = "Snapped: Top-Left Quadrant";
          break;
        case "top-right":
          targetX = mx + halfW;
          targetY = my;
          targetW = mw - halfW;
          targetH = halfH;
          osdLabel = "Snapped: Top-Right Quadrant";
          break;
        case "bottom-left":
          targetX = mx;
          targetY = my + halfH;
          targetW = halfW;
          targetH = mh - halfH;
          osdLabel = "Snapped: Bottom-Left Quadrant";
          break;
        case "bottom-right":
          targetX = mx + halfW;
          targetY = my + halfH;
          targetW = mw - halfW;
          targetH = mh - halfH;
          osdLabel = "Snapped: Bottom-Right Quadrant";
          break;
        case "center":
          targetW = Math.floor(mw * 0.72);
          targetH = Math.floor(mh * 0.75);
          targetX = mx + Math.floor((mw - targetW) / 2);
          targetY = my + Math.floor((mh - targetH) / 2);
          osdLabel = "Snapped: Centered Focus";
          break;
        case "pip-corner": {
          const scale = monitor.scaleFactor || 1;
          targetW = Math.round(440 * scale);
          targetH = Math.round(250 * scale);
          targetX = mx + mw - targetW - Math.round(20 * scale);
          targetY = my + mh - targetH - Math.round(20 * scale);
          await appWindow.setAlwaysOnTop(true);
          osdLabel = "Mini PiP Mode (Pinned On Top)";
          break;
        }
      }

      if (await appWindow.isMaximized()) {
        await appWindow.unmaximize();
        await new Promise((r) => setTimeout(r, 70));
      }

      await appWindow.setPosition(new PhysicalPosition(targetX, targetY));
      await appWindow.setSize(new PhysicalSize(targetW, targetH));
      setIsMaximized(false);
      showOSD(osdLabel);
    } catch (err) {
      console.error("Window snap error:", err);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (e) {
      console.warn("Close error:", e);
    }
  };

  const handleOpenFile = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMenuOpen(false);
    try {
      const selected = await openDialog({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Video & Audio Files",
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
              "m2ts",
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
  };

  const handleOpenMultiple = async () => {
    setIsMenuOpen(false);
    try {
      const selected = await openDialog({
        multiple: true,
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
            ],
          },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (selected && Array.isArray(selected)) {
        await openMultipleFiles(selected);
      }
    } catch (err) {
      console.error("Open multiple files error:", err);
    }
  };

  const hasActiveMedia =
    status !== "idle" && Boolean(mediaMetadata?.filePath || playlist.length > 0);

  const activePlaylistItem =
    currentPlaylistIndex >= 0 && currentPlaylistIndex < playlist.length
      ? playlist[currentPlaylistIndex]
      : playlist.find((item) => item.filePath === mediaMetadata?.filePath);

  const rawFilename = mediaMetadata?.filePath
    ? mediaMetadata.filePath.split(/[/\\]/).pop() || ""
    : "";

  const currentTitle =
    activePlaylistItem?.title ||
    formatMediaTitle(rawFilename, mediaMetadata?.filePath) ||
    formatMediaTitle(mediaMetadata?.title, mediaMetadata?.filePath) ||
    "";

  return (
    <header
      data-tauri-drag-region
      className="relative flex items-center justify-between px-3 py-1.5 bg-gradient-to-b from-black/95 via-black/70 to-transparent backdrop-blur-md select-none transition-all duration-300 z-40 h-10 border-b border-white/5"
    >
      {/* Left: App Menu and Movie Name */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 min-w-0 flex-1 h-full cursor-default"
      >
        {/* App Menu Button */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all text-xs font-semibold relative"
            title={availableUpdate ? `EYTAA (Update v${availableUpdate.version} Available)` : "Application Menu"}
          >
            <div className="relative">
              <EytaaLogo className="w-4 h-4" variant="color" />
              {availableUpdate && (
                <span
                  style={{ backgroundColor: accentColor }}
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse shadow-sm"
                />
              )}
            </div>
            <span className="tracking-[0.14em] font-extrabold text-neutral-100 text-[11px] uppercase">
              EYTAA
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {/* Quick Menu Dropdown */}
          {isMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-neutral-900/98 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => handleOpenFile()}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 text-left transition cursor-pointer"
              >
                <FolderOpen style={{ color: accentColor }} className="w-3.5 h-3.5" />
                <span>Open File... (O)</span>
              </button>
              <button
                onClick={handleOpenMultiple}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 text-left transition cursor-pointer"
              >
                <FolderOpen style={{ color: accentColor }} className="w-3.5 h-3.5" />
                <span>Open Multiple Files...</span>
              </button>
              <div className="h-px bg-white/10 my-0.5" />
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  togglePlaylistDrawer();
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 text-left transition cursor-pointer"
              >
                <ListVideo className="w-3.5 h-3.5" />
                <span>Playlist (P)</span>
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  toggleLibraryModal();
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 text-left transition cursor-pointer"
              >
                <Film style={{ color: accentColor }} className="w-3.5 h-3.5" />
                <span>Media Library (B)</span>
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  toggleSettingsModal(true, availableUpdate ? "updates" : undefined);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Settings & History</span>
                </div>
                {availableUpdate && (
                  <span
                    style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
                  >
                    v{availableUpdate.version}
                  </span>
                )}
              </button>
              <div className="h-px bg-white/10 my-0.5" />
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  getCurrentWindow().close().catch(() => {});
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 text-left transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Exit Player</span>
              </button>

              <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-neutral-500 font-mono border-t border-white/5 mt-0.5 select-none">
                <span>EYTAA Player</span>
                <span style={{ color: accentColor }} className="font-bold">
                  v{appVersion}
                  {availableUpdate ? ` • v${availableUpdate.version} ready` : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Clean Media Title */}
        {hasActiveMedia && currentTitle && (
          <div
            data-tauri-drag-region
            className="flex items-center gap-2 min-w-0 overflow-hidden ml-1"
          >
            <span className="text-xs text-neutral-600 pointer-events-none">•</span>
            <span
              data-tauri-drag-region
              className="text-xs font-normal text-neutral-300 truncate max-w-[280px] sm:max-w-md md:max-w-lg lg:max-w-xl"
              title={mediaMetadata?.filePath || currentTitle}
            >
              {currentTitle}
            </span>
          </div>
        )}
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center gap-1 shrink-0 -mr-1">
        {/* Quick Media Library Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLibraryModal();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white text-xs font-medium transition cursor-pointer mr-0.5"
          title="Local Media Library (B)"
        >
          <Film className="w-3.5 h-3.5" style={{ color: accentColor }} />
          <span className="hidden md:inline text-[11px] font-bold">Library</span>
        </button>

        {/* Quick Always On Top Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleAlwaysOnTop();
          }}
          style={
            isAlwaysOnTop
              ? {
                  backgroundColor: accentGlow,
                  color: accentColor,
                }
              : undefined
          }
          className={`w-8 h-7 flex items-center justify-center rounded transition-all duration-200 ${
            isAlwaysOnTop
              ? "font-semibold shadow-sm"
              : "text-neutral-400 hover:text-white hover:bg-white/10"
          }`}
          title={
            isAlwaysOnTop
              ? "Always on Top: Active (Click to unpin)"
              : "Always on Top: Inactive (Click to pin)"
          }
        >
          <Pin
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isAlwaysOnTop ? "rotate-45 fill-current" : ""
            }`}
          />
        </button>

        <div className="w-px h-3.5 bg-white/10 mx-0.5" />

        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximize & Snap Layouts Area */}
        <div
          className="relative"
          onMouseEnter={handleMouseEnterMaximize}
          onMouseLeave={handleMouseLeaveMaximize}
        >
          <button
            onClick={handleToggleMaximize}
            onContextMenu={(e) => {
              e.preventDefault();
              setIsSnapMenuOpen(!isSnapMenuOpen);
            }}
            className="w-8 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title={
              isMaximized
                ? "Restore (Hover for Snap Layouts)"
                : "Maximize (Hover for Snap Layouts)"
            }
          >
            {isMaximized ? (
              <Copy className="w-3 h-3 rotate-180" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>

          {/* Snap Layouts Flyout Menu */}
          {isSnapMenuOpen && (
            <div
              ref={snapMenuRef}
              onMouseEnter={() => {
                if (snapCloseTimer.current) {
                  clearTimeout(snapCloseTimer.current);
                  snapCloseTimer.current = null;
                }
              }}
              onMouseLeave={handleMouseLeaveMaximize}
              className="absolute top-full right-0 mt-1 w-72 bg-neutral-900/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 select-none"
            >
              {/* Flyout Header */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                <div className="flex items-center gap-1.5 text-neutral-200 font-semibold text-xs">
                  <LayoutGrid style={{ color: accentColor }} className="w-3.5 h-3.5" />
                  <span>Snap Layouts</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono capitalize">
                  {hoveredZone ? hoveredZone.replace(/-/g, " ") : "Hover a zone"}
                </span>
              </div>

              {/* Grid of Snap Templates */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Side-by-Side 50/50 (Essential for 2 videos!) */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-neutral-400 font-medium text-center">
                    Split 50 / 50
                  </span>
                  <div className="h-14 p-1 rounded-lg bg-white/5 border border-white/10 flex gap-1">
                    <button
                      onClick={() => handleSnap("left-half")}
                      onMouseEnter={() => setHoveredZone("left-half")}
                      onMouseLeave={() => setHoveredZone(null)}
                      title="Snap to Left Half (50%)"
                      style={{
                        backgroundColor:
                          hoveredZone === "left-half" ? accentGlow : "rgba(255,255,255,0.06)",
                        borderColor:
                          hoveredZone === "left-half" ? accentColor : "rgba(255,255,255,0.15)",
                      }}
                      className="flex-1 h-full rounded border transition-all duration-150 flex items-center justify-center group"
                    >
                      <span className="text-[9px] font-bold text-neutral-400 group-hover:text-white">L</span>
                    </button>
                    <button
                      onClick={() => handleSnap("right-half")}
                      onMouseEnter={() => setHoveredZone("right-half")}
                      onMouseLeave={() => setHoveredZone(null)}
                      title="Snap to Right Half (50%)"
                      style={{
                        backgroundColor:
                          hoveredZone === "right-half" ? accentGlow : "rgba(255,255,255,0.06)",
                        borderColor:
                          hoveredZone === "right-half" ? accentColor : "rgba(255,255,255,0.15)",
                      }}
                      className="flex-1 h-full rounded border transition-all duration-150 flex items-center justify-center group"
                    >
                      <span className="text-[9px] font-bold text-neutral-400 group-hover:text-white">R</span>
                    </button>
                  </div>
                </div>

                {/* 2. Priority Split (65 / 35) */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-neutral-400 font-medium text-center">
                    Focus 65 / 35
                  </span>
                  <div className="h-14 p-1 rounded-lg bg-white/5 border border-white/10 flex gap-1">
                    <button
                      onClick={() => handleSnap("left-two-thirds")}
                      onMouseEnter={() => setHoveredZone("left-two-thirds")}
                      onMouseLeave={() => setHoveredZone(null)}
                      title="Snap Left Focus (65%)"
                      style={{
                        backgroundColor:
                          hoveredZone === "left-two-thirds" ? accentGlow : "rgba(255,255,255,0.06)",
                        borderColor:
                          hoveredZone === "left-two-thirds" ? accentColor : "rgba(255,255,255,0.15)",
                      }}
                      className="w-[65%] h-full rounded border transition-all duration-150 flex items-center justify-center group"
                    >
                      <span className="text-[9px] font-bold text-neutral-400 group-hover:text-white">65%</span>
                    </button>
                    <button
                      onClick={() => handleSnap("right-one-third")}
                      onMouseEnter={() => setHoveredZone("right-one-third")}
                      onMouseLeave={() => setHoveredZone(null)}
                      title="Snap Right Side (35%)"
                      style={{
                        backgroundColor:
                          hoveredZone === "right-one-third" ? accentGlow : "rgba(255,255,255,0.06)",
                        borderColor:
                          hoveredZone === "right-one-third" ? accentColor : "rgba(255,255,255,0.15)",
                      }}
                      className="w-[35%] h-full rounded border transition-all duration-150 flex items-center justify-center group"
                    >
                      <span className="text-[9px] font-bold text-neutral-400 group-hover:text-white">35%</span>
                    </button>
                  </div>
                </div>

                {/* 3. Four Quadrants (2x2) */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-neutral-400 font-medium text-center">
                    Four Corners
                  </span>
                  <div className="h-14 p-1 rounded-lg bg-white/5 border border-white/10 grid grid-cols-2 grid-rows-2 gap-1">
                    <button
                      onClick={() => handleSnap("top-left")}
                      onMouseEnter={() => setHoveredZone("top-left")}
                      onMouseLeave={() => setHoveredZone(null)}
                      title="Top-Left Corner"
                      style={{
                        backgroundColor:
                          hoveredZone === "top-left" ? accentGlow : "rgba(255,255,255,0.06)",
                        borderColor:
                          hoveredZone === "top-left" ? accentColor : "rgba(255,255,255,0.15)",
                      }}
                      className="rounded border transition-all duration-150"
                    />
                    <button
                      onClick={() => handleSnap("top-right")}
                      onMouseEnter={() => setHoveredZone("top-right")}
                      onMouseLeave={() => setHoveredZone(null)}
                      title="Top-Right Corner"
                      style={{
                        backgroundColor:
                          hoveredZone === "top-right" ? accentGlow : "rgba(255,255,255,0.06)",
                        borderColor:
                          hoveredZone === "top-right" ? accentColor : "rgba(255,255,255,0.15)",
                      }}
                      className="rounded border transition-all duration-150"
                    />
                    <button
                      onClick={() => handleSnap("bottom-left")}
                      onMouseEnter={() => setHoveredZone("bottom-left")}
                      onMouseLeave={() => setHoveredZone(null)}
                      title="Bottom-Left Corner"
                      style={{
                        backgroundColor:
                          hoveredZone === "bottom-left" ? accentGlow : "rgba(255,255,255,0.06)",
                        borderColor:
                          hoveredZone === "bottom-left" ? accentColor : "rgba(255,255,255,0.15)",
                      }}
                      className="rounded border transition-all duration-150"
                    />
                    <button
                      onClick={() => handleSnap("bottom-right")}
                      onMouseEnter={() => setHoveredZone("bottom-right")}
                      onMouseLeave={() => setHoveredZone(null)}
                      title="Bottom-Right Corner"
                      style={{
                        backgroundColor:
                          hoveredZone === "bottom-right" ? accentGlow : "rgba(255,255,255,0.06)",
                        borderColor:
                          hoveredZone === "bottom-right" ? accentColor : "rgba(255,255,255,0.15)",
                      }}
                      className="rounded border transition-all duration-150"
                    />
                  </div>
                </div>

                {/* 4. Center & PiP Mode */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-neutral-400 font-medium text-center">
                    Center / Mini PiP
                  </span>
                  <div className="h-14 p-1 rounded-lg bg-white/5 border border-white/10 flex gap-1">
                    <button
                      onClick={() => handleSnap("center")}
                      onMouseEnter={() => setHoveredZone("center")}
                      onMouseLeave={() => setHoveredZone(null)}
                      title="Center Focus (72%)"
                      style={{
                        backgroundColor:
                          hoveredZone === "center" ? accentGlow : "rgba(255,255,255,0.06)",
                        borderColor:
                          hoveredZone === "center" ? accentColor : "rgba(255,255,255,0.15)",
                      }}
                      className="flex-1 h-full rounded border transition-all duration-150 flex items-center justify-center group"
                    >
                      <span className="text-[9px] font-bold text-neutral-400 group-hover:text-white">Center</span>
                    </button>
                    <button
                      onClick={() => handleSnap("pip-corner")}
                      onMouseEnter={() => setHoveredZone("pip-corner")}
                      onMouseLeave={() => setHoveredZone(null)}
                      title="Mini PiP Corner (Pins Always On Top)"
                      style={{
                        backgroundColor:
                          hoveredZone === "pip-corner" ? accentGlow : "rgba(255,255,255,0.06)",
                        borderColor:
                          hoveredZone === "pip-corner" ? accentColor : "rgba(255,255,255,0.15)",
                      }}
                      className="flex-1 h-full rounded border transition-all duration-150 flex items-center justify-center group"
                    >
                      <span className="text-[9px] font-bold text-neutral-400 group-hover:text-white">PiP</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <button
                  onClick={() => handleSnap("maximize")}
                  className="px-2 py-1 rounded-md text-neutral-300 hover:text-white hover:bg-white/10 transition"
                >
                  Full Maximize
                </button>
                <span className="text-[10px] text-neutral-500 font-sans">
                  Win + ← / → to snap
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-rose-600 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
