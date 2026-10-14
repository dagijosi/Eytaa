import {
  register,
  unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";

export interface GlobalShortcutsConfig {
  enabled: boolean;
  mediaKeys: boolean;
  comboKeys: boolean; // e.g. Ctrl+Alt+Space
}

export type GlobalShortcutAction =
  | "play-pause"
  | "next"
  | "previous"
  | "volume-up"
  | "volume-down"
  | "mute";

type ActionHandler = (action: GlobalShortcutAction) => void;

class GlobalShortcutsService {
  private actionHandler: ActionHandler | null = null;
  private config: GlobalShortcutsConfig = {
    enabled: true,
    mediaKeys: true,
    comboKeys: true,
  };

  public setHandler(handler: ActionHandler) {
    this.actionHandler = handler;
  }

  public async updateConfig(newConfig: Partial<GlobalShortcutsConfig>) {
    this.config = { ...this.config, ...newConfig };
    await this.applyShortcuts();
  }

  public getConfig(): GlobalShortcutsConfig {
    return { ...this.config };
  }

  public async applyShortcuts() {
    try {
      await unregisterAll();
    } catch (e) {
      console.warn("[GlobalShortcuts] Error clearing shortcuts:", e);
    }

    if (!this.config.enabled) {
      return;
    }

    const shortcutMap: { key: string; action: GlobalShortcutAction }[] = [];

    if (this.config.mediaKeys) {
      shortcutMap.push(
        { key: "MediaPlayPause", action: "play-pause" },
        { key: "MediaTrackNext", action: "next" },
        { key: "MediaTrackPrevious", action: "previous" },
        { key: "MediaStop", action: "play-pause" },
      );
    }

    if (this.config.comboKeys) {
      shortcutMap.push(
        { key: "CommandOrControl+Alt+Space", action: "play-pause" },
        { key: "CommandOrControl+Alt+Right", action: "next" },
        { key: "CommandOrControl+Alt+Left", action: "previous" },
        { key: "CommandOrControl+Alt+Up", action: "volume-up" },
        { key: "CommandOrControl+Alt+Down", action: "volume-down" },
        { key: "CommandOrControl+Alt+M", action: "mute" },
      );
    }

    for (const item of shortcutMap) {
      try {
        await register(item.key, (event) => {
          if (event.state === "Pressed") {
            if (this.actionHandler) {
              this.actionHandler(item.action);
            }
          }
        });
      } catch (err) {
        // Some keys might already be held by another app or OS; ignore non-fatal conflicts
        console.warn(`[GlobalShortcuts] Could not register '${item.key}':`, err);
      }
    }
  }

  public async dispose() {
    try {
      await unregisterAll();
    } catch (e) {
      console.warn("[GlobalShortcuts] Dispose error:", e);
    }
  }
}

export const globalShortcutsService = new GlobalShortcutsService();
