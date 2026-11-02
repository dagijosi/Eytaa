import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Search,
  Play,
  Pause,
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  FolderOpen,
  Film,
  Tv,
  BarChart3,
  Moon,
  Repeat,
  Layers,
  Settings,
  Link2,
  Trash2,
  Copy,
  Sliders,
  History,
  Music,
  X,
  CornerDownLeft,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { libraryService, type LibraryItem } from "../services/library/libraryService";
import { formatSeconds } from "./controlBar/shared";

type PaletteCategory = "all" | "Playback" | "Audio & Subs" | "Navigation" | "Library";

interface PaletteCommand {
  id: string;
  title: string;
  category: "Playback" | "Audio & Subs" | "Navigation" | "Library";
  shortcut?: string;
  icon: typeof Play;
  action: () => Promise<void> | void;
  keywords?: string[];
  badge?: string;
  description?: string;
}

const CATEGORY_TABS: Array<{ id: PaletteCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "Playback", label: "Playback" },
  { id: "Audio & Subs", label: "Audio & Subs" },
  { id: "Navigation", label: "Navigation" },
  { id: "Library", label: "Media" },
];

export function CommandPalette() {
  const {
    isCommandPaletteOpen,
    toggleCommandPalette,
    status,
    togglePlayback,
    takeScreenshot,
    setAbLoopA,
    setAbLoopB,
    clearAbLoop,
    toggleNightListening,
    isNightListening,
    toggleAlwaysOnTop,
    togglePiP,
    toggleLibraryModal,
    toggleSettingsModal,
    togglePlaylistDrawer,
    toggleUrlModal,
    clearPlaylist,
    muted,
    toggleMute,
    setPlaybackRate,
    resetSyncDelays,
    selectAudioTrack,
    audioTracks,
    currentAudioTrackId,
    selectSubtitleTrack,
    subtitleTracks,
    currentSubtitleTrackId,
    openFile,
    recentFiles,
  } = usePlayerStore(
    useShallow((s) => ({
      isCommandPaletteOpen: s.isCommandPaletteOpen,
      toggleCommandPalette: s.toggleCommandPalette,
      status: s.status,
      togglePlayback: s.togglePlayback,
      takeScreenshot: s.takeScreenshot,
      setAbLoopA: s.setAbLoopA,
      setAbLoopB: s.setAbLoopB,
      clearAbLoop: s.clearAbLoop,
      toggleNightListening: s.toggleNightListening,
      isNightListening: s.isNightListening,
      toggleAlwaysOnTop: s.toggleAlwaysOnTop,
      togglePiP: s.togglePiP,
      toggleLibraryModal: s.toggleLibraryModal,
      toggleSettingsModal: s.toggleSettingsModal,
      togglePlaylistDrawer: s.togglePlaylistDrawer,
      toggleUrlModal: s.toggleUrlModal,
      clearPlaylist: s.clearPlaylist,
      muted: s.muted,
      toggleMute: s.toggleMute,
      setPlaybackRate: s.setPlaybackRate,
      resetSyncDelays: s.resetSyncDelays,
      selectAudioTrack: s.selectAudioTrack,
      audioTracks: s.audioTracks,
      currentAudioTrackId: s.currentAudioTrackId,
      selectSubtitleTrack: s.selectSubtitleTrack,
      subtitleTracks: s.subtitleTracks,
      currentSubtitleTrackId: s.currentSubtitleTrackId,
      openFile: s.openFile,
      recentFiles: s.recentFiles,
    })),
  );

  const { accentColor } = useThemeStore(
    useShallow((s) => ({
      accentColor: s.accentColor,
    })),
  );

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<PaletteCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [libraryResults, setLibraryResults] = useState<LibraryItem[]>([]);
  const [isSearchingLibrary, setIsSearchingLibrary] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input and reset state when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery("");
      setActiveTab("all");
      setSelectedIndex(0);
      setLibraryResults([]);
      const timer = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    }
  }, [isCommandPaletteOpen]);

  // Debounced search for library media
  useEffect(() => {
    const trimmed = query.trim();
    if (!isCommandPaletteOpen || trimmed.length < 2) {
      setLibraryResults([]);
      setIsSearchingLibrary(false);
      return;
    }

    setIsSearchingLibrary(true);
    const timer = setTimeout(async () => {
      try {
        const items = await libraryService.getLibraryItems({
          search: trimmed,
          limit: 8,
        });
        setLibraryResults(items);
      } catch {
        setLibraryResults([]);
      } finally {
        setIsSearchingLibrary(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [query, isCommandPaletteOpen]);

  const close = useCallback(() => {
    toggleCommandPalette(false);
  }, [toggleCommandPalette]);

  // Static indexed command list
  const staticCommands = useMemo<PaletteCommand[]>(() => {
    const isPlaying = status === "playing";

    const commands: PaletteCommand[] = [
      // Playback Controls
      {
        id: "toggle-playback",
        title: isPlaying ? "Pause Playback" : "Resume Playback",
        category: "Playback",
        icon: isPlaying ? Pause : Play,
        shortcut: "Space",
        keywords: ["play", "pause", "resume", "stop"],
        action: () => togglePlayback(),
      },
      {
        id: "screenshot-clean",
        title: "Take Lossless Screenshot (Clean Video)",
        category: "Playback",
        icon: Camera,
        shortcut: "Ctrl+Shift+S",
        keywords: ["screenshot", "capture", "frame", "snapshot", "image"],
        action: async () => {
          await takeScreenshot({ mode: "video", copyToClipboard: false });
        },
      },
      {
        id: "screenshot-clipboard",
        title: "Copy Video Frame to Clipboard",
        category: "Playback",
        icon: Copy,
        shortcut: "Shift+S",
        keywords: ["copy", "clipboard", "screenshot", "paste"],
        action: async () => {
          await takeScreenshot({ mode: "video", copyToClipboard: true });
        },
      },
      {
        id: "screenshot-subs",
        title: "Take Screenshot With Subtitles",
        category: "Playback",
        icon: Camera,
        shortcut: "S",
        keywords: ["screenshot", "subtitles", "text", "subs"],
        action: async () => {
          await takeScreenshot({ mode: "subtitles", copyToClipboard: false });
        },
      },
      {
        id: "ab-loop-a",
        title: "A-B Loop: Set Start Point [A]",
        category: "Playback",
        icon: Repeat,
        shortcut: "[",
        keywords: ["loop", "repeat", "segment", "start", "a-b"],
        action: () => setAbLoopA(),
      },
      {
        id: "ab-loop-b",
        title: "A-B Loop: Set End Point [B]",
        category: "Playback",
        icon: Repeat,
        shortcut: "]",
        keywords: ["loop", "repeat", "segment", "end", "a-b"],
        action: () => setAbLoopB(),
      },
      {
        id: "ab-loop-clear",
        title: "A-B Loop: Clear Active Loop",
        category: "Playback",
        icon: RotateCcw,
        shortcut: "\\",
        keywords: ["clear", "loop", "reset", "a-b"],
        action: () => clearAbLoop(),
      },
      {
        id: "toggle-fullscreen",
        title: "Toggle Fullscreen Mode",
        category: "Playback",
        icon: Maximize2,
        shortcut: "F",
        keywords: ["fullscreen", "maximize", "window"],
        action: async () => {
          const win = getCurrentWindow();
          const isFs = await win.isFullscreen();
          await win.setFullscreen(!isFs);
        },
      },
      {
        id: "toggle-pip",
        title: "Toggle Picture-in-Picture (PiP)",
        category: "Playback",
        icon: Layers,
        shortcut: "I",
        keywords: ["pip", "picture", "float", "overlay", "mini"],
        action: () => togglePiP(),
      },
      {
        id: "speed-100",
        title: "Playback Speed: 1.0x (Normal)",
        category: "Playback",
        icon: RotateCcw,
        keywords: ["speed", "rate", "tempo", "1.0", "normal"],
        action: () => setPlaybackRate(1.0),
      },
      {
        id: "speed-125",
        title: "Playback Speed: 1.25x",
        category: "Playback",
        icon: Play,
        keywords: ["speed", "rate", "1.25", "fast"],
        action: () => setPlaybackRate(1.25),
      },
      {
        id: "speed-150",
        title: "Playback Speed: 1.5x",
        category: "Playback",
        icon: Play,
        keywords: ["speed", "rate", "1.5", "faster"],
        action: () => setPlaybackRate(1.5),
      },
      {
        id: "speed-200",
        title: "Playback Speed: 2.0x",
        category: "Playback",
        icon: Play,
        keywords: ["speed", "rate", "2.0", "double"],
        action: () => setPlaybackRate(2.0),
      },

      // Audio & Subtitles
      {
        id: "night-mode",
        title: isNightListening
          ? "Disable Night Mode (Voice Normalizer)"
          : "Enable Night Mode (Voice Normalizer)",
        category: "Audio & Subs",
        icon: Moon,
        shortcut: "N",
        keywords: ["night", "audio", "normalize", "dialogue", "compressor", "loudness", "whisper"],
        badge: isNightListening ? "Active" : undefined,
        action: () => toggleNightListening(),
      },
      {
        id: "toggle-mute",
        title: muted ? "Unmute Audio" : "Mute Audio",
        category: "Audio & Subs",
        icon: muted ? VolumeX : Volume2,
        shortcut: "M",
        keywords: ["mute", "unmute", "volume", "sound", "silent"],
        action: () => toggleMute(),
      },
      {
        id: "reset-sync",
        title: "Reset Audio & Subtitle Sync Delays (0ms)",
        category: "Audio & Subs",
        icon: RotateCcw,
        keywords: ["sync", "delay", "audio delay", "sub delay", "offset", "reset"],
        action: () => resetSyncDelays(),
      },
      {
        id: "cycle-audio",
        title: "Cycle Next Audio Track",
        category: "Audio & Subs",
        icon: Volume2,
        shortcut: "A",
        keywords: ["audio", "track", "language", "voice", "dub"],
        action: () => {
          if (audioTracks.length > 1) {
            const curIdx = audioTracks.findIndex((t) => t.id === currentAudioTrackId);
            const nextIdx = (curIdx + 1) % audioTracks.length;
            selectAudioTrack(audioTracks[nextIdx].id);
          }
        },
      },
      {
        id: "cycle-subtitles",
        title: "Cycle Next Subtitle Track",
        category: "Audio & Subs",
        icon: Sliders,
        shortcut: "V",
        keywords: ["subtitle", "subs", "captions", "track", "language"],
        action: () => {
          if (subtitleTracks.length > 0) {
            const curIdx = subtitleTracks.findIndex((t) => t.id === currentSubtitleTrackId);
            const nextIdx = (curIdx + 1) % (subtitleTracks.length + 1);
            if (nextIdx === subtitleTracks.length) {
              selectSubtitleTrack(0); // Off
            } else {
              selectSubtitleTrack(subtitleTracks[nextIdx].id);
            }
          }
        },
      },

      // Navigation & Views
      {
        id: "nav-library",
        title: "Open Media Center / Library",
        category: "Navigation",
        icon: FolderOpen,
        shortcut: "B",
        keywords: ["library", "media", "movies", "series", "collection", "browse"],
        action: () => toggleLibraryModal(true),
      },
      {
        id: "nav-watch-report",
        title: "Open Watch Report & Analytics",
        category: "Navigation",
        icon: BarChart3,
        keywords: ["analytics", "report", "stats", "watch time", "history", "watched"],
        action: () => toggleLibraryModal(true),
      },
      {
        id: "nav-settings",
        title: "Open Settings & Preferences",
        category: "Navigation",
        icon: Settings,
        shortcut: "Ctrl+,",
        keywords: ["settings", "preferences", "config", "shortcuts", "hotkeys", "theme"],
        action: () => toggleSettingsModal(true),
      },
      {
        id: "nav-playlist",
        title: "Toggle Playlist Queue Drawer",
        category: "Navigation",
        icon: Film,
        shortcut: "P",
        keywords: ["playlist", "queue", "drawer", "episodes"],
        action: () => togglePlaylistDrawer(),
      },
      {
        id: "nav-open-url",
        title: "Open Network Stream URL",
        category: "Navigation",
        icon: Link2,
        shortcut: "U",
        keywords: ["url", "stream", "network", "hls", "http", "iptv"],
        action: () => toggleUrlModal(true),
      },
      {
        id: "toggle-always-on-top",
        title: "Toggle Always On Top Window",
        category: "Navigation",
        icon: Layers,
        keywords: ["pin", "top", "window", "overlay"],
        action: () => toggleAlwaysOnTop(),
      },
      {
        id: "clear-playlist",
        title: "Clear Current Playlist",
        category: "Navigation",
        icon: Trash2,
        keywords: ["clear", "playlist", "empty", "remove"],
        action: () => clearPlaylist(),
      },
    ];

    return commands;
  }, [
    status,
    isNightListening,
    muted,
    audioTracks,
    currentAudioTrackId,
    subtitleTracks,
    currentSubtitleTrackId,
    togglePlayback,
    takeScreenshot,
    setAbLoopA,
    setAbLoopB,
    clearAbLoop,
    toggleNightListening,
    togglePiP,
    toggleMute,
    setPlaybackRate,
    resetSyncDelays,
    selectAudioTrack,
    selectSubtitleTrack,
    toggleAlwaysOnTop,
    toggleLibraryModal,
    toggleSettingsModal,
    togglePlaylistDrawer,
    toggleUrlModal,
    clearPlaylist,
  ]);

  // Combined flat list matching current search query and active tab
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Filtered action commands
    let matchedCommands = staticCommands;
    if (q) {
      matchedCommands = staticCommands.filter((cmd) => {
        if (cmd.title.toLowerCase().includes(q)) return true;
        if (cmd.category.toLowerCase().includes(q)) return true;
        if (cmd.keywords?.some((k) => k.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    if (activeTab !== "all") {
      matchedCommands = matchedCommands.filter((c) => c.category === activeTab);
    }

    // 2. Library Media items
    let mediaCommands: PaletteCommand[] = [];
    if (activeTab === "all" || activeTab === "Library") {
      mediaCommands = libraryResults.map((item) => {
        const isMovie = item.category === "movie";
        const isAudio = item.media_type === "audio";
        const badge = item.series_name
          ? `S${String(item.season_number || 1).padStart(2, "0")}E${String(item.episode_number || 1).padStart(2, "0")}`
          : isMovie
          ? "Movie"
          : isAudio
          ? "Audio"
          : "Video";

        return {
          id: `media-${item.id}`,
          title: item.title || item.file_name,
          category: "Library" as const,
          icon: isAudio ? Music : item.series_name ? Tv : Film,
          badge,
          description: item.duration ? formatSeconds(item.duration) : undefined,
          action: async () => {
            await openFile(item.file_path);
          },
        };
      });

      // 3. If query is empty and no library search, surface recent files in Library section
      if (!q && recentFiles && recentFiles.length > 0) {
        const recentCommands: PaletteCommand[] = recentFiles.slice(0, 5).map((rec, i) => ({
          id: `recent-${i}`,
          title: rec.title || rec.filePath.split(/[/\\]/).pop() || rec.filePath,
          category: "Library" as const,
          icon: History,
          badge: "Recent",
          description: rec.duration
            ? `${formatSeconds(rec.position ?? 0)} / ${formatSeconds(rec.duration)}`
            : undefined,
          action: async () => {
            await openFile(rec.filePath);
          },
        }));
        mediaCommands = [...mediaCommands, ...recentCommands];
      }
    }

    return [...matchedCommands, ...mediaCommands];
  }, [query, activeTab, staticCommands, libraryResults, recentFiles, openFile]);

  // Group items by category for visual hierarchy
  const groupedSections = useMemo(() => {
    const categories: Array<{ category: PaletteCommand["category"]; label: string }> = [
      { category: "Playback", label: "Playback Controls" },
      { category: "Audio & Subs", label: "Audio & Subtitles" },
      { category: "Navigation", label: "Navigation & Views" },
      { category: "Library", label: "Media & Recent" },
    ];

    const result: Array<{
      category: PaletteCommand["category"];
      label: string;
      items: Array<{ item: PaletteCommand; globalIndex: number }>;
    }> = [];

    let globalIndex = 0;
    const itemWithIndex = filteredItems.map((item) => ({
      item,
      globalIndex: globalIndex++,
    }));

    for (const cat of categories) {
      const itemsInCat = itemWithIndex.filter((entry) => entry.item.category === cat.category);
      if (itemsInCat.length > 0) {
        result.push({
          category: cat.category,
          label: cat.label,
          items: itemsInCat,
        });
      }
    }

    return result;
  }, [filteredItems]);

  // Reset selectedIndex when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, query, activeTab]);

  // Execute selected item
  const executeItem = useCallback(
    async (item: PaletteCommand) => {
      close();
      try {
        await item.action();
      } catch (e) {
        console.error("Failed to execute palette action:", e);
      }
    },
    [close],
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length === 0 ? 0 : (prev + 1) % filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length === 0 ? 0 : (prev - 1 + filteredItems.length) % filteredItems.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        executeItem(filteredItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (query) {
        setQuery("");
      } else {
        close();
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const currentIndex = CATEGORY_TABS.findIndex((t) => t.id === activeTab);
      const nextIndex = e.shiftKey
        ? (currentIndex - 1 + CATEGORY_TABS.length) % CATEGORY_TABS.length
        : (currentIndex + 1) % CATEGORY_TABS.length;
      setActiveTab(CATEGORY_TABS[nextIndex].id);
    }
  };

  // Keep highlighted item in view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-100 select-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {/* Obsidian Spotlight Card */}
      <div
        className="w-full max-w-xl bg-neutral-950/98 border border-white/12 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col drop-shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-neutral-200"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08] bg-white/[0.015]">
          <Search
            style={{ color: accentColor }}
            className="w-4 h-4 shrink-0 opacity-80"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search media..."
            className="flex-1 bg-transparent text-white text-sm placeholder-neutral-500 focus:outline-none"
          />
          {isSearchingLibrary && (
            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin shrink-0" />
          )}
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-neutral-500 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="text-[10px] font-mono text-neutral-400 bg-neutral-900 border border-white/15 px-1.5 py-0.5 rounded shadow-xs select-none">
              ESC
            </kbd>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/[0.06] bg-black/30 overflow-x-auto no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={
                  isActive
                    ? {
                        backgroundColor: `${accentColor}20`,
                        color: accentColor,
                        borderColor: `${accentColor}40`,
                      }
                    : undefined
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 border ${
                  isActive
                    ? "font-semibold shadow-xs"
                    : "border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[360px] overflow-y-auto overflow-x-hidden p-2 flex flex-col focus:outline-none"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-neutral-500 gap-1.5 select-none">
              <Search className="w-7 h-7 opacity-30 stroke-[1.5]" />
              <p className="text-sm font-medium text-neutral-400">No commands or media found</p>
              <p className="text-xs text-neutral-600">
                Try searching for playback, screenshots, audio, or title
              </p>
            </div>
          ) : (
            groupedSections.map((section) => (
              <div key={section.category} className="flex flex-col mb-2 last:mb-0">
                {/* Category Header */}
                <div className="px-2.5 pt-2 pb-1 text-[10px] font-mono font-semibold tracking-wider uppercase text-neutral-500 select-none">
                  {section.label}
                </div>

                {/* Section Commands */}
                <div className="flex flex-col gap-0.5">
                  {section.items.map(({ item, globalIndex }) => {
                    const isSelected = globalIndex === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        data-index={globalIndex}
                        onClick={() => executeItem(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-left transition-colors duration-100 group border cursor-pointer ${
                          isSelected
                            ? "bg-white/[0.08] border-white/10 text-white shadow-xs"
                            : "border-transparent text-neutral-300 hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Normalized icon box */}
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-white/15 text-white"
                                : "bg-white/[0.04] text-neutral-400 group-hover:text-neutral-200"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 stroke-[1.75]" />
                          </div>

                          <div className="min-w-0 flex flex-col leading-tight">
                            <span className="text-xs font-medium truncate tracking-tight">
                              {item.title}
                            </span>
                            {item.description && (
                              <span className="text-[11px] text-neutral-400 font-mono tabular-nums truncate mt-0.5">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {item.badge && (
                            <span
                              style={
                                item.badge === "Active"
                                  ? { backgroundColor: `${accentColor}25`, color: accentColor }
                                  : undefined
                              }
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-400 font-medium"
                            >
                              {item.badge}
                            </span>
                          )}

                          {item.shortcut && (
                            <kbd className="text-[10px] font-mono text-neutral-300 bg-neutral-900 border border-white/15 px-1.5 py-0.5 rounded shadow-xs group-hover:text-white select-none">
                              {item.shortcut}
                            </kbd>
                          )}

                          {/* Action hint indicator on selected row */}
                          {isSelected && (
                            <div className="flex items-center text-neutral-400 ml-1">
                              <CornerDownLeft className="w-3 h-3 opacity-70" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quiet desktop footer */}
        <div className="h-8 px-3.5 border-t border-white/[0.08] bg-black/40 flex items-center justify-between text-[11px] text-neutral-400 font-mono select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-neutral-900 border border-white/15 px-1 py-0.2 rounded text-[10px] text-neutral-300">
                ↑↓
              </kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-neutral-900 border border-white/15 px-1 py-0.2 rounded text-[10px] text-neutral-300">
                ↵
              </kbd>
              <span>run</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-neutral-900 border border-white/15 px-1 py-0.2 rounded text-[10px] text-neutral-300">
                tab
              </kbd>
              <span>filter</span>
            </span>
          </div>

          <span className="text-neutral-500 tabular-nums">
            {filteredItems.length} {filteredItems.length === 1 ? "result" : "results"}
          </span>
        </div>
      </div>
    </div>
  );
}
