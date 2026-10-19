import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  BookMarked,
  Plus,
  Trash2,
  Play,
  Music,
  Film,
  Search,
  Shuffle,
  ChevronUp,
  ChevronDown,
  Volume2,
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpZA,
  ListOrdered,
  FileUp,
  FileDown,
  ListPlus,
  MoreVertical,
  ListVideo,
  GripVertical,
} from "lucide-react";
import { usePlayerStore, PlaylistItem } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { libraryService } from "../services/library/libraryService";

export function PlaylistDrawer() {
  const {
    playlist,
    currentPlaylistIndex,
    isPlaylistOpen,
    togglePlaylistDrawer,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
    shufflePlaylist,
    sortPlaylist,
    clearPlaylist,
    playPlaylistItem,
    status,
    showOSD,
    savedPlaylists,
    refreshSavedPlaylists,
    saveCurrentPlaylist,
    loadSavedPlaylist,
    deleteSavedPlaylist,
    addAllEpisodesFromFolder,
    mediaMetadata,
  } = usePlayerStore();

  const { accentColor, accentGlow, accentText } = useThemeStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "saved">("queue");
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const isPlaying = status === "playing";

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLDivElement | null>(null);

  const computeTargetIndex = (clientY: number): number | null => {
    const container = listRef.current;
    if (!container) return null;
    const rows = Array.from(
      container.querySelectorAll<HTMLElement>("[data-playlist-row]")
    );
    if (rows.length === 0) return 0;
    const yInContent = clientY - container.getBoundingClientRect().top + container.scrollTop;
    for (let i = 0; i < rows.length; i++) {
      const rowTop = rows[i].offsetTop - container.offsetTop;
      if (yInContent < rowTop + rows[i].offsetHeight / 2) return i;
    }
    return rows.length;
  };

  const handleDragPointerDown = (e: React.PointerEvent<HTMLElement>, index: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const gesture = { startY: e.clientY, active: false, fromIndex: index };

    const onMove = (ev: PointerEvent) => {
      if (!gesture.active) {
        if (Math.abs(ev.clientY - gesture.startY) < 5) return;
        gesture.active = true;
        setDragIndex(gesture.fromIndex);
      }
      const slot = computeTargetIndex(ev.clientY);
      if (slot === null) return;
      const to = slot > gesture.fromIndex ? slot - 1 : slot;
      if (to !== gesture.fromIndex) {
        reorderPlaylist(gesture.fromIndex, to);
        gesture.fromIndex = to;
        setDragIndex(to);
      }
    };

    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      if (!gesture.active) playPlaylistItem(gesture.fromIndex);
      setDragIndex(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    if (showSortMenu) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showSortMenu]);

  useEffect(() => {
    if (isPlaylistOpen && activeTab === "queue") {
      const timer = window.setTimeout(() => {
        activeRowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 320);
      return () => window.clearTimeout(timer);
    }
  }, [isPlaylistOpen, activeTab]);

  useEffect(() => {
    if (isPlaylistOpen) {
      refreshSavedPlaylists().catch(() => {});
    }
  }, [isPlaylistOpen, refreshSavedPlaylists]);

  useEffect(() => {
    if (isPlaylistOpen && activeTab === "saved") {
      refreshSavedPlaylists().catch(() => {});
    }
  }, [isPlaylistOpen, activeTab, refreshSavedPlaylists]);

  const handleAddFiles = async () => {
    try {
      const selected = await openDialog({
        multiple: true,
        directory: false,
        filters: [
          {
            name: "Media Files",
            extensions: ["mp4", "mkv", "webm", "avi", "mov", "mp3", "flac", "wav", "m4a", "ts", "m2ts"],
          },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (selected && Array.isArray(selected)) {
        addToPlaylist(selected);
      } else if (selected && typeof selected === "string") {
        addToPlaylist([selected]);
      }
    } catch (err) {
      console.error("Add files error:", err);
    }
  };

  const handleImportPlaylist = async () => {
    try {
      const selected = await openDialog({
        title: "Import Playlist",
        multiple: false,
        filters: [{ name: "Playlists (*.m3u, *.m3u8, *.json)", extensions: ["m3u", "m3u8", "json"] }],
      });
      if (!selected || typeof selected !== "string") return;
      const imported = await libraryService.importPlaylist(selected);
      if (imported.length > 0) {
        addToPlaylist(imported.map((i) => i.filePath));
        showOSD(`Imported ${imported.length} tracks into playlist`);
      } else {
        showOSD("Playlist is empty or invalid");
      }
    } catch (err) {
      console.error("Import playlist error:", err);
      showOSD("Import failed");
    }
  };

  const handleExportPlaylist = async () => {
    if (playlist.length === 0) {
      showOSD("Playlist is empty");
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
      const format = savePath.endsWith(".json") ? "json" : "m3u8";
      await libraryService.exportPlaylist(savePath, format, playlist);
      showOSD(`Exported playlist to ${savePath.split(/[/\\]/).pop()}`);
    } catch (err) {
      console.error("Export playlist error:", err);
      showOSD("Export failed");
    }
  };

  const filteredPlaylist = useMemo(() => {
    if (!searchQuery.trim()) {
      return playlist.map((item, originalIndex) => ({ ...item, originalIndex }));
    }
    const q = searchQuery.toLowerCase();
    return playlist
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .filter((item) => item.title.toLowerCase().includes(q) || item.filePath.toLowerCase().includes(q));
  }, [playlist, searchQuery]);

  const renderRowInner = (item: PlaylistItem, originalIndex: number) => {
    const isActive = originalIndex === currentPlaylistIndex;
    const isAudio = /\.(mp3|flac|wav|m4a|aac|ogg)$/i.test(item.filePath);

    return (
      <>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Media Icon / Active Sound Indicator */}
          <div
            style={{
              backgroundColor: isActive ? accentColor : undefined,
              color: isActive ? accentText : undefined,
              boxShadow: isActive ? `0 0 12px ${accentGlow}` : undefined,
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform ${
              isActive
                ? "font-black scale-105"
                : "bg-white/5 text-neutral-400 group-hover:text-white group-hover:bg-white/10"
            }`}
          >
            {isActive && isPlaying ? (
              <Volume2 className="w-4 h-4 animate-pulse" />
            ) : isActive ? (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            ) : isAudio ? (
              <Music className="w-4 h-4" />
            ) : (
              <Film className="w-4 h-4" />
            )}
          </div>

          {/* Title & Subtitle */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold truncate group-hover:text-white transition">
                {item.title}
              </span>
              {isActive && (
                <span
                  style={{ backgroundColor: accentColor, color: accentText }}
                  className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded font-mono shrink-0"
                >
                  PLAYING
                </span>
              )}
            </div>
            <span className="text-[10px] text-neutral-500 truncate font-mono mt-0.5" title={item.filePath}>
              {item.filePath.split(/[/\\]/).slice(-2, -1)[0] || item.filePath}
            </span>
          </div>
        </div>

        {/* Actions Ribbon: Reorder & Remove (revealed on hover) */}
        <div className="flex items-center gap-0.5 shrink-0 ml-1.5">
          {/* Move Up */}
          {originalIndex > 0 && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                reorderPlaylist(originalIndex, originalIndex - 1);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/15 text-neutral-400 hover:text-white transition"
              title="Move Up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Move Down */}
          {originalIndex < playlist.length - 1 && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                reorderPlaylist(originalIndex, originalIndex + 1);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/15 text-neutral-400 hover:text-white transition"
              title="Move Down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Remove */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              removeFromPlaylist(originalIndex);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 hover:text-rose-400 text-neutral-400 transition"
            title="Remove from Playlist"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Backdrop Dimmer Overlay for Smooth Dismiss */}
      <div
        onClick={togglePlaylistDrawer}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ease-out ${
          isPlaylistOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Main Drawer Panel */}
      <aside
        className={`fixed inset-y-0 right-0 w-80 sm:w-96 max-w-full ui-glass-bar border-l border-white/10 shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-out transform ${
          isPlaylistOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-neutral-100">
              {activeTab === "queue" ? "Playlist" : "Saved Playlists"}
            </span>
            <span
              style={{
                backgroundColor: accentColor,
                color: "var(--accent-text)",
                borderColor: accentColor,
              }}
              className="text-xs border px-2 py-0.5 rounded-full font-mono font-bold"
            >
              {activeTab === "queue" ? playlist.length : savedPlaylists.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleAddFiles}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition active:scale-95"
              title="Add Files (+)"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Overflow Options Menu */}
            <div className="relative" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                style={{ color: showSortMenu ? accentColor : undefined }}
                className={`p-1.5 rounded-lg transition active:scale-95 ${
                  showSortMenu
                    ? "bg-white/10"
                    : "text-neutral-400 hover:text-white hover:bg-white/10"
                }`}
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showSortMenu && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-neutral-900/98 backdrop-blur-2xl border border-white/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                  {playlist.length > 1 && (
                    <>
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Sort Playlist
                      </div>
                      <button
                        onClick={() => {
                          sortPlaylist("natural");
                          setShowSortMenu(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 transition text-left"
                      >
                        <ListOrdered style={{ color: accentColor }} className="w-3.5 h-3.5" />
                        <span>Episode / Natural (1, 2, 10...)</span>
                      </button>
                      <button
                        onClick={() => {
                          sortPlaylist("az");
                          setShowSortMenu(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 transition text-left"
                      >
                        <ArrowDownAZ className="w-3.5 h-3.5 text-sky-400" />
                        <span>Name (A → Z)</span>
                      </button>
                      <button
                        onClick={() => {
                          sortPlaylist("za");
                          setShowSortMenu(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 transition text-left"
                      >
                        <ArrowUpZA className="w-3.5 h-3.5 text-sky-400" />
                        <span>Name (Z → A)</span>
                      </button>
                      <button
                        onClick={() => {
                          sortPlaylist("reverse");
                          setShowSortMenu(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 transition text-left"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Reverse Order</span>
                      </button>
                      <button
                        onClick={() => {
                          shufflePlaylist();
                          setShowSortMenu(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 transition text-left"
                      >
                        <Shuffle style={{ color: accentColor }} className="w-3.5 h-3.5" />
                        <span>Random Shuffle</span>
                      </button>
                      <div className="h-px bg-white/10 my-0.5" />
                    </>
                  )}

                  {mediaMetadata?.filePath && (
                    <button
                      onClick={() => {
                        addAllEpisodesFromFolder();
                        setShowSortMenu(false);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 transition text-left"
                    >
                      <ListPlus style={{ color: accentColor }} className="w-3.5 h-3.5" />
                      <span>Add Episodes from Folder</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleImportPlaylist();
                      setShowSortMenu(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 transition text-left"
                  >
                    <FileUp className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Import Playlist…</span>
                  </button>

                  <button
                    onClick={() => {
                      handleExportPlaylist();
                      setShowSortMenu(false);
                    }}
                    disabled={playlist.length === 0}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-200 hover:text-white hover:bg-white/10 transition text-left disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <FileDown className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Export Playlist…</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowSortMenu(false);
                      const name = prompt("Save playlist as:", "New Playlist");
                      if (name === null) return;
                      saveCurrentPlaylist(name).catch(() => {});
                    }}
                    disabled={playlist.length === 0}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-200 hover:text-emerald-300 hover:bg-white/10 transition text-left disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <BookMarked className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save Playlist…</span>
                  </button>

                  {playlist.length > 0 && (
                    <>
                      <div className="h-px bg-white/10 my-0.5" />
                      <button
                        onClick={() => {
                          clearPlaylist();
                          setShowSortMenu(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition text-left"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Playlist</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={togglePlaylistDrawer}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition active:scale-95 ml-1"
              title="Close (Esc / P)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 pt-2.5 shrink-0">
          <button
            onClick={() => setActiveTab("queue")}
            style={
              activeTab === "queue"
                ? { backgroundColor: accentColor, color: "var(--accent-text)", borderColor: accentColor }
                : undefined
            }
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              activeTab === "queue"
                ? ""
                : "border-transparent text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ListVideo className="w-3.5 h-3.5" />
            <span>Queue</span>
            {playlist.length > 0 && (
              <span className="text-[10px] font-mono opacity-80">{playlist.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            style={
              activeTab === "saved"
                ? { backgroundColor: accentColor, color: "var(--accent-text)", borderColor: accentColor }
                : undefined
            }
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              activeTab === "saved"
                ? ""
                : "border-transparent text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>Saved</span>
            {savedPlaylists.length > 0 && (
              <span className="text-[10px] font-mono opacity-80">{savedPlaylists.length}</span>
            )}
          </button>
        </div>

        {/* Saved Playlists Tab */}
        <div
          className={`${
            activeTab === "saved"
              ? "flex-1 overflow-y-auto p-2.5 space-y-1.5 select-none"
              : "hidden"
          }`}
        >
          {savedPlaylists.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-neutral-500">
              <div
                style={{ backgroundColor: accentColor, borderColor: accentColor }}
                className="w-16 h-16 rounded-2xl border flex items-center justify-center mb-3"
              >
                <BookMarked style={{ color: "var(--accent-text)" }} className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-neutral-200">No saved playlists</p>
              <p className="text-xs mt-1 text-neutral-400 max-w-[220px]">
                Use &quot;Save Playlist…&quot; from the ⋯ menu to keep a queue for later.
              </p>
            </div>
          ) : (
            savedPlaylists.map((pl) => (
              <div
                key={pl.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-2"
              >
                <button
                  onClick={() => loadSavedPlaylist(pl.id)}
                  className="flex flex-col items-start text-left truncate flex-1 min-w-0"
                >
                  <span className="text-xs font-medium text-neutral-200 truncate w-full">
                    {pl.name}
                  </span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">
                    {pl.itemCount} track{pl.itemCount === 1 ? "" : "s"}
                  </span>
                </button>
                <button
                  onClick={() => deleteSavedPlaylist(pl.id)}
                  className="p-1 rounded hover:bg-rose-500/20 text-neutral-500 hover:text-rose-400 transition"
                  title="Delete saved playlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
        {/* Filter / Search Bar */}
        {activeTab === "queue" && playlist.length > 0 && (
          <div className="px-3 py-2 border-b border-white/5 bg-white/[0.02] shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracks or episodes..."
                style={{ borderColor: searchQuery ? accentColor : undefined }}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:bg-white/10 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 text-neutral-400 hover:text-white transition"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="text-[10px] text-neutral-400 mt-1 pl-1 font-mono">
                Showing {filteredPlaylist.length} of {playlist.length}
              </div>
            )}
          </div>
        )}

        {/* Playlist Items List */}
        <motion.div
          ref={listRef}
          layoutScroll
          style={{ overflowAnchor: "none" }}
          className={`${
            activeTab === "queue"
              ? "flex-1 overflow-y-auto p-2.5 select-none"
              : "hidden"
          }`}
        >
          {playlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-neutral-500">
              <div
                style={{ backgroundColor: accentColor, borderColor: accentColor }}
                className="w-16 h-16 rounded-2xl border flex items-center justify-center mb-3"
              >
                <Film style={{ color: "var(--accent-text)" }} className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-neutral-200">Playlist is empty</p>
              <p className="text-xs mt-1 text-neutral-400 mb-5 max-w-[220px]">
                Drop videos here or click below to build your playback queue.
              </p>
              <button
                onClick={handleAddFiles}
                style={{
                  backgroundColor: accentColor,
                  color: accentText,
                  boxShadow: `0 4px 14px ${accentGlow}`,
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs active:scale-95 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Media Files</span>
              </button>
            </div>
          ) : filteredPlaylist.length === 0 ? (
            <div className="text-center py-10 text-neutral-400 text-xs">
              No matching tracks found for &quot;{searchQuery}&quot;
            </div>
          ) : searchQuery.trim() ? (
            <div className="space-y-1.5">
              {filteredPlaylist.map((item) => {
                const isActive = item.originalIndex === currentPlaylistIndex;
                return (
                  <div
                    key={item.id}
                    ref={isActive ? activeRowRef : undefined}
                    onClick={() => playPlaylistItem(item.originalIndex)}
                    style={{
                      borderColor: isActive ? accentColor : undefined,
                      backgroundColor: isActive ? `${accentGlow}` : undefined,
                    }}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? "text-white shadow-md"
                        : "bg-white/[0.04] border-white/5 text-neutral-300 hover:bg-white/[0.09] hover:border-white/15"
                    }`}
                  >
                    {renderRowInner(item, item.originalIndex)}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              <AnimatePresence initial={false}>
                {playlist.map((item, index) => {
                  const isActive = index === currentPlaylistIndex;
                  const isDragging = dragIndex === index;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      data-playlist-row
                      ref={isActive ? activeRowRef : undefined}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{
                        opacity: isDragging ? 0.85 : 1,
                        scale: isDragging ? 1.02 : 1,
                      }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 550, damping: 42, mass: 0.7 }}
                      onPointerDown={(e) => handleDragPointerDown(e, index)}
                      style={{
                        borderColor: isDragging || isActive ? accentColor : undefined,
                        backgroundColor: isActive ? `${accentGlow}` : undefined,
                        touchAction: "none",
                        zIndex: isDragging ? 20 : undefined,
                      }}
                      className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer border ${
                        isDragging
                          ? "shadow-2xl bg-neutral-800/95 text-white"
                          : `transition-colors ${
                              isActive
                                ? "text-white shadow-md"
                                : "bg-white/[0.04] border-white/5 text-neutral-300 hover:bg-white/[0.09] hover:border-white/15"
                            }`
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <GripVertical
                          className="w-3.5 h-3.5 shrink-0 -ml-1 text-neutral-600 group-hover:text-neutral-300 cursor-grab active:cursor-grabbing"
                          aria-hidden
                        />
                        {renderRowInner(item, index)}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </aside>
    </>
  );
}
