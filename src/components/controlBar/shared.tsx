import type { ReactElement } from "react";
import { Tv, Layers, Film, Headphones, Mic, Sliders, Moon, Flame, Sparkles } from "lucide-react";

export function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export function activeBtnStyle(
  active: boolean,
  accentColor: string,
  accentGlow: string,
): { backgroundColor: string; color: string; borderColor: string; boxShadow: string } | undefined {
  return active
    ? {
        backgroundColor: accentColor,
        color: "var(--accent-text)",
        borderColor: accentColor,
        boxShadow: `0 2px 10px ${accentGlow}`,
      }
    : undefined;
}

export function getProfileIcon(
  icon: string,
  accentColor: string,
  monochrome = false,
): ReactElement {
  const accentStyle = monochrome ? undefined : { color: accentColor };
  const tone = (className: string) => (monochrome ? "" : className);

  switch (icon) {
    case "tv":
      return <Tv style={accentStyle} className="w-3.5 h-3.5" />;
    case "sparkles":
      return <Sparkles className={`w-3.5 h-3.5 ${tone("text-amber-300")}`} />;
    case "moon":
      return <Moon className={`w-3.5 h-3.5 ${tone("text-indigo-400")}`} />;
    case "flame":
      return <Flame className={`w-3.5 h-3.5 ${tone("text-rose-500")}`} />;
    case "layers":
      return <Layers style={accentStyle} className="w-3.5 h-3.5" />;
    case "film":
      return <Film className={`w-3.5 h-3.5 ${tone("text-rose-400")}`} />;
    case "headphones":
      return <Headphones className={`w-3.5 h-3.5 ${tone("text-sky-400")}`} />;
    case "mic":
      return <Mic className={`w-3.5 h-3.5 ${tone("text-emerald-400")}`} />;
    default:
      return <Sliders className={`w-3.5 h-3.5 ${tone("text-neutral-300")}`} />;
  }
}
