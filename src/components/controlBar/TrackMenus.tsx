import { useState, useRef, useEffect } from "react";
import { Headphones, Subtitles, Check, Moon } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useThemeStore } from "../../stores/themeStore";
import type { TrackInfo } from "../../services/player/types";
import { activeBtnStyle } from "./shared";

interface AudioTrackMenuProps {
  audioTracks: TrackInfo[];
  currentAudioTrackId?: number;
  onSelectAudioTrack: (trackId: number) => void;
  audioDelay?: number;
  onChangeAudioDelay?: (deltaMs: number) => Promise<void>;
  onSetAudioDelay?: (ms: number) => Promise<void>;
  isNightListening?: boolean;
  onToggleNightListening?: () => Promise<void>;
}

export function AudioTrackMenu({
  audioTracks,
  currentAudioTrackId,
  onSelectAudioTrack,
  audioDelay = 0,
  onChangeAudioDelay,
  onSetAudioDelay,
  isNightListening = false,
  onToggleNightListening,
}: AudioTrackMenuProps) {
  const { accentColor, accentGlow } = useThemeStore();
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const audioMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (audioMenuRef.current && !audioMenuRef.current.contains(target)) {
        setShowAudioMenu(false);
      }
    };
    if (showAudioMenu) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showAudioMenu]);

  return (
    <>
      {/* Audio Track & Night Mode Picker */}
      {(audioTracks.length > 0 || onToggleNightListening) && (
        <div className="relative" ref={audioMenuRef}>
          <button
            onClick={() => setShowAudioMenu((prev) => !prev)}
            style={activeBtnStyle(Boolean(currentAudioTrackId) || isNightListening, accentColor, accentGlow)}
            className={`hidden xl:flex p-2 rounded-lg border transition duration-150 cursor-pointer ${
              !currentAudioTrackId && !isNightListening
                ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                : ""
            }`}
            title="Audio Track, Night Mode & Sync (A / N / G / H)"
          >
            <Headphones className="w-4 h-4" />
          </button>

          {showAudioMenu && (
            <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[210px] z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              {/* Night Mode Quick Toggle */}
              {onToggleNightListening && (
                <div className="border-b border-white/10 pb-1.5 mb-1 px-1">
                  <button
                    onClick={() => onToggleNightListening()}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition duration-150 cursor-pointer ${
                      isNightListening
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium"
                        : "text-neutral-300 hover:bg-white/10 border border-transparent"
                    }`}
                    title="Compress dynamic range for late-night viewing (Key: N)"
                  >
                    <div className="flex items-center gap-2">
                      <Moon className={`w-3.5 h-3.5 ${isNightListening ? "text-indigo-400" : "text-neutral-400"}`} />
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs leading-none">Night Mode</span>
                        <span className="text-[9px] text-neutral-400 mt-0.5">Dialogue Booster (N)</span>
                      </div>
                    </div>
                    <div
                      className={`w-2.5 h-2.5 rounded-full border transition-all ${
                        isNightListening
                          ? "bg-indigo-400 border-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.7)]"
                          : "border-white/30 bg-transparent"
                      }`}
                    />
                  </button>
                </div>
              )}

              {audioTracks.length > 0 && (
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-0.5">
                  Audio Tracks
                </div>
              )}
              {audioTracks.map((track) => {
                const selected = currentAudioTrackId === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      onSelectAudioTrack(track.id);
                      setShowAudioMenu(false);
                    }}
                    style={selected ? { backgroundColor: accentColor, color: "var(--accent-text)" } : undefined}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition duration-150 cursor-pointer ${
                      selected ? "font-bold shadow-xs" : "text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="truncate">
                      {track.title || track.lang || `Track ${track.id}`}
                    </span>
                    {selected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent-text)" }} />}
                  </button>
                );
              })}

              {/* Audio Timing & Sync Stepper */}
              {onChangeAudioDelay && (
                <div className="border-t border-white/10 pt-1.5 mt-0.5 px-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-neutral-400 font-semibold tracking-wider uppercase">Audio Sync</span>
                    <span className="text-neutral-200 font-bold tabular-nums">
                      {audioDelay === 0 ? "0 ms" : `${audioDelay > 0 ? "+" : ""}${audioDelay} ms`}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
                    <button
                      onClick={() => onChangeAudioDelay(-100)}
                      className="px-1.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white text-center transition duration-150 cursor-pointer"
                      title="Audio Delay -100ms (Key: G)"
                    >
                      -100ms
                    </button>
                    <button
                      onClick={() => onChangeAudioDelay(-50)}
                      className="px-1.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white text-center transition duration-150 cursor-pointer"
                      title="Audio Delay -50ms"
                    >
                      -50ms
                    </button>
                    <button
                      onClick={() => onChangeAudioDelay(50)}
                      className="px-1.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white text-center transition duration-150 cursor-pointer"
                      title="Audio Delay +50ms"
                    >
                      +50ms
                    </button>
                    <button
                      onClick={() => onChangeAudioDelay(100)}
                      className="px-1.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white text-center transition duration-150 cursor-pointer"
                      title="Audio Delay +100ms (Key: H)"
                    >
                      +100ms
                    </button>
                  </div>
                  {audioDelay !== 0 && onSetAudioDelay && (
                    <button
                      onClick={() => onSetAudioDelay(0)}
                      className="text-[10px] text-amber-400/90 hover:text-amber-300 py-0.5 text-center transition duration-150 cursor-pointer font-mono"
                    >
                      Reset sync to 0 ms (Key: J)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

interface SubtitleMenuProps {
  subtitleTracks: TrackInfo[];
  currentSubtitleTrackId?: number;
  onSelectSubtitleTrack: (trackId: number) => void;
  onToggleSubtitleTrack: () => Promise<void>;
  onLoadSubtitle: (path: string) => Promise<void>;
  subDelay?: number;
  onChangeSubDelay?: (deltaSeconds: number) => Promise<void>;
  onSetSubDelay?: (secs: number) => Promise<void>;
  secondarySubtitleTrackId?: number | null;
  onSelectSecondarySubtitleTrack?: (trackId: number | null) => Promise<void>;
}

export function SubtitleMenu({
  subtitleTracks,
  currentSubtitleTrackId,
  onSelectSubtitleTrack,
  onToggleSubtitleTrack,
  onLoadSubtitle,
  subDelay = 0,
  onChangeSubDelay,
  onSetSubDelay,
  secondarySubtitleTrackId,
  onSelectSecondarySubtitleTrack,
}: SubtitleMenuProps) {
  const { accentColor, accentGlow } = useThemeStore();
  const [showSubMenu, setShowSubMenu] = useState(false);
  const subMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (subMenuRef.current && !subMenuRef.current.contains(target)) {
        setShowSubMenu(false);
      }
    };
    if (showSubMenu) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showSubMenu]);

  return (
    <>
      {/* Subtitles Quick Toggle & Track Picker */}
      <div className="relative" ref={subMenuRef}>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            await onToggleSubtitleTrack();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowSubMenu((prev) => !prev);
          }}
          style={activeBtnStyle(Boolean(currentSubtitleTrackId && currentSubtitleTrackId > 0), accentColor, accentGlow)}
          className={`p-1.5 sm:p-2 rounded-lg border transition duration-150 cursor-pointer ${
            !currentSubtitleTrackId
              ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
              : ""
          }`}
          title={
            currentSubtitleTrackId && currentSubtitleTrackId > 0
              ? "Subtitles: ON (Click to turn OFF, right-click to choose language or sync timing)"
              : "Subtitles: OFF (Click to turn ON, right-click to choose language or sync timing)"
          }
        >
          <Subtitles className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {showSubMenu && (
          <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[200px] z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-0.5">
              Subtitles
            </div>
            <button
              onClick={() => {
                onSelectSubtitleTrack(0);
                setShowSubMenu(false);
              }}
              style={!currentSubtitleTrackId ? { backgroundColor: accentColor, color: "var(--accent-text)" } : undefined}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition duration-150 cursor-pointer ${
                !currentSubtitleTrackId ? "font-bold shadow-xs" : "text-neutral-300 hover:bg-white/10"
              }`}
            >
              <span>Off</span>
              {!currentSubtitleTrackId && <Check className="w-3.5 h-3.5" style={{ color: "var(--accent-text)" }} />}
            </button>
            {subtitleTracks.map((track) => {
              const isSelected = currentSubtitleTrackId === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    onSelectSubtitleTrack(track.id);
                    setShowSubMenu(false);
                  }}
                  style={isSelected ? { backgroundColor: accentColor, color: "var(--accent-text)" } : undefined}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition duration-150 cursor-pointer truncate ${
                    isSelected ? "font-bold shadow-xs" : "text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <span className="truncate">{track.title || track.lang || `Track ${track.id}`}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent-text)" }} />}
                </button>
              );
            })}

            {/* Dual Subtitles (Secondary Track rendered at top of viewport) */}
            {onSelectSecondarySubtitleTrack && subtitleTracks.length > 1 && (
              <div className="border-t border-white/10 pt-1 mt-1 flex flex-col gap-0.5">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                  <span>Dual Subtitles (Top)</span>
                  {secondarySubtitleTrackId ? (
                    <span className="text-emerald-400 font-mono text-[9px]">Active</span>
                  ) : null}
                </div>
                <button
                  onClick={() => {
                    onSelectSecondarySubtitleTrack(null);
                    setShowSubMenu(false);
                  }}
                  style={!secondarySubtitleTrackId ? { backgroundColor: "rgba(255,255,255,0.1)" } : undefined}
                  className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-left transition cursor-pointer text-[11px] ${
                    !secondarySubtitleTrackId ? "font-semibold text-white" : "text-neutral-400 hover:bg-white/10"
                  }`}
                >
                  <span>None (Single Subtitle)</span>
                  {!secondarySubtitleTrackId && <Check className="w-3 h-3 text-neutral-300" />}
                </button>
                {subtitleTracks.map((track) => {
                  if (track.id === currentSubtitleTrackId) return null;
                  const isSec = secondarySubtitleTrackId === track.id;
                  return (
                    <button
                      key={`sec-${track.id}`}
                      onClick={() => {
                        onSelectSecondarySubtitleTrack(track.id);
                        setShowSubMenu(false);
                      }}
                      style={isSec ? { backgroundColor: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7" } : undefined}
                      className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-left transition cursor-pointer text-[11px] truncate ${
                        isSec ? "font-bold" : "text-neutral-300 hover:bg-white/10"
                      }`}
                    >
                      <span className="truncate">{track.title || track.lang || `Track ${track.id}`}</span>
                      {isSec && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="h-px bg-white/10 my-0.5" />
            <button
              onClick={async () => {
                setShowSubMenu(false);
                try {
                  const file = await openDialog({
                    multiple: false,
                    filters: [{ name: "Subtitles", extensions: ["srt", "vtt", "ass", "ssa"] }],
                  });
                  if (file && typeof file === "string") {
                    await onLoadSubtitle(file);
                  }
                } catch (err) {
                  console.warn("Subtitle load error:", err);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition duration-150 cursor-pointer"
            >
              <span>+ Load External Subtitle...</span>
            </button>

            {/* Subtitle Timing & Sync Stepper */}
            {onChangeSubDelay && (
              <div className="border-t border-white/10 pt-1.5 mt-0.5 px-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-neutral-400 font-semibold tracking-wider uppercase">Sync Timing</span>
                  <span className="text-neutral-200 font-bold tabular-nums">
                    {subDelay === 0 ? "0 ms" : `${subDelay > 0 ? "+" : ""}${Math.round(subDelay * 1000)} ms`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
                  <button
                    onClick={() => onChangeSubDelay(-0.1)}
                    className="px-1.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white text-center transition duration-150 cursor-pointer"
                    title="Delay Subtitles by -100ms (Key: Z)"
                  >
                    -100ms
                  </button>
                  <button
                    onClick={() => onChangeSubDelay(-0.05)}
                    className="px-1.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white text-center transition duration-150 cursor-pointer"
                    title="Delay Subtitles by -50ms"
                  >
                    -50ms
                  </button>
                  <button
                    onClick={() => onChangeSubDelay(0.05)}
                    className="px-1.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white text-center transition duration-150 cursor-pointer"
                    title="Advance Subtitles by +50ms"
                  >
                    +50ms
                  </button>
                  <button
                    onClick={() => onChangeSubDelay(0.1)}
                    className="px-1.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white text-center transition duration-150 cursor-pointer"
                    title="Advance Subtitles by +100ms (Key: X)"
                  >
                    +100ms
                  </button>
                </div>
                {subDelay !== 0 && onSetSubDelay && (
                  <button
                    onClick={() => onSetSubDelay(0)}
                    className="text-[10px] text-amber-400/90 hover:text-amber-300 py-0.5 text-center transition duration-150 cursor-pointer font-mono"
                  >
                    Reset sync to 0 ms (Key: C)
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
