import { Music2, Plus, Subtitles } from "lucide-react";
import type { TrackInfo } from "../../services/player/types";

interface AudioSubtitleSettingsProps {
  accentColor: string;
  accentGlow: string;
  audioNormalize: boolean;
  handleToggleAudioNormalize: () => Promise<void>;
  audioDelay: number;
  handleAudioDelayChange: (ms: number) => Promise<void>;
  subFontSize: number;
  handleSubFontSizeChange: (size: number) => Promise<void>;
  subDelay: number;
  handleSubDelayChange: (secs: number) => Promise<void>;
  subColor: string;
  handleSubColorChange: (color: string) => Promise<void>;
  audioTracks: TrackInfo[];
  selectAudioTrack: (trackId: number) => Promise<void>;
  currentAudioTrackId?: number;
  subtitleTracks: TrackInfo[];
  selectSubtitleTrack: (trackId: number) => Promise<void>;
  currentSubtitleTrackId?: number;
  handleLoadExternalSubtitle: () => Promise<void>;
}

export function AudioSubtitleSettings({
  accentColor,
  accentGlow,
  audioNormalize,
  handleToggleAudioNormalize,
  audioDelay,
  handleAudioDelayChange,
  subFontSize,
  handleSubFontSizeChange,
  subDelay,
  handleSubDelayChange,
  subColor,
  handleSubColorChange,
  audioTracks,
  selectAudioTrack,
  currentAudioTrackId,
  subtitleTracks,
  selectSubtitleTrack,
  currentSubtitleTrackId,
  handleLoadExternalSubtitle,
}: AudioSubtitleSettingsProps) {
  return (
    <div className="space-y-5">
      {/* Audio Normalization */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">
            Loudness Normalization (EBU R128 loudnorm)
          </span>
          <p className="text-xs text-neutral-500">
            Balances dialogue and prevents excessive spikes
          </p>
        </div>
        <input
          type="checkbox"
          checked={audioNormalize}
          onChange={handleToggleAudioNormalize}
          style={{ accentColor }}
          className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>

      {/* Audio Delay */}
      <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-300 font-medium">Audio Delay (A/V Sync)</span>
          <span className="font-mono text-neutral-400">{audioDelay} ms</span>
        </div>
        <input
          type="range"
          min={-1000}
          max={1000}
          step={50}
          value={audioDelay}
          onChange={(e) => handleAudioDelayChange(Number(e.target.value))}
          style={{ accentColor }}
          className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
        />
      </div>

      {/* Subtitle font size */}
      <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-300 font-medium">Subtitle Font Size</span>
          <span className="font-mono text-neutral-400">{subFontSize} pt</span>
        </div>
        <input
          type="range"
          min={20}
          max={100}
          value={subFontSize}
          onChange={(e) => handleSubFontSizeChange(Number(e.target.value))}
          style={{ accentColor }}
          className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
        />
      </div>

      {/* Subtitle Delay */}
      <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-300 font-medium">Subtitle Delay (Sync)</span>
          <span className="font-mono text-neutral-400">{subDelay} s</span>
        </div>
        <input
          type="range"
          min={-5}
          max={5}
          step={0.1}
          value={subDelay}
          onChange={(e) => handleSubDelayChange(Number(e.target.value))}
          style={{ accentColor }}
          className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
        />
      </div>

      {/* Subtitle Color */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">Subtitle Text Color</span>
          <p className="text-xs text-neutral-500">Pick font color for rendered subtitles</p>
        </div>
        <input
          type="color"
          value={subColor}
          onChange={(e) => handleSubColorChange(e.target.value)}
          className="w-7 h-7 rounded border-none bg-transparent cursor-pointer"
        />
      </div>

      {/* Audio Streams List */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Music2 style={{ color: accentColor }} className="w-4 h-4" />
          Audio Tracks ({audioTracks.length})
        </span>
        {audioTracks.length === 0 ? (
          <p className="text-xs text-neutral-500 italic">No audio tracks detected.</p>
        ) : (
          <div className="space-y-1">
            {audioTracks.map((t) => {
              const isAudioActive = currentAudioTrackId === t.id;
              return (
              <button
                key={t.id}
                onClick={() => selectAudioTrack(t.id)}
                style={{
                  backgroundColor: isAudioActive ? accentColor : undefined,
                  borderColor: isAudioActive ? accentColor : undefined,
                  color: isAudioActive ? "var(--accent-text)" : undefined,
                  boxShadow: isAudioActive ? `0 2px 10px ${accentGlow}` : undefined,
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl border text-left text-xs transition ${
                  isAudioActive
                    ? "font-semibold shadow-sm"
                    : "bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300"
                }`}
              >
                <span>{t.title || `Audio Stream ${t.id}`}</span>
                <span className={`font-mono text-[10px] ${isAudioActive ? "opacity-70" : "text-neutral-500"}`}>{t.lang || "und"}</span>
              </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Subtitles Streams List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <Subtitles style={{ color: accentColor }} className="w-4 h-4" />
            Subtitles ({subtitleTracks.length})
          </span>
          <button
            onClick={handleLoadExternalSubtitle}
            style={{ color: accentColor }}
            className="flex items-center gap-1 text-xs hover:brightness-110 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Load .srt/.ass</span>
          </button>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => selectSubtitleTrack(0)}
            style={{
              backgroundColor:
                !currentSubtitleTrackId || currentSubtitleTrackId === 0
                  ? accentColor
                  : undefined,
              borderColor:
                !currentSubtitleTrackId || currentSubtitleTrackId === 0
                  ? accentColor
                  : undefined,
              color:
                !currentSubtitleTrackId || currentSubtitleTrackId === 0
                  ? "var(--accent-text)"
                  : undefined,
              boxShadow:
                !currentSubtitleTrackId || currentSubtitleTrackId === 0
                  ? `0 2px 10px ${accentGlow}`
                  : undefined,
            }}
            className={`w-full flex items-center justify-between p-2 rounded-xl border text-left text-xs transition ${
              !currentSubtitleTrackId || currentSubtitleTrackId === 0
                ? "font-semibold shadow-sm"
                : "bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300"
            }`}
          >
            <span>Off (None)</span>
          </button>
          {subtitleTracks.map((t) => {
            const isSubActive = currentSubtitleTrackId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => selectSubtitleTrack(t.id)}
                style={{
                  backgroundColor: isSubActive ? accentColor : undefined,
                  borderColor: isSubActive ? accentColor : undefined,
                  color: isSubActive ? "var(--accent-text)" : undefined,
                  boxShadow: isSubActive ? `0 2px 10px ${accentGlow}` : undefined,
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl border text-left text-xs transition ${
                  isSubActive
                    ? "font-semibold shadow-sm"
                    : "bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300"
                }`}
              >
                <span>{t.title || `Subtitle ${t.id}`}</span>
                <span className={`font-mono text-[10px] ${isSubActive ? "opacity-70" : "text-neutral-500"}`}>{t.lang || "und"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
