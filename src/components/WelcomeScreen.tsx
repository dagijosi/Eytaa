import { useState, useEffect } from "react";
import { FolderOpen, History, Play, Sparkles, Shield, Cpu, X } from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { updaterService } from "../services/updater/updaterService";
import { EytaaLogo } from "./EytaaLogo";

export function WelcomeScreen() {
  const { openFile, recentFiles, deleteHistoryItem } = usePlayerStore();
  const { accentColor, accentGlow, accentText } = useThemeStore();
  const [appVersion, setAppVersion] = useState("0.1.1");

  useEffect(() => {
    updaterService.getAppVersion().then(setAppVersion);
  }, []);

  const handleOpenFile = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Video & Audio Files",
            extensions: ["mp4", "mkv", "webm", "avi", "mov", "mp3", "flac", "wav", "m4a", "ts", "m2ts"],
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

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-radial from-neutral-900/90 via-neutral-950 to-black select-none z-10 overflow-y-auto">
      {/* Glow highlight */}
      <div
        style={{ backgroundColor: accentGlow }}
        className="absolute top-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-50"
      />

      <div className="max-w-xl w-full flex flex-col items-center text-center z-10 space-y-6">
        {/* Brand Icon - Standalone free-floating emblem */}
        <div className="relative group cursor-default">
          <div className="absolute -inset-4 rounded-full blur-3xl opacity-35 bg-gradient-to-r from-amber-500/50 via-cyan-500/30 to-sky-500/50 group-hover:opacity-65 transition duration-500 pointer-events-none" />
          <div className="relative w-28 h-28 flex items-center justify-center group-hover:scale-105 transition duration-300">
            <EytaaLogo className="w-full h-full" variant="color" />
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-black tracking-[0.16em] text-white uppercase font-sans">
            EYTAA
          </h1>
          <div className="text-sm font-semibold tracking-wide text-amber-400 font-mono">
            Every story, in view.
          </div>
          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed pt-1">
            Inspired by <span className="text-neutral-200 font-medium">እይታ</span> — vision and viewing. Ultra-fast native playback powered by Tauri 2 and libmpv.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
          <button
            onClick={handleOpenFile}
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 10px 25px ${accentGlow}`,
            }}
            className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl hover:brightness-110 active:scale-95 font-bold text-sm transition-all duration-200 cursor-pointer w-full sm:w-auto"
          >
            <FolderOpen className="w-4 h-4 fill-current" />
            <span>Open Media File</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-black/20 rounded font-mono">
              O
            </kbd>
          </button>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-neutral-300">
            <Cpu style={{ color: accentColor }} className="w-3 h-3" />
            Hardware Decoding (D3D11 / NVDEC)
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-neutral-300">
            <Sparkles style={{ color: accentColor }} className="w-3 h-3" />
            libmpv Native Engine
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-neutral-300">
            <Shield style={{ color: accentColor }} className="w-3 h-3" />
            SQLite Local State
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-neutral-300 font-mono">
            <span style={{ color: accentColor }} className="font-bold">v{appVersion}</span>
          </span>
        </div>

        {/* Recently Played Section */}
        {recentFiles.length > 0 && (
          <div className="w-full pt-4 border-t border-white/10 text-left">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              <History style={{ color: accentColor }} className="w-3.5 h-3.5" />
              <span>Resume Recent Playback</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recentFiles.slice(0, 4).map((file) => (
                <div
                  key={file.id}
                  onClick={() => openFile(file.filePath)}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      style={{
                        backgroundColor: `${accentGlow}`,
                        color: accentColor,
                      }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </div>
                    <span className="text-xs font-medium text-neutral-200 truncate group-hover:text-white transition">
                      {file.title || file.filePath.split(/[/\\]/).pop()}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistoryItem(file.filePath);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-400 hover:text-rose-400 hover:bg-rose-500/15 transition-all shrink-0 ml-1.5"
                    title="Remove from history"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
