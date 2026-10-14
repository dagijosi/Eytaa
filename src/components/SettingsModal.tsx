import { useState, useEffect } from "react";
import {
  X,
  Music2,
  Subtitles,
  History,
  Keyboard,
  Sliders,
  Play,
  RotateCcw,
  Clock,
  Tv,
  Check,
  Plus,
  Sparkles,
  Film,
  Headphones,
  Mic,
  Moon,
  PictureInPicture2,
  Trash2,
  Radio,
  ShieldAlert,
  Palette,
  Eye,
  Download,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore, ACCENT_PRESETS } from "../stores/themeStore";
import { playerService } from "../services/player/mpvPlayerService";
import { storageService } from "../services/storage/storageService";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { PlaybackProfile } from "../services/player/profileTypes";
import { globalShortcutsService } from "../services/shortcuts/globalShortcutsService";
import { updaterService, UpdateStatus } from "../services/updater/updaterService";
import { EytaaLogo } from "./EytaaLogo";

type SettingsTab =
  | "playback"
  | "appearance"
  | "profiles"
  | "sleep"
  | "video"
  | "audio"
  | "history"
  | "shortcuts"
  | "updates";

export function SettingsModal() {
  const {
    isSettingsOpen,
    toggleSettingsModal,
    audioTracks,
    subtitleTracks,
    currentAudioTrackId,
    currentSubtitleTrackId,
    selectAudioTrack,
    selectSubtitleTrack,
    loadSubtitle,
    recentFiles,
    openFile,
    showOSD,
    isPiP,
    togglePiP,
    sleepTimer,
    startSleepTimer,
    cancelSleepTimer,
    addSleepTimerMinutes,
    isNightListening,
    toggleNightListening,
    pauseOnSystemSleep,
    setPauseOnSystemSleep,
    playbackRate,
    profiles,
    activeProfileId,
    applyProfile,
    saveCustomProfile,
    deleteCustomProfile,
    autoPlayNext,
    toggleAutoPlayNext,
    isGlobalShortcutsEnabled,
    toggleGlobalShortcuts,
    isAlwaysOnTop,
    toggleAlwaysOnTop,
    deleteHistoryItem,
    clearPlaybackHistory,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("playback");

  const {
    accentId,
    accentColor,
    accentGlow,
    accentText,
    glassStyle,
    scrubberGlow,
    scrubberHeight,
    subColor: themeSubColor,
    subSize: themeSubSize,
    setAccentPreset,
    setCustomAccentColor,
    setGlassStyle,
    setScrubberGlow,
    setScrubberHeight,
    setSubColor: setThemeSubColor,
    setSubSize: setThemeSubSize,
    resetTheme,
  } = useThemeStore();

  const [customHex, setCustomHex] = useState(accentColor);
  useEffect(() => {
    setCustomHex(accentColor);
  }, [accentColor]);

  // Playback settings
  const [autoResume, setAutoResume] = useState(true);
  const [hwdec, setHwdec] = useState("auto-safe");

  // Video picture adjustments
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [gamma, setGamma] = useState(0);
  const [deinterlace, setDeinterlace] = useState(false);

  // Audio & Subtitle settings
  const [audioNormalize, setAudioNormalize] = useState(false);
  const [audioDelay, setAudioDelay] = useState(0); // in ms
  const [subFontSize, setSubFontSize] = useState(55);
  const [subDelay, setSubDelay] = useState(0); // in seconds
  const [subColor, setSubColor] = useState("#FFFFFF");

  // Custom Profile creation state
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileIcon, setNewProfileIcon] = useState<
    "sparkles" | "film" | "tv" | "headphones" | "mic" | "sliders"
  >("sparkles");

  // Global shortcuts config
  const [mediaKeysEnabled, setMediaKeysEnabled] = useState(true);
  const [comboKeysEnabled, setComboKeysEnabled] = useState(true);

  // In-App GitHub Releases Updater state
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    state: "idle",
    currentVersion: "0.1.0",
  });
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [installProgress, setInstallProgress] = useState<{ downloaded: number; total: number | null }>({
    downloaded: 0,
    total: null,
  });

  const handleCheckUpdate = async () => {
    await updaterService.checkForUpdates((status) => {
      setUpdateStatus(status);
    });
  };

  const handleInstallUpdate = async () => {
    setIsInstallingUpdate(true);
    try {
      await updaterService.installUpdate((downloaded, total) => {
        setInstallProgress({ downloaded, total });
      });
    } catch (err: any) {
      setIsInstallingUpdate(false);
      setUpdateStatus((prev) => ({
        ...prev,
        state: "error",
        errorMessage: err?.message || String(err),
      }));
    }
  };

  // Load initial preferences
  useEffect(() => {
    const loadPrefs = async () => {
      const resume = await storageService.getPreference<boolean>("autoResume");
      if (typeof resume === "boolean") setAutoResume(resume);

      const savedHwdec = await storageService.getPreference<string>("hwdec");
      if (savedHwdec) setHwdec(savedHwdec);

      const gCfg = globalShortcutsService.getConfig();
      setMediaKeysEnabled(gCfg.mediaKeys);
      setComboKeysEnabled(gCfg.comboKeys);
    };
    loadPrefs();
  }, []);

  if (!isSettingsOpen) return null;

  // Handler for Auto Resume
  const handleToggleAutoResume = async () => {
    const next = !autoResume;
    setAutoResume(next);
    await storageService.setPreference("autoResume", next);
    showOSD(next ? "Auto-Resume: On" : "Auto-Resume: Off");
  };

  // Video Adjustments Handlers
  const handleBrightnessChange = async (val: number) => {
    setBrightness(val);
    await playerService.setMpvProperty("brightness", val);
  };

  const handleContrastChange = async (val: number) => {
    setContrast(val);
    await playerService.setMpvProperty("contrast", val);
  };

  const handleSaturationChange = async (val: number) => {
    setSaturation(val);
    await playerService.setMpvProperty("saturation", val);
  };

  const handleGammaChange = async (val: number) => {
    setGamma(val);
    await playerService.setMpvProperty("gamma", val);
  };

  const handleToggleDeinterlace = async () => {
    const next = !deinterlace;
    setDeinterlace(next);
    await playerService.setMpvProperty("deinterlace", next ? "yes" : "no");
    showOSD(`Deinterlace: ${next ? "Enabled" : "Disabled"}`);
  };

  const handleResetVideo = async () => {
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setGamma(0);
    setDeinterlace(false);
    await playerService.setMpvProperty("brightness", 0);
    await playerService.setMpvProperty("contrast", 0);
    await playerService.setMpvProperty("saturation", 0);
    await playerService.setMpvProperty("gamma", 0);
    await playerService.setMpvProperty("deinterlace", "no");
    showOSD("Video settings reset to default");
  };

  // Audio adjustments
  const handleToggleAudioNormalize = async () => {
    const next = !audioNormalize;
    setAudioNormalize(next);
    await playerService.setMpvProperty("af", next ? "lavfi=[loudnorm]" : "");
    showOSD(next ? "Night Mode / Loudness EQ: On" : "Audio Normalization: Off");
  };

  const handleAudioDelayChange = async (ms: number) => {
    setAudioDelay(ms);
    await playerService.setMpvProperty("audio-delay", ms / 1000);
  };

  // Subtitle adjustments
  const handleSubFontSizeChange = async (size: number) => {
    setSubFontSize(size);
    await playerService.setMpvProperty("sub-font-size", size);
  };

  const handleSubDelayChange = async (secs: number) => {
    setSubDelay(secs);
    await playerService.setMpvProperty("sub-delay", secs);
  };

  const handleSubColorChange = async (color: string) => {
    setSubColor(color);
    await playerService.setMpvProperty("sub-color", color);
  };

  const handleLoadExternalSubtitle = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Subtitles",
            extensions: ["srt", "vtt", "ass", "ssa", "sub"],
          },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (selected && typeof selected === "string") {
        await loadSubtitle(selected);
      }
    } catch (e) {
      console.error("Subtitle load error:", e);
    }
  };

  const handleSaveCustomProfile = async () => {
    if (!newProfileName.trim()) return;

    const customProf: PlaybackProfile = {
      id: `custom_${Date.now()}`,
      name: newProfileName.trim(),
      icon: newProfileIcon,
      description: `Custom profile created on ${new Date().toLocaleDateString()}`,
      isBuiltIn: false,
      settings: {
        contrast,
        brightness,
        saturation,
        gamma,
        deinterlace,
        audioFilter: audioNormalize ? "lavfi=[loudnorm]" : "",
        audioNormalize,
        audioDelay,
        subFontSize,
        subColor,
        subDelay,
        playbackRate,
      },
    };

    await saveCustomProfile(customProf);
    await applyProfile(customProf.id);
    setNewProfileName("");
    setIsCreatingProfile(false);
  };

  const getProfileIcon = (icon: string) => {
    switch (icon) {
      case "sparkles":
        return <Sparkles style={{ color: accentColor }} className="w-4 h-4" />;
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

  const shortcuts = [
    { key: "Space / K", desc: "Play / Pause" },
    { key: "Shift + P / I", desc: "Toggle Picture-in-Picture" },
    { key: "F7", desc: "Cycle Playback Profile" },
    { key: "F8", desc: "Toggle Night Listening" },
    { key: "← / →", desc: "Seek -10s / +10s" },
    { key: "Shift + ← / →", desc: "Seek -30s / +30s" },
    { key: "↑ / ↓", desc: "Volume ±5%" },
    { key: "M", desc: "Mute / Unmute" },
    { key: "F", desc: "Toggle Fullscreen" },
    { key: "[ / ]", desc: "Playback Speed ±0.25x" },
    { key: "Backspace", desc: "Reset Speed to 1.0x" },
    { key: "S", desc: "Cycle Subtitle Track" },
    { key: "O", desc: "Open File" },
    { key: "P", desc: "Toggle Playlist" },
    { key: "Esc", desc: "Close Menus / PiP" },
  ];

  const tabMetadata: Record<
    SettingsTab,
    { title: string; description: string; icon: any }
  > = {
    playback: {
      title: "General & Playback",
      description: "Window behavior, Picture-in-Picture, and hardware acceleration",
      icon: <Sliders className="w-4 h-4" />,
    },
    appearance: {
      title: "Appearance & Theme",
      description: "Accent color presets, custom wheel, glassmorphism, and subtitles",
      icon: <Palette className="w-4 h-4" />,
    },
    profiles: {
      title: "Playback Profiles",
      description: "Tailored picture, audio, subtitle, and speed presets for genres",
      icon: <Sparkles className="w-4 h-4" />,
    },
    sleep: {
      title: "Night & Sleep Timer",
      description: "Smart night listening EQ, sleep countdowns, and power suspend",
      icon: <Moon className="w-4 h-4" />,
    },
    video: {
      title: "Picture & Calibration",
      description: "Brightness, contrast, saturation, gamma color tuning, and deinterlace",
      icon: <Tv className="w-4 h-4" />,
    },
    audio: {
      title: "Audio & Subtitles",
      description: "Normalization, audio sync delay, external subtitles, and timing",
      icon: <Music2 className="w-4 h-4" />,
    },
    shortcuts: {
      title: "Keyboard Shortcuts",
      description: "Hotkeys reference and system-wide background media key bindings",
      icon: <Keyboard className="w-4 h-4" />,
    },
    history: {
      title: "Playback History",
      description: "Recently played files with saved timestamps and auto-resume",
      icon: <History className="w-4 h-4" />,
    },
    updates: {
      title: "Updates & About",
      description: "GitHub Releases auto-updater, version info, and release artifacts",
      icon: <Download className="w-4 h-4" />,
    },
  };

  const navTabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "playback", label: "General", icon: Sliders },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "profiles", label: "Profiles", icon: Sparkles },
    { id: "sleep", label: "Night & Sleep", icon: Moon },
    { id: "video", label: "Picture", icon: Tv },
    { id: "audio", label: "Audio & Subs", icon: Music2 },
    { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
    { id: "history", label: "History", icon: History },
    { id: "updates", label: "Updates", icon: Download },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-150">
      <div className="bg-neutral-900/98 border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-row h-[630px] max-h-[88vh]">
        {/* Left Sidebar Navigation */}
        <div className="w-56 bg-neutral-950/85 border-r border-white/10 flex flex-col justify-between p-3.5 shrink-0 select-none">
          <div className="space-y-3">
            {/* Sidebar Title */}
            <div className="px-2.5 py-1.5 flex items-center gap-2.5">
              <div
                style={{ backgroundColor: accentGlow, color: accentColor }}
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
            <nav className="flex flex-col gap-1">
              {navTabs.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      backgroundColor: isSelected ? accentColor : undefined,
                      color: isSelected ? accentText : undefined,
                      boxShadow: isSelected ? `0 2px 14px ${accentGlow}` : "none",
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${
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
            </nav>
          </div>

          {/* Sidebar Footer info */}
          <div className="pt-3 border-t border-white/5 px-2 text-[10px] text-neutral-500 font-mono flex items-center justify-between">
            <span className="font-bold tracking-wider text-neutral-400">EYTAA</span>
            <span className="text-neutral-600">libmpv • v1.0</span>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-900/90 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span style={{ color: accentColor }}>{tabMetadata[activeTab].icon}</span>
                <span>{tabMetadata[activeTab].title}</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {tabMetadata[activeTab].description}
              </p>
            </div>

            <button
              onClick={toggleSettingsModal}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body with vertical scrolling only */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
            {/* GENERAL PLAYBACK TAB */}
          {activeTab === "playback" && (
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
                    Automatically advance to the next item in playlist when current media ends
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
            </div>
          )}

          {/* APPEARANCE & THEME PERSONALIZATION TAB */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              {/* Live Interactive Preview Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-white">
                    <Eye className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    Live Interactive Preview
                  </span>
                  <span
                    style={{ backgroundColor: accentColor, color: accentText }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase"
                  >
                    {glassStyle} • {scrubberHeight}
                  </span>
                </div>

                {/* Mini Mockup Window */}
                <div
                  style={{
                    boxShadow: `0 8px 30px ${accentGlow}`,
                  }}
                  className="relative rounded-xl overflow-hidden border border-white/10 bg-neutral-950 p-3 flex flex-col justify-between h-40 select-none"
                >
                  {/* Mock Top bar */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-white font-medium">
                      <span
                        style={{ backgroundColor: accentColor }}
                        className="w-2 h-2 rounded-full inline-block"
                      />
                      <span className="truncate max-w-[200px]">Cyberpunk: Edgerunners - S01E04</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">1080p • 60fps</span>
                  </div>

                  {/* Mock Subtitle Center Display */}
                  <div className="text-center py-2 px-4">
                    <span
                      style={{
                        color: themeSubColor,
                        fontSize: `${Math.round(themeSubSize * 0.28)}px`,
                        textShadow: "0 2px 4px rgba(0,0,0,0.9)",
                      }}
                      className="font-bold tracking-wide"
                    >
                      &ldquo;I&apos;m going to take you to the moon.&rdquo;
                    </span>
                  </div>

                  {/* Mock Mini Player Bottom Bar */}
                  <div
                    style={{
                      backgroundColor: glassStyle === "oled" ? "#000000" : "rgba(20,20,25,0.85)",
                      backdropFilter: glassStyle === "aero" ? "blur(20px)" : "blur(10px)",
                    }}
                    className="rounded-lg p-2 border border-white/10 flex flex-col gap-1.5"
                  >
                    {/* Mini Scrubber */}
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: "48%",
                          backgroundColor: accentColor,
                          boxShadow: scrubberGlow ? `0 0 10px ${accentGlow}` : "none",
                        }}
                        className="h-full rounded-full"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            backgroundColor: accentColor,
                            color: accentText,
                            boxShadow: `0 2px 10px ${accentGlow}`,
                          }}
                          className="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                        >
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </div>
                        <span className="text-[10px] font-mono text-neutral-300">11:42 / 24:18</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          style={{
                            backgroundColor: `${accentGlow}`,
                            color: accentColor,
                            borderColor: accentColor,
                          }}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold"
                        >
                          1.00x
                        </span>
                        <span
                          style={{ backgroundColor: accentColor, color: accentText }}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        >
                          SUBS
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1: Color Accents */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Accent Color
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Personalize controls, progress bars, active indicators, and aura glows
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ACCENT_PRESETS.map((preset) => {
                    const isSelected = accentId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setAccentPreset(preset.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left group ${
                          isSelected
                            ? "bg-white/10 border-white/40 shadow-lg scale-[1.02]"
                            : "bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/15"
                        }`}
                      >
                        <div
                          style={{
                            backgroundColor: preset.color,
                            boxShadow: isSelected ? `0 0 12px ${preset.glow}` : "none",
                          }}
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-black/20"
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" style={{ color: preset.text }} />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{preset.name}</div>
                          <div className="text-[10px] font-mono text-neutral-400 uppercase">{preset.color}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => {
                        setCustomHex(e.target.value);
                        setCustomAccentColor(e.target.value);
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                      title="Choose custom color"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">Custom Color Wheel</div>
                      <div className="text-[11px] text-neutral-400">Pick any custom shade or enter hex code</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customHex}
                      onChange={(e) => {
                        setCustomHex(e.target.value);
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                          setCustomAccentColor(e.target.value);
                        }
                      }}
                      placeholder="#F59E0B"
                      maxLength={7}
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs font-mono text-white text-center uppercase focus:outline-none focus:border-white/40"
                    />
                    {accentId === "custom" && (
                      <span
                        style={{ backgroundColor: accentColor, color: accentText }}
                        className="text-[10px] font-bold px-2 py-1 rounded-md font-mono"
                      >
                        CUSTOM ACTIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Window Backdrop & Glass Style */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Surface & Glassmorphism
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Choose the backdrop transparency and blur aesthetics for the player
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "frosted", title: "Frosted Glass", desc: "Modern balanced blur" },
                    { id: "oled", title: "Deep OLED", desc: "True blacks & no blur" },
                    { id: "aero", title: "Aero Glass", desc: "Ultra glassy translucent" },
                    { id: "solid", title: "Solid Matte", desc: "100% opaque contrast" },
                  ].map((item) => {
                    const isSelected = glassStyle === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setGlassStyle(item.id as any)}
                        style={{
                          borderColor: isSelected ? accentColor : undefined,
                          backgroundColor: isSelected ? `${accentGlow}` : undefined,
                        }}
                        className={`p-3 rounded-xl border text-left transition ${
                          isSelected
                            ? "border-white/40 text-white font-bold"
                            : "bg-white/[0.03] border-white/5 text-neutral-300 hover:bg-white/[0.07]"
                        }`}
                      >
                        <div className="text-xs font-semibold">{item.title}</div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Scrubber Styling */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Progress Scrubber & Aura
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Fine-tune the scrubber thickness and neon glow
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Thickness */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="text-xs font-medium text-neutral-200">Scrubber Thickness</div>
                    <div className="flex gap-2">
                      {[
                        { id: "slim", label: "Slim" },
                        { id: "medium", label: "Standard" },
                        { id: "bold", label: "Chunky Bold" },
                      ].map((thick) => (
                        <button
                          key={thick.id}
                          onClick={() => setScrubberHeight(thick.id as any)}
                          style={{
                            backgroundColor: scrubberHeight === thick.id ? accentColor : undefined,
                            color: scrubberHeight === thick.id ? accentText : undefined,
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                            scrubberHeight === thick.id
                              ? "font-bold shadow"
                              : "bg-white/5 text-neutral-300 hover:bg-white/10"
                          }`}
                        >
                          {thick.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Glow */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-neutral-200">Progress Neon Glow</div>
                      <div className="text-[11px] text-neutral-500">Radiant aura along the playback line</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={scrubberGlow}
                      onChange={(e) => setScrubberGlow(e.target.checked)}
                      style={{ accentColor: accentColor }}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Subtitles Styling */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Subtitles Appearance
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Configure real-time subtitle typography and font color
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Font Color */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="text-xs font-medium text-neutral-200">Subtitle Color</div>
                    <div className="flex gap-2">
                      {[
                        { color: "#ffffff", label: "White" },
                        { color: "#fcd34d", label: "Gold" },
                        { color: "#67e8f9", label: "Cyan" },
                        { color: "#ffff00", label: "Yellow" },
                      ].map((c) => (
                        <button
                          key={c.color}
                          onClick={() => setThemeSubColor(c.color)}
                          style={{
                            borderColor: themeSubColor.toLowerCase() === c.color.toLowerCase() ? accentColor : "transparent",
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                            themeSubColor.toLowerCase() === c.color.toLowerCase()
                              ? "bg-white/15 text-white"
                              : "bg-white/5 text-neutral-300 hover:bg-white/10"
                          }`}
                        >
                          <span
                            style={{ backgroundColor: c.color }}
                            className="w-2.5 h-2.5 rounded-full inline-block border border-black/40"
                          />
                          <span>{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-neutral-200">
                      <span>Subtitle Font Size</span>
                      <span className="font-mono text-neutral-400">{themeSubSize} pt</span>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { size: 45, label: "Small" },
                        { size: 55, label: "Medium" },
                        { size: 65, label: "Large" },
                        { size: 75, label: "Cinematic" },
                      ].map((s) => (
                        <button
                          key={s.size}
                          onClick={() => setThemeSubSize(s.size)}
                          style={{
                            backgroundColor: themeSubSize === s.size ? accentColor : undefined,
                            color: themeSubSize === s.size ? accentText : undefined,
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                            themeSubSize === s.size
                              ? "font-bold shadow"
                              : "bg-white/5 text-neutral-300 hover:bg-white/10"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Reset Theme */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={resetTheme}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-medium transition active:scale-95 border border-white/10"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Theme to Defaults</span>
                </button>
              </div>
            </div>
          )}

          {/* PLAYBACK PROFILES TAB */}
          {activeTab === "profiles" && (
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
                <button
                  onClick={() => setIsCreatingProfile(!isCreatingProfile)}
                  style={{
                    backgroundColor: `${accentGlow}`,
                    color: accentColor,
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:brightness-110 transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Current as Profile</span>
                </button>
              </div>

              {/* Profile Creation Drawer */}
              {isCreatingProfile && (
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
                      <option value="sparkles">✨ Sparkles (Anime)</option>
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
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-neutral-500">
                            <span>Saturation: {p.settings.saturation > 0 ? `+${p.settings.saturation}` : p.settings.saturation}</span>
                            <span>Contrast: {p.settings.contrast > 0 ? `+${p.settings.contrast}` : p.settings.contrast}</span>
                            <span>Speed: {p.settings.playbackRate}x</span>
                            <span>Sub: {p.settings.subFontSize}px</span>
                          </div>
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

                        {!p.isBuiltIn && (
                          <button
                            onClick={() => deleteCustomProfile(p.id)}
                            title="Delete custom profile"
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* NIGHT LISTENING & SLEEP TIMER TAB */}
          {activeTab === "sleep" && (
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
          )}

          {/* GLOBAL SHORTCUTS & LOCAL SHORTCUTS TAB */}
          {activeTab === "shortcuts" && (
            <div className="space-y-5">
              {/* Global Media Shortcuts Banner */}
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
                      <div className="text-xs font-bold text-white">
                        Global Background Media Shortcuts
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

              {/* Local App Shortcuts List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
                  In-App Keyboard Shortcuts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {shortcuts.map((sc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs"
                    >
                      <span className="text-neutral-400">{sc.desc}</span>
                      <kbd
                        style={{ color: accentColor }}
                        className="px-2 py-0.5 rounded-lg bg-neutral-800 font-mono text-[11px] border border-white/10 shadow-sm font-semibold"
                      >
                        {sc.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIDEO PICTURE TAB */}
          {activeTab === "video" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  Real-time GPU hardware color calibration:
                </span>
                <button
                  onClick={handleResetVideo}
                  style={{ color: accentColor }}
                  className="flex items-center gap-1 text-xs hover:brightness-110 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Picture</span>
                </button>
              </div>

              {/* Brightness */}
              <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Brightness</span>
                  <span className="font-mono text-neutral-400">{brightness}</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={brightness}
                  onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                  style={{ accentColor }}
                  className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Contrast</span>
                  <span className="font-mono text-neutral-400">{contrast}</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={contrast}
                  onChange={(e) => handleContrastChange(Number(e.target.value))}
                  style={{ accentColor }}
                  className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Saturation</span>
                  <span className="font-mono text-neutral-400">{saturation}</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={saturation}
                  onChange={(e) => handleSaturationChange(Number(e.target.value))}
                  style={{ accentColor }}
                  className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>

              {/* Gamma */}
              <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Gamma</span>
                  <span className="font-mono text-neutral-400">{gamma}</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={gamma}
                  onChange={(e) => handleGammaChange(Number(e.target.value))}
                  style={{ accentColor }}
                  className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>

              {/* Deinterlace */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <span className="font-medium text-neutral-200 text-xs">
                    Deinterlacing (Yadif)
                  </span>
                  <p className="text-xs text-neutral-500">
                    Fix interlaced lines on older DVD/broadcast media rips
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={deinterlace}
                  onChange={handleToggleDeinterlace}
                  style={{ accentColor }}
                  className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* AUDIO & SUBS TAB */}
          {activeTab === "audio" && (
            <div className="space-y-5">
              {/* Audio Normalization */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <span className="font-medium text-neutral-200 text-xs">
                    Loudness Normalization (EBU R128 loudnorm)
                  </span>
                  <p className="text-xs text-neutral-500">
                    Balances dialogue and prevents excessive spikes
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={audioNormalize}
                  onChange={handleToggleAudioNormalize}
                  style={{ accentColor }}
                  className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </div>

              {/* Audio Delay */}
              <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Audio Delay (A/V Sync)</span>
                  <span className="font-mono text-neutral-400">{audioDelay} ms</span>
                </div>
                <input
                  type="range"
                  min={-1000}
                  max={1000}
                  step={50}
                  value={audioDelay}
                  onChange={(e) => handleAudioDelayChange(Number(e.target.value))}
                  style={{ accentColor }}
                  className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>

              {/* Subtitle font size */}
              <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Subtitle Font Size</span>
                  <span className="font-mono text-neutral-400">{subFontSize} pt</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={subFontSize}
                  onChange={(e) => handleSubFontSizeChange(Number(e.target.value))}
                  style={{ accentColor }}
                  className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>

              {/* Subtitle Delay */}
              <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Subtitle Delay (Sync)</span>
                  <span className="font-mono text-neutral-400">{subDelay} s</span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.1}
                  value={subDelay}
                  onChange={(e) => handleSubDelayChange(Number(e.target.value))}
                  style={{ accentColor }}
                  className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>

              {/* Subtitle Color */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <span className="font-medium text-neutral-200 text-xs">Subtitle Text Color</span>
                  <p className="text-xs text-neutral-500">Pick font color for rendered subtitles</p>
                </div>
                <input
                  type="color"
                  value={subColor}
                  onChange={(e) => handleSubColorChange(e.target.value)}
                  className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
                />
              </div>

              {/* Audio Streams List */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Music2 style={{ color: accentColor }} className="w-4 h-4" />
                  Audio Tracks ({audioTracks.length})
                </span>
                {audioTracks.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic">No audio tracks detected.</p>
                ) : (
                  <div className="space-y-1">
                    {audioTracks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectAudioTrack(t.id)}
                        style={{
                          backgroundColor: currentAudioTrackId === t.id ? `${accentGlow}` : undefined,
                          borderColor: currentAudioTrackId === t.id ? `${accentColor}70` : undefined,
                          color: currentAudioTrackId === t.id ? accentColor : undefined,
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl border text-left text-xs transition ${
                          currentAudioTrackId === t.id
                            ? "font-semibold shadow-sm"
                            : "bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300"
                        }`}
                      >
                        <span>{t.title || `Audio Stream ${t.id}`}</span>
                        <span className="font-mono text-[10px] text-neutral-500">{t.lang || "und"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subtitles Streams List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Subtitles style={{ color: accentColor }} className="w-4 h-4" />
                    Subtitles ({subtitleTracks.length})
                  </span>
                  <button
                    onClick={handleLoadExternalSubtitle}
                    style={{ color: accentColor }}
                    className="flex items-center gap-1 text-xs hover:brightness-110 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Load .srt/.ass</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => selectSubtitleTrack(0)}
                    style={{
                      backgroundColor:
                        !currentSubtitleTrackId || currentSubtitleTrackId === 0
                          ? `${accentGlow}`
                          : undefined,
                      borderColor:
                        !currentSubtitleTrackId || currentSubtitleTrackId === 0
                          ? `${accentColor}70`
                          : undefined,
                      color:
                        !currentSubtitleTrackId || currentSubtitleTrackId === 0
                          ? accentColor
                          : undefined,
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl border text-left text-xs transition ${
                      !currentSubtitleTrackId || currentSubtitleTrackId === 0
                        ? "font-semibold shadow-sm"
                        : "bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300"
                    }`}
                  >
                    <span>Off (None)</span>
                  </button>
                  {subtitleTracks.map((t) => {
                    const isSubActive = currentSubtitleTrackId === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => selectSubtitleTrack(t.id)}
                        style={{
                          backgroundColor: isSubActive ? `${accentGlow}` : undefined,
                          borderColor: isSubActive ? `${accentColor}70` : undefined,
                          color: isSubActive ? accentColor : undefined,
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl border text-left text-xs transition ${
                          isSubActive
                            ? "font-semibold shadow-sm"
                            : "bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300"
                        }`}
                      >
                        <span>{t.title || `Subtitle ${t.id}`}</span>
                        <span className="font-mono text-[10px] text-neutral-500">{t.lang || "und"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-neutral-400">
                  Playback history stored in local SQLite database:
                </p>
                {recentFiles.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm("Clear all playback history?")) {
                        clearPlaybackHistory();
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 active:scale-95 transition-all font-medium"
                    title="Clear All History"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {recentFiles.length === 0 ? (
                <p className="text-xs text-neutral-500 italic text-center py-6">
                  No playback history recorded yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {recentFiles.map((item) => (
                    <div
                      key={item.id}
                      onClick={async () => {
                        await openFile(item.filePath);
                        toggleSettingsModal();
                      }}
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          style={{
                            backgroundColor: `${accentGlow}`,
                            color: accentColor,
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium truncate text-neutral-200">
                            {item.title || item.filePath.split(/[/\\]/).pop()}
                          </span>
                          <span className="text-[10px] text-neutral-500 truncate font-mono">
                            {item.filePath}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-right shrink-0 ml-2">
                        {item.position && item.duration ? (
                          <span
                            style={{ color: accentColor }}
                            className="text-[10px] font-mono font-bold"
                          >
                            {Math.round((item.position / item.duration) * 100)}%
                          </span>
                        ) : null}
                        <Clock className="w-3 h-3 text-neutral-500" />

                        {/* Delete single history item button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item.filePath);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/15 transition-all ml-1"
                          title="Remove from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* UPDATES & ABOUT TAB */}
          {activeTab === "updates" && (
            <div className="space-y-5">
              {/* Brand & Version Card */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    <EytaaLogo className="w-full h-full" variant="color" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black tracking-wider text-white uppercase font-sans">
                        EYTAA
                      </span>
                      <span
                        style={{
                          backgroundColor: `${accentGlow}`,
                          color: accentColor,
                          borderColor: `${accentColor}40`,
                        }}
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
                      >
                        v0.1.0
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Every story, in view • Powered by Tauri 2 and libmpv
                    </p>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      await openUrl("https://github.com/dagijosi/Eytaa");
                    } catch {
                      window.open("https://github.com/dagijosi/Eytaa", "_blank");
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs font-semibold transition active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </button>
              </div>

              {/* Updater Status Card */}
              <div
                style={{
                  borderColor:
                    updateStatus.state === "available"
                      ? `${accentColor}70`
                      : "rgba(255, 255, 255, 0.08)",
                  background:
                    updateStatus.state === "available"
                      ? `linear-gradient(to right, ${accentGlow}, transparent)`
                      : "rgba(255, 255, 255, 0.03)",
                }}
                className="p-5 rounded-2xl border space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Software Updates
                    </div>
                    <div className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                      {updateStatus.state === "checking" && "Checking GitHub Releases..."}
                      {updateStatus.state === "up-to-date" && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>You're all up to date</span>
                        </>
                      )}
                      {updateStatus.state === "available" && (
                        <>
                          <Download className="w-4 h-4 text-amber-400" />
                          <span>Update Available: v{updateStatus.latestVersion}</span>
                        </>
                      )}
                      {updateStatus.state === "error" && (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span>Unable to check for updates</span>
                        </>
                      )}
                      {updateStatus.state === "idle" && "Check for the latest version"}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      {updateStatus.state === "up-to-date" &&
                        "EYTAA v0.1.0 is currently the latest version released on GitHub."}
                      {updateStatus.state === "available" &&
                        "A newer version of EYTAA is available on GitHub Releases with fixes and improvements."}
                      {updateStatus.state === "error" &&
                        (updateStatus.errorMessage ||
                          "Could not reach GitHub Releases. Ensure your network is connected or check the repository.")}
                      {updateStatus.state === "idle" &&
                        "Connects directly to github.com/dagijosi/Eytaa to verify signed release builds."}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {updateStatus.state === "available" ? (
                      <button
                        onClick={handleInstallUpdate}
                        disabled={isInstallingUpdate}
                        style={{
                          backgroundColor: accentColor,
                          color: accentText,
                          boxShadow: `0 4px 16px ${accentGlow}`,
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" />
                        <span>{isInstallingUpdate ? "Installing..." : "Install & Relaunch"}</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckUpdate}
                        disabled={updateStatus.state === "checking"}
                        style={{
                          backgroundColor: `${accentGlow}`,
                          color: accentColor,
                        }}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            updateStatus.state === "checking" ? "animate-spin" : ""
                          }`}
                        />
                        <span>
                          {updateStatus.state === "checking"
                            ? "Checking..."
                            : "Check for Updates"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Download Progress bar if installing */}
                {isInstallingUpdate && (
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="flex justify-between text-xs font-mono text-neutral-400">
                      <span>Downloading update package...</span>
                      <span>
                        {installProgress.total
                          ? `${Math.round(
                              (installProgress.downloaded / installProgress.total) * 100
                            )}%`
                          : "Preparing..."}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        style={{
                          width: installProgress.total
                            ? `${(installProgress.downloaded / installProgress.total) * 100}%`
                            : "50%",
                          backgroundColor: accentColor,
                        }}
                        className="h-full rounded-full transition-all duration-150"
                      />
                    </div>
                  </div>
                )}

                {/* Release Notes if update available */}
                {updateStatus.state === "available" && updateStatus.releaseNotes && (
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-xs text-neutral-300">
                    <div className="font-bold text-white text-[11px] uppercase tracking-wider">
                      Release Notes (v{updateStatus.latestVersion})
                    </div>
                    <div className="font-mono text-[11px] whitespace-pre-wrap text-neutral-400 max-h-36 overflow-y-auto">
                      {updateStatus.releaseNotes}
                    </div>
                  </div>
                )}
              </div>

              {/* GitHub Releases Info & Instructions */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Automated GitHub Releases Workflow
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  EYTAA uses GitHub Actions to automatically compile Windows installers and publish releases.
                  When you push a git tag like <code className="text-amber-400 px-1 py-0.5 rounded bg-black/40 font-mono">v0.1.0</code> to <span className="text-white font-medium">dagijosi/Eytaa</span>, the CI pipeline builds the signed executable and <code className="text-neutral-300 font-mono">latest.json</code> manifest so all running apps can update in place with one click.
                </p>
                <div className="pt-2 flex items-center gap-3 text-xs">
                  <button
                    onClick={async () => {
                      try {
                        await openUrl("https://github.com/dagijosi/Eytaa/releases");
                      } catch {
                        window.open("https://github.com/dagijosi/Eytaa/releases", "_blank");
                      }
                    }}
                    style={{ color: accentColor }}
                    className="flex items-center gap-1 hover:brightness-110 transition font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>View Releases on GitHub</span>
                  </button>
                  <span className="text-neutral-600">•</span>
                  <button
                    onClick={async () => {
                      try {
                        await openUrl("https://github.com/dagijosi/Eytaa/actions");
                      } catch {
                        window.open("https://github.com/dagijosi/Eytaa/actions", "_blank");
                      }
                    }}
                    className="flex items-center gap-1 text-neutral-400 hover:text-white transition"
                  >
                    <span>View GitHub Actions Workflows</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
}
