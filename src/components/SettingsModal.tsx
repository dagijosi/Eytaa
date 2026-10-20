import { useState, useEffect } from "react";
import {
  X,
  Sliders,
  RotateCcw,
  Feather,
  Keyboard,
  History,
  Music2,
  Tv,
  Moon,
  Palette,
  Download,
  Layers,
} from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore, DEFAULT_THEME } from "../stores/themeStore";
import { playerService } from "../services/player/mpvPlayerService";
import { storageService } from "../services/storage/storageService";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { PlaybackProfile } from "../services/player/profileTypes";
import { updaterService } from "../services/updater/updaterService";
import { SettingsSidebar } from "./settings/SettingsSidebar";
import { PlaybackSettings } from "./settings/PlaybackSettings";
import { AppearanceSettings } from "./settings/AppearanceSettings";
import { ProfileSettings } from "./settings/ProfileSettings";
import { SleepSettings } from "./settings/SleepSettings";
import { ShortcutSettings } from "./settings/ShortcutSettings";
import { VideoSettings } from "./settings/VideoSettings";
import { AudioSubtitleSettings } from "./settings/AudioSubtitleSettings";
import { HistorySettings } from "./settings/HistorySettings";
import { UpdateSettings } from "./settings/UpdateSettings";
import { RestoreDefaultsDialog } from "./settings/shared";
import type { ProfileIconName, SettingsMode, SettingsTab } from "./settings/types";

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
    resetProfiles,
    restoreAllDefaults,
    autoPlayNext,
    toggleAutoPlayNext,
    isGlobalShortcutsEnabled,
    toggleGlobalShortcuts,
    isAlwaysOnTop,
    toggleAlwaysOnTop,
    deleteHistoryItem,
    clearPlaybackHistory,
    settingsInitialTab,
    autoCheckUpdates,
    toggleAutoCheckUpdates,
    showSkipIndicators,
    toggleShowSkipIndicators,
    scrollVolumeEnabled,
    setScrollVolumeEnabled,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("playback");

  useEffect(() => {
    if (isSettingsOpen && settingsInitialTab) {
      setActiveTab(settingsInitialTab as SettingsTab);
    }
  }, [isSettingsOpen, settingsInitialTab]);

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
  const [allowMultipleWindows, setAllowMultipleWindows] = useState(true);
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
  const [newProfileIcon, setNewProfileIcon] = useState<ProfileIconName>("tv");

  // Settings mode: Simple vs Advanced
  const [settingsMode, setSettingsMode] = useState<SettingsMode>("simple");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  useEffect(() => {
    storageService.getPreference<"simple" | "advanced">("settingsMode").then((saved) => {
      if (saved === "simple" || saved === "advanced") {
        setSettingsMode(saved);
      }
    });
  }, []);

  const handleModeChange = (mode: SettingsMode) => {
    setSettingsMode(mode);
    storageService.setPreference("settingsMode", mode);
    if (mode === "simple" && !["playback", "appearance", "profiles", "shortcuts", "updates"].includes(activeTab)) {
      setActiveTab("playback");
    }
  };

  const handleRestoreDefaults = async () => {
    await restoreAllDefaults();
    setShowRestoreConfirm(false);
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setGamma(0);
    setDeinterlace(false);
    setAudioNormalize(false);
    setAudioDelay(0);
    setSubFontSize(55);
    setSubDelay(0);
    setSubColor("#FFFFFF");
    setCustomHex(DEFAULT_THEME.accentColor);
  };

  // In-App GitHub Releases Updater version state
  const [appVersion, setAppVersion] = useState<string>("");

  // Load initial preferences & dynamic app version
  useEffect(() => {
    updaterService.getAppVersion().then((v) => {
      setAppVersion(v);
    });

    const loadPrefs = async () => {
      const resume = await storageService.getPreference<boolean>("autoResume");
      if (typeof resume === "boolean") setAutoResume(resume);

      const reuseSingle = await storageService.getPreference<boolean>("reuseSingleWindow");
      if (typeof reuseSingle === "boolean") {
        setAllowMultipleWindows(!reuseSingle);
      } else {
        setAllowMultipleWindows(true);
        void storageService.setPreference("reuseSingleWindow", false);
      }

      const savedHwdec = await storageService.getPreference<string>("hwdec");
      if (savedHwdec) setHwdec(savedHwdec);
    };
    loadPrefs();
  }, []);

  if (!isSettingsOpen) return null;

  // Handler for Multiple Windows vs Single Instance
  const handleToggleMultipleWindows = async () => {
    const next = !allowMultipleWindows;
    setAllowMultipleWindows(next);
    await storageService.setPreference("reuseSingleWindow", !next);
    showOSD(next ? "Multiple Windows: Enabled" : "Single Window Mode: Active");
  };

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

    const profileId = editingProfileId || `custom_${Date.now()}`;
    const customProf: PlaybackProfile = {
      id: profileId,
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
    setEditingProfileId(null);
    setIsCreatingProfile(false);
  };

  const handleEditProfile = (p: PlaybackProfile) => {
    setEditingProfileId(p.id);
    setNewProfileName(p.name);
    setNewProfileIcon(p.icon);
    setContrast(p.settings.contrast);
    setBrightness(p.settings.brightness);
    setSaturation(p.settings.saturation);
    setGamma(p.settings.gamma);
    setDeinterlace(p.settings.deinterlace);
    setAudioNormalize(p.settings.audioNormalize);
    setAudioDelay(p.settings.audioDelay);
    setSubFontSize(p.settings.subFontSize);
    setSubColor(p.settings.subColor);
    setSubDelay(p.settings.subDelay);
    setIsCreatingProfile(true);
  };

  const tabMetadata: Record<
    SettingsTab,
    { title: string; description: string; icon: any }
  > = {
    playback: {
      title: "General & Playback",
      description:
        settingsMode === "simple"
          ? "Essential window behavior, PiP mode, and auto-resume preferences"
          : "Window behavior, Picture-in-Picture, GPU decoding, and multi-instance concurrency",
      icon: <Sliders className="w-4 h-4" />,
    },
    appearance: {
      title: "Appearance & Theme",
      description:
        settingsMode === "simple"
          ? "Curated accent color presets, theme surfaces, and subtitle readability"
          : "Color presets, custom HEX wheel, WCAG contrast, glass styles, and scrubber neon aura",
      icon: <Palette className="w-4 h-4" />,
    },
    profiles: {
      title: "Playback Profiles",
      description:
        settingsMode === "simple"
          ? "1-click tailored presets for anime, movies, music, and podcasts"
          : "Tailored picture, audio, subtitle, and speed presets with custom profile creator",
      icon: <Layers className="w-4 h-4" />,
    },
    sleep: {
      title: "Night & Sleep Timer",
      description: "Smart night listening EQ, sleep countdowns, and power suspend",
      icon: <Moon className="w-4 h-4" />,
    },
    video: {
      title: "Picture & Calibration",
      description: "Hardware GPU brightness, contrast, saturation, gamma tuning, and deinterlace",
      icon: <Tv className="w-4 h-4" />,
    },
    audio: {
      title: "Audio & Subtitles",
      description: "Loudnorm dynamic range normalization, audio delay sync, and subtitle timing",
      icon: <Music2 className="w-4 h-4" />,
    },
    shortcuts: {
      title: "Keyboard Shortcuts",
      description:
        settingsMode === "simple"
          ? "Rebind in-app player hotkeys, mouse scroll volume, and quick key reference"
          : "Fully rebindable in-app hotkeys, mouse controls, and system-wide background media key hooks",
      icon: <Keyboard className="w-4 h-4" />,
    },
    history: {
      title: "Playback History",
      description: "Recently played files with saved timestamps, completion %, and auto-resume",
      icon: <History className="w-4 h-4" />,
    },
    updates: {
      title: "Updates & About",
      description: "GitHub Releases auto-updater, version info, and release artifacts",
      icon: <Download className="w-4 h-4" />,
    },
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-150">
      <div className="ui-glass-panel w-full max-w-4xl shadow-2xl overflow-hidden flex flex-row h-[630px] max-h-[88vh]">
        {/* Left Sidebar Navigation */}
        <SettingsSidebar
          accentColor={accentColor}
          accentGlow={accentGlow}
          accentText={accentText}
          settingsMode={settingsMode}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          appVersion={appVersion}
          onRequestRestore={() => setShowRestoreConfirm(true)}
        />

        {/* Right Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/25 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span style={{ color: accentColor }}>{tabMetadata[activeTab].icon}</span>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{tabMetadata[activeTab].title}</span>
                </h2>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {tabMetadata[activeTab].description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Simple vs Advanced Mode Switcher */}
              <div className="flex items-center bg-black/50 border border-white/10 rounded-xl p-0.5">
                <button
                  onClick={() => handleModeChange("simple")}
                  style={settingsMode === "simple" ? { backgroundColor: accentColor, color: accentText } : {}}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    settingsMode === "simple" ? "shadow font-bold" : "text-neutral-400 hover:text-white"
                  }`}
                  title="Streamlined settings: everyday playback & appearance"
                >
                  <Feather className="w-3.5 h-3.5" />
                  <span>Simple</span>
                </button>
                <button
                  onClick={() => handleModeChange("advanced")}
                  style={settingsMode === "advanced" ? { backgroundColor: accentColor, color: accentText } : {}}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    settingsMode === "advanced" ? "shadow font-bold" : "text-neutral-400 hover:text-white"
                  }`}
                  title="Advanced power settings: hardware decoding, calibration, EQ & global hotkeys"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Advanced</span>
                </button>
              </div>

              {/* Compact Reset Defaults Button */}
              <button
                onClick={() => setShowRestoreConfirm(true)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/15 hover:text-rose-300 text-neutral-400 border border-white/10 transition cursor-pointer"
                title="Reset all settings to factory defaults"
                aria-label="Reset all settings to factory defaults"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={toggleSettingsModal}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 transition cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body with vertical scrolling only */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
            {/* GENERAL PLAYBACK TAB */}
            {activeTab === "playback" && (
              <PlaybackSettings
                accentColor={accentColor}
                accentGlow={accentGlow}
                accentText={accentText}
                isPiP={isPiP}
                togglePiP={togglePiP}
                isAlwaysOnTop={isAlwaysOnTop}
                toggleAlwaysOnTop={toggleAlwaysOnTop}
                autoResume={autoResume}
                handleToggleAutoResume={handleToggleAutoResume}
                autoPlayNext={autoPlayNext}
                toggleAutoPlayNext={toggleAutoPlayNext}
                showSkipIndicators={showSkipIndicators}
                toggleShowSkipIndicators={toggleShowSkipIndicators}
                autoCheckUpdates={autoCheckUpdates}
                toggleAutoCheckUpdates={toggleAutoCheckUpdates}
                settingsMode={settingsMode}
                handleModeChange={handleModeChange}
                hwdec={hwdec}
                setHwdec={setHwdec}
                showOSD={showOSD}
                allowMultipleWindows={allowMultipleWindows}
                handleToggleMultipleWindows={handleToggleMultipleWindows}
              />
            )}

            {/* APPEARANCE & THEME PERSONALIZATION TAB */}
            {activeTab === "appearance" && (
              <AppearanceSettings
                accentColor={accentColor}
                accentGlow={accentGlow}
                accentText={accentText}
                glassStyle={glassStyle}
                scrubberGlow={scrubberGlow}
                scrubberHeight={scrubberHeight}
                themeSubColor={themeSubColor}
                themeSubSize={themeSubSize}
                accentId={accentId}
                setAccentPreset={setAccentPreset}
                customHex={customHex}
                setCustomHex={setCustomHex}
                setCustomAccentColor={setCustomAccentColor}
                setGlassStyle={setGlassStyle}
                setScrubberGlow={setScrubberGlow}
                setScrubberHeight={setScrubberHeight}
                setThemeSubColor={setThemeSubColor}
                setThemeSubSize={setThemeSubSize}
                resetTheme={resetTheme}
                settingsMode={settingsMode}
                handleModeChange={handleModeChange}
              />
            )}

            {/* PLAYBACK PROFILES TAB */}
            {activeTab === "profiles" && (
              <ProfileSettings
                accentColor={accentColor}
                accentGlow={accentGlow}
                accentText={accentText}
                settingsMode={settingsMode}
                handleModeChange={handleModeChange}
                resetProfiles={resetProfiles}
                profiles={profiles}
                activeProfileId={activeProfileId}
                applyProfile={applyProfile}
                deleteCustomProfile={deleteCustomProfile}
                isCreatingProfile={isCreatingProfile}
                setIsCreatingProfile={setIsCreatingProfile}
                setEditingProfileId={setEditingProfileId}
                newProfileName={newProfileName}
                setNewProfileName={setNewProfileName}
                newProfileIcon={newProfileIcon}
                setNewProfileIcon={setNewProfileIcon}
                handleSaveCustomProfile={handleSaveCustomProfile}
                handleEditProfile={handleEditProfile}
                contrast={contrast}
                brightness={brightness}
                saturation={saturation}
                playbackRate={playbackRate}
              />
            )}

            {/* NIGHT LISTENING & SLEEP TIMER TAB */}
            {activeTab === "sleep" && (
              <SleepSettings
                accentColor={accentColor}
                accentGlow={accentGlow}
                accentText={accentText}
                sleepTimer={sleepTimer}
                addSleepTimerMinutes={addSleepTimerMinutes}
                cancelSleepTimer={cancelSleepTimer}
                startSleepTimer={startSleepTimer}
                pauseOnSystemSleep={pauseOnSystemSleep}
                setPauseOnSystemSleep={setPauseOnSystemSleep}
                isNightListening={isNightListening}
                toggleNightListening={toggleNightListening}
              />
            )}

            {/* GLOBAL SHORTCUTS & LOCAL SHORTCUTS TAB */}
            {activeTab === "shortcuts" && (
              <ShortcutSettings
                accentColor={accentColor}
                accentGlow={accentGlow}
                settingsMode={settingsMode}
                handleModeChange={handleModeChange}
                isGlobalShortcutsEnabled={isGlobalShortcutsEnabled}
                toggleGlobalShortcuts={toggleGlobalShortcuts}
                scrollVolumeEnabled={scrollVolumeEnabled}
                setScrollVolumeEnabled={setScrollVolumeEnabled}
              />
            )}

            {/* VIDEO PICTURE TAB */}
            {activeTab === "video" && (
              <VideoSettings
                accentColor={accentColor}
                brightness={brightness}
                handleBrightnessChange={handleBrightnessChange}
                contrast={contrast}
                handleContrastChange={handleContrastChange}
                saturation={saturation}
                handleSaturationChange={handleSaturationChange}
                gamma={gamma}
                handleGammaChange={handleGammaChange}
                deinterlace={deinterlace}
                handleToggleDeinterlace={handleToggleDeinterlace}
                handleResetVideo={handleResetVideo}
              />
            )}

            {/* AUDIO & SUBS TAB */}
            {activeTab === "audio" && (
              <AudioSubtitleSettings
                accentColor={accentColor}
                accentGlow={accentGlow}
                audioNormalize={audioNormalize}
                handleToggleAudioNormalize={handleToggleAudioNormalize}
                audioDelay={audioDelay}
                handleAudioDelayChange={handleAudioDelayChange}
                subFontSize={subFontSize}
                handleSubFontSizeChange={handleSubFontSizeChange}
                subDelay={subDelay}
                handleSubDelayChange={handleSubDelayChange}
                subColor={subColor}
                handleSubColorChange={handleSubColorChange}
                audioTracks={audioTracks}
                selectAudioTrack={selectAudioTrack}
                currentAudioTrackId={currentAudioTrackId}
                subtitleTracks={subtitleTracks}
                selectSubtitleTrack={selectSubtitleTrack}
                currentSubtitleTrackId={currentSubtitleTrackId}
                handleLoadExternalSubtitle={handleLoadExternalSubtitle}
              />
            )}

            {/* HISTORY TAB */}
            {activeTab === "history" && (
              <HistorySettings
                accentColor={accentColor}
                accentGlow={accentGlow}
                recentFiles={recentFiles}
                clearPlaybackHistory={clearPlaybackHistory}
                deleteHistoryItem={deleteHistoryItem}
                openFile={openFile}
                toggleSettingsModal={toggleSettingsModal}
              />
            )}

            {/* UPDATES & ABOUT TAB */}
            {activeTab === "updates" && (
              <UpdateSettings
                accentColor={accentColor}
                accentGlow={accentGlow}
                accentText={accentText}
                appVersion={appVersion}
                autoCheckUpdates={autoCheckUpdates}
                toggleAutoCheckUpdates={toggleAutoCheckUpdates}
              />
            )}
          </div>
        </div>
      </div>

      {/* Global Restore Factory Defaults Confirmation Dialog */}
      {showRestoreConfirm && (
        <RestoreDefaultsDialog
          accentColor={accentColor}
          accentGlow={accentGlow}
          accentText={accentText}
          onConfirm={handleRestoreDefaults}
          onCancel={() => setShowRestoreConfirm(false)}
        />
      )}
    </div>
  );
}
