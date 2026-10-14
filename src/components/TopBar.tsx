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
} from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { formatMediaTitle } from "../utils/mediaTitle";

import { EytaaLogo } from "./EytaaLogo";

export function TopBar() {
  const { accentColor } = useThemeStore();
  const {
    mediaMetadata,
    playlist,
    currentPlaylistIndex,
    openFile,
    openMultipleFiles,
    status,
    togglePlaylistDrawer,
    toggleSettingsModal,
  } = usePlayerStore();

  const [isMaximized, setIsMaximized] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isMenuOpen]);

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
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
      setIsMaximized(await appWindow.isMaximized());
    } catch (e) {
      console.warn("Toggle maximize error:", e);
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
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all text-xs font-semibold"
            title="Application Menu"
          >
            <EytaaLogo className="w-4 h-4" variant="color" />
            <span className="tracking-[0.14em] font-extrabold text-neutral-100 text-[11px] uppercase">
              EYTAA
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {/* Quick Menu Dropdown */}
          {isMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-neutral-900/98 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => handleOpenFile()}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 text-left transition"
              >
                <FolderOpen style={{ color: accentColor }} className="w-3.5 h-3.5" />
                <span>Open File... (O)</span>
              </button>
              <button
                onClick={handleOpenMultiple}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 text-left transition"
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
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 text-left transition"
              >
                <ListVideo className="w-3.5 h-3.5" />
                <span>Playlist (P)</span>
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  toggleSettingsModal();
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 text-left transition"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Settings & History</span>
              </button>
              <div className="h-px bg-white/10 my-0.5" />
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  getCurrentWindow().close().catch(() => {});
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 text-left transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Exit Player</span>
              </button>
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
      <div className="flex items-center gap-0.5 shrink-0 -mr-1">
        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleToggleMaximize}
          className="w-8 h-7 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>

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
