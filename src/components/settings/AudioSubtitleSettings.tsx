import { useState, useEffect } from "react";
import { Music2, Plus, Subtitles } from "lucide-react";
import type { TrackInfo } from "../../services/player/types";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { EQ_BANDS, EQ_PRESETS } from "../../services/player/audioFilter";
import { playerService } from "../../services/player/mpvPlayerService";
import { storageService } from "../../services/storage/storageService";
import { SelectDropdown, SelectDropdownOption } from "../common/SelectDropdown";

const SUB_CODEPAGE_OPTIONS: SelectDropdownOption<string>[] = [
  { value: "auto", label: "Auto Detect (Recommended)", shortLabel: "Auto", desc: "UTF-8 with automatic legacy fallback" },
  { value: "utf-8", label: "UTF-8", shortLabel: "UTF-8", desc: "Universal Unicode encoding" },
  { value: "windows-1256", label: "Arabic (Windows-1256)", shortLabel: "Arabic (1256)", desc: "Legacy Arabic .srt files" },
  { value: "windows-1252", label: "Western European (Windows-1252)", shortLabel: "Western (1252)", desc: "Legacy English/French/Spanish .srt" },
  { value: "windows-1251", label: "Cyrillic (Windows-1251)", shortLabel: "Cyrillic (1251)", desc: "Legacy Russian/Slavic .srt" },
  { value: "shift_jis", label: "Japanese (Shift-JIS)", shortLabel: "Shift-JIS", desc: "Legacy Japanese .srt" },
  { value: "gbk", label: "Chinese (GBK)", shortLabel: "GBK", desc: "Legacy Simplified Chinese .srt" },
  { value: "euc-kr", label: "Korean (EUC-KR)", shortLabel: "EUC-KR", desc: "Legacy Korean .srt" },
];

const SUB_FONT_OPTIONS: SelectDropdownOption<string>[] = [
  { value: "Segoe UI", label: "Segoe UI", shortLabel: "Segoe UI", desc: "Clean modern Windows typography" },
  { value: "Inter", label: "Inter", shortLabel: "Inter", desc: "Popular neutral grotesque" },
  { value: "Trebuchet MS", label: "Trebuchet MS", shortLabel: "Trebuchet MS", desc: "Cinema classic legibility" },
  { value: "Arial", label: "Arial", shortLabel: "Arial", desc: "Standard sans-serif" },
  { value: "Roboto", label: "Roboto", shortLabel: "Roboto", desc: "Material geometric" },
  { value: "Georgia", label: "Georgia", shortLabel: "Georgia", desc: "Warm editorial serif" },
  { value: "Consolas", label: "Consolas", shortLabel: "Consolas", desc: "Tabular monospace" },
];

const SUB_BG_OPTIONS: SelectDropdownOption<"outline" | "box" | "none">[] = [
  { value: "outline", label: "Outline & Drop Shadow", shortLabel: "Outline & Shadow", desc: "Hairline stroke with shadow (Default)" },
  { value: "box", label: "High-Contrast Bounding Box", shortLabel: "Translucent Box", desc: "Dark background plate behind text" },
  { value: "none", label: "Plain Text Only", shortLabel: "None", desc: "Raw characters without borders" },
];

interface AudioSubtitleSettingsProps {
  accentColor: string;
  accentGlow: string;
  audioNormalize: boolean;
  handleToggleAudioNormalize: () => Promise<void>;
  isNightListening?: boolean;
  handleToggleNightListening?: () => Promise<void>;
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
  isNightListening = false,
  handleToggleNightListening,
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
  const {
    subFont,
    subBold,
    subItalic,
    subBgStyle,
    subMarginY,
    setSubFont,
    setSubBold,
    setSubItalic,
    setSubBgStyle,
    setSubMarginY,
  } = useThemeStore();
  const eqPreset = usePlayerStore((s) => s.eqPreset);
  const eqGains = usePlayerStore((s) => s.eqGains);
  const setEqualizer = usePlayerStore((s) => s.setEqualizer);
  const volumeBoostEnabled = usePlayerStore((s) => s.volumeBoostEnabled);
  const toggleVolumeBoost = usePlayerStore((s) => s.toggleVolumeBoost);
  const [subCodepage, setSubCodepage] = useState("auto");

  useEffect(() => {
    storageService.getPreference<string>("subCodepage").then((cp) => {
      if (cp) {
        setSubCodepage(cp);
        void playerService.setMpvProperty("sub-codepage", cp);
      }
    });
  }, []);
  return (
    <div className="space-y-5">
      {/* Night Mode / Dynamic Audio Normalizer */}
      {handleToggleNightListening && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-200 text-xs">
                Night Mode (Dynamic Audio Normalization)
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Key: N
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Boosts quiet dialogue and dampens loud explosions to prevent volume-riding at night
            </p>
          </div>
          <input
            type="checkbox"
            checked={isNightListening}
            onChange={() => handleToggleNightListening()}
            style={{ accentColor }}
            className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
        </div>
      )}

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

      {/* Subtitle Font Family */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">Subtitle Typography</span>
          <p className="text-xs text-neutral-500">Font typeface rendered on screen</p>
        </div>
        <SelectDropdown<string>
          value={subFont || "Segoe UI"}
          onChange={async (font) => {
            await setSubFont(font);
          }}
          options={SUB_FONT_OPTIONS}
          menuHeader="Subtitle Font"
          width="w-64"
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

      {/* Subtitle Contrast Style */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">Subtitle Contrast Style</span>
          <p className="text-xs text-neutral-500">Outline & shadow or translucent bounding box</p>
        </div>
        <SelectDropdown<"outline" | "box" | "none">
          value={subBgStyle || "outline"}
          onChange={async (style) => {
            await setSubBgStyle(style);
          }}
          options={SUB_BG_OPTIONS}
          menuHeader="Contrast Style"
          width="w-64"
        />
      </div>

      {/* Subtitle Vertical Position / Distance from Bottom */}
      <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-300 font-medium">Vertical Margin (Distance from bottom)</span>
          <span className="font-mono text-neutral-400">{subMarginY ?? 65} px</span>
        </div>
        <input
          type="range"
          min={15}
          max={140}
          value={subMarginY ?? 65}
          onChange={(e) => setSubMarginY(Number(e.target.value))}
          style={{ accentColor }}
          className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
        />
      </div>

      {/* Subtitle Weight toggles */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="text-xs font-medium text-neutral-200">Bold Font</span>
          <input
            type="checkbox"
            checked={Boolean(subBold)}
            onChange={(e) => setSubBold(e.target.checked)}
            style={{ accentColor }}
            className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="text-xs font-medium text-neutral-200">Italicize</span>
          <input
            type="checkbox"
            checked={Boolean(subItalic)}
            onChange={(e) => setSubItalic(e.target.checked)}
            style={{ accentColor }}
            className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
        </div>
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

      {/* Subtitle Character Encoding */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">
            Subtitle Encoding (Codepage)
          </span>
          <p className="text-xs text-neutral-500">
            Fix garbled characters in non-UTF-8 external .srt subtitle files
          </p>
        </div>
        <SelectDropdown<string>
          value={subCodepage}
          onChange={async (val) => {
            setSubCodepage(val);
            await storageService.setPreference("subCodepage", val);
            await playerService.setMpvProperty("sub-codepage", val);
          }}
          options={SUB_CODEPAGE_OPTIONS}
          menuHeader="Subtitle Character Encoding"
          width="w-60"
        />
      </div>

      {/* Volume Boost & 10-Band Audio Equalizer */}
      <div className="space-y-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-neutral-200 text-xs">
              Volume Boost (150% Software Amplification)
            </span>
            <p className="text-xs text-neutral-500">
              Amplifies quiet laptop speakers beyond 100%
            </p>
          </div>
          <input
            type="checkbox"
            checked={volumeBoostEnabled}
            onChange={() => void toggleVolumeBoost()}
            style={{ accentColor }}
            className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
        </div>

        <div className="border-t border-white/10 pt-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-neutral-200 text-xs">
              10-Band Audio Equalizer
            </span>
            <div className="flex flex-wrap gap-1">
              {EQ_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => void setEqualizer(p.id)}
                  style={eqPreset === p.id ? { backgroundColor: accentColor, color: "var(--accent-text)" } : undefined}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                    eqPreset === p.id
                      ? "shadow-xs"
                      : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-1">
            {EQ_BANDS.map((freq, idx) => {
              const gain = eqGains[idx] ?? 0;
              const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
              return (
                <div key={freq} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-mono text-neutral-400">
                    {gain > 0 ? `+${gain}` : gain}dB
                  </span>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={gain}
                    onChange={(e) => {
                      const next = [...eqGains];
                      next[idx] = Number(e.target.value);
                      void setEqualizer("custom", next);
                    }}
                    style={{ accentColor }}
                    className="w-full h-1.5 bg-white/15 rounded-lg cursor-pointer"
                    title={`${label} Hz: ${gain} dB`}
                  />
                  <span className="text-[9px] font-mono text-neutral-500">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
