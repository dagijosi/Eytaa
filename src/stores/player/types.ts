import type { PlayerState, ChapterInfo } from "../../services/player/types";
import type { PlaybackProfile } from "../../services/player/profileTypes";
import type { HistoryEntry } from "../../services/storage/storageService";

export interface PlaylistItem {
  id: string;
  filePath: string;
  title: string;
  duration?: number;
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

export interface ScreenshotInfo {
  path: string;
  thumbnail?: string | null;
  timestamp: number;
  mode: "video" | "subtitles" | "window";
  copied: boolean;
}

export interface AbLoopState {
  a: number | null;
  b: number | null;
}

export interface NextEpisodePrompt {
  nextFilePath: string;
  title: string;
  season?: number;
  episode?: number;
}

export interface PlaybackSlice extends PlayerState {
  initialize: () => Promise<void>;
  openFile: (
    path: string,
    options?: {
      preserveQueue?: boolean;
      clearQueue?: boolean;
      queueEpisodes?: string[];
    },
  ) => Promise<void>;
  openMultipleFiles: (
    paths: string[],
    options?: { clearQueue?: boolean },
  ) => Promise<void>;
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
  subDelay: number;
  audioDelay: number;
  setSubDelay: (seconds: number) => Promise<void>;
  changeSubDelay: (deltaSeconds: number) => Promise<void>;
  setAudioDelay: (ms: number) => Promise<void>;
  changeAudioDelay: (deltaMs: number) => Promise<void>;
  resetSyncDelays: () => Promise<void>;
  chapters: ChapterInfo[];
  currentChapterIndex: number;
  seekToChapter: (index: number) => Promise<void>;
  lastScreenshot: ScreenshotInfo | null;
  takeScreenshot: (options?: {
    mode?: "video" | "subtitles" | "window";
    copyToClipboard?: boolean;
    directory?: string;
  }) => Promise<string | null>;
  copyScreenshotToClipboard: (path: string) => Promise<boolean>;
  dismissScreenshotToast: () => void;
  // A-B Loop Playback
  abLoop: AbLoopState;
  setAbLoopA: (time?: number) => Promise<void>;
  setAbLoopB: (time?: number) => Promise<void>;
  clearAbLoop: () => Promise<void>;
  // Dual Subtitles
  secondarySubtitleTrackId: number | null;
  selectSecondarySubtitleTrack: (trackId: number | null) => Promise<void>;
  // Next Episode Binge Prompt
  nextEpisodePrompt: NextEpisodePrompt | null;
  dismissNextEpisodePrompt: () => void;
  playNextEpisodePrompt: () => Promise<void>;
  autoplayNextEpisodeEnabled: boolean;
  setAutoplayNextEpisodeEnabled: (enabled: boolean) => Promise<void>;
  showStats: boolean;
  toggleStats: (enabled?: boolean) => void;
  openUrl: (url: string) => Promise<void>;
  isUrlModalOpen: boolean;
  toggleUrlModal: (open?: boolean) => void;
  dispose: () => Promise<void>;
}

export interface PlaylistSlice {
  playlist: PlaylistItem[];
  currentPlaylistIndex: number;
  addToPlaylist: (paths: string[]) => void;
  removeFromPlaylist: (index: number) => void;
  reorderPlaylist: (fromIndex: number, toIndex: number) => void;
  shufflePlaylist: () => void;
  sortPlaylist: (mode: "natural" | "az" | "za" | "reverse") => void;
  clearPlaylist: () => void;
  playPlaylistItem: (index: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  detectedSiblings: string[] | null;
  showSiblingPrompt: boolean;
  addSiblingsToPlaylist: () => void;
  addAllEpisodesFromFolder: () => Promise<void>;
  dismissSiblingPrompt: () => void;
  savedPlaylists: SavedPlaylistMeta[];
  refreshSavedPlaylists: () => Promise<void>;
  saveCurrentPlaylist: (name: string, playlistId?: number) => Promise<void>;
  loadSavedPlaylist: (playlistId: number) => Promise<void>;
  deleteSavedPlaylist: (playlistId: number) => Promise<void>;
  lastClearedPlaylist: PlaylistItem[] | null;
  undoClearPlaylist: () => void;
}

export interface LibrarySlice {
  recentFiles: HistoryEntry[];
  refreshRecentFiles: () => Promise<void>;
  deleteHistoryItem: (filePath: string) => Promise<void>;
  clearPlaybackHistory: () => Promise<void>;
}

export interface SettingsSlice {
  skipAnimation: SkipAnimationState | null;
  triggerSkipAnimation: (deltaSeconds: number) => void;
  showSkipIndicators: boolean;
  toggleShowSkipIndicators: (enabled?: boolean) => Promise<void>;
  scrollVolumeEnabled: boolean;
  setScrollVolumeEnabled: (enabled: boolean) => Promise<void>;
  autoPlayNext: boolean;
  toggleAutoPlayNext: (enabled?: boolean) => Promise<void>;
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
  profiles: PlaybackProfile[];
  activeProfileId: string;
  applyProfile: (profileId: string) => Promise<void>;
  cycleProfile: () => Promise<void>;
  saveCustomProfile: (profile: PlaybackProfile) => Promise<void>;
  deleteCustomProfile: (profileId: string) => Promise<void>;
  resetProfiles: () => Promise<void>;
  restoreAllDefaults: () => Promise<void>;
  isGlobalShortcutsEnabled: boolean;
  toggleGlobalShortcuts: (enabled: boolean) => Promise<void>;
  repeatMode: RepeatMode;
  setRepeatMode: (mode: RepeatMode) => Promise<void>;
  cycleRepeatMode: () => Promise<void>;
  queueOnPlayMode: "replace" | "append" | "ask";
  setQueueOnPlayMode: (mode: "replace" | "append" | "ask") => Promise<void>;
  edgeHoverPlaylistEnabled: boolean;
  setEdgeHoverPlaylistEnabled: (enabled: boolean) => Promise<void>;
}

export interface UiSlice {
  osdMessage: string | null;
  osdTimer: number | null;
  showOSD: (text: string) => void;
  isControlsVisible: boolean;
  setControlsVisible: (visible: boolean) => void;
  isPlaylistOpen: boolean;
  togglePlaylistDrawer: (open?: boolean) => void;
  isPlaylistPinned: boolean;
  setPlaylistPinned: (pinned: boolean) => void;
  isSettingsOpen: boolean;
  settingsInitialTab: string | null;
  toggleSettingsModal: (open?: boolean | unknown, initialTab?: string) => void;
  isLibraryOpen: boolean;
  toggleLibraryModal: (open?: boolean) => void;
  isCommandPaletteOpen: boolean;
  toggleCommandPalette: (open?: boolean) => void;
  videoFitMode: "fit" | "fill" | "stretch";
  setVideoFitMode: (mode: "fit" | "fill" | "stretch") => Promise<void>;
  cycleVideoFitMode: () => Promise<void>;
  isAlwaysOnTop: boolean;
  toggleAlwaysOnTop: () => Promise<void>;
  isPiP: boolean;
  pipPreviousGeometry: WindowGeometry | null;
  togglePiP: () => Promise<void>;
}

export interface UpdatesSlice {
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
  dismissUpdateToast: () => Promise<void>;
  toggleAutoCheckUpdates: (enabled?: boolean) => Promise<void>;
  checkUpdatesSilently: () => Promise<void>;
}

export type PlayerStore = PlaybackSlice &
  PlaylistSlice &
  LibrarySlice &
  SettingsSlice &
  UiSlice &
  UpdatesSlice;
