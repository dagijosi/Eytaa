import { storageService } from "../storage/storageService";

export type LocalAction =
  | "toggle-playback"
  | "toggle-fullscreen"
  | "seek-backward"
  | "seek-forward"
  | "volume-up"
  | "volume-down"
  | "mute"
  | "speed-down"
  | "speed-up"
  | "reset-speed"
  | "cycle-subtitle"
  | "open-file"
  | "toggle-playlist"
  | "picture-in-picture"
  | "toggle-library"
  | "cycle-profile"
  | "cycle-audio"
  | "cycle-repeat"
  | "open-url"
  | "screenshot"
  | "toggle-stats"
  | "toggle-night-listening";

export interface LocalActionMeta {
  label: string;
  group: string;
  defaultKeys: string[];
}

export const LOCAL_ACTION_META: Record<LocalAction, LocalActionMeta> = {
  "toggle-playback": { label: "Play / Pause", group: "Playback", defaultKeys: [" ", "k"] },
  "speed-down": { label: "Playback Speed -0.25x", group: "Playback", defaultKeys: ["["] },
  "speed-up": { label: "Playback Speed +0.25x", group: "Playback", defaultKeys: ["]"] },
  "reset-speed": { label: "Reset Speed to 1.0x", group: "Playback", defaultKeys: ["backspace"] },
  "seek-backward": { label: "Seek Backward (Shift = 30s)", group: "Seeking", defaultKeys: ["arrowleft"] },
  "seek-forward": { label: "Seek Forward (Shift = 30s)", group: "Seeking", defaultKeys: ["arrowright"] },
  "volume-up": { label: "Volume Up", group: "Volume", defaultKeys: ["arrowup"] },
  "volume-down": { label: "Volume Down", group: "Volume", defaultKeys: ["arrowdown"] },
  mute: { label: "Mute / Unmute", group: "Volume", defaultKeys: ["m"] },
  "toggle-fullscreen": { label: "Toggle Fullscreen", group: "View", defaultKeys: ["f", "enter"] },
  "picture-in-picture": { label: "Toggle Picture-in-Picture", group: "View", defaultKeys: ["i"] },
  "toggle-playlist": { label: "Toggle Playlist (Shift+P = PiP)", group: "View", defaultKeys: ["p"] },
  "toggle-library": { label: "Toggle Media Library", group: "View", defaultKeys: ["b"] },
  "cycle-subtitle": { label: "Cycle Subtitle Track", group: "Tools", defaultKeys: ["s"] },
  "cycle-audio": { label: "Cycle Audio Track", group: "Tools", defaultKeys: ["a"] },
  "cycle-repeat": { label: "Cycle Repeat Mode", group: "Tools", defaultKeys: ["r"] },
  "open-file": { label: "Open File", group: "Tools", defaultKeys: ["o"] },
  "open-url": { label: "Open Network Stream (URL)", group: "Tools", defaultKeys: ["u"] },
  "screenshot": { label: "Save Screenshot", group: "Tools", defaultKeys: ["e"] },
  "toggle-stats": { label: "Toggle Playback Stats", group: "Tools", defaultKeys: ["f9"] },
  "cycle-profile": { label: "Cycle Playback Profile", group: "Tools", defaultKeys: ["f7"] },
  "toggle-night-listening": { label: "Toggle Night Listening", group: "Tools", defaultKeys: ["f8"] },
};

export type LocalShortcutsConfig = Record<LocalAction, string[]>;

const STORAGE_KEY = "localShortcuts";

const ALL_ACTIONS = Object.keys(LOCAL_ACTION_META) as LocalAction[];

function defaultConfig(): LocalShortcutsConfig {
  const cfg = {} as LocalShortcutsConfig;
  for (const action of ALL_ACTIONS) {
    cfg[action] = [...LOCAL_ACTION_META[action].defaultKeys];
  }
  return cfg;
}

export function displayKey(key: string): string {
  switch (key) {
    case " ":
      return "Space";
    case "arrowleft":
      return "←";
    case "arrowright":
      return "→";
    case "arrowup":
      return "↑";
    case "arrowdown":
      return "↓";
    case "enter":
      return "Enter";
    case "backspace":
      return "Backspace";
    case "escape":
      return "Esc";
    case "delete":
      return "Del";
    case "f7":
      return "F7";
    case "f8":
      return "F8";
    case "f9":
      return "F9";
    default:
      return key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
  }
}

class LocalShortcutsService {
  private config: LocalShortcutsConfig = defaultConfig();
  private listeners = new Set<(cfg: LocalShortcutsConfig) => void>();
  private readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this.load();
  }

  private async load(): Promise<void> {
    try {
      const saved = await storageService.getPreference<Partial<LocalShortcutsConfig>>(STORAGE_KEY);
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        const merged = defaultConfig();
        for (const action of ALL_ACTIONS) {
          const keys = saved[action];
          if (
            Array.isArray(keys) &&
            keys.length > 0 &&
            keys.every((k) => typeof k === "string" && k.length > 0)
          ) {
            merged[action] = keys;
          }
        }
        this.config = merged;
      }
    } catch (err) {
      console.warn("[LocalShortcuts] Failed to load config:", err);
    }
    this.emit();
  }

  public whenReady(): Promise<void> {
    return this.readyPromise;
  }

  public getConfig(): LocalShortcutsConfig {
    return this.config;
  }

  public subscribe(listener: (cfg: LocalShortcutsConfig) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot: LocalShortcutsConfig = { ...this.config };
    this.listeners.forEach((listener) => listener(snapshot));
  }

  public resolveAction(e: KeyboardEvent): LocalAction | null {
    // Bindings are stored as bare keys. Never fire them through modifier
    // combinations, otherwise Ctrl+F (browser find) would toggle fullscreen and
    // system shortcuts would double-trigger. Shift is allowed because it is
    // used as a seek multiplier.
    if (e.ctrlKey || e.altKey || e.metaKey) return null;
    const key = e.key.toLowerCase();
    for (const action of ALL_ACTIONS) {
      if (this.config[action].includes(key)) return action;
    }
    return null;
  }

  public async setBinding(action: LocalAction, keys: string[]): Promise<void> {
    const next: LocalShortcutsConfig = { ...this.config };
    for (const other of ALL_ACTIONS) {
      if (other !== action) {
        next[other] = next[other].filter((k) => !keys.includes(k));
      }
    }
    next[action] = keys;
    this.config = next;
    this.emit();
    await storageService.setPreference(STORAGE_KEY, next);
  }

  public async resetBinding(action: LocalAction): Promise<void> {
    await this.setBinding(action, [...LOCAL_ACTION_META[action].defaultKeys]);
  }

  public async resetAll(): Promise<void> {
    this.config = defaultConfig();
    this.emit();
    await storageService.setPreference(STORAGE_KEY, this.config);
  }
}

export const localShortcutsService = new LocalShortcutsService();
