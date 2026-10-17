import { create } from "zustand";
import { storageService } from "../services/storage/storageService";
import type { PlayerStore } from "./player/types";
import { createPlaybackSlice } from "./player/playbackSlice";
import { createPlaylistSlice } from "./player/playlistSlice";
import { createLibrarySlice } from "./player/librarySlice";
import { createSettingsSlice } from "./player/settingsSlice";
import { createUiSlice } from "./player/uiSlice";
import { createUpdatesSlice } from "./player/updatesSlice";

export type {
  PlaylistItem,
  WindowGeometry,
  SleepTimerState,
  SkipAnimationState,
  RepeatMode,
  SavedPlaylistMeta,
} from "./player/types";

export const usePlayerStore = create<PlayerStore>()((...a) => ({
  ...createPlaybackSlice(...a),
  ...createPlaylistSlice(...a),
  ...createLibrarySlice(...a),
  ...createSettingsSlice(...a),
  ...createUiSlice(...a),
  ...createUpdatesSlice(...a),
}));

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
