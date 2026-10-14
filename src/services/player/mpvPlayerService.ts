import {
  init,
  destroy,
  command,
  setProperty,
  getProperty,
  observeProperties,
  listenEvents,
  MpvObservableProperty,
  MpvEvent,
} from "tauri-plugin-libmpv-api";
import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  MediaPlayerService,
  PlayerState,
  PlayerError,
  TrackInfo,
  MediaMetadata,
} from "./types";
import { formatMediaTitle } from "../../utils/mediaTitle";

const OBSERVED_PROPERTIES = [
  ["pause", "flag"],
  ["time-pos", "double", "none"],
  ["duration", "double", "none"],
  ["volume", "double"],
  ["mute", "flag"],
  ["speed", "double"],
  ["media-title", "string", "none"],
  ["filename", "string", "none"],
  ["path", "string", "none"],
  ["track-list", "node", "none"],
  ["eof-reached", "flag"],
  ["vid", "string", "none"],
  ["aid", "string", "none"],
  ["sid", "string", "none"],
] as const satisfies MpvObservableProperty[];

export class MpvPlayerService implements MediaPlayerService {
  private state: PlayerState = {
    status: "idle",
    currentTime: 0,
    duration: 0,
    volume: 100,
    muted: false,
    playbackRate: 1.0,
    audioTracks: [],
    subtitleTracks: [],
    currentAudioTrackId: undefined,
    currentSubtitleTrackId: undefined,
    mediaMetadata: null,
    error: null,
    isInitialized: false,
  };

  private listeners: Set<(state: PlayerState) => void> = new Set();
  private endFileListeners: Set<(reason: string) => void> = new Set();
  private hasFiredEofForCurrent = false;
  private unlistenProperties: UnlistenFn | null = null;
  private unlistenEvents: UnlistenFn | null = null;
  private initializingPromise: Promise<void> | null = null;

  public async initialize(): Promise<void> {
    if (this.state.isInitialized) {
      return;
    }

    if (this.initializingPromise) {
      return this.initializingPromise;
    }

    this.initializingPromise = (async () => {
      try {
        await init({
          initialOptions: {
            vo: "gpu-next",
            hwdec: "auto-safe",
            "keep-open": "no",
            "force-window": "yes",
            keepaspect: "yes",
            panscan: "0.0",
            "video-aspect-override": "-1",
            "video-zoom": "0",
            "video-unscaled": "no",
            "audio-client-name": "EYTAA",
            "sub-pos": "88",
            "sub-margin-y": "65",
            "sub-use-margins": "yes",
          },
          observedProperties: OBSERVED_PROPERTIES,
        });

        this.unlistenProperties = await observeProperties(
          OBSERVED_PROPERTIES,
          ({ name, data }) => {
            this.handlePropertyChange(name, data);
          },
        );

        this.unlistenEvents = await listenEvents((event: MpvEvent) => {
          this.handleMpvEvent(event);
        });

        this.updateState({
          isInitialized: true,
          status: "idle",
          error: null,
        });
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : String(err ?? "Unknown error");
        const playerError: PlayerError = {
          code: "INITIALIZATION_FAILED",
          message: `Failed to initialize MPV engine: ${errorMsg}`,
          details: err,
        };
        this.updateState({ error: playerError, status: "error" });
        throw playerError;
      } finally {
        this.initializingPromise = null;
      }
    })();

    return this.initializingPromise;
  }

  private handlePropertyChange(name: string, data: unknown): void {
    switch (name) {
      case "pause": {
        const isPaused = Boolean(data);
        if (this.state.status === "playing" || this.state.status === "paused") {
          this.updateState({ status: isPaused ? "paused" : "playing" });
        }
        break;
      }
      case "time-pos": {
        if (typeof data === "number") {
          this.updateState({ currentTime: Math.max(0, data) });
          if (this.state.duration > 2 && data >= this.state.duration - 0.3) {
            this.notifyEndFile("eof");
          }
        }
        break;
      }
      case "eof-reached": {
        if (Boolean(data)) {
          this.notifyEndFile("eof");
        }
        break;
      }
      case "duration": {
        if (typeof data === "number") {
          this.updateState({ duration: Math.max(0, data) });
        }
        break;
      }
      case "volume": {
        if (typeof data === "number") {
          this.updateState({ volume: Math.round(data) });
        }
        break;
      }
      case "mute": {
        this.updateState({ muted: Boolean(data) });
        break;
      }
      case "speed": {
        if (typeof data === "number") {
          this.updateState({ playbackRate: data });
        }
        break;
      }
      case "media-title":
      case "filename":
      case "path": {
        if (data && typeof data === "string") {
          const filePath =
            name === "path" ? data : this.state.mediaMetadata?.filePath || "";
          const fileName = filePath
            ? filePath.split(/[/\\]/).pop() || data
            : data;
          const cleanTitle = formatMediaTitle(fileName, filePath);

          const metadata: MediaMetadata = {
            ...(this.state.mediaMetadata || { duration: this.state.duration }),
            title: cleanTitle,
            filePath: filePath || this.state.mediaMetadata?.filePath,
            duration: this.state.duration,
          };
          this.updateState({ mediaMetadata: metadata });
        }
        break;
      }
      case "track-list": {
        if (Array.isArray(data)) {
          this.parseTrackList(data as Array<Record<string, unknown>>);
        }
        break;
      }
      case "aid": {
        const aid = Number(data);
        this.updateState({ currentAudioTrackId: isNaN(aid) ? undefined : aid });
        break;
      }
      case "sid": {
        const sid = Number(data);
        this.updateState({ currentSubtitleTrackId: isNaN(sid) ? undefined : sid });
        break;
      }
    }
  }

  private notifyEndFile(reason: string): void {
    if (reason === "eof") {
      if (this.hasFiredEofForCurrent) return;
      this.hasFiredEofForCurrent = true;
    }
    this.endFileListeners.forEach((listener) => {
      try {
        listener(reason);
      } catch (e) {
        console.error("End file listener error:", e);
      }
    });
  }

  private handleMpvEvent(event: MpvEvent): void {
    const eventName = event.event;
    switch (eventName) {
      case "start-file":
        this.hasFiredEofForCurrent = false;
        this.updateState({ status: "loading", error: null });
        break;
      case "file-loaded":
        this.hasFiredEofForCurrent = false;
        this.updateState({ status: "playing", error: null });
        break;
      case "end-file": {
        const reason = (event as unknown as { reason?: string }).reason || "eof";
        this.updateState({ status: "stopped" });
        this.notifyEndFile(reason);
        break;
      }
      case "playback-restart":
        if (this.state.status === "loading") {
          this.updateState({ status: "playing" });
        }
        break;
    }
  }

  private parseTrackList(rawList: Array<Record<string, unknown>>): void {
    const audio: TrackInfo[] = [];
    const subs: TrackInfo[] = [];

    for (const item of rawList) {
      const type = item.type as string;
      const id = Number(item.id);
      const title = (item.title as string) || (item.lang as string) || `Track ${id}`;
      const selected = Boolean(item.selected);
      const lang = item.lang as string | undefined;
      const codec = item.codec as string | undefined;
      const external = Boolean(item.external);

      if (type === "audio") {
        audio.push({ id, type: "audio", title, lang, codec, selected, external });
      } else if (type === "sub") {
        subs.push({ id, type: "sub", title, lang, codec, selected, external });
      }
    }

    this.updateState({ audioTracks: audio, subtitleTracks: subs });
  }

  public async openFile(filePath: string): Promise<void> {
    await this.ensureInitialized();
    try {
      this.hasFiredEofForCurrent = false;
      this.updateState({
        status: "loading",
        error: null,
        currentTime: 0,
        mediaMetadata: {
          filePath,
          duration: 0,
          title: formatMediaTitle(filePath.split(/[/\\]/).pop() || filePath, filePath),
        },
      });
      await command("loadfile", [filePath, "replace"]);
      await setProperty("keepaspect", true);
      await setProperty("panscan", 0.0);
      await setProperty("video-zoom", 0);
      await setProperty("pause", false);
      this.updateState({ status: "playing" });
    } catch (err) {
      const playerError: PlayerError = {
        code: "PLAYBACK_ERROR",
        message: `Failed to open media file '${filePath}': ${err}`,
        details: err,
      };
      this.updateState({ status: "error", error: playerError });
      throw playerError;
    }
  }

  public async setVideoFit(mode: "fit" | "fill" | "stretch"): Promise<void> {
    await this.ensureInitialized();
    try {
      if (mode === "fit") {
        await setProperty("keepaspect", true);
        await setProperty("panscan", 0.0);
        await setProperty("video-zoom", 0);
      } else if (mode === "fill") {
        await setProperty("keepaspect", true);
        await setProperty("panscan", 1.0);
      } else if (mode === "stretch") {
        await setProperty("keepaspect", false);
        await setProperty("panscan", 0.0);
      }
    } catch (e) {
      console.warn("Set video fit error:", e);
    }
  }

  public async openStream(url: string): Promise<void> {
    await this.ensureInitialized();
    try {
      this.updateState({
        status: "loading",
        error: null,
        currentTime: 0,
        mediaMetadata: { filePath: url, duration: 0, title: url },
      });
      await command("loadfile", [url, "replace"]);
      await setProperty("pause", false);
      this.updateState({ status: "playing" });
    } catch (err) {
      const playerError: PlayerError = {
        code: "NETWORK_ERROR",
        message: `Failed to open stream '${url}': ${err}`,
        details: err,
      };
      this.updateState({ status: "error", error: playerError });
      throw playerError;
    }
  }

  public async play(): Promise<void> {
    await this.ensureInitialized();
    await setProperty("pause", false);
    this.updateState({ status: "playing" });
  }

  public async pause(): Promise<void> {
    await this.ensureInitialized();
    await setProperty("pause", true);
    this.updateState({ status: "paused" });
  }

  public async togglePlayback(): Promise<void> {
    await this.ensureInitialized();
    if (this.state.status === "playing") {
      await this.pause();
    } else {
      await this.play();
    }
  }

  public async stop(): Promise<void> {
    await this.ensureInitialized();
    try {
      await command("stop", []);
      this.updateState({ status: "stopped", currentTime: 0 });
    } catch (err) {
      console.warn("Stop command failed, attempting pause fallback", err);
      await this.pause();
    }
  }

  public async seek(seconds: number): Promise<void> {
    await this.ensureInitialized();
    const clamped = Math.max(0, Math.min(seconds, this.state.duration || seconds));
    this.hasFiredEofForCurrent = false;
    await command("seek", [clamped, "absolute"]);
    this.updateState({ currentTime: clamped });
  }

  public async setVolume(value: number): Promise<void> {
    await this.ensureInitialized();
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    await setProperty("volume", clamped);
    this.updateState({ volume: clamped, muted: clamped === 0 ? true : this.state.muted });
  }

  public async setMuted(muted: boolean): Promise<void> {
    await this.ensureInitialized();
    await setProperty("mute", muted);
    this.updateState({ muted });
  }

  public async setPlaybackRate(rate: number): Promise<void> {
    await this.ensureInitialized();
    const clamped = Math.max(0.25, Math.min(4.0, rate));
    await setProperty("speed", clamped);
    this.updateState({ playbackRate: clamped });
  }

  public async loadSubtitle(filePath: string): Promise<void> {
    await this.ensureInitialized();
    await command("sub-add", [filePath, "select"]);
  }

  public async selectAudioTrack(trackId: number): Promise<void> {
    await this.ensureInitialized();
    await setProperty("aid", trackId);
    this.updateState({ currentAudioTrackId: trackId });
  }

  public async selectSubtitleTrack(trackId: number): Promise<void> {
    await this.ensureInitialized();
    await setProperty("sid", trackId);
    this.updateState({ currentSubtitleTrackId: trackId });
  }

  public async setSubtitlePosition(pos: number): Promise<void> {
    await this.ensureInitialized();
    try {
      await setProperty("sub-pos", pos);
    } catch (err) {
      console.warn("Failed to set sub-pos:", err);
    }
  }

  public async setSubtitleMarginY(pixels: number): Promise<void> {
    await this.ensureInitialized();
    try {
      await setProperty("sub-margin-y", pixels);
    } catch (err) {
      console.warn("Failed to set sub-margin-y:", err);
    }
  }

  public async getMpvProperty<T = unknown>(name: string): Promise<T> {
    await this.ensureInitialized();
    return (await getProperty(name, "string")) as T;
  }

  public async setMpvProperty(name: string, value: string | number | boolean): Promise<void> {
    await this.ensureInitialized();
    await setProperty(name, value);
  }

  public getPlayerState(): PlayerState {
    return { ...this.state };
  }

  public subscribe(listener: (state: PlayerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getPlayerState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onEndFile(listener: (reason: string) => void): () => void {
    this.endFileListeners.add(listener);
    return () => {
      this.endFileListeners.delete(listener);
    };
  }

  public async dispose(): Promise<void> {
    if (this.unlistenProperties) {
      this.unlistenProperties();
      this.unlistenProperties = null;
    }

    if (this.unlistenEvents) {
      this.unlistenEvents();
      this.unlistenEvents = null;
    }

    if (this.state.isInitialized) {
      try {
        await destroy();
      } catch (err) {
        console.warn("Failed to cleanly destroy mpv instance", err);
      }
    }

    this.updateState({
      isInitialized: false,
      status: "idle",
      currentTime: 0,
      duration: 0,
      mediaMetadata: null,
      error: null,
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.state.isInitialized) {
      await this.initialize();
    }
  }

  private updateState(partial: Partial<PlayerState>): void {
    this.state = { ...this.state, ...partial };
    const currentState = this.getPlayerState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (e) {
        console.error("Listener error:", e);
      }
    });
  }
}

export const playerService = new MpvPlayerService();
