import { useState, useRef, useEffect, useCallback } from "react";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { libraryService } from "../../services/library/libraryService";
import { formatSeconds } from "./shared";

interface ProgressScrubberProps {
  duration: number;
  seek: (seconds: number) => void;
}

export function ProgressScrubber({ duration, seek }: ProgressScrubberProps) {
  const {
    accentColor,
    accentGlow,
    scrubberGlow,
    scrubberHeight,
    showChapterMarkers,
    scrubberGlowIntensity,
  } = useThemeStore();
  const currentTime = usePlayerStore((s) => s.currentTime);
  const chapters = usePlayerStore((s) => s.chapters);
  const bookmarks = usePlayerStore((s) => s.bookmarks);
  const deleteBookmark = usePlayerStore((s) => s.deleteBookmark);
  const abLoop = usePlayerStore((s) => s.abLoop);
  const currentFilePath = usePlayerStore((s) => s.mediaMetadata?.filePath);

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [hoverFrame, setHoverFrame] = useState<string | null>(null);
  const [isLoadingFrame, setIsLoadingFrame] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const scrubberRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const seekRafRef = useRef<number | null>(null);
  const lastRequestedTimeRef = useRef<number | null>(null);

  // Debounced scrubber thumbnail extraction
  useEffect(() => {
    if (hoverTime === null || !currentFilePath) {
      return;
    }

    const timer = setTimeout(async () => {
      lastRequestedTimeRef.current = hoverTime;
      setIsLoadingFrame(true);
      try {
        const frame = await libraryService.getScrubFrame(currentFilePath, hoverTime);
        if (lastRequestedTimeRef.current === hoverTime && frame) {
          setHoverFrame(frame);
        }
      } catch {
        // Silently ignore scrub frame error
      } finally {
        setIsLoadingFrame(false);
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [hoverTime, currentFilePath]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Coalesce rapid scrub seeks into a single IPC call per animation frame so
  // dragging the scrubber doesn't flood the mpv command queue.
  const flushPendingSeek = useCallback(() => {
    if (pendingSeekRef.current !== null) {
      seek(pendingSeekRef.current);
      pendingSeekRef.current = null;
    }
  }, [seek]);

  const scheduleSeek = useCallback(
    (seconds: number) => {
      pendingSeekRef.current = seconds;
      if (seekRafRef.current === null) {
        seekRafRef.current = window.requestAnimationFrame(() => {
          seekRafRef.current = null;
          flushPendingSeek();
        });
      }
    },
    [flushPendingSeek],
  );

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
    if (!isScrubbing) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!scrubberRef.current || duration <= 0) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const ratio = x / rect.width;
      setHoverPosition(x);
      setHoverTime(ratio * duration);
      scheduleSeek(ratio * duration);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      flushPendingSeek();
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isScrubbing, duration, flushPendingSeek, scheduleSeek]);

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
  const cardWidth = 196;
  const halfCard = cardWidth / 2;
  const cardLeft = Math.max(halfCard, Math.min(hoverPosition, containerWidth - halfCard));
  const pointerOffset = Math.max(-halfCard + 16, Math.min(halfCard - 16, hoverPosition - cardLeft));

  const hoveredChapter =
    hoverTime !== null && chapters && chapters.length > 0
      ? [...chapters].reverse().find((c) => c.time <= hoverTime) ?? null
      : null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const step = e.shiftKey ? 30 : 5;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      seek(Math.min(duration, currentTime + step));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      seek(Math.max(0, currentTime - step));
    } else if (e.key === "Home") {
      e.preventDefault();
      seek(0);
    } else if (e.key === "End") {
      e.preventDefault();
      seek(duration);
    }
  };

  return (
    <div
      ref={scrubberRef}
      role="slider"
      tabIndex={0}
      aria-label="Playback position"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      onKeyDown={handleKeyDown}
      onMouseMove={handleScrubberMouseMove}
      onMouseLeave={() => {
        setHoverTime(null);
        setHoverFrame(null);
      }}
      onMouseDown={handleScrubberMouseDown}
      className="group relative h-5 flex items-center cursor-pointer select-none py-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded"
    >
      {/* Hover Time Preview Card */}
      {hoverTime !== null && (
        <div
          style={{
            left: `${cardLeft}px`,
          }}
          className="absolute -top-[196px] -translate-x-1/2 pointer-events-none flex flex-col items-center z-50 animate-in fade-in zoom-in-95 duration-100 drop-shadow-[0_16px_32px_rgba(0,0,0,0.9)]"
        >
          {/* Obsidian Preview Glass Box */}
          <div className="bg-neutral-950/95 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl p-2 flex flex-col items-center gap-1.5 w-[196px] text-center">
            {/* Video Thumbnail Preview Frame */}
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/90 border border-white/10 flex items-center justify-center shadow-inner">
              {hoverFrame ? (
                <img
                  src={hoverFrame}
                  alt=""
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 text-white/30 text-xs">
                  <svg className="w-5 h-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[9px] font-mono tracking-widest uppercase opacity-70">Seek Frame</span>
                </div>
              )}
              {isLoadingFrame && !hoverFrame && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Header: Progress % and Jump Delta */}
            <div className="flex items-center justify-between w-full text-[11px] font-mono leading-none px-0.5 pt-0.5">
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
            <div className="text-base font-black font-mono text-white tracking-wider leading-none py-0.5">
              {formatSeconds(hoverTime)}
            </div>

            {hoveredChapter?.title && (
              <div className="text-[10px] font-medium text-neutral-300 truncate w-full px-1">
                {hoveredChapter.title}
              </div>
            )}

            {/* Subtitle: Remaining time from hover */}
            {duration > 0 && (
              <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between w-full px-0.5">
                <span>Remaining</span>
                <span className="text-neutral-300 font-medium">
                  -{formatSeconds(Math.max(0, duration - hoverTime))}
                </span>
              </div>
            )}

            {/* Mini track visualizer with current position & hover position */}
            <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden mt-0.5">
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

        {/* A-B Loop Range Highlight */}
        {abLoop.a !== null && abLoop.b !== null && duration > 0 && (
          <div
            style={{
              left: `${(Math.min(abLoop.a, abLoop.b) / duration) * 100}%`,
              width: `${(Math.abs(abLoop.b - abLoop.a) / duration) * 100}%`,
            }}
            className="absolute inset-y-0 bg-emerald-500/40 border-x-2 border-emerald-400 z-10 pointer-events-none rounded-xs"
            title={`A-B Loop Range: ${formatSeconds(Math.min(abLoop.a, abLoop.b))} - ${formatSeconds(Math.max(abLoop.a, abLoop.b))}`}
          />
        )}

        {/* A-B Loop Point A Marker on track */}
        {abLoop.a !== null && duration > 0 && (
          <div
            style={{ left: `${(abLoop.a / duration) * 100}%` }}
            className="absolute top-0 bottom-0 w-1 bg-emerald-400 z-10 pointer-events-none"
          />
        )}

        {/* A-B Loop Point B Marker on track */}
        {abLoop.b !== null && duration > 0 && (
          <div
            style={{ left: `${(abLoop.b / duration) * 100}%` }}
            className="absolute top-0 bottom-0 w-1 bg-emerald-400 z-10 pointer-events-none"
          />
        )}

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

      {/* A-B Loop Point A Badge */}
      {abLoop.a !== null && duration > 0 && (
        <div
          style={{ left: `${(abLoop.a / duration) * 100}%` }}
          className="absolute -top-3.5 -translate-x-1/2 px-1 py-0.5 rounded bg-emerald-500 text-[8px] font-black text-black shadow-md z-20 pointer-events-none leading-none select-none border border-black/40"
          title={`Point A: ${formatSeconds(abLoop.a)}`}
        >
          A
        </div>
      )}

      {/* A-B Loop Point B Badge */}
      {abLoop.b !== null && duration > 0 && (
        <div
          style={{ left: `${(abLoop.b / duration) * 100}%` }}
          className="absolute -top-3.5 -translate-x-1/2 px-1 py-0.5 rounded bg-emerald-500 text-[8px] font-black text-black shadow-md z-20 pointer-events-none leading-none select-none border border-black/40"
          title={`Point B: ${formatSeconds(abLoop.b)}`}
        >
          B
        </div>
      )}

      {/* Scene Bookmark Pins */}
      {duration > 0 &&
        bookmarks.map((bm) => {
          const pct = Math.min(100, Math.max(0, (bm.timestamp_seconds / duration) * 100));
          return (
            <button
              key={bm.id}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                seek(bm.timestamp_seconds);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void deleteBookmark(bm.id);
              }}
              style={{ left: `${pct}%` }}
              className="absolute -top-2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-amber-400 hover:bg-amber-300 border border-black/70 shadow-sm z-20 cursor-pointer transition-transform hover:scale-125"
              title={`${bm.label} (${formatSeconds(bm.timestamp_seconds)}) • Click to jump • Right-click to remove`}
            />
          );
        })}
    </div>
  );
}
