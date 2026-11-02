import { useState, useEffect } from "react";
import { Play, X, FastForward, Tv } from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";

export function NextEpisodeOverlay() {
  const { accentColor, accentGlow, accentText } = useThemeStore();
  const nextEpisodePrompt = usePlayerStore((s) => s.nextEpisodePrompt);
  const dismissNextEpisodePrompt = usePlayerStore((s) => s.dismissNextEpisodePrompt);
  const playNextEpisodePrompt = usePlayerStore((s) => s.playNextEpisodePrompt);

  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!nextEpisodePrompt) {
      setCountdown(10);
      return;
    }

    setCountdown(10);
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          playNextEpisodePrompt();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [nextEpisodePrompt, playNextEpisodePrompt]);

  if (!nextEpisodePrompt) return null;

  const progressPercent = ((10 - countdown) / 10) * 100;

  return (
    <aside
      aria-label="Next Episode Countdown"
      className="fixed bottom-20 right-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto max-w-sm"
    >
      <div className="bg-neutral-900/98 border border-white/15 rounded-2xl p-3.5 shadow-2xl backdrop-blur-2xl text-white flex flex-col gap-3">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: `${accentColor}25`, borderColor: `${accentColor}55` }}
              className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0"
            >
              <Tv className="w-3.5 h-3.5" style={{ color: accentColor }} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Up Next in <span className="font-mono text-white text-sm font-black">{countdown}s</span>
            </span>
          </div>

          <button
            onClick={dismissNextEpisodePrompt}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Cancel autoplay and stay on current video"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Episode Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <FastForward className="w-5 h-5 text-neutral-400" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs text-white font-semibold truncate leading-tight" title={nextEpisodePrompt.title}>
              {nextEpisodePrompt.title}
            </p>
            <p className="text-[10px] text-neutral-400 font-mono mt-1">
              Autoplay queue sequence
            </p>
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            style={{
              width: `${progressPercent}%`,
              backgroundColor: accentColor,
              boxShadow: `0 0 8px ${accentGlow}`,
            }}
            className="h-full rounded-full transition-all duration-1000 ease-linear"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-0.5 text-xs font-semibold">
          <button
            onClick={() => playNextEpisodePrompt()}
            style={{ backgroundColor: accentColor, color: accentText }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer shadow-md hover:opacity-95"
            title="Play next episode immediately"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Now</span>
          </button>

          <button
            onClick={dismissNextEpisodePrompt}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition cursor-pointer"
            title="Dismiss countdown"
          >
            <span>Stay / Cancel</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

