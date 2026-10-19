import { useState, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
  X,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
} from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { formatMediaTitle } from "../utils/mediaTitle";

function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function PiPOverlay() {
  const { accentColor, accentGlow, accentText } = useThemeStore();
  const {
    isPiP,
    togglePiP,
    status,
    mediaMetadata,
    currentTime,
    duration,
    togglePlayback,
    seek,
    seekRelative,
    volume,
    muted,
    toggleMute,
    playNext,
    playPrevious,
    playlist,
  } = usePlayerStore();

  const [isHovered, setIsHovered] = useState(false);
  const scrubberRef = useRef<HTMLDivElement>(null);

  if (!isPiP) return null;

  const isPlaying = status === "playing";
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const title =
    formatMediaTitle(mediaMetadata?.title, mediaMetadata?.filePath) ||
    "EYTAA Mini Player";

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await getCurrentWindow().close();
    } catch (err) {
      console.warn("Close window error:", err);
    }
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    seek(percent * duration);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="absolute inset-0 z-40 flex flex-col justify-between pointer-events-none select-none transition-all duration-200 overflow-hidden"
    >
      {/* Top Drag Region & Controls */}
      <div
        data-tauri-drag-region
        className={`w-full px-2 py-1.5 bg-gradient-to-b from-black/85 via-black/50 to-transparent flex items-center justify-between pointer-events-auto transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          data-tauri-drag-region
          className="flex items-center gap-1.5 max-w-[70%] min-w-0 truncate"
        >
          <div
            style={{ backgroundColor: accentColor }}
            className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
          />
          <span
            data-tauri-drag-region
            className="text-[11px] font-semibold text-white/90 truncate drop-shadow"
          >
            {title}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={togglePiP}
            title="Expand to Full Player"
            className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-sm"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            title="Close"
            className="p-1 rounded-md bg-white/10 hover:bg-red-500 text-white transition backdrop-blur-sm"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Center Playback Controls */}
      <div
        className={`flex items-center justify-center gap-2 sm:gap-3 transition-all duration-200 ${
          isHovered
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        {playlist.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              playPrevious();
            }}
            title="Previous Track"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/90 border border-white/15 backdrop-blur-md shadow transition"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            seekRelative(-10);
          }}
          title="Rewind 10s"
          className="w-7 h-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/90 border border-white/15 backdrop-blur-md shadow transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlayback();
          }}
          title={isPlaying ? "Pause" : "Play"}
          style={{
            backgroundColor: accentColor,
            color: accentText,
            boxShadow: `0 4px 18px ${accentGlow}`,
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full font-bold transition transform active:scale-95"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current translate-x-0.5" />
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            seekRelative(10);
          }}
          title="Fast Forward 10s"
          className="w-7 h-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/90 border border-white/15 backdrop-blur-md shadow transition"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {playlist.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              playNext();
            }}
            title="Next Track"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white/90 border border-white/15 backdrop-blur-md shadow transition"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom Progress Bar & Time */}
      <div
        className={`w-full px-2 py-1.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto transition-opacity duration-200 flex flex-col gap-1 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Scrubber */}
        <div
          ref={scrubberRef}
          onClick={handleScrubberClick}
          className="w-full h-1.5 rounded-full bg-white/20 hover:h-2 transition-all cursor-pointer relative flex items-center group"
        >
          <div
            className="h-full rounded-full relative"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: accentColor,
              boxShadow: `0 0 10px ${accentGlow}`,
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Time and Quick Toggles */}
        <div className="flex items-center justify-between text-[10px] text-white/85 font-mono px-0.5 leading-none">
          <span className="truncate">
            {formatSeconds(currentTime)}{" "}
            <span className="text-white/40">/</span> {formatSeconds(duration)}
          </span>

          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="p-1 text-white/80 hover:text-white transition"
              title={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? (
                <VolumeX className="w-3 h-3 text-red-400" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePiP();
              }}
              title="Expand to normal window"
              style={{
                backgroundColor: accentColor,
                color: accentText,
                boxShadow: `0 2px 10px ${accentGlow}`,
              }}
              className="p-1 px-1.5 rounded hover:brightness-110 font-sans font-bold text-[10px] flex items-center gap-1 transition"
            >
              <Maximize2 className="w-2.5 h-2.5" />
              <span>Restore</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
