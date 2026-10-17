import { Moon, ShieldAlert } from "lucide-react";
import type { SleepTimerState } from "../../stores/playerStore";

interface SleepSettingsProps {
  accentColor: string;
  accentGlow: string;
  accentText: string;
  sleepTimer: SleepTimerState;
  addSleepTimerMinutes: (minutes: number) => void;
  cancelSleepTimer: () => void;
  startSleepTimer: (
    minutes: number,
    fadeVolume?: boolean,
    action?: "pause" | "closeApp",
  ) => void;
  pauseOnSystemSleep: boolean;
  setPauseOnSystemSleep: (enabled: boolean) => Promise<void>;
  isNightListening: boolean;
  toggleNightListening: () => Promise<void>;
}

export function SleepSettings({
  accentColor,
  accentGlow,
  accentText,
  sleepTimer,
  addSleepTimerMinutes,
  cancelSleepTimer,
  startSleepTimer,
  pauseOnSystemSleep,
  setPauseOnSystemSleep,
  isNightListening,
  toggleNightListening,
}: SleepSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
          Night Listening & Sleep Timer
        </h3>
        <p className="text-xs text-neutral-400">
          Stop playback after a chosen time and soften loud dynamics for relaxed listening
        </p>
      </div>

      {/* Active Sleep Timer Banner */}
      {sleepTimer.isActive && (
        <div
          style={{
            backgroundColor: `${accentGlow}`,
            borderColor: `${accentColor}50`,
          }}
          className="p-4 rounded-xl border flex items-center justify-between"
        >
          <div>
            <div
              style={{ color: accentColor }}
              className="text-xs font-bold flex items-center gap-2"
            >
              <span
                style={{ backgroundColor: accentColor }}
                className="w-2 h-2 rounded-full animate-ping"
              />
              Sleep Timer Countdown Active
            </div>
            <div
              style={{ color: accentColor }}
              className="text-2xl font-mono font-extrabold mt-1"
            >
              {Math.floor(sleepTimer.remainingSeconds / 60)}m{" "}
              {(sleepTimer.remainingSeconds % 60)
                .toString()
                .padStart(2, "0")}s
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => addSleepTimerMinutes(15)}
              style={{
                backgroundColor: `${accentGlow}`,
                color: accentColor,
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:brightness-110 transition active:scale-95"
            >
              +15 min
            </button>
            <button
              onClick={cancelSleepTimer}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sleep Timer Presets */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
        <div className="text-xs font-bold text-neutral-200">
          Quick Sleep Timer Presets
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[15, 30, 45, 60, 90, 120].map((mins) => {
            const isPresetActive =
              sleepTimer.isActive &&
              Math.ceil(sleepTimer.totalSeconds / 60) === mins;
            return (
              <button
                key={mins}
                onClick={() => startSleepTimer(mins, true, "pause")}
                style={{
                  backgroundColor: isPresetActive ? accentColor : undefined,
                  color: isPresetActive ? accentText : undefined,
                  borderColor: isPresetActive ? accentColor : undefined,
                  boxShadow: isPresetActive ? `0 2px 10px ${accentGlow}` : undefined,
                }}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition text-center ${
                  isPresetActive
                    ? "font-bold"
                    : "bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10 hover:border-white/10"
                }`}
              >
                {mins}m
              </button>
            );
          })}
        </div>
      </div>

      {/* Pause on System Sleep Toggle */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-sky-400 shrink-0" />
          <div>
            <span className="font-medium text-neutral-200 text-xs">
              Pause Playback on System Sleep or Lock
            </span>
            <p className="text-xs text-neutral-500">
              Automatically pause when your computer enters sleep mode or locks the screen
            </p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={pauseOnSystemSleep}
          onChange={(e) => setPauseOnSystemSleep(e.target.checked)}
          style={{ accentColor }}
          className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>

      {/* Night Listening Mode Toggle */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center gap-3">
          <Moon className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>
            <span className="font-medium text-neutral-200 text-xs">
              Night Listening (Dynamic Dialogue Compression)
            </span>
            <p className="text-xs text-neutral-500">
              Increases volume of whispered conversations and limits loud explosions
            </p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={isNightListening}
          onChange={() => toggleNightListening()}
          style={{ accentColor }}
          className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
