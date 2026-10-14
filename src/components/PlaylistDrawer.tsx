import { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
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
} from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

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
  } = usePlayerStore();

  const { accentColor, accentGlow, accentText } = useThemeStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const isPlaying = status === "playing";

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

  const filteredPlaylist = useMemo(() => {
    if (!searchQuery.trim()) {
      return playlist.map((item, originalIndex) => ({ ...item, originalIndex }));
    }
    const q = searchQuery.toLowerCase();
    return playlist
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .filter((item) => item.title.toLowerCase().includes(q) || item.filePath.toLowerCase().includes(q));
  }, [playlist, searchQuery]);

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
        className={`fixed inset-y-0 right-0 w-80 sm:w-96 max-w-full bg-neutral-950/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-out transform ${
          isPlaylistOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-neutral-100">Playlist</span>
            <span
              style={{
                backgroundColor: `${accentGlow}`,
                color: accentColor,
                borderColor: accentColor,
              }}
              className="text-xs border px-2 py-0.5 rounded-full font-mono font-bold"
            >
              {playlist.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Sort Menu */}
            {playlist.length > 1 && (
              <div className="relative" ref={sortMenuRef}>
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  style={{
                    color: showSortMenu ? accentColor : undefined,
                  }}
                  className={`p-1.5 rounded-lg transition active:scale-95 ${
                    showSortMenu
                      ? "bg-white/10"
                      : "text-neutral-400 hover:text-white hover:bg-white/10"
                  }`}
                  title="Sort Playlist"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>

                {showSortMenu && (
                  <div className="absolute top-full right-0 mt-1 w-52 bg-neutral-900/98 backdrop-blur-2xl border border-white/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-0.5">
                      Sort Playlist By
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

                    <div className="h-px bg-white/10 my-0.5" />

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
                  </div>
                )}
              </div>
            )}

            {playlist.length > 1 && (
              <button
                onClick={shufflePlaylist}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition active:scale-95"
                title="Shuffle Playlist"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleAddFiles}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition active:scale-95"
              title="Add Files (+)"
            >
              <Plus className="w-4 h-4" />
            </button>

            {playlist.length > 0 && (
              <button
                onClick={clearPlaylist}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-white/10 transition active:scale-95"
                title="Clear Playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={togglePlaylistDrawer}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition active:scale-95 ml-1"
              title="Close (Esc / P)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        {playlist.length > 0 && (
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
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 select-none">
          {playlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-neutral-500">
              <div
                style={{ backgroundColor: `${accentGlow}`, borderColor: accentColor }}
                className="w-16 h-16 rounded-2xl border flex items-center justify-center mb-3"
              >
                <Film style={{ color: accentColor }} className="w-8 h-8" />
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
          ) : (
            filteredPlaylist.map((item) => {
              const originalIndex = item.originalIndex;
              const isActive = originalIndex === currentPlaylistIndex;
              const isAudio = /\.(mp3|flac|wav|m4a|aac|ogg)$/i.test(item.filePath);

              return (
                <div
                  key={item.id}
                  onClick={() => playPlaylistItem(originalIndex)}
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
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
