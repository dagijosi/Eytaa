import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function SkipIndicator() {
  const skipAnimation = usePlayerStore((s) => s.skipAnimation);
  const showSkipIndicators = usePlayerStore((s) => s.showSkipIndicators);
  const { accentColor, accentGlow } = useThemeStore();

  if (!showSkipIndicators || !skipAnimation) return null;

  const isForward = skipAnimation.direction === "forward";

  return (
    <div
      key={`${skipAnimation.direction}-${skipAnimation.timestamp}`}
      className={`fixed top-1/2 -translate-y-1/2 pointer-events-none z-40 transition-all ${
        isForward ? "right-8 sm:right-16 md:right-20" : "left-8 sm:left-16 md:left-20"
      }`}
    >
      <div
        style={{
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px ${accentGlow}`,
        }}
        className={`bg-neutral-950/85 backdrop-blur-2xl border border-white/20 px-5 py-3 rounded-2xl flex items-center gap-3 text-white shadow-2xl animate-in fade-in zoom-in-90 duration-150 ${
          isForward ? "slide-in-from-right-4" : "slide-in-from-left-4"
        }`}
      >
        {!isForward && (
          <div className="flex items-center -space-x-1" style={{ color: accentColor }}>
            <ChevronLeft className="w-5 h-5 animate-pulse" />
            <ChevronLeft className="w-5 h-5" />
          </div>
        )}

        <div className="flex flex-col items-center">
          <span className="text-base sm:text-lg font-bold font-mono tracking-tight leading-none text-neutral-100">
            {isForward ? `+${skipAnimation.accumulatedSeconds}s` : `-${skipAnimation.accumulatedSeconds}s`}
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 mt-0.5">
            {isForward ? "Forward" : "Rewind"}
          </span>
        </div>

        {isForward && (
          <div className="flex items-center -space-x-1" style={{ color: accentColor }}>
            <ChevronRight className="w-5 h-5" />
            <ChevronRight className="w-5 h-5 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
