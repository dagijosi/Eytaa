import { useMemo } from "react";
import { Film, Tv, Music, Video } from "lucide-react";
import { EytaaLogo } from "../EytaaLogo";

interface ProceduralPosterProps {
  title: string;
  category?: string;
  year?: string;
  seasonEpisode?: string;
  className?: string;
  aspectRatio?: "poster" | "video"; // poster is ~2:3, video is 16:9
}

// 8 curated filmic gradients
const GRADIENTS = [
  {
    bg: "from-sky-950 via-slate-900 to-black",
    accent: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.25)",
    border: "border-sky-500/20",
  },
  {
    bg: "from-indigo-950 via-neutral-900 to-black",
    accent: "#818cf8",
    glow: "rgba(129, 140, 248, 0.25)",
    border: "border-indigo-500/20",
  },
  {
    bg: "from-emerald-950 via-stone-900 to-black",
    accent: "#34d399",
    glow: "rgba(52, 211, 153, 0.25)",
    border: "border-emerald-500/20",
  },
  {
    bg: "from-rose-950 via-neutral-900 to-black",
    accent: "#fb7185",
    glow: "rgba(251, 113, 133, 0.25)",
    border: "border-rose-500/20",
  },
  {
    bg: "from-amber-950 via-stone-900 to-black",
    accent: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.25)",
    border: "border-amber-500/20",
  },
  {
    bg: "from-purple-950 via-neutral-900 to-black",
    accent: "#c084fc",
    glow: "rgba(192, 132, 252, 0.25)",
    border: "border-purple-500/20",
  },
  {
    bg: "from-cyan-950 via-zinc-900 to-black",
    accent: "#22d3ee",
    glow: "rgba(34, 211, 238, 0.25)",
    border: "border-cyan-500/20",
  },
  {
    bg: "from-red-950 via-neutral-950 to-black",
    accent: "#f87171",
    glow: "rgba(248, 113, 113, 0.25)",
    border: "border-red-500/20",
  },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function ProceduralPoster({
  title,
  category = "movie",
  year,
  seasonEpisode,
  className = "",
  aspectRatio: _aspectRatio = "poster",
}: ProceduralPosterProps) {
  const theme = useMemo(() => {
    const idx = hashString(title || "Eytaa") % GRADIENTS.length;
    return GRADIENTS[idx];
  }, [title]);

  const initials = useMemo(() => {
    if (!title) return "EY";
    const clean = title.replace(/[^a-zA-Z0-9\s]/g, "").trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return (clean.slice(0, 2) || "EY").toUpperCase();
  }, [title]);

  const CategoryIcon =
    category === "series"
      ? Tv
      : category === "music"
      ? Music
      : category === "video"
      ? Video
      : Film;

  const badgeText =
    category === "series"
      ? "SERIES"
      : category === "music"
      ? "MUSIC"
      : category === "video"
      ? "VIDEO"
      : "MOVIE";

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none flex flex-col justify-between p-3.5 bg-gradient-to-br ${theme.bg} ${theme.border} border ${className}`}
    >
      {/* Background ambient radial glow */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40"
        style={{ backgroundColor: theme.accent }}
      />
      <div
        className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-20"
        style={{ backgroundColor: theme.accent }}
      />

      {/* Subtle geometric grid / grain pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "16px 16px",
        }}
      />

      {/* Top Header Badge */}
      <div className="relative z-10 flex items-center justify-between w-full">
        <span
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider uppercase border border-white/10 bg-black/40 backdrop-blur-md"
          style={{ color: theme.accent }}
        >
          <CategoryIcon className="w-2.5 h-2.5" />
          {badgeText}
        </span>

        {year && (
          <span className="text-[10px] font-mono font-semibold text-neutral-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
            {year}
          </span>
        )}
      </div>

      {/* Center Typography & Monogram */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto px-2">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center font-black tracking-widest text-lg shadow-lg border border-white/10 mb-2 backdrop-blur-md bg-white/5"
          style={{
            color: theme.accent,
            boxShadow: `0 8px 24px ${theme.glow}`,
          }}
        >
          {initials}
        </div>

        <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight tracking-tight drop-shadow-sm">
          {title}
        </h3>

        {seasonEpisode && (
          <span
            className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border border-white/10 bg-black/40"
            style={{ color: theme.accent }}
          >
            {seasonEpisode}
          </span>
        )}
      </div>

      {/* Bottom Footer Watermark */}
      <div className="relative z-10 flex items-center justify-between pt-1 border-t border-white/5 text-[9px] text-neutral-500 font-mono">
        <span className="truncate max-w-[120px]">{category.toUpperCase()}</span>
        <div className="w-3.5 h-3.5 opacity-60">
          <EytaaLogo className="w-full h-full" variant="color" />
        </div>
      </div>
    </div>
  );
}
