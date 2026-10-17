import { useState } from "react";
import {
  Check,
  Film,
  Headphones,
  Layers,
  Mic,
  Pencil,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  Tv,
  Moon,
  Flame,
  Sparkles,
  Copy,
  Download,
  Upload,
  Eye,
  Info,
  Volume2,
  Sun,
  Type,
  Search,
  X,
} from "lucide-react";
import type { PlaybackProfile, ProfileSettings as ProfileSettingsType } from "../../services/player/profileTypes";
import { usePlayerStore } from "../../stores/playerStore";
import { playerService } from "../../services/player/mpvPlayerService";
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

type ProfileCategory = "all" | "cinema" | "audio" | "ambient" | "custom";

const SUB_COLOR_PRESETS = [
  { name: "Pure White", color: "#FFFFFF" },
  { name: "Anime Yellow", color: "#FFF176" },
  { name: "Soft Amber", color: "#FFE082" },
  { name: "Cinema Silver", color: "#EAEAEA" },
  { name: "Vintage Cream", color: "#FFF8E7" },
  { name: "Cyber Cyan", color: "#88C0D0" },
];

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
}: ProfileSettingsProps) {
  const storeSaveCustomProfile = usePlayerStore((s) => s.saveCustomProfile);

  // Filter & Search
  const [activeCategory, setActiveCategory] = useState<ProfileCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Profile Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formIcon, setFormIcon] = useState<ProfileIconName>("tv");
  const [formSettings, setFormSettings] = useState<ProfileSettingsType>({
    contrast: 0,
    brightness: 0,
    saturation: 0,
    gamma: 0,
    deinterlace: false,
    audioFilter: "",
    audioNormalize: false,
    audioDelay: 0,
    subFontSize: 55,
    subColor: "#FFFFFF",
    subDelay: 0,
    playbackRate: 1.0,
  });

  // Import / Export JSON modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");

  const getProfileIcon = (icon: string, size = "w-4 h-4") => {
    switch (icon) {
      case "tv":
        return <Tv style={{ color: accentColor }} className={size} />;
      case "sparkles":
        return <Sparkles className={`${size} text-amber-300`} />;
      case "moon":
        return <Moon className={`${size} text-indigo-400`} />;
      case "flame":
        return <Flame className={`${size} text-rose-500`} />;
      case "layers":
        return <Layers style={{ color: accentColor }} className={size} />;
      case "film":
        return <Film className={`${size} text-rose-400`} />;
      case "headphones":
        return <Headphones className={`${size} text-sky-400`} />;
      case "mic":
        return <Mic className={`${size} text-emerald-400`} />;
      default:
        return <Sliders className={`${size} text-neutral-300`} />;
    }
  };

  // Open editor for brand new profile
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormDesc("");
    setFormIcon("tv");
    setFormSettings({
      contrast: 0,
      brightness: 0,
      saturation: 0,
      gamma: 0,
      deinterlace: false,
      audioFilter: "",
      audioNormalize: false,
      audioDelay: 0,
      subFontSize: 55,
      subColor: "#FFFFFF",
      subDelay: 0,
      playbackRate: 1.0,
    });
    setIsEditorOpen(true);
  };

  // Open editor for editing existing custom profile
  const handleOpenEdit = (p: PlaybackProfile) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormDesc(p.description);
    setFormIcon(p.icon as ProfileIconName);
    setFormSettings({ ...p.settings });
    setIsEditorOpen(true);
  };

  // Duplicate ANY profile into a new custom profile
  const handleDuplicate = (p: PlaybackProfile) => {
    setEditingId(null);
    setFormName(`${p.name} (Custom)`);
    setFormDesc(`Customized copy based on ${p.name}`);
    setFormIcon(p.icon as ProfileIconName);
    setFormSettings({ ...p.settings });
    setIsEditorOpen(true);
    showToast(`Duplicated "${p.name}". You can now customize and save it.`);
  };

  // Test current editor settings directly in MPV player in real-time
  const handleTestInPlayer = async () => {
    try {
      await playerService.setMpvProperty("brightness", formSettings.brightness);
      await playerService.setMpvProperty("contrast", formSettings.contrast);
      await playerService.setMpvProperty("saturation", formSettings.saturation);
      await playerService.setMpvProperty("gamma", formSettings.gamma);
      await playerService.setMpvProperty("deinterlace", formSettings.deinterlace ? "yes" : "no");
      await playerService.setMpvProperty(
        "af",
        formSettings.audioFilter || (formSettings.audioNormalize ? "lavfi=[loudnorm]" : "")
      );
      await playerService.setMpvProperty("sub-font-size", formSettings.subFontSize);
      await playerService.setMpvProperty("sub-color", formSettings.subColor);
      await playerService.setPlaybackRate(formSettings.playbackRate);
      showToast("Settings previewed in player!");
    } catch {
      showToast("Unable to send preview to player.");
    }
  };

  // Save profile to store and persist
  const handleSaveProfile = async () => {
    if (!formName.trim()) {
      showToast("Please enter a profile name.");
      return;
    }
    const profileId = editingId || `custom-prof-${Date.now()}`;
    const newProfile: PlaybackProfile = {
      id: profileId,
      name: formName.trim(),
      description: formDesc.trim() || `Custom profile created on ${new Date().toLocaleDateString()}`,
      icon: formIcon,
      isBuiltIn: false,
      settings: formSettings,
    };

    await storeSaveCustomProfile(newProfile);
    await applyProfile(profileId);
    setIsEditorOpen(false);
    showToast(`Profile "${newProfile.name}" saved and applied!`);
  };

  // Export custom profiles to JSON clipboard
  const handleExportJson = async () => {
    const customProfiles = profiles.filter((p) => !p.isBuiltIn);
    if (customProfiles.length === 0) {
      showToast("No custom profiles to export yet.");
      return;
    }
    try {
      const json = JSON.stringify(customProfiles, null, 2);
      await navigator.clipboard.writeText(json);
      showToast("Custom profiles exported to clipboard as JSON!");
    } catch {
      showToast("Export failed.");
    }
  };

  // Import custom profiles from JSON text
  const handleImportJson = async () => {
    if (!importJsonText.trim()) return;
    try {
      const parsed = JSON.parse(importJsonText.trim());
      const list = Array.isArray(parsed) ? parsed : [parsed];
      let importedCount = 0;
      for (const item of list) {
        if (item.name && item.settings) {
          const importedProf: PlaybackProfile = {
            id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: item.name,
            description: item.description || "Imported playback profile",
            icon: item.icon || "sliders",
            isBuiltIn: false,
            settings: {
              contrast: item.settings.contrast ?? 0,
              brightness: item.settings.brightness ?? 0,
              saturation: item.settings.saturation ?? 0,
              gamma: item.settings.gamma ?? 0,
              deinterlace: !!item.settings.deinterlace,
              audioFilter: item.settings.audioFilter ?? "",
              audioNormalize: !!item.settings.audioNormalize,
              audioDelay: item.settings.audioDelay ?? 0,
              subFontSize: item.settings.subFontSize ?? 55,
              subColor: item.settings.subColor ?? "#FFFFFF",
              subDelay: item.settings.subDelay ?? 0,
              playbackRate: item.settings.playbackRate ?? 1.0,
            },
          };
          await storeSaveCustomProfile(importedProf);
          importedCount++;
        }
      }
      setIsImportModalOpen(false);
      setImportJsonText("");
      showToast(`Successfully imported ${importedCount} profile(s)!`);
    } catch {
      showToast("Invalid JSON format. Please verify the profile structure.");
    }
  };

  // Filter profiles based on category and search
  const filteredProfiles = profiles.filter((p) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }

    // Category filter
    switch (activeCategory) {
      case "cinema":
        return ["anime", "movie", "vivid-hdr", "action", "vintage"].includes(p.id) || ["tv", "film", "sparkles", "flame"].includes(p.icon);
      case "audio":
        return ["music", "speech"].includes(p.id) || ["headphones", "mic"].includes(p.icon);
      case "ambient":
        return ["latenight"].includes(p.id) || p.icon === "moon";
      case "custom":
        return !p.isBuiltIn;
      case "all":
      default:
        return true;
    }
  });

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{ backgroundColor: accentColor, color: accentText }}
          className="p-2.5 px-4 rounded-xl shadow-xl text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="opacity-80 hover:opacity-100 ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            Playback Profiles & Genre Tuning
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Pre-tuned picture, audio equalizer, subtitle typography, and playback speed presets
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition active:scale-95 cursor-pointer"
            title="Export custom profiles as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Import JSON */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition active:scale-95 cursor-pointer"
            title="Import profiles from JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Reset Defaults */}
          <button
            onClick={resetProfiles}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition active:scale-95 cursor-pointer"
            title="Reset all profiles to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* New Profile Button */}
          <button
            onClick={handleOpenCreate}
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 2px 10px ${accentGlow}`,
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Profile</span>
          </button>
        </div>
      </div>

      {/* JSON Import Modal */}
      {isImportModalOpen && (
        <div className="p-4 rounded-xl bg-black/60 border border-white/20 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" style={{ color: accentColor }} />
              Import Playback Profiles JSON
            </span>
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="text-neutral-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-neutral-400">
            Paste exported JSON data for one or multiple profiles:
          </p>
          <textarea
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            placeholder='[ { "name": "My Profile", "icon": "film", "settings": { ... } } ]'
            className="w-full h-24 p-2.5 rounded-lg bg-neutral-900 border border-white/10 text-xs font-mono text-neutral-200 focus:outline-none focus:border-white/30"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleImportJson}
              disabled={!importJsonText.trim()}
              style={{ backgroundColor: accentColor, color: accentText }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              Import Profiles
            </button>
          </div>
        </div>
      )}

      {/* IN-PLACE INTERACTIVE PROFILE EDITOR */}
      {isEditorOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/15 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-white/10">
                {getProfileIcon(formIcon, "w-4 h-4")}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  {editingId ? "Edit Playback Profile" : "Create New Custom Playback Profile"}
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Calibrate picture color, loudness EQ, speed, and subtitle appearance
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditorOpen(false)}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Identity: Name, Description, Icon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-neutral-300">Profile Name</label>
              <input
                type="text"
                placeholder="e.g. Midnight Cinema / Vivid Anime"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-neutral-300">Description</label>
              <input
                type="text"
                placeholder="Short description of this genre preset"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          {/* Icon Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-neutral-300">Icon Emblem</label>
            <div className="flex flex-wrap gap-1.5">
              {([
                { id: "tv", label: "Anime / TV", icon: <Tv className="w-3.5 h-3.5" /> },
                { id: "film", label: "Film / Movie", icon: <Film className="w-3.5 h-3.5 text-rose-400" /> },
                { id: "sparkles", label: "HDR Vivid", icon: <Sparkles className="w-3.5 h-3.5 text-amber-300" /> },
                { id: "flame", label: "Action", icon: <Flame className="w-3.5 h-3.5 text-rose-500" /> },
                { id: "moon", label: "Night Shift", icon: <Moon className="w-3.5 h-3.5 text-indigo-400" /> },
                { id: "headphones", label: "Music", icon: <Headphones className="w-3.5 h-3.5 text-sky-400" /> },
                { id: "mic", label: "Podcast", icon: <Mic className="w-3.5 h-3.5 text-emerald-400" /> },
                { id: "sliders", label: "Studio", icon: <Sliders className="w-3.5 h-3.5" /> },
                { id: "layers", label: "Custom", icon: <Layers className="w-3.5 h-3.5" /> },
              ] as const).map((ic) => {
                const isSelected = formIcon === ic.id;
                return (
                  <button
                    key={ic.id}
                    type="button"
                    onClick={() => setFormIcon(ic.id)}
                    style={isSelected ? { backgroundColor: accentColor, color: accentText } : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      isSelected
                        ? "border-transparent font-bold shadow"
                        : "bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    {ic.icon}
                    <span>{ic.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Video Picture Calibration */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" style={{ color: accentColor }} />
                Video Picture Calibration
              </span>
              <button
                type="button"
                onClick={() =>
                  setFormSettings((prev) => ({
                    ...prev,
                    contrast: 0,
                    brightness: 0,
                    saturation: 0,
                    gamma: 0,
                  }))
                }
                className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset Picture
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-300">
                  <span>Contrast</span>
                  <span className="font-mono text-neutral-400">
                    {formSettings.contrast > 0 ? `+${formSettings.contrast}` : formSettings.contrast}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={formSettings.contrast}
                  onChange={(e) =>
                    setFormSettings((prev) => ({ ...prev, contrast: parseInt(e.target.value) }))
                  }
                  style={{ accentColor }}
                  className="w-full cursor-pointer h-1 bg-white/20 rounded"
                />
              </div>

              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-300">
                  <span>Brightness</span>
                  <span className="font-mono text-neutral-400">
                    {formSettings.brightness > 0 ? `+${formSettings.brightness}` : formSettings.brightness}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={formSettings.brightness}
                  onChange={(e) =>
                    setFormSettings((prev) => ({ ...prev, brightness: parseInt(e.target.value) }))
                  }
                  style={{ accentColor }}
                  className="w-full cursor-pointer h-1 bg-white/20 rounded"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-300">
                  <span>Saturation</span>
                  <span className="font-mono text-neutral-400">
                    {formSettings.saturation > 0 ? `+${formSettings.saturation}` : formSettings.saturation}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={formSettings.saturation}
                  onChange={(e) =>
                    setFormSettings((prev) => ({ ...prev, saturation: parseInt(e.target.value) }))
                  }
                  style={{ accentColor }}
                  className="w-full cursor-pointer h-1 bg-white/20 rounded"
                />
              </div>

              {/* Gamma */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-300">
                  <span>Gamma</span>
                  <span className="font-mono text-neutral-400">
                    {formSettings.gamma > 0 ? `+${formSettings.gamma}` : formSettings.gamma}
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  value={formSettings.gamma}
                  onChange={(e) =>
                    setFormSettings((prev) => ({ ...prev, gamma: parseInt(e.target.value) }))
                  }
                  style={{ accentColor }}
                  className="w-full cursor-pointer h-1 bg-white/20 rounded"
                />
              </div>
            </div>
          </div>

          {/* 3. Audio & Speed Tuning */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Audio Mode */}
            <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" style={{ color: accentColor }} />
                Audio Equalizer & Dynamic Range
              </span>
              <div className="space-y-1.5">
                {[
                  {
                    id: "flat",
                    label: "Studio Flat",
                    desc: "Original unaltered audio balance",
                    filter: "",
                    normalize: false,
                  },
                  {
                    id: "loudnorm",
                    label: "Night Mode Loudnorm",
                    desc: "Level whisper & explosion dynamics",
                    filter: "lavfi=[loudnorm=I=-16:TP=-1.5:LRA=7]",
                    normalize: true,
                  },
                  {
                    id: "voice",
                    label: "Vocal Clarity Boost",
                    desc: "Isolate dialogue speech frequencies",
                    filter: "lavfi=[highpass=f=90,lowpass=f=4500,volume=2.0dB]",
                    normalize: true,
                  },
                ].map((aud) => {
                  const isMatch =
                    aud.id === "flat"
                      ? !formSettings.audioNormalize && !formSettings.audioFilter
                      : aud.id === "voice"
                      ? formSettings.audioFilter.includes("highpass")
                      : formSettings.audioNormalize && !formSettings.audioFilter.includes("highpass");
                  return (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() =>
                        setFormSettings((prev) => ({
                          ...prev,
                          audioFilter: aud.filter,
                          audioNormalize: aud.normalize,
                        }))
                      }
                      style={
                        isMatch
                          ? { backgroundColor: `${accentGlow}`, borderColor: accentColor }
                          : undefined
                      }
                      className={`w-full p-2 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                        isMatch
                          ? "border-white/30 text-white font-semibold"
                          : "bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10"
                      }`}
                    >
                      <div>
                        <div className="text-xs">{aud.label}</div>
                        <div className="text-[10px] text-neutral-400">{aud.desc}</div>
                      </div>
                      {isMatch && <Check className="w-3.5 h-3.5" style={{ color: accentColor }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Playback Speed */}
            <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" style={{ color: accentColor }} />
                Default Playback Speed
              </span>
              <p className="text-[11px] text-neutral-400">
                Speed applied automatically when selecting this profile
              </p>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[0.75, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0].map((rate) => {
                  const isSelected = formSettings.playbackRate === rate;
                  return (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setFormSettings((prev) => ({ ...prev, playbackRate: rate }))}
                      style={isSelected ? { backgroundColor: accentColor, color: accentText } : undefined}
                      className={`py-1 rounded-lg text-xs font-mono font-medium border transition cursor-pointer ${
                        isSelected
                          ? "border-transparent font-bold shadow"
                          : "bg-white/5 border-white/5 text-neutral-300 hover:bg-white/10"
                      }`}
                    >
                      {rate}x
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Subtitle Typography for Profile */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-3">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" style={{ color: accentColor }} />
              Subtitles Appearance Preset
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* Font Size */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-300">
                  <span>Font Size</span>
                  <span className="font-mono text-neutral-400">{formSettings.subFontSize} px</span>
                </div>
                <input
                  type="range"
                  min="35"
                  max="75"
                  step="1"
                  value={formSettings.subFontSize}
                  onChange={(e) =>
                    setFormSettings((prev) => ({ ...prev, subFontSize: parseInt(e.target.value) }))
                  }
                  style={{ accentColor }}
                  className="w-full cursor-pointer h-1 bg-white/20 rounded"
                />
              </div>

              {/* Color Swatches */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-300">
                  <span>Subtitle Color</span>
                  <span className="font-mono text-neutral-400 uppercase">
                    {formSettings.subColor}
                  </span>
                </div>
                <div className="flex gap-1.5 items-center">
                  {SUB_COLOR_PRESETS.map((swatch) => (
                    <button
                      key={swatch.color}
                      type="button"
                      onClick={() =>
                        setFormSettings((prev) => ({ ...prev, subColor: swatch.color }))
                      }
                      title={swatch.name}
                      style={{ backgroundColor: swatch.color }}
                      className={`w-5 h-5 rounded-full border border-black/30 transition cursor-pointer ${
                        formSettings.subColor.toLowerCase() === swatch.color.toLowerCase()
                          ? "ring-2 ring-white scale-110"
                          : "opacity-80 hover:opacity-100"
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={formSettings.subColor}
                    onChange={(e) =>
                      setFormSettings((prev) => ({ ...prev, subColor: e.target.value }))
                    }
                    className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer p-0 ml-1"
                    title="Custom Hex Picker"
                  />
                </div>
              </div>
            </div>

            {/* Live Subtitle Chip Preview */}
            <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                Live Subtitle Render:
              </span>
              <span
                style={{
                  color: formSettings.subColor,
                  fontSize: `${Math.round(formSettings.subFontSize * 0.28)}px`,
                  textShadow: "0 2px 4px rgba(0,0,0,0.9), 0 0 2px #000000",
                }}
                className="font-bold tracking-wide"
              >
                The journey across the cosmos begins now.
              </span>
            </div>
          </div>

          {/* Editor Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleTestInPlayer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-semibold border border-white/10 transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              <span>Test in Player Now</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                style={{ backgroundColor: accentColor, color: accentText }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 shadow cursor-pointer"
              >
                {editingId ? "Save Changes" : "Save as New Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Pills & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/10 rounded-xl overflow-x-auto">
          {([
            { id: "all", label: "All Profiles", count: profiles.length },
            {
              id: "cinema",
              label: "Cinema & Video",
              count: profiles.filter((p) =>
                ["anime", "movie", "vivid-hdr", "action", "vintage"].includes(p.id) ||
                ["tv", "film", "sparkles", "flame"].includes(p.icon)
              ).length,
            },
            {
              id: "audio",
              label: "Audio & Voice",
              count: profiles.filter((p) =>
                ["music", "speech"].includes(p.id) || ["headphones", "mic"].includes(p.icon)
              ).length,
            },
            {
              id: "ambient",
              label: "Night & Ambient",
              count: profiles.filter((p) => ["latenight"].includes(p.id) || p.icon === "moon").length,
            },
            {
              id: "custom",
              label: "Custom",
              count: profiles.filter((p) => !p.isBuiltIn).length,
            },
          ] as const).map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={
                  isSelected
                    ? {
                        backgroundColor: accentColor,
                        color: accentText,
                        boxShadow: `0 2px 8px ${accentGlow}`,
                      }
                    : undefined
                }
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "font-bold shadow"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-black/20" : "bg-white/10 text-neutral-400"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[140px] sm:min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* PROFILES LIST / CARDS */}
      <div className="grid grid-cols-1 gap-2.5">
        {filteredProfiles.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/5 text-neutral-400 space-y-2">
            <Info className="w-6 h-6 mx-auto opacity-40" />
            <p className="text-xs">No profiles found matching your filter.</p>
          </div>
        ) : (
          filteredProfiles.map((p) => {
            const isActive = activeProfileId === p.id;
            return (
              <div
                key={p.id}
                style={{
                  borderColor: isActive ? accentColor : undefined,
                  backgroundColor: isActive ? `${accentGlow}` : undefined,
                  boxShadow: isActive ? `0 4px 18px ${accentGlow}` : undefined,
                }}
                className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isActive
                    ? "text-white shadow-lg"
                    : "bg-white/[0.03] border-white/5 text-neutral-300 hover:bg-white/[0.06] hover:border-white/15"
                }`}
              >
                {/* Left: Icon & Details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    style={{
                      backgroundColor: isActive ? accentColor : "rgba(255, 255, 255, 0.08)",
                      color: isActive ? accentText : undefined,
                    }}
                    className="p-2.5 rounded-xl shrink-0 mt-0.5 border border-white/10 shadow-sm"
                  >
                    {getProfileIcon(p.icon, "w-4 h-4")}
                  </div>

                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-white tracking-wide">
                        {p.name}
                      </span>
                      {p.isBuiltIn ? (
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-400">
                          Built-in
                        </span>
                      ) : (
                        <span
                          style={{ borderColor: `${accentColor}50`, color: accentColor }}
                          className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border bg-white/5"
                        >
                          Custom
                        </span>
                      )}

                      {isActive && (
                        <span
                          style={{
                            backgroundColor: accentColor,
                            color: accentText,
                          }}
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm uppercase"
                        >
                          <Check className="w-2.5 h-2.5" /> ACTIVE
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {p.description}
                    </p>

                    {/* Spec Parameter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] font-mono">
                      {/* Picture tuning badge */}
                      {(p.settings.contrast !== 0 ||
                        p.settings.brightness !== 0 ||
                        p.settings.saturation !== 0 ||
                        p.settings.gamma !== 0) && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-neutral-300 border border-white/5">
                          {p.settings.contrast !== 0 && `Cont ${p.settings.contrast > 0 ? `+${p.settings.contrast}` : p.settings.contrast} `}
                          {p.settings.brightness !== 0 && `Bright ${p.settings.brightness > 0 ? `+${p.settings.brightness}` : p.settings.brightness} `}
                          {p.settings.saturation !== 0 && `Sat ${p.settings.saturation > 0 ? `+${p.settings.saturation}` : p.settings.saturation} `}
                          {p.settings.gamma !== 0 && `Gamma ${p.settings.gamma > 0 ? `+${p.settings.gamma}` : p.settings.gamma}`}
                        </span>
                      )}

                      {/* Audio Filter badge */}
                      {p.settings.audioNormalize && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {p.settings.audioFilter.includes("highpass")
                            ? "Vocal Boost"
                            : "Loudnorm EQ"}
                        </span>
                      )}

                      {/* Speed badge */}
                      {p.settings.playbackRate !== 1.0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {p.settings.playbackRate}x Speed
                        </span>
                      )}

                      {/* Subtitle chip */}
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-neutral-400">
                        <span
                          className="w-2 h-2 rounded-full border border-black/30"
                          style={{ backgroundColor: p.settings.subColor }}
                        />
                        <span>Sub {p.settings.subFontSize}px</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {/* Duplicate / Clone button (Always available!) */}
                  <button
                    onClick={() => handleDuplicate(p)}
                    title="Duplicate into a custom profile to tweak"
                    className="p-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs flex items-center gap-1 border border-white/5 transition cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-neutral-400" />
                    <span className="hidden md:inline text-[11px]">Clone</span>
                  </button>

                  {/* Edit (Custom Only) */}
                  {!p.isBuiltIn && (
                    <button
                      onClick={() => handleOpenEdit(p)}
                      title="Edit this profile"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete (Custom Only) */}
                  {!p.isBuiltIn && (
                    <button
                      onClick={() => deleteCustomProfile(p.id)}
                      title="Delete profile"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Apply / Active button */}
                  {!isActive ? (
                    <button
                      onClick={() => applyProfile(p.id)}
                      style={{
                        backgroundColor: `${accentGlow}`,
                        color: accentColor,
                        borderColor: `${accentColor}50`,
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border hover:brightness-110 transition active:scale-95 cursor-pointer ml-1"
                    >
                      Apply
                    </button>
                  ) : (
                    <span
                      style={{
                        backgroundColor: accentColor,
                        color: accentText,
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold shadow flex items-center gap-1 ml-1"
                    >
                      <Check className="w-3 h-3" />
                      Applied
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Simple Mode Switch Callout */}
      {settingsMode === "simple" && (
        <SimpleModeCallout
          icon={<Layers className="w-4 h-4 text-neutral-400" />}
          text="Want to design deep custom profiles with audio normalization, custom speeds, and calibrated HDR picture?"
          accentColor={accentColor}
          handleModeChange={handleModeChange}
        />
      )}
    </div>
  );
}
