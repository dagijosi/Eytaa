import { useState } from "react";
import {
  Check,
  Eye,
  Play,
  RotateCcw,
  Sparkles,
  Type,
  Layout,
  Download,
  Upload,
  Bookmark,
  Trash2,
  Layers,
  Palette,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  useThemeStore,
  ACCENT_PRESETS,
  COMPLETE_THEME_PRESETS,
} from "../../stores/themeStore";

interface AppearanceSettingsProps {
  [key: string]: any;
}

type AppearanceSubTab = "themes" | "surface" | "controls" | "subtitles";

const WINDOWS_FONTS = [
  { id: "Segoe UI", name: "Segoe UI", family: "'Segoe UI', sans-serif", note: "Windows Default" },
  { id: "Arial", name: "Arial", family: "Arial, sans-serif", note: "Clean Standard" },
  { id: "Trebuchet MS", name: "Trebuchet MS", family: "'Trebuchet MS', sans-serif", note: "Humanist" },
  { id: "Georgia", name: "Georgia", family: "Georgia, serif", note: "Cinematic Serif" },
  { id: "Tahoma", name: "Tahoma", family: "Tahoma, sans-serif", note: "Ultra Legible" },
  { id: "Verdana", name: "Verdana", family: "Verdana, sans-serif", note: "Wide Geometry" },
  { id: "Impact", name: "Impact", family: "Impact, sans-serif", note: "Bold Cinema" },
  { id: "Consolas", name: "Consolas", family: "Consolas, monospace", note: "Sci-Fi Mono" },
];

const POPULAR_SUBTITLE_COLORS = [
  { color: "#ffffff", label: "Pure White" },
  { color: "#fef08a", label: "Golden Yellow" },
  { color: "#ffff00", label: "Vivid Yellow" },
  { color: "#67e8f9", label: "Cyber Cyan" },
  { color: "#34d399", label: "Neon Mint" },
  { color: "#fbcfe8", label: "Rose Quartz" },
  { color: "#e2e8f0", label: "Soft Slate" },
  { color: "#fb923c", label: "Warm Amber" },
];

export function AppearanceSettings(_props?: AppearanceSettingsProps) {
  const {
    accentId,
    accentColor,
    accentGlow,
    accentText,
    glassStyle,
    glassOpacity,
    glassBlur,
    glassBorder,
    controlBarStyle,
    uiRounded,
    scrubberGlow,
    scrubberGlowIntensity,
    scrubberHeight,
    showChapterMarkers,
    subFont,
    subSize,
    subColor,
    subBold,
    subItalic,
    subBgStyle,
    subBorderSize,
    subBorderColor,
    subMarginY,
    customThemes,
    applyThemePreset,
    setAccentPreset,
    setCustomAccentColor,
    setGlassStyle,
    setGlassOpacity,
    setGlassBlur,
    setGlassBorder,
    setControlBarStyle,
    setUiRounded,
    setScrubberGlow,
    setScrubberGlowIntensity,
    setScrubberHeight,
    setShowChapterMarkers,
    setSubColor,
    setSubSize,
    setSubFont,
    setSubBold,
    setSubItalic,
    setSubBgStyle,
    setSubBorderSize,
    setSubBorderColor,
    setSubMarginY,
    saveCustomTheme,
    deleteCustomTheme,
    applyCustomTheme,
    exportThemeJson,
    importThemeJson,
    resetTheme,
  } = useThemeStore();

  const [activeSubTab, setActiveSubTab] = useState<AppearanceSubTab>("themes");
  const [previewFocus, setPreviewFocus] = useState<"both" | "subtitles" | "controls">("both");
  const [customAccentHex, setCustomAccentHex] = useState(accentColor);
  const [customSubHex, setCustomSubHex] = useState(subColor);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [isImportingTheme, setIsImportingTheme] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExport = async () => {
    try {
      const jsonStr = exportThemeJson();
      await navigator.clipboard.writeText(jsonStr);
      showToast("Theme copied to clipboard as JSON!");
    } catch {
      showToast("Theme exported.");
    }
  };

  const handleSaveTheme = async () => {
    if (!newThemeName.trim()) return;
    await saveCustomTheme(newThemeName.trim());
    setNewThemeName("");
    setIsSavingTheme(false);
    showToast("Custom theme saved successfully!");
  };

  const handleImportSubmit = async () => {
    if (!importJsonText.trim()) return;
    const success = await importThemeJson(importJsonText.trim());
    if (success) {
      setIsImportingTheme(false);
      setImportJsonText("");
      showToast("Theme imported and applied!");
    } else {
      showToast("Invalid theme JSON format.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{ backgroundColor: accentColor, color: accentText }}
          className="p-2.5 px-4 rounded-xl shadow-xl text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="opacity-80 hover:opacity-100 ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live Interactive Sandbox Preview */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 shadow-xl space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-white">
            <Eye className="w-3.5 h-3.5" style={{ color: accentColor }} />
            Interactive Live Sandbox
          </span>

          {/* Quick Focus Toggle */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 text-[10px] font-medium">
            <button
              onClick={() => setPreviewFocus("both")}
              className={`px-2 py-0.5 rounded transition ${
                previewFocus === "both"
                  ? "bg-white/20 text-white font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Full Player
            </button>
            <button
              onClick={() => setPreviewFocus("subtitles")}
              className={`px-2 py-0.5 rounded transition ${
                previewFocus === "subtitles"
                  ? "bg-white/20 text-white font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Subtitles Focus
            </button>
            <button
              onClick={() => setPreviewFocus("controls")}
              className={`px-2 py-0.5 rounded transition ${
                previewFocus === "controls"
                  ? "bg-white/20 text-white font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Controls Focus
            </button>
          </div>
        </div>

        {/* Mini Player Mockup Screen */}
        <div
          style={{
            boxShadow: `0 8px 32px ${accentGlow}`,
            borderRadius:
              uiRounded === "sharp" ? "4px" : uiRounded === "pill" ? "20px" : "12px",
          }}
          className={`relative overflow-hidden border border-white/10 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-3 flex flex-col justify-between select-none transition-all duration-300 ${
            previewFocus === "subtitles" ? "h-40" : previewFocus === "controls" ? "h-36" : "h-48"
          }`}
        >
          {/* Top Bar Mockup */}
          {previewFocus !== "controls" && (
            <div className="flex items-center justify-between text-[11px] z-10">
              <div className="flex items-center gap-1.5 text-white font-medium">
                <span
                  style={{ backgroundColor: accentColor }}
                  className="w-2 h-2 rounded-full inline-block"
                />
                <span className="truncate max-w-[220px]">Cyberpunk: Edgerunners — Episode 04</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">1080p • 60fps</span>
            </div>
          )}

          {/* Subtitles Center Display */}
          {previewFocus !== "controls" && (
            <div
              className="text-center px-4 z-10 transition-all duration-200"
              style={{
                marginBottom: `${Math.round((subMarginY - 20) * 0.12)}px`,
              }}
            >
              <span
                style={{
                  color: subColor,
                  fontFamily: subFont,
                  fontSize: `${Math.round(subSize * 0.26)}px`,
                  fontWeight: subBold ? 700 : 400,
                  fontStyle: subItalic ? "italic" : "normal",
                  backgroundColor:
                    subBgStyle === "box" ? "rgba(0,0,0,0.85)" : "transparent",
                  padding: subBgStyle === "box" ? "3px 10px" : "0px",
                  borderRadius: subBgStyle === "box" ? "6px" : "0px",
                  textShadow:
                    subBgStyle === "outline"
                      ? `-1px -1px 0 ${subBorderColor}, 1px -1px 0 ${subBorderColor}, -1px 1px 0 ${subBorderColor}, 1px 1px 0 ${subBorderColor}, 0 2px 4px rgba(0,0,0,0.9)`
                      : subBgStyle === "none"
                      ? "0 2px 6px rgba(0,0,0,0.9)"
                      : "none",
                }}
                className="tracking-wide inline-block max-w-[92%]"
              >
                &ldquo;I&apos;m going to take you to the moon.&rdquo;
              </span>
            </div>
          )}

          {/* Controls Bar Mockup */}
          {previewFocus !== "subtitles" && (
            <div
              style={{
                backgroundColor:
                  glassStyle === "oled"
                    ? "#000000"
                    : `rgba(18,18,24,${glassOpacity ?? 0.85})`,
                backdropFilter: `blur(${glassBlur ?? 16}px)`,
                borderRadius:
                  controlBarStyle === "dock"
                    ? "0px"
                    : uiRounded === "sharp"
                    ? "2px"
                    : uiRounded === "pill"
                    ? "9999px"
                    : "10px",
                borderColor:
                  glassBorder === "glow" ? accentColor : "rgba(255,255,255,0.12)",
                boxShadow:
                  glassBorder === "glow" ? `0 0 14px ${accentGlow}` : "none",
              }}
              className={`p-2 border flex flex-col gap-1.5 transition-all duration-300 z-10 ${
                controlBarStyle === "dock"
                  ? "-mx-3 -mb-3 rounded-none border-x-0 border-b-0"
                  : controlBarStyle === "minimal"
                  ? "py-1.5 mx-2"
                  : ""
              }`}
            >
              {/* Mini Scrubber Track */}
              <div
                className={`w-full bg-white/20 rounded-full overflow-hidden relative ${
                  scrubberHeight === "slim"
                    ? "h-0.5"
                    : scrubberHeight === "bold"
                    ? "h-2"
                    : scrubberHeight === "chunky"
                    ? "h-3"
                    : "h-1"
                }`}
              >
                {showChapterMarkers && (
                  <>
                    <div className="absolute left-[30%] top-0 bottom-0 w-0.5 bg-black/60 z-10" />
                    <div className="absolute left-[65%] top-0 bottom-0 w-0.5 bg-black/60 z-10" />
                  </>
                )}
                <div
                  style={{
                    width: "48%",
                    backgroundColor: accentColor,
                    boxShadow: scrubberGlow
                      ? `0 0 ${Math.round(14 * (scrubberGlowIntensity ?? 0.6))}px ${accentGlow}`
                      : "none",
                  }}
                  className="h-full rounded-full transition-all"
                />
              </div>

              {/* Mini Buttons Ribbon */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      backgroundColor: accentColor,
                      color: accentText,
                      boxShadow: `0 2px 10px ${accentGlow}`,
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center font-bold"
                  >
                    <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-300">11:42 / 24:18</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      backgroundColor: accentColor,
                      color: accentText,
                      borderColor: accentColor,
                      boxShadow: `0 2px 8px ${accentGlow}`,
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
          )}
        </div>
      </div>

      {/* Segmented Section Navigator (Tab Pills) */}
      <div className="flex items-center p-1 bg-white/[0.04] border border-white/10 rounded-xl gap-1">
        {[
          { id: "themes", label: "Themes & Colors", icon: <Palette className="w-3.5 h-3.5" /> },
          { id: "surface", label: "Surface & Glass", icon: <Layers className="w-3.5 h-3.5" /> },
          { id: "controls", label: "Player Controls", icon: <Layout className="w-3.5 h-3.5" /> },
          { id: "subtitles", label: "Subtitles Typography", icon: <Type className="w-3.5 h-3.5" /> },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as AppearanceSubTab)}
              style={
                isActive
                  ? {
                      backgroundColor: accentColor,
                      color: accentText,
                      boxShadow: `0 2px 8px ${accentGlow}`,
                    }
                  : undefined
              }
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? "font-bold shadow"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Themes & Colors */}
      {activeSubTab === "themes" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Section 1A: Primary Accent Color */}
          <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <Palette className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span>Primary Accent Color</span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Applies to playback controls, buttons, scrubber progress line, and active state indicators
              </p>
            </div>

            {/* Active Theme Skin Sync Banner */}
            {(() => {
              const activeSkin = COMPLETE_THEME_PRESETS.find((p) => p.id === accentId);
              if (!activeSkin) return null;
              return (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-sm"
                      style={{ backgroundColor: activeSkin.accentColor }}
                    />
                    <span className="text-neutral-300">
                      Accent synced from skin: <strong className="text-white font-semibold">{activeSkin.name}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    Click any swatch below to customize independently
                  </span>
                </div>
              );
            })()}

            {/* Accent Presets Swatches */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ACCENT_PRESETS.map((preset) => {
                const isSelected = accentId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setAccentPreset(preset.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition text-left cursor-pointer ${
                      isSelected
                        ? "bg-white/10 border-white/40 shadow-lg scale-[1.02]"
                        : "bg-white/[0.03] border-white/5 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div
                      style={{
                        backgroundColor: preset.color,
                        boxShadow: isSelected ? `0 0 10px ${preset.glow}` : "none",
                      }}
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-black/20"
                    >
                      {isSelected && <Check className="w-3 h-3" style={{ color: preset.text }} />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{preset.name}</div>
                      <div className="text-[9px] font-mono text-neutral-400 uppercase">
                        {preset.color}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Accent Color Wheel & Hex */}
            <div className="p-3 rounded-xl bg-black/30 border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => {
                    setCustomAccentHex(e.target.value);
                    setCustomAccentColor(e.target.value);
                  }}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  title="Pick custom accent color"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Custom Accent Wheel</div>
                  <div className="text-[11px] text-neutral-400">Dial in any color on the spectrum</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customAccentHex}
                  onChange={(e) => {
                    setCustomAccentHex(e.target.value);
                    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                      setCustomAccentColor(e.target.value);
                    }
                  }}
                  placeholder="#F59E0B"
                  maxLength={7}
                  className="w-24 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white text-center uppercase focus:outline-none focus:border-white/40"
                />
                <div
                  style={{ backgroundColor: accentColor, color: accentText }}
                  className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg font-mono flex items-center gap-1 shadow border border-black/20"
                >
                  <Check className="w-3 h-3" />
                  <span>{accentText === "#0a0a0a" ? "DARK TEXT" : "LIGHT TEXT"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1B: Complete Aesthetic Themes */}
          <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span>Curated Design Skins</span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Handcrafted modern looks that re-style surfaces, control layout, glassmorphism, and subtitles together
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {COMPLETE_THEME_PRESETS.map((preset) => {
                const isSelected = accentId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyThemePreset(preset.id)}
                    className={`flex flex-col p-3 rounded-xl border text-left transition cursor-pointer group ${
                      isSelected
                        ? "bg-white/10 border-white/40 shadow-xl scale-[1.01]"
                        : "bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          style={{ backgroundColor: preset.accentColor }}
                          className="w-4 h-4 rounded-full border border-black/30 shadow-sm"
                        />
                        <span className="text-[10px] font-mono text-neutral-400 uppercase">
                          {preset.glassStyle} • {preset.uiRounded}
                        </span>
                      </div>
                      {isSelected ? (
                        <span
                          style={{ backgroundColor: preset.accentColor, color: preset.accentText }}
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1"
                        >
                          <Check className="w-2.5 h-2.5" /> ACTIVE
                        </span>
                      ) : null}
                    </div>

                    <div className="text-xs font-bold text-white group-hover:text-neutral-100">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1C: Backup, Import & Custom Presets Toolbar */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Theme Profiles & Backup
                </h4>
                <p className="text-xs text-neutral-400">
                  Save your current style as a personal preset, or share via JSON
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSavingTheme(true)}
                  style={{ backgroundColor: accentColor, color: accentText }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow hover:brightness-110 cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save Look</span>
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 text-xs font-semibold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={() => setIsImportingTheme(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 text-xs font-semibold transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import JSON</span>
                </button>
              </div>
            </div>

            {/* Save Theme Modal */}
            {isSavingTheme && (
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/15 space-y-2 animate-in fade-in duration-150">
                <div className="text-xs font-bold text-white">Name Your Custom Theme</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    placeholder="e.g. My Midnight Cinema"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-white/40"
                  />
                  <button
                    onClick={handleSaveTheme}
                    style={{ backgroundColor: accentColor, color: accentText }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold shadow"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsSavingTheme(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-neutral-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Import Theme Modal */}
            {isImportingTheme && (
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/15 space-y-2 animate-in fade-in duration-150">
                <div className="text-xs font-bold text-white">Paste Exported Theme JSON</div>
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="Paste theme JSON string here..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleImportSubmit}
                    style={{ backgroundColor: accentColor, color: accentText }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold shadow"
                  >
                    Apply Theme
                  </button>
                  <button
                    onClick={() => setIsImportingTheme(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-neutral-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* User Custom Saved Themes List */}
            {customThemes && customThemes.length > 0 && (
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Your Saved Presets
                </div>
                <div className="flex flex-wrap gap-2">
                  {customThemes.map((ct) => (
                    <div
                      key={ct.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs"
                    >
                      <button
                        onClick={() => applyCustomTheme(ct.id)}
                        className="font-semibold text-white hover:underline flex items-center gap-2 cursor-pointer"
                      >
                        <div
                          style={{ backgroundColor: ct.settings.accentColor || "#f59e0b" }}
                          className="w-2.5 h-2.5 rounded-full"
                        />
                        <span>{ct.name}</span>
                      </button>
                      <button
                        onClick={() => deleteCustomTheme(ct.id)}
                        className="text-neutral-500 hover:text-red-400 ml-1 p-0.5 cursor-pointer"
                        title="Delete custom preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Surface & Glassmorphism */}
      {activeSubTab === "surface" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Surface & Glassmorphism Engine
            </h4>
            <p className="text-xs text-neutral-400">
              Customize transparency, blur, and edge light across all player panels
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: "frosted", title: "Frosted Glass", desc: "Balanced modern blur" },
              { id: "oled", title: "Deep OLED", desc: "100% True black & 0 blur" },
              { id: "aero", title: "Aero Glass", desc: "Crystal translucent glow" },
              { id: "solid", title: "Solid Matte", desc: "Opaque dark contrast" },
              { id: "cyber", title: "Cyber Neon", desc: "Radiant glowing border" },
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
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? "border-white/40 text-white font-bold shadow-md"
                      : "bg-white/[0.03] border-white/5 text-neutral-300 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="text-xs font-semibold">{item.title}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">{item.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Sliders for Opacity and Blur */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Opacity */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Backdrop Opacity</span>
                  <span className="font-mono text-neutral-400">
                    {Math.round((glassOpacity ?? 0.85) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="1.0"
                  step="0.05"
                  value={glassOpacity ?? 0.85}
                  onChange={(e) => setGlassOpacity(parseFloat(e.target.value))}
                  style={{ accentColor: accentColor }}
                  className="w-full cursor-pointer"
                />
              </div>

              {/* Blur Strength */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Blur Strength</span>
                  <span className="font-mono text-neutral-400">{glassBlur ?? 16} px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="36"
                  step="2"
                  value={glassBlur ?? 16}
                  onChange={(e) => setGlassBlur(parseInt(e.target.value))}
                  style={{ accentColor: accentColor }}
                  className="w-full cursor-pointer"
                />
              </div>

              {/* Glass Border */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-300">
                  <span>Glass Border Style</span>
                  <span className="font-mono text-neutral-400 uppercase">{glassBorder}</span>
                </div>
                <div className="flex gap-1.5">
                  {(["none", "subtle", "glow"] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setGlassBorder(b)}
                      style={{
                        backgroundColor: glassBorder === b ? accentColor : undefined,
                        color: glassBorder === b ? accentText : undefined,
                      }}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                        glassBorder === b
                          ? "font-bold shadow"
                          : "bg-white/5 text-neutral-300 hover:bg-white/10"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Controls & Layout */}
      {activeSubTab === "controls" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Control Bar & Layout Personalization
            </h4>
            <p className="text-xs text-neutral-400">
              Control bar geometry, corner curvature, and scrubber thickness
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Control Bar Layout */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="text-xs font-medium text-neutral-200">Control Bar Layout</div>
              <div className="flex gap-2">
                {[
                  { id: "floating", label: "Floating Island" },
                  { id: "dock", label: "Full Edge Dock" },
                  { id: "minimal", label: "Minimalist" },
                ].map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => setControlBarStyle(layout.id as any)}
                    style={{
                      backgroundColor: controlBarStyle === layout.id ? accentColor : undefined,
                      color: controlBarStyle === layout.id ? accentText : undefined,
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      controlBarStyle === layout.id
                        ? "font-bold shadow"
                        : "bg-white/5 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    {layout.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Corner Curvature */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="text-xs font-medium text-neutral-200">Corner Curvature</div>
              <div className="flex gap-2">
                {[
                  { id: "sharp", label: "Sharp Modern" },
                  { id: "rounded", label: "Smooth Rounded" },
                  { id: "pill", label: "Full Pill" },
                ].map((round) => (
                  <button
                    key={round.id}
                    onClick={() => setUiRounded(round.id as any)}
                    style={{
                      backgroundColor: uiRounded === round.id ? accentColor : undefined,
                      color: uiRounded === round.id ? accentText : undefined,
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      uiRounded === round.id
                        ? "font-bold shadow"
                        : "bg-white/5 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    {round.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrubber Thickness & Neon Aura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="text-xs font-medium text-neutral-200">Timeline Scrubber Thickness</div>
              <div className="flex gap-2">
                {[
                  { id: "slim", label: "Slim" },
                  { id: "medium", label: "Standard" },
                  { id: "bold", label: "Bold" },
                  { id: "chunky", label: "Chunky" },
                ].map((thick) => (
                  <button
                    key={thick.id}
                    onClick={() => setScrubberHeight(thick.id as any)}
                    style={{
                      backgroundColor: scrubberHeight === thick.id ? accentColor : undefined,
                      color: scrubberHeight === thick.id ? accentText : undefined,
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-neutral-200">Progress Neon Aura</div>
                  <div className="text-[11px] text-neutral-500">Radiant aura along playback line</div>
                </div>
                <input
                  type="checkbox"
                  checked={scrubberGlow}
                  onChange={(e) => setScrubberGlow(e.target.checked)}
                  style={{ accentColor: accentColor }}
                  className="w-4 h-4 rounded cursor-pointer"
                />
              </div>
              {scrubberGlow && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-neutral-400">Intensity</span>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.1"
                    value={scrubberGlowIntensity ?? 0.6}
                    onChange={(e) => setScrubberGlowIntensity(parseFloat(e.target.value))}
                    style={{ accentColor: accentColor }}
                    className="flex-1 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Chapter Markers Toggle */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-neutral-200">Timeline Chapter Markers</div>
              <div className="text-[11px] text-neutral-500">Show chapter tick divisions along progress bar</div>
            </div>
            <input
              type="checkbox"
              checked={showChapterMarkers}
              onChange={(e) => setShowChapterMarkers(e.target.checked)}
              style={{ accentColor: accentColor }}
              className="w-4 h-4 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* TAB 4: Subtitles Typography & Deep Styling */}
      {activeSubTab === "subtitles" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Subtitles Typography & Custom Styling
            </h4>
            <p className="text-xs text-neutral-400">
              Customize font family, font color, size, stroke outlines, and screen position
            </p>
          </div>

          {/* Subtitle Compatibility Info Callout */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-blue-300 text-xs">Subtitle Format Compatibility</span>
              <p className="text-[11px] text-blue-200/80 leading-relaxed">
                Custom fonts, colors, stroke outlines, and cinema box styling apply to all text-based subtitles (SRT, WebVTT, ASS/SSA).
                Image-based subtitles (Blu-ray PGS & DVD VobSub) are pre-rendered bitmap frames encoded into the video file and do not support font replacement.
              </p>
            </div>
          </div>

          {/* 1. Custom Font Color Picker with Color Wheel & HEX */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Subtitle Font Color
                </span>
                <p className="text-[11px] text-neutral-400">
                  Pick any custom shade, type a 6-digit hex code, or click a popular color chip
                </p>
              </div>
              <span className="font-mono text-xs text-neutral-300 uppercase font-bold">
                {subColor}
              </span>
            </div>

            {/* Color Wheel + Hex input + Contrast preview */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={subColor}
                  onChange={(e) => {
                    setCustomSubHex(e.target.value);
                    setSubColor(e.target.value);
                  }}
                  className="w-9 h-9 rounded-xl cursor-pointer bg-transparent border-0 p-0 shadow"
                  title="Pick any custom subtitle color"
                />
                <div>
                  <div className="text-xs font-semibold text-white">Custom Subtitle Color Wheel</div>
                  <div className="text-[11px] text-neutral-400">Unlimited colors & shades</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customSubHex}
                  onChange={(e) => {
                    setCustomSubHex(e.target.value);
                    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                      setSubColor(e.target.value);
                    }
                  }}
                  placeholder="#FFFFFF"
                  maxLength={7}
                  className="w-24 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white text-center uppercase focus:outline-none focus:border-white/40"
                />
                <div
                  style={{ backgroundColor: subColor, color: "#000000" }}
                  className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg font-mono shadow border border-black/20 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>SAMPLE</span>
                </div>
              </div>
            </div>

            {/* Quick Palette Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {POPULAR_SUBTITLE_COLORS.map((c) => {
                const isSelected = subColor.toLowerCase() === c.color.toLowerCase();
                return (
                  <button
                    key={c.color}
                    onClick={() => {
                      setCustomSubHex(c.color);
                      setSubColor(c.color);
                    }}
                    style={{
                      borderColor: isSelected ? accentColor : "rgba(255,255,255,0.1)",
                      backgroundColor: isSelected ? `${accentGlow}` : "rgba(255,255,255,0.03)",
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${
                      isSelected ? "text-white font-bold shadow-md" : "text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <span
                      style={{ backgroundColor: c.color }}
                      className="w-4 h-4 rounded-full inline-block border border-black/50 shrink-0"
                    />
                    <span className="text-xs truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Visual Font Cards Grid */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-neutral-200">Font Family (System Verified)</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WINDOWS_FONTS.map((f) => {
                const isSelected = subFont.toLowerCase() === f.id.toLowerCase();
                return (
                  <button
                    key={f.id}
                    onClick={() => setSubFont(f.id)}
                    style={{
                      borderColor: isSelected ? accentColor : undefined,
                      backgroundColor: isSelected ? `${accentGlow}` : undefined,
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? "border-white/40 text-white font-bold shadow-md"
                        : "bg-white/[0.03] border-white/5 text-neutral-300 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div style={{ fontFamily: f.family }} className="text-sm font-semibold truncate">
                      {f.name}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{f.note}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Backdrop Style (Box vs Outline vs Drop Shadow) */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
            <div className="text-xs font-medium text-neutral-200">Subtitle Backdrop Style</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "outline", label: "Outlined Stroke", desc: "High contrast edge outline" },
                { id: "box", label: "Cinema Box", desc: "Netflix-style dark pill" },
                { id: "none", label: "Drop Shadow", desc: "Clean floating text" },
              ].map((style) => {
                const isSelected = subBgStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => setSubBgStyle(style.id as any)}
                    style={{
                      backgroundColor: isSelected ? accentColor : undefined,
                      color: isSelected ? accentText : undefined,
                    }}
                    className={`p-2.5 rounded-xl text-left transition cursor-pointer ${
                      isSelected
                        ? "font-bold shadow"
                        : "bg-white/5 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-xs font-semibold">{style.label}</div>
                    <div className={`text-[10px] mt-0.5 ${isSelected ? "opacity-80" : "text-neutral-400"}`}>
                      {style.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Font Size & Bold/Italic */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-200">
              <span>Font Size & Weight</span>
              <span className="font-mono text-neutral-400">{subSize} pt</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="35"
                max="85"
                step="2"
                value={subSize}
                onChange={(e) => setSubSize(parseInt(e.target.value))}
                style={{ accentColor: accentColor }}
                className="flex-1 cursor-pointer"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSubBold(!subBold)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    subBold
                      ? "bg-white/20 border-white/40 text-white"
                      : "bg-white/5 border-white/10 text-neutral-400"
                  }`}
                  title="Toggle Bold"
                >
                  B
                </button>
                <button
                  onClick={() => setSubItalic(!subItalic)}
                  className={`px-3 py-1.5 rounded-lg text-xs italic font-serif border transition cursor-pointer ${
                    subItalic
                      ? "bg-white/20 border-white/40 text-white"
                      : "bg-white/5 border-white/10 text-neutral-400"
                  }`}
                  title="Toggle Italic"
                >
                  I
                </button>
              </div>
            </div>
          </div>

          {/* 5. Stroke Width & Outline Color */}
          {subBgStyle === "outline" && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                Outline Stroke Calibration
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-neutral-300">
                    <span>Outline Stroke Width</span>
                    <span className="font-mono text-neutral-400">{subBorderSize ?? 3} px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="1"
                    value={subBorderSize ?? 3}
                    onChange={(e) => setSubBorderSize(parseInt(e.target.value))}
                    style={{ accentColor: accentColor }}
                    className="w-full cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-neutral-300">
                    <span>Outline Stroke Color</span>
                    <span className="font-mono text-neutral-400 uppercase">{subBorderColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { color: "#000000", label: "Black" },
                      { color: "#171717", label: "Dark Gray" },
                      { color: "#1e1b4b", label: "Midnight" },
                      { color: "#ffffff", label: "White" },
                    ].map((bc) => (
                      <button
                        key={bc.color}
                        onClick={() => setSubBorderColor(bc.color)}
                        style={{
                          borderColor:
                            subBorderColor.toLowerCase() === bc.color.toLowerCase()
                              ? accentColor
                              : "transparent",
                        }}
                        className={`flex-1 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                          subBorderColor.toLowerCase() === bc.color.toLowerCase()
                            ? "bg-white/15 text-white"
                            : "bg-white/5 text-neutral-300 hover:bg-white/10"
                        }`}
                      >
                        {bc.label}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={subBorderColor}
                      onChange={(e) => setSubBorderColor(e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                      title="Choose outline color"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. Vertical Position from Bottom */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <div>
                <span className="font-semibold text-white">Vertical Position from Bottom</span>
                <p className="text-[11px] text-neutral-400">
                  Elevate subtitles higher or lower them on screen
                </p>
              </div>
              <span className="font-mono text-xs text-neutral-300">{subMarginY} px</span>
            </div>
            <input
              type="range"
              min="20"
              max="120"
              step="5"
              value={subMarginY}
              onChange={(e) => setSubMarginY(parseInt(e.target.value))}
              style={{ accentColor: accentColor }}
              className="w-full cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Footer: Reset Theme */}
      <div className="pt-2 flex justify-between items-center border-t border-white/5">
        <span className="text-[11px] text-neutral-500">
          All customizations are automatically synchronized and persisted.
        </span>
        <button
          onClick={resetTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-medium transition active:scale-95 border border-white/10 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Defaults</span>
        </button>
      </div>
    </div>
  );
}
