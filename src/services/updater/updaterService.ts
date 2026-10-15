import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getVersion } from "@tauri-apps/api/app";

export interface UpdateStatus {
  state: "idle" | "checking" | "available" | "downloading" | "up-to-date" | "error";
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  downloadProgress?: number;
  errorMessage?: string;
}

class UpdaterService {
  private activeUpdate: Update | null = null;
  private cachedVersion: string | null = null;

  async getAppVersion(): Promise<string> {
    if (this.cachedVersion) return this.cachedVersion;
    try {
      this.cachedVersion = await getVersion();
      return this.cachedVersion;
    } catch (err) {
      console.warn("Failed to get app version from Tauri:", err);
      return "0.2.0";
    }
  }

  async checkForUpdates(
    onProgress?: (status: UpdateStatus) => void
  ): Promise<UpdateStatus> {
    const currentVersion = await this.getAppVersion();
    try {
      onProgress?.({
        state: "checking",
        currentVersion,
      });

      const update = await check();

      if (update?.available) {
        this.activeUpdate = update;
        const status: UpdateStatus = {
          state: "available",
          currentVersion: update.currentVersion || currentVersion,
          latestVersion: update.version,
          releaseNotes: update.body,
        };
        onProgress?.(status);
        return status;
      } else {
        this.activeUpdate = null;
        const status: UpdateStatus = {
          state: "up-to-date",
          currentVersion: update?.currentVersion || currentVersion,
        };
        onProgress?.(status);
        return status;
      }
    } catch (err: any) {
      console.warn("Update check failed:", err);
      const status: UpdateStatus = {
        state: "error",
        currentVersion,
        errorMessage: err?.message || String(err),
      };
      onProgress?.(status);
      return status;
    }
  }

  async installUpdate(
    onProgress?: (downloaded: number, total: number | null) => void
  ): Promise<void> {
    if (!this.activeUpdate) {
      throw new Error("No update pending to install.");
    }

    let downloadedBytes = 0;
    let totalBytes: number | null = null;

    await this.activeUpdate.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          totalBytes = event.data.contentLength ?? null;
          onProgress?.(0, totalBytes);
          break;
        case "Progress":
          downloadedBytes += event.data.chunkLength;
          onProgress?.(downloadedBytes, totalBytes);
          break;
        case "Finished":
          onProgress?.(totalBytes || downloadedBytes, totalBytes);
          break;
      }
    });

    // Automatically relaunch application to apply update
    await relaunch();
  }
}

export const updaterService = new UpdaterService();
