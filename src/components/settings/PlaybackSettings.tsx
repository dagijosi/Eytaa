import { useState, useEffect } from "react";
import { PictureInPicture2, Sliders, Camera, FolderOpen, RotateCcw, Globe } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { playerService } from "../../services/player/mpvPlayerService";
import { storageService } from "../../services/storage/storageService";
import { metadataScraperService } from "../../services/metadata/metadataScraperService";
import { SimpleModeCallout } from "./shared";
import type { SettingsMode } from "./types";
import { SelectDropdown, SelectDropdownOption } from "../common/SelectDropdown";
import { usePlayerStore } from "../../stores/playerStore";

const QUEUE_ON_PLAY_OPTIONS: SelectDropdownOption<"replace" | "append" | "ask">[] = [
  {
    value: "replace",
    label: "Start Fresh Queue",
    shortLabel: "Fresh Queue (Recommended)",
    desc: "Clears previous media queue when opening a new movie or show",
  },
  {
    value: "append",
    label: "Append to Existing Queue",
    shortLabel: "Append to Queue",
    desc: "Keeps existing items and adds new media to the end",
  },
  {
    value: "ask",
    label: "Always Ask",
    shortLabel: "Always Ask",
    desc: "Prompts whether to replace or append when queue has items",
  },
];

const EDGE_HOVER_TRIGGER_OPTIONS: SelectDropdownOption<"fullscreen" | "always" | "button_only" | "click_only">[] = [
  {
    value: "fullscreen",
    label: "Fullscreen Only",
    shortLabel: "Fullscreen Only (Recommended)",
    desc: "Auto-peeks on edge in fullscreen; in windowed mode, requires hovering or clicking the edge button",
  },
  {
    value: "always",
    label: "Always (Windowed & Fullscreen)",
    shortLabel: "Always",
    desc: "Hovering the screen edge auto-peeks open the playlist in both windowed and fullscreen display",
  },
  {
    value: "button_only",
    label: "Button Hover Only",
    shortLabel: "Button Hover",
    desc: "Only hovering directly over the edge button tab opens the drawer, preventing edge misfires",
  },
  {
    value: "click_only",
    label: "Click Button Only",
    shortLabel: "Click Button Only",
    desc: "Only clicking the edge button opens the drawer; never expands automatically on hover",
  },
];

const HWDEC_OPTIONS: SelectDropdownOption<string>[] = [
  {
    value: "auto-safe",
    label: "auto-safe",
    shortLabel: "auto-safe (Recommended)",
    desc: "Safe hardware decoding fallback (Recommended)",
  },
  {
    value: "auto",
    label: "auto",
    shortLabel: "auto (Aggressive)",
    desc: "Aggressive hardware acceleration on all formats",
  },
  {
    value: "d3d11va",
    label: "d3d11va",
    shortLabel: "d3d11va (Windows Direct3D)",
    desc: "DirectX 11 Video Acceleration",
  },
  {
    value: "no",
    label: "no",
    shortLabel: "no (Software CPU)",
    desc: "Software decoding via CPU only",
  },
];

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
  const {
    queueOnPlayMode,
    setQueueOnPlayMode,
    edgeHoverPlaylistEnabled,
    setEdgeHoverPlaylistEnabled,
    edgeHoverPlaylistTrigger,
    setEdgeHoverPlaylistTrigger,
    autoplayNextEpisodeEnabled,
    setAutoplayNextEpisodeEnabled,
  } = usePlayerStore();

  const [screenshotDir, setScreenshotDir] = useState<string>("");
  const [tmdbApiKey, setTmdbApiKey] = useState<string>("");

  useEffect(() => {
    storageService.getPreference<string>("screenshotDirectory").then((dir) => {
      if (dir) setScreenshotDir(dir);
      else {
        try {
          const stored = localStorage.getItem("eytaa_screenshot_dir");
          if (stored) setScreenshotDir(stored);
        } catch {}
      }
    });

    storageService.getPreference<string>("tmdbApiKey").then((key) => {
      if (key) setTmdbApiKey(key);
    });
  }, []);

  const handleSaveTmdbApiKey = async (val: string) => {
    setTmdbApiKey(val);
    await metadataScraperService.setApiKey(val);
  };

  const handlePickScreenshotDir = async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: "Select Screenshot Destination Folder",
      });
      if (selected && typeof selected === "string") {
        setScreenshotDir(selected);
        await storageService.setPreference("screenshotDirectory", selected);
        try {
          localStorage.setItem("eytaa_screenshot_dir", selected);
        } catch {}
        showOSD("Screenshot directory updated");
      }
    } catch (err) {
      console.warn("Folder picker failed:", err);
    }
  };

  const handleResetScreenshotDir = async () => {
    setScreenshotDir("");
    await storageService.setPreference("screenshotDirectory", null);
    try {
      localStorage.removeItem("eytaa_screenshot_dir");
    } catch {}
    showOSD("Screenshots will save next to active media file");
  };
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
              backgroundColor: accentColor,
              borderColor: accentColor,
              color: accentText,
              boxShadow: `0 2px 10px ${accentGlow}`,
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

      {/* Netflix-Style Next Episode Binge Countdown Overlay */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">
            Next Episode Binge Autoplay Card
          </span>
          <p className="text-xs text-neutral-500">
            Show a Netflix-style floating countdown card 20s before the end of TV episodes with 1-click &quot;Play Now&quot; and &quot;Stay&quot; options
          </p>
        </div>
        <input
          type="checkbox"
          checked={autoplayNextEpisodeEnabled}
          onChange={(e) => setAutoplayNextEpisodeEnabled(e.target.checked)}
          style={{ accentColor }}
          className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>

      {/* Queue Strategy when Opening Media */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">
            Queue Behavior on Open
          </span>
          <p className="text-xs text-neutral-500">
            Choose whether opening a new movie or video starts a fresh queue or appends to your existing list
          </p>
        </div>
        <SelectDropdown<"replace" | "append" | "ask">
          value={queueOnPlayMode}
          onChange={setQueueOnPlayMode}
          options={QUEUE_ON_PLAY_OPTIONS}
          menuHeader="When Opening Media"
          width="w-64"
        />
      </div>

      {/* Edge Hover Playlist Peek */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">
            Edge Reveal Playlist Tab
          </span>
          <p className="text-xs text-neutral-500">
            Show the edge indicator tab when your mouse approaches the right screen edge
          </p>
        </div>
        <input
          type="checkbox"
          checked={edgeHoverPlaylistEnabled}
          onChange={(e) => setEdgeHoverPlaylistEnabled(e.target.checked)}
          style={{ accentColor }}
          className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>

      {edgeHoverPlaylistEnabled && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
          <div>
            <span className="font-medium text-neutral-200 text-xs">
              Auto-Open Full Drawer
            </span>
            <p className="text-xs text-neutral-500">
              Control when the playlist drawer automatically expands vs requiring button interaction
            </p>
          </div>
          <SelectDropdown<"fullscreen" | "always" | "button_only" | "click_only">
            value={edgeHoverPlaylistTrigger}
            onChange={setEdgeHoverPlaylistTrigger}
            options={EDGE_HOVER_TRIGGER_OPTIONS}
            menuHeader="Auto-Open Trigger"
            width="w-64"
          />
        </div>
      )}

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

      {/* Screenshot & Frame Capture Destination */}
      <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-neutral-400" />
            <div>
              <span className="font-medium text-neutral-200 text-xs">
                Lossless Screenshot Save Location
              </span>
              <p className="text-xs text-neutral-500">
                Custom directory for captured frame PNGs (<code className="text-neutral-400 font-mono">S</code> clean, <code className="text-neutral-400 font-mono">Shift+S</code> with subs, <code className="text-neutral-400 font-mono">Ctrl+Shift+S</code> to clipboard)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handlePickScreenshotDir}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition cursor-pointer border border-white/10"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>{screenshotDir ? "Change Folder" : "Choose Folder"}</span>
            </button>
            {screenshotDir && (
              <button
                onClick={handleResetScreenshotDir}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer border border-white/10"
                title="Reset to default (Save alongside media file)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="px-3 py-2 rounded-lg bg-black/30 border border-white/5 font-mono text-[11px] text-neutral-300 truncate">
          {screenshotDir ? (
            <span className="text-neutral-200">{screenshotDir}</span>
          ) : (
            <span className="text-neutral-500 italic">Default: Alongside active media file (or Pictures/EYTAA Screenshots for streams)</span>
          )}
        </div>
      </div>

      {/* TMDb Online Metadata & Artwork Scraper Key */}
      <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-neutral-300" />
            <div>
              <span className="font-medium text-neutral-200 text-xs">
                TMDb Scraper API Key
              </span>
              <p className="text-xs text-neutral-500">
                Powers automatic movie and TV artwork, release years, and synopses in the library editor
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              tmdbApiKey
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-white/10 text-neutral-400 border-white/10"
            }`}
          >
            {tmdbApiKey ? "Custom Key Active" : "Default Key Active"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="password"
            value={tmdbApiKey}
            onChange={(e) => handleSaveTmdbApiKey(e.target.value)}
            placeholder="Paste personal TMDb API Key (v3)..."
            className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 focus:border-white/30 text-xs text-white font-mono placeholder-neutral-600 focus:outline-none"
          />
          {tmdbApiKey && (
            <button
              onClick={() => handleSaveTmdbApiKey("")}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer border border-white/10"
              title="Clear API key"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span>Required for online movie and TV series metadata fetching.</span>
          <span className="text-neutral-400">Get a free key at themoviedb.org/settings/api</span>
        </div>
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
            <SelectDropdown<string>
              value={hwdec}
              onChange={async (val) => {
                setHwdec(val);
                await storageService.setPreference("hwdec", val);
                await playerService.setMpvProperty("hwdec", val);
                showOSD(`Hardware Decoding: ${val}`);
              }}
              options={HWDEC_OPTIONS}
              menuHeader="Hardware Decoding Mode"
              width="w-72"
            />
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
