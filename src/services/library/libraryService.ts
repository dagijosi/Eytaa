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
  private thumbnailCache = new Map<string, string>();
  private pendingThumbnails = new Map<string, Promise<string | null>>();

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
    return await invoke<number>("db_save_library_items", { items });
  }

  public async reconcileMissingItems(
    folderPath: string,
    scannedPaths: string[],
  ): Promise<number> {
    return await invoke<number>("db_reconcile_missing_items", {
      folderPath,
      scannedPaths,
    });
  }

  public async cleanMissingItems(): Promise<number> {
    return await invoke<number>("db_clean_missing_items");
  }

  public async getLibraryItems(filter?: {
    folder?: string;
    mediaType?: string;
    search?: string;
    duplicatesOnly?: boolean;
    availableOnly?: boolean;
  }): Promise<LibraryItem[]> {
    try {
      return await invoke<LibraryItem[]>("db_get_library_items", {
        folder: filter?.folder || null,
        mediaType: filter?.mediaType || null,
        search: filter?.search || null,
        duplicatesOnly: filter?.duplicatesOnly ?? null,
        availableOnly: filter?.availableOnly ?? null,
      });
    } catch (e) {
      console.error("Failed to get library items:", e);
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
   * Utilizes in-memory and disk cache.
   */
  public async getThumbnail(filePath: string): Promise<string | null> {
    if (this.thumbnailCache.has(filePath)) {
      return this.thumbnailCache.get(filePath)!;
    }

    if (this.pendingThumbnails.has(filePath)) {
      return this.pendingThumbnails.get(filePath)!;
    }

    const promise = (async () => {
      try {
        const thumb = await invoke<string | null>("get_thumbnail", { filePath });
        if (thumb) {
          this.thumbnailCache.set(filePath, thumb);
        }
        return thumb;
      } catch (e) {
        console.warn("Thumbnail error for:", filePath, e);
        return null;
      } finally {
        this.pendingThumbnails.delete(filePath);
      }
    })();

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
