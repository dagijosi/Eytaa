import {
  availableMonitors,
  currentMonitor,
  getCurrentWindow,
  primaryMonitor,
  type Monitor,
} from "@tauri-apps/api/window";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";

/**
 * Remembers the main window's position and size so the app reopens exactly where
 * the user left it, and places itself in a sensible, fully-visible spot when
 * there is nothing saved yet (first run) or the saved spot is gone (e.g. a
 * monitor was disconnected).
 *
 * Geometry is stored in `localStorage` rather than the SQLite preference store
 * on purpose: it must be readable synchronously before the window is shown, so
 * the window never flashes at the wrong position while an async IPC call settles.
 */

const STORAGE_KEY = "eytaa_window_geometry";
const SAVE_DEBOUNCE_MS = 300;

// The window cannot normally be dragged below these logical minimums (see
// minWidth/minHeight in tauri.conf.json). Transient modes such as PiP resize the
// window programmatically below that floor, so anything smaller is never a size
// the user chose and must not become the remembered geometry. Compared in
// logical pixels so it holds at any display scale factor.
const MIN_LOGICAL_WIDTH = 640;
const MIN_LOGICAL_HEIGHT = 480;
const LOGICAL_TOLERANCE = 4;

// Minimum amount of the window that must land on a monitor for a saved position
// to be considered still valid.
const MIN_VISIBLE_PX = 80;

interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

function readStoredGeometry(): WindowGeometry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WindowGeometry>;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      typeof parsed.width === "number" &&
      typeof parsed.height === "number"
    ) {
      return parsed as WindowGeometry;
    }
  } catch {
    // Corrupt or inaccessible storage: fall back to centering.
  }
  return null;
}

/** Whether a decent chunk of the window would land on a connected monitor. */
function isVisibleOnAnyMonitor(geometry: WindowGeometry, monitors: Monitor[]): boolean {
  return monitors.some((monitor) => {
    const monX = monitor.position.x;
    const monY = monitor.position.y;
    const overlapX =
      Math.min(geometry.x + geometry.width, monX + monitor.size.width) - Math.max(geometry.x, monX);
    const overlapY =
      Math.min(geometry.y + geometry.height, monY + monitor.size.height) - Math.max(geometry.y, monY);
    return overlapX >= MIN_VISIBLE_PX && overlapY >= MIN_VISIBLE_PX;
  });
}

async function applyStoredGeometry(geometry: WindowGeometry): Promise<void> {
  const appWindow = getCurrentWindow();
  await appWindow.setSize(new PhysicalSize(Math.round(geometry.width), Math.round(geometry.height)));
  await appWindow.setPosition(new PhysicalPosition(Math.round(geometry.x), Math.round(geometry.y)));
}

/** Centers the window on its monitor, clamped so it stays comfortably on screen. */
async function centerWindow(): Promise<void> {
  const appWindow = getCurrentWindow();
  const monitor = (await currentMonitor()) ?? (await primaryMonitor());
  if (!monitor) return;

  const current = await appWindow.outerSize();
  // Keep a margin so the window never sits under the taskbar or beyond an edge.
  const maxWidth = Math.round(monitor.size.width * 0.86);
  const maxHeight = Math.round(monitor.size.height * 0.86);
  const width = Math.min(current.width, maxWidth);
  const height = Math.min(current.height, maxHeight);

  if (width !== current.width || height !== current.height) {
    await appWindow.setSize(new PhysicalSize(width, height));
  }

  const x = monitor.position.x + Math.round((monitor.size.width - width) / 2);
  const y = monitor.position.y + Math.round((monitor.size.height - height) / 2);
  await appWindow.setPosition(new PhysicalPosition(x, y));
}

/**
 * Restores the saved window geometry, or centers the window when nothing is
 * saved or the saved position is no longer on any connected monitor. Call this
 * *before* showing the window to avoid a visible jump.
 */
export async function restoreWindowGeometry(): Promise<void> {
  try {
    const stored = readStoredGeometry();
    if (stored) {
      const monitors = await availableMonitors();
      if (isVisibleOnAnyMonitor(stored, monitors)) {
        await applyStoredGeometry(stored);
        return;
      }
    }
    await centerWindow();
  } catch (error) {
    console.warn("[windowGeometry] Could not restore window geometry:", error);
  }
}

let trackingStarted = false;

/**
 * Persists the window position/size as the user moves or resizes it. Maximized,
 * fullscreen and transient mini modes are ignored so the remembered geometry is
 * always the last normal window the user chose.
 */
export function startWindowGeometryTracking(): void {
  if (trackingStarted) return;
  trackingStarted = true;

  const appWindow = getCurrentWindow();
  let debounce: number | null = null;

  const persist = async () => {
    try {
      if (await appWindow.isMaximized()) return;
      if (await appWindow.isFullscreen()) return;

      const position = await appWindow.outerPosition();
      const size = await appWindow.outerSize();
      const scale = (await appWindow.scaleFactor().catch(() => 1)) || 1;
      const logicalWidth = size.width / scale;
      const logicalHeight = size.height / scale;
      if (
        logicalWidth < MIN_LOGICAL_WIDTH - LOGICAL_TOLERANCE ||
        logicalHeight < MIN_LOGICAL_HEIGHT - LOGICAL_TOLERANCE
      ) {
        return;
      }

      const geometry: WindowGeometry = {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(geometry));
    } catch {
      // Persistence is best-effort; a failure just means we recenter next launch.
    }
  };

  const schedulePersist = () => {
    if (debounce !== null) window.clearTimeout(debounce);
    debounce = window.setTimeout(() => void persist(), SAVE_DEBOUNCE_MS);
  };

  appWindow.onMoved(schedulePersist).catch(() => {});
  appWindow.onResized(schedulePersist).catch(() => {});

  // Flush any pending debounce if the window is torn down.
  window.addEventListener("beforeunload", () => void persist());
}
