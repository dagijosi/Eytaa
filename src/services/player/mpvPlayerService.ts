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
  ["hwdec-current", "string", "none"],
] as const satisfies MpvObservableProperty[];

const PREFERRED_SUBTITLE_LANGS: Array<{ code: string; label: string }> = [
  { code: "en", label: "english" },
  { code: "ar", label: "arabic" },
];

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
  private hwdecFallbackListeners: Set<(filePath: string) => void> = new Set();
  private hasFiredEofForCurrent = false;
  private unlistenProperties: UnlistenFn | null = null;
  private unlistenEvents: UnlistenFn | null = null;
  private initializingPromise: Promise<void> | null = null;
  private lastLoadedPath: string | null = null;
  private hwdecFallbackAttempted = false;
  private autoSelectGeneration = 0;
  private autoSelectTimers: ReturnType<typeof setTimeout>[] = [];

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
            "slang": "en,ar",
            "demuxer-mkv-subtitle-preroll": "yes",
            "osd-bar": "no",
            "osd-on-seek": "no",
            "osd-level": "0",
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
        this.scheduleAutoSubtitleSelection();
        break;
      case "end-file": {
        const reason = (event as unknown as { reason?: string }).reason || "eof";
        if (reason === "error" && this.lastLoadedPath && !this.hwdecFallbackAttempted) {
          console.warn(`Playback error for ${this.lastLoadedPath}. Attempting software decoding fallback (hwdec=no)...`);
          this.hwdecFallbackAttempted = true;
          this.notifyHwdecFallback(this.lastLoadedPath);
          this.fallbackToSoftwareDecoding(this.lastLoadedPath);
          return;
        }
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

  private async fallbackToSoftwareDecoding(filePath: string): Promise<void> {
    try {
      await setProperty("hwdec", "no");
      await command("loadfile", [filePath, "replace"]);
      await setProperty("pause", false);
      this.updateState({ status: "playing", error: null });
    } catch (err) {
      console.error("Software decoding fallback also failed:", err);
      const playerError: PlayerError = {
        code: "CODEC_UNSUPPORTED",
        message: `Playback failed: file damaged or codec unsupported by hardware/software decoders.`,
        details: err,
      };
      this.updateState({ status: "error", error: playerError });
      this.notifyEndFile("error");
    }
  }

  public onHwdecFallback(listener: (filePath: string) => void): () => void {
    this.hwdecFallbackListeners.add(listener);
    return () => {
      this.hwdecFallbackListeners.delete(listener);
    };
  }

  private notifyHwdecFallback(filePath: string): void {
    this.hwdecFallbackListeners.forEach((listener) => {
      try {
        listener(filePath);
      } catch (e) {
        console.error("hwdec fallback listener error:", e);
      }
    });
  }

  private parseTrackList(rawList: Array<Record<string, unknown>>): void {
    const audio: TrackInfo[] = [];
    const subs: TrackInfo[] = [];

    let activeSubId: number | undefined = undefined;
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
        if (selected && id > 0) {
          activeSubId = id;
        }
      }
    }

    const nextState: Partial<PlayerState> = { audioTracks: audio, subtitleTracks: subs };
    nextState.currentSubtitleTrackId = activeSubId;
    this.updateState(nextState);
  }

  private pickBestSubtitleTrack(tracks: TrackInfo[]): TrackInfo | undefined {
    if (tracks.length === 0) return undefined;

    let best: TrackInfo | undefined;
    let bestScore = -Infinity;

    for (const track of tracks) {
      const lang = (track.lang || "").toLowerCase();
      const title = (track.title || "").toLowerCase();
      let score = !lang && !title ? 5 : 10;

      for (let i = 0; i < PREFERRED_SUBTITLE_LANGS.length; i++) {
        const { code, label } = PREFERRED_SUBTITLE_LANGS[i];
        const langMatches =
          lang === code || (lang.length === 3 && lang.startsWith(code));
        if (langMatches) {
          score = 100 - i * 10;
          break;
        }
        if (title.includes(label)) {
          score = 95 - i * 10;
          break;
        }
      }
      if (/\b(forced|sdh|cc|hi|ad)\b/.test(title) || /forced|sdh/.test(lang)) {
        score -= 20;
      }
      if (score > bestScore) {
        bestScore = score;
        best = track;
      }
    }
    return best;
  }

  private scheduleAutoSubtitleSelection(): void {
    const gen = ++this.autoSelectGeneration;
    for (const timer of this.autoSelectTimers) clearTimeout(timer);
    this.autoSelectTimers = [];

    const attempt = () => {
      if (gen !== this.autoSelectGeneration) return;
      if (this.state.currentSubtitleTrackId) return;
      const tracks = this.state.subtitleTracks;
      if (tracks.length === 0) return;
      const best = this.pickBestSubtitleTrack(tracks);
      if (best) {
        this.selectSubtitleTrack(best.id).catch((e) =>
          console.warn("Auto subtitle selection failed:", e),
        );
      }
    };

    // track-list arrives asynchronously after file-loaded; retry once if empty
    this.autoSelectTimers.push(setTimeout(attempt, 300));
    this.autoSelectTimers.push(setTimeout(attempt, 1000));
  }

  public async openFile(filePath: string): Promise<void> {
    await this.ensureInitialized();
    try {
      this.hasFiredEofForCurrent = false;
      this.lastLoadedPath = filePath;
      this.hwdecFallbackAttempted = false;
      this.autoSelectGeneration++;
      for (const timer of this.autoSelectTimers) clearTimeout(timer);
      this.autoSelectTimers = [];
      this.updateState({
        status: "loading",
        error: null,
        currentTime: 0,
        audioTracks: [],
        subtitleTracks: [],
        currentAudioTrackId: undefined,
        currentSubtitleTrackId: undefined,
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
      this.hasFiredEofForCurrent = false;
      this.lastLoadedPath = url;
      this.hwdecFallbackAttempted = false;
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

  public async loadSubtitle(filePath: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await command("sub-add", [filePath, "select"]);
      return true;
    } catch (err) {
      console.warn("Failed to load subtitle file:", filePath, err);
      return false;
    }
  }

  public async selectAudioTrack(trackId: number): Promise<void> {
    await this.ensureInitialized();
    await setProperty("aid", trackId);
    this.updateState({ currentAudioTrackId: trackId });
  }

  public async selectSubtitleTrack(trackId: number): Promise<void> {
    await this.ensureInitialized();
    if (!trackId || trackId <= 0) {
      try {
        await setProperty("sid", "no");
      } catch (e) {
        console.warn("Failed to set sid to no:", e);
      }
      this.updateState({ currentSubtitleTrackId: undefined });
    } else {
      try {
        await setProperty("sub-visibility", true);
      } catch {}
      try {
        await setProperty("sid", trackId);
      } catch {
        try {
          await setProperty("sid", String(trackId));
        } catch (e) {
          console.warn("Failed to set subtitle track:", e);
        }
      }
      this.updateState({ currentSubtitleTrackId: trackId });
    }
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
