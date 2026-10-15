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
];

export interface ThemeSettings {
  accentId: string;
  accentColor: string;
  accentHover: string;
  accentGlow: string;
  accentText: string;
  glassStyle: "frosted" | "oled" | "aero" | "solid";
  uiRounded: "rounded" | "pill" | "square";
  scrubberGlow: boolean;
  scrubberHeight: "slim" | "medium" | "bold";
  subColor: string;
  subSize: number;
}

export const DEFAULT_THEME: ThemeSettings = {
  accentId: "amber",
  accentColor: "#f59e0b",
  accentHover: "#fbbf24",
  accentGlow: "rgba(245, 158, 11, 0.4)",
  accentText: "#0a0a0a",
  glassStyle: "frosted",
  uiRounded: "rounded",
  scrubberGlow: true,
  scrubberHeight: "medium",
  subColor: "#ffffff",
  subSize: 55,
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
    // Threshold 0.42 provides crisp readability against light vs dark accent colors
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

  // Glass backdrop variables
  switch (theme.glassStyle) {
    case "oled":
      root.style.setProperty("--ui-bg", "rgba(0, 0, 0, 0.98)");
      root.style.setProperty("--ui-blur", "4px");
      break;
    case "aero":
      root.style.setProperty("--ui-bg", "rgba(10, 10, 15, 0.65)");
      root.style.setProperty("--ui-blur", "24px");
      break;
    case "solid":
      root.style.setProperty("--ui-bg", "rgba(18, 18, 22, 1)");
      root.style.setProperty("--ui-blur", "0px");
      break;
    case "frosted":
    default:
      root.style.setProperty("--ui-bg", "rgba(12, 12, 16, 0.88)");
      root.style.setProperty("--ui-blur", "16px");
      break;
  }
}

interface ThemeStoreState extends ThemeSettings {
  initializeTheme: () => Promise<void>;
  setAccentPreset: (presetId: string) => Promise<void>;
  setCustomAccentColor: (hex: string) => Promise<void>;
  setGlassStyle: (style: ThemeSettings["glassStyle"]) => Promise<void>;
  setUiRounded: (rounded: ThemeSettings["uiRounded"]) => Promise<void>;
  setScrubberGlow: (enabled: boolean) => Promise<void>;
  setScrubberHeight: (height: ThemeSettings["scrubberHeight"]) => Promise<void>;
  setSubColor: (color: string) => Promise<void>;
  setSubSize: (size: number) => Promise<void>;
  resetTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  ...DEFAULT_THEME,

  initializeTheme: async () => {
    try {
      const saved = await storageService.getPreference<ThemeSettings>("userThemeSettings");
      if (saved && typeof saved === "object") {
        const merged = { ...DEFAULT_THEME, ...saved };
        set(merged);
        applyCssVariables(merged);

        // Apply subtitles if MPV is running
        try {
          await playerService.setMpvProperty("sub-color", merged.subColor);
          await playerService.setMpvProperty("sub-font-size", merged.subSize);
        } catch {}
        return;
      }
    } catch (err) {
      console.warn("Failed to load user theme settings:", err);
    }
    applyCssVariables(DEFAULT_THEME);
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
    // Generate accessible text color (black vs white based on WCAG luminance)
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

  setUiRounded: async (rounded) => {
    set({ uiRounded: rounded });
    const full = { ...get(), uiRounded: rounded };
    await storageService.setPreference("userThemeSettings", full);
  },

  setScrubberGlow: async (enabled) => {
    set({ scrubberGlow: enabled });
    const full = { ...get(), scrubberGlow: enabled };
    await storageService.setPreference("userThemeSettings", full);
  },

  setScrubberHeight: async (height) => {
    set({ scrubberHeight: height });
    const full = { ...get(), scrubberHeight: height };
    await storageService.setPreference("userThemeSettings", full);
  },

  setSubColor: async (color) => {
    set({ subColor: color });
    const full = { ...get(), subColor: color };
    try {
      await playerService.setMpvProperty("sub-color", color);
    } catch {}
    await storageService.setPreference("userThemeSettings", full);
  },

  setSubSize: async (size) => {
    set({ subSize: size });
    const full = { ...get(), subSize: size };
    try {
      await playerService.setMpvProperty("sub-font-size", size);
    } catch {}
    await storageService.setPreference("userThemeSettings", full);
  },

  resetTheme: async () => {
    set(DEFAULT_THEME);
    applyCssVariables(DEFAULT_THEME);
    await storageService.setPreference("userThemeSettings", DEFAULT_THEME);
  },
}));
