import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

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

  async checkForUpdates(
    onProgress?: (status: UpdateStatus) => void
  ): Promise<UpdateStatus> {
    try {
      onProgress?.({
        state: "checking",
        currentVersion: "0.1.0",
      });

      const update = await check();

      if (update?.available) {
        this.activeUpdate = update;
        const status: UpdateStatus = {
          state: "available",
          currentVersion: update.currentVersion,
          latestVersion: update.version,
          releaseNotes: update.body,
        };
        onProgress?.(status);
        return status;
      } else {
        this.activeUpdate = null;
        const status: UpdateStatus = {
          state: "up-to-date",
          currentVersion: update?.currentVersion || "0.1.0",
        };
        onProgress?.(status);
        return status;
      }
    } catch (err: any) {
      console.warn("Update check failed:", err);
      const status: UpdateStatus = {
        state: "error",
        currentVersion: "0.1.0",
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
