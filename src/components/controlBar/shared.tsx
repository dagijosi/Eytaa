import type { ReactElement } from "react";
import { Tv, Layers, Film, Headphones, Mic, Sliders } from "lucide-react";

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
): { backgroundColor: string; color: string; borderColor: string } | undefined {
  return active
    ? {
        backgroundColor: accentGlow,
        color: accentColor,
        borderColor: accentColor,
      }
    : undefined;
}

export function getProfileIcon(icon: string, accentColor: string): ReactElement {
  switch (icon) {
    case "tv":
    case "sparkles":
      return <Tv style={{ color: accentColor }} className="w-3.5 h-3.5" />;
    case "layers":
      return <Layers style={{ color: accentColor }} className="w-3.5 h-3.5" />;
    case "film":
      return <Film className="w-3.5 h-3.5 text-rose-400" />;
    case "headphones":
      return <Headphones className="w-3.5 h-3.5 text-sky-400" />;
    case "mic":
      return <Mic className="w-3.5 h-3.5 text-emerald-400" />;
    default:
      return <Sliders className="w-3.5 h-3.5 text-neutral-300" />;
  }
}
