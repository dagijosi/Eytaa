import { Play, ListPlus } from "lucide-react";
import { useThemeStore } from "../stores/themeStore";

interface DragDropOverlayProps {
  isDragging: boolean;
  activeZone: "play" | "playlist";
}

export function DragDropOverlay({ isDragging, activeZone }: DragDropOverlayProps) {
  const { accentColor, accentGlow, accentText } = useThemeStore();
  if (!isDragging) return null;

  return (
    <div
      aria-label="Drop Files"
      className="fixed inset-0 z-50 pointer-events-none flex p-6 gap-6 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200"
    >
      {/* Left Target: Play Now */}
      <div
        style={{
          borderColor: activeZone === "play" ? accentColor : undefined,
          backgroundColor: activeZone === "play" ? `${accentGlow}` : undefined,
          boxShadow: activeZone === "play" ? `0 0 50px ${accentGlow}` : undefined,
        }}
        className={`flex-1 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all duration-200 ${
          activeZone === "play"
            ? "scale-[1.01]"
            : "border-white/20 bg-white/5 opacity-60"
        }`}
      >
        <div
          style={{
            backgroundColor: activeZone === "play" ? accentColor : undefined,
            color: activeZone === "play" ? accentText : undefined,
            boxShadow: activeZone === "play" ? `0 8px 30px ${accentGlow}` : undefined,
          }}
          className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            activeZone === "play"
              ? "scale-110 font-bold"
              : "bg-white/10 text-white"
          }`}
        >
          <Play className="w-10 h-10 fill-current ml-1" />
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-black text-white tracking-wide">Play Now</h3>
          <p className="text-sm text-neutral-300 mt-1">
            Start playing dropped video immediately
          </p>
        </div>
        <div
          style={{
            backgroundColor: activeZone === "play" ? accentColor : undefined,
            color: activeZone === "play" ? accentText : undefined,
          }}
          className={`text-xs px-3 py-1 rounded-full font-mono transition-colors ${
            activeZone === "play"
              ? "font-bold"
              : "bg-white/10 text-neutral-400"
          }`}
        >
          DROP ON LEFT SIDE
        </div>
      </div>

      {/* Right Target: Add to Playlist */}
      <div
        className={`flex-1 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all duration-200 ${
          activeZone === "playlist"
            ? "border-cyan-400 bg-cyan-500/15 scale-[1.01] shadow-[0_0_50px_rgba(34,211,238,0.25)]"
            : "border-white/20 bg-white/5 opacity-60"
        }`}
      >
        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            activeZone === "playlist"
              ? "bg-cyan-500 text-neutral-950 shadow-xl shadow-cyan-500/40 scale-110"
              : "bg-white/10 text-white"
          }`}
        >
          <ListPlus className="w-10 h-10" />
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-black text-white tracking-wide">Add to Playlist</h3>
          <p className="text-sm text-neutral-300 mt-1">
            Queue to playlist without stopping current playback
          </p>
        </div>
        <div
          className={`text-xs px-3 py-1 rounded-full font-mono transition-colors ${
            activeZone === "playlist"
              ? "bg-cyan-400 text-neutral-950 font-bold"
              : "bg-white/10 text-neutral-400"
          }`}
        >
          DROP ON RIGHT SIDE
        </div>
      </div>
    </div>
  );
}
