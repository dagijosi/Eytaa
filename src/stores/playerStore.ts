import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { playerService } from "../services/player/mpvPlayerService";
import { storageService, HistoryEntry } from "../services/storage/storageService";
import { PlayerState } from "../services/player/types";
import {
  PlaybackProfile,
  DEFAULT_PROFILES,
} from "../services/player/profileTypes";
import { globalShortcutsService } from "../services/shortcuts/globalShortcutsService";
import { formatMediaTitle } from "../utils/mediaTitle";

export interface PlaylistItem {
  id: string;
  filePath: string;
  title: string;
}

export interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SleepTimerState {
  isActive: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  fadeVolumeOnEnd: boolean;
  action: "pause" | "closeApp";
}

let sleepTimerInterval: number | null = null;
let savedPreFadeVolume: number | null = null;
const promptedDirectories = new Set<string>();

interface PlayerStoreState extends PlayerState {
  recentFiles: HistoryEntry[];
  playlist: PlaylistItem[];
  currentPlaylistIndex: number;
  autoPlayNext: boolean;
  toggleAutoPlayNext: (enabled?: boolean) => Promise<void>;
  osdMessage: string | null;
  osdTimer: number | null;
  isControlsVisible: boolean;
  isPlaylistOpen: boolean;
  isSettingsOpen: boolean;
  videoFitMode: "fit" | "fill" | "stretch";
  detectedSiblings: string[] | null;
  showSiblingPrompt: boolean;

  // Picture-in-Picture
  isPiP: boolean;
  pipPreviousGeometry: WindowGeometry | null;
  togglePiP: () => Promise<void>;

  // Sleep Timer & Night Listening
  isSleepTimerOpen: boolean;
  toggleSleepTimer: (open?: boolean) => void;
  sleepTimer: SleepTimerState;
  isNightListening: boolean;
  pauseOnSystemSleep: boolean;
  startSleepTimer: (
    minutes: number,
    fadeVolume?: boolean,
    action?: "pause" | "closeApp",
  ) => void;
  cancelSleepTimer: () => void;
  addSleepTimerMinutes: (minutes: number) => void;
  setNightListening: (enabled: boolean) => Promise<void>;
  toggleNightListening: () => Promise<void>;
  setPauseOnSystemSleep: (enabled: boolean) => Promise<void>;

  // Playback Profiles
  profiles: PlaybackProfile[];
  activeProfileId: string;
  applyProfile: (profileId: string) => Promise<void>;
  cycleProfile: () => Promise<void>;
  saveCustomProfile: (profile: PlaybackProfile) => Promise<void>;
  deleteCustomProfile: (profileId: string) => Promise<void>;

  // Global Media Shortcuts
  isGlobalShortcutsEnabled: boolean;
  toggleGlobalShortcuts: (enabled: boolean) => Promise<void>;

  // Core Actions
  initialize: () => Promise<void>;
  openFile: (path: string) => Promise<void>;
  openMultipleFiles: (paths: string[]) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayback: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  seekRelative: (deltaSeconds: number) => Promise<void>;
  setVolume: (value: number) => Promise<void>;
  changeVolume: (delta: number) => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
  toggleMute: () => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  changePlaybackRate: (delta: number) => Promise<void>;
  loadSubtitle: (path: string) => Promise<void>;
  selectAudioTrack: (trackId: number) => Promise<void>;
  selectSubtitleTrack: (trackId: number) => Promise<void>;
  addToPlaylist: (paths: string[]) => void;
  removeFromPlaylist: (index: number) => void;
  reorderPlaylist: (fromIndex: number, toIndex: number) => void;
  shufflePlaylist: () => void;
  sortPlaylist: (mode: "natural" | "az" | "za" | "reverse") => void;
  clearPlaylist: () => void;
  playPlaylistItem: (index: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  togglePlaylistDrawer: () => void;
  toggleSettingsModal: () => void;
  setVideoFitMode: (mode: "fit" | "fill" | "stretch") => Promise<void>;
  cycleVideoFitMode: () => Promise<void>;
  addSiblingsToPlaylist: () => void;
  dismissSiblingPrompt: () => void;
  showOSD: (text: string) => void;
  setControlsVisible: (visible: boolean) => void;
  refreshRecentFiles: () => Promise<void>;
  dispose: () => Promise<void>;
}

export const usePlayerStore = create<PlayerStoreState>((set, get) => {
  playerService.subscribe((state) => {
    set({
      status: state.status,
      currentTime: state.currentTime,
      duration: state.duration,
      volume: state.volume,
      muted: state.muted,
      playbackRate: state.playbackRate,
      audioTracks: state.audioTracks,
      subtitleTracks: state.subtitleTracks,
      currentAudioTrackId: state.currentAudioTrackId,
      currentSubtitleTrackId: state.currentSubtitleTrackId,
      mediaMetadata: state.mediaMetadata,
      error: state.error,
      isInitialized: state.isInitialized,
    });
  });

  return {
    ...playerService.getPlayerState(),
    recentFiles: [],
    playlist: [],
    currentPlaylistIndex: -1,
    autoPlayNext: true,
    toggleAutoPlayNext: async (enabled?: boolean) => {
      const next = enabled !== undefined ? enabled : !get().autoPlayNext;
      set({ autoPlayNext: next });
      await storageService.setPreference("autoPlayNext", next);
      get().showOSD(next ? "Auto-Play Next: On" : "Auto-Play Next: Off");
    },
    osdMessage: null,
    osdTimer: null,
    isControlsVisible: true,
    isPlaylistOpen: false,
    isSettingsOpen: false,
    videoFitMode: "fit",
    detectedSiblings: null,
    showSiblingPrompt: false,

    // Picture-in-Picture State
    isPiP: false,
    pipPreviousGeometry: null,

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

    // Playback Profiles
    profiles: DEFAULT_PROFILES,
    activeProfileId: "default",

    // Global Media Shortcuts
    isGlobalShortcutsEnabled: true,

    initialize: async () => {
      await playerService.initialize();

      // Load saved volume
      const savedVolume = await storageService.getPreference<number>("volume");
      if (typeof savedVolume === "number") {
        await playerService.setVolume(savedVolume);
      }

      // Load recent history
      const recent = await storageService.getRecentFiles(15);
      set({ recentFiles: recent });

      // Load auto-play next setting
      const savedAutoPlay =
        await storageService.getPreference<boolean>("autoPlayNext");
      if (typeof savedAutoPlay === "boolean") {
        set({ autoPlayNext: savedAutoPlay });
      }

      // Listen for natural end of playback for auto-play next
      playerService.onEndFile(async (reason) => {
        if (reason === "eof") {
          const { autoPlayNext, playlist, currentPlaylistIndex } = get();
          if (autoPlayNext && playlist.length > 1) {
            const nextIdx = currentPlaylistIndex >= 0 ? currentPlaylistIndex + 1 : 1;
            if (nextIdx < playlist.length) {
              await get().playPlaylistItem(nextIdx);
            } else {
              get().showOSD("End of playlist reached");
            }
          }
        }
      });

      // Load saved profiles & active profile
      const savedCustomProfiles =
        await storageService.getPreference<PlaybackProfile[]>("customProfiles");
      let allProfiles = [...DEFAULT_PROFILES];
      if (savedCustomProfiles && Array.isArray(savedCustomProfiles)) {
        allProfiles = [...DEFAULT_PROFILES, ...savedCustomProfiles];
      }

      const savedActiveProfileId =
        await storageService.getPreference<string>("activeProfileId");
      set({
        profiles: allProfiles,
        activeProfileId: savedActiveProfileId || "default",
      });

      // Load night listening setting
      const savedNightMode =
        await storageService.getPreference<boolean>("nightListening");
      if (typeof savedNightMode === "boolean") {
        set({ isNightListening: savedNightMode });
      }

      // Load pause-on-sleep setting
      const savedPauseOnSleep =
        await storageService.getPreference<boolean>("pauseOnSystemSleep");
      if (typeof savedPauseOnSleep === "boolean") {
        set({ pauseOnSystemSleep: savedPauseOnSleep });
      }

      // Initialize global shortcuts
      const savedShortcutsEnabled =
        await storageService.getPreference<boolean>("globalShortcutsEnabled");
      const shortcutsActive = savedShortcutsEnabled !== false;
      set({ isGlobalShortcutsEnabled: shortcutsActive });

      globalShortcutsService.setHandler(async (action) => {
        switch (action) {
          case "play-pause":
            await get().togglePlayback();
            break;
          case "next":
            await get().playNext();
            break;
          case "previous":
            await get().playPrevious();
            break;
          case "volume-up":
            await get().changeVolume(5);
            break;
          case "volume-down":
            await get().changeVolume(-5);
            break;
          case "mute":
            await get().toggleMute();
            break;
        }
      });

      if (shortcutsActive) {
        await globalShortcutsService.applyShortcuts();
      }
    },

    // Picture-in-Picture Toggle
    togglePiP: async () => {
      const { isPiP, pipPreviousGeometry } = get();
      if (!isPiP) {
        try {
          const geom = await invoke<WindowGeometry>("enter_pip");
          set({ isPiP: true, pipPreviousGeometry: geom });
          get().showOSD("Picture-in-Picture: On");
        } catch (e) {
          console.error("Failed to enter Picture-in-Picture:", e);
          get().showOSD("PiP mode unavailable");
        }
      } else {
        try {
          const savedAlwaysOnTop =
            (await storageService.getPreference<boolean>("alwaysOnTop")) || false;
          await invoke("exit_pip", {
            restore: pipPreviousGeometry,
            keepAlwaysOnTop: savedAlwaysOnTop,
          });
          set({ isPiP: false, pipPreviousGeometry: null });
          get().showOSD("Exited Picture-in-Picture");
        } catch (e) {
          console.error("Failed to exit Picture-in-Picture:", e);
          set({ isPiP: false });
        }
      }
    },

    // Sleep Timer Controls
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

      sleepTimerInterval = window.setInterval(async () => {
        const { sleepTimer, volume } = get();
        if (!sleepTimer.isActive) {
          if (sleepTimerInterval) window.clearInterval(sleepTimerInterval);
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
          if (sleepTimerInterval) window.clearInterval(sleepTimerInterval);
          sleepTimerInterval = null;

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
      }, 1000);
    },

    cancelSleepTimer: () => {
      if (sleepTimerInterval) {
        window.clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
      }
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

    // Playback Profiles Actions
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

    // Global Shortcuts
    toggleGlobalShortcuts: async (enabled: boolean) => {
      set({ isGlobalShortcutsEnabled: enabled });
      await storageService.setPreference("globalShortcutsEnabled", enabled);
      await globalShortcutsService.updateConfig({ enabled });
      get().showOSD(
        enabled ? "Global Shortcuts: Active" : "Global Shortcuts: Disabled",
      );
    },

    openFile: async (path: string) => {
      await playerService.openFile(path);
      const resumePos = await storageService.getResumePosition(path);
      if (resumePos && resumePos > 5) {
        await playerService.seek(resumePos);
        get().showOSD(
          `Resumed at ${Math.floor(resumePos / 60)}:${Math.floor(resumePos % 60).toString().padStart(2, "0")}`,
        );
      }
      const rawName = path.split(/[/\\]/).pop() || path;
      const title = formatMediaTitle(rawName, path);
      await storageService.recordPlaybackHistory(path, title);
      const recent = await storageService.getRecentFiles(15);

      // Add to playlist if not already present
      const currentPlaylist = get().playlist;
      const existingIdx = currentPlaylist.findIndex(
        (item) => item.filePath === path,
      );
      if (existingIdx === -1) {
        const newItem: PlaylistItem = {
          id: `${Date.now()}-${Math.random()}`,
          filePath: path,
          title,
        };
        set({
          playlist: [...currentPlaylist, newItem],
          currentPlaylistIndex: currentPlaylist.length,
          recentFiles: recent,
        });
      } else {
        set({ currentPlaylistIndex: existingIdx, recentFiles: recent });
      }

      get().showOSD(title);

      // Check for sibling episodes only if not navigating an active playlist and not already prompted
      try {
        const dir = path.replace(/[/\\][^/\\]+$/, "");
        const activePlaylist = get().playlist;
        const existingPaths = new Set(activePlaylist.map((item) => item.filePath));

        if (activePlaylist.length <= 1 && !promptedDirectories.has(dir)) {
          const siblings = await invoke<string[]>("find_sibling_episodes", {
            filePath: path,
          });
          const unadded = (siblings || []).filter((s) => !existingPaths.has(s));
          if (unadded.length > 0) {
            set({ detectedSiblings: unadded, showSiblingPrompt: true });
          } else {
            set({ detectedSiblings: null, showSiblingPrompt: false });
          }
        } else {
          set({ detectedSiblings: null, showSiblingPrompt: false });
        }
      } catch (err) {
        console.warn("Failed to check sibling episodes:", err);
      }
    },

    openMultipleFiles: async (paths: string[]) => {
      if (paths.length === 0) return;
      const newItems: PlaylistItem[] = paths.map((p) => ({
        id: `${Date.now()}-${Math.random()}`,
        filePath: p,
        title: formatMediaTitle(p.split(/[/\\]/).pop() || p, p),
      }));
      set((state) => ({
        playlist: [...state.playlist, ...newItems],
        currentPlaylistIndex: state.playlist.length,
      }));
      await get().openFile(paths[0]);
    },

    play: async () => {
      await playerService.play();
      get().showOSD("Play");
    },

    pause: async () => {
      await playerService.pause();
      const current = get();
      if (current.mediaMetadata?.filePath && current.currentTime > 0) {
        await storageService.setResumePosition(
          current.mediaMetadata.filePath,
          current.currentTime,
        );
      }
      get().showOSD("Pause");
    },

    togglePlayback: async () => {
      const isPlaying = get().status === "playing";
      if (isPlaying) {
        await get().pause();
      } else {
        await get().play();
      }
    },

    stop: async () => {
      await playerService.stop();
      get().showOSD("Stop");
    },

    seek: async (seconds: number) => {
      await playerService.seek(seconds);
    },

    seekRelative: async (deltaSeconds: number) => {
      const current = get().currentTime;
      const target = Math.max(0, current + deltaSeconds);
      await playerService.seek(target);
      get().showOSD(`${deltaSeconds > 0 ? "+" : ""}${deltaSeconds}s`);
    },

    setVolume: async (value: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      await playerService.setVolume(clamped);
      await storageService.setPreference("volume", clamped);
      get().showOSD(`Volume: ${clamped}%`);
    },

    changeVolume: async (delta: number) => {
      const current = get().volume;
      await get().setVolume(current + delta);
    },

    setMuted: async (muted: boolean) => {
      await playerService.setMuted(muted);
      await storageService.setPreference("muted", muted);
      get().showOSD(muted ? "Mute" : "Unmute");
    },

    toggleMute: async () => {
      await get().setMuted(!get().muted);
    },

    setPlaybackRate: async (rate: number) => {
      await playerService.setPlaybackRate(rate);
      get().showOSD(`Speed: ${rate.toFixed(2)}x`);
    },

    changePlaybackRate: async (delta: number) => {
      const current = get().playbackRate;
      const target = Math.max(
        0.25,
        Math.min(3.0, Math.round((current + delta) * 4) / 4),
      );
      await get().setPlaybackRate(target);
    },

    loadSubtitle: async (path: string) => {
      await playerService.loadSubtitle(path);
      const name = path.split(/[/\\]/).pop();
      get().showOSD(`Loaded subtitle: ${name}`);
    },

    selectAudioTrack: async (trackId: number) => {
      await playerService.selectAudioTrack(trackId);
      const track = get().audioTracks.find((t) => t.id === trackId);
      get().showOSD(
        `Audio: ${track?.title || track?.lang || `Track ${trackId}`}`,
      );
    },

    selectSubtitleTrack: async (trackId: number) => {
      await playerService.selectSubtitleTrack(trackId);
      if (trackId === 0) {
        get().showOSD("Subtitles: Off");
      } else {
        const track = get().subtitleTracks.find((t) => t.id === trackId);
        get().showOSD(
          `Subtitles: ${track?.title || track?.lang || `Track ${trackId}`}`,
        );
      }
    },

    addToPlaylist: (paths: string[]) => {
      const current = get().playlist;
      const existingPaths = new Set(current.map((item) => item.filePath));
      const freshPaths = paths.filter((p) => !existingPaths.has(p));
      if (freshPaths.length === 0) {
        return;
      }
      const newItems: PlaylistItem[] = freshPaths.map((p) => ({
        id: `${Date.now()}-${Math.random()}`,
        filePath: p,
        title: formatMediaTitle(p.split(/[/\\]/).pop() || p, p),
      }));
      set((state) => ({ playlist: [...state.playlist, ...newItems] }));
      get().showOSD(`Added ${newItems.length} items to playlist`);
    },

    addSiblingsToPlaylist: () => {
      const siblings = get().detectedSiblings;
      if (siblings && siblings.length > 0) {
        get().addToPlaylist(siblings);
      }
      const currentPath = get().mediaMetadata?.filePath;
      if (currentPath) {
        const dir = currentPath.replace(/[/\\][^/\\]+$/, "");
        promptedDirectories.add(dir);
      }
      set({ showSiblingPrompt: false, detectedSiblings: null });
    },

    dismissSiblingPrompt: () => {
      const currentPath = get().mediaMetadata?.filePath;
      if (currentPath) {
        const dir = currentPath.replace(/[/\\][^/\\]+$/, "");
        promptedDirectories.add(dir);
      }
      set({ showSiblingPrompt: false, detectedSiblings: null });
    },

    removeFromPlaylist: (index: number) => {
      set((state) => {
        const updated = [...state.playlist];
        updated.splice(index, 1);
        let newIdx = state.currentPlaylistIndex;
        if (index === newIdx) {
          newIdx = -1;
        } else if (index < newIdx) {
          newIdx -= 1;
        }
        return { playlist: updated, currentPlaylistIndex: newIdx };
      });
    },

    reorderPlaylist: (fromIndex: number, toIndex: number) => {
      set((state) => {
        if (
          fromIndex < 0 ||
          fromIndex >= state.playlist.length ||
          toIndex < 0 ||
          toIndex >= state.playlist.length ||
          fromIndex === toIndex
        ) {
          return state;
        }
        const updated = [...state.playlist];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);

        let newIdx = state.currentPlaylistIndex;
        if (state.currentPlaylistIndex === fromIndex) {
          newIdx = toIndex;
        } else if (
          fromIndex < state.currentPlaylistIndex &&
          toIndex >= state.currentPlaylistIndex
        ) {
          newIdx -= 1;
        } else if (
          fromIndex > state.currentPlaylistIndex &&
          toIndex <= state.currentPlaylistIndex
        ) {
          newIdx += 1;
        }
        return { playlist: updated, currentPlaylistIndex: newIdx };
      });
    },

    shufflePlaylist: () => {
      const { playlist, currentPlaylistIndex } = get();
      if (playlist.length <= 1) return;
      const currentItem =
        currentPlaylistIndex >= 0 ? playlist[currentPlaylistIndex] : null;
      const shuffled = [...playlist].sort(() => Math.random() - 0.5);
      const newIdx = currentItem
        ? shuffled.findIndex((item) => item.id === currentItem.id)
        : 0;
      set({ playlist: shuffled, currentPlaylistIndex: newIdx });
      get().showOSD("Playlist shuffled");
    },

    sortPlaylist: (mode: "natural" | "az" | "za" | "reverse") => {
      const { playlist, currentPlaylistIndex } = get();
      if (playlist.length <= 1) return;

      const currentItem =
        currentPlaylistIndex >= 0 && currentPlaylistIndex < playlist.length
          ? playlist[currentPlaylistIndex]
          : null;

      const sorted = [...playlist];

      switch (mode) {
        case "natural":
          sorted.sort((a, b) =>
            a.title.localeCompare(b.title, undefined, {
              numeric: true,
              sensitivity: "base",
            }),
          );
          get().showOSD("Sorted: Natural order");
          break;
        case "az":
          sorted.sort((a, b) =>
            a.title.localeCompare(b.title, undefined, {
              sensitivity: "base",
            }),
          );
          get().showOSD("Sorted: A → Z");
          break;
        case "za":
          sorted.sort((a, b) =>
            b.title.localeCompare(a.title, undefined, {
              sensitivity: "base",
            }),
          );
          get().showOSD("Sorted: Z → A");
          break;
        case "reverse":
          sorted.reverse();
          get().showOSD("Playlist: Reversed order");
          break;
      }

      const newIdx = currentItem
        ? sorted.findIndex((item) => item.filePath === currentItem.filePath)
        : -1;

      set({ playlist: sorted, currentPlaylistIndex: newIdx });
    },

    clearPlaylist: () => {
      set({ playlist: [], currentPlaylistIndex: -1 });
      get().showOSD("Playlist cleared");
    },

    playPlaylistItem: async (index: number) => {
      const items = get().playlist;
      if (index >= 0 && index < items.length) {
        set({ currentPlaylistIndex: index });
        await get().openFile(items[index].filePath);
      }
    },

    playNext: async () => {
      const { playlist, currentPlaylistIndex } = get();
      if (playlist.length === 0) return;
      const nextIndex = (currentPlaylistIndex + 1) % playlist.length;
      await get().playPlaylistItem(nextIndex);
    },

    playPrevious: async () => {
      const { playlist, currentPlaylistIndex } = get();
      if (playlist.length === 0) return;
      const prevIndex =
        (currentPlaylistIndex - 1 + playlist.length) % playlist.length;
      await get().playPlaylistItem(prevIndex);
    },

    togglePlaylistDrawer: () => {
      set((s) => ({ isPlaylistOpen: !s.isPlaylistOpen }));
    },

    toggleSettingsModal: () => {
      set((s) => ({ isSettingsOpen: !s.isSettingsOpen }));
    },

    setVideoFitMode: async (mode: "fit" | "fill" | "stretch") => {
      set({ videoFitMode: mode });
      await playerService.setVideoFit(mode);
      const labels: Record<string, string> = {
        fit: "Full Video (Fit)",
        fill: "Crop (Fill Screen)",
        stretch: "Stretch (Window)",
      };
      get().showOSD(`Aspect: ${labels[mode] || mode}`);
    },

    cycleVideoFitMode: async () => {
      const current = get().videoFitMode;
      const modes: Array<"fit" | "fill" | "stretch"> = ["fit", "fill", "stretch"];
      const next = modes[(modes.indexOf(current) + 1) % modes.length];
      await get().setVideoFitMode(next);
    },

    showOSD: (text: string) => {
      const currentTimer = get().osdTimer;
      if (currentTimer) {
        window.clearTimeout(currentTimer);
      }
      const newTimer = window.setTimeout(() => {
        set({ osdMessage: null, osdTimer: null });
      }, 1800);
      set({ osdMessage: text, osdTimer: newTimer });
    },

    setControlsVisible: (visible: boolean) => {
      set({ isControlsVisible: visible });
    },

    refreshRecentFiles: async () => {
      const recent = await storageService.getRecentFiles(15);
      set({ recentFiles: recent });
    },

    dispose: async () => {
      if (sleepTimerInterval) {
        window.clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
      }
      await globalShortcutsService.dispose();
      await playerService.dispose();
    },
  };
});
