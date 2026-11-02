import { useState, useEffect, useRef, memo } from "react";
import { Play, Plus, Heart, CheckCircle2, Circle, Edit3, Clock } from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";
import { LibraryItem } from "../../services/library/libraryService";
import { useResolvedPoster } from "../../hooks/useResolvedPoster";
import { ProceduralPoster } from "./ProceduralPoster";

interface MediaCardProps {
  item: LibraryItem;
  viewFormat?: "poster" | "widescreen";
  onPlay: (filePath: string) => void;
  onQueue: (filePath: string) => void;
  onEdit: (item: LibraryItem) => void;
  onToggleFavorite: (filePath: string) => void;
  onToggleWatched: (filePath: string, currentWatched: boolean) => void;
  badge?: string;
  showSeriesTitle?: boolean;
}

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "--:--";
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatRemainingTime(resumePos?: number, duration?: number): string | null {
  if (!resumePos || !duration || duration <= 0) return null;
  const remaining = duration - resumePos;
  if (remaining <= 30) return null;
  const mins = Math.round(remaining / 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m left`;
  }
  return `${mins}m left`;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function MediaCardBase({
  item,
  viewFormat = "poster",
  onPlay,
  onQueue,
  onEdit,
  onToggleFavorite,
  onToggleWatched,
  badge,
  showSeriesTitle = true,
}: MediaCardProps) {
  const { accentColor, accentText } = useThemeStore();
  const [isVisible, setIsVisible] = useState(false);
  const [thumbSrc, setThumbSrc] = useResolvedPoster(
    item.custom_poster,
    item.file_path,
    isVisible,
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Lazy thumbnail loader
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute watch progress
  const hasResume = typeof item.resume_position === "number" && item.resume_position > 10;
  const progressPercent =
    hasResume && item.duration && item.duration > 0
      ? Math.min(100, Math.round((item.resume_position! / item.duration) * 100))
      : undefined;

  const isPartiallyWatched =
    !item.is_watched && progressPercent !== undefined && progressPercent > 0 && progressPercent < 90;

  const remainingLabel = formatRemainingTime(item.resume_position, item.duration);

  // Is newly added in last 4 days
  const isRecentlyAdded = (() => {
    try {
      const addedDate = new Date(item.added_at);
      const diffDays = (Date.now() - addedDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 4;
    } catch {
      return false;
    }
  })();

  const isWidescreen = viewFormat === "widescreen";

  return (
    <div
      ref={containerRef}
      className="group relative flex flex-col rounded-xl bg-neutral-900/50 hover:bg-neutral-900/85 border border-white/[0.08] hover:border-white/[0.2] transition-colors duration-150 overflow-hidden cursor-pointer shadow-xs"
      onClick={() => onPlay(item.file_path)}
    >
      {/* Media Artwork Container */}
      <div
        className={`relative w-full overflow-hidden bg-neutral-950 ${
          isWidescreen ? "aspect-video" : "aspect-[2/3]"
        }`}
      >
        {thumbSrc ? (
          <>
            <img
              src={thumbSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-lg opacity-40 scale-110 pointer-events-none"
            />
            <img
              src={thumbSrc}
              alt={item.title}
              className="relative w-full h-full object-contain drop-shadow-md"
              loading="lazy"
              onError={() => setThumbSrc(null)}
            />
          </>
        ) : (
          <ProceduralPoster
            title={item.series_name || item.title}
            category={item.category || (item.media_type === "audio" ? "music" : "movie")}
            year={item.year}
            seasonEpisode={
              item.season_number && item.episode_number
                ? `S${String(item.season_number).padStart(2, "0")}E${String(
                    item.episode_number,
                  ).padStart(2, "0")}`
                : undefined
            }
            aspectRatio={isWidescreen ? "video" : "poster"}
          />
        )}

        {/* Subtle bottom shadow overlay to keep badges legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1.5 z-20 pointer-events-none">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            {badge ? (
              <span
                style={{ backgroundColor: accentColor, color: accentText }}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase shrink-0 whitespace-nowrap flex items-center gap-1 shadow-xs"
              >
                <span>{badge}</span>
                {progressPercent !== undefined && <span className="tabular-nums">• {progressPercent}%</span>}
              </span>
            ) : item.is_watched ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md shrink-0 whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Watched</span>
              </span>
            ) : isPartiallyWatched ? (
              <span
                style={{ backgroundColor: accentColor, color: accentText }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold backdrop-blur-md shrink-0 whitespace-nowrap shadow-xs tabular-nums"
              >
                <Clock className="w-2.5 h-2.5" />
                <span>Resume {progressPercent}%</span>
              </span>
            ) : isRecentlyAdded ? (
              <span
                style={{
                  backgroundColor: accentColor,
                  color: accentText,
                }}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold shrink-0 whitespace-nowrap shadow-xs"
              >
                New
              </span>
            ) : null}
          </div>

          {/* Right Controls: Duration Badge */}
          {item.duration && item.duration > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-black/75 text-neutral-300 border border-white/10 backdrop-blur-md shrink-0 ml-auto tabular-nums">
              {formatDuration(item.duration)}
            </span>
          )}
        </div>

        {/* Center Hover Action: Clean native-style Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-black/70 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg">
            <div
              style={{
                backgroundColor: accentColor,
                color: accentText,
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
            </div>
          </div>
        </div>

        {/* Hover Quick Action Tray */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-black/80 backdrop-blur-md border border-white/15 rounded-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 shadow-lg pointer-events-auto"
        >
          {/* Mark Watched Toggle */}
          <button
            type="button"
            onClick={() => onToggleWatched(item.file_path, item.is_watched)}
            title={item.is_watched ? "Mark as Unwatched" : "Mark as Watched"}
            className={`p-1.5 rounded-md transition duration-150 cursor-pointer ${
              item.is_watched
                ? "text-emerald-400 hover:bg-emerald-500/20"
                : "text-neutral-400 hover:text-white hover:bg-white/15"
            }`}
          >
            {item.is_watched ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Circle className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Favorite Toggle */}
          <button
            type="button"
            onClick={() => onToggleFavorite(item.file_path)}
            title={item.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
            className={`p-1.5 rounded-md transition duration-150 cursor-pointer ${
              item.is_favorite
                ? "text-rose-400 fill-rose-400 hover:bg-rose-500/20"
                : "text-neutral-400 hover:text-white hover:bg-white/15"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${item.is_favorite ? "fill-current" : ""}`} />
          </button>

          {/* Queue to Playlist */}
          <button
            type="button"
            onClick={() => onQueue(item.file_path)}
            title="Add to Playlist"
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/15 transition duration-150 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Edit Metadata */}
          <button
            type="button"
            onClick={() => onEdit(item)}
            title="Edit Details"
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/15 transition duration-150 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Bar (Bottom of artwork) */}
        {isPartiallyWatched && progressPercent && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-white/15 overflow-hidden z-10">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progressPercent}%`, backgroundColor: accentColor }}
            />
          </div>
        )}
      </div>

      {/* Information Meta Bar */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-1">
        <div>
          {/* Series Supertitle if episode */}
          {showSeriesTitle && item.series_name && (
            <p
              style={{ color: accentColor }}
              className="text-[10px] font-mono font-medium tracking-wide uppercase truncate mb-0.5"
            >
              {item.series_name}
            </p>
          )}

          {/* Title */}
          <h4
            className="text-xs font-semibold text-neutral-100 group-hover:text-white line-clamp-1 leading-snug tracking-tight"
            title={item.title}
          >
            {item.title}
          </h4>

          {/* Episode subtitle or Clean File Details */}
          {item.episode_title && item.episode_title !== item.title ? (
            <p className="text-[11px] text-neutral-400 truncate mt-0.5">
              {item.episode_title}
            </p>
          ) : null}
        </div>

        {/* Footer Meta Row */}
        <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-400 font-mono pt-1.5 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {item.season_number && item.episode_number ? (
              <span className="text-neutral-300 font-semibold shrink-0">
                S{String(item.season_number).padStart(2, "0")}E{String(item.episode_number).padStart(2, "0")}
              </span>
            ) : item.year ? (
              <span className="shrink-0">{item.year}</span>
            ) : (
              <span className="capitalize shrink-0">{item.category || item.media_type}</span>
            )}
            <span className="text-neutral-600 shrink-0">•</span>
            <span className="truncate">{formatBytes(item.file_size)}</span>
          </div>

          {/* Remaining resume time */}
          {remainingLabel ? (
            <span
              style={{ color: accentColor }}
              className="font-medium shrink-0 whitespace-nowrap px-1.5 py-0.2 rounded bg-white/[0.06] tabular-nums"
            >
              {remainingLabel}
            </span>
          ) : item.is_watched ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const MediaCard = memo(MediaCardBase);
