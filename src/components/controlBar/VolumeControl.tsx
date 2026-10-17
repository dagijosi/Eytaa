import { Volume2, Volume1, VolumeX } from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";

interface VolumeControlProps {
  volume: number;
  muted: boolean;
  onToggleMute: () => void;
  onSetVolume: (volume: number) => void;
}

export function VolumeControl({
  volume,
  muted,
  onToggleMute,
  onSetVolume,
}: VolumeControlProps) {
  const { accentColor } = useThemeStore();

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 ml-0.5 sm:ml-1 group shrink-0">
      <button
        onClick={onToggleMute}
        className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white transition"
        title="Mute / Unmute (M)"
      >
        {muted || volume === 0 ? (
          <VolumeX className="w-4 h-4 text-rose-400" />
        ) : volume < 50 ? (
          <Volume1 className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>

      <div className="w-12 sm:w-16 md:w-20 hidden min-[520px]:flex items-center">
        <input
          type="range"
          min={0}
          max={100}
          value={muted ? 0 : volume}
          onChange={(e) => onSetVolume(Number(e.target.value))}
          style={{ accentColor: accentColor }}
          className="w-full h-1 bg-white/20 rounded-lg cursor-pointer hover:h-1.5 transition-all"
          title={`Volume: ${muted ? 0 : volume}%`}
        />
      </div>

      <span className="text-[10px] font-mono text-neutral-400 w-7 hidden md:inline">
        {muted ? "0%" : `${volume}%`}
      </span>
    </div>
  );
}
