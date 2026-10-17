import { formatMediaTitle } from "../../utils/mediaTitle";
import type { PlaylistItem } from "./types";

// Natural sort for file paths so "Episode 2" comes before "Episode 10".
export function naturalPathCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

// Merge a folder's ordered episode list into the playlist, keeping the currently
// playing episode as the anchor so "previous"/"next" continue in the right order.
export function mergeEpisodesIntoPlaylist(
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

// Directories already scanned for sibling episodes in this session.
export const promptedDirectories = new Set<string>();

// Shared sleep-timer interval handle. Kept here so both the settings slice
// (which drives the timer) and the playback slice (which tears it down in
// dispose) read the same mutable state without importing each other.
let sleepTimerInterval: number | null = null;

export function setSleepTimerInterval(value: number | null): void {
  sleepTimerInterval = value;
}

export function clearSleepTimerInterval(): void {
  if (sleepTimerInterval) {
    window.clearInterval(sleepTimerInterval);
    sleepTimerInterval = null;
  }
}
