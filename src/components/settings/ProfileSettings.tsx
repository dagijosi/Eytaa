import { Check, Film, Headphones, Layers, Mic, Pencil, Plus, RotateCcw, Sliders, Trash2, Tv } from "lucide-react";
import type { PlaybackProfile } from "../../services/player/profileTypes";
import { SimpleModeCallout } from "./shared";
import type { ProfileIconName, SettingsMode } from "./types";

interface ProfileSettingsProps {
  accentColor: string;
  accentGlow: string;
  accentText: string;
  settingsMode: SettingsMode;
  handleModeChange: (mode: SettingsMode) => void;
  resetProfiles: () => Promise<void>;
  profiles: PlaybackProfile[];
  activeProfileId: string;
  applyProfile: (profileId: string) => Promise<void>;
  deleteCustomProfile: (profileId: string) => Promise<void>;
  isCreatingProfile: boolean;
  setIsCreatingProfile: (creating: boolean) => void;
  setEditingProfileId: (id: string | null) => void;
  newProfileName: string;
  setNewProfileName: (name: string) => void;
  newProfileIcon: ProfileIconName;
  setNewProfileIcon: (icon: ProfileIconName) => void;
  handleSaveCustomProfile: () => Promise<void>;
  handleEditProfile: (p: PlaybackProfile) => void;
  contrast: number;
  brightness: number;
  saturation: number;
  playbackRate: number;
}

export function ProfileSettings({
  accentColor,
  accentGlow,
  accentText,
  settingsMode,
  handleModeChange,
  resetProfiles,
  profiles,
  activeProfileId,
  applyProfile,
  deleteCustomProfile,
  isCreatingProfile,
  setIsCreatingProfile,
  setEditingProfileId,
  newProfileName,
  setNewProfileName,
  newProfileIcon,
  setNewProfileIcon,
  handleSaveCustomProfile,
  handleEditProfile,
  contrast,
  brightness,
  saturation,
  playbackRate,
}: ProfileSettingsProps) {
  const getProfileIcon = (icon: string) => {
    switch (icon) {
      case "tv":
      case "sparkles":
        return <Tv style={{ color: accentColor }} className="w-4 h-4" />;
      case "layers":
        return <Layers style={{ color: accentColor }} className="w-4 h-4" />;
      case "film":
        return <Film className="w-4 h-4 text-rose-400" />;
      case "headphones":
        return <Headphones className="w-4 h-4 text-sky-400" />;
      case "mic":
        return <Mic className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sliders className="w-4 h-4 text-neutral-300" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            Playback Profiles
          </h3>
          <p className="text-xs text-neutral-400">
            Tailored picture, audio, subtitle, and speed presets for different genres
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetProfiles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition active:scale-95 cursor-pointer"
            title="Reset all profiles to default factory presets"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          {settingsMode === "advanced" && (
            <button
              onClick={() => {
                setEditingProfileId(null);
                setIsCreatingProfile(!isCreatingProfile);
              }}
              style={{
                backgroundColor: `${accentGlow}`,
                color: accentColor,
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:brightness-110 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Current as Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Creation Drawer (Advanced Mode Only) */}
      {settingsMode === "advanced" && isCreatingProfile && (
        <div
          style={{
            borderColor: `${accentColor}50`,
          }}
          className="p-4 rounded-xl bg-white/5 border space-y-3 animate-in fade-in duration-150"
        >
          <div
            style={{ color: accentColor }}
            className="text-xs font-bold"
          >
            Create New Playback Profile
          </div>
          <p className="text-xs text-neutral-400">
            Saves current contrast ({contrast}), brightness ({brightness}), saturation ({saturation}), speed ({playbackRate}x), and subtitles into a profile.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Profile name (e.g. Late Night Anime)"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-800 border border-white/10 text-xs text-white focus:outline-none"
            />
            <select
              value={newProfileIcon}
              onChange={(e) =>
                setNewProfileIcon(e.target.value as any)
              }
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-white/10 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="tv">📺 TV & Anime</option>
              <option value="layers">📑 Profile Preset</option>
              <option value="film">🎬 Film (Movies)</option>
              <option value="headphones">🎧 Headphones (Music)</option>
              <option value="mic">🎙️ Mic (Podcasts)</option>
              <option value="sliders">🎚️ Sliders (General)</option>
            </select>
            <button
              onClick={handleSaveCustomProfile}
              disabled={!newProfileName.trim()}
              style={{
                backgroundColor: accentColor,
                color: accentText,
              }}
              className="px-3.5 py-1.5 rounded-lg disabled:opacity-50 font-bold text-xs transition active:scale-95 shadow"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Profiles List */}
      <div className="grid grid-cols-1 gap-2.5">
        {profiles.map((p) => {
          const isActive = activeProfileId === p.id;
          return (
            <div
              key={p.id}
              style={{
                borderColor: isActive ? `${accentColor}70` : undefined,
                backgroundColor: isActive ? `${accentGlow}` : undefined,
                boxShadow: isActive ? `0 4px 18px ${accentGlow}` : undefined,
              }}
              className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                isActive
                  ? "text-white"
                  : "bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="p-2 rounded-lg bg-white/10 shrink-0 mt-0.5">
                  {getProfileIcon(p.icon)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">
                      {p.name}
                    </span>
                    {p.isBuiltIn && (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-400">
                        Built-in
                      </span>
                    )}
                    {isActive && (
                      <span
                        style={{ color: accentColor }}
                        className="text-[10px] font-bold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {p.description}
                  </p>
                  {settingsMode === "advanced" && (
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-neutral-500">
                      <span>Saturation: {p.settings.saturation > 0 ? `+${p.settings.saturation}` : p.settings.saturation}</span>
                      <span>Contrast: {p.settings.contrast > 0 ? `+${p.settings.contrast}` : p.settings.contrast}</span>
                      <span>Speed: {p.settings.playbackRate}x</span>
                      <span>Sub: {p.settings.subFontSize}px</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                {!isActive ? (
                  <button
                    onClick={() => applyProfile(p.id)}
                    style={{
                      backgroundColor: `${accentGlow}`,
                      color: accentColor,
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:brightness-110 transition active:scale-95"
                  >
                    Apply
                  </button>
                ) : (
                  <span
                    style={{
                      backgroundColor: accentColor,
                      color: accentText,
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold shadow"
                  >
                    Applied
                  </span>
                )}

                {settingsMode === "advanced" && !p.isBuiltIn && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditProfile(p)}
                      title="Edit custom profile"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCustomProfile(p.id)}
                      title="Delete custom profile"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Simple Mode Switch Callout */}
      {settingsMode === "simple" && (
        <SimpleModeCallout
          icon={<Layers className="w-4 h-4 text-neutral-400" />}
          text="Want to design custom profiles with tailored contrast, speed, and audio EQ?"
          accentColor={accentColor}
          handleModeChange={handleModeChange}
        />
      )}
    </div>
  );
}
