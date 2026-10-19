import {
  Sliders,
  RotateCcw,
  Keyboard,
  History,
  Tv,
  Music2,
  Moon,
  Palette,
  Download,
  Layers,
} from "lucide-react";
import type { SettingsMode, SettingsTab } from "./types";

interface TabNavItem {
  id: SettingsTab;
  label: string;
  icon: any;
}

interface SettingsSidebarProps {
  accentColor: string;
  accentGlow: string;
  accentText: string;
  settingsMode: SettingsMode;
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
  appVersion: string;
  onRequestRestore: () => void;
}

export function SettingsSidebar({
  accentColor,
  accentGlow,
  accentText,
  settingsMode,
  activeTab,
  onSelectTab,
  appVersion,
  onRequestRestore,
}: SettingsSidebarProps) {
  const simpleTabs: TabNavItem[] = [
    { id: "playback", label: "General", icon: Sliders },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "profiles", label: "Profiles", icon: Layers },
    { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
    { id: "updates", label: "Updates", icon: Download },
  ];

  const advancedCoreTabs: TabNavItem[] = [
    { id: "playback", label: "General", icon: Sliders },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "profiles", label: "Profiles", icon: Layers },
    { id: "updates", label: "Updates", icon: Download },
  ];

  const advancedProTabs: TabNavItem[] = [
    { id: "video", label: "Picture Calibration", icon: Tv },
    { id: "audio", label: "Audio & Sync", icon: Music2 },
    { id: "sleep", label: "Night & Sleep", icon: Moon },
    { id: "shortcuts", label: "Global Shortcuts", icon: Keyboard },
    { id: "history", label: "Playback History", icon: History },
  ];

  return (
    <div className="w-56 bg-neutral-950/85 border-r border-white/10 flex flex-col justify-between p-3.5 shrink-0 select-none">
      <div className="space-y-3 min-h-0 flex flex-col">
        {/* Sidebar Title */}
        <div className="px-2.5 py-1.5 flex items-center gap-2.5 shrink-0">
          <div
            style={{ backgroundColor: accentColor, color: accentText, boxShadow: `0 2px 10px ${accentGlow}` }}
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          >
            <Sliders className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white tracking-wide">Settings</div>
            <div className="text-[10px] text-neutral-400">EYTAA Player</div>
          </div>
        </div>

        {/* Vertical Navigation Items */}
        <nav className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
          {settingsMode === "simple" ? (
            <div className="flex flex-col gap-1">
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                <span>Essentials</span>
                <span className="text-[9px] font-mono text-neutral-400">Simple</span>
              </div>
              {simpleTabs.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    style={{
                      backgroundColor: isSelected ? accentColor : undefined,
                      color: isSelected ? accentText : undefined,
                      boxShadow: isSelected ? `0 2px 14px ${accentGlow}` : "none",
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                      isSelected
                        ? "font-bold shadow"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Core Preferences
                </div>
                {advancedCoreTabs.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      style={{
                        backgroundColor: isSelected ? accentColor : undefined,
                        color: isSelected ? accentText : undefined,
                        boxShadow: isSelected ? `0 2px 14px ${accentGlow}` : "none",
                      }}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                        isSelected
                          ? "font-bold shadow"
                          : "text-neutral-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                  <span>Pro & Calibration</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-neutral-300 font-semibold">
                    ADVANCED
                  </span>
                </div>
                {advancedProTabs.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      style={{
                        backgroundColor: isSelected ? accentColor : undefined,
                        color: isSelected ? accentText : undefined,
                        boxShadow: isSelected ? `0 2px 14px ${accentGlow}` : "none",
                      }}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                        isSelected
                          ? "font-bold shadow"
                          : "text-neutral-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* Sidebar Footer info */}
      <div className="pt-3 border-t border-white/5 px-2 flex items-center justify-between text-[11px] text-neutral-400 shrink-0">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-neutral-300">
          <span>EYTAA</span>
          <span className="text-[10px] text-neutral-500 font-normal">{appVersion ? `v${appVersion}` : ""}</span>
        </div>
        <button
          onClick={onRequestRestore}
          className="text-neutral-500 hover:text-rose-400 text-[10px] transition cursor-pointer flex items-center gap-1 p-1 rounded hover:bg-white/5"
          title="Restore all factory defaults"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
