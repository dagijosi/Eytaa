import { useState, useRef, useEffect } from "react";
import {
  Gauge,
  ListEnd,
  Repeat,
  Repeat1,
  Scaling,
  Camera,
  Moon,
  Sliders,
  MoreHorizontal,
} from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";
import type { RepeatMode } from "../../stores/playerStore";
import type { PlaybackProfile } from "../../services/player/profileTypes";
import { activeBtnStyle, getProfileIcon } from "./shared";

interface MoreMenuProps {
  playbackRate: number;
  onSetPlaybackRate: (rate: number) => void;
  autoPlayNext: boolean;
  onToggleAutoPlayNext: () => void;
  repeatMode: RepeatMode;
  onSetRepeatMode: (mode: RepeatMode) => void;
  videoFitMode: "fit" | "fill" | "stretch";
  onCycleVideoFitMode: () => void;
  profiles: PlaybackProfile[];
  activeProfileId: string;
  onApplyProfile: (profileId: string) => void;
  onTakeScreenshot: () => void;
  showStats: boolean;
  onToggleStats: (enabled: boolean) => void;
  onToggleSleepTimer: (open?: boolean) => void;
  onToggleSettingsModal: () => void;
}

export function MoreMenu({
  playbackRate,
  onSetPlaybackRate,
  autoPlayNext,
  onToggleAutoPlayNext,
  repeatMode,
  onSetRepeatMode,
  videoFitMode,
  onCycleVideoFitMode,
  profiles,
  activeProfileId,
  onApplyProfile,
  onTakeScreenshot,
  showStats,
  onToggleStats,
  onToggleSleepTimer,
  onToggleSettingsModal,
}: MoreMenuProps) {
  const { accentColor, accentGlow, accentText } = useThemeStore();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showMoreMenu]);

  return (
    <>
      {/* More Options Dropdown (Reveals on split screens & < xl breakpoints) */}
      <div className="relative xl:hidden" ref={moreMenuRef}>
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          style={activeBtnStyle(showMoreMenu, accentColor, accentGlow)}
          className={`p-1.5 sm:p-2 rounded-lg border transition ${
            !showMoreMenu
              ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
              : ""
          }`}
          title="More Controls (Speed, Profiles, Sleep Timer, Scaling)"
        >
          <MoreHorizontal className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {showMoreMenu && (
          <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 w-64 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-1">
              Quick Controls
            </div>

            {/* Playback Speed selector row */}
            <div className="px-2.5 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-neutral-300">
                <Gauge style={{ color: accentColor }} className="w-3.5 h-3.5" />
                <span>Speed</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => onSetPlaybackRate(rate)}
                    style={{
                      backgroundColor: playbackRate === rate ? accentColor : undefined,
                      color: playbackRate === rate ? accentText : undefined,
                    }}
                    className={`px-1.5 py-0.5 rounded transition ${
                      playbackRate === rate
                        ? "font-bold shadow"
                        : "bg-white/5 text-neutral-300 hover:bg-white/15"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-Play Next toggle */}
            <button
              onClick={() => onToggleAutoPlayNext()}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl text-neutral-200 hover:bg-white/10 text-left transition"
            >
              <div className="flex items-center gap-2">
                <ListEnd style={{ color: accentColor }} className="w-3.5 h-3.5" />
                <span>Auto-Play Next</span>
              </div>
              <span
                style={autoPlayNext ? { backgroundColor: accentGlow, color: accentColor, borderColor: `${accentColor}66` } : undefined}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  autoPlayNext
                    ? "border uppercase"
                    : "bg-white/5 text-neutral-500 uppercase"
                }`}
              >
                {autoPlayNext ? "On" : "Off"}
              </span>
            </button>

            {/* Repeat Mode selector (direct selection, no cycling) */}
            <div className="px-2.5 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-neutral-300">
                {repeatMode === "one" ? (
                  <Repeat1 style={{ color: accentColor }} className="w-3.5 h-3.5" />
                ) : (
                  <Repeat style={{ color: accentColor }} className="w-3.5 h-3.5" />
                )}
                <span>Repeat</span>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                {(["off", "all", "one"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onSetRepeatMode(mode)}
                    style={{
                      backgroundColor: repeatMode === mode ? accentColor : undefined,
                      color: repeatMode === mode ? accentText : undefined,
                    }}
                    className={`px-1.5 py-0.5 rounded transition uppercase ${
                      repeatMode === mode
                        ? "font-bold shadow"
                        : "bg-white/5 text-neutral-300 hover:bg-white/15"
                    }`}
                  >
                    {mode === "off" ? "Off" : mode === "all" ? "All" : "One"}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Aspect Mode */}
            <button
              onClick={onCycleVideoFitMode}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl text-neutral-200 hover:bg-white/10 text-left transition"
            >
              <div className="flex items-center gap-2">
                <Scaling style={{ color: accentColor }} className="w-3.5 h-3.5" />
                <span>Video Scaling</span>
              </div>
              <span className="text-[11px] font-mono uppercase text-neutral-400">
                {videoFitMode}
              </span>
            </button>

            {/* Profiles Sub-section */}
            <div className="mt-1 pt-1 border-t border-white/5">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-neutral-400">
                Active Profile: <strong className="text-white font-bold">{activeProfile.name}</strong>
              </div>
              <div className="grid grid-cols-2 gap-1 px-1">
                {profiles.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onApplyProfile(p.id)}
                    style={p.id === activeProfileId ? { backgroundColor: accentGlow, color: accentColor, borderColor: accentColor } : undefined}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] transition text-left truncate ${
                      p.id === activeProfileId
                        ? "font-bold border"
                        : "bg-white/5 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    {getProfileIcon(p.icon, accentColor)}
                    <span className="truncate">{p.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Screenshot */}
            <button
              onClick={() => {
                onTakeScreenshot();
                setShowMoreMenu(false);
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-neutral-200 hover:bg-white/10 text-left transition"
            >
              <Camera className="w-3.5 h-3.5 text-neutral-400" />
              <span>Take Screenshot</span>
            </button>

            {/* Playback Stats */}
            <button
              onClick={() => {
                onToggleStats(!showStats);
                setShowMoreMenu(false);
              }}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl text-neutral-200 hover:bg-white/10 text-left transition"
            >
              <div className="flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-neutral-400" />
                <span>Playback Stats</span>
              </div>
              <span
                style={showStats ? { backgroundColor: accentGlow, color: accentColor, borderColor: `${accentColor}66` } : undefined}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  showStats ? "border" : "bg-white/5 text-neutral-500"
                }`}
              >
                {showStats ? "ON" : "OFF"}
              </span>
            </button>

            {/* Night Listening / Sleep Timer */}
            <button
              onClick={() => {
                setShowMoreMenu(false);
                onToggleSleepTimer(true);
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-neutral-200 hover:bg-white/10 text-left transition mt-1"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Night Listening & Sleep Timer</span>
            </button>

            {/* Settings Modal */}
            <button
              onClick={() => {
                setShowMoreMenu(false);
                onToggleSettingsModal();
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-neutral-200 hover:bg-white/10 text-left transition border-t border-white/5"
            >
              <Sliders className="w-3.5 h-3.5 text-neutral-400" />
              <span>All Settings & Shortcuts</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
