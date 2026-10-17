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

export function isNewerVersion(remoteVer?: string, currentVer?: string): boolean {
  if (!remoteVer || !currentVer) return false;
  const cleanRemote = remoteVer.replace(/^v/, "").trim();
  const cleanCurrent = currentVer.replace(/^v/, "").trim();
  if (cleanRemote === cleanCurrent) return false;

  const rParts = cleanRemote.split(".").map((n) => parseInt(n, 10) || 0);
  const cParts = cleanCurrent.split(".").map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

class UpdaterService {
  private activeUpdate: Update | null = null;
  private cachedVersion: string | null = null;
  private lastStatus: UpdateStatus | null = null;

  getLastStatus(): UpdateStatus | null {
    return this.lastStatus;
  }

  setLastStatus(status: UpdateStatus): void {
    this.lastStatus = status;
  }

  hasActiveUpdate(): boolean {
    return this.activeUpdate !== null;
  }

  async getAppVersion(): Promise<string> {
    if (this.cachedVersion) return this.cachedVersion;
    try {
      this.cachedVersion = await getVersion();
      return this.cachedVersion;
    } catch (err) {
      console.warn("Failed to get app version from Tauri:", err);
      return "0.2.1";
    }
  }

  async checkForUpdates(
    onProgress?: (status: UpdateStatus) => void
  ): Promise<UpdateStatus> {
    const currentVersion = await this.getAppVersion();
    try {
      const checkingStatus: UpdateStatus = {
        state: "checking",
        currentVersion,
      };
      this.lastStatus = checkingStatus;
      onProgress?.(checkingStatus);

      const update = await check();

      // Only treat as available if remote version is strictly newer than running version
      if (update?.available && update.version && isNewerVersion(update.version, currentVersion)) {
        this.activeUpdate = update;
        const status: UpdateStatus = {
          state: "available",
          currentVersion: update.currentVersion || currentVersion,
          latestVersion: update.version,
          releaseNotes: update.body,
        };
        this.lastStatus = status;
        onProgress?.(status);
        return status;
      } else {
        this.activeUpdate = null;
        const status: UpdateStatus = {
          state: "up-to-date",
          currentVersion: update?.currentVersion || currentVersion,
        };
        this.lastStatus = status;
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
      this.lastStatus = status;
      onProgress?.(status);
      return status;
    }
  }

  async installUpdate(
    onProgress?: (downloaded: number, total: number | null) => void
  ): Promise<void> {
    if (!this.activeUpdate) {
      // If activeUpdate was lost across component mounts, check again to acquire the handle
      const fresh = await check();
      if (fresh?.available) {
        this.activeUpdate = fresh;
      } else {
        throw new Error("No update pending to install.");
      }
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
