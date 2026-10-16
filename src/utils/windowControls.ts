import { getCurrentWindow } from "@tauri-apps/api/window";

let wasMaximizedBeforeFullscreen = false;

export async function toggleWindowFullscreen(): Promise<boolean> {
  try {
    const appWindow = getCurrentWindow();
    const current = await appWindow.isFullscreen();
    if (!current) {
      const isMax = await appWindow.isMaximized();
      wasMaximizedBeforeFullscreen = isMax;
      if (isMax) {
        await appWindow.unmaximize();
      }
      await appWindow.setFullscreen(true);
      return true;
    } else {
      await appWindow.setFullscreen(false);
      if (wasMaximizedBeforeFullscreen) {
        await appWindow.maximize();
        wasMaximizedBeforeFullscreen = false;
      }
      return false;
    }
  } catch (e) {
    console.warn("Fullscreen toggle error:", e);
    return false;
  }
}
