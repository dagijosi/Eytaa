import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  X,
  Search,
  FolderPlus,
  RefreshCw,
  Folder,
  Film,
  Music,
  Heart,
  Clock,
  Trash2,
  LayoutGrid,
  List,
  Copy,
  Database,
  Ban,
  Tv,
  CheckCircle2,
  ChevronRight,
  Flame,
  Edit3,
  Camera,
  Play,
  LayoutDashboard,
  SlidersHorizontal,
  History,
  RectangleVertical,
  RectangleHorizontal,
  Layers,
  Menu,
  Minus,
  Square,
} from "lucide-react";
import { motion } from "framer-motion";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import {
  libraryService,
  LibraryFolder,
  LibraryItem,
  FavoriteItem,
  ScanProgressPayload,
  ThumbnailCacheStats,
} from "../services/library/libraryService";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { EytaaLogo } from "./EytaaLogo";
import { MediaCard } from "./mediaCenter/MediaCard";
import { EditMetadataModal } from "./mediaCenter/EditMetadataModal";
import { SeriesDetailView } from "./mediaCenter/SeriesDetailView";
import { ProceduralPoster } from "./mediaCenter/ProceduralPoster";
import { normalizeSeriesKey } from "../utils/mediaTitle";

type MediaCenterTab = "hub" | "movies" | "series" | "all" | "favorites" | "duplicates" | "folders";
type WatchFilter = "all" | "in_progress" | "unwatched" | "watched";
type SortOption = "recent" | "title" | "year" | "duration";

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

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatRelativeTime(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs)) return undefined;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "JUST IN";
    if (diffHours < 24) return `${diffHours}H AGO`;
    if (diffDays === 1) return "YESTERDAY";
    if (diffDays < 7) return `${diffDays}D AGO`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
  } catch {
    return undefined;
  }
}

interface SeriesGroupItem {
  seriesName: string;
  sampleItem: LibraryItem;
  seasonsCount: number;
  episodesCount: number;
  watchedCount: number;
  progressPercent: number;
}

function SeriesCard({
  group,
  onClick,
  onCoverChange,
  onEdit,
  viewFormat = "poster",
}: {
  group: SeriesGroupItem;
  onClick: () => void;
  onCoverChange?: (group: SeriesGroupItem) => void;
  onEdit?: (group: SeriesGroupItem) => void;
  viewFormat?: "poster" | "widescreen";
}) {
  const { accentColor } = useThemeStore();
  const [thumbSrc, setThumbSrc] = useState<string | null>(group.sampleItem.custom_poster || null);
  const isWidescreen = viewFormat === "widescreen";

  useEffect(() => {
    let isMounted = true;

    if (group.sampleItem.custom_poster) {
      const cp = group.sampleItem.custom_poster.trim();
      if (cp.startsWith("data:") || cp.startsWith("http://") || cp.startsWith("https://")) {
        setThumbSrc(cp);
      } else {
        libraryService.getThumbnail(cp).then((thumb) => {
          if (isMounted && thumb) {
            setThumbSrc(thumb);
          }
        });
      }
      return () => {
        isMounted = false;
      };
    }

    libraryService.getThumbnail(group.sampleItem.file_path).then((thumb) => {
      if (isMounted && thumb) {
        setThumbSrc(thumb);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [group.sampleItem.file_path, group.sampleItem.custom_poster]);

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all duration-300 overflow-hidden cursor-pointer shadow-md hover:shadow-2xl hover:-translate-y-1"
    >
      {/* Show Poster Container */}
      <div
        className={`relative w-full overflow-hidden bg-neutral-900 ${
          isWidescreen ? "aspect-video" : "aspect-[2/3]"
        }`}
      >
        {thumbSrc ? (
          <>
            <img
              src={thumbSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-xl opacity-45 scale-125 pointer-events-none"
            />
            <img
              src={thumbSrc}
              alt={group.seriesName}
              className="relative w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-md"
              loading="lazy"
              onError={() => setThumbSrc(null)}
            />
          </>
        ) : (
          <ProceduralPoster
            title={group.seriesName}
            category="series"
            year={group.sampleItem.year}
            aspectRatio={isWidescreen ? "video" : "poster"}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges & Cover Change Buttons */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-10 pointer-events-none">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/60 text-neutral-300 border border-white/10 backdrop-blur-md">
            {group.seasonsCount} {group.seasonsCount === 1 ? "Season" : "Seasons"}
          </span>
          <div className="flex items-center gap-1">
            {group.watchedCount === group.episodesCount && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-md">
                <CheckCircle2 className="w-3 h-3" />
              </span>
            )}
            {onCoverChange && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCoverChange(group);
                }}
                className="pointer-events-auto opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/80 hover:bg-white/20 text-neutral-300 hover:text-white border border-white/15 backdrop-blur-md transition cursor-pointer shadow-lg"
                title="Change TV Series Cover Artwork"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(group);
                }}
                className="pointer-events-auto opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/80 hover:bg-white/20 text-neutral-300 hover:text-white border border-white/15 backdrop-blur-md transition cursor-pointer shadow-lg"
                title="Edit TV Series Details"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Hover Lower Overlay: View Episodes Capsule */}
        <div className="absolute inset-0 flex items-end justify-center pb-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none">
          <div className="px-3.5 py-1.5 rounded-full bg-neutral-950/85 backdrop-blur-xl border border-white/20 hover:border-white/40 text-neutral-200 hover:text-white font-medium text-xs flex items-center gap-1.5 shadow-2xl transition hover:scale-105 pointer-events-auto">
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            <span>View Episodes</span>
            <span className="text-neutral-500">•</span>
            <span style={{ color: accentColor }} className="font-mono font-bold">
              {group.episodesCount}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 overflow-hidden z-10">
          <div
            style={{ width: `${group.progressPercent}%`, backgroundColor: accentColor }}
            className="h-full transition-all duration-500"
          />
        </div>
      </div>

      {/* Show Meta */}
      <div className="p-3.5 flex flex-col justify-between gap-1 flex-1">
        <h4 className="text-xs font-bold text-white group-hover:text-neutral-100 line-clamp-1">
          {group.seriesName}
        </h4>
        <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1 border-t border-white/5">
          <span>{group.episodesCount} episodes</span>
          <span style={{ color: accentColor }}>
            {group.watchedCount}/{group.episodesCount} watched
          </span>
        </div>
      </div>
    </div>
  );
}

export function MediaLibraryModal() {
  const { isLibraryOpen, toggleLibraryModal, openFile, addToPlaylist, showOSD } = usePlayerStore();
  const { accentColor, accentGlow, accentText } = useThemeStore();

  const [activeTab, setActiveTab] = useState<MediaCenterTab>("hub");
  const [watchFilter, setWatchFilter] = useState<WatchFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cardFormat, setCardFormat] = useState<"poster" | "widescreen">(() => {
    try {
      const saved = localStorage.getItem("eytaa_card_format");
      return saved === "poster" ? "poster" : "widescreen";
    } catch {
      return "widescreen";
    }
  });

  const handleToggleCardFormat = (format: "poster" | "widescreen") => {
    setCardFormat(format);
    try {
      localStorage.setItem("eytaa_card_format", format);
    } catch {}
  };

  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [cacheStats, setCacheStats] = useState<ThumbnailCacheStats>({
    count: 0,
    total_bytes: 0,
    cache_dir: "",
  });

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isDebouncing, setIsDebouncing] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgressPayload | null>(null);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [isReclassifying, setIsReclassifying] = useState(false);

  // Pagination / infinite scrolling states for butter-smooth 60fps rendering
  const [visibleCount, setVisibleCount] = useState(48);
  const sentinelRef = useRef<HTMLButtonElement | null>(null);
  const hasInitialReclassified = useRef(false);

  // Selected series for drill-down view
  const [inspectingSeriesName, setInspectingSeriesName] = useState<string | null>(null);

  // Editing metadata modal state
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);

  // Recently added filtering & limits on Hub
  const [recentFilter, setRecentFilter] = useState<"all" | "movie" | "series" | "audio">("all");
  const [recentLimit, setRecentLimit] = useState<number>(12);

  // Collapsible sidebar state (persisted to localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("eytaa_library_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Track window maximized state for custom window controls
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);

  useEffect(() => {
    if (!isLibraryOpen) return;
    const checkMax = async () => {
      try {
        const appWindow = getCurrentWindow();
        setIsWindowMaximized(await appWindow.isMaximized());
      } catch (e) {
        console.warn("Max check error:", e);
      }
    };
    checkMax();
    const appWindow = getCurrentWindow();
    const unlistenPromise = appWindow.onResized(async () => {
      try {
        setIsWindowMaximized(await appWindow.isMaximized());
      } catch (e) {
        console.warn("Resize error:", e);
      }
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
    };
  }, [isLibraryOpen]);

  // Auto-collapse sidebar on very narrow windows (< 850px) on initial open
  useEffect(() => {
    if (!isLibraryOpen) return;
    const isNarrow = window.innerWidth < 850;
    const hasSavedPref = localStorage.getItem("eytaa_library_sidebar_collapsed") !== null;
    if (isNarrow && !hasSavedPref) {
      setIsSidebarCollapsed(true);
    }
  }, [isLibraryOpen]);

  const handleWindowMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (e) {
      console.warn("Minimize error:", e);
    }
  };

  const handleWindowToggleMaximize = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
      setIsWindowMaximized(await appWindow.isMaximized());
    } catch (e) {
      console.warn("Toggle maximize error:", e);
    }
  };

  const handleWindowClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (e) {
      console.warn("Close error:", e);
    }
  };

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("eytaa_library_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Reset pagination count on tab or filter change
  useEffect(() => {
    setVisibleCount(48);
  }, [activeTab, watchFilter, sortBy, debouncedSearchQuery]);

  // High performance scroll listener to load next batch as user approaches bottom
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 600) {
      setVisibleCount((prev) => prev + 48);
    }
  }, []);

  // IntersectionObserver to auto-load when sentinel button nears the viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + 48);
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, activeTab]);

  // Debounced search
  useEffect(() => {
    if (searchInput === debouncedSearchQuery) {
      setIsDebouncing(false);
      return;
    }
    setIsDebouncing(true);
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchInput);
      setIsDebouncing(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, debouncedSearchQuery]);

  // Load all library data
  const loadData = useCallback(async () => {
    try {
      const [fList, iList, favList, cStats] = await Promise.all([
        libraryService.getLibraryFolders(),
        libraryService.getLibraryItems({
          search: debouncedSearchQuery.trim() || undefined,
        }),
        libraryService.getFavorites(),
        libraryService.getThumbnailCacheStats(),
      ]);

      setFolders(fList);
      setItems(iList);
      setFavorites(favList);
      setCacheStats(cStats);

      // Transparent one-time background reclassification to ensure all TV series are detected
      if (!hasInitialReclassified.current && iList.length > 0) {
        hasInitialReclassified.current = true;
        libraryService.reclassifyAllMedia().then((cnt) => {
          if (cnt > 0) {
            libraryService
              .getLibraryItems({
                search: debouncedSearchQuery.trim() || undefined,
              })
              .then((reloaded) => {
                setItems(reloaded);
              });
          }
        });
      }
    } catch (e) {
      console.error("Load library data error:", e);
    }
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (isLibraryOpen) {
      loadData();
    }
  }, [isLibraryOpen, loadData]);

  // Keyboard shortcut: close with Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLibraryOpen) {
        if (editingItem) {
          setEditingItem(null);
        } else if (inspectingSeriesName) {
          setInspectingSeriesName(null);
        } else {
          toggleLibraryModal(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLibraryOpen, editingItem, inspectingSeriesName, toggleLibraryModal]);

  // Derived media groups
  const movies = useMemo(() => {
    return items.filter(
      (i) =>
        i.category === "movie" ||
        (!i.category && i.media_type === "video" && !i.series_name),
    );
  }, [items]);

  // Group TV series (using normalizeSeriesKey for robust grouping)
  const seriesGroups = useMemo(() => {
    const map = new Map<string, { displayName: string; episodes: LibraryItem[] }>();
    for (const item of items) {
      if (item.category === "series" || item.series_name) {
        const rawName = (item.series_name || "Unknown Series").trim();
        const normKey = normalizeSeriesKey(rawName);
        if (!map.has(normKey)) {
          map.set(normKey, { displayName: rawName, episodes: [] });
        }
        const entry = map.get(normKey)!;
        if (rawName.toLowerCase().startsWith("the ") && !entry.displayName.toLowerCase().startsWith("the ")) {
          entry.displayName = rawName;
        } else if (rawName.length > entry.displayName.length && !entry.displayName.toLowerCase().startsWith("the ")) {
          entry.displayName = rawName;
        }
        entry.episodes.push(item);
      }
    }

    const groups = Array.from(map.values()).map(({ displayName, episodes }) => {
      const seasonsSet = new Set<number>();
      let watchedCount = 0;
      for (const ep of episodes) {
        seasonsSet.add(ep.season_number ?? 1);
        if (ep.is_watched) watchedCount++;
      }
      return {
        seriesName: displayName,
        episodes,
        seasonsCount: seasonsSet.size,
        episodesCount: episodes.length,
        watchedCount,
        progressPercent: episodes.length > 0 ? Math.round((watchedCount / episodes.length) * 100) : 0,
        sampleItem: episodes[0],
      };
    });

    return groups.sort((a, b) => a.seriesName.localeCompare(b.seriesName));
  }, [items]);

  // All existing series names for autocomplete
  const existingSeriesNames = useMemo(() => {
    return seriesGroups.map((g) => g.seriesName);
  }, [seriesGroups]);

  // Continue watching queue (partially watched items)
  const continueWatchingItems = useMemo(() => {
    return items
      .filter((i) => {
        if (i.is_watched) return false;
        return (
          typeof i.resume_position === "number" &&
          i.resume_position > 10 &&
          (!i.duration || i.resume_position < i.duration * 0.9)
        );
      })
      .sort((a, b) => (b.resume_position ?? 0) - (a.resume_position ?? 0));
  }, [items]);

  // Next Episodes up (from active series in watch history)
  const nextUpEpisodes = useMemo(() => {
    const list: Array<{ seriesName: string; episode: LibraryItem }> = [];

    for (const group of seriesGroups) {
      // Sort episodes in chronological order
      const sorted = [...group.episodes].sort((a, b) => {
        const sDiff = (a.season_number ?? 1) - (b.season_number ?? 1);
        if (sDiff !== 0) return sDiff;
        return (a.episode_number ?? 0) - (b.episode_number ?? 0);
      });

      // Find first episode that is unwatched or partially watched
      const target = sorted.find((ep) => !ep.is_watched);
      if (target && group.watchedCount > 0 && group.watchedCount < group.episodesCount) {
        list.push({ seriesName: group.seriesName, episode: target });
      }
    }

    return list.slice(0, 8);
  }, [seriesGroups]);

  // Improved recently added items with category filtering
  const recentlyAddedFiltered = useMemo(() => {
    let list = [...items].sort(
      (a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime(),
    );
    if (recentFilter === "movie") {
      list = list.filter(
        (i) => i.category === "movie" || (!i.category && !i.series_name && i.media_type === "video"),
      );
    } else if (recentFilter === "series") {
      list = list.filter((i) => i.category === "series" || !!i.series_name);
    } else if (recentFilter === "audio") {
      list = list.filter((i) => i.media_type === "audio");
    }
    return list.slice(0, recentLimit);
  }, [items, recentFilter, recentLimit]);

  // Spotlight featured media for Smart Hub
  const spotlightItem = useMemo(() => {
    if (continueWatchingItems.length > 0) return continueWatchingItems[0];
    if (movies.length > 0) return movies[0];
    if (items.length > 0) return items[0];
    return null;
  }, [continueWatchingItems, movies, items]);

  const [spotlightThumb, setSpotlightThumb] = useState<string | null>(null);

  useEffect(() => {
    if (!spotlightItem) {
      setSpotlightThumb(null);
      return;
    }
    let isMounted = true;
    if (spotlightItem.custom_poster) {
      const cp = spotlightItem.custom_poster.trim();
      if (cp.startsWith("data:") || cp.startsWith("http://") || cp.startsWith("https://")) {
        setSpotlightThumb(cp);
      } else {
        libraryService.getThumbnail(cp).then((src) => {
          if (isMounted && src) setSpotlightThumb(src);
        });
      }
      return () => {
        isMounted = false;
      };
    }
    libraryService.getThumbnail(spotlightItem.file_path).then((src) => {
      if (isMounted && src) setSpotlightThumb(src);
    });
    return () => {
      isMounted = false;
    };
  }, [spotlightItem]);

  // Handler to pick cover image for an entire TV series
  const handlePickSeriesCover = async (group: SeriesGroupItem) => {
    try {
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
      if (selected && typeof selected === "string") {
        const sample = group.sampleItem;
        await libraryService.updateMediaMetadata({
          filePath: sample.file_path,
          title: sample.title,
          category: "series",
          seriesName: group.seriesName,
          customPoster: selected,
          applyToSeries: true,
        });
        showOSD(`Updated cover for ${group.seriesName}`);
        await loadData();
      }
    } catch (e) {
      console.error("Change series cover error:", e);
    }
  };


  // Total watch metrics
  const totalDurationSeconds = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  }, [items]);

  const duplicateCount = useMemo(() => {
    return items.filter((i) => i.is_duplicate).length;
  }, [items]);

  const offlineCount = useMemo(() => {
    return items.filter((i) => !i.is_available).length;
  }, [items]);

  // Filtering & sorting for Movie tab
  const filteredMovies = useMemo(() => {
    let result = [...movies];

    if (watchFilter === "in_progress") {
      result = result.filter(
        (i) =>
          !i.is_watched &&
          i.resume_position &&
          i.resume_position > 10 &&
          (!i.duration || i.resume_position < i.duration * 0.9),
      );
    } else if (watchFilter === "unwatched") {
      result = result.filter((i) => !i.is_watched && (!i.resume_position || i.resume_position <= 10));
    } else if (watchFilter === "watched") {
      result = result.filter((i) => i.is_watched);
    }

    if (sortBy === "recent") {
      result.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
    } else if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "year") {
      result.sort((a, b) => (b.year || "").localeCompare(a.year || ""));
    } else if (sortBy === "duration") {
      result.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    }

    return result;
  }, [movies, watchFilter, sortBy]);

  // Scan folder handler
  const handleScanFolder = async (folderPath: string) => {
    setIsScanning(true);
    setScanStatus(`Scanning ${folderPath.split(/[/\\]/).pop()}...`);
    let unlisten: (() => void) | null = null;
    try {
      unlisten = await listen<ScanProgressPayload>("library_scan_progress", (event) => {
        setScanProgress(event.payload);
        if (event.payload.current_directory) {
          const dirName =
            event.payload.current_directory.split(/[/\\]/).pop() ||
            event.payload.current_directory;
          setScanStatus(`Scanning ${dirName}... (${event.payload.total_found} media files found)`);
        }
      });

      const scanned = await libraryService.scanFolder(folderPath);
      if (scanned.length > 0) {
        await libraryService.saveLibraryItems(scanned);
        await libraryService.reconcileMissingItems(
          folderPath,
          scanned.map((s) => s.file_path),
        );
      }
      showOSD(`Scanned ${scanned.length} media files`);
      await loadData();
    } catch (e) {
      console.error("Folder scan failed:", e);
      showOSD("Folder scan failed or drive offline");
    } finally {
      if (unlisten) unlisten();
      setIsScanning(false);
      setScanStatus(null);
      setScanProgress(null);
    }
  };

  // Add folder dialog
  const handleAddFolder = async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: true,
        title: "Select Folders to Add to EYTAA Library",
      });

      if (!selected) return;

      const folderList = Array.isArray(selected) ? selected : [selected];
      for (const folder of folderList) {
        if (typeof folder === "string") {
          await libraryService.addLibraryFolder(folder);
          await handleScanFolder(folder);
        }
      }
      await loadData();
    } catch (err) {
      console.error("Add folder error:", err);
    }
  };

  // Rescan all watched folders
  const handleRescanAll = async () => {
    if (folders.length === 0) {
      await handleAddFolder();
      return;
    }

    setIsScanning(true);
    setScanStatus("Rescanning all folders...");
    let unlisten: (() => void) | null = null;
    try {
      unlisten = await listen<ScanProgressPayload>("library_scan_progress", (event) => {
        setScanProgress(event.payload);
        if (event.payload.current_directory) {
          const dirName =
            event.payload.current_directory.split(/[/\\]/).pop() ||
            event.payload.current_directory;
          setScanStatus(`Scanning ${dirName}... (${event.payload.total_found} media files found)`);
        }
      });

      let totalFound = 0;
      for (const f of folders) {
        if (f.is_accessible === false) continue;
        setScanStatus(`Scanning ${f.folder_path.split(/[/\\]/).pop()}...`);
        const scanned = await libraryService.scanFolder(f.folder_path);
        if (scanned.length > 0) {
          totalFound += await libraryService.saveLibraryItems(scanned);
          await libraryService.reconcileMissingItems(
            f.folder_path,
            scanned.map((s) => s.file_path),
          );
        }
      }
      const updatedCount = await libraryService.reclassifyAllMedia();
      showOSD(`Library refreshed: ${totalFound} media organized, ${updatedCount} reclassified`);
      await loadData();
    } catch (e) {
      console.error("Rescan all error:", e);
    } finally {
      if (unlisten) unlisten();
      setIsScanning(false);
      setScanStatus(null);
      setScanProgress(null);
    }
  };

  const handleReclassifyMedia = async () => {
    setIsReclassifying(true);
    try {
      showOSD("Re-analyzing titles, seasons & series across library...");
      const updatedCount = await libraryService.reclassifyAllMedia();
      showOSD(`Re-classified ${updatedCount} media items`);
      await loadData();
    } catch (e) {
      console.error("Reclassify error:", e);
      showOSD("Failed to reclassify media");
    } finally {
      setIsReclassifying(false);
    }
  };

  const handleCancelScan = async () => {
    await libraryService.cancelScan();
    setScanStatus("Cancelling scan...");
    showOSD("Scan cancelled");
  };

  const handleClearCache = async () => {
    setIsCleaningCache(true);
    try {
      const removed = await libraryService.cleanThumbnailCache("all");
      showOSD(`Cleared ${removed} cached thumbnails`);
      const updated = await libraryService.getThumbnailCacheStats();
      setCacheStats(updated);
    } catch (e) {
      console.error("Clear cache error:", e);
    } finally {
      setIsCleaningCache(false);
    }
  };

  const handleCleanMissing = async () => {
    try {
      const removed = await libraryService.cleanMissingItems();
      showOSD(`Removed ${removed} missing records`);
      await loadData();
    } catch (e) {
      console.error("Clean missing records error:", e);
    }
  };

  const handleRemoveFolder = async (folderPath: string) => {
    try {
      await libraryService.removeLibraryFolder(folderPath);
      showOSD("Folder removed from library");
      await loadData();
    } catch (e) {
      console.error("Remove folder error:", e);
    }
  };

  const handleToggleFavorite = async (filePath: string) => {
    try {
      const isFav = await libraryService.toggleFavorite(filePath);
      showOSD(isFav ? "Added to Favorites" : "Removed from Favorites");
      await loadData();
    } catch (err) {
      console.error("Favorite toggle error:", err);
    }
  };

  const handleToggleWatched = async (filePath: string, currentWatched: boolean) => {
    try {
      await libraryService.setWatchedStatus(filePath, !currentWatched);
      showOSD(!currentWatched ? "Marked as Watched" : "Marked as Unwatched");
      await loadData();
    } catch (err) {
      console.error("Watch toggle error:", err);
    }
  };

  const handlePlayItem = async (filePath: string, queueEpisodes?: string[]) => {
    try {
      await openFile(filePath);
      if (queueEpisodes && queueEpisodes.length > 0) {
        addToPlaylist(queueEpisodes);
        showOSD(`Playing • ${queueEpisodes.length} more episodes queued in playlist`);
      }
      toggleLibraryModal(false);
    } catch (e) {
      console.error("Play item error:", e);
    }
  };

  const handlePlayMediaWithAutoQueue = (item: LibraryItem) => {
    if (item.series_name) {
      const eps = items
        .filter((i) => (i.series_name || "").toLowerCase() === item.series_name!.toLowerCase())
        .sort((a, b) => {
          const sA = a.season_number ?? 1;
          const sB = b.season_number ?? 1;
          if (sA !== sB) return sA - sB;
          return (a.episode_number ?? 0) - (b.episode_number ?? 0);
        });
      const idx = eps.findIndex((e) => e.file_path === item.file_path);
      const remaining = idx >= 0 ? eps.slice(idx + 1).map((e) => e.file_path) : [];
      handlePlayItem(item.file_path, remaining);
    } else {
      handlePlayItem(item.file_path);
    }
  };

  const handleQueueItem = (filePath: string) => {
    addToPlaylist([filePath]);
    showOSD("Added to playlist");
  };

  if (!isLibraryOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Smart Media Center"
      className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-2xl flex flex-col text-white animate-in fade-in duration-200 overflow-hidden font-sans"
    >
      {/* Top Header Bar with Window Drag Region and Controls */}
      <header
        data-tauri-drag-region
        onDoubleClick={() => handleWindowToggleMaximize()}
        className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 border-b border-white/10 shrink-0 bg-neutral-900/80 backdrop-blur-md select-none cursor-default"
      >
        <div className="flex items-center gap-2.5 shrink-0" data-tauri-drag-region>
          <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
            <EytaaLogo className="w-full h-full" variant="color" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-sm font-black tracking-wide uppercase truncate hidden sm:block">
                Smart Media Center
              </h1>
              <span
                style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold shrink-0"
              >
                v2.0
              </span>
              {offlineCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 hidden lg:inline shrink-0">
                  {offlineCount} offline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Search Bar (Responsive with min-width and auto-fill) */}
        <div className="relative flex-1 min-w-[130px] sm:min-w-[180px] max-w-xs sm:max-w-sm md:max-w-md mx-1 sm:mx-2" data-tauri-drag-region="false">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search movies, series..."
            className={`w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 rounded-xl bg-white/5 border text-xs text-white placeholder-neutral-500 transition focus:outline-none ${
              searchInput
                ? "border-sky-500/50 shadow-[0_0_12px_rgba(56,189,248,0.2)] focus:border-sky-400"
                : "border-white/10 hover:border-white/20 focus:border-white/40"
            }`}
          />
          {isDebouncing ? (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <RefreshCw className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
            </div>
          ) : searchInput ? (
            <button
              onClick={() => {
                setSearchInput("");
                setDebouncedSearchQuery("");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        {/* Top Action Buttons + Window Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" data-tauri-drag-region="false">
          <button
            onClick={handleAddFolder}
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 2px 10px ${accentGlow}`,
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition hover:brightness-110 active:scale-95 cursor-pointer"
            title="Add a folder to scan for media"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Add Folder</span>
          </button>

          <button
            onClick={handleRescanAll}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-300 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Rescan all library folders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-amber-400" : ""}`} />
            <span className="hidden lg:inline">Rescan</span>
          </button>

          <button
            onClick={handleReclassifyMedia}
            disabled={isScanning || isReclassifying}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-300 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Re-analyze library with smart episode & series detection"
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 ${isReclassifying ? "animate-spin text-sky-400" : "text-sky-400"}`} />
            <span className="hidden xl:inline">{isReclassifying ? "Organizing..." : "Organize"}</span>
          </button>

          <div className="h-4 w-px bg-white/15 mx-0.5 sm:mx-1 hidden sm:block" />

          {/* Close Library Overlay Button */}
          <button
            onClick={() => toggleLibraryModal(false)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs font-semibold transition cursor-pointer"
            title="Back to Video Player (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Close Library</span>
          </button>

          <div className="h-4 w-px bg-white/15 mx-0.5 sm:mx-1" />

          {/* Native-style Window Controls */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleWindowMinimize}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Minimize Window"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleWindowToggleMaximize}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title={isWindowMaximized ? "Restore Window" : "Maximize Window"}
            >
              {isWindowMaximized ? (
                <Copy className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={handleWindowClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/20 transition cursor-pointer"
              title="Close EYTAA"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Active Search Banner Notification */}
      {debouncedSearchQuery.trim() && (
        <div className="bg-sky-500/10 border-b border-sky-500/25 px-6 py-2 flex items-center justify-between text-xs text-sky-200 animate-in fade-in duration-150 shrink-0">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              Search filter active: filtering results for{" "}
              <strong className="text-white font-semibold">"{debouncedSearchQuery}"</strong>
              {" "}• {items.length} item{items.length === 1 ? "" : "s"} found across library
            </span>
          </div>
          <button
            onClick={() => {
              setSearchInput("");
              setDebouncedSearchQuery("");
            }}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-white font-semibold transition cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Clear Search</span>
          </button>
        </div>
      )}

      {/* Scanning status banner */}
      {isScanning && (
        <div
          style={{ backgroundColor: `${accentColor}18`, borderColor: `${accentColor}44` }}
          className="px-6 py-2.5 border-b flex items-center justify-between text-xs text-neutral-200 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: accentColor }} />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-white truncate block">
                {scanStatus || "Scanning folders for media files..."}
              </span>
              {scanProgress && scanProgress.current_directory && (
                <span className="text-[10px] text-neutral-400 truncate block font-mono">
                  {scanProgress.current_directory}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            {scanProgress && (
              <span className="text-[11px] font-mono text-neutral-300">
                Found {scanProgress.total_found} media
              </span>
            )}
            <button
              onClick={handleCancelScan}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
              title="Stop scanning"
            >
              <Ban className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Body: Left Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <motion.aside
          initial={false}
          animate={{
            width: isSidebarCollapsed ? 64 : 240,
          }}
          transition={{
            duration: 0.22,
            ease: [0.25, 0.1, 0.25, 1.0],
          }}
          className="shrink-0 border-r border-white/10 bg-neutral-900/60 flex flex-col justify-between select-none overflow-y-auto overflow-x-hidden p-2.5"
        >
          <div className="space-y-3 w-full">
            {/* Sidebar Header with Collapse/Expand Toggle */}
            <div className={`flex items-center pb-2 mb-1 border-b border-white/5 ${isSidebarCollapsed ? "justify-center" : "justify-between px-1.5"}`}>
              {!isSidebarCollapsed && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 select-none">
                  Navigation
                </span>
              )}
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/5 hover:border-white/10 transition cursor-pointer shrink-0"
                title={isSidebarCollapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
                aria-label={isSidebarCollapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>

            {/* Group 1: BROWSE */}
            <div className="w-full">
              {!isSidebarCollapsed && (
                <p className="px-2.5 pb-1.5 text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-500 overflow-hidden select-none whitespace-nowrap">
                  Browse
                </p>
              )}
              <div className="space-y-1 w-full">
                {[
                  { id: "hub", label: "Media Hub", icon: LayoutDashboard, count: undefined },
                  { id: "movies", label: "Movies", icon: Film, count: movies.length },
                  { id: "series", label: "TV Shows", icon: Tv, count: seriesGroups.length },
                  { id: "all", label: "All Media", icon: Database, count: items.length },
                  { id: "favorites", label: "Favorites", icon: Heart, count: favorites.length },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id && !inspectingSeriesName;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setInspectingSeriesName(null);
                        setActiveTab(tab.id as MediaCenterTab);
                      }}
                      title={isSidebarCollapsed ? `${tab.label}${typeof tab.count === "number" ? ` (${tab.count})` : ""}` : undefined}
                      style={
                        isActive
                          ? {
                              backgroundColor: `${accentColor}25`,
                              color: accentColor,
                              borderLeftColor: !isSidebarCollapsed ? accentColor : undefined,
                              borderColor: isSidebarCollapsed ? `${accentColor}60` : undefined,
                            }
                          : {}
                      }
                      className={`relative flex items-center h-10 w-full rounded-xl transition-colors cursor-pointer select-none px-2.5 overflow-hidden ${
                        isActive
                          ? isSidebarCollapsed
                            ? "shadow-sm border font-black"
                            : "shadow-sm border-l-2 font-black"
                          : "text-neutral-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 shrink-0" />
                      </div>

                      {!isSidebarCollapsed && (
                        <span className="truncate whitespace-nowrap overflow-hidden text-xs font-bold ml-2.5 flex-1 text-left">
                          {tab.label}
                        </span>
                      )}

                      {/* Expanded Count Badge */}
                      {!isSidebarCollapsed && typeof tab.count === "number" && tab.count > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono shrink-0 ml-1.5 ${
                            isActive ? "bg-black/30 text-white font-bold" : "bg-white/5 text-neutral-400"
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}

                      {/* Collapsed Dot/Number Badge */}
                      {isSidebarCollapsed && typeof tab.count === "number" && tab.count > 0 && (
                        <span
                          style={isActive ? { backgroundColor: accentColor } : {}}
                          className={`absolute top-1.5 left-5 min-w-3.5 h-3.5 px-0.5 rounded-full text-[8px] font-mono font-bold flex items-center justify-center shrink-0 shadow-md ${
                            isActive ? "text-neutral-950 font-black" : "bg-neutral-800 text-neutral-300 border border-white/10"
                          }`}
                        >
                          {tab.count > 99 ? "99+" : tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider when collapsed */}
            {isSidebarCollapsed && <div className="w-8 border-t border-white/10 my-1 mx-auto" />}

            {/* Group 2: MANAGE */}
            <div className="w-full">
              {!isSidebarCollapsed && (
                <p className="px-2.5 pb-1.5 text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-500 overflow-hidden select-none whitespace-nowrap">
                  Manage
                </p>
              )}
              <div className="space-y-1 w-full">
                {[
                  { id: "duplicates", label: "Duplicates", icon: Copy, count: duplicateCount },
                  { id: "folders", label: "Folders & Storage", icon: Folder, count: folders.length },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id && !inspectingSeriesName;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setInspectingSeriesName(null);
                        setActiveTab(tab.id as MediaCenterTab);
                      }}
                      title={isSidebarCollapsed ? `${tab.label}${typeof tab.count === "number" ? ` (${tab.count})` : ""}` : undefined}
                      style={
                        isActive
                          ? {
                              backgroundColor: `${accentColor}25`,
                              color: accentColor,
                              borderLeftColor: !isSidebarCollapsed ? accentColor : undefined,
                              borderColor: isSidebarCollapsed ? `${accentColor}60` : undefined,
                            }
                          : {}
                      }
                      className={`relative flex items-center h-10 w-full rounded-xl transition-colors cursor-pointer select-none px-2.5 overflow-hidden ${
                        isActive
                          ? isSidebarCollapsed
                            ? "shadow-sm border font-black"
                            : "shadow-sm border-l-2 font-black"
                          : "text-neutral-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 shrink-0" />
                      </div>

                      {!isSidebarCollapsed && (
                        <span className="truncate whitespace-nowrap overflow-hidden text-xs font-bold ml-2.5 flex-1 text-left">
                          {tab.label}
                        </span>
                      )}

                      {/* Expanded Count Badge */}
                      {!isSidebarCollapsed && typeof tab.count === "number" && tab.count > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono shrink-0 ml-1.5 ${
                            isActive ? "bg-black/30 text-white font-bold" : "bg-white/5 text-neutral-400"
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}

                      {/* Collapsed Dot/Number Badge */}
                      {isSidebarCollapsed && typeof tab.count === "number" && tab.count > 0 && (
                        <span
                          style={isActive ? { backgroundColor: accentColor } : {}}
                          className={`absolute top-1.5 left-5 min-w-3.5 h-3.5 px-0.5 rounded-full text-[8px] font-mono font-bold flex items-center justify-center shrink-0 shadow-md ${
                            isActive ? "text-neutral-950 font-black" : "bg-neutral-800 text-neutral-300 border border-white/10"
                          }`}
                        >
                          {tab.count > 99 ? "99+" : tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Footer Info */}
          <div
            className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden transition-colors hover:bg-white/[0.06] cursor-pointer mt-4"
            title={`Thumbnail Cache: ${formatBytes(cacheStats.total_bytes)}${
              offlineCount > 0 ? ` • ${offlineCount} offline folder(s)` : ` • ${items.length} indexed files`
            }`}
          >
            <div className="h-10 flex items-center px-2.5">
              <Database className="w-4 h-4 text-neutral-400 shrink-0 mx-auto" />
              {!isSidebarCollapsed && (
                <div className="ml-2.5 flex items-center justify-between flex-1 min-w-0 overflow-hidden text-[11px] font-mono">
                  <span className="text-neutral-400 truncate">Cache</span>
                  <span className="text-white font-bold ml-2 shrink-0">{formatBytes(cacheStats.total_bytes)}</span>
                </div>
              )}
            </div>
          </div>
        </motion.aside>

        {/* Right Main Content Area */}
        <main className="flex-1 overflow-hidden flex flex-col bg-neutral-950 min-w-0">
          {/* Subheader Toolbar over main content */}
          {!inspectingSeriesName && (
            <div className="px-6 py-2.5 border-b border-white/10 bg-neutral-900/30 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-sm font-bold text-white tracking-wide uppercase truncate">
                  {activeTab === "hub"
                    ? "Media Hub"
                    : activeTab === "movies"
                    ? "Movies"
                    : activeTab === "series"
                    ? "TV Series"
                    : activeTab === "all"
                    ? "All Media"
                    : activeTab === "favorites"
                    ? "Favorites"
                    : activeTab === "duplicates"
                    ? "Duplicates"
                    : "Folders & Storage"}
                </h2>
                <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
                  {activeTab === "movies"
                    ? `• ${filteredMovies.length} titles`
                    : activeTab === "series"
                    ? `• ${seriesGroups.length} series`
                    : activeTab === "all"
                    ? `• ${items.length} items`
                    : activeTab === "favorites"
                    ? `• ${favorites.length} saved`
                    : activeTab === "duplicates"
                    ? `• ${duplicateCount} detected`
                    : activeTab === "folders"
                    ? `• ${folders.length} paths`
                    : ""}
                </span>
              </div>

              {/* Toolbar Controls: Aspect Ratio & View Mode on right */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {viewMode === "grid" &&
                  (activeTab === "hub" ||
                    activeTab === "movies" ||
                    activeTab === "series" ||
                    activeTab === "all" ||
                    activeTab === "favorites" ||
                    activeTab === "duplicates") && (
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => handleToggleCardFormat("widescreen")}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          cardFormat === "widescreen"
                            ? "bg-white/15 text-white shadow-sm"
                            : "text-neutral-400 hover:text-white"
                        }`}
                        title="Landscape View (16:9 Widescreen)"
                        aria-label="Landscape View"
                      >
                        <RectangleHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleCardFormat("poster")}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          cardFormat === "poster"
                            ? "bg-white/15 text-white shadow-sm"
                            : "text-neutral-400 hover:text-white"
                        }`}
                        title="Portrait / Poster View (2:3)"
                        aria-label="Portrait View"
                      >
                        <RectangleVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                {/* View mode toggle (for All Media tab only) */}
                {activeTab === "all" && (
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        viewMode === "grid" ? "bg-white/15 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                      }`}
                      title="Grid View"
                      aria-label="Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        viewMode === "list" ? "bg-white/15 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                      }`}
                      title="List View"
                      aria-label="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        {/* If user is inspecting a specific TV Series */}
        {inspectingSeriesName ? (
          <SeriesDetailView
            seriesName={inspectingSeriesName}
            items={items}
            searchQuery={debouncedSearchQuery}
            onClearSearch={() => {
              setSearchInput("");
              setDebouncedSearchQuery("");
            }}
            cardFormat={cardFormat}
            onToggleCardFormat={handleToggleCardFormat}
            onBack={() => setInspectingSeriesName(null)}
            onPlay={handlePlayItem}
            onQueue={handleQueueItem}
            onEdit={(item) => setEditingItem(item)}
            onToggleFavorite={handleToggleFavorite}
            onRefreshData={loadData}
          />
        ) : activeTab === "hub" ? (
          /* TAB 1: MEDIA HUB / DASHBOARD */
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {/* HERO SPOTLIGHT BANNER */}
            {spotlightItem && (
              <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-neutral-950 via-neutral-900/90 to-neutral-950 p-4 sm:p-6 lg:p-7 flex flex-row items-center gap-4 sm:gap-6 shadow-2xl">
                {/* Ambient Glow */}
                <div
                  style={{ backgroundColor: accentGlow }}
                  className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-30"
                />

                {/* Cinematic Ambient Backdrop from spotlight artwork */}
                {spotlightThumb && (
                  <div className="absolute right-0 top-0 bottom-0 w-3/4 sm:w-1/2 overflow-hidden pointer-events-none opacity-20">
                    <img src={spotlightThumb} alt="" className="w-full h-full object-cover blur-2xl scale-125" />
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent via-neutral-950/70 to-neutral-950" />
                  </div>
                )}

                {/* Backdrop / Poster image */}
                <div
                  className={`relative rounded-2xl overflow-hidden bg-neutral-950 shrink-0 shadow-2xl border border-white/10 group ${
                    cardFormat === "widescreen"
                      ? "aspect-video w-44 sm:w-56 md:w-64 lg:w-72 xl:w-80"
                      : "aspect-[2/3] w-28 sm:w-36 md:w-44"
                  }`}
                >
                  {spotlightThumb ? (
                    <>
                      <img
                        src={spotlightThumb}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-45 scale-125 pointer-events-none"
                      />
                      <img
                        src={spotlightThumb}
                        alt={spotlightItem.title}
                        className="relative w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-md"
                        onError={() => setSpotlightThumb(null)}
                      />
                    </>
                  ) : (
                    <ProceduralPoster
                      title={spotlightItem.series_name || spotlightItem.title}
                      category={spotlightItem.category || (spotlightItem.media_type === "audio" ? "music" : "movie")}
                      year={spotlightItem.year}
                      aspectRatio={cardFormat === "widescreen" ? "video" : "poster"}
                    />
                  )}
                </div>

                {/* Spotlight details */}
                <div className="flex-1 flex flex-col justify-between space-y-3 z-10 w-full min-w-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        style={{ backgroundColor: `${accentColor}25`, color: accentColor, borderColor: `${accentColor}40` }}
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {spotlightItem.resume_position && spotlightItem.resume_position > 10 ? "Resume Watching" : "Featured Spotlight"}
                      </span>
                      {spotlightItem.series_name && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-neutral-300">
                          TV SERIES
                        </span>
                      )}
                      {spotlightItem.year && (
                        <span className="text-[11px] text-neutral-500 font-mono">
                          {spotlightItem.year}
                        </span>
                      )}
                    </div>

                    <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight break-words line-clamp-2">
                      {spotlightItem.series_name ? `${spotlightItem.series_name}: ${spotlightItem.title}` : spotlightItem.title}
                    </h1>

                    <p className="text-xs text-neutral-400 font-mono mt-1 break-words">
                      {spotlightItem.season_number && spotlightItem.episode_number
                        ? `Season ${spotlightItem.season_number} • Episode ${spotlightItem.episode_number} • `
                        : ""}
                      {formatDuration(spotlightItem.duration)} • {formatBytes(spotlightItem.file_size)}
                    </p>
                  </div>

                  {/* Progress bar if in progress */}
                  {spotlightItem.resume_position && spotlightItem.resume_position > 10 && spotlightItem.duration ? (
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                        <span>
                          {Math.round((spotlightItem.resume_position / spotlightItem.duration) * 100)}% watched
                        </span>
                        <span>
                          {formatDuration(spotlightItem.duration - spotlightItem.resume_position)} left
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(100, (spotlightItem.resume_position / spotlightItem.duration) * 100)}%`,
                            backgroundColor: accentColor,
                          }}
                          className="h-full rounded-full transition-all"
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Play actions */}
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
                    <button
                      onClick={() => handlePlayMediaWithAutoQueue(spotlightItem)}
                      style={{
                        backgroundColor: accentColor,
                        color: accentText,
                        boxShadow: `0 4px 18px ${accentGlow}`,
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition hover:brightness-110 active:scale-95 cursor-pointer shadow-lg shrink-0"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>
                        {spotlightItem.resume_position && spotlightItem.resume_position > 10 ? "Resume Playing" : "Play Now"}
                      </span>
                    </button>

                    <button
                      onClick={() => handleQueueItem(spotlightItem.file_path)}
                      className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition cursor-pointer shrink-0"
                    >
                      Add to Queue
                    </button>

                    <button
                      onClick={() => setEditingItem(spotlightItem)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white transition cursor-pointer shrink-0"
                      title="Edit Details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Interactive Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setWatchFilter("all");
                  setActiveTab("movies");
                }}
                className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition flex flex-col justify-between text-left group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[11px] font-mono uppercase tracking-wider">Movies</span>
                  <Film className="w-4 h-4 text-neutral-500 group-hover:text-white transition" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{movies.length}</span>
                    <span className="text-xs text-neutral-500 font-mono">
                      titles ({Math.round(totalDurationSeconds / 3600)}h)
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 group-hover:text-neutral-300 font-mono transition">Browse →</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("series")}
                className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition flex flex-col justify-between text-left group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[11px] font-mono uppercase tracking-wider">TV Series</span>
                  <Tv className="w-4 h-4 text-neutral-500 group-hover:text-white transition" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{seriesGroups.length}</span>
                    <span className="text-xs text-neutral-500 font-mono">shows</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 group-hover:text-neutral-300 font-mono transition">Browse →</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWatchFilter("in_progress");
                  setActiveTab("movies");
                }}
                className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition flex flex-col justify-between text-left group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[11px] font-mono uppercase tracking-wider">In Progress</span>
                  <Clock className="w-4 h-4 text-neutral-500 group-hover:text-white transition" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span style={{ color: accentColor }} className="text-2xl font-black">
                      {continueWatchingItems.length}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">active</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 group-hover:text-neutral-300 font-mono transition">Resume →</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("favorites")}
                className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition flex flex-col justify-between text-left group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[11px] font-mono uppercase tracking-wider">Favorites</span>
                  <Heart className="w-4 h-4 text-rose-400/80 group-hover:text-rose-400 transition" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{favorites.length}</span>
                    <span className="text-xs text-neutral-500 font-mono">saved</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 group-hover:text-neutral-300 font-mono transition">View →</span>
                </div>
              </button>
            </div>

            {/* UP NEXT / NEXT EPISODE ROW */}
            {nextUpEpisodes.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold tracking-wide uppercase">Up Next in Your Shows</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("series")}
                    className="text-xs text-neutral-400 hover:text-white transition flex items-center gap-1 font-mono"
                  >
                    <span>All Series</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {nextUpEpisodes.map(({ episode }) => (
                    <MediaCard
                      key={episode.file_path}
                      item={episode}
                      viewFormat="widescreen"
                      badge="UP NEXT"
                      onPlay={() => handlePlayMediaWithAutoQueue(episode)}
                      onQueue={handleQueueItem}
                      onEdit={(it) => setEditingItem(it)}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* CONTINUE WATCHING ROW */}
            {continueWatchingItems.length > 1 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: accentColor }} />
                    <h2 className="text-sm font-bold tracking-wide uppercase">Continue Watching</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-neutral-300">
                      {continueWatchingItems.length}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {continueWatchingItems.slice(1, 5).map((item) => (
                    <MediaCard
                      key={item.file_path}
                      item={item}
                      viewFormat="widescreen"
                      badge="RESUME"
                      onPlay={() => handlePlayMediaWithAutoQueue(item)}
                      onQueue={handleQueueItem}
                      onEdit={(it) => setEditingItem(it)}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* TV SERIES ROW ON HUB */}
            {seriesGroups.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4" style={{ color: accentColor }} />
                    <h2 className="text-sm font-bold tracking-wide uppercase">Your TV Series</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-neutral-300">
                      {seriesGroups.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("series")}
                    className="text-xs text-neutral-400 hover:text-white transition flex items-center gap-1 font-mono"
                  >
                    <span>View All Shows</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div
                  className={`grid gap-4 ${
                    cardFormat === "widescreen"
                      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                  }`}
                >
                  {seriesGroups.slice(0, 5).map((group) => (
                    <SeriesCard
                      key={group.seriesName}
                      group={group}
                      viewFormat={cardFormat}
                      onClick={() => setInspectingSeriesName(group.seriesName)}
                      onCoverChange={handlePickSeriesCover}
                      onEdit={() => setEditingItem(group.sampleItem)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* RECENTLY ADDED SHELF (UPGRADED) */}
            <section className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" style={{ color: accentColor }} />
                  <h2 className="text-sm font-bold tracking-wide uppercase">Recently Added to Library</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-neutral-300">
                    {recentlyAddedFiltered.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Category Filter Pills */}
                  <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/5 text-[11px]">
                    {[
                      { id: "all", label: "All" },
                      { id: "movie", label: "Movies" },
                      { id: "series", label: "Episodes" },
                      { id: "audio", label: "Music" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setRecentFilter(f.id as any)}
                        style={
                          recentFilter === f.id
                            ? { backgroundColor: accentColor, color: accentText }
                            : {}
                        }
                        className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                          recentFilter === f.id
                            ? "shadow-sm font-bold"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Limit Selector */}
                  <select
                    value={recentLimit}
                    onChange={(e) => setRecentLimit(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-neutral-300 text-[11px] focus:outline-none"
                  >
                    <option value={6}>Show 6</option>
                    <option value={12}>Show 12</option>
                    <option value={24}>Show 24</option>
                    <option value={48}>Show 48</option>
                  </select>
                </div>
              </div>

              {recentlyAddedFiltered.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500 font-mono">
                  No recently added items found in this category.
                </div>
              ) : (
                <div
                  className={`grid gap-3.5 ${
                    cardFormat === "widescreen"
                      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                  }`}
                >
                  {recentlyAddedFiltered.map((item) => (
                    <MediaCard
                      key={item.file_path}
                      item={item}
                      viewFormat={cardFormat}
                      badge={formatRelativeTime(item.added_at)}
                      onPlay={() => handlePlayMediaWithAutoQueue(item)}
                      onQueue={handleQueueItem}
                      onEdit={(it) => setEditingItem(it)}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* TOP FAVORITES ON HUB */}
            {items.some((i) => i.is_favorite) && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <h2 className="text-sm font-bold tracking-wide uppercase">Your Favorites</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("favorites")}
                    className="text-xs text-neutral-400 hover:text-white transition flex items-center gap-1 font-mono"
                  >
                    <span>View All Favorites</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                  {items
                    .filter((i) => i.is_favorite)
                    .slice(0, 6)
                    .map((item) => (
                      <MediaCard
                        key={item.file_path}
                        item={item}
                        viewFormat="poster"
                        onPlay={() => handlePlayMediaWithAutoQueue(item)}
                        onQueue={handleQueueItem}
                        onEdit={(it) => setEditingItem(it)}
                        onToggleFavorite={handleToggleFavorite}
                        onToggleWatched={handleToggleWatched}
                      />
                    ))}
                </div>
              </section>
            )}
          </div>
        ) : activeTab === "movies" ? (
          /* TAB 2: MOVIES */
          <div onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Filter and Sort Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/5">
              {/* Watch Status Filter Pills */}
              <div className="flex items-center gap-1.5">
                {[
                  { id: "all", label: "All Movies" },
                  { id: "in_progress", label: "In Progress" },
                  { id: "unwatched", label: "Unwatched" },
                  { id: "watched", label: "Watched" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setWatchFilter(f.id as WatchFilter)}
                    style={
                      watchFilter === f.id
                        ? {
                            backgroundColor: `${accentColor}25`,
                            borderColor: accentColor,
                            color: accentColor,
                          }
                        : {}
                    }
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      watchFilter === f.id
                        ? "shadow-sm font-bold"
                        : "bg-white/5 border-transparent text-neutral-400 hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-neutral-200 text-xs focus:outline-none"
                >
                  <option value="recent">Recently Added</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="year">Release Year</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
            </div>

            {/* Movies Content */}
            {filteredMovies.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
                <Film className="w-10 h-10 text-neutral-600" />
                <p className="text-sm font-bold text-neutral-300">No movies found</p>
                <p className="text-xs text-neutral-500">
                  Try adjusting filters or adding a folder with movie files.
                </p>
              </div>
            ) : (
              <>
                <div
                  className={`grid gap-3.5 ${
                    cardFormat === "widescreen"
                      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                  }`}
                >
                  {filteredMovies.slice(0, visibleCount).map((movie) => (
                    <MediaCard
                      key={movie.file_path}
                      item={movie}
                      viewFormat={cardFormat}
                      onPlay={() => handlePlayMediaWithAutoQueue(movie)}
                      onQueue={handleQueueItem}
                      onEdit={(it) => setEditingItem(it)}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
                {visibleCount < filteredMovies.length && (
                  <button
                    ref={sentinelRef}
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 48)}
                    className="w-full py-5 my-4 flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition cursor-pointer text-neutral-400 hover:text-white group"
                  >
                    <span className="text-xs font-semibold group-hover:underline">
                      Showing {Math.min(visibleCount, filteredMovies.length)} of {filteredMovies.length} movies • Click or scroll to load more
                    </span>
                    <span className="text-[11px] text-neutral-500">Loads next 48 titles</span>
                  </button>
                )}
              </>
            )}
          </div>
        ) : activeTab === "series" ? (
          /* TAB 3: TV SHOWS */
          <div onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-6">
            {seriesGroups.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
                <Tv className="w-10 h-10 text-neutral-600" />
                <p className="text-sm font-bold text-neutral-300">No TV Series detected</p>
                <p className="text-xs text-neutral-500 max-w-sm">
                  Add folders containing TV show files (e.g. S01E01, Season 1 folders, or Show 1.01). EYTAA will
                  automatically organize them into seasons and episodes.
                </p>
              </div>
            ) : (
              <>
                <div
                  className={`grid gap-4 ${
                    cardFormat === "widescreen"
                      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                  }`}
                >
                  {seriesGroups.slice(0, visibleCount).map((group) => (
                    <SeriesCard
                      key={group.seriesName}
                      group={group}
                      viewFormat={cardFormat}
                      onClick={() => setInspectingSeriesName(group.seriesName)}
                      onCoverChange={handlePickSeriesCover}
                      onEdit={() => setEditingItem(group.sampleItem)}
                    />
                  ))}
                </div>
                {visibleCount < seriesGroups.length && (
                  <button
                    ref={sentinelRef}
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 48)}
                    className="w-full py-5 my-4 flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition cursor-pointer text-neutral-400 hover:text-white group"
                  >
                    <span className="text-xs font-semibold group-hover:underline">
                      Showing {Math.min(visibleCount, seriesGroups.length)} of {seriesGroups.length} TV series • Click or scroll to load more
                    </span>
                    <span className="text-[11px] text-neutral-500">Loads next 48 series</span>
                  </button>
                )}
              </>
            )}
          </div>
        ) : activeTab === "all" ? (
          /* TAB 4: ALL MEDIA & FILES */
          <div onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {items.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
                <Database className="w-10 h-10 text-neutral-600" />
                <p className="text-sm font-bold text-neutral-300">No media in library</p>
                <p className="text-xs text-neutral-500">
                  Click "Add Folder" above to scan your drives for movies, shows, and music.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <>
                <div
                  className={`grid gap-3.5 ${
                    cardFormat === "widescreen"
                      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                  }`}
                >
                  {items.slice(0, visibleCount).map((item) => (
                    <MediaCard
                      key={item.file_path}
                      item={item}
                      viewFormat={cardFormat}
                      onPlay={() => handlePlayMediaWithAutoQueue(item)}
                      onQueue={handleQueueItem}
                      onEdit={(it) => setEditingItem(it)}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleWatched={handleToggleWatched}
                    />
                  ))}
                </div>
                {visibleCount < items.length && (
                  <button
                    ref={sentinelRef}
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 48)}
                    className="w-full py-5 my-4 flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition cursor-pointer text-neutral-400 hover:text-white group"
                  >
                    <span className="text-xs font-semibold group-hover:underline">
                      Showing {Math.min(visibleCount, items.length)} of {items.length} files • Click or scroll to load more
                    </span>
                    <span className="text-[11px] text-neutral-500">Loads next 48 files</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="divide-y divide-white/5">
                  {items.slice(0, visibleCount).map((item) => (
                    <div
                      key={item.file_path}
                      onClick={() => handlePlayMediaWithAutoQueue(item)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-neutral-400 shrink-0">
                          {item.media_type === "audio" ? (
                            <Music className="w-4 h-4" />
                          ) : item.category === "series" ? (
                            <Tv className="w-4 h-4" />
                          ) : (
                            <Film className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                          <p className="text-[11px] text-neutral-500 font-mono truncate max-w-md">
                            {item.file_name} • {formatDuration(item.duration)} • {formatBytes(item.file_size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.is_watched && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(item);
                          }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {visibleCount < items.length && (
                  <button
                    ref={sentinelRef}
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 48)}
                    className="w-full py-5 my-4 flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition cursor-pointer text-neutral-400 hover:text-white group"
                  >
                    <span className="text-xs font-semibold group-hover:underline">
                      Showing {Math.min(visibleCount, items.length)} of {items.length} files • Click or scroll to load more
                    </span>
                    <span className="text-[11px] text-neutral-500">Loads next 48 files</span>
                  </button>
                )}
              </>
            )}
          </div>
        ) : activeTab === "favorites" ? (
          /* TAB 5: FAVORITES */
          <div onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4">
            {favorites.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
                <Heart className="w-10 h-10 text-neutral-600" />
                <p className="text-sm font-bold text-neutral-300">No favorites yet</p>
                <p className="text-xs text-neutral-500">
                  Hover over any media card and click the heart icon to add it to your favorites.
                </p>
              </div>
            ) : (
              <>
                <div
                  className={`grid gap-3.5 ${
                    cardFormat === "widescreen"
                      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                  }`}
                >
                  {items
                    .filter((i) => i.is_favorite)
                    .slice(0, visibleCount)
                    .map((item) => (
                      <MediaCard
                        key={item.file_path}
                        item={item}
                        viewFormat={cardFormat}
                        onPlay={() => handlePlayMediaWithAutoQueue(item)}
                        onQueue={handleQueueItem}
                        onEdit={(it) => setEditingItem(it)}
                        onToggleFavorite={handleToggleFavorite}
                        onToggleWatched={handleToggleWatched}
                      />
                    ))}
                </div>
                {visibleCount < items.filter((i) => i.is_favorite).length && (
                  <button
                    ref={sentinelRef}
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 48)}
                    className="w-full py-5 my-4 flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition cursor-pointer text-neutral-400 hover:text-white group"
                  >
                    <span className="text-xs font-semibold group-hover:underline">
                      Showing {Math.min(visibleCount, items.filter((i) => i.is_favorite).length)} of {items.filter((i) => i.is_favorite).length} favorites • Click or scroll to load more
                    </span>
                    <span className="text-[11px] text-neutral-500">Loads next 48 favorites</span>
                  </button>
                )}
              </>
            )}
          </div>
        ) : activeTab === "duplicates" ? (
          /* TAB 6: DUPLICATES */
          <div onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {duplicateCount === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-2">
                <Copy className="w-10 h-10 text-neutral-600" />
                <p className="text-sm font-bold text-neutral-300">No duplicate files found</p>
                <p className="text-xs text-neutral-500">
                  Your library is clean! Duplicate detection uses instant cryptographic size-fingerprints.
                </p>
              </div>
            ) : (
              <>
                <div
                  className={`grid gap-3.5 ${
                    cardFormat === "widescreen"
                      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                  }`}
                >
                  {items
                    .filter((i) => i.is_duplicate)
                    .slice(0, visibleCount)
                    .map((item) => (
                      <MediaCard
                        key={item.file_path}
                        item={item}
                        viewFormat={cardFormat}
                        badge="DUPLICATE"
                        onPlay={() => handlePlayMediaWithAutoQueue(item)}
                        onQueue={handleQueueItem}
                        onEdit={(it) => setEditingItem(it)}
                        onToggleFavorite={handleToggleFavorite}
                        onToggleWatched={handleToggleWatched}
                      />
                    ))}
                </div>
                {visibleCount < duplicateCount && (
                  <button
                    ref={sentinelRef}
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 48)}
                    className="w-full py-5 my-4 flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition cursor-pointer text-neutral-400 hover:text-white group"
                  >
                    <span className="text-xs font-semibold group-hover:underline">
                      Showing {Math.min(visibleCount, duplicateCount)} of {duplicateCount} duplicates • Click or scroll to load more
                    </span>
                    <span className="text-[11px] text-neutral-500">Loads next 48 items</span>
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          /* TAB 7: FOLDERS & STORAGE */
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h2 className="text-sm font-bold text-white">Watched Folders</h2>
                <p className="text-xs text-neutral-400">
                  Folders monitored and scanned for movies, series, and music
                </p>
              </div>
              <button
                onClick={handleAddFolder}
                style={{ backgroundColor: accentColor, color: accentText }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:brightness-110 active:scale-95 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add Folder</span>
              </button>
            </div>

            {/* Folder List */}
            <div className="space-y-2.5">
              {folders.map((folder) => (
                <div
                  key={folder.folder_path}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-neutral-400 shrink-0">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {folder.folder_path.split(/[/\\]/).pop()}
                        </span>
                        {!folder.is_accessible && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Offline / Unplugged
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 font-mono truncate max-w-md">
                        {folder.folder_path} • {folder.item_count} items
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleScanFolder(folder.folder_path)}
                      disabled={isScanning || !folder.is_accessible}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition disabled:opacity-40"
                      title="Rescan Folder"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveFolder(folder.folder_path)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition"
                      title="Remove Folder from Library"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Storage & Cache Management */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Storage & Cache Cleaners
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Thumbnail Artwork Cache</span>
                    <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                      {cacheStats.count} cached images ({formatBytes(cacheStats.total_bytes)})
                    </p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    disabled={isCleaningCache}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
                  >
                    Clear Cache
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Reconcile Missing Files</span>
                    <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                      Remove deleted files from database
                    </p>
                  </div>
                  <button
                    onClick={handleCleanMissing}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
                  >
                    Clean Missing
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Edit Metadata Modal */}
      <EditMetadataModal
        item={editingItem}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={loadData}
        existingSeriesNames={existingSeriesNames}
      />
    </div>
  );
}
