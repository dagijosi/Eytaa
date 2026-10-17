import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";

interface TransportControlsProps {
  isPlaying: boolean;
  playlistLength: number;
  onTogglePlayback: () => void;
  onSeekRelative: (delta: number) => void;
  onPlayPrevious: () => void;
  onPlayNext: () => void;
}

export function TransportControls({
  isPlaying,
  playlistLength,
  onTogglePlayback,
  onSeekRelative,
  onPlayPrevious,
  onPlayNext,
}: TransportControlsProps) {
  const { accentColor, accentGlow, accentText } = useThemeStore();

  return (
    <>
      {/* Prev Track (if playlist exists) */}
      {playlistLength > 1 && (
        <button
          onClick={onPlayPrevious}
          className="hidden sm:flex p-1.5 sm:p-2 rounded-full hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white transition shrink-0"
          title="Previous Track"
        >
          <SkipBack className="w-4 h-4" />
        </button>
      )}

      {/* Step Back -10s */}
      <button
        onClick={() => onSeekRelative(-10)}
        className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white transition shrink-0"
        title="Seek -10s (Left Arrow)"
      >
        <RotateCcw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
      </button>

      {/* Main Play / Pause Button */}
      <button
        onClick={onTogglePlayback}
        style={{
          backgroundColor: accentColor,
          color: accentText,
          boxShadow: `0 4px 18px ${accentGlow}`,
        }}
        className="p-2 sm:p-3 rounded-full hover:brightness-110 active:scale-90 font-bold transition-all shrink-0"
        title="Play / Pause (Space)"
      >
        {isPlaying ? (
          <Pause className="w-4 sm:w-5 h-4 sm:h-5 fill-current" />
        ) : (
          <Play className="w-4 sm:w-5 h-4 sm:h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Step Forward +10s */}
      <button
        onClick={() => onSeekRelative(10)}
        className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white transition shrink-0"
        title="Seek +10s (Right Arrow)"
      >
        <RotateCw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
      </button>

      {/* Next Track (if playlist exists) */}
      {playlistLength > 1 && (
        <button
          onClick={onPlayNext}
          className="hidden sm:flex p-1.5 sm:p-2 rounded-full hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white transition shrink-0"
          title="Next Track"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      )}
    </>
  );
}
