/**
 * Publishes "Now Playing" information to the operating system through the
 * Media Session API. On Windows this surfaces in the SMTC flyout, lock screen,
 * taskbar media preview, and hardware media keys, without hijacking the keys
 * as global hotkeys.
 *
 * The service is intentionally decoupled from the player store via a small
 * adapter so it can be unit-reasoned about (and so it never imports the store,
 * avoiding a circular dependency).
 */

export interface MediaSessionState {
  mediaMetadata: { title?: string; filePath?: string; duration: number } | null;
  status: string;
  currentTime: number;
  duration: number;
  playbackRate: number;
}

export interface MediaSessionStoreLike {
  getState(): MediaSessionState & {
    play: () => void | Promise<void>;
    pause: () => void | Promise<void>;
    stop: () => void | Promise<void>;
    playNext: () => void | Promise<void>;
    playPrevious: () => void | Promise<void>;
    seek: (seconds: number) => void | Promise<void>;
    seekRelative: (deltaSeconds: number) => void | Promise<void>;
  };
  subscribe: (
    listener: (...args: unknown[]) => void,
  ) => () => void;
}

let bound = false;
let lastPositionUpdate = 0;
let lastArtworkKey = "";

function artworkUrl(): string | null {
  try {
    return new URL("app-icon.png", window.location.href).href;
  } catch {
    return null;
  }
}

function updateMetadata(state: MediaSessionState): void {
  const session = navigator.mediaSession;
  if (!session || typeof MediaMetadata === "undefined") return;

  const filePath = state.mediaMetadata?.filePath;
  const title = state.mediaMetadata?.title || (filePath ? filePath.split(/[/\\]/).pop() : "") || "EYTAA";
  const key = `${title}|${filePath ?? ""}`;
  if (key === lastArtworkKey) return;
  lastArtworkKey = key;

  const url = artworkUrl();
  const artwork = url
    ? [
        { src: url, sizes: "512x512", type: "image/png" },
        { src: url, sizes: "256x256", type: "image/png" },
      ]
    : [];

  try {
    session.metadata = new MediaMetadata({
      title,
      artist: "EYTAA",
      album: filePath ? filePath.replace(/[/\\][^/\\]+$/, "") : "",
      artwork,
    });
  } catch (err) {
    console.debug("[MediaSession] Unable to set metadata:", err);
  }
}

function updatePlaybackState(status: string): void {
  const session = navigator.mediaSession;
  if (!session) return;
  let next: MediaSessionPlaybackState = "none";
  if (status === "playing") next = "playing";
  else if (status === "paused" || status === "loading") next = "paused";
  try {
    session.playbackState = next;
  } catch {
    /* Not all WebView2 versions expose playbackState */
  }
}

function updatePosition(state: MediaSessionState): void {
  const session = navigator.mediaSession;
  if (!session || typeof session.setPositionState !== "function") return;
  if (!state.duration || state.duration <= 0 || state.status !== "playing") return;

  const now = Date.now();
  // Throttle to once per 5s; position only needs to be approximately correct.
  if (now - lastPositionUpdate < 5000) return;
  lastPositionUpdate = now;

  try {
    session.setPositionState({
      duration: state.duration,
      playbackRate: state.playbackRate || 1,
      position: Math.max(0, Math.min(state.currentTime, state.duration)),
    });
  } catch (err) {
    console.debug("[MediaSession] setPositionState failed:", err);
  }
}

export function initializeMediaSession(store: MediaSessionStoreLike): void {
  if (bound) return;
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    return;
  }
  bound = true;

  const session = navigator.mediaSession;

  try {
    session.setActionHandler("play", () => {
      void store.getState().play();
    });
    session.setActionHandler("pause", () => {
      void store.getState().pause();
    });
    session.setActionHandler("stop", () => {
      void store.getState().stop();
    });
    session.setActionHandler("nexttrack", () => {
      void store.getState().playNext();
    });
    session.setActionHandler("previoustrack", () => {
      void store.getState().playPrevious();
    });
    session.setActionHandler("seekbackward", (details) => {
      void store.getState().seekRelative(-(details.seekOffset || 10));
    });
    session.setActionHandler("seekforward", (details) => {
      void store.getState().seekRelative(details.seekOffset || 10);
    });
    session.setActionHandler("seekto", (details) => {
      if (typeof details.seekTime === "number") {
        void store.getState().seek(details.seekTime);
      }
    });
  } catch (err) {
    console.debug("[MediaSession] Failed to register action handlers:", err);
  }

  const apply = (state: MediaSessionState) => {
    updateMetadata(state);
    updatePlaybackState(state.status);
    updatePosition(state);
  };

  apply(store.getState());
  store.subscribe((state) => apply(state as unknown as MediaSessionState));
}
