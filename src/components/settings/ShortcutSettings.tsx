import { useEffect, useState } from "react";
import { Mouse, Radio, RotateCcw } from "lucide-react";
import { globalShortcutsService } from "../../services/shortcuts/globalShortcutsService";
import {
  localShortcutsService,
  LOCAL_ACTION_META,
  displayKey,
  LocalAction,
  LocalShortcutsConfig,
} from "../../services/shortcuts/localShortcutsService";
import { SimpleModeCallout } from "./shared";
import type { SettingsMode } from "./types";

interface ShortcutSettingsProps {
  accentColor: string;
  accentGlow: string;
  settingsMode: SettingsMode;
  handleModeChange: (mode: SettingsMode) => void;
  isGlobalShortcutsEnabled: boolean;
  toggleGlobalShortcuts: (enabled: boolean) => Promise<void>;
  scrollVolumeEnabled: boolean;
  setScrollVolumeEnabled: (enabled: boolean) => Promise<void>;
}

export function ShortcutSettings({
  accentColor,
  accentGlow,
  settingsMode,
  handleModeChange,
  isGlobalShortcutsEnabled,
  toggleGlobalShortcuts,
  scrollVolumeEnabled,
  setScrollVolumeEnabled,
}: ShortcutSettingsProps) {
  // Global shortcuts config
  const [mediaKeysEnabled, setMediaKeysEnabled] = useState(true);
  const [comboKeysEnabled, setComboKeysEnabled] = useState(true);

  useEffect(() => {
    const gCfg = globalShortcutsService.getConfig();
    setMediaKeysEnabled(gCfg.mediaKeys);
    setComboKeysEnabled(gCfg.comboKeys);
  }, []);

  // Rebindable local shortcut editor state
  const [shortcutConfig, setShortcutConfig] = useState<LocalShortcutsConfig>(() =>
    localShortcutsService.getConfig(),
  );
  const [capturingAction, setCapturingAction] = useState<LocalAction | null>(null);

  useEffect(() => {
    const unsubscribe = localShortcutsService.subscribe(setShortcutConfig);
    localShortcutsService.whenReady().then(() => {
      setShortcutConfig(localShortcutsService.getConfig());
    });
    return unsubscribe;
  }, []);

  // Capture-mode: intercept the next pressed key and bind it to the action
  useEffect(() => {
    if (!capturingAction) return;
    const onCaptureKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const key = e.key.toLowerCase();
      // Wait for a real key; pure modifiers and Escape cancel the capture
      if (key === "escape" || key === "control" || key === "shift" || key === "alt" || key === "meta") {
        setCapturingAction(null);
        return;
      }
      localShortcutsService.setBinding(capturingAction, [key]);
      setCapturingAction(null);
    };
    window.addEventListener("keydown", onCaptureKey, true);
    return () => window.removeEventListener("keydown", onCaptureKey, true);
  }, [capturingAction]);

  return (
    <div className="space-y-5">
      {/* Simple Mode Switch Callout */}
      {settingsMode === "simple" && (
        <SimpleModeCallout
          icon={<Radio className="w-4 h-4 text-neutral-400" />}
          text="Looking for background global media keys and system-wide hotkey hooks?"
          accentColor={accentColor}
          handleModeChange={handleModeChange}
        />
      )}

      {/* Global Media Shortcuts Banner (Advanced Mode Only) */}
      {settingsMode === "advanced" && (
        <div
          style={{
            background: `linear-gradient(to right, ${accentGlow}, transparent)`,
            borderColor: `${accentColor}40`,
          }}
          className="p-4 rounded-xl border space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Radio style={{ color: accentColor }} className="w-4 h-4" />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Global Background Media Shortcuts</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
                    ADVANCED
                  </span>
                </div>
                <div className="text-xs text-neutral-400">
                  Control playback from anywhere without focusing the player window
                </div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={isGlobalShortcutsEnabled}
              onChange={(e) => toggleGlobalShortcuts(e.target.checked)}
              style={{ accentColor }}
              className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
          </div>

          {isGlobalShortcutsEnabled && (
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-3">
              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mediaKeysEnabled}
                  onChange={async (e) => {
                    setMediaKeysEnabled(e.target.checked);
                    await globalShortcutsService.updateConfig({
                      mediaKeys: e.target.checked,
                    });
                  }}
                  style={{ accentColor }}
                  className="rounded cursor-pointer"
                />
                <span>Hardware Media Keys (Play/Pause, Next, Prev)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={comboKeysEnabled}
                  onChange={async (e) => {
                    setComboKeysEnabled(e.target.checked);
                    await globalShortcutsService.updateConfig({
                      comboKeys: e.target.checked,
                    });
                  }}
                  style={{ accentColor }}
                  className="rounded cursor-pointer"
                />
                <span>Global Combos (Ctrl+Alt+Space, Ctrl+Alt+Arrows)</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Rebindable Local App Shortcuts Editor */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            In-App Keyboard Shortcuts
          </h4>
          <button
            onClick={() => localShortcutsService.resetAll()}
            style={{ color: accentColor }}
            className="flex items-center gap-1.5 text-[11px] font-bold hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Restore Defaults
          </button>
        </div>
        <div className="space-y-3">
          {(["Playback", "Seeking", "Volume", "View", "Tools"] as const).map((group) => {
            const actions = (
              Object.keys(LOCAL_ACTION_META) as LocalAction[]
            ).filter((a) => LOCAL_ACTION_META[a].group === group);
            if (actions.length === 0) return null;
            return (
              <div key={group}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 px-0.5">
                  {group}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {actions.map((action) => {
                    const meta = LOCAL_ACTION_META[action];
                    const keys = shortcutConfig[action] || [];
                    const isDefault =
                      JSON.stringify([...keys].sort()) ===
                      JSON.stringify([...meta.defaultKeys].sort());
                    const isCapturing = capturingAction === action;
                    return (
                      <div
                        key={action}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border text-xs ${
                          isCapturing
                            ? "border-amber-400/50 bg-amber-400/5"
                            : "border-white/5"
                        }`}
                      >
                        <span className="text-neutral-400 truncate">{meta.label}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isCapturing ? (
                            <span className="text-[11px] font-bold text-amber-400 animate-pulse">
                              Press a key… (Esc cancels)
                            </span>
                          ) : (
                            <>
                              {keys.length === 0 ? (
                                <span className="text-[10px] italic text-amber-400/70">
                                  Unbound
                                </span>
                              ) : (
                                keys.map((k) => (
                                  <kbd
                                    key={k}
                                    style={{ color: accentColor }}
                                    className="px-2 py-0.5 rounded-lg bg-neutral-800 font-mono text-[11px] border border-white/10 shadow-sm font-semibold"
                                  >
                                    {displayKey(k)}
                                  </kbd>
                                ))
                              )}
                              <button
                                onClick={() => setCapturingAction(action)}
                                style={{ color: accentColor }}
                                className="text-[10px] font-bold hover:underline cursor-pointer px-1"
                              >
                                Rebind
                              </button>
                              {!isDefault && (
                                <button
                                  onClick={() => localShortcutsService.resetBinding(action)}
                                  title="Reset to default"
                                  className="text-neutral-500 hover:text-white transition cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mouse Controls */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
          Mouse Controls
        </h4>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Mouse className="w-4 h-4 text-neutral-400 shrink-0" />
            <div>
              <div className="text-neutral-300 font-semibold">
                Scroll wheel adjusts volume
              </div>
              <div className="text-[11px] text-neutral-500">
                Scroll up / down while hovering the video to change volume (±3% per notch)
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={scrollVolumeEnabled}
            onChange={(e) => setScrollVolumeEnabled(e.target.checked)}
            style={{ accentColor }}
            className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Static Reference for Hardcoded Modifiers */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-[11px] text-neutral-500">
        <div className="font-bold text-neutral-400 text-xs">Fixed Keys</div>
        <div>
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 font-mono border border-white/10">
            Esc
          </kbd>{" "}
          closes menus, drawers, and Picture-in-Picture (not rebindable)
        </div>
        <div>
          Hold{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 font-mono border border-white/10">
            Shift
          </kbd>{" "}
          while seeking for ±30s instead of ±10s, or with Playlist to toggle PiP
        </div>
      </div>
    </div>
  );
}
