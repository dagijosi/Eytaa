import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Tv,
  Camera,
  Image as ImageIcon,
  RotateCcw,
  RectangleHorizontal,
  RectangleVertical,
  Search,
  X,
} from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  LibraryItem,
  libraryService,
} from "../../services/library/libraryService";
import { normalizeSeriesKey } from "../../utils/mediaTitle";
import { pickPosterItem } from "../../utils/mediaPoster";
import { useResolvedPoster } from "../../hooks/useResolvedPoster";
import { MediaCard } from "./MediaCard";
import { ProceduralPoster } from "./ProceduralPoster";

interface SeriesDetailViewProps {
  seriesName: string;
  items: LibraryItem[];
  searchQuery?: string;
  onClearSearch?: () => void;
  cardFormat?: "poster" | "widescreen";
  onToggleCardFormat?: (format: "poster" | "widescreen") => void;
  onBack: () => void;
  onPlay: (filePath: string, queueEpisodes?: string[]) => void;
  onQueue: (filePath: string) => void;
  onEdit: (item: LibraryItem) => void;
  onToggleFavorite: (filePath: string) => void;
  onRefreshData: () => Promise<void>;
}

export function SeriesDetailView({
  seriesName,
  items,
  searchQuery,
  onClearSearch,
  cardFormat = "widescreen",
  onToggleCardFormat,
  onBack,
  onPlay,
  onQueue,
  onEdit,
  onToggleFavorite,
  onRefreshData,
}: SeriesDetailViewProps) {
  const { accentColor, accentGlow, accentText } = useThemeStore();
  const [unfilteredEpisodes, setUnfilteredEpisodes] = useState<LibraryItem[]>([]);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);

  // Canonical series key for this view (prefers the stored series_key over re-normalizing)
  const seriesKey = useMemo(() => {
    const norm = normalizeSeriesKey(seriesName);
    for (const i of items) {
      if (!i.series_name) continue;
      if (
        i.series_key &&
        ((i.series_name || "").toLowerCase() === seriesName.toLowerCase() ||
          normalizeSeriesKey(i.series_name) === norm)
      ) {
        return i.series_key;
      }
    }
    return norm;
  }, [items, seriesName]);

  // Fetch full unfiltered series episodes if a search query is active
  useEffect(() => {
    let isMounted = true;
    if (searchQuery && searchQuery.trim()) {
      libraryService.getLibraryItems({ category: "series" }).then((allItems) => {
        if (isMounted) {
          const matched = allItems
            .filter((i) => (i.series_key ? i.series_key === seriesKey : normalizeSeriesKey(i.series_name) === seriesKey))
            .sort((a, b) => {
              const sA = (a.season_number ?? 1) === 0 ? Infinity : (a.season_number ?? 1);
              const sB = (b.season_number ?? 1) === 0 ? Infinity : (b.season_number ?? 1);
              if (sA !== sB) return sA - sB;
              return (a.episode_number ?? 0) - (b.episode_number ?? 0);
            });
          setUnfilteredEpisodes(matched);
        }
      });
    } else {
      setUnfilteredEpisodes([]);
      setShowAllEpisodes(false);
    }
    return () => {
      isMounted = false;
    };
  }, [seriesName, seriesKey, searchQuery]);

  // All episodes belonging to this series (using canonical key for robust grouping)
  const seriesEpisodes = useMemo(() => {
    if (showAllEpisodes && unfilteredEpisodes.length > 0) {
      return unfilteredEpisodes;
    }
    return items
      .filter((i) =>
        i.series_key ? i.series_key === seriesKey : normalizeSeriesKey(i.series_name) === seriesKey,
      )
      .sort((a, b) => {
        const sA = (a.season_number ?? 1) === 0 ? Infinity : (a.season_number ?? 1);
        const sB = (b.season_number ?? 1) === 0 ? Infinity : (b.season_number ?? 1);
        if (sA !== sB) return sA - sB;
        const eA = a.episode_number ?? 0;
        const eB = b.episode_number ?? 0;
        return eA - eB;
      });
  }, [items, seriesKey, showAllEpisodes, unfilteredEpisodes]);

  // Prefer the first episode with a custom poster, falling back to the first episode.
  const posterItem = useMemo(
    () => pickPosterItem(seriesEpisodes) ?? seriesEpisodes[0],
    [seriesEpisodes],
  );

  // Dynamic series hero poster
  const [heroThumb, setHeroThumb] = useResolvedPoster(
    posterItem?.custom_poster,
    posterItem?.file_path,
  );
  const hasCustomCover = Boolean(posterItem?.custom_poster?.trim());

  // Helper to play an episode and automatically enqueue subsequent episodes in playlist
  const handlePlayEpisodeWithQueue = (targetPath: string) => {
    const currentIndex = seriesEpisodes.findIndex(
      (ep) => ep.file_path === targetPath,
    );
    const remaining =
      currentIndex >= 0
        ? seriesEpisodes.slice(currentIndex + 1).map((ep) => ep.file_path)
        : [];
    onPlay(targetPath, remaining);
  };

  // Extract distinct seasons (specials/season 0 last)
  const seasons = useMemo(() => {
    const sSet = new Set<number>();
    for (const ep of seriesEpisodes) {
      sSet.add(ep.season_number ?? 1);
    }
    return Array.from(sSet).sort((a, b) => {
      const sa = a === 0 ? Infinity : a;
      const sb = b === 0 ? Infinity : b;
      return sa - sb;
    });
  }, [seriesEpisodes]);

  const [activeSeason, setActiveSeason] = useState<number | "all">(
    seasons.length > 0 ? seasons[0] : "all",
  );

  // Per-season progress summaries (shown on the season pills)
  const seasonSummaries = useMemo(
    () =>
      seasons.map((season) => {
        const seasonEps = seriesEpisodes.filter(
          (ep) => (ep.season_number ?? 1) === season,
        );
        return {
          season,
          total: seasonEps.length,
          watched: seasonEps.filter((ep) => ep.is_watched).length,
        };
      }),
    [seasons, seriesEpisodes],
  );

  const activeSeasonLabel =
    activeSeason === "all"
      ? "All Episodes"
      : activeSeason === 0
        ? "Specials"
        : `Season ${activeSeason}`;

  // Filter episodes by season
  const displayEpisodes = useMemo(() => {
    if (activeSeason === "all") return seriesEpisodes;
    return seriesEpisodes.filter(
      (ep) => (ep.season_number ?? 1) === activeSeason,
    );
  }, [seriesEpisodes, activeSeason]);

  // Total watch metrics
  const watchedCount = seriesEpisodes.filter((ep) => ep.is_watched).length;
  const totalCount = seriesEpisodes.length;
  const seriesProgressPercent =
    totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;

  // Next episode up (specials are never auto-suggested)
  const nextEpisode = useMemo(() => {
    const playable = seriesEpisodes.filter((ep) => (ep.season_number ?? 1) !== 0);

    // 1. Look for partially watched episode
    const inProgress = playable.find(
      (ep) =>
        !ep.is_watched &&
        typeof ep.resume_position === "number" &&
        ep.resume_position > 10 &&
        ep.duration &&
        ep.resume_position < ep.duration * 0.9,
    );
    if (inProgress) return inProgress;

    // 2. Look for first unwatched episode
    return playable.find((ep) => !ep.is_watched) || playable[0] || seriesEpisodes[0];
  }, [seriesEpisodes]);

  // Toggle single episode watched
  const handleToggleWatched = async (
    filePath: string,
    currentWatched: boolean,
  ) => {
    try {
      await libraryService.setWatchedStatus(filePath, !currentWatched);
      await onRefreshData();
    } catch (e) {
      console.error("Toggle watched error:", e);
    }
  };

  // Toggle entire series watched
  const handleToggleSeriesWatched = async () => {
    const shouldWatch = watchedCount < totalCount;
    try {
      await libraryService.setSeriesWatchedStatus(seriesKey, shouldWatch);
      await onRefreshData();
    } catch (e) {
      console.error("Series watched toggle error:", e);
    }
  };

  // Toggle season watched
  const handleToggleSeasonWatched = async (season: number) => {
    const seasonEps = seriesEpisodes.filter(
      (ep) => (ep.season_number ?? 1) === season,
    );
    const seasonWatchedCount = seasonEps.filter((ep) => ep.is_watched).length;
    const shouldWatch = seasonWatchedCount < seasonEps.length;
    try {
      await libraryService.setSeriesWatchedStatus(
        seriesKey,
        shouldWatch,
        season,
      );
      await onRefreshData();
    } catch (e) {
      console.error("Season watched toggle error:", e);
    }
  };

  // Change cover for entire series
  const [isChangingCover, setIsChangingCover] = useState(false);
  const handleChangeCover = async () => {
    try {
      setIsChangingCover(true);
      const selected = await openDialog({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Images",
            extensions: ["jpg", "jpeg", "png", "webp", "bmp"],
          },
        ],
      });
      if (selected && typeof selected === "string" && posterItem) {
        await libraryService.updateMediaMetadata({
          filePath: posterItem.file_path,
          title: posterItem.title,
          category: "series",
          seriesName: seriesName,
          customPoster: selected,
          applyToSeries: true,
        });
        await onRefreshData();
      }
    } catch (e) {
      console.error("Change series cover error:", e);
    } finally {
      setIsChangingCover(false);
    }
  };

  const handleResetCover = async () => {
    try {
      if (!posterItem) return;
      await libraryService.updateMediaMetadata({
        filePath: posterItem.file_path,
        title: posterItem.title,
        category: "series",
        seriesName: seriesName,
        customPoster: undefined,
        applyToSeries: true,
      });
      await onRefreshData();
    } catch (e) {
      console.error("Reset series cover error:", e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
      {/* Active Search Banner in Series Detail */}
      {searchQuery && searchQuery.trim() && (
        <div className="rounded-2xl bg-sky-500/10 border border-sky-500/25 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-sky-200 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate">
              {showAllEpisodes ? (
                <span>
                  Showing all <strong className="text-white">{seriesEpisodes.length}</strong> episodes (search filter bypassed).
                </span>
              ) : (
                <span>
                  Search active: filtering for <strong className="text-white">"{searchQuery}"</strong> (showing {seriesEpisodes.length} of {unfilteredEpisodes.length || seriesEpisodes.length} episodes).
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {unfilteredEpisodes.length > seriesEpisodes.length && !showAllEpisodes && (
              <button
                type="button"
                onClick={() => setShowAllEpisodes(true)}
                className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-white font-medium transition cursor-pointer"
              >
                Show All {unfilteredEpisodes.length} Episodes
              </button>
            )}
            {showAllEpisodes && (
              <button
                type="button"
                onClick={() => setShowAllEpisodes(false)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition cursor-pointer"
              >
                Re-apply Filter
              </button>
            )}
            {onClearSearch && (
              <button
                type="button"
                onClick={onClearSearch}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Search</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer self-start shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to TV Shows</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
          {/* Format toggle: Landscape vs Portrait */}
          {onToggleCardFormat && (
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => onToggleCardFormat("widescreen")}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  cardFormat === "widescreen"
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
                title="Landscape View (16:9 Widescreen)"
              >
                <RectangleHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleCardFormat("poster")}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  cardFormat === "poster"
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
                title="Portrait / Poster View (2:3)"
              >
                <RectangleVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleChangeCover}
            disabled={isChangingCover}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{hasCustomCover ? "Change Cover" : "Add Cover"}</span>
          </button>
          {hasCustomCover && (
            <button
              type="button"
              onClick={handleResetCover}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 text-xs text-neutral-400 hover:text-rose-400 transition cursor-pointer"
              title="Reset to default artwork"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleSeriesWatched}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {watchedCount === totalCount
                ? "Mark Unwatched"
                : "Mark as Watched"}
            </span>
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="relative rounded-3xl bg-neutral-900/80 border border-white/10 overflow-hidden p-6 sm:p-8 flex flex-col md:flex-row items-center sm:items-start gap-6 shadow-2xl">
        {/* Ambient glow */}
        <div
          style={{ backgroundColor: accentGlow }}
          className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-40"
        />

        {/* Cinematic Ambient Backdrop from series artwork */}
        {heroThumb && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <img src={heroThumb} alt="" className="w-full h-full object-cover blur-3xl scale-125" />
          </div>
        )}

        {/* Poster preview with hover edit cover overlay */}
        <div
          className={`group/poster relative rounded-2xl overflow-hidden shrink-0 shadow-2xl border border-white/10 bg-neutral-950 transition-all duration-300 ${
            cardFormat === "widescreen"
              ? "aspect-video w-56 sm:w-72 md:w-80"
              : "aspect-[2/3] w-36 sm:w-48"
          }`}
        >
          {heroThumb ? (
            <>
              <img
                src={heroThumb}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-xl opacity-45 scale-125 pointer-events-none"
              />
              <img
                src={heroThumb}
                alt={seriesName}
                className="relative w-full h-full object-contain transition-transform duration-500 group-hover/poster:scale-105 drop-shadow-md"
                onError={() => setHeroThumb(null)}
              />
            </>
          ) : (
            <ProceduralPoster
              title={seriesName}
              category="series"
              year={seriesEpisodes[0]?.year}
              aspectRatio={cardFormat === "widescreen" ? "video" : "poster"}
            />
          )}

          {/* Interactive hover overlay to click-and-change cover */}
          <button
            type="button"
            onClick={handleChangeCover}
            disabled={isChangingCover}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover/poster:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white cursor-pointer z-10"
            title="Click to change series cover"
          >
            <div className="p-2.5 rounded-full bg-white/20 border border-white/20 hover:scale-110 transition">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-bold">Change Cover</span>
          </button>
        </div>

        {/* Series Info & Actions */}
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase mb-1">
              <Tv className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>TV SERIES</span>
              <span>•</span>
              <span>
                {seasons.length} {seasons.length === 1 ? "Season" : "Seasons"}
              </span>
              <span>•</span>
              <span>
                {totalCount} {totalCount === 1 ? "Episode" : "Episodes"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {seriesName}
            </h1>

            {/* Overall Watch Progress Bar */}
            <div className="mt-4 max-w-md space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">Progress</span>
                <span className="text-neutral-200 font-bold">
                  {watchedCount} / {totalCount} watched ({seriesProgressPercent}
                  %)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  style={{
                    width: `${seriesProgressPercent}%`,
                    backgroundColor: accentColor,
                  }}
                  className="h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Play Next Episode */}
          {nextEpisode && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() =>
                  handlePlayEpisodeWithQueue(nextEpisode.file_path)
                }
                style={{
                  backgroundColor: accentColor,
                  color: accentText,
                  boxShadow: `0 6px 20px ${accentGlow}`,
                }}
                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black tracking-wide uppercase transition hover:brightness-110 active:scale-95 cursor-pointer shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {typeof nextEpisode.resume_position === "number" &&
                  nextEpisode.resume_position > 10
                    ? `Resume S${String(nextEpisode.season_number ?? 1).padStart(2, "0")}E${String(
                        nextEpisode.episode_number ?? 1,
                      ).padStart(2, "0")}`
                    : `Play Next: S${String(nextEpisode.season_number ?? 1).padStart(2, "0")}E${String(
                        nextEpisode.episode_number ?? 1,
                      ).padStart(2, "0")}`}
                </span>
              </button>

              <span className="text-xs text-neutral-400 font-medium truncate max-w-xs">
                {nextEpisode.episode_title || nextEpisode.title}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Season Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
          {seasons.map((season) => {
            const isSelected = activeSeason === season;
            const summary = seasonSummaries.find((s) => s.season === season);
            const label = season === 0 ? "Specials" : `Season ${season}`;
            return (
              <button
                key={season}
                type="button"
                onClick={() => setActiveSeason(season)}
                style={
                  isSelected
                    ? {
                        backgroundColor: accentColor,
                        color: accentText,
                        borderColor: accentColor,
                        boxShadow: `0 2px 10px ${accentGlow}`,
                      }
                    : undefined
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                  isSelected
                    ? "font-bold"
                    : "bg-white/5 border-white/5 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/15"
                }`}
                title={`${label} — ${summary?.watched ?? 0}/${summary?.total ?? 0} watched`}
              >
                <span>{label}</span>
                <span
                  className={`text-[9px] font-mono ${
                    isSelected ? "opacity-70" : "text-neutral-500"
                  }`}
                >
                  {summary?.watched ?? 0}/{summary?.total ?? 0}
                </span>
              </button>
            );
          })}

          {seasons.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveSeason("all")}
              style={
                activeSeason === "all"
                  ? {
                      backgroundColor: accentColor,
                      color: accentText,
                      borderColor: accentColor,
                      boxShadow: `0 2px 10px ${accentGlow}`,
                    }
                  : undefined
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                activeSeason === "all"
                  ? "font-bold"
                  : "bg-white/5 border-white/5 text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/15"
              }`}
              title={`All Episodes — ${watchedCount}/${totalCount} watched`}
            >
              <span>All Episodes</span>
              <span
                className={`text-[9px] font-mono ${
                  activeSeason === "all" ? "opacity-70" : "text-neutral-500"
                }`}
              >
                {watchedCount}/{totalCount}
              </span>
            </button>
          )}
        </div>

        {/* Mark Season Watched */}
        {typeof activeSeason === "number" && (
          <button
            onClick={() => handleToggleSeasonWatched(activeSeason)}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mark {activeSeasonLabel} Watched</span>
          </button>
        )}
      </div>

      {/* Episodes Grid */}
      <div
        className={`grid gap-4 ${
          cardFormat === "widescreen"
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        }`}
      >
        {displayEpisodes.map((ep) => (
          <MediaCard
            key={ep.file_path}
            item={ep}
            viewFormat={cardFormat}
            showSeriesTitle={false}
            badge={
              ep.season_number && ep.episode_number
                ? `S${String(ep.season_number).padStart(2, "0")}E${String(
                    ep.episode_number,
                  ).padStart(2, "0")}`
                : undefined
            }
            onPlay={handlePlayEpisodeWithQueue}
            onQueue={onQueue}
            onEdit={onEdit}
            onToggleFavorite={onToggleFavorite}
            onToggleWatched={handleToggleWatched}
          />
        ))}
      </div>
    </div>
  );
}
