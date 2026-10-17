import { useState, useEffect } from "react";
import {
  Scaling,
  ListEnd,
  Moon,
  ListVideo,
  PictureInPicture2,
  Sliders,
  Maximize,
  Minimize,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useThemeStore } from "../../stores/themeStore";
import type { SleepTimerState } from "../../stores/playerStore";
import { toggleWindowFullscreen } from "../../utils/windowControls";
import { activeBtnStyle } from "./shared";

interface VideoFitButtonProps {
  videoFitMode: "fit" | "fill" | "stretch";
  onCycleVideoFitMode: () => void;
}

export function VideoFitButton({ videoFitMode, onCycleVideoFitMode }: VideoFitButtonProps) {
  const { accentColor, accentGlow } = useThemeStore();

  return (
    <>
      {/* Video Aspect / Scaling (Visible on xl+ screens) */}
      <button
        onClick={onCycleVideoFitMode}
        style={activeBtnStyle(videoFitMode !== "fit", accentColor, accentGlow)}
        className={`hidden xl:flex p-2 rounded-lg border transition ${
          videoFitMode === "fit"
            ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
            : ""
        }`}
        title={`Video Aspect: ${videoFitMode.toUpperCase()} (Click to toggle Fit / Fill / Stretch)`}
      >
        <Scaling className="w-4 h-4" />
      </button>
    </>
  );
}

interface AutoPlayNextButtonProps {
  autoPlayNext: boolean;
  onToggleAutoPlayNext: () => void;
}

export function AutoPlayNextButton({ autoPlayNext, onToggleAutoPlayNext }: AutoPlayNextButtonProps) {
  const { accentColor, accentGlow } = useThemeStore();

  return (
    <>
      {/* Auto-Play Next Toggle (Visible on lg+ screens) */}
      <button
        onClick={() => onToggleAutoPlayNext()}
        style={activeBtnStyle(autoPlayNext, accentColor, accentGlow)}
        className={`hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg border transition text-xs font-semibold ${
          autoPlayNext
            ? ""
            : "bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10"
        }`}
        title={
          autoPlayNext
            ? "Auto-Play Next: On — advances to the next item when this one ends (click to stop at the end)"
            : "Auto-Play Next: Off — playback stops at the end of each item (click to advance to the next)"
        }
      >
        <ListEnd className="w-3.5 h-3.5" />
        <span className="text-[10px] hidden 2xl:inline uppercase">
          {autoPlayNext ? "Auto" : "Off"}
        </span>
      </button>
    </>
  );
}

interface SleepTimerButtonProps {
  sleepTimer: SleepTimerState;
  isNightListening: boolean;
  onToggleSleepTimer: (open?: boolean) => void;
}

export function SleepTimerButton({
  sleepTimer,
  isNightListening,
  onToggleSleepTimer,
}: SleepTimerButtonProps) {
  const { accentColor, accentGlow } = useThemeStore();

  return (
    <>
      {/* Night Listening / Sleep Timer Quick Modal (Visible on xl+ screens) */}
      <button
        onClick={() => onToggleSleepTimer(true)}
        style={activeBtnStyle(sleepTimer.isActive || isNightListening, accentColor, accentGlow)}
        className={`hidden xl:flex p-2 rounded-lg border transition ${
          !sleepTimer.isActive && !isNightListening
            ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
            : "shadow-sm"
        }`}
        title={
          sleepTimer.isActive
            ? `Sleep Timer: ${Math.ceil(sleepTimer.remainingSeconds / 60)}m left`
            : "Night Listening & Sleep Timer"
        }
      >
        <Moon className="w-4 h-4 text-indigo-400" />
      </button>
    </>
  );
}

interface PlaylistButtonProps {
  playlistLength: number;
  onTogglePlaylistDrawer: () => void;
}

export function PlaylistButton({ playlistLength, onTogglePlaylistDrawer }: PlaylistButtonProps) {
  const { accentColor, accentText } = useThemeStore();

  return (
    <>
      {/* Playlist Drawer Button */}
      <button
        onClick={onTogglePlaylistDrawer}
        className="relative p-1.5 sm:p-2 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 transition"
        title="Toggle Playlist (P)"
      >
        <ListVideo className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        {playlistLength > 0 && (
          <span
            style={{ backgroundColor: accentColor, color: accentText }}
            className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-extrabold rounded-full flex items-center justify-center shadow"
          >
            {playlistLength}
          </span>
        )}
      </button>
    </>
  );
}

interface PipButtonProps {
  isPiP: boolean;
  onTogglePiP: () => void;
}

export function PipButton({ isPiP, onTogglePiP }: PipButtonProps) {
  const { accentColor, accentGlow } = useThemeStore();

  return (
    <>
      {/* Picture-in-Picture Button */}
      <button
        onClick={onTogglePiP}
        style={activeBtnStyle(isPiP, accentColor, accentGlow)}
        className={`p-1.5 sm:p-2 rounded-lg border transition ${
          !isPiP
            ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
            : ""
        }`}
        title="Picture-in-Picture Mini Player (Shift+P)"
      >
        <PictureInPicture2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
      </button>
    </>
  );
}

interface SettingsButtonProps {
  onToggleSettingsModal: () => void;
}

export function SettingsButton({ onToggleSettingsModal }: SettingsButtonProps) {
  return (
    <>
      {/* Settings & Shortcuts Modal Button (Visible on xl+ screens) */}
      <button
        onClick={onToggleSettingsModal}
        className="hidden xl:flex p-2 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 transition"
        title="Settings & Shortcuts"
      >
        <Sliders className="w-4 h-4" />
      </button>
    </>
  );
}

export function FullscreenButton() {
  const { accentColor } = useThemeStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkFullscreen = async () => {
      try {
        const appWindow = getCurrentWindow();
        setIsFullscreen(await appWindow.isFullscreen());
      } catch (e) {
        console.warn("Fullscreen check error:", e);
      }
    };
    checkFullscreen();
  }, []);

  const handleToggleFullscreen = async () => {
    const newFs = await toggleWindowFullscreen();
    setIsFullscreen(newFs);
  };

  return (
    <>
      {/* Fullscreen Button */}
      <button
        onClick={handleToggleFullscreen}
        className="p-1.5 sm:p-2 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 transition shrink-0"
        title="Fullscreen (F)"
      >
        {isFullscreen ? (
          <Minimize style={{ color: accentColor }} className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        ) : (
          <Maximize className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        )}
      </button>
    </>
  );
}
