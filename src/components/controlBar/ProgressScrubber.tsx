import { useState, useRef, useEffect, useCallback } from "react";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { formatSeconds } from "./shared";

interface ProgressScrubberProps {
  currentTime: number;
  duration: number;
  seek: (seconds: number) => void;
}

export function ProgressScrubber({ currentTime, duration, seek }: ProgressScrubberProps) {
  const {
    accentColor,
    accentGlow,
    scrubberGlow,
    scrubberHeight,
    showChapterMarkers,
    scrubberGlowIntensity,
  } = useThemeStore();
  const chapters = usePlayerStore((s) => s.chapters);

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const scrubberRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const seekRafRef = useRef<number | null>(null);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Coalesce rapid scrub seeks into a single IPC call per animation frame so
  // dragging the scrubber doesn't flood the mpv command queue.
  const flushPendingSeek = useCallback(() => {
    if (pendingSeekRef.current !== null) {
      seek(pendingSeekRef.current);
      pendingSeekRef.current = null;
    }
  }, [seek]);

  const scheduleSeek = (seconds: number) => {
    pendingSeekRef.current = seconds;
    if (seekRafRef.current === null) {
      seekRafRef.current = window.requestAnimationFrame(() => {
        seekRafRef.current = null;
        flushPendingSeek();
      });
    }
  };

  useEffect(() => {
    return () => {
      if (seekRafRef.current !== null) {
        window.cancelAnimationFrame(seekRafRef.current);
      }
    };
  }, []);

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    setHoverPosition(x);
    setHoverTime(ratio * duration);

    if (isScrubbing) {
      scheduleSeek(ratio * duration);
    }
  };

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    setIsScrubbing(true);
    const rect = scrubberRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    seek(ratio * duration);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      if (isScrubbing) {
        setIsScrubbing(false);
        flushPendingSeek();
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isScrubbing, flushPendingSeek]);

  const trackHeightClass =
    scrubberHeight === "slim"
      ? "h-1 group-hover:h-2"
      : scrubberHeight === "bold"
      ? "h-2.5 group-hover:h-3.5"
      : scrubberHeight === "chunky"
      ? "h-3.5 group-hover:h-4.5"
      : "h-1.5 group-hover:h-2.5";

  const hoverPercent =
    duration > 0 && hoverTime !== null
      ? Math.min(100, Math.max(0, (hoverTime / duration) * 100))
      : 0;

  const deltaSeconds =
    hoverTime !== null ? Math.round(hoverTime - currentTime) : 0;

  const containerWidth = scrubberRef.current?.clientWidth || 300;
  const cardWidth = 176;
  const halfCard = cardWidth / 2;
  const cardLeft = Math.max(halfCard, Math.min(hoverPosition, containerWidth - halfCard));
  const pointerOffset = Math.max(-halfCard + 16, Math.min(halfCard - 16, hoverPosition - cardLeft));

  return (
    <div
      ref={scrubberRef}
      onMouseMove={handleScrubberMouseMove}
      onMouseLeave={() => setHoverTime(null)}
      onMouseDown={handleScrubberMouseDown}
      className="group relative h-5 flex items-center cursor-pointer select-none py-1"
    >
      {/* Hover Time Preview Card */}
      {hoverTime !== null && (
        <div
          style={{
            left: `${cardLeft}px`,
          }}
          className="absolute -top-[102px] -translate-x-1/2 pointer-events-none flex flex-col items-center z-50 animate-in fade-in zoom-in-95 duration-100 drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)]"
        >
          {/* Premium Preview Glass Box */}
          <div className="bg-neutral-950/95 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl px-4 py-2.5 flex flex-col items-center gap-1.5 w-44 text-center">
            {/* Header: Progress % and Jump Delta */}
            <div className="flex items-center justify-between w-full text-[11px] font-mono leading-none">
              <span
                style={{ color: accentColor }}
                className="font-bold tracking-tight"
              >
                {duration > 0 ? `${hoverPercent.toFixed(1)}%` : "0%"}
              </span>

              {Math.abs(deltaSeconds) >= 1 ? (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    deltaSeconds > 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {deltaSeconds > 0
                    ? `+${formatSeconds(deltaSeconds)}`
                    : `-${formatSeconds(Math.abs(deltaSeconds))}`}
                </span>
              ) : (
                <span className="text-[10px] text-neutral-400 bg-white/10 px-1.5 py-0.5 rounded-full">
                  Current
                </span>
              )}
            </div>

            {/* Primary Hover Time */}
            <div className="text-lg font-black font-mono text-white tracking-wider leading-none py-0.5">
              {formatSeconds(hoverTime)}
            </div>

            {/* Subtitle: Remaining time from hover */}
            {duration > 0 && (
              <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between w-full">
                <span>Remaining</span>
                <span className="text-neutral-300 font-medium">
                  -{formatSeconds(Math.max(0, duration - hoverTime))}
                </span>
              </div>
            )}

            {/* Mini track visualizer with current position & hover position */}
            <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-0.5">
              {/* Current playback segment */}
              <div
                style={{
                  width: `${progressPercent}%`,
                }}
                className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
              />
              {/* Hover seek target indicator */}
              <div
                style={{
                  left: `${hoverPercent}%`,
                  backgroundColor: accentColor,
                }}
                className="absolute top-0 bottom-0 w-1 -translate-x-1/2 rounded-full shadow-sm"
              />
            </div>
          </div>

          {/* Triangle pointer accurately aligned with cursor */}
          <div
            style={{
              transform: `translateX(${pointerOffset}px) rotate(45deg)`,
            }}
            className="w-2.5 h-2.5 bg-neutral-950 border-r border-b border-white/20 -mt-1 shadow-md transition-transform duration-75"
          />
        </div>
      )}

      {/* Background Track */}
      <div className={`relative w-full ${trackHeightClass} bg-white/15 rounded-full overflow-hidden transition-all duration-150`}>
        {/* Hover Ghost Fill (shows seek range preview on track) */}
        {hoverTime !== null && (
          <div
            style={{
              width: `${hoverPercent}%`,
            }}
            className="absolute inset-y-0 left-0 bg-white/20 rounded-full pointer-events-none transition-all duration-75"
          />
        )}

        {/* Chapter Marker Ticks */}
        {showChapterMarkers &&
          duration > 0 &&
          chapters &&
          chapters.map((ch, idx) => {
            const pct = (ch.time / duration) * 100;
            if (pct <= 0 || pct >= 100) return null;
            return (
              <div
                key={idx}
                style={{ left: `${pct}%` }}
                className="absolute top-0 bottom-0 w-0.5 bg-black/60 pointer-events-none z-10"
                title={ch.title}
              />
            );
          })}

        {/* Active Progress Gradient */}
        <div
          style={{
            width: `${progressPercent}%`,
            backgroundColor: accentColor,
            boxShadow: scrubberGlow
              ? `0 0 ${Math.round(18 * (scrubberGlowIntensity || 0.6))}px ${accentGlow}`
              : "none",
          }}
          className="relative h-full rounded-full transition-all duration-75"
        />
      </div>

      {/* Hover Vertical Marker Tick on track */}
      {hoverTime !== null && (
        <div
          style={{
            left: `${hoverPosition}px`,
            backgroundColor: accentColor,
          }}
          className="absolute -top-1 bottom-1 w-0.5 rounded-full pointer-events-none shadow-md z-10 opacity-90 transition-opacity"
        />
      )}

      {/* Thumb Indicator */}
      <div
        style={{
          left: `${progressPercent}%`,
          backgroundColor: accentColor,
          boxShadow: scrubberGlow ? `0 0 10px ${accentGlow}` : "none",
        }}
        className="absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform duration-150 pointer-events-none border-2 border-neutral-900"
      />
    </div>
  );
}
