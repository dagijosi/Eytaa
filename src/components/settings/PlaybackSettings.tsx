import { PictureInPicture2, Sliders } from "lucide-react";
import { playerService } from "../../services/player/mpvPlayerService";
import { storageService } from "../../services/storage/storageService";
import { SimpleModeCallout } from "./shared";
import type { SettingsMode } from "./types";

interface PlaybackSettingsProps {
  accentColor: string;
  accentGlow: string;
  accentText: string;
  isPiP: boolean;
  togglePiP: () => Promise<void>;
  isAlwaysOnTop: boolean;
  toggleAlwaysOnTop: () => Promise<void>;
  autoResume: boolean;
  handleToggleAutoResume: () => Promise<void>;
  autoPlayNext: boolean;
  toggleAutoPlayNext: () => Promise<void>;
  showSkipIndicators: boolean;
  toggleShowSkipIndicators: (enabled?: boolean) => Promise<void>;
  autoCheckUpdates: boolean;
  toggleAutoCheckUpdates: (enabled?: boolean) => Promise<void>;
  settingsMode: SettingsMode;
  handleModeChange: (mode: SettingsMode) => void;
  hwdec: string;
  setHwdec: (value: string) => void;
  showOSD: (text: string) => void;
  allowMultipleWindows: boolean;
  handleToggleMultipleWindows: () => Promise<void>;
}

export function PlaybackSettings({
  accentColor,
  accentGlow,
  accentText,
  isPiP,
  togglePiP,
  isAlwaysOnTop,
  toggleAlwaysOnTop,
  autoResume,
  handleToggleAutoResume,
  autoPlayNext,
  toggleAutoPlayNext,
  showSkipIndicators,
  toggleShowSkipIndicators,
  autoCheckUpdates,
  toggleAutoCheckUpdates,
  settingsMode,
  handleModeChange,
  hwdec,
  setHwdec,
  showOSD,
  allowMultipleWindows,
  handleToggleMultipleWindows,
}: PlaybackSettingsProps) {
  return (
    <div className="space-y-4">
      {/* Picture-in-Picture Quick Launch */}
      <div
        style={{
          background: `linear-gradient(to right, ${accentGlow}, transparent)`,
          borderColor: `${accentColor}40`,
        }}
        className="p-4 rounded-xl border flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              backgroundColor: `${accentGlow}`,
              borderColor: `${accentColor}60`,
              color: accentColor,
            }}
            className="w-10 h-10 rounded-xl border flex items-center justify-center"
          >
            <PictureInPicture2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              Picture-in-Picture Mode
            </div>
            <div className="text-xs text-neutral-400">
              Compact, always-on-top mini player for working alongside other apps
            </div>
          </div>
        </div>

        <button
          onClick={togglePiP}
          style={{
            backgroundColor: accentColor,
            color: accentText,
            boxShadow: `0 2px 10px ${accentGlow}`,
          }}
          className="px-3.5 py-2 rounded-xl text-xs font-bold transition shadow hover:brightness-110 active:scale-95"
        >
          {isPiP ? "Exit PiP" : "Enter PiP"}
        </button>
      </div>

      {/* Always on top */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">
            Always On Top (Standard Window)
          </span>
          <p className="text-xs text-neutral-500">
            Keep player above other application windows even in normal mode
          </p>
        </div>
        <input
          type="checkbox"
          checked={isAlwaysOnTop}
          onChange={toggleAlwaysOnTop}
          style={{ accentColor }}
          className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>

      {/* Auto Resume */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">
            Resume Playback
          </span>
          <p className="text-xs text-neutral-500">
            Remember last played timestamp for every media file automatically
          </p>
        </div>
        <input
          type="checkbox"
          checked={autoResume}
          onChange={handleToggleAutoResume}
          style={{ accentColor }}
          className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>

      {/* Auto-Play Next Episode */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">
            Auto-Play Next Episode / Track
          </span>
          <p className="text-xs text-neutral-500">
            Advance to the next item in the playlist when the current media ends. Linked to Repeat: choosing "All" turns this on, choosing "One" turns it off.
          </p>
        </div>
        <input
          type="checkbox"
          checked={autoPlayNext}
          onChange={() => toggleAutoPlayNext()}
          style={{ accentColor }}
          className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>

      {/* Show Skip Indicators */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">
            Show Skip Indicators
          </span>
          <p className="text-xs text-neutral-500">
            Display visual forward (+10s) and rewind (-10s) animations on screen edges when skipping
          </p>
        </div>
        <input
          type="checkbox"
          checked={showSkipIndicators}
          onChange={() => toggleShowSkipIndicators()}
          style={{ accentColor }}
          className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>

      {/* Automatic Update Checks */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">
            Automatic Update Checks
          </span>
          <p className="text-xs text-neutral-500">
            Discreetly check for new versions in the background once every 24 hours without disturbing playback
          </p>
        </div>
        <input
          type="checkbox"
          checked={autoCheckUpdates}
          onChange={(e) => toggleAutoCheckUpdates(e.target.checked)}
          style={{ accentColor }}
          className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>

      {/* Simple Mode Switch Callout */}
      {settingsMode === "simple" && (
        <SimpleModeCallout
          icon={<Sliders className="w-4 h-4 text-neutral-400" />}
          text="Looking for GPU hardware decoding or multiple window playback?"
          accentColor={accentColor}
          handleModeChange={handleModeChange}
        />
      )}

      {/* Advanced Hardware & Concurrency Section */}
      {settingsMode === "advanced" && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-neutral-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Engine Hardware & Concurrency
              </h4>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
              ADVANCED
            </span>
          </div>

          {/* Hardware Decoding Mode */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
            <div>
              <span className="font-medium text-neutral-200 text-xs">
                GPU Hardware Decoding (hwdec)
              </span>
              <p className="text-xs text-neutral-500">
                Utilize NVIDIA, Intel, or AMD GPU for silky 4K/60fps HEVC/AV1 playback
              </p>
            </div>
            <select
              value={hwdec}
              onChange={async (e) => {
                const val = e.target.value;
                setHwdec(val);
                await storageService.setPreference("hwdec", val);
                await playerService.setMpvProperty("hwdec", val);
                showOSD(`Hardware Decoding: ${val}`);
              }}
              className="bg-neutral-800 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-none cursor-pointer font-mono"
            >
              <option value="auto-safe">auto-safe (Recommended)</option>
              <option value="auto">auto (Aggressive)</option>
              <option value="d3d11va">d3d11va (Windows Direct3D)</option>
              <option value="no">no (Software CPU)</option>
            </select>
          </div>

          {/* Multiple Windows Mode */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
            <div>
              <span className="font-medium text-neutral-200 text-xs">
                Allow Multiple Player Windows
              </span>
              <p className="text-xs text-neutral-500">
                Open each video in a new window so you can watch 2 or more videos simultaneously
              </p>
            </div>
            <input
              type="checkbox"
              checked={allowMultipleWindows}
              onChange={handleToggleMultipleWindows}
              style={{ accentColor }}
              className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
