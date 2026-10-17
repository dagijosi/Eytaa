import type { StateCreator } from "zustand";
import { storageService } from "../../services/storage/storageService";
import { updaterService, isNewerVersion } from "../../services/updater/updaterService";
import type { PlayerStore, UpdatesSlice } from "./types";

export const createUpdatesSlice: StateCreator<
  PlayerStore,
  [],
  [],
  UpdatesSlice
> = (set, get) => ({
  availableUpdate: null,
  showUpdateToast: false,
  autoCheckUpdates: true,
  updateCheckToast: null,

  checkUpdatesSilently: async () => {
    const { autoCheckUpdates } = get();
    if (!autoCheckUpdates) return;

    const currentVer = await updaterService.getAppVersion();

    // Rate limit check: at most once every 24 hours (86,400,000 ms)
    const lastCheck = (await storageService.getPreference<number>("lastUpdateCheckTimestamp")) || 0;
    const now = Date.now();
    if (now - lastCheck < 24 * 60 * 60 * 1000) {
      // Restore cached available update ONLY if it is strictly newer than current running version!
      const cachedVer = await storageService.getPreference<string>("cachedAvailableUpdateVer");
      if (cachedVer && isNewerVersion(cachedVer, currentVer)) {
        set({ availableUpdate: { version: cachedVer } });
      } else {
        await storageService.setPreference("cachedAvailableUpdateVer", null);
        set({ availableUpdate: null, showUpdateToast: false });
      }
      return;
    }

    await storageService.setPreference("lastUpdateCheckTimestamp", now);

    try {
      const update = await updaterService.checkForUpdates();
      if (update.state === "available" && update.latestVersion && isNewerVersion(update.latestVersion, currentVer)) {
        const dismissedVer = await storageService.getPreference<string>("dismissedUpdateVersion");
        const updateInfo = {
          version: update.latestVersion,
          releaseNotes: update.releaseNotes,
        };
        set({ availableUpdate: updateInfo });
        await storageService.setPreference("cachedAvailableUpdateVer", update.latestVersion);

        // DO NOT BOTHER: If the user is currently playing a video, NEVER interrupt them!
        // Also if they already dismissed this specific version, do not show the toast.
        const isCurrentlyPlaying = get().status === "playing";
        if (!isCurrentlyPlaying && dismissedVer !== update.latestVersion) {
          set({ showUpdateToast: true });
        }
      } else {
        set({ availableUpdate: null, showUpdateToast: false });
        await storageService.setPreference("cachedAvailableUpdateVer", null);
      }
    } catch (err) {
      console.debug("Silent update check skipped:", err);
    }
  },

  dismissUpdateToast: async () => {
    const { availableUpdate } = get();
    if (availableUpdate?.version) {
      await storageService.setPreference("dismissedUpdateVersion", availableUpdate.version);
    }
    set({ showUpdateToast: false });
  },

  // User-triggered update check with persistent toast feedback (context menu / settings)
  checkForUpdatesManually: async () => {
    set({ updateCheckToast: { state: "checking" } });
    try {
      const currentVer = await updaterService.getAppVersion();
      const result = await updaterService.checkForUpdates();
      if (result.state === "available" && result.latestVersion && isNewerVersion(result.latestVersion, currentVer)) {
        set({
          updateCheckToast: { state: "available", version: result.latestVersion },
          availableUpdate: {
            version: result.latestVersion,
            releaseNotes: result.releaseNotes,
          },
        });
        await storageService.setPreference("cachedAvailableUpdateVer", result.latestVersion);
        await storageService.setPreference("lastUpdateCheckTimestamp", Date.now());
      } else if (result.state === "up-to-date" || (result.state === "available" && !isNewerVersion(result.latestVersion, currentVer))) {
        set({ updateCheckToast: { state: "up-to-date" } });
        set({ availableUpdate: null, showUpdateToast: false });
        await storageService.setPreference("cachedAvailableUpdateVer", null);
        await storageService.setPreference("lastUpdateCheckTimestamp", Date.now());
      } else {
        set({
          updateCheckToast: {
            state: "error",
            message: result.errorMessage || "Could not reach the update server",
          },
        });
      }
    } catch (err: any) {
      set({
        updateCheckToast: {
          state: "error",
          message: err?.message || "Update check failed",
        },
      });
    }
  },

  dismissUpdateCheckToast: () => {
    set({ updateCheckToast: null });
  },

  toggleAutoCheckUpdates: async (enabled?: boolean) => {
    const next = enabled !== undefined ? enabled : !get().autoCheckUpdates;
    set({ autoCheckUpdates: next });
    await storageService.setPreference("autoCheckUpdates", next);
    get().showOSD(
      next ? "Automatic Update Checks: Enabled" : "Automatic Update Checks: Disabled",
    );
  },
});
