import { Check, Eye, Palette, Play, RotateCcw } from "lucide-react";
import { ACCENT_PRESETS } from "../../stores/themeStore";
import type { ThemeSettings } from "../../stores/themeStore";
import { SimpleModeCallout } from "./shared";
import type { SettingsMode } from "./types";

interface AppearanceSettingsProps {
  accentColor: string;
  accentGlow: string;
  accentText: string;
  glassStyle: ThemeSettings["glassStyle"];
  scrubberGlow: boolean;
  scrubberHeight: ThemeSettings["scrubberHeight"];
  themeSubColor: string;
  themeSubSize: number;
  accentId: string;
  setAccentPreset: (presetId: string) => Promise<void>;
  customHex: string;
  setCustomHex: (hex: string) => void;
  setCustomAccentColor: (hex: string) => Promise<void>;
  setGlassStyle: (style: ThemeSettings["glassStyle"]) => Promise<void>;
  setScrubberGlow: (enabled: boolean) => Promise<void>;
  setScrubberHeight: (height: ThemeSettings["scrubberHeight"]) => Promise<void>;
  setThemeSubColor: (color: string) => Promise<void>;
  setThemeSubSize: (size: number) => Promise<void>;
  resetTheme: () => Promise<void>;
  settingsMode: SettingsMode;
  handleModeChange: (mode: SettingsMode) => void;
}

export function AppearanceSettings({
  accentColor,
  accentGlow,
  accentText,
  glassStyle,
  scrubberGlow,
  scrubberHeight,
  themeSubColor,
  themeSubSize,
  accentId,
  setAccentPreset,
  customHex,
  setCustomHex,
  setCustomAccentColor,
  setGlassStyle,
  setScrubberGlow,
  setScrubberHeight,
  setThemeSubColor,
  setThemeSubSize,
  resetTheme,
  settingsMode,
  handleModeChange,
}: AppearanceSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Live Interactive Preview Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-white">
            <Eye className="w-3.5 h-3.5" style={{ color: accentColor }} />
            Live Interactive Preview
          </span>
          <span
            style={{ backgroundColor: accentColor, color: accentText }}
            className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase"
          >
            {glassStyle} • {scrubberHeight}
          </span>
        </div>

        {/* Mini Mockup Window */}
        <div
          style={{
            boxShadow: `0 8px 30px ${accentGlow}`,
          }}
          className="relative rounded-xl overflow-hidden border border-white/10 bg-neutral-950 p-3 flex flex-col justify-between h-40 select-none"
        >
          {/* Mock Top bar */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-white font-medium">
              <span
                style={{ backgroundColor: accentColor }}
                className="w-2 h-2 rounded-full inline-block"
              />
              <span className="truncate max-w-[200px]">Cyberpunk: Edgerunners - S01E04</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">1080p • 60fps</span>
          </div>

          {/* Mock Subtitle Center Display */}
          <div className="text-center py-2 px-4">
            <span
              style={{
                color: themeSubColor,
                fontSize: `${Math.round(themeSubSize * 0.28)}px`,
                textShadow: "0 2px 4px rgba(0,0,0,0.9)",
              }}
              className="font-bold tracking-wide"
            >
              &ldquo;I&apos;m going to take you to the moon.&rdquo;
            </span>
          </div>

          {/* Mock Mini Player Bottom Bar */}
          <div
            style={{
              backgroundColor: glassStyle === "oled" ? "#000000" : "rgba(20,20,25,0.85)",
              backdropFilter: glassStyle === "aero" ? "blur(20px)" : "blur(10px)",
            }}
            className="rounded-lg p-2 border border-white/10 flex flex-col gap-1.5"
          >
            {/* Mini Scrubber */}
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                style={{
                  width: "48%",
                  backgroundColor: accentColor,
                  boxShadow: scrubberGlow ? `0 0 10px ${accentGlow}` : "none",
                }}
                className="h-full rounded-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  style={{
                    backgroundColor: accentColor,
                    color: accentText,
                    boxShadow: `0 2px 10px ${accentGlow}`,
                  }}
                  className="w-6 h-6 rounded-full flex items-center justify-center font-bold"
                >
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                <span className="text-[10px] font-mono text-neutral-300">11:42 / 24:18</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  style={{
                    backgroundColor: `${accentGlow}`,
                    color: accentColor,
                    borderColor: accentColor,
                  }}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold"
                >
                  1.00x
                </span>
                <span
                  style={{ backgroundColor: accentColor, color: accentText }}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                >
                  SUBS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Color Accents */}
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Accent Color
          </h4>
          <p className="text-xs text-neutral-400">
            Personalize controls, progress bars, active indicators, and aura glows
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {ACCENT_PRESETS.map((preset) => {
            const isSelected = accentId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setAccentPreset(preset.id)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left group ${
                  isSelected
                    ? "bg-white/10 border-white/40 shadow-lg scale-[1.02]"
                    : "bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/15"
                }`}
              >
                <div
                  style={{
                    backgroundColor: preset.color,
                    boxShadow: isSelected ? `0 0 12px ${preset.glow}` : "none",
                  }}
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-black/20"
                >
                  {isSelected && <Check className="w-3.5 h-3.5" style={{ color: preset.text }} />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{preset.name}</div>
                  <div className="text-[10px] font-mono text-neutral-400 uppercase">{preset.color}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Advanced Color Tuning & Precision Controls (Advanced Mode Only) */}
        {settingsMode === "advanced" && (
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Custom Color & Precision Calibration</span>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
                ADVANCED
              </span>
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => {
                    setCustomHex(e.target.value);
                    setCustomAccentColor(e.target.value);
                  }}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  title="Choose custom color"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Custom Color Wheel</div>
                  <div className="text-[11px] text-neutral-400">Pick any custom shade or enter hex code</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => {
                    setCustomHex(e.target.value);
                    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                      setCustomAccentColor(e.target.value);
                    }
                  }}
                  placeholder="#F59E0B"
                  maxLength={7}
                  className="w-24 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs font-mono text-white text-center uppercase focus:outline-none focus:border-white/40"
                />

                {/* WCAG Accessible Text Contrast Indicator */}
                <div
                  style={{ backgroundColor: accentColor, color: accentText }}
                  className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg font-mono flex items-center gap-1.5 shadow border border-black/20"
                  title="Computed high-contrast readable text (WCAG AAA/AA compliant)"
                >
                  <Check className="w-3 h-3" />
                  <span>{accentText === "#0a0a0a" ? "DARK TEXT" : "LIGHT TEXT"}</span>
                </div>

                {/* Focus indicator test preview */}
                <div
                  style={{
                    outline: `2px solid ${accentColor}`,
                    outlineOffset: "2px",
                    boxShadow: `0 0 0 2px #0a0a0a, 0 0 10px ${accentGlow}`,
                  }}
                  className="text-[10px] font-semibold px-2 py-1 rounded bg-neutral-800 text-neutral-300 font-mono hidden sm:inline-block"
                  title="Focus Ring Indicator preview"
                >
                  Focus Ring
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simple Mode Switch Callout */}
        {settingsMode === "simple" && (
          <SimpleModeCallout
            icon={<Palette className="w-4 h-4 text-neutral-400" />}
            text="Looking for custom 6-digit HEX codes, contrast accessibility, or timeline glow?"
            accentColor={accentColor}
            handleModeChange={handleModeChange}
          />
        )}
      </div>

      {/* Section 2: Window Backdrop & Glass Style */}
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Surface & Glassmorphism
          </h4>
          <p className="text-xs text-neutral-400">
            Choose the backdrop transparency and blur aesthetics for the player
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: "frosted", title: "Frosted Glass", desc: "Modern balanced blur" },
            { id: "oled", title: "Deep OLED", desc: "True blacks & no blur" },
            { id: "aero", title: "Aero Glass", desc: "Ultra glassy translucent" },
            { id: "solid", title: "Solid Matte", desc: "100% opaque contrast" },
          ].map((item) => {
            const isSelected = glassStyle === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setGlassStyle(item.id as any)}
                style={{
                  borderColor: isSelected ? accentColor : undefined,
                  backgroundColor: isSelected ? `${accentGlow}` : undefined,
                }}
                className={`p-3 rounded-xl border text-left transition ${
                  isSelected
                    ? "border-white/40 text-white font-bold"
                    : "bg-white/[0.03] border-white/5 text-neutral-300 hover:bg-white/[0.07]"
                }`}
              >
                <div className="text-xs font-semibold">{item.title}</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Scrubber Styling (Advanced Mode Only) */}
      {settingsMode === "advanced" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Progress Scrubber & Neon Aura
              </h4>
              <p className="text-xs text-neutral-400">
                Fine-tune the scrubber thickness and neon glow
              </p>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
              ADVANCED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Thickness */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="text-xs font-medium text-neutral-200">Scrubber Thickness</div>
              <div className="flex gap-2">
                {[
                  { id: "slim", label: "Slim" },
                  { id: "medium", label: "Standard" },
                  { id: "bold", label: "Chunky Bold" },
                ].map((thick) => (
                  <button
                    key={thick.id}
                    onClick={() => setScrubberHeight(thick.id as any)}
                    style={{
                      backgroundColor: scrubberHeight === thick.id ? accentColor : undefined,
                      color: scrubberHeight === thick.id ? accentText : undefined,
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                      scrubberHeight === thick.id
                        ? "font-bold shadow"
                        : "bg-white/5 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    {thick.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Glow */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-neutral-200">Progress Neon Glow</div>
                <div className="text-[11px] text-neutral-500">Radiant aura along the playback line</div>
              </div>
              <input
                type="checkbox"
                checked={scrubberGlow}
                onChange={(e) => setScrubberGlow(e.target.checked)}
                style={{ accentColor: accentColor }}
                className="w-4 h-4 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Subtitles Styling */}
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Subtitles Appearance
          </h4>
          <p className="text-xs text-neutral-400">
            Configure real-time subtitle typography and font color
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Font Color */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
            <div className="text-xs font-medium text-neutral-200">Subtitle Color</div>
            <div className="flex gap-2">
              {[
                { color: "#ffffff", label: "White" },
                { color: "#fcd34d", label: "Gold" },
                { color: "#67e8f9", label: "Cyan" },
                { color: "#ffff00", label: "Yellow" },
              ].map((c) => (
                <button
                  key={c.color}
                  onClick={() => setThemeSubColor(c.color)}
                  style={{
                    borderColor: themeSubColor.toLowerCase() === c.color.toLowerCase() ? accentColor : "transparent",
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                    themeSubColor.toLowerCase() === c.color.toLowerCase()
                      ? "bg-white/15 text-white"
                      : "bg-white/5 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <span
                    style={{ backgroundColor: c.color }}
                    className="w-2.5 h-2.5 rounded-full inline-block border border-black/40"
                  />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-200">
              <span>Subtitle Font Size</span>
              <span className="font-mono text-neutral-400">{themeSubSize} pt</span>
            </div>
            <div className="flex gap-2">
              {[
                { size: 45, label: "Small" },
                { size: 55, label: "Medium" },
                { size: 65, label: "Large" },
                { size: 75, label: "Cinematic" },
              ].map((s) => (
                <button
                  key={s.size}
                  onClick={() => setThemeSubSize(s.size)}
                  style={{
                    backgroundColor: themeSubSize === s.size ? accentColor : undefined,
                    color: themeSubSize === s.size ? accentText : undefined,
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                    themeSubSize === s.size
                      ? "font-bold shadow"
                      : "bg-white/5 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Reset Theme */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={resetTheme}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-medium transition active:scale-95 border border-white/10"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Theme to Defaults</span>
        </button>
      </div>
    </div>
  );
}
