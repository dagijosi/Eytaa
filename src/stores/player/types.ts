import type { PlayerState, ChapterInfo } from "../../services/player/types";
import type { PlaybackProfile } from "../../services/player/profileTypes";
import type { HistoryEntry } from "../../services/storage/storageService";

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

export interface PlaybackSlice extends PlayerState {
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
  chapters: ChapterInfo[];
  currentChapterIndex: number;
  seekToChapter: (index: number) => Promise<void>;
  takeScreenshot: () => Promise<void>;
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
}

export interface UiSlice {
  osdMessage: string | null;
  osdTimer: number | null;
  showOSD: (text: string) => void;
  isControlsVisible: boolean;
  setControlsVisible: (visible: boolean) => void;
  isPlaylistOpen: boolean;
  togglePlaylistDrawer: () => void;
  isSettingsOpen: boolean;
  settingsInitialTab: string | null;
  toggleSettingsModal: (open?: boolean | unknown, initialTab?: string) => void;
  isLibraryOpen: boolean;
  toggleLibraryModal: (open?: boolean) => void;
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
