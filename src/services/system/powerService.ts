import { invoke } from "@tauri-apps/api/core";

export interface PowerStatus {
  on_battery: boolean;
  battery_percent: number | null;
  power_saver: boolean;
}

class PowerService {
  private lastStatus: PowerStatus = {
    on_battery: false,
    battery_percent: null,
    power_saver: false,
  };
  private lastTaskbarUpdate = 0;

  public async getPowerStatus(): Promise<PowerStatus> {
    try {
      const status = await invoke<PowerStatus>("get_power_status");
      this.lastStatus = status;
      return status;
    } catch {
      return this.lastStatus;
    }
  }

  public isOnBattery(): boolean {
    return this.lastStatus.on_battery;
  }

  public async setPlaybackWakeLock(active: boolean): Promise<void> {
    try {
      await invoke("set_playback_wake_lock", { active });
    } catch {
      // Ignore on unsupported platforms
    }
  }

  public async setTaskbarProgress(
    state: "playing" | "paused" | "none",
    progress?: number,
    force = false,
  ): Promise<void> {
    const now = performance.now();
    if (!force && state === "playing" && now - this.lastTaskbarUpdate < 1000) {
      return;
    }
    this.lastTaskbarUpdate = now;
    try {
      await invoke("set_taskbar_progress", {
        state,
        progress: typeof progress === "number" ? progress : null,
      });
    } catch {
      // Non-Windows or unsupported
    }
  }

  public async setTrayEnabled(enabled: boolean): Promise<void> {
    try {
      await invoke("set_tray_enabled", { enabled });
    } catch (err) {
      console.warn("Failed to toggle tray:", err);
    }
  }
}

export const powerService = new PowerService();
