import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Film,
  Tv,
  Music,
  HardDrive,
  Search,
  Trash2,
  Play,
  Archive,
  RefreshCw,
  FolderCheck,
  LayoutGrid,
  List,
  X,
  ArrowUpDown,
  Laptop,
} from "lucide-react";
import {
  libraryService,
  FullWatchReport,
  WatchedArchiveItem,
  SeriesReportItem,
  LibraryItem,
  ActivityTrendItem,
} from "../../services/library/libraryService";
import { useResolvedPoster } from "../../hooks/useResolvedPoster";
import { ProceduralPoster } from "./ProceduralPoster";
import { SelectDropdown, SelectDropdownOption } from "../common/SelectDropdown";

interface WatchReportDashboardProps {
  onPlayFile?: (filePath: string) => void;
  onDeleteFile?: (item: LibraryItem) => void;
}

const PAGE_SIZE = 25;

type StorageStatusFilter = "all" | "on_disk" | "archived";
type SortOption = "recent" | "size_desc" | "title" | "duration";

const SORT_OPTIONS: SelectDropdownOption<SortOption>[] = [
  {
    value: "recent",
    label: "Recently Watched",
    shortLabel: "Recent First",
    desc: "Newest watch records first",
  },
  {
    value: "size_desc",
    label: "File Size (Largest)",
    shortLabel: "Largest File Size",
    desc: "Heaviest files on laptop first",
  },
  {
    value: "title",
    label: "Title (A – Z)",
    shortLabel: "Title (A – Z)",
    desc: "Alphabetical by media name",
  },
  {
    value: "duration",
    label: "Duration (Longest)",
    shortLabel: "Longest Duration",
    desc: "Longest playback runtime first",
  },
];

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`.trim();
  }
  return `${minutes}m`;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let b = bytes;
  let idx = 0;
  while (b >= 1024 && idx < units.length - 1) {
    b /= 1024;
    idx++;
  }
  return `${b.toFixed(1)} ${units[idx]}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr.replace(" ", "T"));
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function archiveItemToLibraryItem(item: WatchedArchiveItem): LibraryItem {
  return {
    id: item.id,
    folder_path: "",
    file_path: item.file_path || "",
    file_name: item.file_name || item.title,
    title: item.title,
    media_type: (item.media_type as "video" | "audio") || "video",
    file_size: item.file_size || 0,
    duration: item.duration,
    last_modified: 0,
    added_at: item.watched_at,
    is_favorite: false,
    is_available: item.is_still_on_disk,
    is_duplicate: false,
    category: item.category,
    series_name: item.series_name,
    season_number: item.season_number,
    episode_number: item.episode_number,
    episode_title: item.episode_title,
    year: item.year,
    is_watched: true,
    manual_override: false,
    custom_poster: item.custom_poster,
    series_key: item.series_key,
  };
}

function MediaDistributionDonut({
  moviesCount,
  seriesEpisodesCount,
  musicCount,
  totalItems,
}: {
  moviesCount: number;
  seriesEpisodesCount: number;
  musicCount: number;
  totalItems: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const radius = 52;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~326.72

  const segments = useMemo(() => {
    if (totalItems <= 0) return [];
    const items = [
      { name: "Movies", count: moviesCount, color: "#f43f5e" },
      { name: "TV Episodes", count: seriesEpisodesCount, color: "#8b5cf6" },
      { name: "Music", count: musicCount, color: "#f59e0b" },
    ].filter((s) => s.count > 0);

    let currentOffset = 0;
    return items.map((item, idx) => {
      const pct = item.count / totalItems;
      const strokeDasharray = `${pct * circumference} ${circumference}`;
      const strokeDashoffset = -currentOffset;
      currentOffset += pct * circumference;
      return {
        ...item,
        idx,
        pct: Math.round(pct * 100),
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [moviesCount, seriesEpisodesCount, musicCount, totalItems, circumference]);

  return (
    <div className="flex flex-col items-center justify-between w-full h-full min-h-[170px] py-1 select-none">
      {/* SVG Donut */}
      <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
          {/* Background Track */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="transparent"
            stroke="#262626"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg) => (
            <circle
              key={seg.name}
              cx="65"
              cy="65"
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={hoveredIdx === seg.idx ? strokeWidth + 2 : strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              strokeLinecap="butt"
              className="transition-all duration-150 cursor-pointer"
              onMouseEnter={() => setHoveredIdx(seg.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] font-mono tracking-wider text-neutral-500 uppercase">
            {hoveredIdx !== null && segments[hoveredIdx]
              ? segments[hoveredIdx].name
              : "Completed"}
          </span>
          <span className="text-lg font-bold font-mono text-white tabular-nums leading-tight">
            {hoveredIdx !== null && segments[hoveredIdx]
              ? segments[hoveredIdx].count
              : totalItems}
          </span>
          {hoveredIdx !== null && segments[hoveredIdx] && (
            <span className="text-[9px] font-mono text-neutral-400">
              {segments[hoveredIdx].pct}%
            </span>
          )}
        </div>
      </div>

      {/* Legend Ribbon */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 w-full">
        <div
          onMouseEnter={() => setHoveredIdx(0)}
          onMouseLeave={() => setHoveredIdx(null)}
          className={`flex items-center gap-1.5 text-[10px] font-mono transition cursor-default ${
            hoveredIdx === 0 ? "text-white" : "text-neutral-400"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>Movies</span>
          <span className="text-neutral-500 tabular-nums">({moviesCount})</span>
        </div>
        <div
          onMouseEnter={() => setHoveredIdx(1)}
          onMouseLeave={() => setHoveredIdx(null)}
          className={`flex items-center gap-1.5 text-[10px] font-mono transition cursor-default ${
            hoveredIdx === 1 ? "text-white" : "text-neutral-400"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
          <span>Episodes</span>
          <span className="text-neutral-500 tabular-nums">({seriesEpisodesCount})</span>
        </div>
        <div
          onMouseEnter={() => setHoveredIdx(2)}
          onMouseLeave={() => setHoveredIdx(null)}
          className={`flex items-center gap-1.5 text-[10px] font-mono transition cursor-default ${
            hoveredIdx === 2 ? "text-white" : "text-neutral-400"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <span>Music</span>
          <span className="text-neutral-500 tabular-nums">({musicCount})</span>
        </div>
      </div>
    </div>
  );
}

function WatchVolumeTrendChart({
  activity,
  totalRuntimeSeconds,
}: {
  activity: ActivityTrendItem[];
  totalRuntimeSeconds?: number;
}) {
  const [hoveredDay, setHoveredDay] = useState<ActivityTrendItem | null>(null);

  // Compute maximum daily total for proportional heights
  const maxDayCount = useMemo(() => {
    let max = 0;
    for (const a of activity) {
      const dayTotal = (a.movies_count || 0) + (a.episodes_count || 0) + (a.music_count || 0);
      if (dayTotal > max) max = dayTotal;
    }
    return Math.max(max, 4);
  }, [activity]);

  // Y-axis grid marks
  const yTicks = useMemo(() => {
    const step = Math.ceil(maxDayCount / 4);
    return [step * 4, step * 3, step * 2, step * 1];
  }, [maxDayCount]);

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[170px] select-none">
      {/* Header Bar with Legend */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-medium text-neutral-300 uppercase tracking-wider">
            Watch Volume Trend
          </span>
          {totalRuntimeSeconds !== undefined && (
            <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">
              Total runtime: {formatDuration(totalRuntimeSeconds)}
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Movies</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <span>Episodes</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Music</span>
          </span>
        </div>
      </div>

      {/* Bar Chart Area */}
      {activity.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-xs font-mono text-neutral-600">
          No watch activity recorded in this period
        </div>
      ) : (
        <div className="relative h-32 flex flex-col justify-end mt-2">
          {/* Subtle horizontal grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5">
            {yTicks.map((tick) => (
              <div
                key={tick}
                className="w-full border-b border-white/[0.04] flex items-center justify-between"
              >
                <span className="text-[8px] font-mono text-neutral-600 -mt-2">
                  {tick}
                </span>
              </div>
            ))}
            <div className="w-full border-b border-white/[0.08]" />
          </div>

          {/* Stacked Bars Columns */}
          <div className="relative z-10 flex items-end justify-around gap-2 h-full pb-5 pl-6 pr-1">
            {activity.map((item) => {
              const total =
                (item.movies_count || 0) +
                (item.episodes_count || 0) +
                (item.music_count || 0);

              const maxScale = yTicks[0] || maxDayCount;
              const moviesH = ((item.movies_count || 0) / maxScale) * 100;
              const episodesH = ((item.episodes_count || 0) / maxScale) * 100;
              const musicH = ((item.music_count || 0) / maxScale) * 100;

              const label = item.period.length > 5 ? item.period.slice(5) : item.period; // MM-DD
              const isHovered = hoveredDay?.period === item.period;

              return (
                <div
                  key={item.period}
                  onMouseEnter={() => setHoveredDay(item)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className="flex-1 max-w-[48px] h-full flex flex-col justify-end items-center group cursor-pointer relative"
                >
                  {/* Stacked Bar */}
                  <div
                    className={`w-full max-w-[28px] rounded-t-sm overflow-hidden flex flex-col-reverse transition-all duration-150 ${
                      isHovered ? "brightness-125 scale-x-105" : "hover:brightness-110"
                    }`}
                    style={{
                      height: `${Math.min(100, Math.max(total > 0 ? 6 : 2, moviesH + episodesH + musicH))}%`,
                    }}
                  >
                    {item.movies_count > 0 && (
                      <div
                        style={{ height: `${(moviesH / (moviesH + episodesH + musicH)) * 100}%` }}
                        className="w-full bg-rose-500 min-h-[2px]"
                      />
                    )}
                    {item.episodes_count > 0 && (
                      <div
                        style={{ height: `${(episodesH / (moviesH + episodesH + musicH)) * 100}%` }}
                        className="w-full bg-violet-500 min-h-[2px]"
                      />
                    )}
                    {item.music_count > 0 && (
                      <div
                        style={{ height: `${(musicH / (moviesH + episodesH + musicH)) * 100}%` }}
                        className="w-full bg-amber-500 min-h-[2px]"
                      />
                    )}
                    {total === 0 && (
                      <div className="w-full h-[2px] bg-white/[0.08]" />
                    )}
                  </div>

                  {/* Date Label on X-Axis */}
                  <span
                    className={`absolute -bottom-4.5 text-[9px] font-mono transition ${
                      isHovered ? "text-white font-bold" : "text-neutral-500"
                    }`}
                  >
                    {label}
                  </span>

                  {/* Hover Tooltip Card */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-2 z-30 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/20 shadow-xl pointer-events-none whitespace-nowrap text-left animate-in fade-in duration-150">
                      <div className="text-[10px] font-mono font-bold text-white border-b border-white/10 pb-1 mb-1">
                        {item.period}
                      </div>
                      <div className="space-y-0.5 text-[9px] font-mono">
                        <div className="flex items-center justify-between gap-3 text-rose-300">
                          <span>Movies:</span>
                          <span className="font-bold">{item.movies_count || 0}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-violet-300">
                          <span>Episodes:</span>
                          <span className="font-bold">{item.episodes_count || 0}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-amber-300">
                          <span>Music:</span>
                          <span className="font-bold">{item.music_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TrackerSeriesCard({
  series,
  isSelected,
  onClick,
}: {
  series: SeriesReportItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [thumbSrc, setThumbSrc] = useResolvedPoster(
    series.custom_poster,
    series.sample_file_path,
  );

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col rounded-xl border transition-all duration-150 overflow-hidden cursor-pointer select-none ${
        isSelected
          ? "bg-violet-950/40 border-violet-500 shadow-md ring-1 ring-violet-500/50"
          : "bg-neutral-900/60 hover:bg-neutral-900/90 border-white/[0.08] hover:border-white/[0.2]"
      }`}
    >
      {/* 16:9 Widescreen Artwork Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
        {thumbSrc ? (
          <>
            <img
              src={thumbSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-125 pointer-events-none"
            />
            <img
              src={thumbSrc}
              alt={series.series_name}
              className="relative w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
              onError={() => setThumbSrc(null)}
            />
          </>
        ) : (
          <ProceduralPoster
            title={series.series_name}
            category="series"
            year={series.year}
            aspectRatio="video"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent pointer-events-none" />

        {/* Top Floating Badges */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10 pointer-events-none">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/75 text-neutral-300 border border-white/10 backdrop-blur-md">
            {series.total_seasons_watched} {series.total_seasons_watched === 1 ? "Season" : "Seasons"}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-violet-500/25 text-violet-300 border border-violet-500/40 backdrop-blur-md">
            {series.total_episodes_watched} eps
          </span>
        </div>

        {/* Season Chips along the bottom edge of artwork */}
        <div className="absolute bottom-1.5 left-2 right-2 flex flex-wrap gap-1 z-10 pointer-events-none">
          {series.seasons_breakdown.map((sb) => (
            <span
              key={sb.season_number}
              className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-black/80 text-neutral-300 border border-white/15"
            >
              S{sb.season_number}: {sb.episodes_watched}
            </span>
          ))}
        </div>
      </div>

      {/* Series Details Bar */}
      <div className="p-2.5 flex items-center justify-between gap-2 bg-neutral-900/40">
        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-white truncate">{series.series_name}</h4>
          {series.last_watched_at && (
            <p className="text-[10px] font-mono text-neutral-500 truncate mt-0.5">
              Watched {formatDate(series.last_watched_at)}
            </p>
          )}
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-md border shrink-0 transition ${
            isSelected
              ? "bg-violet-500 text-white border-violet-400 font-bold"
              : "bg-white/[0.04] text-neutral-400 border-white/[0.08] group-hover:text-white group-hover:bg-white/[0.08]"
          }`}
        >
          {isSelected ? "Filtering" : "View"}
        </span>
      </div>
    </div>
  );
}

export function WatchReportDashboard({ onPlayFile, onDeleteFile }: WatchReportDashboardProps) {
  const [report, setReport] = useState<FullWatchReport | null>(null);
  const [archiveItems, setArchiveItems] = useState<WatchedArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [categoryFilter, setCategoryFilter] = useState<"all" | "movie" | "series" | "music">("all");
  const [storageFilter, setStorageFilter] = useState<StorageStatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<SeriesReportItem | null>(null);
  const [seriesViewMode, setSeriesViewMode] = useState<"grid" | "list">("grid");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Compute query search taking into account series filtering
  const effectiveSearch = useMemo(() => {
    if (selectedSeries) {
      return selectedSeries.series_name;
    }
    return searchQuery.trim() || undefined;
  }, [selectedSeries, searchQuery]);

  const effectiveCategory = useMemo(() => {
    if (selectedSeries) {
      return "series";
    }
    return categoryFilter !== "all" ? categoryFilter : undefined;
  }, [selectedSeries, categoryFilter]);

  // Load report summary and first page of archive
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [rep, items] = await Promise.all([
        libraryService.getWatchReport(),
        libraryService.getWatchedArchive({
          category: effectiveCategory,
          search: effectiveSearch,
          limit: PAGE_SIZE,
          offset: 0,
        }),
      ]);
      setReport(rep);
      setArchiveItems(items);
      setPage(0);
      setHasMore(items.length >= PAGE_SIZE);
    } catch (e) {
      console.error("Failed to load watch report:", e);
    } finally {
      setLoading(false);
    }
  }, [effectiveCategory, effectiveSearch]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load next page of archive items automatically
  const loadNextPage = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const nextOffset = nextPage * PAGE_SIZE;
      const newItems = await libraryService.getWatchedArchive({
        category: effectiveCategory,
        search: effectiveSearch,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });

      if (newItems.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setArchiveItems((prev) => [...prev, ...newItems]);
      setPage(nextPage);
    } catch (e) {
      console.error("Failed to load more archive items:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loading, page, effectiveCategory, effectiveSearch]);

  // AUTOMATIC INFINITE SCROLL: IntersectionObserver watches sentinel element at the bottom
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadNextPage();
        }
      },
      { root: scrollContainerRef.current, rootMargin: "250px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage, hasMore, loadingMore, loading]);

  // Secondary scroll backup for infinite scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 300 && hasMore && !loadingMore && !loading) {
      loadNextPage();
    }
  };

  const handleDeleteArchive = async (id: number) => {
    try {
      setDeletingId(id);
      await libraryService.deleteArchiveItem(id);
      setArchiveItems((prev) => prev.filter((i) => i.id !== id));
      const rep = await libraryService.getWatchReport();
      setReport(rep);
    } catch (e) {
      console.error("Failed to delete archive item:", e);
    } finally {
      setDeletingId(null);
    }
  };

  const summary = report?.summary;
  const moviesCount = summary?.total_movies_watched || 0;
  const seriesEpisodesCount = summary?.total_episodes_watched || 0;
  const musicCount = summary?.total_music_listened || 0;
  const totalItems = moviesCount + seriesEpisodesCount + musicCount;

  // Filter and sort items locally for storage status and order
  const displayedArchiveItems = useMemo(() => {
    let list = [...archiveItems];

    // Storage filter
    if (storageFilter === "on_disk") {
      list = list.filter((i) => i.is_still_on_disk);
    } else if (storageFilter === "archived") {
      list = list.filter((i) => !i.is_still_on_disk);
    }

    // Sort order
    if (sortBy === "size_desc") {
      list.sort((a, b) => (b.file_size || 0) - (a.file_size || 0));
    } else if (sortBy === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "duration") {
      list.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    } else {
      // Recent first
      list.sort((a, b) => new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime());
    }

    return list;
  }, [archiveItems, storageFilter, sortBy]);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-5 py-4 space-y-4 relative text-neutral-200"
    >
      {/* Precision Header & Actions */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
            <span>Watch Activity & Analytics</span>
            <span className="text-[10px] font-mono text-neutral-400 border border-white/10 px-1.5 py-0.2 rounded-md">
              OBSIDIAN v3
            </span>
          </h2>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Decoupled watch archive. Delete files to reclaim disk space while permanently retaining watch stats.
          </p>
        </div>

        <button
          onClick={loadInitialData}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-neutral-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          <span>Sync</span>
        </button>
      </div>

      {/* Unified Compact KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Movies */}
        <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Movies</span>
            <div className="text-lg font-bold text-white font-mono tabular-nums leading-tight mt-0.5">
              {summary?.total_movies_watched || 0}
            </div>
            <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
              {formatDuration(summary?.total_movie_duration_seconds)}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <Film className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* TV Series */}
        <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">TV Series</span>
            <div className="text-lg font-bold text-white font-mono tabular-nums leading-tight mt-0.5">
              {summary?.total_series_count || 0} <span className="text-xs font-normal text-neutral-500">shows</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
              {summary?.total_episodes_watched || 0} eps • {formatDuration(summary?.total_series_duration_seconds)}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
            <Tv className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Music */}
        <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Music</span>
            <div className="text-lg font-bold text-white font-mono tabular-nums leading-tight mt-0.5">
              {summary?.total_music_listened || 0}
            </div>
            <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
              {formatDuration(summary?.total_music_duration_seconds)}
            </span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Music className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Disk Reclaimed */}
        <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-white/[0.08] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Storage Saved</span>
            <div className="text-lg font-bold text-emerald-300 font-mono tabular-nums leading-tight mt-0.5">
              {formatBytes(summary?.total_disk_space_reclaimed_bytes)}
            </div>
            <span className="text-[10px] font-mono text-neutral-500">Freed from deleted media</span>
          </div>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <HardDrive className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Side-by-Side Responsive Analytics Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Media Distribution Donut */}
        <div className="p-3 rounded-xl bg-neutral-900/60 border border-white/[0.08] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono font-medium text-neutral-300 uppercase tracking-wider">
              Ratio
            </span>
            <span className="text-[10px] font-mono text-neutral-500">{totalItems} items</span>
          </div>
          <MediaDistributionDonut
            moviesCount={moviesCount}
            seriesEpisodesCount={seriesEpisodesCount}
            musicCount={musicCount}
            totalItems={totalItems}
          />
        </div>

        {/* Activity Timeline Bar Chart */}
        <div className="md:col-span-2 p-3 rounded-xl bg-neutral-900/60 border border-white/[0.08] flex flex-col justify-between">
          <WatchVolumeTrendChart
            activity={report?.recent_activity || []}
            totalRuntimeSeconds={summary?.total_watch_time_seconds}
          />
        </div>
      </div>

      {/* CINEMA-GRADE TV SERIES TRACKER */}
      {report?.series && report.series.length > 0 && (
        <section className="rounded-xl bg-neutral-900/60 border border-white/[0.08] p-3.5 space-y-3">
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-violet-400" />
                <span>TV Series Progress Tracker</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                {report.series.length} {report.series.length === 1 ? "show" : "shows"} tracked
              </span>
            </div>

            {/* View Mode & Selection Clear */}
            <div className="flex items-center gap-2">
              {selectedSeries && (
                <button
                  onClick={() => setSelectedSeries(null)}
                  className="px-2 py-0.5 rounded-md bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-[10px] font-mono text-violet-300 transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Filtering: {selectedSeries.series_name}</span>
                  <X className="w-3 h-3" />
                </button>
              )}

              <div className="flex items-center rounded-lg bg-black/40 border border-white/[0.08] p-0.5">
                <button
                  type="button"
                  onClick={() => setSeriesViewMode("grid")}
                  className={`p-1 rounded-md transition cursor-pointer ${
                    seriesViewMode === "grid"
                      ? "bg-white/10 text-white shadow-xs"
                      : "text-neutral-500 hover:text-white"
                  }`}
                  title="Poster Cards Grid"
                >
                  <LayoutGrid className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setSeriesViewMode("list")}
                  className={`p-1 rounded-md transition cursor-pointer ${
                    seriesViewMode === "list"
                      ? "bg-white/10 text-white shadow-xs"
                      : "text-neutral-500 hover:text-white"
                  }`}
                  title="Compact Data Table"
                >
                  <List className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Cards Grid Mode */}
          {seriesViewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {report.series.map((s) => (
                <TrackerSeriesCard
                  key={s.series_key}
                  series={s}
                  isSelected={selectedSeries?.series_key === s.series_key}
                  onClick={() => {
                    if (selectedSeries?.series_key === s.series_key) {
                      setSelectedSeries(null);
                    } else {
                      setSelectedSeries(s);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            /* Detailed Table Mode */
            <div className="rounded-lg border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
              {report.series.map((s) => {
                const isSelected = selectedSeries?.series_key === s.series_key;

                return (
                  <div
                    key={s.series_key}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSeries(null);
                      } else {
                        setSelectedSeries(s);
                      }
                    }}
                    className={`px-3 py-2 flex items-center justify-between gap-3 transition cursor-pointer ${
                      isSelected
                        ? "bg-violet-950/30 text-white"
                        : "hover:bg-white/[0.03] text-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                        <Tv className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{s.series_name}</span>
                          {s.year && <span className="text-[10px] font-mono text-neutral-500">({s.year})</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {s.seasons_breakdown.map((sb) => (
                            <span
                              key={sb.season_number}
                              className="px-1.5 py-0.2 rounded bg-white/[0.04] text-[9px] font-mono text-neutral-400 border border-white/5"
                            >
                              S{sb.season_number}: {sb.episodes_watched} eps
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-violet-300 tabular-nums">
                          {s.total_episodes_watched} eps
                        </div>
                        <div className="text-[10px] font-mono text-neutral-500">
                          {s.total_seasons_watched} {s.total_seasons_watched === 1 ? "Season" : "Seasons"}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                          isSelected
                            ? "bg-violet-500 text-white border-violet-400 font-bold"
                            : "bg-white/[0.04] text-neutral-400 border-white/[0.08]"
                        }`}
                      >
                        {isSelected ? "Active" : "Filter"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* WATCHED MEDIA ARCHIVE LOG WITH DISK/LAPTOP SORTING & INFINITE SCROLL */}
      <div className="rounded-xl bg-neutral-900/60 border border-white/[0.08] relative">
        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-white/[0.08] flex flex-col space-y-2.5 bg-neutral-900/40 rounded-t-xl">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-mono text-neutral-500 uppercase mr-1">Category:</span>
              {[
                { id: "all", label: "All" },
                { id: "movie", label: "Movies" },
                { id: "series", label: "Episodes" },
                { id: "music", label: "Music" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedSeries(null);
                    setCategoryFilter(tab.id as any);
                  }}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono transition cursor-pointer shrink-0 ${
                    categoryFilter === tab.id && !selectedSeries
                      ? "bg-white/10 text-white font-bold border border-white/20"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              {selectedSeries && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  <span>Series: {selectedSeries.series_name}</span>
                  <button onClick={() => setSelectedSeries(null)} className="hover:text-white">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter archive..."
                className="w-full pl-7 pr-3 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-xs font-mono text-white placeholder-neutral-600 focus:outline-hidden focus:border-white/20"
              />
            </div>
          </div>

          {/* Secondary Filter & Sort Toolbar: Laptop Storage Status + Sort By */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/[0.05]">
            {/* Storage Status Toggle */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-mono text-neutral-500 uppercase mr-1 flex items-center gap-1">
                <Laptop className="w-3 h-3" />
                <span>Laptop Status:</span>
              </span>
              {[
                { id: "all", label: "All Items" },
                { id: "on_disk", label: "On My Laptop (On Disk)" },
                { id: "archived", label: "Saved Space (Archived)" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStorageFilter(pill.id as StorageStatusFilter)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition cursor-pointer shrink-0 ${
                    storageFilter === pill.id
                      ? pill.id === "on_disk"
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                        : pill.id === "archived"
                        ? "bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40"
                        : "bg-white/10 text-white font-bold border border-white/20"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Custom Sort Dropdown */}
            <SelectDropdown<SortOption>
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
              label="Sort:"
              icon={<ArrowUpDown className="w-3.5 h-3.5" />}
              menuHeader="Sort Archive By"
              width="w-64"
            />
          </div>
        </div>

        {/* Items List */}
        {displayedArchiveItems.length === 0 ? (
          <div className="py-12 text-center space-y-1.5 text-neutral-500">
            <Archive className="w-6 h-6 mx-auto text-neutral-600" />
            <p className="text-xs font-mono">No watched records match your criteria</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {displayedArchiveItems.map((item) => {
              const isSeries = item.category === "series" || !!item.series_name;

              return (
                <div
                  key={item.id}
                  className="px-3 py-2 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                        item.category === "movie"
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                          : isSeries
                          ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      }`}
                    >
                      {item.category === "movie" ? (
                        <Film className="w-3.5 h-3.5" />
                      ) : isSeries ? (
                        <Tv className="w-3.5 h-3.5" />
                      ) : (
                        <Music className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white truncate">{item.title}</span>
                        {item.year && (
                          <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                            ({item.year})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 truncate">
                        {isSeries && item.series_name && (
                          <>
                            <span className="text-neutral-300 truncate">{item.series_name}</span>
                            <span className="text-neutral-600">•</span>
                            <span>S{item.season_number ?? 1} E{item.episode_number ?? 1}</span>
                            <span className="text-neutral-600">•</span>
                          </>
                        )}
                        <span>{formatDate(item.watched_at)}</span>
                        {item.duration && item.duration > 0 && (
                          <>
                            <span className="text-neutral-600">•</span>
                            <span className="tabular-nums">{formatDuration(item.duration)}</span>
                          </>
                        )}
                        {item.file_size && item.file_size > 0 && (
                          <>
                            <span className="text-neutral-600">•</span>
                            <span className="tabular-nums text-neutral-400 font-bold">{formatBytes(item.file_size)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.is_still_on_disk ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <FolderCheck className="w-2.5 h-2.5" />
                        <span>On My Laptop</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        <Archive className="w-2.5 h-2.5" />
                        <span>Saved {item.file_size ? formatBytes(item.file_size) : ""}</span>
                      </span>
                    )}

                    {/* Play if on disk */}
                    {item.is_still_on_disk && item.file_path && onPlayFile && (
                      <button
                        type="button"
                        onClick={() => onPlayFile(item.file_path!)}
                        className="p-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white transition cursor-pointer"
                        title="Play"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    )}

                    {/* DELETE FILE FROM LAPTOP (Trigger DeleteMediaModal) */}
                    {item.is_still_on_disk && item.file_path && onDeleteFile ? (
                      <button
                        type="button"
                        onClick={() => onDeleteFile(archiveItemToLibraryItem(item))}
                        className="px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-[10px] font-mono font-semibold transition cursor-pointer flex items-center gap-1"
                        title="Delete this movie/episode file from your laptop"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Delete File</span>
                      </button>
                    ) : (
                      /* Delete Archive Record */
                      <button
                        type="button"
                        onClick={() => handleDeleteArchive(item.id)}
                        disabled={deletingId === item.id}
                        className="p-1 rounded-md text-neutral-600 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Remove from Watch Log"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Automatic Infinite Scroll Sentinel Element */}
        <div ref={sentinelRef} className="h-6 w-full flex items-center justify-center p-2">
          {loadingMore && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Loading more records...</span>
            </div>
          )}
          {!hasMore && displayedArchiveItems.length > 0 && (
            <span className="text-[10px] font-mono text-neutral-600">All watched records loaded</span>
          )}
        </div>
      </div>
    </div>
  );
}
