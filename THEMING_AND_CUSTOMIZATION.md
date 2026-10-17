# Eytaa Player — Theming & Customization Architecture Specification
> **Audience**: AI Agents, UI/UX Designers, Core Maintainers, and Contributors  
> **Target Version**: Eytaa v0.2.4+  
> **Purpose**: A complete specification of Eytaa's personalization engine, styling pipeline, state management, and video player integration. Use this document as the single source of truth when designing new skins, adding customization options, or proposing theme-related features.

---

## 1. System Overview & Architecture

Eytaa is a high-performance modern desktop media player built with:
- **Desktop Framework**: Tauri v2 (Rust backend with Windows window-effect compositing)
- **Frontend Core**: React 19 + TypeScript + Vite
- **Styling Pipeline**: Tailwind CSS v4 + Vanilla CSS Custom Properties (`:root` variables)
- **Video Playback Engine**: `mpv` (embedded via `mpvPlayerService.ts` IPC/C API)
- **State & Persistence**: Zustand store (`themeStore.ts`) backed by `storageService` (`localStorage`)

### The Dual-Layer Customization Architecture

Customization in Eytaa operates across two distinct rendering environments:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Eytaa Personalization Engine                    │
│                      (useThemeStore in themeStore.ts)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     Layer 1: Web UI Layer       │           │    Layer 2: MPV Video Engine    │
│  (React DOM / Tailwind / CSS)   │           │      (Hardware-Accelerated)     │
├─────────────────────────────────┤           ├─────────────────────────────────┤
│ • CSS Variables (--accent, etc) │           │ • Subtitle font & font size     │
│ • Glassmorphism (.ui-glass-*)   │           │ • Subtitle custom hex color     │
│ • Border radius & pill geometry │           │ • Subtitle box / outline style  │
│ • Scrubber heights & glow FX    │           │ • Subtitle bottom margin (pos)  │
│ • Dynamic hover & accessible text│          │ • sub-ass-override: force       │
└─────────────────────────────────┘           └─────────────────────────────────┘
```

1. **Layer 1: Web UI Layer** — Controls the window chrome, navigation bars, control bar, context menus, modals, media center cards, and drawer panels using real-time CSS variable injection.
2. **Layer 2: MPV Engine Layer** — Controls on-screen video elements (specifically subtitles and OSD text) rendered directly on the GPU by MPV. Subtitle properties are synced asynchronously through `syncSubtitlesToMpv()`.

---

## 2. Complete Customization Pillars

The application divides personalization into **4 main user-facing sub-tabs** plus a **Profile Management system**:

```
Appearance & Theming
 ├── 1. Themes & Colors       (Accent Colors & Full Design Skins)
 ├── 2. Surface & Glass       (Glass Styles, Opacity, Blur, Border Luminescence)
 ├── 3. Player Controls       (Bar Geometry, UI Corner Radius, Scrubber Height & Glow)
 ├── 4. Subtitles Typography  (Fonts, Size, Custom Font Color Wheel, Outlines, Margins)
 └── Profile Management       (Save User Profiles, Import/Export JSON)
```

---

### Pillar 1: Accent Colors & Highlighting

Eytaa uses a primary accent color system that dynamically calculates companion states (hover, glow shadow, and high-contrast accessible text color).

#### Dynamic Color Tokens (CSS Variables)
When a user selects an accent color (preset or custom HEX), `themeStore.ts` writes the following to `:root`:
- `--accent`: The base hex color (e.g., `#38bdf8`)
- `--accent-hover`: Lightened variant for `:hover` interactions
- `--accent-glow`: Semi-transparent RGBA color for glow shadows and ambient halos
- `--accent-text`: Automatically computed `#0a0a0a` (dark) or `#ffffff` (light) using **WCAG 2.1 relative luminance formula** to guarantee readability on buttons
- `--accent-focus`: Outline color for keyboard navigation focus rings

#### Built-in Accent Presets (`ACCENT_PRESETS`)
| Preset ID | Display Name | Hex Color | Hover Color | Glow RGBA | Text Color |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `amber` | Amber Gold | `#f59e0b` | `#fbbf24` | `rgba(245, 158, 11, 0.40)` | `#0a0a0a` |
| `emerald` | Cyber Emerald | `#10b981` | `#34d399` | `rgba(16, 185, 129, 0.40)` | `#0a0a0a` |
| `violet` | Electric Violet | `#8b5cf6` | `#a78bfa` | `rgba(139, 92, 246, 0.45)` | `#ffffff` |
| `pink` | Neon Pink | `#ec4899` | `#f472b6` | `rgba(236, 72, 153, 0.45)` | `#ffffff` |
| `cyan` | Ocean Cyan | `#06b6d4` | `#22d3ee` | `rgba(6, 182, 212, 0.40)` | `#0a0a0a` |
| `blue` | Sapphire Blue | `#3b82f6` | `#60a5fa` | `rgba(59, 130, 246, 0.40)` | `#ffffff` |
| `crimson` | Crimson Red | `#ef4444` | `#f87171` | `rgba(239, 68, 68, 0.40)` | `#ffffff` |
| `platinum` | Minimal Platinum | `#e5e5e5` | `#ffffff` | `rgba(255, 255, 255, 0.30)` | `#0a0a0a` |
| `yellow` | Tokyo Cyberpunk | `#fcee0a` | `#fef08a` | `rgba(252, 238, 10, 0.45)` | `#0a0a0a` |
| `sunset` | Sunset Coral | `#f97316` | `#fb923c` | `rgba(249, 115, 22, 0.40)` | `#0a0a0a` |

#### Custom Color Calibration
Users can enter any arbitrary hex color via native color wheel or 6-digit hex input. Eytaa automatically calculates:
- Lightened hover color (+15% brightness)
- 40% alpha glow shadow
- WCAG 2.1 relative luminance for button label text

---

### Pillar 2: Curated Complete Design Skins

Unlike single accent changes, a **Curated Design Skin** harmonizes all 4 pillars into a cohesive aesthetic.

#### Built-in Complete Skins (`COMPLETE_THEME_PRESETS`)
```typescript
export interface FullThemePreset {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  accentHover: string;
  accentGlow: string;
  accentText: string;
  glassStyle: "frosted" | "oled" | "aero" | "solid" | "cyber";
  glassOpacity: number; // 0.20 to 1.00
  glassBlur: number;    // 0 to 40 (px)
  glassBorder: "none" | "subtle" | "glow";
  controlBarStyle: "floating" | "dock" | "minimal";
  uiRounded: "sharp" | "rounded" | "pill";
  scrubberHeight: "slim" | "medium" | "bold" | "chunky";
  scrubberGlow: boolean;
  subColor: string;     // Hex code (e.g. "#ffffff")
  subFont: string;      // Font family (e.g. "Segoe UI")
  subBgStyle: "none" | "box" | "outline";
}
```

1. **VisionOS Frost (`visionos`)**:
   - *Concept*: Ultra-translucent spatial crystal glass with Apple Vision-like floating capsules.
   - *Colors*: Ice Sky (`#38bdf8`), translucent Aero surface (`rgba(10, 10, 15, 0.65)`), 28px blur.
   - *Geometry*: Pill geometry (`--ui-radius: 28px`), floating control bar, medium glowing scrubber.
2. **Linear Indigo (`linear`)**:
   - *Concept*: Refined minimalist dark studio aesthetic with vibrant electric indigo accents.
   - *Colors*: Electric Indigo (`#6366f1`), Frosted slate (`rgba(12, 12, 16, 0.88)`), 18px blur.
   - *Geometry*: Rounded geometry (`14px`), floating control bar, medium glowing scrubber.
3. **Tokyo Nightfall (`tokyo-night`)**:
   - *Concept*: Deep midnight obsidian with cyber neon teal lighting and glowing edge borders.
   - *Colors*: Cyan Teal (`#00f0ff`), Cyber dark surface (`rgba(8, 10, 18, 0.92)`), 20px blur, glowing edge borders.
   - *Geometry*: Rounded geometry (`14px`), floating bar, bold glowing scrubber.
4. **Obsidian Ember (`obsidian`)**:
   - *Concept*: Volcanic lava ember highlights over warm matte basalt charcoal.
   - *Colors*: Molten Coral (`#f97316`), Solid matte charcoal (`rgba(18, 18, 22, 1.00)`), 0px blur, subtle border.
   - *Geometry*: Rounded geometry (`14px`), docked bar, chunky scrubber.
5. **Pure OLED Stealth (`oled-stealth`)**:
   - *Concept*: Pitch black 100% true blacks, zero blur, sharp geometry, and crisp platinum contrast.
   - *Colors*: Platinum (`#e2e8f0`), Pure OLED black (`rgba(0, 0, 0, 0.98)`), 0px blur, subtle border.
   - *Geometry*: Sharp geometry (`2px` corners), docked control bar, slim non-glowing scrubber.
6. **Catppuccin Mocha (`catppuccin`)**:
   - *Concept*: Cozy pastel lavender mauve, soft organic rounded pills, and warm cream subtitles.
   - *Colors*: Mauve Lavender (`#cba6f7`), Soft frosted surface (`rgba(12, 12, 16, 0.82)`), 18px blur.
   - *Geometry*: Pill geometry (`28px`), floating bar, bold glowing scrubber, cream subtitles (`#f5e0dc`).

---

### Pillar 3: Surface & Glassmorphism

Eytaa uses a specialized glassmorphism system that adjusts based on `glassStyle`, `glassOpacity`, `glassBlur`, and `glassBorder`.

#### Glass Styles (`glassStyle`)
- **`frosted`**: Neutral dark glass (`rgba(12, 12, 16, opacity)`), balanced for media viewing.
- **`oled`**: Pure `#000000` pitch-black background with 0px blur for maximum OLED contrast and battery savings.
- **`aero`**: Highly translucent crystal glass (`opacity ≤ 0.65`, `blur ≥ 24px`) reminiscent of Windows Aero / VisionOS.
- **`solid`**: Opaque matte surface (`opacity: 1.0`, `blur: 0px`) for zero GPU backdrop-filter overhead.
- **`cyber`**: High-tech tinted surface with reactive glowing neon border (`1px solid var(--accent-glow)`).

#### CSS Class Utilities (`src/index.css`)
Components apply glassmorphism by simply adding these class names:
- `.ui-glass-panel`: Applies `--ui-bg`, `--ui-blur`, `--ui-border`, and `--ui-border-glow`. Used for modals, menus, drawers, and floating cards.
- `.ui-glass-bar`: Specifically tuned for the bottom control bar and header bars.
- `.ui-backdrop`: Applies background and blur without overriding custom border styling.

---

### Pillar 4: Player Controls & Geometry

Allows users to personalize the physical layout and interactive elements of the video player:

1. **Control Bar Placement (`controlBarStyle`)**:
   - `floating`: Modern capsule bar floating 20px above the bottom edge with margin.
   - `dock`: Traditional edge-to-edge bar docked firmly against the bottom of the window.
   - `minimal`: Compact bar showing only essential play/pause, time, and scrubber.
2. **UI Corner Geometry (`uiRounded`)**:
   - `sharp`: Industrial `2px` corners on cards, `4px` on buttons.
   - `rounded`: Modern `14px` corners on cards, `18px` on buttons.
   - `pill`: Organic `28px` capsule corners on cards, full `9999px` rounded pills on buttons.
3. **Progress Scrubber Height (`scrubberHeight`)**:
   - `slim`: 3px idle, 6px hover (unobtrusive, cinema focus).
   - `medium`: 5px idle, 10px hover (balanced default).
   - `bold`: 8px idle, 14px hover (comfortable touch/mouse targets).
   - `chunky`: 12px idle, 18px hover (bold modern statement).
4. **Scrubber Glow (`scrubberGlow` & `scrubberGlowIntensity`)**:
   - Toggles dynamic bloom halo behind the playback progress track (`box-shadow: 0 0 16px var(--accent-glow)`).
5. **Chapter Markers (`showChapterMarkers`)**:
   - Toggles visual tick marks along the scrubber track for video chapters.

---

### Pillar 5: Subtitles & Typography

Subtitles are rendered directly by the MPV video engine on top of the video frame. To ensure user settings always take precedence over embedded styles in MKV/ASS files, Eytaa uses `sub-ass-override: force`.

#### Configurable Subtitle Properties
| Property | Type / Range | MPV Property | Behavior |
| :--- | :--- | :--- | :--- |
| **Font Family** | `Segoe UI`, `Arial`, `Trebuchet MS`, `Georgia`, `Tahoma`, `Verdana`, `Impact`, `Consolas` | `sub-font` | Applied globally to subtitle text |
| **Font Size** | 20px to 64px (Default: 55px) | `sub-font-size` | Scales subtitle font size dynamically |
| **Font Color** | Full Hex Code (Wheel + Input + Swatches) | `sub-color` | Sets subtitle primary font color |
| **Background Style** | `outline` \| `box` \| `none` | `sub-back-color`, `sub-border-size`, `sub-shadow-offset` | Configures readability container |
| **Border Thickness** | 1px to 6px | `sub-border-size` | Stroke size when style is `outline` |
| **Border Color** | Hex Code (Default: `#000000`) | `sub-border-color` | Outline stroke color |
| **Vertical Position** | 10px to 120px (Default: 65px) | `sub-margin-y` | Height from bottom edge |
| **Collision Avoidance** | Automatic | `sub-margin-y` | Automatically adds +24px margin when bottom bar is visible |

#### Subtitle Style Matrix
- **`outline`**: Transparent background (`#00000000`), crisp solid border (3px black), no shadow.
- **`box`**: Translucent black bounding box (`#A0000000` / 62% black), 0px border, 0px shadow.
- **`none` (Shadow)**: Transparent background, 0px border, 2px drop shadow (`#000000`).

---

## 3. Data Schema & Persistence

All personalization state is stored in `themeStore.ts` using Zustand and persisted via `storageService` with the key `"eytaa-theme-settings"`.

### Complete `ThemeSettings` Interface
```typescript
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
  glassBlur: number;    // 0 to 40
  glassBorder: "none" | "subtle" | "glow";

  // Layout & Controls
  controlBarStyle: "floating" | "dock" | "minimal";
  uiRounded: "sharp" | "rounded" | "pill";
  scrubberGlow: boolean;
  scrubberGlowIntensity: number; // 0.2 to 1.0
  scrubberHeight: "slim" | "medium" | "bold" | "chunky";
  showChapterMarkers: boolean;

  // Subtitles Typography & Engine
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
```

### Profile Export / Import JSON Format
Users can export their complete theme configuration to share with other users:
```json
{
  "version": 1,
  "exportedAt": "2026-10-17T16:45:00.000Z",
  "theme": {
    "accentId": "custom",
    "accentColor": "#00f0ff",
    "accentHover": "#38f9d7",
    "accentGlow": "rgba(0, 240, 255, 0.45)",
    "accentText": "#0a0a0a",
    "glassStyle": "cyber",
    "glassOpacity": 0.92,
    "glassBlur": 20,
    "glassBorder": "glow",
    "controlBarStyle": "floating",
    "uiRounded": "rounded",
    "scrubberGlow": true,
    "scrubberGlowIntensity": 0.8,
    "scrubberHeight": "bold",
    "showChapterMarkers": true,
    "subFont": "Segoe UI",
    "subSize": 56,
    "subColor": "#00f0ff",
    "subBold": true,
    "subItalic": false,
    "subBgStyle": "outline",
    "subBgColor": "rgba(0,0,0,0.75)",
    "subBorderColor": "#000000",
    "subBorderSize": 3,
    "subMarginY": 65
  }
}
```

---

## 4. Component Integration Rules for Developers & Agents

When adding new UI components or modifying existing ones, follow these rules to ensure theming compliance:

### Rule 1: Never Hardcode Accent Colors
❌ **Incorrect**:
```tsx
<span className="text-amber-400">UP NEXT</span>
<button className="bg-amber-500 hover:bg-amber-600 text-black">Play</button>
```
✅ **Correct**:
```tsx
<span className="text-accent">UP NEXT</span>
<button
  className="hover:brightness-110 active:scale-95 transition-all"
  style={{
    backgroundColor: "var(--accent)",
    color: "var(--accent-text)",
    boxShadow: "0 4px 14px var(--accent-glow)"
  }}
>
  Play
</button>
```

### Rule 2: Use Reactive Glass Classes for Containers
❌ **Incorrect**:
```tsx
<div className="bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-xl">
```
✅ **Correct**:
```tsx
<div className="ui-glass-panel" style={{ borderRadius: "var(--ui-radius)" }}>
```

### Rule 3: Respect MPV Subtitle Margin Collision
When showing floating bottom overlays, do not clobber the user's customized `subMarginY`. Use the relative offset pattern:
```typescript
// App.tsx
useEffect(() => {
  const baseMargin = useThemeStore.getState().subMarginY ?? 65;
  const targetMargin = showBottomBar ? baseMargin + 24 : baseMargin;
  playerService.setSubtitleMarginY(targetMargin);
}, [showBottomBar]);
```

---

## 5. High-Impact Extension Opportunities (Wishlist for Suggestions)

If you are an AI agent, designer, or developer proposing new customization features for Eytaa, here are high-impact areas ready for extension:

### 1. New Curated Themes
Propose complete design skins adhering to the `FullThemePreset` schema:
- **Nord Arctic Frost**: Pastel blues, muted slate, Nordic minimalism.
- **Synthwave 84**: Hot magenta (`#ff007f`) with electric cyan glowing borders and retro typography.
- **Gruvbox Material**: Warm retro sepia tones, earthy forest greens, and autumn amber.
- **Monokai Pro**: High-contrast code-editor palette with vivid tangerine and lime accents.

### 2. Audio Visualizer Customization
Eytaa has audio playback support. Potential customization features:
- Visualizer style (`bars`, `wave`, `circular`, `spectrum`).
- Visualizer sensitivity and smoothing.
- Audio-reactive accent glow (pulsing UI glow synced to bass frequencies).

### 3. Custom Shader & Post-Processing Presets
MPV supports GLSL shaders (`glsl-shaders` property):
- Anime upscaling (Anime4K presets).
- Film grain / Cinematic 35mm emulation.
- CRT Retro Scanlines for vintage content.
- Contrast Adaptive Sharpening (AMD CAS).

### 4. Custom Font Loading
- Allowing users to browse and select local TTF/OTF files from their Windows system or provide a custom font file path.

### 5. OSD & Player Badge Customization
- Choice of OSD style (minimal corner badge, center pill, or timeline toast).
- Ability to toggle specific badges (resolution, codec, FPS, HDR badge).

---

## 6. Verification & Test Checklist

When testing theme modifications:
1. **Type Safety**: Run `npm run typecheck` (`tsc --noEmit`) — must return 0 errors.
2. **Linting**: Run `npm run lint` — must return 0 fatal errors.
3. **Build Bundle**: Run `npm run build` — Vite production build must succeed.
4. **Contrast Verification**: Test custom accent with white (`#ffffff`), yellow (`#fcee0a`), and black (`#000000`) to verify `getAccessibleTextColor()` assigns appropriate text color.
5. **Video Playback**: Load an MKV with ASS subtitles; verify that changing subtitle font, size, and color updates live on the video screen.
