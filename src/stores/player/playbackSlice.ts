import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { StateCreator } from "zustand";
import { playerService } from "../../services/player/mpvPlayerService";
import { storageService } from "../../services/storage/storageService";
import {
  PlaybackProfile,
  DEFAULT_PROFILES,
} from "../../services/player/profileTypes";
import { globalShortcutsService } from "../../services/shortcuts/globalShortcutsService";
import { initializeMediaSession } from "../../services/system/mediaSessionService";
import { formatMediaTitle } from "../../utils/mediaTitle";
import { libraryService } from "../../services/library/libraryService";
import type {
  PlayerStore,
  PlaybackSlice,
  PlaylistItem,
  RepeatMode,
} from "./types";
import {
  naturalPathCompare,
  promptedDirectories,
  clearSleepTimerInterval,
} from "./helpers";

let activeLoadSequence = 0;
let lastAutoSavedTime = 0;
let lastAutoSavedFile = "";

export const createPlaybackSlice: StateCreator<
  PlayerStore,
  [],
  [],
  PlaybackSlice
> = (set, get, api) => {
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
    chapters: [],
    currentChapterIndex: -1,
    showStats: false,
    isUrlModalOpen: false,
    lastActiveSubtitleTrackId: null,

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
        subscribe: api.subscribe,
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

    dispose: async () => {
      clearSleepTimerInterval();
      await globalShortcutsService.dispose();
      await playerService.dispose();
    },
  };
};
