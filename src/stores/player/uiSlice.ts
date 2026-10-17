import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { StateCreator } from "zustand";
import { playerService } from "../../services/player/mpvPlayerService";
import { storageService } from "../../services/storage/storageService";
import type { PlayerStore, UiSlice, WindowGeometry } from "./types";

export const createUiSlice: StateCreator<
  PlayerStore,
  [],
  [],
  UiSlice
> = (set, get) => ({
  osdMessage: null,
  osdTimer: null,
  isControlsVisible: true,
  isPlaylistOpen: false,
  isSettingsOpen: false,
  isLibraryOpen: false,
  videoFitMode: "fit",
  settingsInitialTab: null,

  // Window & TopNav Quick Controls
  isAlwaysOnTop: false,

  // Picture-in-Picture State
  isPiP: false,
  pipPreviousGeometry: null,

  showOSD: (text: string) => {
    const currentTimer = get().osdTimer;
    if (currentTimer) {
      window.clearTimeout(currentTimer);
    }
    const newTimer = window.setTimeout(() => {
      set({ osdMessage: null, osdTimer: null });
    }, 1800);
    set({ osdMessage: text, osdTimer: newTimer });
  },

  setControlsVisible: (visible: boolean) => {
    set({ isControlsVisible: visible });
  },

  togglePlaylistDrawer: () => {
    set((s) => ({ isPlaylistOpen: !s.isPlaylistOpen }));
  },

  toggleSettingsModal: (open?: boolean | unknown, initialTab?: string) => {
    const isBool = typeof open === "boolean";
    set((s) => ({
      isSettingsOpen: isBool ? open : !s.isSettingsOpen,
      settingsInitialTab: initialTab || (isBool && open ? s.settingsInitialTab : null),
    }));
  },

  toggleLibraryModal: (open?: boolean) => {
    set((s) => ({
      isLibraryOpen: open !== undefined ? open : !s.isLibraryOpen,
    }));
  },

  // Quick Window Controls
  toggleAlwaysOnTop: async () => {
    const next = !get().isAlwaysOnTop;
    try {
      await getCurrentWindow().setAlwaysOnTop(next);
      await storageService.setPreference("alwaysOnTop", next);
      set({ isAlwaysOnTop: next });
      get().showOSD(next ? "Always on Top: Enabled" : "Always on Top: Disabled");
    } catch (e) {
      console.error("Failed to toggle always-on-top:", e);
    }
  },

  // Picture-in-Picture Toggle
  togglePiP: async () => {
    const { isPiP, pipPreviousGeometry } = get();
    if (!isPiP) {
      try {
        const geom = await invoke<WindowGeometry>("enter_pip");
        set({ isPiP: true, pipPreviousGeometry: geom });
        get().showOSD("Picture-in-Picture: On");
      } catch (e) {
        console.error("Failed to enter Picture-in-Picture:", e);
        get().showOSD("PiP mode unavailable");
      }
    } else {
      try {
        const savedAlwaysOnTop =
          (await storageService.getPreference<boolean>("alwaysOnTop")) || false;
        await invoke("exit_pip", {
          restore: pipPreviousGeometry,
          keepAlwaysOnTop: savedAlwaysOnTop,
        });
        set({ isPiP: false, pipPreviousGeometry: null });
        get().showOSD("Exited Picture-in-Picture");
      } catch (e) {
        console.error("Failed to exit Picture-in-Picture:", e);
        set({ isPiP: false });
      }
    }
  },

  setVideoFitMode: async (mode: "fit" | "fill" | "stretch") => {
    set({ videoFitMode: mode });
    await playerService.setVideoFit(mode);
    const labels: Record<string, string> = {
      fit: "Full Video (Fit)",
      fill: "Crop (Fill Screen)",
      stretch: "Stretch (Window)",
    };
    get().showOSD(`Aspect: ${labels[mode] || mode}`);
  },

  cycleVideoFitMode: async () => {
    const current = get().videoFitMode;
    const modes: Array<"fit" | "fill" | "stretch"> = ["fit", "fill", "stretch"];
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    await get().setVideoFitMode(next);
  },
});
