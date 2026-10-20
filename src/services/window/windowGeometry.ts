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

const STORAGE_KEY = "eytaa_window_geometry_v2";
const LEGACY_STORAGE_KEY = "eytaa_window_geometry";
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

function parseGeometryString(raw: string | null): WindowGeometry | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WindowGeometry>;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      typeof parsed.width === "number" &&
      typeof parsed.height === "number" &&
      parsed.width > 0 &&
      parsed.height > 0
    ) {
      return parsed as WindowGeometry;
    }
  } catch {
    // Corrupt JSON
  }
  return null;
}

function readStoredGeometry(): WindowGeometry | null {
  try {
    // Check v2 storage first
    const v2 = parseGeometryString(localStorage.getItem(STORAGE_KEY));
    if (v2) return v2;

    // Clean up legacy v1 storage if present to ensure the new screen-size
    // proportional defaults take effect on first open.
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Corrupt or inaccessible storage: fall back to centering.
  }
  return null;
}

/**
 * Computes an ideal, balanced window geometry based on the monitor's usable work area
 * (strictly excluding taskbars, docks, and OS panels).
 *
 * Targets a comfortable ~68% width and ~66% height proportion so the app feels
 * spacious and well-framed without overwhelming the screen or slipping under the taskbar.
 */
export function computeIdealWindowGeometry(monitor: Monitor): WindowGeometry {
  const workArea = monitor.workArea ?? {
    position: monitor.position,
    size: monitor.size,
  };

  const scale = monitor.scaleFactor || 1;
  const minWidth = Math.min(workArea.size.width, Math.round(MIN_LOGICAL_WIDTH * scale));
  const minHeight = Math.min(workArea.size.height, Math.round(MIN_LOGICAL_HEIGHT * scale));

  // Never exceed 80% width or 76% height on first launch
  const maxAllowedWidth = Math.round(workArea.size.width * 0.80);
  const maxAllowedHeight = Math.round(workArea.size.height * 0.76);

  let targetWidth = Math.round(workArea.size.width * 0.68);
  const targetHeight = Math.round(workArea.size.height * 0.66);

  // If the screen is ultra-wide (e.g. 21:9 or 32:9), balance width to widescreen 16:9
  // so it doesn't stretch across the entire ultra-wide desk.
  if (targetWidth / targetHeight > 1.8) {
    targetWidth = Math.round(targetHeight * 1.77);
  }

  const width = Math.max(minWidth, Math.min(targetWidth, maxAllowedWidth));
  const height = Math.max(minHeight, Math.min(targetHeight, maxAllowedHeight));

  // Center strictly inside the monitor's usable work area (balanced margins top, bottom, left, right)
  const x = workArea.position.x + Math.round((workArea.size.width - width) / 2);
  const y = workArea.position.y + Math.round((workArea.size.height - height) / 2);

  return { x, y, width, height };
}

/**
 * Finds the monitor where the window geometry has the most visible overlap.
 */
function findBestMonitor(geometry: WindowGeometry, monitors: Monitor[]): Monitor | null {
  let bestMonitor: Monitor | null = null;
  let maxOverlapArea = 0;

  for (const monitor of monitors) {
    const wa = monitor.workArea ?? {
      position: monitor.position,
      size: monitor.size,
    };
    const overlapX = Math.max(
      0,
      Math.min(geometry.x + geometry.width, wa.position.x + wa.size.width) -
        Math.max(geometry.x, wa.position.x),
    );
    const overlapY = Math.max(
      0,
      Math.min(geometry.y + geometry.height, wa.position.y + wa.size.height) -
        Math.max(geometry.y, wa.position.y),
    );
    const area = overlapX * overlapY;
    if (area > maxOverlapArea) {
      maxOverlapArea = area;
      bestMonitor = monitor;
    }
  }

  return maxOverlapArea >= MIN_VISIBLE_PX * MIN_VISIBLE_PX ? bestMonitor : null;
}

/**
 * Ensures a user's chosen window geometry stays accessible on the connected display.
 * Does NOT override or shrink the user's custom size unless it literally exceeds the display resolution.
 */
function clampToWorkArea(geometry: WindowGeometry, monitor: Monitor): WindowGeometry {
  const workArea = monitor.workArea ?? {
    position: monitor.position,
    size: monitor.size,
  };

  // Keep the user's exact chosen width and height, capped only by the screen's maximum boundaries
  const width = Math.min(geometry.width, workArea.size.width);
  const height = Math.min(geometry.height, workArea.size.height);

  const minX = workArea.position.x;
  const maxX = Math.max(minX, workArea.position.x + workArea.size.width - width);
  const minY = workArea.position.y;
  const maxY = Math.max(minY, workArea.position.y + workArea.size.height - height);

  const x = Math.max(minX, Math.min(geometry.x, maxX));
  const y = Math.max(minY, Math.min(geometry.y, maxY));

  return { x, y, width, height };
}

async function applyStoredGeometry(geometry: WindowGeometry): Promise<void> {
  const appWindow = getCurrentWindow();
  await appWindow.setSize(new PhysicalSize(Math.round(geometry.width), Math.round(geometry.height)));
  await appWindow.setPosition(new PhysicalPosition(Math.round(geometry.x), Math.round(geometry.y)));
}

/** 
 * Centers the window on its monitor, sized proportionally to the screen's usable work area.
 * Called only on FIRST install/open (or when no valid geometry has been saved yet).
 * Persists the initial geometry so subsequent opens restore this exact frame until the user modifies it.
 */
export async function centerWindow(): Promise<void> {
  const appWindow = getCurrentWindow();
  const monitor = (await currentMonitor()) ?? (await primaryMonitor());
  if (!monitor) return;

  const ideal = computeIdealWindowGeometry(monitor);
  await appWindow.setSize(new PhysicalSize(ideal.width, ideal.height));
  await appWindow.setPosition(new PhysicalPosition(ideal.x, ideal.y));

  // Persist the clean initial geometry so all future launches restore this frame
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ideal));
  } catch {
    // Persistence is best-effort
  }
}

/**
 * Restores the user's remembered window position and size exactly as they left it.
 * The dynamic screen-size calculation ONLY runs on first install and open when no geometry
 * has been chosen or saved yet.
 */
export async function restoreWindowGeometry(): Promise<void> {
  try {
    const stored = readStoredGeometry();
    if (stored) {
      // User has an existing saved geometry: restore their exact preferred position & size
      const monitors = await availableMonitors();
      const targetMonitor = findBestMonitor(stored, monitors);
      if (targetMonitor) {
        const clamped = clampToWorkArea(stored, targetMonitor);
        await applyStoredGeometry(clamped);
        return;
      }
    }

    // Only reached on initial install & first open (or if saved monitor is disconnected)
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
