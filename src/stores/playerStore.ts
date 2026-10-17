import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { playerService } from "../services/player/mpvPlayerService";
import { storageService, HistoryEntry } from "../services/storage/storageService";
import { PlayerState, ChapterInfo } from "../services/player/types";
import {
  PlaybackProfile,
  DEFAULT_PROFILES,
} from "../services/player/profileTypes";
import { globalShortcutsService } from "../services/shortcuts/globalShortcutsService";
import { localShortcutsService } from "../services/shortcuts/localShortcutsService";
import { initializeMediaSession } from "../services/system/mediaSessionService";
import { formatMediaTitle } from "../utils/mediaTitle";
import { useThemeStore } from "./themeStore";
import { updaterService } from "../services/updater/updaterService";
import { libraryService } from "../services/library/libraryService";

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

export interface SkipAnimationState {
  direction: "forward" | "backward";
  accumulatedSeconds: number;
  timestamp: number;
}

export type RepeatMode = "off" | "all" | "one";

export interface SavedPlaylistMeta {
  id: number;
  name: string;
  itemCount: number;
  createdAt: string;
}

let sleepTimerInterval: number | null = null;
let savedPreFadeVolume: number | null = null;
let activeLoadSequence = 0;
let skipAnimationTimer: number | null = null;
const promptedDirectories = new Set<string>();

// Natural sort for file paths so "Episode 2" comes before "Episode 10".
function naturalPathCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

// Merge a folder's ordered episode list into the playlist, keeping the currently
// playing episode as the anchor so "previous"/"next" continue in the right order.
function mergeEpisodesIntoPlaylist(
  playlist: PlaylistItem[],
  orderedEpisodes: string[],
  currentPath: string,
): { playlist: PlaylistItem[]; currentPlaylistIndex: number } {
  const makeItem = (filePath: string): PlaylistItem => ({
    id: `${Date.now()}-${Math.random()}`,
    filePath,
    title: formatMediaTitle(filePath.split(/[/\\]/).pop() || filePath, filePath),
  });

  const existingPaths = new Set(playlist.map((item) => item.filePath));
  const currentIndex = playlist.findIndex((item) => item.filePath === currentPath);
  const anchorPos = orderedEpisodes.indexOf(currentPath);

  // Playlist holds nothing but the currently playing file (or is empty), or the
  // current file isn't part of the folder listing: rebuild from the folder order.
  if (playlist.length <= 1 || currentIndex === -1 || anchorPos === -1) {
    const ordered = orderedEpisodes.map(makeItem);
    const activeIdx = ordered.findIndex((item) => item.filePath === currentPath);
    return { playlist: ordered, currentPlaylistIndex: activeIdx };
  }

  const before = orderedEpisodes
    .slice(0, anchorPos)
    .filter((p) => !existingPaths.has(p))
    .map(makeItem);
  const after = orderedEpisodes
    .slice(anchorPos + 1)
    .filter((p) => !existingPaths.has(p))
    .map(makeItem);

  const updated = [...playlist];
  updated.splice(currentIndex + 1, 0, ...after);
  updated.splice(currentIndex, 0, ...before);

  return {
    playlist: updated,
    currentPlaylistIndex: updated.findIndex((item) => item.filePath === currentPath),
  };
}

interface PlayerStoreState extends PlayerState {
  skipAnimation: SkipAnimationState | null;
  triggerSkipAnimation: (deltaSeconds: number) => void;
  showSkipIndicators: boolean;
  toggleShowSkipIndicators: (enabled?: boolean) => Promise<void>;
  scrollVolumeEnabled: boolean;
  setScrollVolumeEnabled: (enabled: boolean) => Promise<void>;
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
  isLibraryOpen: boolean;
  toggleLibraryModal: (open?: boolean) => void;
  videoFitMode: "fit" | "fill" | "stretch";
  detectedSiblings: string[] | null;
  showSiblingPrompt: boolean;

  // Window & TopNav Quick Controls
  isAlwaysOnTop: boolean;
  toggleAlwaysOnTop: () => Promise<void>;

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
  resetProfiles: () => Promise<void>;
  restoreAllDefaults: () => Promise<void>;

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
  toggleSubtitleTrack: () => Promise<void>;
  lastActiveSubtitleTrackId: number | null;
  addToPlaylist: (paths: string[]) => void;
  removeFromPlaylist: (index: number) => void;
  reorderPlaylist: (fromIndex: number, toIndex: number) => void;
  shufflePlaylist: () => void;
  sortPlaylist: (mode: "natural" | "az" | "za" | "reverse") => void;
  clearPlaylist: () => void;
  playPlaylistItem: (index: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;

  // Repeat / Loop Mode
  repeatMode: RepeatMode;
  setRepeatMode: (mode: RepeatMode) => Promise<void>;
  cycleRepeatMode: () => Promise<void>;

  // Chapters
  chapters: ChapterInfo[];
  currentChapterIndex: number;
  seekToChapter: (index: number) => Promise<void>;

  // Tools
  takeScreenshot: () => Promise<void>;
  showStats: boolean;
  toggleStats: (enabled?: boolean) => void;

  // Network / URL streaming
  openUrl: (url: string) => Promise<void>;
  isUrlModalOpen: boolean;
  toggleUrlModal: (open?: boolean) => void;

  // Saved (named) playlists
  savedPlaylists: SavedPlaylistMeta[];
  refreshSavedPlaylists: () => Promise<void>;
  saveCurrentPlaylist: (name: string, playlistId?: number) => Promise<void>;
  loadSavedPlaylist: (playlistId: number) => Promise<void>;
  deleteSavedPlaylist: (playlistId: number) => Promise<void>;

  // Update Notification
  availableUpdate: { version: string; releaseNotes?: string } | null;
  showUpdateToast: boolean;
  autoCheckUpdates: boolean;
  updateCheckToast: {
    state: "checking" | "up-to-date" | "available" | "error";
    version?: string;
    message?: string;
  } | null;
  checkForUpdatesManually: () => Promise<void>;
  dismissUpdateCheckToast: () => void;
  settingsInitialTab: string | null;
  dismissUpdateToast: () => Promise<void>;
  toggleAutoCheckUpdates: (enabled?: boolean) => Promise<void>;
  checkUpdatesSilently: () => Promise<void>;

  togglePlaylistDrawer: () => void;
  toggleSettingsModal: (open?: boolean | unknown, initialTab?: string) => void;
  setVideoFitMode: (mode: "fit" | "fill" | "stretch") => Promise<void>;
  cycleVideoFitMode: () => Promise<void>;
  addSiblingsToPlaylist: () => void;
  addAllEpisodesFromFolder: () => Promise<void>;
  dismissSiblingPrompt: () => void;
  showOSD: (text: string) => void;
  setControlsVisible: (visible: boolean) => void;
  refreshRecentFiles: () => Promise<void>;
  deleteHistoryItem: (filePath: string) => Promise<void>;
  clearPlaybackHistory: () => Promise<void>;
  dispose: () => Promise<void>;
}

let lastAutoSavedTime = 0;
let lastAutoSavedFile = "";

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

    // Automatically persist progress and duration periodically while playing
    const filePath = state.mediaMetadata?.filePath;
    if (filePath && state.currentTime > 5 && state.status === "playing") {
      const delta = Math.abs(state.currentTime - lastAutoSavedTime);
      if (filePath !== lastAutoSavedFile || delta >= 5) {
        lastAutoSavedTime = state.currentTime;
        lastAutoSavedFile = filePath;
        storageService.setResumePosition(filePath, state.currentTime, state.duration);
      }
    }
  });

  return {
    ...playerService.getPlayerState(),
    recentFiles: [],
    playlist: [],
    currentPlaylistIndex: -1,
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
    skipAnimation: null,
    showSkipIndicators: true,
    toggleShowSkipIndicators: async (enabled?: boolean) => {
      const next = enabled !== undefined ? enabled : !get().showSkipIndicators;
      set({ showSkipIndicators: next });
      await storageService.setPreference("showSkipIndicators", next);
      get().showOSD(next ? "Skip Badges: Enabled" : "Skip Badges: Disabled");
    },
    scrollVolumeEnabled: true,
    setScrollVolumeEnabled: async (enabled: boolean) => {
      set({ scrollVolumeEnabled: enabled });
      await storageService.setPreference("scrollVolumeEnabled", enabled);
    },
    osdMessage: null,
    osdTimer: null,
    isControlsVisible: true,
    isPlaylistOpen: false,
    isSettingsOpen: false,
    isLibraryOpen: false,
    videoFitMode: "fit",
    detectedSiblings: null,
    showSiblingPrompt: false,
        chapters: [],
        currentChapterIndex: -1,
        showStats: false,
        isUrlModalOpen: false,
        savedPlaylists: [],
        repeatMode: "off",

    // Window & TopNav Quick Controls
    isAlwaysOnTop: false,

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

    // Update Notification
    availableUpdate: null,
    showUpdateToast: false,
    autoCheckUpdates: true,
    updateCheckToast: null,
    settingsInitialTab: null,

    initialize: async () => {
      await playerService.initialize();

      // Ensure current position is saved when closing the window
      if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", () => {
          const current = get();
          if (current.mediaMetadata?.filePath && current.currentTime > 5) {
            storageService.setResumePosition(
              current.mediaMetadata.filePath,
              current.currentTime,
              current.duration,
            );
          }
        });
      }

      // Load all saved preferences in parallel — each getPreference is a separate
      // IPC round-trip, so batching keeps startup snappy.
      const [
        savedVolume,
        recent,
        savedAutoPlay,
        savedCustomProfiles,
        savedActiveProfileId,
        savedNightMode,
        savedPauseOnSleep,
        savedShortcutsEnabled,
        savedAlwaysOnTop,
        savedShowSkip,
        savedScrollVolume,
        savedAutoCheck,
        savedRepeatMode,
        savedSession,
      ] = await Promise.all([
        storageService.getPreference<number>("volume"),
        storageService.getRecentFiles(15),
        storageService.getPreference<boolean>("autoPlayNext"),
        storageService.getPreference<PlaybackProfile[]>("customProfiles"),
        storageService.getPreference<string>("activeProfileId"),
        storageService.getPreference<boolean>("nightListening"),
        storageService.getPreference<boolean>("pauseOnSystemSleep"),
        storageService.getPreference<boolean>("globalShortcutsEnabled"),
        storageService.getPreference<boolean>("alwaysOnTop"),
        storageService.getPreference<boolean>("showSkipIndicators"),
        storageService.getPreference<boolean>("scrollVolumeEnabled"),
        storageService.getPreference<boolean>("autoCheckUpdates"),
        storageService.getPreference<RepeatMode>("repeatMode"),
        storageService.getPreference<{
          items: Array<{ filePath: string; title: string }>;
          index: number;
        }>("sessionPlaylist"),
      ]);

      // Restore repeat / loop mode
      if (savedRepeatMode === "off" || savedRepeatMode === "all" || savedRepeatMode === "one") {
        set({ repeatMode: savedRepeatMode });
        playerService.setRepeatMode(savedRepeatMode).catch(() => {});
      }

      // Restore the previous session's playback queue (without auto-playing)
      if (savedSession && Array.isArray(savedSession.items) && savedSession.items.length > 0) {
        const restored: PlaylistItem[] = savedSession.items
          .filter((item) => item && typeof item.filePath === "string")
          .map((item) => ({
            id: `${Date.now()}-${Math.random()}`,
            filePath: item.filePath,
            title: item.title || formatMediaTitle(item.filePath.split(/[/\\]/).pop() || item.filePath, item.filePath),
          }));
        if (restored.length > 0) {
          const idx =
            typeof savedSession.index === "number" &&
            savedSession.index >= 0 &&
            savedSession.index < restored.length
              ? savedSession.index
              : -1;
          set({ playlist: restored, currentPlaylistIndex: idx });
        }
      }

      // Publish Now Playing info to the Windows shell (SMTC / lock screen)
      initializeMediaSession({
        getState: get,
        subscribe: usePlayerStore.subscribe,
      });

      // Apply saved volume
      if (typeof savedVolume === "number") {
        await playerService.setVolume(savedVolume);
      }

      // Recent history
      set({ recentFiles: recent });

      // Auto-play next setting
      if (typeof savedAutoPlay === "boolean") {
        set({ autoPlayNext: savedAutoPlay });
      }

      // Listen for natural end of playback or playback errors
      playerService.onEndFile(async (reason) => {
        if (reason === "eof") {
          const currentMedia = get();
          const filePath = currentMedia.mediaMetadata?.filePath;
          if (filePath) {
            try {
              await libraryService.setWatchedStatus(filePath, true);
              const recent = await storageService.getRecentFiles(15);
              set({ recentFiles: recent });
            } catch (err) {
              console.warn("Failed to update watched status on EOF:", err);
            }
          }

          const { autoPlayNext, playlist, currentPlaylistIndex, repeatMode } =
            get();
          if (repeatMode === "one" && currentPlaylistIndex >= 0) {
            await get().playPlaylistItem(currentPlaylistIndex);
            return;
          }
          if (autoPlayNext && playlist.length > 1) {
            const nextIdx = currentPlaylistIndex >= 0 ? currentPlaylistIndex + 1 : 1;
            if (nextIdx < playlist.length) {
              await get().playPlaylistItem(nextIdx);
            } else if (repeatMode === "all") {
              await get().playPlaylistItem(0);
            } else {
              get().showOSD("End of playlist reached");
            }
          }
        } else if (reason === "error") {
          get().showOSD("Playback error: file damaged or unsupported stream");
          const { autoPlayNext, playlist, currentPlaylistIndex } = get();
          if (autoPlayNext && playlist.length > 1) {
            const nextIdx = currentPlaylistIndex >= 0 ? currentPlaylistIndex + 1 : 1;
            if (nextIdx < playlist.length) {
              get().showOSD("Skipping unplayable file...");
              await get().playPlaylistItem(nextIdx);
            }
          }
        }
      });

      playerService.onHwdecFallback(() => {
        get().showOSD(
          "Hardware acceleration failed — safely switched to CPU software decoding",
        );
      });

      // Profiles & active profile
      let allProfiles = [...DEFAULT_PROFILES];
      if (savedCustomProfiles && Array.isArray(savedCustomProfiles)) {
        allProfiles = [...DEFAULT_PROFILES, ...savedCustomProfiles];
      }
      set({
        profiles: allProfiles,
        activeProfileId: savedActiveProfileId || "default",
      });

      // Night listening setting
      if (typeof savedNightMode === "boolean") {
        set({ isNightListening: savedNightMode });
      }

      // Pause-on-sleep setting
      if (typeof savedPauseOnSleep === "boolean") {
        set({ pauseOnSystemSleep: savedPauseOnSleep });
      }

      // Initialize global shortcuts
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

      // Always-on-top setting
      const alwaysOnTop = savedAlwaysOnTop || false;
      if (alwaysOnTop) {
        try {
          await getCurrentWindow().setAlwaysOnTop(true);
        } catch (e) {
          console.warn("Failed to apply initial always-on-top:", e);
        }
      }
      set({ isAlwaysOnTop: alwaysOnTop });

      // Skip indicator display preference (defaults to true)
      if (typeof savedShowSkip === "boolean") {
        set({ showSkipIndicators: savedShowSkip });
      }

      // Scroll-wheel volume preference (defaults to true)
      if (typeof savedScrollVolume === "boolean") {
        set({ scrollVolumeEnabled: savedScrollVolume });
      }

      // Auto update check preference (defaults to true)
      const autoCheck = savedAutoCheck !== false;
      set({ autoCheckUpdates: autoCheck });

      // Run silent, rate-limited update check 10 seconds after launch without delaying startup
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          get().checkUpdatesSilently();
        }, 10000);
      }
    },

    // Quick Window Controls
    toggleAlwaysOnTop: async () => {
      const next = !get().isAlwaysOnTop;
      try {
        await getCurrentWindow().setAlwaysOnTop(next);
        await storageService.setPreference("alwaysOnTop", next);
        set({ isAlwaysOnTop: next });
        get().showOSD(next ? "Always on Top: Enabled" : "Always on Top: Disabled");
      } catch (e) {
        console.error("Failed to toggle always-on-top:", e);
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
    toggleGlobalShortcuts: async (enabled: boolean) => {
      set({ isGlobalShortcutsEnabled: enabled });
      await storageService.setPreference("globalShortcutsEnabled", enabled);
      await globalShortcutsService.updateConfig({ enabled });
      get().showOSD(
        enabled ? "Global Shortcuts: Active" : "Global Shortcuts: Disabled",
      );
    },

    openFile: async (path: string) => {
      const seq = ++activeLoadSequence;

      // Save progress of currently playing media before opening a new file
      const currentMedia = get();
      if (currentMedia.mediaMetadata?.filePath && currentMedia.currentTime > 5) {
        await storageService.setResumePosition(
          currentMedia.mediaMetadata.filePath,
          currentMedia.currentTime,
          currentMedia.duration,
        );
      }
      if (seq !== activeLoadSequence) return;

      try {
        await playerService.openFile(path);
      } catch (err) {
        if (seq === activeLoadSequence) {
          console.warn("Failed to open media file:", err);
          get().showOSD("Failed to open file (damaged or unsupported)");
        }
        return;
      }
      if (seq !== activeLoadSequence) return;

      const resumePos = await storageService.getResumePosition(path);
      if (seq !== activeLoadSequence) return;

      if (resumePos && resumePos > 5) {
        await playerService.seek(resumePos);
        if (seq !== activeLoadSequence) return;
        get().showOSD(
          `Resumed at ${Math.floor(resumePos / 60)}:${Math.floor(resumePos % 60).toString().padStart(2, "0")}`,
        );
      }
      const rawName = path.split(/[/\\]/).pop() || path;
      const title = formatMediaTitle(rawName, path);
      await storageService.recordPlaybackHistory(path, title, undefined, resumePos || undefined);
      if (seq !== activeLoadSequence) return;

      const recent = await storageService.getRecentFiles(15);
      if (seq !== activeLoadSequence) return;

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
          if (seq !== activeLoadSequence) return;

          const ordered = (siblings || []).sort(naturalPathCompare);
          const unadded = ordered.filter((s) => !existingPaths.has(s));
          if (ordered.length > 1 && unadded.length > 0) {
            set({ detectedSiblings: ordered, showSiblingPrompt: true });
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
    },

    pause: async () => {
      await playerService.pause();
      const current = get();
      if (current.mediaMetadata?.filePath && current.currentTime > 0) {
        lastAutoSavedTime = current.currentTime;
        await storageService.setResumePosition(
          current.mediaMetadata.filePath,
          current.currentTime,
          current.duration,
        );
      }
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
      const current = get();
      if (current.mediaMetadata?.filePath && current.currentTime > 0) {
        await storageService.setResumePosition(
          current.mediaMetadata.filePath,
          current.currentTime,
          current.duration,
        );
      }
      await playerService.stop();
    },

    seek: async (seconds: number) => {
      await playerService.seek(seconds);
    },

    seekRelative: async (deltaSeconds: number) => {
      const current = get().currentTime;
      const target = Math.max(0, current + deltaSeconds);
      await playerService.seek(target);
      get().triggerSkipAnimation(deltaSeconds);
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
      const success = await playerService.loadSubtitle(path);
      const name = path.split(/[/\\]/).pop();
      if (success) {
        get().showOSD(`Loaded subtitle: ${name}`);
      } else {
        get().showOSD(`Failed to load subtitle: file missing or corrupt`);
      }
    },

    selectAudioTrack: async (trackId: number) => {
      await playerService.selectAudioTrack(trackId);
      const track = get().audioTracks.find((t) => t.id === trackId);
      get().showOSD(
        `Audio: ${track?.title || track?.lang || `Track ${trackId}`}`,
      );
    },

    lastActiveSubtitleTrackId: null,

    selectSubtitleTrack: async (trackId: number) => {
      await playerService.selectSubtitleTrack(trackId);
      if (!trackId || trackId <= 0) {
        set({ currentSubtitleTrackId: undefined });
        get().showOSD("Subtitles: Off");
      } else {
        set({ lastActiveSubtitleTrackId: trackId, currentSubtitleTrackId: trackId });
        const track = get().subtitleTracks.find((t) => t.id === trackId);
        get().showOSD(
          `Subtitles: ${track?.title || track?.lang || `Track ${trackId}`}`,
        );
      }
    },

    toggleSubtitleTrack: async () => {
      const state = get();
      if (state.currentSubtitleTrackId && state.currentSubtitleTrackId > 0) {
        set({ lastActiveSubtitleTrackId: state.currentSubtitleTrackId });
        await get().selectSubtitleTrack(0);
      } else {
        const available = state.subtitleTracks;
        if (available.length === 0) {
          get().showOSD("No subtitle tracks found");
          return;
        }
        const targetId =
          state.lastActiveSubtitleTrackId &&
          available.some((t) => t.id === state.lastActiveSubtitleTrackId)
            ? state.lastActiveSubtitleTrackId
            : available[0]?.id || 1;
        await get().selectSubtitleTrack(targetId);
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
      const currentPath = get().mediaMetadata?.filePath;
      const siblings = get().detectedSiblings;

      if (currentPath && siblings && siblings.length > 1) {
        const { playlist, currentPlaylistIndex } = mergeEpisodesIntoPlaylist(
          get().playlist,
          siblings,
          currentPath,
        );
        const added = playlist.length - get().playlist.length;
        set({ playlist, currentPlaylistIndex });
        if (added > 0) {
          get().showOSD(`Added ${added} episode${added === 1 ? "" : "s"} to playlist`);
        }
      }

      if (currentPath) {
        const dir = currentPath.replace(/[/\\][^/\\]+$/, "");
        promptedDirectories.add(dir);
      }
      set({ showSiblingPrompt: false, detectedSiblings: null });
    },

    // Manually add every episode from the current file's folder — usable even after
    // the auto-prompt has been dismissed or timed out.
    addAllEpisodesFromFolder: async () => {
      const currentPath = get().mediaMetadata?.filePath;
      if (!currentPath) {
        get().showOSD("No media loaded");
        return;
      }

      try {
        const siblings = await invoke<string[]>("find_sibling_episodes", {
          filePath: currentPath,
        });
        const ordered = (siblings || []).sort(naturalPathCompare);

        if (ordered.length <= 1) {
          get().showOSD("No other episodes found in this folder");
          return;
        }

        const existingPaths = new Set(get().playlist.map((item) => item.filePath));
        const missing = ordered.filter((p) => !existingPaths.has(p));
        if (missing.length === 0) {
          get().showOSD("All episodes from this folder are already in the playlist");
          return;
        }

        const { playlist, currentPlaylistIndex } = mergeEpisodesIntoPlaylist(
          get().playlist,
          ordered,
          currentPath,
        );
        set({ playlist, currentPlaylistIndex });
        promptedDirectories.add(currentPath.replace(/[/\\][^/\\]+$/, ""));
        get().showOSD(
          `Added ${missing.length} episode${missing.length === 1 ? "" : "s"} to playlist`,
        );
      } catch (err) {
        console.warn("Failed to add episodes from folder:", err);
        get().showOSD("Could not scan folder for episodes");
      }
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
      // Fisher–Yates: unbiased in-place shuffle
      const shuffled = [...playlist];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
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
        ? sorted.findIndex((item) => item.id === currentItem.id)
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

    seekToChapter: async (index: number) => {
      const chapters = get().chapters;
      if (index < 0 || index >= chapters.length) return;
      const chapter = chapters[index];
      if (chapter) {
        await playerService.seek(chapter.time);
        set({ currentChapterIndex: index });
        get().showOSD(`Chapter: ${chapter.title || `Chapter ${index + 1}`}`);
      }
    },

    takeScreenshot: async () => {
      try {
        const path = await playerService.takeScreenshot();
        if (path) {
          get().showOSD(`Screenshot: ${path.split(/[/\\]/).pop()}`);
        } else {
          get().showOSD("Screenshots unavailable for streams");
        }
      } catch (err) {
        console.warn("Screenshot failed:", err);
        get().showOSD("Screenshot failed");
      }
    },

    toggleStats: (enabled?: boolean) => {
      const next = enabled !== undefined ? enabled : !get().showStats;
      set({ showStats: next });
      get().showOSD(next ? "Playback Stats: On" : "Playback Stats: Off");
    },

    toggleUrlModal: (open?: boolean) => {
      set((s) => ({
        isUrlModalOpen: open !== undefined ? open : !s.isUrlModalOpen,
      }));
    },

    openUrl: async (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return;
      const target = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
      try {
        await playerService.openStream(target);
        const currentPlaylist = get().playlist;
        const existingIdx = currentPlaylist.findIndex(
          (item) => item.filePath === target,
        );
        if (existingIdx === -1) {
          const newItem: PlaylistItem = {
            id: `${Date.now()}-${Math.random()}`,
            filePath: target,
            title: target,
          };
          set({
            playlist: [...currentPlaylist, newItem],
            currentPlaylistIndex: currentPlaylist.length,
          });
        } else {
          set({ currentPlaylistIndex: existingIdx });
        }
        get().showOSD(`Streaming: ${target}`);
      } catch (err) {
        console.warn("Failed to open stream:", err);
        get().showOSD("Failed to open network stream");
      }
    },

    refreshSavedPlaylists: async () => {
      try {
        const rows = await invoke<
          Array<{ id: number; name: string; item_count: number; created_at: string }>
        >("db_get_playlists");
        set({
          savedPlaylists: rows.map((r) => ({
            id: r.id,
            name: r.name,
            itemCount: r.item_count,
            createdAt: r.created_at,
          })),
        });
      } catch (err) {
        console.warn("Failed to load saved playlists:", err);
      }
    },

    saveCurrentPlaylist: async (name: string, playlistId?: number) => {
      const { playlist } = get();
      if (playlist.length === 0) {
        get().showOSD("Playlist is empty");
        return;
      }
      try {
        await invoke<number>("db_save_playlist", {
          name,
          playlistId: playlistId ?? null,
          items: playlist.map((item) => ({
            file_path: item.filePath,
            title: item.title,
          })),
        });
        await get().refreshSavedPlaylists();
        get().showOSD(`Playlist saved: ${name || "Untitled"}`);
      } catch (err) {
        console.warn("Failed to save playlist:", err);
        get().showOSD("Failed to save playlist");
      }
    },

    loadSavedPlaylist: async (playlistId: number) => {
      try {
        const items = await invoke<
          Array<{ id: number; file_path: string; title: string | null; item_order: number }>
        >("db_get_playlist_items", { playlistId });
        if (items.length === 0) {
          get().showOSD("Saved playlist is empty");
          return;
        }
        const newItems: PlaylistItem[] = items.map((row) => ({
          id: `${Date.now()}-${Math.random()}`,
          filePath: row.file_path,
          title: row.title || formatMediaTitle(row.file_path.split(/[/\\]/).pop() || row.file_path, row.file_path),
        }));
        set({ playlist: newItems, currentPlaylistIndex: 0 });
        await get().playPlaylistItem(0);
        get().showOSD(`Loaded playlist (${newItems.length} items)`);
      } catch (err) {
        console.warn("Failed to load saved playlist:", err);
        get().showOSD("Failed to load playlist");
      }
    },

    deleteSavedPlaylist: async (playlistId: number) => {
      try {
        await invoke("db_delete_playlist", { playlistId });
        set((s) => ({
          savedPlaylists: s.savedPlaylists.filter((p) => p.id !== playlistId),
        }));
        get().showOSD("Saved playlist deleted");
      } catch (err) {
        console.warn("Failed to delete saved playlist:", err);
        get().showOSD("Failed to delete playlist");
      }
    },

    togglePlaylistDrawer: () => {
      set((s) => ({ isPlaylistOpen: !s.isPlaylistOpen }));
    },

    toggleSettingsModal: (open?: boolean | unknown, initialTab?: string) => {
      const isBool = typeof open === "boolean";
      set((s) => ({
        isSettingsOpen: isBool ? open : !s.isSettingsOpen,
        settingsInitialTab: initialTab || (isBool && open ? s.settingsInitialTab : null),
      }));
    },

    checkUpdatesSilently: async () => {
      const { autoCheckUpdates } = get();
      if (!autoCheckUpdates) return;

      // Rate limit check: at most once every 24 hours (86,400,000 ms)
      const lastCheck = (await storageService.getPreference<number>("lastUpdateCheckTimestamp")) || 0;
      const now = Date.now();
      if (now - lastCheck < 24 * 60 * 60 * 1000) {
        // Restore cached available update so the subtle indicator in TopBar can show
        const cachedVer = await storageService.getPreference<string>("cachedAvailableUpdateVer");
        if (cachedVer) {
          set({ availableUpdate: { version: cachedVer } });
        }
        return;
      }

      await storageService.setPreference("lastUpdateCheckTimestamp", now);

      try {
        const update = await updaterService.checkForUpdates();
        if (update.state === "available" && update.latestVersion) {
          const dismissedVer = await storageService.getPreference<string>("dismissedUpdateVersion");
          const updateInfo = {
            version: update.latestVersion,
            releaseNotes: update.releaseNotes,
          };
          set({ availableUpdate: updateInfo });
          await storageService.setPreference("cachedAvailableUpdateVer", update.latestVersion);

          // DO NOT BOTHER: If the user is currently playing a video, NEVER interrupt them!
          // Also if they already dismissed this specific version, do not show the toast.
          const isCurrentlyPlaying = get().status === "playing";
          if (!isCurrentlyPlaying && dismissedVer !== update.latestVersion) {
            set({ showUpdateToast: true });
          }
        } else if (update.state === "up-to-date") {
          set({ availableUpdate: null, showUpdateToast: false });
          await storageService.setPreference("cachedAvailableUpdateVer", null);
        }
      } catch (err) {
        console.debug("Silent update check skipped:", err);
      }
    },

    dismissUpdateToast: async () => {
      const { availableUpdate } = get();
      if (availableUpdate?.version) {
        await storageService.setPreference("dismissedUpdateVersion", availableUpdate.version);
      }
      set({ showUpdateToast: false });
    },

    // User-triggered update check with persistent toast feedback (context menu / settings)
    checkForUpdatesManually: async () => {
      set({ updateCheckToast: { state: "checking" } });
      try {
        const result = await updaterService.checkForUpdates();
        if (result.state === "available" && result.latestVersion) {
          set({
            updateCheckToast: { state: "available", version: result.latestVersion },
            availableUpdate: {
              version: result.latestVersion,
              releaseNotes: result.releaseNotes,
            },
          });
          await storageService.setPreference("cachedAvailableUpdateVer", result.latestVersion);
          await storageService.setPreference("lastUpdateCheckTimestamp", Date.now());
        } else if (result.state === "up-to-date") {
          set({ updateCheckToast: { state: "up-to-date" } });
          set({ availableUpdate: null, showUpdateToast: false });
          await storageService.setPreference("cachedAvailableUpdateVer", null);
          await storageService.setPreference("lastUpdateCheckTimestamp", Date.now());
        } else {
          set({
            updateCheckToast: {
              state: "error",
              message: result.errorMessage || "Could not reach the update server",
            },
          });
        }
      } catch (err: any) {
        set({
          updateCheckToast: {
            state: "error",
            message: err?.message || "Update check failed",
          },
        });
      }
    },

    dismissUpdateCheckToast: () => {
      set({ updateCheckToast: null });
    },

    toggleAutoCheckUpdates: async (enabled?: boolean) => {
      const next = enabled !== undefined ? enabled : !get().autoCheckUpdates;
      set({ autoCheckUpdates: next });
      await storageService.setPreference("autoCheckUpdates", next);
      get().showOSD(
        next ? "Automatic Update Checks: Enabled" : "Automatic Update Checks: Disabled",
      );
    },

    toggleLibraryModal: (open?: boolean) => {
      set((s) => ({
        isLibraryOpen: open !== undefined ? open : !s.isLibraryOpen,
      }));
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

    deleteHistoryItem: async (filePath: string) => {
      await storageService.deleteHistoryItem(filePath);
      const updated = get().recentFiles.filter((item) => item.filePath !== filePath);
      set({ recentFiles: updated });
      get().showOSD("Removed from history");
    },

    clearPlaybackHistory: async () => {
      await storageService.clearAllHistory();
      set({ recentFiles: [] });
      get().showOSD("Playback history cleared");
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

// Debounced persistence of the in-session queue so a restart preserves it.
let sessionSaveTimer: number | null = null;
usePlayerStore.subscribe((state, prev) => {
  if (
    state.playlist === prev.playlist &&
    state.currentPlaylistIndex === prev.currentPlaylistIndex
  ) {
    return;
  }
  if (sessionSaveTimer) window.clearTimeout(sessionSaveTimer);
  sessionSaveTimer = window.setTimeout(() => {
    const current = usePlayerStore.getState();
    storageService
      .setPreference("sessionPlaylist", {
        items: current.playlist.map((item) => ({
          filePath: item.filePath,
          title: item.title,
        })),
        index: current.currentPlaylistIndex,
      })
      .catch(() => {});
  }, 500);
});
