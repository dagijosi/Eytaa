import { FolderOpen, Film, Play } from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { EytaaLogo } from "./EytaaLogo";

export function WelcomeScreen() {
  const { openFile, recentFiles, toggleLibraryModal } = usePlayerStore();
  const { accentColor, accentGlow, accentText } = useThemeStore();

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

  const latestRecent = recentFiles.length > 0 ? recentFiles[0] : null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-radial from-neutral-900/80 via-neutral-950 to-black select-none z-10 overflow-hidden">
      {/* Ambient background glow */}
      <div
        style={{ backgroundColor: accentGlow }}
        className="absolute w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-40 -translate-y-12"
      />

      <div className="relative max-w-sm w-full flex flex-col items-center text-center z-10 space-y-5">
        {/* Emblem */}
        <div className="relative group cursor-default">
          <div className="absolute -inset-3 rounded-full blur-2xl opacity-30 bg-gradient-to-r from-amber-500/40 via-cyan-500/25 to-sky-500/40 pointer-events-none" />
          <div className="relative w-20 h-20 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <EytaaLogo className="w-full h-full" variant="color" />
          </div>
        </div>

        {/* Branding */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-[0.2em] text-white uppercase font-sans">
            EYTAA
          </h1>
          <p className="text-xs font-medium tracking-wide text-neutral-400 font-mono">
            Every story, in view.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 w-full justify-center pt-1">
          <button
            onClick={handleOpenFile}
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 6px 20px ${accentGlow}`,
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-95 font-bold text-xs transition cursor-pointer shrink-0"
          >
            <FolderOpen className="w-4 h-4 fill-current" />
            <span>Open File</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[9px] bg-black/20 rounded font-mono">
              O
            </kbd>
          </button>

          <button
            onClick={() => toggleLibraryModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer border border-white/10 hover:border-white/20 active:scale-95 shrink-0"
          >
            <Film className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span>Library</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[9px] bg-black/20 rounded font-mono">
              B
            </kbd>
          </button>
        </div>

        {/* Quick Resume Pill (Only if there is a recent file) */}
        {latestRecent && (
          <button
            onClick={() => openFile(latestRecent.filePath)}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition cursor-pointer max-w-full text-left"
            title={latestRecent.filePath}
          >
            <div
              style={{ backgroundColor: accentColor, color: accentText }}
              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
            >
              <Play className="w-2 h-2 fill-current translate-x-0.2" />
            </div>
            <span className="text-[11px] text-neutral-300 group-hover:text-white truncate max-w-[200px]">
              Resume: {latestRecent.title || latestRecent.filePath.split(/[/\\]/).pop()}
            </span>
          </button>
        )}

        {/* Drag-and-drop prompt hint */}
        <p className="text-[11px] text-neutral-500 font-mono pt-1">
          Drop any file anywhere to play
        </p>
      </div>
    </div>
  );
}
