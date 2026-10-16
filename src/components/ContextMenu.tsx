import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FolderOpen,
  Library,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Settings,
  RefreshCw,
  Info,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { usePlayerStore } from "../stores/playerStore";
import { toggleWindowFullscreen } from "../utils/windowControls";
import { updaterService } from "../services/updater/updaterService";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

const MENU_WIDTH = 232;

export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const {
    openFile,
    openMultipleFiles,
    toggleLibraryModal,
    toggleSettingsModal,
    isAlwaysOnTop,
    toggleAlwaysOnTop,
    showOSD,
    checkForUpdatesManually,
  } = usePlayerStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    getCurrentWindow()
      .isFullscreen()
      .then(setIsFullscreen)
      .catch(() => {});
  }, []);

  // Clamp menu position inside the viewport once content height is known
  useEffect(() => {
    const el = document.getElementById("app-context-menu");
    const height = el?.offsetHeight ?? 300;
    setPos({
      x: Math.max(4, Math.min(x, window.innerWidth - MENU_WIDTH - 6)),
      y: Math.max(4, Math.min(y, window.innerHeight - height - 6)),
    });
  }, [x, y]);

  // Close on outside click, Escape handled by App, or window blur
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest("#app-context-menu")) onClose();
    };
    window.addEventListener("mousedown", onPointerDown, true);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("mousedown", onPointerDown, true);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  const handleOpenFiles = async () => {
    try {
      const selected = await openDialog({
        multiple: true,
        directory: false,
        filters: [
          {
            name: "Media Files",
            extensions: [
              "mp4", "mkv", "webm", "avi", "mov", "wmv", "flv", "ts", "m2ts",
              "mp3", "flac", "wav", "m4a", "aac", "ogg",
            ],
          },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      if (paths.length === 1) {
        await openFile(paths[0]);
      } else if (paths.length > 1) {
        await openMultipleFiles(paths);
      }
    } catch (err) {
      console.error("Open file error:", err);
    } finally {
      onClose();
    }
  };

  const handleFullscreen = async () => {
    await toggleWindowFullscreen();
    setIsFullscreen((prev) => !prev);
    onClose();
  };

  const handleAlwaysOnTop = async () => {
    await toggleAlwaysOnTop();
    onClose();
  };

  const handleSettings = () => {
    toggleSettingsModal(true);
    onClose();
  };

  const handleCheckUpdates = () => {
    onClose();
    checkForUpdatesManually();
  };

  const handleAbout = async () => {
    onClose();
    const version = await updaterService.getAppVersion();
    showOSD(`EYTAA — Every story, in view · v${version}`);
  };

  const itemClass =
    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left";

  return (
    <motion.div
      id="app-context-menu"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{ left: pos.x, top: pos.y, width: MENU_WIDTH }}
      className="fixed z-[100] bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 shadow-2xl shadow-black/60 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <button className={itemClass} onClick={handleOpenFiles}>
        <FolderOpen className="w-4 h-4 text-neutral-500 shrink-0" />
        <span>Open File(s)…</span>
      </button>

      <button
        className={itemClass}
        onClick={() => {
          toggleLibraryModal(true);
          onClose();
        }}
      >
        <Library className="w-4 h-4 text-neutral-500 shrink-0" />
        <span>Media Library</span>
      </button>

      <div className="my-1 border-t border-white/10" />

      <button className={itemClass} onClick={handleFullscreen}>
        {isFullscreen ? (
          <Minimize2 className="w-4 h-4 text-neutral-500 shrink-0" />
        ) : (
          <Maximize2 className="w-4 h-4 text-neutral-500 shrink-0" />
        )}
        <span>{isFullscreen ? "Exit Fullscreen" : "Toggle Fullscreen"}</span>
      </button>

      <button className={itemClass} onClick={handleAlwaysOnTop}>
        {isAlwaysOnTop ? (
          <PinOff className="w-4 h-4 text-amber-400 shrink-0" />
        ) : (
          <Pin className="w-4 h-4 text-neutral-500 shrink-0" />
        )}
        <span>{isAlwaysOnTop ? "Unpin Window" : "Always on Top"}</span>
      </button>

      <div className="my-1 border-t border-white/10" />

      <button className={itemClass} onClick={handleSettings}>
        <Settings className="w-4 h-4 text-neutral-500 shrink-0" />
        <span>Settings…</span>
      </button>

      <button className={itemClass} onClick={handleCheckUpdates}>
        <RefreshCw className="w-4 h-4 text-neutral-500 shrink-0" />
        <span>Check for Updates</span>
      </button>

      <button className={itemClass} onClick={handleAbout}>
        <Info className="w-4 h-4 text-neutral-500 shrink-0" />
        <span>About EYTAA</span>
      </button>
    </motion.div>
  );
}
