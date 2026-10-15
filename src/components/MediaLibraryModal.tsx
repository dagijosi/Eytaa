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
  Play,
  Plus,
  Clock,
  History,
  Trash2,
  FileUp,
  FileDown,
  LayoutGrid,
  List,
  HardDrive,
  Copy,
  Database,
  Ban,
} from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import {
  libraryService,
  LibraryFolder,
  LibraryItem,
  FavoriteItem,
  UnfinishedVideo,
  ScanProgressPayload,
  ThumbnailCacheStats,
} from "../services/library/libraryService";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { formatMediaTitle } from "../utils/mediaTitle";
import { EytaaLogo } from "./EytaaLogo";

type LibraryTab = "all" | "continue" | "recent" | "favorites" | "duplicates" | "folders";
type MediaTypeFilter = "all" | "video" | "audio";

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "--:--";
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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

function formatWatchedStatus(resumePos?: number, duration?: number, percent?: number): string | null {
  if (!resumePos || resumePos <= 5) return null;
  const watchedStr = formatDuration(resumePos);
  if (typeof percent === "number" && percent > 0) {
    return `${watchedStr} (${Math.round(percent)}%)`;
  }
  if (duration && duration > 0) {
    const calcPercent = Math.round((resumePos / duration) * 100);
    return `${watchedStr} (${calcPercent}%)`;
  }
  return `${watchedStr} watched`;
}

// Cache files that failed thumbnail generation during this session so we don't re-query IPC
const failedThumbnailPaths = new Set<string>();

// Lazy-loaded thumbnail component with non-blocking fetching & smooth fade-in
function MediaThumbnail({
  filePath,
  mediaType,
  title,
  duration,
  progressPercent,
  isAvailable = true,
  isDuplicate = false,
}: {
  filePath: string;
  mediaType: string;
  title: string;
  duration?: number;
  progressPercent?: number;
  isAvailable?: boolean;
  isDuplicate?: boolean;
}) {
  const { accentColor, accentGlow } = useThemeStore();
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    if (failedThumbnailPaths.has(filePath)) return;

    let isMounted = true;
    setIsLoading(true);

    libraryService
      .getThumbnail(filePath)
      .then((src) => {
        if (isMounted) {
          if (src) {
            setThumbSrc(src);
          } else {
            failedThumbnailPaths.add(filePath);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          failedThumbnailPaths.add(filePath);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isVisible, filePath]);

  const ext = filePath.split(".").pop()?.toUpperCase() || "";

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video bg-neutral-900 rounded-xl overflow-hidden select-none border ${
        !isAvailable ? "border-rose-500/30 opacity-70" : "border-white/5"
      }`}
    >
      {isLoading && !thumbSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/40 z-10">
          <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
        </div>
      )}
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800/80 via-neutral-900 to-black p-3 text-center">
          {mediaType === "audio" ? (
            <div
              style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-inner"
            >
              <Music className="w-6 h-6" />
            </div>
          ) : (
            <div
              style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-inner"
            >
              <Film className="w-6 h-6" />
            </div>
          )}
          <span className="text-[11px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
            {ext}
          </span>
        </div>
      )}

      {/* Top extension badge */}
      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-neutral-300 border border-white/10 uppercase">
        {ext}
      </div>

      {/* Offline / Duplicate status pill */}
      {!isAvailable ? (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-rose-600/90 backdrop-blur-md text-[9px] font-mono font-bold text-white border border-rose-400/40 uppercase">
          Offline
        </div>
      ) : isDuplicate ? (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-amber-500/90 backdrop-blur-md text-[9px] font-mono font-bold text-black border border-amber-300/40 uppercase">
          Duplicate
        </div>
      ) : null}

      {/* Duration Badge */}
      {duration && duration > 0 ? (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-white/10">
          {formatDuration(duration)}
        </div>
      ) : null}

      {/* Progress Bar (if partially watched) */}
      {typeof progressPercent === "number" && progressPercent > 0 && progressPercent < 98 ? (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            style={{
              width: `${progressPercent}%`,
              backgroundColor: accentColor,
              boxShadow: `0 0 8px ${accentGlow}`,
            }}
            className="h-full rounded-r"
          />
        </div>
      ) : null}
    </div>
  );
}

export function MediaLibraryModal() {
  const { isLibraryOpen, toggleLibraryModal, openFile, addToPlaylist, showOSD, playlist } =
    usePlayerStore();
  const { accentColor, accentGlow, accentText } = useThemeStore();

  const [activeTab, setActiveTab] = useState<LibraryTab>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [unfinished, setUnfinished] = useState<UnfinishedVideo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgressPayload | null>(null);

  // Cache stats & maintenance
  const [cacheStats, setCacheStats] = useState<ThumbnailCacheStats | null>(null);
  const [isCleaningCache, setIsCleaningCache] = useState(false);

  // Progressive rendering / infinite scroll state to prevent React DOM overload
  const [visibleCount, setVisibleCount] = useState(48);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input by 250ms
  useEffect(() => {
    if (searchInput !== debouncedSearchQuery) {
      setIsDebouncing(true);
    }
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchInput);
      setIsDebouncing(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, debouncedSearchQuery]);

  // Load all library data
  const loadData = useCallback(async () => {
    try {
      const [fList, iList, favList, unfList, cStats] = await Promise.all([
        libraryService.getLibraryFolders(),
        libraryService.getLibraryItems({
          mediaType: mediaTypeFilter === "all" ? undefined : mediaTypeFilter,
          search: debouncedSearchQuery.trim() || undefined,
        }),
        libraryService.getFavorites(),
        libraryService.getUnfinishedVideos(),
        libraryService.getThumbnailCacheStats(),
      ]);

      setFolders(fList);
      setItems(iList);
      setFavorites(favList);
      setUnfinished(unfList);
      setCacheStats(cStats);
    } catch (e) {
      console.error("Load library data error:", e);
    }
  }, [mediaTypeFilter, debouncedSearchQuery]);

  useEffect(() => {
    if (isLibraryOpen) {
      loadData();
    }
  }, [isLibraryOpen, loadData]);

  // Folder scanning handler with live event listening & missing item reconciliation
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

  // Rescan all watched folders (skipping offline drives gracefully)
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
        if (f.is_accessible === false) {
          // Gracefully protect offline external drives from accidental wipe
          continue;
        }
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
      showOSD(`Library refreshed: ${totalFound} items updated`);
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

  // Cancellation handler
  const handleCancelScan = async () => {
    await libraryService.cancelScan();
    setScanStatus("Cancelling scan...");
    showOSD("Scan cancelled");
  };

  // Thumbnail cache cleanup
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

  // Clean missing records
  const handleCleanMissing = async () => {
    try {
      const removed = await libraryService.cleanMissingItems();
      showOSD(`Removed ${removed} missing records`);
      await loadData();
    } catch (e) {
      console.error("Clean missing records error:", e);
    }
  };

  // Remove watched folder
  const handleRemoveFolder = async (folderPath: string) => {
    try {
      await libraryService.removeLibraryFolder(folderPath);
      showOSD("Folder removed from library");
      await loadData();
    } catch (e) {
      console.error("Remove folder error:", e);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (
    e: React.MouseEvent,
    filePath: string,
    title?: string,
    mediaType?: string,
  ) => {
    e.stopPropagation();
    try {
      const isFav = await libraryService.toggleFavorite(filePath, title, mediaType);
      showOSD(isFav ? "Added to Favorites" : "Removed from Favorites");
      await loadData();
    } catch (err) {
      console.error("Favorite toggle error:", err);
    }
  };

  // Play item
  const handlePlayItem = async (filePath: string) => {
    try {
      await openFile(filePath);
      toggleLibraryModal(false);
    } catch (e) {
      console.error("Play item error:", e);
    }
  };

  // Queue to playlist
  const handleQueueItem = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    addToPlaylist([filePath]);
    showOSD("Added to playlist");
  };

  // Playlist Export
  const handleExportPlaylist = async () => {
    if (playlist.length === 0 && items.length === 0) {
      showOSD("No items to export");
      return;
    }

    try {
      const savePath = await saveDialog({
        title: "Export Playlist",
        defaultPath: "eytaa-playlist.m3u8",
        filters: [
          { name: "M3U8 Playlist", extensions: ["m3u8", "m3u"] },
          { name: "JSON Playlist", extensions: ["json"] },
        ],
      });

      if (!savePath) return;

      const itemsToExport =
        playlist.length > 0
          ? playlist
          : items.map((i) => ({ id: String(i.id), filePath: i.file_path, title: i.title }));

      const format = savePath.endsWith(".json") ? "json" : "m3u8";
      await libraryService.exportPlaylist(savePath, format, itemsToExport);
      showOSD(`Playlist exported to ${savePath.split(/[/\\]/).pop()}`);
    } catch (err) {
      console.error("Export playlist error:", err);
      showOSD("Export failed");
    }
  };

  // Playlist Import
  const handleImportPlaylist = async () => {
    try {
      const selected = await openDialog({
        title: "Import Playlist",
        multiple: false,
        filters: [
          { name: "Playlists (*.m3u, *.m3u8, *.json)", extensions: ["m3u", "m3u8", "json"] },
        ],
      });

      if (!selected || typeof selected !== "string") return;

      const imported = await libraryService.importPlaylist(selected);
      if (imported.length > 0) {
        addToPlaylist(imported.map((i) => i.filePath));
        showOSD(`Imported ${imported.length} tracks into playlist`);
      }
    } catch (e) {
      console.error("Import playlist error:", e);
      showOSD("Playlist import failed");
    }
  };

  // Duplicates and offline statistics
  const duplicateCount = useMemo(() => items.filter((i) => i.is_duplicate).length, [items]);
  const offlineCount = useMemo(() => items.filter((i) => !i.is_available).length, [items]);

  // Filtered views
  const displayItems = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();

    if (activeTab === "continue") {
      return unfinished.filter(
        (u) => !q || u.title.toLowerCase().includes(q) || u.file_path.toLowerCase().includes(q),
      );
    }

    if (activeTab === "favorites") {
      return favorites.filter(
        (f) =>
          !q ||
          (f.title && f.title.toLowerCase().includes(q)) ||
          f.file_path.toLowerCase().includes(q),
      );
    }

    if (activeTab === "recent") {
      return items.filter(
        (i) =>
          typeof i.resume_position === "number" &&
          (!q || i.title.toLowerCase().includes(q) || i.file_path.toLowerCase().includes(q)),
      );
    }

    if (activeTab === "duplicates") {
      return items.filter(
        (i) =>
          i.is_duplicate &&
          (!q || i.title.toLowerCase().includes(q) || i.file_path.toLowerCase().includes(q)),
      );
    }

    return items;
  }, [activeTab, items, unfinished, favorites, debouncedSearchQuery]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setVisibleCount(48);
  }, [activeTab, mediaTypeFilter, debouncedSearchQuery]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 48, displayItems.length));
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [displayItems.length]);

  const pagedItems = useMemo(() => {
    return displayItems.slice(0, visibleCount);
  }, [displayItems, visibleCount]);

  if (!isLibraryOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Local Media Library"
      className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-2xl flex flex-col text-white animate-in fade-in duration-200 overflow-hidden"
    >
      {/* Top Header Bar */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-b border-white/10 shrink-0 bg-neutral-900/60">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-9 h-9 flex items-center justify-center">
            <EytaaLogo className="w-full h-full" variant="color" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-wide">Local Media Library</h1>
              <span
                style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold"
              >
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
              {offlineCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {offlineCount} offline
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400">
              Browse, search, and manage your local movie, show, and music collection
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-80 md:w-96">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search titles, filenames, folders..."
            className="w-full pl-9 pr-9 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-white/40 focus:outline-none text-xs text-white placeholder-neutral-500 transition"
          />
          {isDebouncing ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <RefreshCw className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
            </div>
          ) : searchInput ? (
            <button
              onClick={() => {
                setSearchInput("");
                setDebouncedSearchQuery("");
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={handleAddFolder}
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 4px 14px ${accentGlow}`,
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition hover:brightness-110 active:scale-95 cursor-pointer"
            title="Add a folder to scan for media"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Add Folder</span>
          </button>

          <button
            onClick={handleRescanAll}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-300 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Rescan all library folders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-amber-400" : ""}`} />
            <span className="hidden md:inline">Rescan</span>
          </button>

          <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

          {/* Import / Export Playlist */}
          <button
            onClick={handleImportPlaylist}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition"
            title="Import Playlist (.m3u, .m3u8, .json)"
          >
            <FileUp className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportPlaylist}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition"
            title="Export Current Playlist (.m3u8, .json)"
          >
            <FileDown className="w-4 h-4" />
          </button>

          {/* Grid / List Switcher */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid" ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "list" ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-6 w-px bg-white/10 mx-1" />

          {/* Close Modal */}
          <button
            onClick={() => toggleLibraryModal(false)}
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-neutral-400 border border-white/10 transition cursor-pointer"
            title="Close Library (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Scanning status banner with real-time feedback and Cancel button */}
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

      {/* Tabs and Filters Bar */}
      <div className="px-6 py-3 border-b border-white/10 bg-neutral-900/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <nav className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "all", label: "All Media", count: items.length, icon: Film },
            { id: "continue", label: "Continue Watching", count: unfinished.length, icon: Clock },
            {
              id: "recent",
              label: "Recently Played",
              count: items.filter((i) => !!i.resume_position).length,
              icon: History,
            },
            { id: "favorites", label: "Favorites", count: favorites.length, icon: Heart },
            { id: "duplicates", label: "Duplicates", count: duplicateCount, icon: Copy },
            { id: "folders", label: "Folders & Storage", count: folders.length, icon: Folder },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as LibraryTab)}
                style={
                  isActive
                    ? {
                        backgroundColor: `${accentColor}25`,
                        borderColor: `${accentColor}66`,
                        color: accentColor,
                      }
                    : {}
                }
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isActive
                    ? "shadow-sm font-bold"
                    : "bg-white/5 border-transparent text-neutral-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? "bg-black/30" : "bg-white/10 text-neutral-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Media Type Filter (on All Media tab) */}
        {activeTab === "all" && (
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            {(["all", "video", "audio"] as MediaTypeFilter[]).map((type) => (
              <button
                key={type}
                onClick={() => setMediaTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg capitalize transition text-xs font-medium ${
                  mediaTypeFilter === type
                    ? "bg-white/15 text-white font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* VIEW: Watched Folders Management & Cache Storage */}
        {activeTab === "folders" ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Watched Folders ({folders.length})
                </h2>
                <p className="text-xs text-neutral-400">
                  Folders configured for automatic media cataloging and continuous library scanning
                </p>
              </div>
              <button
                onClick={handleAddFolder}
                style={{
                  backgroundColor: accentColor,
                  color: accentText,
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold hover:brightness-110 cursor-pointer transition"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add Folder</span>
              </button>
            </div>

            {folders.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-3">
                <Folder className="w-12 h-12 text-neutral-600 mb-1" />
                <h3 className="text-base font-bold text-white">No folders added yet</h3>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Add folders containing your movies, TV shows, and music to populate your personal library.
                </p>
                <button
                  onClick={handleAddFolder}
                  style={{ backgroundColor: accentColor, color: accentText }}
                  className="mt-2 px-4 py-2 rounded-xl text-xs font-bold hover:brightness-110 cursor-pointer"
                >
                  Choose Folder
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {folders.map((folder) => {
                  const folderItemCount = items.filter(
                    (i) => i.folder_path === folder.folder_path,
                  ).length;
                  const isOffline = folder.is_accessible === false;

                  return (
                    <div
                      key={folder.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition group ${
                        isOffline
                          ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/30"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div
                          style={{
                            backgroundColor: isOffline
                              ? "rgba(245, 158, 11, 0.15)"
                              : `${accentColor}20`,
                            color: isOffline ? "#f59e0b" : accentColor,
                          }}
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5"
                        >
                          <HardDrive className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white truncate font-mono">
                              {folder.folder_path}
                            </h4>
                            {isOffline && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                Drive Offline
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-0.5">
                            <span>
                              {folder.item_count || folderItemCount} files indexed
                              {isOffline ? " (Safe offline)" : ""}
                            </span>
                            <span>•</span>
                            <span>Added: {new Date(folder.added_at).toLocaleDateString()}</span>
                            {folder.last_scanned_at && (
                              <>
                                <span>•</span>
                                <span>
                                  Last scanned: {new Date(folder.last_scanned_at).toLocaleTimeString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <button
                          onClick={() => handleScanFolder(folder.folder_path)}
                          disabled={isScanning || isOffline}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-200 transition disabled:opacity-40"
                          title={isOffline ? "Drive is offline / disconnected" : "Rescan this folder"}
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Rescan</span>
                        </button>

                        <button
                          onClick={() => handleRemoveFolder(folder.folder_path)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/15 transition"
                          title="Remove from library"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Thumbnail Cache & Storage Limits Maintenance Card */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5"
                  >
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Thumbnail Cache & Database Resilience
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Fast local image cache used to render video preview artwork without lag
                    </p>
                  </div>
                </div>

                {cacheStats && (
                  <span className="text-xs font-mono font-bold text-neutral-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                    {cacheStats.count} thumbnails ({formatBytes(cacheStats.total_bytes)})
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-white/5">
                <button
                  onClick={handleClearCache}
                  disabled={isCleaningCache}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-200 hover:text-white transition cursor-pointer disabled:opacity-50"
                  title="Purge all generated thumbnail images from disk cache"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isCleaningCache ? "Cleaning..." : "Clear Thumbnail Cache"}</span>
                </button>

                <button
                  onClick={handleCleanMissing}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-200 hover:text-white transition cursor-pointer"
                  title="Remove library entries for files that were permanently deleted from disk"
                >
                  <Ban className="w-3.5 h-3.5 text-amber-400" />
                  <span>Purge Deleted / Offline Records</span>
                </button>
              </div>
            </div>
          </div>
        ) : displayItems.length === 0 ? (
          /* Empty Search or Tab State */
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-neutral-500">
              {activeTab === "favorites" ? (
                <Heart className="w-8 h-8" />
              ) : activeTab === "continue" ? (
                <Clock className="w-8 h-8" />
              ) : activeTab === "duplicates" ? (
                <Copy className="w-8 h-8" />
              ) : (
                <Film className="w-8 h-8" />
              )}
            </div>
            <h3 className="text-base font-bold text-white">
              {debouncedSearchQuery
                ? `No results for "${debouncedSearchQuery}"`
                : activeTab === "favorites"
                ? "No favorite tracks or videos yet"
                : activeTab === "continue"
                ? "No unfinished videos"
                : activeTab === "duplicates"
                ? "No duplicate files found in your collection"
                : "No media items found"}
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mt-1">
              {activeTab === "duplicates"
                ? "EYTAA uses fingerprint hashing to detect identical media files across different folders."
                : "Add watched folders or drag and drop video and audio files into EYTAA to get started."}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {pagedItems.map((item) => {
              const filePath = "file_path" in item ? item.file_path : "";
              const title =
                formatMediaTitle(item.title, filePath) || item.title || "Untitled Media";
              const duration =
                "duration" in item && typeof item.duration === "number" ? item.duration : undefined;
              const mediaType =
                "media_type" in item && typeof item.media_type === "string"
                  ? item.media_type
                  : "video";
              const fileSize =
                "file_size" in item && typeof (item as LibraryItem).file_size === "number"
                  ? (item as LibraryItem).file_size
                  : undefined;
              const isFav =
                "is_favorite" in item
                  ? Boolean((item as LibraryItem).is_favorite)
                  : favorites.some((f) => f.file_path === filePath);

              const resumePos =
                "resume_position" in item && typeof (item as LibraryItem).resume_position === "number"
                  ? (item as LibraryItem).resume_position
                  : undefined;
              const progressPercent =
                "progress_percent" in item &&
                typeof (item as UnfinishedVideo).progress_percent === "number"
                  ? (item as UnfinishedVideo).progress_percent
                  : resumePos && duration && duration > 0
                  ? Math.round((resumePos / duration) * 100)
                  : undefined;
              const watchedStatus = formatWatchedStatus(resumePos, duration, progressPercent);

              const isAvailable = (item as LibraryItem).is_available ?? true;
              const isDuplicate = (item as LibraryItem).is_duplicate ?? false;

              return (
                <div
                  key={filePath}
                  onClick={() => handlePlayItem(filePath)}
                  className={`group relative flex flex-col rounded-2xl bg-neutral-900/60 border hover:bg-neutral-900 transition-all duration-200 cursor-pointer overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-0.5 ${
                    !isAvailable
                      ? "border-rose-500/30 opacity-75"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  {/* Thumbnail Container */}
                  <div className="relative">
                    <MediaThumbnail
                      filePath={filePath}
                      mediaType={mediaType}
                      title={title}
                      duration={duration}
                      progressPercent={progressPercent}
                      isAvailable={isAvailable}
                      isDuplicate={isDuplicate}
                    />

                    {/* Hover Overlay with Quick Actions */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5">
                      <div
                        style={{
                          backgroundColor: accentColor,
                          color: accentText,
                          boxShadow: `0 4px 18px ${accentGlow}`,
                        }}
                        className="w-11 h-11 rounded-full flex items-center justify-center transform group-hover:scale-105 active:scale-95 transition shadow-xl"
                        title="Play Now"
                      >
                        <Play className="w-5 h-5 fill-current translate-x-0.5" />
                      </div>

                      {/* Add to Playlist button */}
                      <button
                        onClick={(e) => handleQueueItem(e, filePath)}
                        className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white/90 border border-white/20 backdrop-blur-md flex items-center justify-center transition active:scale-90"
                        title="Add to Playlist"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Top Right Heart (Favorite) Toggle */}
                    <button
                      onClick={(e) => handleToggleFavorite(e, filePath, title, mediaType)}
                      style={isFav ? { color: "#f43f5e" } : {}}
                      className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/70 backdrop-blur-md transition ${
                        isFav
                          ? "opacity-100 text-rose-500"
                          : "opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-white"
                      }`}
                      title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <Heart className="w-3.5 h-3.5" fill={isFav ? "currentColor" : "none"} />
                    </button>
                  </div>

                  {/* Metadata Content */}
                  <div className="p-3 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3
                          title={title}
                          className="text-xs font-bold text-white group-hover:text-amber-300 transition truncate flex-1"
                        >
                          {title}
                        </h3>
                        {!isAvailable && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold font-mono shrink-0">
                            OFFLINE
                          </span>
                        )}
                        {isAvailable && isDuplicate && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold font-mono shrink-0">
                            DUP
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5 font-mono">
                        {filePath.split(/[/\\]/).slice(-2, -1)[0]}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono mt-2 pt-2 border-t border-white/5">
                      {fileSize ? (
                        <span>{formatBytes(fileSize)}</span>
                      ) : (
                        <span className="capitalize">{mediaType}</span>
                      )}

                      {watchedStatus ? (
                        <span style={{ color: accentColor }} className="font-bold">
                          {watchedStatus}
                        </span>
                      ) : (
                        <span>Ready</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Grid Infinite Scroll Sentinel & Load More Indicator */}
            {pagedItems.length < displayItems.length && (
              <div
                ref={sentinelRef}
                className="col-span-full py-8 flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-neutral-500" />
                  <span>
                    Showing {pagedItems.length} of {displayItems.length} items
                  </span>
                </div>
                <button
                  onClick={() => setVisibleCount((prev) => Math.min(prev + 48, displayItems.length))}
                  className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-200 hover:text-white transition cursor-pointer"
                >
                  Load next 48 items
                </button>
              </div>
            )}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 overflow-hidden bg-neutral-900/60 divide-y divide-white/5">
              {pagedItems.map((item) => {
                const filePath = "file_path" in item ? item.file_path : "";
                const title =
                  formatMediaTitle(item.title, filePath) || item.title || "Untitled Media";
                const duration =
                  "duration" in item && typeof item.duration === "number" ? item.duration : undefined;
                const mediaType =
                  "media_type" in item && typeof item.media_type === "string"
                    ? item.media_type
                    : "video";
                const fileSize =
                  "file_size" in item && typeof (item as LibraryItem).file_size === "number"
                    ? (item as LibraryItem).file_size
                    : undefined;
                const isFav =
                  "is_favorite" in item
                    ? Boolean((item as LibraryItem).is_favorite)
                    : favorites.some((f) => f.file_path === filePath);

                const resumePos =
                  "resume_position" in item &&
                  typeof (item as LibraryItem).resume_position === "number"
                    ? (item as LibraryItem).resume_position
                    : undefined;
                const progressPercent =
                  "progress_percent" in item &&
                  typeof (item as UnfinishedVideo).progress_percent === "number"
                    ? (item as UnfinishedVideo).progress_percent
                    : resumePos && duration && duration > 0
                    ? Math.round((resumePos / duration) * 100)
                    : undefined;
                const watchedStatus = formatWatchedStatus(resumePos, duration, progressPercent);

                const isAvailable = (item as LibraryItem).is_available ?? true;
                const isDuplicate = (item as LibraryItem).is_duplicate ?? false;

                return (
                  <div
                    key={filePath}
                    onClick={() => handlePlayItem(filePath)}
                    className="flex items-center justify-between p-3 hover:bg-white/5 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      >
                        {mediaType === "audio" ? (
                          <Music className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                            {title}
                          </h4>
                          {!isAvailable && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold font-mono">
                              OFFLINE
                            </span>
                          )}
                          {isAvailable && isDuplicate && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold font-mono">
                              DUPLICATE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 font-mono truncate">
                          {filePath}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-xs font-mono text-neutral-400 ml-4">
                      {watchedStatus ? (
                        <span style={{ color: accentColor }} className="font-semibold text-[11px]">
                          {watchedStatus}
                        </span>
                      ) : null}
                      {duration ? <span>{formatDuration(duration)}</span> : null}
                      {fileSize ? (
                        <span className="hidden md:inline">{formatBytes(fileSize)}</span>
                      ) : null}

                      <button
                        onClick={(e) => handleQueueItem(e, filePath)}
                        className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition"
                        title="Add to playlist"
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleToggleFavorite(e, filePath, title, mediaType)}
                        style={isFav ? { color: "#f43f5e" } : {}}
                        className="p-1 rounded text-neutral-400 hover:text-white transition"
                        title={isFav ? "Remove Favorite" : "Favorite"}
                      >
                        <Heart className="w-4 h-4" fill={isFav ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* List Infinite Scroll Sentinel & Load More Indicator */}
            {pagedItems.length < displayItems.length && (
              <div
                ref={sentinelRef}
                className="py-6 flex flex-col items-center justify-center gap-2 text-neutral-400 text-xs"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-neutral-500" />
                  <span>
                    Showing {pagedItems.length} of {displayItems.length} items
                  </span>
                </div>
                <button
                  onClick={() => setVisibleCount((prev) => Math.min(prev + 48, displayItems.length))}
                  className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-200 hover:text-white transition cursor-pointer"
                >
                  Load next 48 items
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
