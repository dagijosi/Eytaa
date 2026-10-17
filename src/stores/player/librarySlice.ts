import type { StateCreator } from "zustand";
import { storageService } from "../../services/storage/storageService";
import type { PlayerStore, LibrarySlice } from "./types";

export const createLibrarySlice: StateCreator<
  PlayerStore,
  [],
  [],
  LibrarySlice
> = (set, get) => ({
  recentFiles: [],

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
});
