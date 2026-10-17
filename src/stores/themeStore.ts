import { create } from "zustand";
import { storageService } from "../services/storage/storageService";
import { playerService } from "../services/player/mpvPlayerService";

export interface AccentPreset {
  id: string;
  name: string;
  color: string;
  hover: string;
  glow: string;
  text: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: "amber",
    name: "Amber Gold",
    color: "#f59e0b",
    hover: "#fbbf24",
    glow: "rgba(245, 158, 11, 0.4)",
    text: "#0a0a0a",
  },
  {
    id: "emerald",
    name: "Cyber Emerald",
    color: "#10b981",
    hover: "#34d399",
    glow: "rgba(16, 185, 129, 0.4)",
    text: "#0a0a0a",
  },
  {
    id: "violet",
    name: "Electric Violet",
    color: "#8b5cf6",
    hover: "#a78bfa",
    glow: "rgba(139, 92, 246, 0.45)",
    text: "#ffffff",
  },
  {
    id: "pink",
    name: "Neon Pink",
    color: "#ec4899",
    hover: "#f472b6",
    glow: "rgba(236, 72, 153, 0.45)",
    text: "#ffffff",
  },
  {
    id: "cyan",
    name: "Ocean Cyan",
    color: "#06b6d4",
    hover: "#22d3ee",
    glow: "rgba(6, 182, 212, 0.4)",
    text: "#0a0a0a",
  },
  {
    id: "blue",
    name: "Sapphire Blue",
    color: "#3b82f6",
    hover: "#60a5fa",
    glow: "rgba(59, 130, 246, 0.4)",
    text: "#ffffff",
  },
  {
    id: "crimson",
    name: "Crimson Red",
    color: "#ef4444",
    hover: "#f87171",
    glow: "rgba(239, 68, 68, 0.4)",
    text: "#ffffff",
  },
  {
    id: "platinum",
    name: "Minimal Platinum",
    color: "#e5e5e5",
    hover: "#ffffff",
    glow: "rgba(255, 255, 255, 0.3)",
    text: "#0a0a0a",
  },
  {
    id: "yellow",
    name: "Tokyo Cyberpunk",
    color: "#fcee0a",
    hover: "#fef08a",
    glow: "rgba(252, 238, 10, 0.45)",
    text: "#0a0a0a",
  },
  {
    id: "sunset",
    name: "Sunset Coral",
    color: "#f97316",
    hover: "#fb923c",
    glow: "rgba(249, 115, 22, 0.4)",
    text: "#0a0a0a",
  },
];

export interface FullThemePreset {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  accentHover: string;
  accentGlow: string;
  accentText: string;
  glassStyle: "frosted" | "oled" | "aero" | "solid" | "cyber";
  glassOpacity: number;
  glassBlur: number;
  glassBorder: "none" | "subtle" | "glow";
  controlBarStyle: "floating" | "dock" | "minimal";
  uiRounded: "sharp" | "rounded" | "pill";
  scrubberHeight: "slim" | "medium" | "bold" | "chunky";
  scrubberGlow: boolean;
  subColor: string;
  subFont: string;
  subBgStyle: "none" | "box" | "outline";
}

export const COMPLETE_THEME_PRESETS: FullThemePreset[] = [
  {
    id: "visionos",
    name: "VisionOS Frost",
    description: "Ultra-translucent spatial crystal glass with electric ice sky accents and pill controls",
    accentColor: "#38bdf8",
    accentHover: "#7dd3fc",
    accentGlow: "rgba(56, 189, 248, 0.45)",
    accentText: "#0a0a0a",
    glassStyle: "aero",
    glassOpacity: 0.65,
    glassBlur: 28,
    glassBorder: "subtle",
    controlBarStyle: "floating",
    uiRounded: "pill",
    scrubberHeight: "medium",
    scrubberGlow: true,
    subColor: "#ffffff",
    subFont: "Segoe UI",
    subBgStyle: "outline",
  },
  {
    id: "linear",
    name: "Linear Indigo",
    description: "Refined minimalist dark studio aesthetic with vibrant electric indigo accents",
    accentColor: "#6366f1",
    accentHover: "#818cf8",
    accentGlow: "rgba(99, 102, 241, 0.45)",
    accentText: "#ffffff",
    glassStyle: "frosted",
    glassOpacity: 0.88,
    glassBlur: 18,
    glassBorder: "subtle",
    controlBarStyle: "floating",
    uiRounded: "rounded",
    scrubberHeight: "medium",
    scrubberGlow: true,
    subColor: "#ffffff",
    subFont: "Segoe UI",
    subBgStyle: "outline",
  },
  {
    id: "tokyo-night",
    name: "Tokyo Nightfall",
    description: "Deep midnight obsidian with cyber neon teal lighting and glowing edge borders",
    accentColor: "#2dd4bf",
    accentHover: "#5eead4",
    accentGlow: "rgba(45, 212, 191, 0.45)",
    accentText: "#0a0a0a",
    glassStyle: "cyber",
    glassOpacity: 0.92,
    glassBlur: 20,
    glassBorder: "glow",
    controlBarStyle: "floating",
    uiRounded: "rounded",
    scrubberHeight: "bold",
    scrubberGlow: true,
    subColor: "#5eead4",
    subFont: "Trebuchet MS",
    subBgStyle: "outline",
  },
  {
    id: "obsidian",
    name: "Obsidian Ember",
    description: "Luxurious deep charcoal finish with warm gold amber highlights and cinematic typography",
    accentColor: "#f59e0b",
    accentHover: "#fbbf24",
    accentGlow: "rgba(245, 158, 11, 0.45)",
    accentText: "#0a0a0a",
    glassStyle: "frosted",
    glassOpacity: 0.85,
    glassBlur: 16,
    glassBorder: "subtle",
    controlBarStyle: "floating",
    uiRounded: "rounded",
    scrubberHeight: "medium",
    scrubberGlow: true,
    subColor: "#fef08a",
    subFont: "Georgia",
    subBgStyle: "outline",
  },
  {
    id: "oled-stealth",
    name: "Pure OLED Stealth",
    description: "Pitch black 100% true blacks, zero blur, sharp geometry, and crisp platinum contrast",
    accentColor: "#e2e8f0",
    accentHover: "#ffffff",
    accentGlow: "rgba(226, 232, 240, 0.25)",
    accentText: "#0a0a0a",
    glassStyle: "oled",
    glassOpacity: 1.0,
    glassBlur: 0,
    glassBorder: "subtle",
    controlBarStyle: "dock",
    uiRounded: "sharp",
    scrubberHeight: "slim",
    scrubberGlow: false,
    subColor: "#ffffff",
    subFont: "Arial",
    subBgStyle: "outline",
  },
  {
    id: "catppuccin",
    name: "Catppuccin Mocha",
    description: "Cozy pastel lavender mauve, soft organic rounded pills, and warm cream subtitles",
    accentColor: "#cba6f7",
    accentHover: "#d6b4f8",
    accentGlow: "rgba(203, 166, 247, 0.45)",
    accentText: "#0a0a0a",
    glassStyle: "frosted",
    glassOpacity: 0.82,
    glassBlur: 18,
    glassBorder: "subtle",
    controlBarStyle: "floating",
    uiRounded: "pill",
    scrubberHeight: "bold",
    scrubberGlow: true,
    subColor: "#f5e0dc",
    subFont: "Segoe UI",
    subBgStyle: "outline",
  },
  {
    id: "nord-arctic",
    name: "Nord Arctic",
    description: "Icy polar night surfaces with frost cyan and aurora-soft text — calm and distraction-free",
    accentColor: "#88c0d0",
    accentHover: "#8fbcbb",
    accentGlow: "rgba(136, 192, 208, 0.40)",
    accentText: "#2e3440",
    glassStyle: "frosted",
    glassOpacity: 0.88,
    glassBlur: 16,
    glassBorder: "subtle",
    controlBarStyle: "floating",
    uiRounded: "rounded",
    scrubberHeight: "medium",
    scrubberGlow: true,
    subColor: "#eceff4",
    subFont: "Segoe UI",
    subBgStyle: "outline",
  },
  {
    id: "gruvbox-earth",
    name: "Gruvbox Earth",
    description: "Warm retro analog sepia tones with earthy basalt and autumn golden amber — nostalgic cinema",
    accentColor: "#d79921",
    accentHover: "#fabd2f",
    accentGlow: "rgba(215, 153, 33, 0.45)",
    accentText: "#1d2021",
    glassStyle: "solid",
    glassOpacity: 0.96,
    glassBlur: 0,
    glassBorder: "subtle",
    controlBarStyle: "dock",
    uiRounded: "rounded",
    scrubberHeight: "bold",
    scrubberGlow: false,
    subColor: "#fbf1c7",
    subFont: "Georgia",
    subBgStyle: "box",
  },
  {
    id: "oled-cinema",
    name: "OLED Cinema",
    description: "100% true blacks with crisp emerald green highlights — engineered for OLED displays",
    accentColor: "#10b981",
    accentHover: "#34d399",
    accentGlow: "rgba(16, 185, 129, 0.35)",
    accentText: "#000000",
    glassStyle: "oled",
    glassOpacity: 1.0,
    glassBlur: 0,
    glassBorder: "subtle",
    controlBarStyle: "dock",
    uiRounded: "sharp",
    scrubberHeight: "slim",
    scrubberGlow: false,
    subColor: "#ffffff",
    subFont: "Arial",
    subBgStyle: "outline",
  },
  {
    id: "forest-night",
    name: "Forest Night",
    description: "Deep evergreen nocturnal mist with glowing leaf green highlights and soft pill capsules",
    accentColor: "#22c55e",
    accentHover: "#4ade80",
    accentGlow: "rgba(34, 197, 94, 0.45)",
    accentText: "#0a120e",
    glassStyle: "frosted",
    glassOpacity: 0.90,
    glassBlur: 18,
    glassBorder: "glow",
    controlBarStyle: "floating",
    uiRounded: "pill",
    scrubberHeight: "medium",
    scrubberGlow: true,
    subColor: "#e6f4ed",
    subFont: "Segoe UI",
    subBgStyle: "outline",
  },
  {
    id: "synthwave",
    name: "Synthwave 84",
    description: "Neon magenta hot pink and electric cyan on deep violet darkness — retro-futurist cyberpunk",
    accentColor: "#f72585",
    accentHover: "#ff4d8b",
    accentGlow: "rgba(247, 37, 133, 0.55)",
    accentText: "#ffffff",
    glassStyle: "cyber",
    glassOpacity: 0.92,
    glassBlur: 20,
    glassBorder: "glow",
    controlBarStyle: "floating",
    uiRounded: "rounded",
    scrubberHeight: "bold",
    scrubberGlow: true,
    subColor: "#00f0ff",
    subFont: "Trebuchet MS",
    subBgStyle: "outline",
  },
  {
    id: "mocha-latte",
    name: "Mocha Latte",
    description: "Comfortable warm coffee brown darkness with soft caramel gold and cream subtitle text",
    accentColor: "#c4944a",
    accentHover: "#d4a55a",
    accentGlow: "rgba(196, 148, 74, 0.40)",
    accentText: "#1c1209",
    glassStyle: "frosted",
    glassOpacity: 0.86,
    glassBlur: 14,
    glassBorder: "subtle",
    controlBarStyle: "floating",
    uiRounded: "rounded",
    scrubberHeight: "medium",
    scrubberGlow: true,
    subColor: "#f5e6d0",
    subFont: "Georgia",
    subBgStyle: "outline",
  },
];

export interface CustomThemeProfile {
  id: string;
  name: string;
  createdAt: number;
  settings: Partial<ThemeSettings>;
}

export interface ThemeSettings {
  // Accent & Colors
  accentId: string;
  accentColor: string;
  accentHover: string;
  accentGlow: string;
  accentText: string;

  // Surface & Glassmorphism
  glassStyle: "frosted" | "oled" | "aero" | "solid" | "cyber";
  glassOpacity: number; // 0.20 to 1.00
  glassBlur: number; // 0 to 40
  glassBorder: "none" | "subtle" | "glow";

  // Layout & Controls
  controlBarStyle: "floating" | "dock" | "minimal";
  uiRounded: "sharp" | "rounded" | "pill";
  scrubberGlow: boolean;
  scrubberGlowIntensity: number; // 0.2 to 1.0
  scrubberHeight: "slim" | "medium" | "bold" | "chunky";
  showChapterMarkers: boolean;

  // Subtitles
  subFont: string;
  subSize: number;
  subColor: string;
  subBold: boolean;
  subItalic: boolean;
  subBgStyle: "none" | "box" | "outline";
  subBgColor: string;
  subBorderColor: string;
  subBorderSize: number;
  subMarginY: number;

  // Custom User Saved Profiles
  customThemes: CustomThemeProfile[];
}

export const DEFAULT_THEME: ThemeSettings = {
  accentId: "amber",
  accentColor: "#f59e0b",
  accentHover: "#fbbf24",
  accentGlow: "rgba(245, 158, 11, 0.4)",
  accentText: "#0a0a0a",
  glassStyle: "frosted",
  glassOpacity: 0.85,
  glassBlur: 16,
  glassBorder: "subtle",
  controlBarStyle: "floating",
  uiRounded: "rounded",
  scrubberGlow: true,
  scrubberGlowIntensity: 0.6,
  scrubberHeight: "medium",
  showChapterMarkers: true,
  subFont: "Segoe UI",
  subSize: 55,
  subColor: "#ffffff",
  subBold: true,
  subItalic: false,
  subBgStyle: "outline",
  subBgColor: "rgba(0,0,0,0.75)",
  subBorderColor: "#000000",
  subBorderSize: 3,
  subMarginY: 65,
  customThemes: [],
};

export function getAccessibleTextColor(hexColor: string): "#0a0a0a" | "#ffffff" {
  try {
    const cleanHex = hexColor.replace("#", "").trim();
    let r = 255, g = 255, b = 255;
    if (cleanHex.length === 6) {
      r = parseInt(cleanHex.substring(0, 2), 16);
      g = parseInt(cleanHex.substring(2, 4), 16);
      b = parseInt(cleanHex.substring(4, 6), 16);
    } else if (cleanHex.length === 3) {
      r = parseInt(cleanHex[0] + cleanHex[0], 16);
      g = parseInt(cleanHex[1] + cleanHex[1], 16);
      b = parseInt(cleanHex[2] + cleanHex[2], 16);
    }
    // WCAG 2.1 relative luminance calculation
    const sRGB = [r, g, b].map((val) => {
      const c = val / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const luminance = 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    return luminance > 0.42 ? "#0a0a0a" : "#ffffff";
  } catch {
    return "#ffffff";
  }
}

function applyCssVariables(theme: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accentColor);
  root.style.setProperty("--accent-hover", theme.accentHover);
  root.style.setProperty("--accent-glow", theme.accentGlow);
  root.style.setProperty("--accent-text", theme.accentText);
  root.style.setProperty("--accent-focus", theme.accentColor);

  // Border radius variables
  const radiusVal =
    theme.uiRounded === "sharp"
      ? "2px"
      : theme.uiRounded === "pill"
      ? "28px"
      : "14px";
  const pillRadiusVal =
    theme.uiRounded === "sharp"
      ? "4px"
      : theme.uiRounded === "pill"
      ? "9999px"
      : "18px";
  root.style.setProperty("--ui-radius", radiusVal);
  root.style.setProperty("--ui-radius-pill", pillRadiusVal);

  // Glass backdrop variables
  let baseRgb: string;
  let opacity = theme.glassOpacity ?? 0.85;
  let blur = theme.glassBlur ?? 16;

  switch (theme.glassStyle) {
    case "oled":
      baseRgb = "0, 0, 0";
      opacity = 0.98;
      blur = 0;
      break;
    case "aero":
      baseRgb = "10, 10, 15";
      opacity = Math.min(opacity, 0.65);
      blur = Math.max(blur, 24);
      break;
    case "solid":
      baseRgb = "18, 18, 22";
      opacity = 1.0;
      blur = 0;
      break;
    case "cyber":
      baseRgb = "8, 10, 18";
      opacity = 0.92;
      blur = 20;
      break;
    case "frosted":
    default:
      baseRgb = "12, 12, 16";
      break;
  }

  root.style.setProperty("--ui-bg", `rgba(${baseRgb}, ${opacity})`);
  root.style.setProperty("--ui-blur", `${blur}px`);

  // Border & Glow
  if (theme.glassBorder === "glow" || theme.glassStyle === "cyber") {
    root.style.setProperty("--ui-border", `1px solid ${theme.accentGlow}`);
    root.style.setProperty("--ui-border-glow", `0 0 16px ${theme.accentGlow}`);
  } else if (theme.glassBorder === "none") {
    root.style.setProperty("--ui-border", "1px solid transparent");
    root.style.setProperty("--ui-border-glow", "none");
  } else {
    // subtle
    root.style.setProperty("--ui-border", "1px solid rgba(255, 255, 255, 0.1)");
    root.style.setProperty("--ui-border-glow", "none");
  }
}

function hexToAssColor(hex: string, alpha: number = 0): string {
  try {
    const clean = hex.replace("#", "").trim();
    let r = "FF", g = "FF", b = "FF";
    if (clean.length === 6) {
      r = clean.slice(0, 2);
      g = clean.slice(2, 4);
      b = clean.slice(4, 6);
    } else if (clean.length === 3) {
      r = clean[0] + clean[0];
      g = clean[1] + clean[1];
      b = clean[2] + clean[2];
    }
    // Alpha in ASS: 00 = completely opaque, FF = fully transparent
    const aVal = Math.max(0, Math.min(255, Math.round(alpha * 255)));
    const aHex = aVal.toString(16).padStart(2, "0").toUpperCase();
    return `&H${aHex}${b.toUpperCase()}${g.toUpperCase()}${r.toUpperCase()}`;
  } catch {
    return "&H00FFFFFF";
  }
}

export async function syncSubtitlesToMpv(theme: ThemeSettings) {
  try {
    // 1. Force override ASS styles so user selections take effect
    await playerService.setMpvProperty("sub-ass-override", "force");
    await playerService.setMpvProperty("sub-use-margins", "yes");

    // 2. Base font properties (standard text tracks like SRT, WebVTT)
    await playerService.setMpvProperty("sub-color", theme.subColor);
    await playerService.setMpvProperty("sub-font-size", theme.subSize);
    if (theme.subFont) {
      await playerService.setMpvProperty("sub-font", theme.subFont);
    }
    await playerService.setMpvProperty("sub-bold", theme.subBold ? "yes" : "no");
    await playerService.setMpvProperty("sub-italic", theme.subItalic ? "yes" : "no");
    await playerService.setMpvProperty("sub-margin-y", theme.subMarginY ?? 65);

    // 3. Subtitle background & outline styling
    if (theme.subBgStyle === "box") {
      // Cinema Box mode (Netflix-style dark pill behind text)
      await playerService.setMpvProperty("sub-border-style", "background-box");
      await playerService.setMpvProperty("sub-back-color", "#A0000000");
      await playerService.setMpvProperty("sub-outline-color", "#A0000000");
      await playerService.setMpvProperty("sub-border-size", 0);
      await playerService.setMpvProperty("sub-outline-size", 0);
      await playerService.setMpvProperty("sub-shadow-offset", 0);
    } else if (theme.subBgStyle === "outline") {
      // Outline stroke mode
      await playerService.setMpvProperty("sub-border-style", "outline-and-shadow");
      await playerService.setMpvProperty("sub-back-color", "#00000000");
      await playerService.setMpvProperty("sub-border-size", theme.subBorderSize ?? 3);
      await playerService.setMpvProperty("sub-outline-size", theme.subBorderSize ?? 3);
      await playerService.setMpvProperty("sub-border-color", theme.subBorderColor ?? "#000000");
      await playerService.setMpvProperty("sub-outline-color", theme.subBorderColor ?? "#000000");
      await playerService.setMpvProperty("sub-shadow-offset", 0);
    } else {
      // Clean drop shadow mode
      await playerService.setMpvProperty("sub-border-style", "outline-and-shadow");
      await playerService.setMpvProperty("sub-back-color", "#00000000");
      await playerService.setMpvProperty("sub-border-size", 0);
      await playerService.setMpvProperty("sub-outline-size", 0);
      await playerService.setMpvProperty("sub-shadow-offset", 2);
      await playerService.setMpvProperty("sub-shadow-color", "#000000");
    }

    // 4. Force ASS/SSA subtitle engine overrides (for MKV with embedded ASS tracks)
    const assOverrides: string[] = [
      `FontName=${theme.subFont || "Segoe UI"}`,
      `PrimaryColour=${hexToAssColor(theme.subColor, 0)}`,
      theme.subBold ? "Bold=1" : "Bold=0",
      theme.subItalic ? "Italic=1" : "Italic=0",
    ];

    if (theme.subBgStyle === "box") {
      assOverrides.push("BorderStyle=3");
      assOverrides.push("BackColour=&H80000000");
      assOverrides.push("Outline=0");
      assOverrides.push("Shadow=0");
    } else if (theme.subBgStyle === "outline") {
      assOverrides.push("BorderStyle=1");
      assOverrides.push(`Outline=${theme.subBorderSize ?? 3}`);
      assOverrides.push(`OutlineColour=${hexToAssColor(theme.subBorderColor || "#000000", 0)}`);
      assOverrides.push("Shadow=0");
    } else {
      assOverrides.push("BorderStyle=1");
      assOverrides.push("Outline=0");
      assOverrides.push("Shadow=2");
      assOverrides.push("BackColour=&H00000000");
    }

    await playerService.setMpvProperty("sub-ass-style-overrides", assOverrides.join(","));
  } catch (err) {
    console.warn("Syncing subtitle settings to MPV warning:", err);
  }
}

interface ThemeStoreState extends ThemeSettings {
  initializeTheme: () => Promise<void>;
  applyThemePreset: (presetId: string) => Promise<void>;
  setAccentPreset: (presetId: string) => Promise<void>;
  setCustomAccentColor: (hex: string) => Promise<void>;
  setGlassStyle: (style: ThemeSettings["glassStyle"]) => Promise<void>;
  setGlassOpacity: (opacity: number) => Promise<void>;
  setGlassBlur: (blur: number) => Promise<void>;
  setGlassBorder: (border: ThemeSettings["glassBorder"]) => Promise<void>;
  setControlBarStyle: (style: ThemeSettings["controlBarStyle"]) => Promise<void>;
  setUiRounded: (rounded: ThemeSettings["uiRounded"]) => Promise<void>;
  setScrubberGlow: (enabled: boolean) => Promise<void>;
  setScrubberGlowIntensity: (intensity: number) => Promise<void>;
  setScrubberHeight: (height: ThemeSettings["scrubberHeight"]) => Promise<void>;
  setShowChapterMarkers: (show: boolean) => Promise<void>;
  setSubColor: (color: string) => Promise<void>;
  setSubSize: (size: number) => Promise<void>;
  setSubFont: (font: string) => Promise<void>;
  setSubBold: (bold: boolean) => Promise<void>;
  setSubItalic: (italic: boolean) => Promise<void>;
  setSubBgStyle: (style: ThemeSettings["subBgStyle"]) => Promise<void>;
  setSubBorderSize: (size: number) => Promise<void>;
  setSubBorderColor: (color: string) => Promise<void>;
  setSubMarginY: (margin: number) => Promise<void>;
  saveCustomTheme: (name: string) => Promise<void>;
  deleteCustomTheme: (id: string) => Promise<void>;
  applyCustomTheme: (id: string) => Promise<void>;
  exportThemeJson: () => string;
  importThemeJson: (jsonStr: string) => Promise<boolean>;
  resetTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  ...DEFAULT_THEME,

  initializeTheme: async () => {
    try {
      const saved = await storageService.getPreference<ThemeSettings>("userThemeSettings");
      if (saved && typeof saved === "object") {
        const merged: ThemeSettings = { ...DEFAULT_THEME, ...saved };
        set(merged);
        applyCssVariables(merged);
        await syncSubtitlesToMpv(merged);
        return;
      }
    } catch (err) {
      console.warn("Failed to load user theme settings:", err);
    }
    applyCssVariables(DEFAULT_THEME);
  },

  applyThemePreset: async (presetId: string) => {
    const preset = COMPLETE_THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const updated: Partial<ThemeSettings> = {
      accentId: preset.id,
      accentColor: preset.accentColor,
      accentHover: preset.accentHover,
      accentGlow: preset.accentGlow,
      accentText: preset.accentText,
      glassStyle: preset.glassStyle,
      glassOpacity: preset.glassOpacity,
      glassBlur: preset.glassBlur,
      glassBorder: preset.glassBorder,
      controlBarStyle: preset.controlBarStyle,
      uiRounded: preset.uiRounded,
      scrubberHeight: preset.scrubberHeight,
      scrubberGlow: preset.scrubberGlow,
      subColor: preset.subColor,
      subFont: preset.subFont,
      subBgStyle: preset.subBgStyle,
    };
    set(updated);
    const full = { ...get(), ...updated };
    applyCssVariables(full);
    await syncSubtitlesToMpv(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setAccentPreset: async (presetId: string) => {
    const preset = ACCENT_PRESETS.find((p) => p.id === presetId) || ACCENT_PRESETS[0];
    const updated: Partial<ThemeSettings> = {
      accentId: preset.id,
      accentColor: preset.color,
      accentHover: preset.hover,
      accentGlow: preset.glow,
      accentText: preset.text,
    };
    set(updated);
    const full = { ...get(), ...updated };
    applyCssVariables(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setCustomAccentColor: async (hex: string) => {
    const accessibleText = getAccessibleTextColor(hex);
    const glow = `${hex}66`;
    const updated: Partial<ThemeSettings> = {
      accentId: "custom",
      accentColor: hex,
      accentHover: hex,
      accentGlow: glow,
      accentText: accessibleText,
    };
    set(updated);
    const full = { ...get(), ...updated };
    applyCssVariables(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setGlassStyle: async (style) => {
    set({ glassStyle: style });
    const full = { ...get(), glassStyle: style };
    applyCssVariables(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setGlassOpacity: async (opacity) => {
    set({ glassOpacity: opacity });
    const full = { ...get(), glassOpacity: opacity };
    applyCssVariables(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setGlassBlur: async (blur) => {
    set({ glassBlur: blur });
    const full = { ...get(), glassBlur: blur };
    applyCssVariables(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setGlassBorder: async (border) => {
    set({ glassBorder: border });
    const full = { ...get(), glassBorder: border };
    applyCssVariables(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setControlBarStyle: async (style) => {
    set({ controlBarStyle: style });
    const full = { ...get(), controlBarStyle: style };
    await storageService.setPreference("userThemeSettings", full);
  },

  setUiRounded: async (rounded) => {
    set({ uiRounded: rounded });
    const full = { ...get(), uiRounded: rounded };
    applyCssVariables(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setScrubberGlow: async (enabled) => {
    set({ scrubberGlow: enabled });
    const full = { ...get(), scrubberGlow: enabled };
    await storageService.setPreference("userThemeSettings", full);
  },

  setScrubberGlowIntensity: async (intensity) => {
    set({ scrubberGlowIntensity: intensity });
    const full = { ...get(), scrubberGlowIntensity: intensity };
    await storageService.setPreference("userThemeSettings", full);
  },

  setScrubberHeight: async (height) => {
    set({ scrubberHeight: height });
    const full = { ...get(), scrubberHeight: height };
    await storageService.setPreference("userThemeSettings", full);
  },

  setShowChapterMarkers: async (show) => {
    set({ showChapterMarkers: show });
    const full = { ...get(), showChapterMarkers: show };
    await storageService.setPreference("userThemeSettings", full);
  },

  setSubColor: async (color) => {
    set({ subColor: color });
    const full = { ...get(), subColor: color };
    await syncSubtitlesToMpv(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setSubSize: async (size) => {
    set({ subSize: size });
    const full = { ...get(), subSize: size };
    await syncSubtitlesToMpv(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setSubFont: async (font) => {
    set({ subFont: font });
    const full = { ...get(), subFont: font };
    await syncSubtitlesToMpv(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setSubBold: async (bold) => {
    set({ subBold: bold });
    const full = { ...get(), subBold: bold };
    await syncSubtitlesToMpv(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setSubItalic: async (italic) => {
    set({ subItalic: italic });
    const full = { ...get(), subItalic: italic };
    await syncSubtitlesToMpv(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setSubBgStyle: async (style) => {
    set({ subBgStyle: style });
    const full = { ...get(), subBgStyle: style };
    await syncSubtitlesToMpv(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setSubBorderSize: async (size) => {
    set({ subBorderSize: size });
    const full = { ...get(), subBorderSize: size };
    await syncSubtitlesToMpv(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setSubBorderColor: async (color) => {
    set({ subBorderColor: color });
    const full = { ...get(), subBorderColor: color };
    await syncSubtitlesToMpv(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  setSubMarginY: async (margin) => {
    set({ subMarginY: margin });
    const full = { ...get(), subMarginY: margin };
    await syncSubtitlesToMpv(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  saveCustomTheme: async (name: string) => {
    const current = get();
    const newProfile: CustomThemeProfile = {
      id: `theme_${Date.now()}`,
      name: name.trim() || "My Custom Theme",
      createdAt: Date.now(),
      settings: {
        accentId: "custom",
        accentColor: current.accentColor,
        accentHover: current.accentHover,
        accentGlow: current.accentGlow,
        accentText: current.accentText,
        glassStyle: current.glassStyle,
        glassOpacity: current.glassOpacity,
        glassBlur: current.glassBlur,
        glassBorder: current.glassBorder,
        controlBarStyle: current.controlBarStyle,
        uiRounded: current.uiRounded,
        scrubberGlow: current.scrubberGlow,
        scrubberGlowIntensity: current.scrubberGlowIntensity,
        scrubberHeight: current.scrubberHeight,
        showChapterMarkers: current.showChapterMarkers,
        subFont: current.subFont,
        subSize: current.subSize,
        subColor: current.subColor,
        subBold: current.subBold,
        subItalic: current.subItalic,
        subBgStyle: current.subBgStyle,
        subBgColor: current.subBgColor,
        subBorderColor: current.subBorderColor,
        subBorderSize: current.subBorderSize,
        subMarginY: current.subMarginY,
      },
    };
    const nextList = [...(current.customThemes || []), newProfile];
    set({ customThemes: nextList });
    const full = { ...get(), customThemes: nextList };
    await storageService.setPreference("userThemeSettings", full);
  },

  deleteCustomTheme: async (id: string) => {
    const nextList = (get().customThemes || []).filter((t) => t.id !== id);
    set({ customThemes: nextList });
    const full = { ...get(), customThemes: nextList };
    await storageService.setPreference("userThemeSettings", full);
  },

  applyCustomTheme: async (id: string) => {
    const profile = (get().customThemes || []).find((t) => t.id === id);
    if (!profile) return;
    const updated = { ...profile.settings, accentId: "custom" };
    set(updated);
    const full = { ...get(), ...updated };
    applyCssVariables(full);
    await syncSubtitlesToMpv(full);
    await storageService.setPreference("userThemeSettings", full);
  },

  exportThemeJson: () => {
    const s = get();
    const exportData = {
      version: 1,
      name: "Eytaa Custom Theme",
      exportedAt: new Date().toISOString(),
      theme: {
        accentColor: s.accentColor,
        accentHover: s.accentHover,
        accentGlow: s.accentGlow,
        accentText: s.accentText,
        glassStyle: s.glassStyle,
        glassOpacity: s.glassOpacity,
        glassBlur: s.glassBlur,
        glassBorder: s.glassBorder,
        controlBarStyle: s.controlBarStyle,
        uiRounded: s.uiRounded,
        scrubberGlow: s.scrubberGlow,
        scrubberGlowIntensity: s.scrubberGlowIntensity,
        scrubberHeight: s.scrubberHeight,
        showChapterMarkers: s.showChapterMarkers,
        subFont: s.subFont,
        subSize: s.subSize,
        subColor: s.subColor,
        subBold: s.subBold,
        subItalic: s.subItalic,
        subBgStyle: s.subBgStyle,
        subBgColor: s.subBgColor,
        subBorderColor: s.subBorderColor,
        subBorderSize: s.subBorderSize,
        subMarginY: s.subMarginY,
      },
    };
    return JSON.stringify(exportData, null, 2);
  },

  importThemeJson: async (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const incoming = parsed.theme || parsed;
      if (!incoming || typeof incoming !== "object") return false;

      const updated: Partial<ThemeSettings> = {
        accentId: "custom",
        accentColor: incoming.accentColor || get().accentColor,
        accentHover: incoming.accentHover || get().accentHover,
        accentGlow: incoming.accentGlow || get().accentGlow,
        accentText: incoming.accentText || get().accentText,
        glassStyle: incoming.glassStyle || get().glassStyle,
        glassOpacity: incoming.glassOpacity ?? get().glassOpacity,
        glassBlur: incoming.glassBlur ?? get().glassBlur,
        glassBorder: incoming.glassBorder || get().glassBorder,
        controlBarStyle: incoming.controlBarStyle || get().controlBarStyle,
        uiRounded: incoming.uiRounded || get().uiRounded,
        scrubberGlow: incoming.scrubberGlow ?? get().scrubberGlow,
        scrubberGlowIntensity: incoming.scrubberGlowIntensity ?? get().scrubberGlowIntensity,
        scrubberHeight: incoming.scrubberHeight || get().scrubberHeight,
        showChapterMarkers: incoming.showChapterMarkers ?? get().showChapterMarkers,
        subFont: incoming.subFont || get().subFont,
        subSize: incoming.subSize ?? get().subSize,
        subColor: incoming.subColor || get().subColor,
        subBold: incoming.subBold ?? get().subBold,
        subItalic: incoming.subItalic ?? get().subItalic,
        subBgStyle: incoming.subBgStyle || get().subBgStyle,
        subBgColor: incoming.subBgColor || get().subBgColor,
        subBorderColor: incoming.subBorderColor || get().subBorderColor,
        subBorderSize: incoming.subBorderSize ?? get().subBorderSize,
        subMarginY: incoming.subMarginY ?? get().subMarginY,
      };

      set(updated);
      const full = { ...get(), ...updated };
      applyCssVariables(full);
      await syncSubtitlesToMpv(full);
      await storageService.setPreference("userThemeSettings", full);
      return true;
    } catch (e) {
      console.warn("Failed to import theme JSON:", e);
      return false;
    }
  },

  resetTheme: async () => {
    set(DEFAULT_THEME);
    applyCssVariables(DEFAULT_THEME);
    await syncSubtitlesToMpv(DEFAULT_THEME);
    await storageService.setPreference("userThemeSettings", DEFAULT_THEME);
  },
}));
