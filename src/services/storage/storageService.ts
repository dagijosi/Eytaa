import { invoke } from "@tauri-apps/api/core";

export interface HistoryEntry {
  id: number;
  filePath: string;
  title?: string;
  lastPlayedAt: string;
  duration?: number;
  position?: number;
}

export interface UserPreferences {
  volume: number;
  muted: boolean;
  hardwareAcceleration: boolean;
  resumePlayback: boolean;
  theme: "dark" | "light" | "system";
  subtitlesEnabled: boolean;
}

export class StorageService {
  public async getPreference<T = string>(key: string): Promise<T | null> {
    try {
      const val = await invoke<string | null>("db_get_preference", { key });
      if (val === null) return null;
      try {
        return JSON.parse(val) as T;
      } catch {
        return val as unknown as T;
      }
    } catch (err) {
      console.warn(`[StorageService] Failed to get preference '${key}' from SQLite:`, err);
      const fallback = localStorage.getItem(`loom_pref_${key}`);
      return fallback ? (JSON.parse(fallback) as T) : null;
    }
  }

  public async setPreference(key: string, value: unknown): Promise<void> {
    const stringVal = typeof value === "string" ? value : JSON.stringify(value);
    try {
      await invoke("db_set_preference", { key, value: stringVal });
    } catch (err) {
      console.warn(`[StorageService] Failed to set preference '${key}' in SQLite:`, err);
      localStorage.setItem(`loom_pref_${key}`, stringVal);
    }
  }

  public async getResumePosition(filePath: string): Promise<number | null> {
    try {
      const pos = await invoke<number | null>("db_get_resume_position", { filePath });
      return pos;
    } catch (err) {
      console.warn(`[StorageService] Failed to get resume position for '${filePath}':`, err);
      return null;
    }
  }

  public async setResumePosition(filePath: string, position: number): Promise<void> {
    try {
      await invoke("db_set_resume_position", { filePath, position });
    } catch (err) {
      console.warn(`[StorageService] Failed to save resume position for '${filePath}':`, err);
    }
  }

  public async recordPlaybackHistory(
    filePath: string,
    title?: string,
    duration?: number,
    position?: number,
  ): Promise<void> {
    try {
      await invoke("db_add_history", { filePath, title, duration, position });
    } catch (err) {
      console.warn(`[StorageService] Failed to record history for '${filePath}':`, err);
    }
  }

  public async getRecentFiles(limit = 20): Promise<HistoryEntry[]> {
    try {
      const items = await invoke<
        Array<{
          id: number;
          file_path: string;
          title?: string;
          last_played_at: string;
          duration?: number;
          position?: number;
        }>
      >("db_get_recent_files", { limit });

      const seen = new Set<string>();
      const result: HistoryEntry[] = [];
      for (const i of items) {
        if (!seen.has(i.file_path)) {
          seen.add(i.file_path);
          result.push({
            id: i.id,
            filePath: i.file_path,
            title: i.title,
            lastPlayedAt: i.last_played_at,
            duration: i.duration,
            position: i.position,
          });
        }
      }
      return result;
    } catch (err) {
      console.warn("[StorageService] Failed to query recent files:", err);
      return [];
    }
  }
}

export const storageService = new StorageService();
