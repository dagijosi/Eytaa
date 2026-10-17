import { useState, useEffect, useCallback } from "react";
import { FolderOpen, Play, Clock, LayoutDashboard, Flame } from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { EytaaLogo } from "./EytaaLogo";
import { libraryService, LibraryItem } from "../services/library/libraryService";

export function WelcomeScreen() {
  const { openFile, recentFiles, toggleLibraryModal, addToPlaylist, isLibraryOpen } = usePlayerStore();
  const { accentColor, accentGlow, accentText } = useThemeStore();

  const [inProgressItem, setInProgressItem] = useState<LibraryItem | null>(null);
  const [upNextEpisode, setUpNextEpisode] = useState<{
    seriesName: string;
    episode: LibraryItem;
    allEpisodes: LibraryItem[];
  } | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const items = await libraryService.getLibraryItems();

      // 1. In-progress / partially watched video
      const inProgress = items
        .filter(
          (i) =>
            !i.is_watched &&
            typeof i.resume_position === "number" &&
            i.resume_position > 10 &&
            (!i.duration || i.resume_position < i.duration * 0.9),
        )
        .sort((a, b) => (b.resume_position ?? 0) - (a.resume_position ?? 0));

      setInProgressItem(inProgress.length > 0 ? inProgress[0] : null);

      // 2. Up Next episode in active TV series (grouped by canonical series_key)
      const seriesMap = new Map<string, LibraryItem[]>();
      for (const item of items) {
        if (item.category === "series" || item.series_name) {
          const sName = (item.series_name || "Unknown Series").trim();
          const key = item.series_key?.trim() || sName;
          if (!seriesMap.has(key)) seriesMap.set(key, []);
          seriesMap.get(key)!.push(item);
        }
      }

      let nextEp: {
        seriesName: string;
        episode: LibraryItem;
        allEpisodes: LibraryItem[];
      } | null = null;

      for (const episodes of seriesMap.values()) {
        const watchedCount = episodes.filter((ep) => ep.is_watched).length;
        if (watchedCount > 0 && watchedCount < episodes.length) {
          const sorted = [...episodes].sort((a, b) => {
            const sa = (a.season_number ?? 1) === 0 ? Infinity : (a.season_number ?? 1);
            const sb = (b.season_number ?? 1) === 0 ? Infinity : (b.season_number ?? 1);
            const sDiff = sa - sb;
            if (sDiff !== 0) return sDiff;
            return (a.episode_number ?? 0) - (b.episode_number ?? 0);
          });
          // Never auto-suggest specials (season 0)
          const target = sorted.find(
            (ep) => !ep.is_watched && (ep.season_number ?? 1) !== 0,
          );
          if (target) {
            nextEp = {
              seriesName: target.series_name || sorted[0].series_name || "Unknown Series",
              episode: target,
              allEpisodes: sorted,
            };
            break;
          }
        }
      }

      setUpNextEpisode(nextEp);
    } catch {
      setInProgressItem(null);
      setUpNextEpisode(null);
    }
  }, []);

  useEffect(() => {
    refreshData();

    // Dynamically react whenever library is changed anywhere (watch toggled, metadata edited, etc.)
    const unsubscribe = libraryService.onLibraryChange(() => {
      refreshData();
    });

    const handleFocus = () => refreshData();
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshData]);

  // When returning from Library modal to Welcome Screen, re-evaluate items immediately
  useEffect(() => {
    if (!isLibraryOpen) {
      refreshData();
    }
  }, [isLibraryOpen, refreshData]);

  const handleOpenFile = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Video & Audio Files",
            extensions: ["mp4", "mkv", "webm", "avi", "mov", "mp3", "flac", "wav", "m4a", "ts", "m2ts"],
          },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (selected && typeof selected === "string") {
        await openFile(selected);
      }
    } catch (err) {
      console.error("Open file error:", err);
    }
  };

  const handlePlayUpNext = async () => {
    if (!upNextEpisode) return;
    await openFile(upNextEpisode.episode.file_path);
    const idx = upNextEpisode.allEpisodes.findIndex(
      (e) => e.file_path === upNextEpisode.episode.file_path,
    );
    if (idx !== -1 && idx + 1 < upNextEpisode.allEpisodes.length) {
      const remaining = upNextEpisode.allEpisodes
        .slice(idx + 1)
        .map((e) => e.file_path);
      addToPlaylist(remaining);
    }
  };

  const latestRecent = recentFiles.length > 0 ? recentFiles[0] : null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-radial from-neutral-900/80 via-neutral-950 to-black select-none z-10 overflow-hidden">
      {/* Ambient background glow */}
      <div
        style={{ backgroundColor: accentGlow }}
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-40 -translate-y-12"
      />

      <div className="relative max-w-md w-full flex flex-col items-center text-center z-10 space-y-4">
        {/* Emblem */}
        <div className="relative group cursor-default">
          <div className="absolute -inset-3 rounded-full blur-2xl opacity-30 bg-gradient-to-r from-amber-500/40 via-cyan-500/25 to-sky-500/40 pointer-events-none" />
          <div className="relative w-18 h-18 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <EytaaLogo className="w-full h-full" variant="color" />
          </div>
        </div>

        {/* Branding */}
        <div className="space-y-0.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-[0.2em] text-white uppercase font-sans">
            EYTAA
          </h1>
          <p className="text-xs font-medium tracking-wide text-neutral-400 font-mono">
            Every story, in view. • v2.0
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 w-full justify-center pt-1">
          <button
            onClick={handleOpenFile}
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 6px 20px ${accentGlow}`,
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-95 font-bold text-xs transition cursor-pointer shrink-0"
          >
            <FolderOpen className="w-4 h-4 fill-current" />
            <span>Open File</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[9px] bg-black/20 rounded font-mono">
              O
            </kbd>
          </button>

          <button
            onClick={() => toggleLibraryModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer border border-white/10 hover:border-white/20 active:scale-95 shrink-0"
          >
            <LayoutDashboard className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span>Smart Media Center</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[9px] bg-black/20 rounded font-mono">
              B
            </kbd>
          </button>
        </div>

        {/* Quick Resume & Up Next Section */}
        <div className="w-full space-y-2.5 pt-1 max-w-md">
          {/* Continue Watching Highlight Card */}
          {inProgressItem && (
            <button
              onClick={() => openFile(inProgressItem.file_path)}
              className="group flex flex-col p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition cursor-pointer w-full text-left shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                <span className="flex items-center gap-1.5 font-bold" style={{ color: accentColor }}>
                  <Clock className="w-3 h-3" />
                  <span>CONTINUE WATCHING</span>
                </span>
                {inProgressItem.duration && inProgressItem.resume_position && (
                  <span
                    style={{ color: accentColor }}
                    className="font-bold px-1.5 py-0.5 rounded-md bg-white/5 shrink-0"
                  >
                    {Math.round((inProgressItem.resume_position / inProgressItem.duration) * 100)}%
                    {(() => {
                      const rem = Math.max(0, inProgressItem.duration - inProgressItem.resume_position);
                      const m = Math.floor(rem / 60);
                      if (m < 60) return ` • ${m}m left`;
                      const h = Math.floor(m / 60);
                      return ` • ${h}h ${m % 60}m left`;
                    })()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-neutral-900/90 border border-white/20 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 group-hover:border-white/40 transition">
                  <div
                    style={{ backgroundColor: accentColor, color: accentText, boxShadow: `0 2px 10px ${accentGlow}` }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  {inProgressItem.series_name && (
                    <p className="text-[10px] font-mono text-neutral-400 truncate">
                      {inProgressItem.series_name}
                    </p>
                  )}
                  <h4 className="text-xs font-bold text-white group-hover:text-neutral-100 line-clamp-2 leading-snug">
                    {inProgressItem.title}
                  </h4>
                </div>
              </div>

              {/* Progress bar */}
              {inProgressItem.duration && inProgressItem.resume_position && (
                <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mt-3">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((inProgressItem.resume_position / inProgressItem.duration) * 100),
                      )}%`,
                      backgroundColor: accentColor,
                    }}
                    className="h-full rounded-full transition-all duration-300"
                  />
                </div>
              )}
            </button>
          )}

          {/* Up Next in Active Series Card */}
          {upNextEpisode && (!inProgressItem || inProgressItem.file_path !== upNextEpisode.episode.file_path) && (
            <button
              onClick={handlePlayUpNext}
              className="group flex flex-col p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition cursor-pointer w-full text-left shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                <span className="flex items-center gap-1.5 font-bold" style={{ color: accentColor }}>
                  <Flame className="w-3 h-3" />
                  <span>UP NEXT IN SHOW</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-300 font-bold px-1.5 py-0.5 rounded-md bg-white/5">
                  {upNextEpisode.episode.season_number && upNextEpisode.episode.episode_number
                    ? `S${String(upNextEpisode.episode.season_number).padStart(2, "0")}E${String(
                        upNextEpisode.episode.episode_number,
                      ).padStart(2, "0")}`
                    : "Next Episode"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-neutral-900/90 border border-white/20 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 group-hover:border-white/40 transition">
                  <div
                    style={{
                      backgroundColor: accentColor,
                      color: accentText,
                      boxShadow: `0 2px 10px ${accentGlow}`,
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono text-neutral-400 truncate">
                    {upNextEpisode.seriesName}
                  </p>
                  <h4 className="text-xs font-bold text-white group-hover:text-neutral-100 line-clamp-2 leading-snug">
                    {upNextEpisode.episode.episode_title || upNextEpisode.episode.title}
                  </h4>
                </div>
              </div>
            </button>
          )}

          {/* Fallback to latest recent file if neither in-progress nor up-next exists */}
          {!inProgressItem && !upNextEpisode && latestRecent && (
            <button
              onClick={() => openFile(latestRecent.filePath)}
              className="group flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition cursor-pointer max-w-full text-left mx-auto"
              title={latestRecent.filePath}
            >
              <div
                style={{ backgroundColor: accentColor, color: accentText }}
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
              >
                <Play className="w-2 h-2 fill-current translate-x-0.2" />
              </div>
              <span className="text-[11px] text-neutral-300 group-hover:text-white truncate max-w-[240px]">
                Play: {latestRecent.title || latestRecent.filePath.split(/[/\\]/).pop()}
              </span>
            </button>
          )}
        </div>

        {/* Drag-and-drop prompt hint */}
        <p className="text-[11px] text-neutral-500 font-mono pt-1">
          Drop any file anywhere to play
        </p>
      </div>
    </div>
  );
}
