import { getCurrentWindow } from "@tauri-apps/api/window";
import type { StateCreator } from "zustand";
import { playerService } from "../../services/player/mpvPlayerService";
import { storageService } from "../../services/storage/storageService";
import {
  PlaybackProfile,
  DEFAULT_PROFILES,
} from "../../services/player/profileTypes";
import { globalShortcutsService } from "../../services/shortcuts/globalShortcutsService";
import { localShortcutsService } from "../../services/shortcuts/localShortcutsService";
import { useThemeStore } from "../themeStore";
import type { PlayerStore, SettingsSlice, RepeatMode } from "./types";
import {
  setSleepTimerInterval,
  clearSleepTimerInterval,
} from "./helpers";

let savedPreFadeVolume: number | null = null;
let skipAnimationTimer: number | null = null;

export const createSettingsSlice: StateCreator<
  PlayerStore,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  skipAnimation: null,
  showSkipIndicators: true,
  scrollVolumeEnabled: true,
  autoPlayNext: true,

  toggleAutoPlayNext: async (enabled?: boolean) => {
    const next = enabled !== undefined ? enabled : !get().autoPlayNext;
    const prevRepeat = get().repeatMode;
    // Keep Auto-Play Next and Repeat coherent:
    //  - Repeat "all" loops the playlist, which requires advancing => Auto-Play Next ON.
    //  - Repeat "one" loops the current file, which forbids advancing => Auto-Play Next OFF.
    let repeat = prevRepeat;
    if (next && repeat === "one") repeat = "off";
    if (!next && repeat === "all") repeat = "off";
    set({ autoPlayNext: next, repeatMode: repeat });
    await storageService.setPreference("autoPlayNext", next);
    if (repeat !== prevRepeat) {
      await storageService.setPreference("repeatMode", repeat);
      await playerService.setRepeatMode(repeat);
    }
    get().showOSD(next ? "Auto-Play Next: On" : "Auto-Play Next: Off");
  },

  toggleShowSkipIndicators: async (enabled?: boolean) => {
    const next = enabled !== undefined ? enabled : !get().showSkipIndicators;
    set({ showSkipIndicators: next });
    await storageService.setPreference("showSkipIndicators", next);
    get().showOSD(next ? "Skip Badges: Enabled" : "Skip Badges: Disabled");
  },

  setScrollVolumeEnabled: async (enabled: boolean) => {
    set({ scrollVolumeEnabled: enabled });
    await storageService.setPreference("scrollVolumeEnabled", enabled);
  },

  // Sleep Timer & Night Listening State
  isSleepTimerOpen: false,
  toggleSleepTimer: (open?: boolean) => {
    set((s) => ({
      isSleepTimerOpen: open !== undefined ? open : !s.isSleepTimerOpen,
    }));
  },
  sleepTimer: {
    isActive: false,
    totalSeconds: 0,
    remainingSeconds: 0,
    fadeVolumeOnEnd: true,
    action: "pause",
  },
  isNightListening: false,
  pauseOnSystemSleep: true,

  startSleepTimer: (minutes: number, fadeVolume = true, action = "pause") => {
    get().cancelSleepTimer();
    const totalSeconds = Math.round(minutes * 60);
    savedPreFadeVolume = get().volume;

    set({
      sleepTimer: {
        isActive: true,
        totalSeconds,
        remainingSeconds: totalSeconds,
        fadeVolumeOnEnd: fadeVolume,
        action,
      },
    });

    get().showOSD(
      `Sleep Timer: ${minutes} min${fadeVolume ? " (Smooth Fade)" : ""}`,
    );

    setSleepTimerInterval(window.setInterval(async () => {
      const { sleepTimer, volume } = get();
      if (!sleepTimer.isActive) {
        clearSleepTimerInterval();
        return;
      }

      const nextRemaining = sleepTimer.remainingSeconds - 1;

      // Smooth volume fade over last 45 seconds
      if (
        sleepTimer.fadeVolumeOnEnd &&
        savedPreFadeVolume !== null &&
        nextRemaining <= 45 &&
        nextRemaining > 0
      ) {
        const fraction = nextRemaining / 45;
        const fadedVolume = Math.round(savedPreFadeVolume * fraction);
        if (fadedVolume !== volume) {
          await playerService.setVolume(fadedVolume);
        }
      }

      if (nextRemaining <= 0) {
        clearSleepTimerInterval();

        set({
          sleepTimer: {
            isActive: false,
            totalSeconds: 0,
            remainingSeconds: 0,
            fadeVolumeOnEnd: true,
            action: "pause",
          },
        });

        // Restore original volume level
        if (savedPreFadeVolume !== null) {
          await playerService.setVolume(savedPreFadeVolume);
          savedPreFadeVolume = null;
        }

        if (sleepTimer.action === "pause") {
          await get().pause();
          get().showOSD("Sleep timer reached: Playback stopped");
        } else if (sleepTimer.action === "closeApp") {
          try {
            await getCurrentWindow().close();
          } catch (err) {
            console.warn("Error closing window on sleep timer:", err);
          }
        }
      } else {
        set((state) => ({
          sleepTimer: {
            ...state.sleepTimer,
            remainingSeconds: nextRemaining,
          },
        }));
      }
    }, 1000));
  },

  cancelSleepTimer: () => {
    clearSleepTimerInterval();
    if (savedPreFadeVolume !== null) {
      get().setVolume(savedPreFadeVolume);
      savedPreFadeVolume = null;
    }
    set({
      sleepTimer: {
        isActive: false,
        totalSeconds: 0,
        remainingSeconds: 0,
        fadeVolumeOnEnd: true,
        action: "pause",
      },
    });
    get().showOSD("Sleep Timer: Cancelled");
  },

  addSleepTimerMinutes: (minutes: number) => {
    const { sleepTimer } = get();
    if (!sleepTimer.isActive) {
      get().startSleepTimer(minutes);
      return;
    }
    const added = minutes * 60;
    set({
      sleepTimer: {
        ...sleepTimer,
        totalSeconds: sleepTimer.totalSeconds + added,
        remainingSeconds: sleepTimer.remainingSeconds + added,
      },
    });
    const minsLeft = Math.ceil((sleepTimer.remainingSeconds + added) / 60);
    get().showOSD(`Added +${minutes}m (${minsLeft}m remaining)`);
  },

  setNightListening: async (enabled: boolean) => {
    set({ isNightListening: enabled });
    await storageService.setPreference("nightListening", enabled);
    if (enabled) {
      // Night Listening: dialogue booster & peak limiter (loudnorm)
      await playerService.setMpvProperty(
        "af",
        "lavfi=[loudnorm=I=-16:TP=-1.5:LRA=7]",
      );
      get().showOSD("Night Listening: Enabled (Dynamic Range Compressed)");
    } else {
      const activeProf = get().profiles.find(
        (p) => p.id === get().activeProfileId,
      );
      const filter = activeProf?.settings.audioFilter || "";
      await playerService.setMpvProperty("af", filter);
      get().showOSD("Night Listening: Disabled");
    }
  },

  toggleNightListening: async () => {
    await get().setNightListening(!get().isNightListening);
  },

  setPauseOnSystemSleep: async (enabled: boolean) => {
    set({ pauseOnSystemSleep: enabled });
    await storageService.setPreference("pauseOnSystemSleep", enabled);
    get().showOSD(
      enabled
        ? "Pause on Computer Sleep: Enabled"
        : "Pause on Computer Sleep: Disabled",
    );
  },

  // Playback Profiles
  profiles: DEFAULT_PROFILES,
  activeProfileId: "default",

  applyProfile: async (profileId: string) => {
    const profile = get().profiles.find((p) => p.id === profileId);
    if (!profile) return;

    const s = profile.settings;
    try {
      await playerService.setMpvProperty("brightness", s.brightness);
      await playerService.setMpvProperty("contrast", s.contrast);
      await playerService.setMpvProperty("saturation", s.saturation);
      await playerService.setMpvProperty("gamma", s.gamma);
      await playerService.setMpvProperty("deinterlace", s.deinterlace ? "yes" : "no");

      // Apply audio filter if night listening is not overriding it
      if (!get().isNightListening) {
        await playerService.setMpvProperty(
          "af",
          s.audioFilter || (s.audioNormalize ? "lavfi=[loudnorm]" : ""),
        );
      }

      await playerService.setMpvProperty("audio-delay", s.audioDelay / 1000);
      await playerService.setMpvProperty("sub-font-size", s.subFontSize);
      await playerService.setMpvProperty("sub-color", s.subColor);
      await playerService.setMpvProperty("sub-delay", s.subDelay);
      await playerService.setPlaybackRate(s.playbackRate);
      if (profileId === "battery") {
        await playerService.setVideoRenderer("gpu");
      }

      set({ activeProfileId: profileId });
      await storageService.setPreference("activeProfileId", profileId);
      get().showOSD(`Profile: ${profile.name}`);
    } catch (err) {
      console.error("Failed to apply profile:", err);
    }
  },

  cycleProfile: async () => {
    const { profiles, activeProfileId } = get();
    if (profiles.length <= 1) return;
    const currentIdx = profiles.findIndex((p) => p.id === activeProfileId);
    const nextIdx = (currentIdx + 1) % profiles.length;
    await get().applyProfile(profiles[nextIdx].id);
  },

  saveCustomProfile: async (profile: PlaybackProfile) => {
    const currentProfiles = get().profiles;
    const existingIdx = currentProfiles.findIndex((p) => p.id === profile.id);

    let updated: PlaybackProfile[];
    if (existingIdx >= 0) {
      updated = [...currentProfiles];
      updated[existingIdx] = profile;
    } else {
      updated = [...currentProfiles, profile];
    }

    set({ profiles: updated });

    // Save user custom profiles to storage
    const customOnly = updated.filter((p) => !p.isBuiltIn);
    await storageService.setPreference("customProfiles", customOnly);
    get().showOSD(`Saved profile "${profile.name}"`);
  },

  deleteCustomProfile: async (profileId: string) => {
    const currentProfiles = get().profiles;
    const target = currentProfiles.find((p) => p.id === profileId);
    if (target?.isBuiltIn) {
      get().showOSD("Built-in profiles cannot be deleted");
      return;
    }

    const updated = currentProfiles.filter((p) => p.id !== profileId);
    const newActive =
      get().activeProfileId === profileId ? "default" : get().activeProfileId;

    set({ profiles: updated, activeProfileId: newActive });

    const customOnly = updated.filter((p) => !p.isBuiltIn);
    await storageService.setPreference("customProfiles", customOnly);
    await get().applyProfile(newActive);
    get().showOSD("Profile removed");
  },

  resetProfiles: async () => {
    set({ profiles: DEFAULT_PROFILES, activeProfileId: "default" });
    await storageService.setPreference("customProfiles", []);
    await storageService.setPreference("activeProfileId", "default");
    await get().applyProfile("default");
    get().showOSD("Playback profiles reset to defaults");
  },

  restoreAllDefaults: async () => {
    // 1. Reset theme settings
    await useThemeStore.getState().resetTheme();

    // 2. Reset playback profiles
    await get().resetProfiles();

    // 3. Reset playback states
    set({
      autoPlayNext: true,
      isNightListening: false,
      isAlwaysOnTop: false,
      showSkipIndicators: true,
      scrollVolumeEnabled: true,
      videoFitMode: "fit",
      playbackRate: 1.0,
      isGlobalShortcutsEnabled: true,
      pauseOnSystemSleep: true,
      repeatMode: "off",
      muted: false,
    });

    await storageService.setPreference("autoPlayNext", true);
    // Note: these keys must match the names read back in initialize()
    await storageService.setPreference("nightListening", false);
    await storageService.setPreference("alwaysOnTop", false);
    await storageService.setPreference("pauseOnSystemSleep", true);
    await storageService.setPreference("showSkipIndicators", true);
    await storageService.setPreference("scrollVolumeEnabled", true);
    await storageService.setPreference("globalShortcutsEnabled", true);
    await storageService.setPreference("autoCheckUpdates", true);
    await storageService.setPreference("repeatMode", "off");
    await storageService.setPreference("volume", 100);
    await storageService.setPreference("muted", false);
    set({ autoCheckUpdates: true });
    await localShortcutsService.resetAll();

    // 4. Cancel active sleep timer
    get().cancelSleepTimer();

    // 5. Reset audio/video parameters in MPV engine
    try {
      await playerService.setVolume(100);
      await playerService.setMuted(false);
      await playerService.setRepeatMode("off");
      await playerService.setMpvProperty("contrast", 0);
      await playerService.setMpvProperty("brightness", 0);
      await playerService.setMpvProperty("saturation", 0);
      await playerService.setMpvProperty("gamma", 0);
      await playerService.setMpvProperty("deinterlace", false);
      await playerService.setMpvProperty("speed", 1.0);
      await playerService.setMpvProperty("audio-delay", 0);
      await playerService.setMpvProperty("sub-delay", 0);
      await playerService.setMpvProperty("sub-color", "#ffffff");
      await playerService.setMpvProperty("sub-font-size", 55);
      await playerService.setMpvProperty("af", "");
    } catch {}

    await globalShortcutsService.updateConfig({ enabled: true });

    get().showOSD("All settings restored to factory defaults");
  },

  // Global Shortcuts
  isGlobalShortcutsEnabled: true,
  toggleGlobalShortcuts: async (enabled: boolean) => {
    set({ isGlobalShortcutsEnabled: enabled });
    await storageService.setPreference("globalShortcutsEnabled", enabled);
    await globalShortcutsService.updateConfig({ enabled });
    get().showOSD(
      enabled ? "Global Shortcuts: Active" : "Global Shortcuts: Disabled",
    );
  },

  // Repeat / Loop Mode
  repeatMode: "off",
  setRepeatMode: async (mode: RepeatMode) => {
    // Connected behavior:
    //  - "all" loops the playlist, which requires advancing => Auto-Play Next ON.
    //  - "one" loops the current file, which forbids advancing => Auto-Play Next OFF.
    //  - "off" leaves Auto-Play Next exactly where the user set it.
    const autoPlayNext =
      mode === "all" ? true : mode === "one" ? false : get().autoPlayNext;
    set({ repeatMode: mode, autoPlayNext });
    await storageService.setPreference("repeatMode", mode);
    await storageService.setPreference("autoPlayNext", autoPlayNext);
    await playerService.setRepeatMode(mode);
    get().showOSD(
      mode === "off"
        ? "Repeat: Off"
        : mode === "all"
        ? "Repeat: Entire Playlist"
        : "Repeat: Current File",
    );
  },

  cycleRepeatMode: async () => {
    const order: RepeatMode[] = ["off", "all", "one"];
    const next = order[(order.indexOf(get().repeatMode) + 1) % order.length];
    await get().setRepeatMode(next);
  },

  triggerSkipAnimation: (deltaSeconds: number) => {
    if (!get().showSkipIndicators) return;
    const prev = get().skipAnimation;
    const direction: "forward" | "backward" = deltaSeconds >= 0 ? "forward" : "backward";
    const absDelta = Math.abs(deltaSeconds);
    const now = Date.now();

    let accumulated = absDelta;
    if (prev && prev.direction === direction && now - prev.timestamp < 900) {
      accumulated = prev.accumulatedSeconds + absDelta;
    }

    if (skipAnimationTimer) {
      window.clearTimeout(skipAnimationTimer);
    }

    set({
      skipAnimation: {
        direction,
        accumulatedSeconds: accumulated,
        timestamp: now,
      },
    });

    skipAnimationTimer = window.setTimeout(() => {
      set({ skipAnimation: null });
      skipAnimationTimer = null;
    }, 750);
  },
});
