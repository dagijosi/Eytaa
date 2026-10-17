import { invoke } from "@tauri-apps/api/core";
import { PlaylistItem } from "../../stores/playerStore";

export interface LibraryFolder {
  id: number;
  folder_path: string;
  added_at: string;
  last_scanned_at?: string;
  is_accessible: boolean;
  item_count: number;
  available_count: number;
}

export interface LibraryItem {
  id: number;
  folder_path: string;
  file_path: string;
  file_name: string;
  title: string;
  media_type: "video" | "audio";
  file_size: number;
  duration?: number;
  last_modified: number;
  added_at: string;
  is_favorite: boolean;
  resume_position?: number;
  is_available: boolean;
  is_duplicate: boolean;
  quick_hash?: string;
  category?: "movie" | "series" | "music" | "other" | string;
  series_name?: string;
  season_number?: number;
  episode_number?: number;
  episode_title?: string;
  year?: string;
  is_watched: boolean;
  manual_override: boolean;
  custom_poster?: string;
  series_key?: string;
}

export interface SeriesOverview {
  series_key: string;
  display_name: string;
  episode_count: number;
  season_count: number;
  watched_count: number;
  next_season?: number;
  next_episode?: number;
  custom_poster?: string;
}

export interface FavoriteItem {
  file_path: string;
  title?: string;
  media_type?: string;
  added_at: string;
}

export interface UnfinishedVideo {
  file_path: string;
  title: string;
  duration?: number;
  position: number;
  updated_at: string;
  progress_percent: number;
  media_type: string;
}

export interface ScannedMediaItem {
  file_path: string;
  file_name: string;
  title: string;
  folder_path: string;
  media_type: string;
  file_size: number;
  last_modified: number;
  quick_hash?: string;
  category?: string;
  series_name?: string;
  season_number?: number;
  episode_number?: number;
  episode_title?: string;
  year?: string;
}

export interface ScanProgressPayload {
  folder_path: string;
  current_directory: string;
  files_scanned: number;
  total_found: number;
  is_cancelled: boolean;
  is_finished: boolean;
}

export interface ThumbnailCacheStats {
  count: number;
  total_bytes: number;
  cache_dir: string;
}

class LibraryService {
  private changeListeners = new Set<() => void>();
  private thumbnailCache = new Map<string, string>();
  private pendingThumbnails = new Map<string, Promise<string | null>>();
  private failedThumbnails = new Set<string>();
  private thumbnailQueue: Array<() => Promise<void>> = [];
  private activeThumbnailWorkers = 0;
  private readonly maxThumbnailWorkers = 3;

  public onLibraryChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  public notifyLibraryChanged() {
    for (const listener of this.changeListeners) {
      try {
        listener();
      } catch (err) {
        console.error("Error in library change listener:", err);
      }
    }
  }

  private processThumbnailQueue() {
    while (
      this.activeThumbnailWorkers < this.maxThumbnailWorkers &&
      this.thumbnailQueue.length > 0
    ) {
      const task = this.thumbnailQueue.shift();
      if (task) {
        this.activeThumbnailWorkers++;
        task().finally(() => {
          this.activeThumbnailWorkers--;
          this.processThumbnailQueue();
        });
      }
    }
  }

  public async reclassifyAllMedia(): Promise<number> {
    try {
      const res = await invoke<number>("db_reclassify_all_media");
      this.notifyLibraryChanged();
      return res;
    } catch (e) {
      console.error("Failed to reclassify media:", e);
      return 0;
    }
  }

  public async getLibraryFolders(): Promise<LibraryFolder[]> {
    try {
      return await invoke<LibraryFolder[]>("db_get_library_folders");
    } catch (e) {
      console.error("Failed to get library folders:", e);
      return [];
    }
  }

  public async addLibraryFolder(folderPath: string): Promise<number> {
    return await invoke<number>("db_add_library_folder", { folderPath });
  }

  public async removeLibraryFolder(folderPath: string): Promise<void> {
    return await invoke<void>("db_remove_library_folder", { folderPath });
  }

  public async scanFolder(folderPath: string): Promise<ScannedMediaItem[]> {
    return await invoke<ScannedMediaItem[]>("scan_local_folder", { folderPath });
  }

  public async cancelScan(): Promise<void> {
    return await invoke<void>("cancel_library_scan");
  }

  public async saveLibraryItems(items: ScannedMediaItem[]): Promise<number> {
    const res = await invoke<number>("db_save_library_items", { items });
    this.notifyLibraryChanged();
    return res;
  }

  public async reconcileMissingItems(
    folderPath: string,
    scannedPaths: string[],
  ): Promise<number> {
    const res = await invoke<number>("db_reconcile_missing_items", {
      folderPath,
      scannedPaths,
    });
    this.notifyLibraryChanged();
    return res;
  }

  public async cleanMissingItems(): Promise<number> {
    const res = await invoke<number>("db_clean_missing_items");
    this.notifyLibraryChanged();
    return res;
  }

  public async getLibraryItems(filter?: {
    folder?: string;
    mediaType?: string;
    search?: string;
    duplicatesOnly?: boolean;
    availableOnly?: boolean;
    category?: string;
    seriesName?: string;
    watchStatus?: "all" | "unwatched" | "partially_watched" | "watched";
    limit?: number;
    offset?: number;
  }): Promise<LibraryItem[]> {
    try {
      return await invoke<LibraryItem[]>("db_get_library_items", {
        folder: filter?.folder || null,
        mediaType: filter?.mediaType || null,
        search: filter?.search || null,
        duplicatesOnly: filter?.duplicatesOnly ?? null,
        availableOnly: filter?.availableOnly ?? null,
        category: filter?.category || null,
        seriesName: filter?.seriesName || null,
        watchStatus: filter?.watchStatus || null,
        limit: filter?.limit ?? null,
        offset: filter?.offset ?? null,
      });
    } catch (e) {
      console.error("Failed to get library items:", e);
      return [];
    }
  }

  public clearThumbnailCacheFor(filePath: string) {
    this.thumbnailCache.delete(filePath);
    this.failedThumbnails.delete(filePath);
    this.pendingThumbnails.delete(filePath);
  }

  public async updateMediaMetadata(params: {
    filePath: string;
    title: string;
    category?: string;
    seriesName?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    episodeTitle?: string;
    year?: string;
    customPoster?: string;
    applyToSeries?: boolean;
  }): Promise<void> {
    this.clearThumbnailCacheFor(params.filePath);
    if (params.customPoster) {
      this.clearThumbnailCacheFor(params.customPoster);
    }
    await invoke("db_update_media_metadata", {
      filePath: params.filePath,
      title: params.title,
      category: params.category || null,
      seriesName: params.seriesName || null,
      seasonNumber: params.seasonNumber ?? null,
      episodeNumber: params.episodeNumber ?? null,
      episodeTitle: params.episodeTitle || null,
      year: params.year || null,
      customPoster: params.customPoster || null,
      applyToSeries: params.applyToSeries ?? null,
    });
    this.notifyLibraryChanged();
  }

  public async setWatchedStatus(filePath: string, isWatched: boolean): Promise<void> {
    await invoke("db_set_watched_status", { filePath, isWatched });
    this.notifyLibraryChanged();
  }

  public async setSeriesWatchedStatus(
    seriesName: string,
    isWatched: boolean,
    seasonNumber?: number,
  ): Promise<void> {
    await invoke("db_set_series_watched_status", {
      seriesName,
      seasonNumber: seasonNumber ?? null,
      isWatched,
    });
    this.notifyLibraryChanged();
  }

  public async getNextEpisode(seriesName: string): Promise<LibraryItem | null> {
    try {
      return await invoke<LibraryItem | null>("db_get_next_episode", { seriesName });
    } catch (e) {
      console.error("Failed to get next episode:", e);
      return null;
    }
  }

  public async getSeriesOverview(): Promise<SeriesOverview[]> {
    try {
      return await invoke<SeriesOverview[]>("db_get_series_overview");
    } catch (e) {
      console.error("Failed to get series overview:", e);
      return [];
    }
  }

  public async toggleFavorite(
    filePath: string,
    title?: string,
    mediaType?: string,
  ): Promise<boolean> {
    return await invoke<boolean>("db_toggle_favorite", {
      filePath,
      title: title || null,
      mediaType: mediaType || null,
    });
  }

  public async getFavorites(): Promise<FavoriteItem[]> {
    try {
      return await invoke<FavoriteItem[]>("db_get_favorites");
    } catch (e) {
      console.error("Failed to get favorites:", e);
      return [];
    }
  }

  public async isFavorite(filePath: string): Promise<boolean> {
    try {
      return await invoke<boolean>("db_is_favorite", { filePath });
    } catch {
      return false;
    }
  }

  public async getUnfinishedVideos(): Promise<UnfinishedVideo[]> {
    try {
      return await invoke<UnfinishedVideo[]>("db_get_unfinished_videos");
    } catch (e) {
      console.error("Failed to get unfinished videos:", e);
      return [];
    }
  }

  /**
   * Fetches thumbnail without freezing or duplicating requests.
   * Utilizes in-memory cache, failure cache, and a throttled concurrency queue.
   */
  public async getThumbnail(filePath: string): Promise<string | null> {
    if (this.thumbnailCache.has(filePath)) {
      return this.thumbnailCache.get(filePath)!;
    }

    if (this.failedThumbnails.has(filePath)) {
      return null;
    }

    if (this.pendingThumbnails.has(filePath)) {
      return this.pendingThumbnails.get(filePath)!;
    }

    const promise = new Promise<string | null>((resolve) => {
      this.thumbnailQueue.push(async () => {
        try {
          const thumb = await invoke<string | null>("get_thumbnail", { filePath });
          if (thumb) {
            this.thumbnailCache.set(filePath, thumb);
            resolve(thumb);
          } else {
            this.failedThumbnails.add(filePath);
            resolve(null);
          }
        } catch {
          this.failedThumbnails.add(filePath);
          resolve(null);
        } finally {
          this.pendingThumbnails.delete(filePath);
        }
      });
      this.processThumbnailQueue();
    });

    this.pendingThumbnails.set(filePath, promise);
    return promise;
  }

  public async getThumbnailCacheStats(): Promise<ThumbnailCacheStats> {
    try {
      return await invoke<ThumbnailCacheStats>("get_thumbnail_cache_stats");
    } catch (e) {
      console.error("Failed to get thumbnail cache stats:", e);
      return { count: 0, total_bytes: 0, cache_dir: "" };
    }
  }

  public async cleanThumbnailCache(cleanMode: "all" | "markers" | "corrupt" = "markers"): Promise<number> {
    try {
      const removed = await invoke<number>("clean_thumbnail_cache", { cleanMode });
      if (cleanMode === "all") {
        this.thumbnailCache.clear();
      }
      return removed;
    } catch (e) {
      console.error("Clean thumbnail cache error:", e);
      return 0;
    }
  }

  public async exportPlaylist(
    filePath: string,
    formatType: "m3u8" | "json",
    items: PlaylistItem[],
  ): Promise<void> {
    const dtoArray = items.map((i) => ({
      id: i.id,
      file_path: i.filePath,
      title: i.title,
    }));
    await invoke<void>("export_playlist_to_file", {
      filePath,
      formatType,
      items: dtoArray,
    });
  }

  public async importPlaylist(filePath: string): Promise<PlaylistItem[]> {
    const rawItems = await invoke<Array<{ id: string; file_path: string; title: string }>>(
      "import_playlist_from_file",
      { filePath },
    );
    return rawItems.map((r) => ({
      id: r.id,
      filePath: r.file_path,
      title: r.title,
    }));
  }
}

export const libraryService = new LibraryService();
