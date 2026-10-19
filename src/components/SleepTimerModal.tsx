import { useState, useEffect } from "react";
import {
  Moon,
  Clock,
  X,
  Volume2,
  Power,
  Pause,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SleepTimerModal({ isOpen, onClose }: SleepTimerModalProps) {
  const { accentColor, accentGlow, accentText } = useThemeStore();
  const {
    sleepTimer,
    startSleepTimer,
    cancelSleepTimer,
    addSleepTimerMinutes,
    isNightListening,
    toggleNightListening,
    pauseOnSystemSleep,
    setPauseOnSystemSleep,
    duration,
    currentTime,
  } = usePlayerStore();

  const [fadeVolume, setFadeVolume] = useState<boolean>(true);
  const [action, setAction] = useState<"pause" | "closeApp">("pause");

  useEffect(() => {
    if (sleepTimer.isActive) {
      setFadeVolume(sleepTimer.fadeVolumeOnEnd);
      setAction(sleepTimer.action);
    }
  }, [sleepTimer]);

  if (!isOpen) return null;

  const presets = [15, 30, 45, 60, 90, 120];
  const videoRemainingMins =
    duration > currentTime ? Math.ceil((duration - currentTime) / 60) : null;

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleStart = (mins: number) => {
    startSleepTimer(mins, fadeVolume, action);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="ui-glass-panel w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: accentColor, borderColor: accentColor, color: accentText }}
              className="w-8 h-8 rounded-xl border flex items-center justify-center"
            >
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Night Listening & Sleep Timer
              </h2>
              <p className="text-xs text-neutral-400">
                Auto-stop playback and dialogue leveling for peaceful listening
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Active Countdown Card */}
          {sleepTimer.isActive && (
            <div
              style={{ backgroundColor: accentGlow, borderColor: accentColor }}
              className="p-4 rounded-xl border flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span style={{ backgroundColor: accentColor }} className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"></span>
                    <span style={{ backgroundColor: accentColor }} className="relative inline-flex rounded-full h-2.5 w-2.5"></span>
                  </span>
                  <span className="text-white text-xs font-semibold uppercase tracking-wider">
                    Sleep Timer Active
                  </span>
                </div>
                <span className="text-white text-xl font-mono font-bold">
                  {formatCountdown(sleepTimer.remainingSeconds)}
                </span>
              </div>

              <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                <div
                  style={{
                    backgroundColor: accentColor,
                    width: `${
                      sleepTimer.totalSeconds > 0
                        ? (sleepTimer.remainingSeconds / sleepTimer.totalSeconds) * 100
                        : 0
                    }%`,
                  }}
                  className="h-full transition-all duration-1000 ease-linear rounded-full"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => addSleepTimerMinutes(15)}
                  style={{ backgroundColor: accentColor, color: accentText, boxShadow: `0 2px 10px ${accentGlow}` }}
                  className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 hover:brightness-125"
                >
                  <Plus className="w-3.5 h-3.5" /> +15 min
                </button>
                <button
                  onClick={() => addSleepTimerMinutes(30)}
                  style={{ backgroundColor: accentColor, color: accentText, boxShadow: `0 2px 10px ${accentGlow}` }}
                  className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 hover:brightness-125"
                >
                  <Plus className="w-3.5 h-3.5" /> +30 min
                </button>
                <button
                  onClick={cancelSleepTimer}
                  className="py-1.5 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Clock style={{ color: accentColor }} className="w-3.5 h-3.5" />
              <span>Set Sleep Timer Duration</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((mins) => {
                const isActive =
                  sleepTimer.isActive &&
                  Math.ceil(sleepTimer.totalSeconds / 60) === mins;
                return (
                  <button
                    key={mins}
                    onClick={() => handleStart(mins)}
                    style={
                      isActive
                        ? {
                            backgroundColor: accentColor,
                            color: accentText,
                            boxShadow: `0 4px 14px ${accentGlow}`,
                          }
                        : undefined
                    }
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition text-center ${
                      isActive
                        ? "font-bold shadow-lg"
                        : "bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10 hover:border-white/10"
                    }`}
                  >
                    {mins} min
                  </button>
                );
              })}

              {videoRemainingMins && videoRemainingMins > 1 && (
                <button
                  onClick={() => handleStart(videoRemainingMins)}
                  className="col-span-3 py-2 px-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium transition flex items-center justify-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>End of current track/video (~{videoRemainingMins}m)</span>
                </button>
              )}
            </div>
          </div>

          {/* Sleep Options */}
          <div className="space-y-3 pt-1 border-t border-white/10">
            {/* Fade volume option */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition cursor-pointer">
              <div className="flex items-center gap-3">
                <Volume2 style={{ color: accentColor }} className="w-4 h-4 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Gentle Volume Fade-out
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Smoothly lowers volume over final 45 seconds before pausing
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={fadeVolume}
                onChange={(e) => setFadeVolume(e.target.checked)}
                style={{ accentColor }}
                className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </label>

            {/* When timer ends action */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="text-xs font-semibold text-white">
                When Timer Reaches Zero:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAction("pause")}
                  style={action === "pause" ? { backgroundColor: accentColor, borderColor: accentColor, color: accentText, boxShadow: `0 2px 10px ${accentGlow}` } : undefined}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                    action === "pause"
                      ? "font-semibold"
                      : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
                  }`}
                >
                  <Pause className="w-3.5 h-3.5" /> Pause Media
                </button>
                <button
                  type="button"
                  onClick={() => setAction("closeApp")}
                  style={action === "closeApp" ? { backgroundColor: accentColor, borderColor: accentColor, color: accentText, boxShadow: `0 2px 10px ${accentGlow}` } : undefined}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                    action === "closeApp"
                      ? "font-semibold"
                      : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" /> Exit Player
                </button>
              </div>
            </div>

            {/* Pause on System Sleep */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition cursor-pointer">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Pause When Computer Sleeps or Locks
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Automatically halts playback when Windows enters sleep or lock screen
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={pauseOnSystemSleep}
                onChange={(e) => setPauseOnSystemSleep(e.target.checked)}
                style={{ accentColor }}
                className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </label>

            {/* Night Listening Mode Toggle */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition cursor-pointer">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Night Listening (Dynamic Dialogue Boost)
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Levels audio dynamic range: elevates whispers and softens explosions
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isNightListening}
                onChange={() => toggleNightListening()}
                style={{ accentColor }}
                className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-end">
          <button
            onClick={onClose}
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 4px 14px ${accentGlow}`,
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold transition shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
