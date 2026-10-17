import { useState, useRef, useEffect } from "react";
import { Headphones, Subtitles, Check } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useThemeStore } from "../../stores/themeStore";
import type { TrackInfo } from "../../services/player/types";
import { activeBtnStyle } from "./shared";

interface AudioTrackMenuProps {
  audioTracks: TrackInfo[];
  currentAudioTrackId?: number;
  onSelectAudioTrack: (trackId: number) => void;
}

export function AudioTrackMenu({
  audioTracks,
  currentAudioTrackId,
  onSelectAudioTrack,
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
      {/* Audio Track Picker */}
      {audioTracks.length > 1 && (
        <div className="relative" ref={audioMenuRef}>
          <button
            onClick={() => setShowAudioMenu((prev) => !prev)}
            style={activeBtnStyle(Boolean(currentAudioTrackId), accentColor, accentGlow)}
            className={`hidden xl:flex p-2 rounded-lg border transition ${
              !currentAudioTrackId
                ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                : ""
            }`}
            title="Audio Track (A)"
          >
            <Headphones className="w-4 h-4" />
          </button>

          {showAudioMenu && (
            <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[160px] z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-1">
                Audio Tracks
              </div>
              {audioTracks.map((track) => {
                const selected = currentAudioTrackId === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      onSelectAudioTrack(track.id);
                      setShowAudioMenu(false);
                    }}
                    style={selected ? { backgroundColor: accentGlow, color: accentColor } : undefined}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                      selected ? "font-bold" : "text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="truncate">
                      {track.title || track.lang || `Track ${track.id}`}
                    </span>
                    {selected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />}
                  </button>
                );
              })}
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
}

export function SubtitleMenu({
  subtitleTracks,
  currentSubtitleTrackId,
  onSelectSubtitleTrack,
  onToggleSubtitleTrack,
  onLoadSubtitle,
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
          className={`p-1.5 sm:p-2 rounded-lg border transition ${
            !currentSubtitleTrackId
              ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
              : ""
          }`}
          title={
            currentSubtitleTrackId && currentSubtitleTrackId > 0
              ? "Subtitles: ON (Click to turn OFF, right-click to choose language)"
              : "Subtitles: OFF (Click to turn ON, right-click to choose language)"
          }
        >
          <Subtitles className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {showSubMenu && (
          <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[160px] z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-1">
              Subtitles
            </div>
            <button
              onClick={() => {
                onSelectSubtitleTrack(0);
                setShowSubMenu(false);
              }}
              style={!currentSubtitleTrackId ? { backgroundColor: accentGlow, color: accentColor } : undefined}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                !currentSubtitleTrackId ? "font-bold" : "text-neutral-300 hover:bg-white/10"
              }`}
            >
              <span>Off</span>
              {!currentSubtitleTrackId && <Check className="w-3.5 h-3.5" style={{ color: accentColor }} />}
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
                  style={isSelected ? { backgroundColor: accentGlow, color: accentColor } : undefined}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition truncate ${
                    isSelected ? "font-bold" : "text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <span className="truncate">{track.title || track.lang || `Track ${track.id}`}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />}
                </button>
              );
            })}
            <div className="h-px bg-white/10 my-1" />
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
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition"
            >
              <span>+ Load External Subtitle...</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
