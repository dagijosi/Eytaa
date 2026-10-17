import { invoke } from "@tauri-apps/api/core";
import type { StateCreator } from "zustand";
import { formatMediaTitle } from "../../utils/mediaTitle";
import type { PlayerStore, PlaylistSlice, PlaylistItem } from "./types";
import {
  naturalPathCompare,
  mergeEpisodesIntoPlaylist,
  promptedDirectories,
} from "./helpers";

export const createPlaylistSlice: StateCreator<
  PlayerStore,
  [],
  [],
  PlaylistSlice
> = (set, get) => ({
  playlist: [],
  currentPlaylistIndex: -1,
  detectedSiblings: null,
  showSiblingPrompt: false,
  savedPlaylists: [],

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
});
