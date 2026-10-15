export type PlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "stopped"
  | "error";

export interface TrackInfo {
  id: number;
  type: "audio" | "sub" | "video";
  title?: string;
  lang?: string;
  codec?: string;
  selected: boolean;
  external?: boolean;
}

export interface MediaMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration: number;
  width?: number;
  height?: number;
  filePath?: string;
}

export interface PlayerState {
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  volume: number; // 0 - 100
  muted: boolean;
  playbackRate: number; // e.g. 1.0, 1.25, 1.5
  audioTracks: TrackInfo[];
  subtitleTracks: TrackInfo[];
  currentAudioTrackId?: number;
  currentSubtitleTrackId?: number;
  mediaMetadata: MediaMetadata | null;
  error: PlayerError | null;
  isInitialized: boolean;
}

export type PlayerErrorCode =
  | "INITIALIZATION_FAILED"
  | "FILE_NOT_FOUND"
  | "CODEC_UNSUPPORTED"
  | "PLAYBACK_ERROR"
  | "NETWORK_ERROR"
  | "NATIVE_CRASH"
  | "ALREADY_INITIALIZED"
  | "NOT_INITIALIZED"
  | "UNKNOWN";

export interface PlayerError {
  code: PlayerErrorCode;
  message: string;
  details?: unknown;
}

export interface MediaPlayerService {
  initialize(): Promise<void>;
  openFile(filePath: string): Promise<void>;
  openStream(url: string): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  togglePlayback(): Promise<void>;
  stop(): Promise<void>;
  seek(seconds: number): Promise<void>;
  setVolume(value: number): Promise<void>;
  setMuted(muted: boolean): Promise<void>;
  setPlaybackRate(rate: number): Promise<void>;
  loadSubtitle(filePath: string): Promise<boolean>;
  selectAudioTrack(trackId: number): Promise<void>;
  selectSubtitleTrack(trackId: number): Promise<void>;
  getPlayerState(): PlayerState;
  subscribe(listener: (state: PlayerState) => void): () => void;
  dispose(): Promise<void>;
}
