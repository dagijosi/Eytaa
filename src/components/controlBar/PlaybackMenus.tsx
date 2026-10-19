import { useState, useRef, useEffect } from "react";
import { Gauge, Repeat, Repeat1, Check, Sliders } from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";
import type { RepeatMode } from "../../stores/playerStore";
import type { PlaybackProfile } from "../../services/player/profileTypes";
import { activeBtnStyle, getProfileIcon, SPEED_OPTIONS } from "./shared";

interface SpeedMenuProps {
  playbackRate: number;
  onSetPlaybackRate: (rate: number) => void;
}

export function SpeedMenu({ playbackRate, onSetPlaybackRate }: SpeedMenuProps) {
  const { accentColor, accentGlow, accentText } = useThemeStore();
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (speedMenuRef.current && !speedMenuRef.current.contains(target)) {
        setShowSpeedMenu(false);
      }
    };
    if (showSpeedMenu) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showSpeedMenu]);

  return (
    <>
      {/* Speed Picker (Visible on xl+ screens) */}
      <div className="relative hidden xl:block" ref={speedMenuRef}>
        <button
          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
          style={activeBtnStyle(playbackRate !== 1.0, accentColor, accentGlow)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            playbackRate === 1.0
              ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
              : ""
          }`}
          title="Playback Speed ([ / ])"
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>{playbackRate.toFixed(2)}x</span>
        </button>

        {showSpeedMenu && (
          <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[85px] z-50">
            {SPEED_OPTIONS.map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  onSetPlaybackRate(rate);
                  setShowSpeedMenu(false);
                }}
                style={{
                  backgroundColor: playbackRate === rate ? accentColor : undefined,
                  color: playbackRate === rate ? accentText : undefined,
                }}
                className={`px-3 py-1 text-xs rounded-lg text-left transition font-mono ${
                  playbackRate === rate
                    ? "font-bold shadow"
                    : "text-neutral-200 hover:bg-white/10"
                }`}
              >
                {rate.toFixed(2)}x
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

interface RepeatMenuProps {
  repeatMode: RepeatMode;
  onSetRepeatMode: (mode: RepeatMode) => void;
}

export function RepeatMenu({ repeatMode, onSetRepeatMode }: RepeatMenuProps) {
  const { accentColor, accentGlow } = useThemeStore();
  const [showRepeatMenu, setShowRepeatMenu] = useState(false);
  const repeatMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (repeatMenuRef.current && !repeatMenuRef.current.contains(target)) {
        setShowRepeatMenu(false);
      }
    };
    if (showRepeatMenu) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showRepeatMenu]);

  return (
    <>
      {/* Repeat Mode Dropdown (Visible on lg+ screens) — direct selection, no cycling */}
      <div className="relative hidden lg:block" ref={repeatMenuRef}>
        <button
          onClick={() => setShowRepeatMenu(!showRepeatMenu)}
          style={activeBtnStyle(repeatMode !== "off", accentColor, accentGlow)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border transition text-xs font-semibold ${
            repeatMode === "off"
              ? "bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10"
              : ""
          }`}
          title={
            repeatMode === "off"
              ? "Repeat: Off — click to choose"
              : repeatMode === "all"
              ? "Repeat: Entire Playlist — click to change"
              : "Repeat: Current File — click to change"
          }
        >
          {repeatMode === "one" ? (
            <Repeat1 className="w-3.5 h-3.5" />
          ) : (
            <Repeat className="w-3.5 h-3.5" />
          )}
          <span className="text-[10px] hidden 2xl:inline uppercase">
            {repeatMode === "off" ? "Off" : repeatMode === "all" ? "All" : "One"}
          </span>
        </button>

        {showRepeatMenu && (
          <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 w-56 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-1">
              Repeat Mode
            </div>
            {([
              { mode: "off", label: "Off", desc: "Stop at the end", icon: <Repeat className="w-3.5 h-3.5" /> },
              { mode: "all", label: "Repeat Playlist", desc: "Loop the whole queue", icon: <Repeat className="w-3.5 h-3.5" /> },
              { mode: "one", label: "Repeat One", desc: "Loop the current file", icon: <Repeat1 className="w-3.5 h-3.5" /> },
            ] as const).map((opt) => {
              const isSelected = repeatMode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  onClick={() => {
                    onSetRepeatMode(opt.mode);
                    setShowRepeatMenu(false);
                  }}
                  style={isSelected ? { backgroundColor: accentColor, color: "var(--accent-text)", borderColor: accentColor, boxShadow: `0 2px 10px ${accentGlow}` } : undefined}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition text-left ${
                    isSelected ? "font-bold border" : "text-neutral-200 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {opt.icon}
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      <span className={`text-[10px] font-normal ${isSelected ? "opacity-75" : "text-neutral-500"}`}>{opt.desc}</span>
                    </div>
                  </div>
                  {isSelected && <Check style={{ color: "var(--accent-text)" }} className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

interface ProfileMenuProps {
  profiles: PlaybackProfile[];
  activeProfileId: string;
  onApplyProfile: (profileId: string) => void;
  onToggleSettingsModal: () => void;
}

export function ProfileMenu({
  profiles,
  activeProfileId,
  onApplyProfile,
  onToggleSettingsModal,
}: ProfileMenuProps) {
  const { accentColor, accentGlow } = useThemeStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showProfileMenu]);

  return (
    <>
      {/* Playback Profile Menu (Visible on xl+ screens; 1-click selection menu, NO cycle on click) */}
      <div className="relative hidden xl:block" ref={profileMenuRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          style={activeBtnStyle(activeProfileId !== "default", accentColor, accentGlow)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition text-xs font-semibold ${
            activeProfileId === "default"
              ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
              : ""
          }`}
          title={`Active Profile: ${activeProfile.name} (Click to choose)`}
        >
          {getProfileIcon(activeProfile.icon, accentColor, activeProfileId !== "default")}
          <span className="text-[11px] truncate max-w-[70px]">
            {activeProfile.name.split(" ")[0]}
          </span>
        </button>

        {showProfileMenu && (
          <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 w-56 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-1">
              Select Profile
            </div>
            {profiles.map((p) => {
              const isSelected = p.id === activeProfileId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onApplyProfile(p.id);
                    setShowProfileMenu(false);
                  }}
                  style={isSelected ? { backgroundColor: accentColor, color: "var(--accent-text)", borderColor: accentColor, boxShadow: `0 2px 10px ${accentGlow}` } : undefined}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition text-left ${
                    isSelected
                      ? "font-bold border"
                      : "text-neutral-200 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getProfileIcon(p.icon, accentColor, isSelected)}
                    <span>{p.name}</span>
                  </div>
                  {isSelected && <Check style={{ color: "var(--accent-text)" }} className="w-3.5 h-3.5" />}
                </button>
              );
            })}
            <div className="h-px bg-white/10 my-1" />
            <button
              onClick={() => {
                setShowProfileMenu(false);
                onToggleSettingsModal();
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] text-neutral-400 hover:text-white hover:bg-white/5 transition text-left"
            >
              <Sliders className="w-3 h-3" />
              <span>Manage Profiles...</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
