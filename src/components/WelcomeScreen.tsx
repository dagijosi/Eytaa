import { useState, useEffect, useCallback } from "react";
import { FolderOpen, Play, Clock, LayoutDashboard, Tv } from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { EytaaLogo } from "./EytaaLogo";
import { libraryService, LibraryItem } from "../services/library/libraryService";

export function WelcomeScreen() {
  const { openFile, recentFiles, toggleLibraryModal, isLibraryOpen } = usePlayerStore();
  const { accentColor, accentText } = useThemeStore();

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
        await openFile(selected, { clearQueue: true });
      }
    } catch (err) {
      console.error("Open file error:", err);
    }
  };

  const handlePlayUpNext = async () => {
    if (!upNextEpisode) return;
    const idx = upNextEpisode.allEpisodes.findIndex(
      (e) => e.file_path === upNextEpisode.episode.file_path,
    );
    const remaining =
      idx !== -1 && idx + 1 < upNextEpisode.allEpisodes.length
        ? upNextEpisode.allEpisodes.slice(idx + 1).map((e) => e.file_path)
        : [];
    await openFile(upNextEpisode.episode.file_path, {
      clearQueue: true,
      queueEpisodes: remaining,
    });
  };

  const latestRecent = recentFiles.length > 0 ? recentFiles[0] : null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-neutral-950 via-neutral-950 to-black select-none z-10 overflow-hidden">
      <div className="relative max-w-md w-full flex flex-col items-center text-center z-10 space-y-4">
        {/* Clean Emblem */}
        <div className="relative cursor-default">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <EytaaLogo className="w-full h-full" variant="color" />
          </div>
        </div>

        {/* Branding */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-[0.16em] text-white uppercase font-sans">
            EYTAA
          </h1>
          <p className="text-[11px] font-medium tracking-wide text-neutral-400 font-mono">
            Desktop Media Player • v2.0
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 w-full justify-center pt-1">
          <button
            onClick={handleOpenFile}
            style={{
              backgroundColor: accentColor,
              color: accentText,
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition duration-150 hover:brightness-110 active:scale-[0.98] cursor-pointer shrink-0 shadow-sm"
          >
            <FolderOpen className="w-4 h-4 fill-current" />
            <span>Open File</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[9px] bg-black/20 rounded font-mono">
              O
            </kbd>
          </button>

          <button
            onClick={() => toggleLibraryModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-medium text-xs transition duration-150 cursor-pointer border border-white/[0.08] hover:border-white/[0.16] active:scale-[0.98] shrink-0"
          >
            <LayoutDashboard className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span>Media Library</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[9px] bg-white/10 rounded font-mono text-neutral-300">
              B
            </kbd>
          </button>
        </div>

        {/* Quick Resume & Up Next Section */}
        <div className="w-full space-y-2 pt-1 max-w-md">
          {/* Continue Watching Highlight Card */}
          {inProgressItem && (
            <button
              onClick={() => openFile(inProgressItem.file_path, { clearQueue: true })}
              className="group flex flex-col p-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-900/90 border border-white/[0.08] hover:border-white/[0.18] transition duration-150 cursor-pointer w-full text-left overflow-hidden"
            >
              <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
                <span className="flex items-center gap-1.5 font-semibold text-xs tracking-tight" style={{ color: accentColor }}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </span>
                {inProgressItem.duration && inProgressItem.resume_position && (
                  <span
                    style={{ color: accentColor }}
                    className="font-medium text-[11px] tabular-nums px-1.5 py-0.5 rounded bg-white/[0.06] shrink-0"
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
                <div className="relative w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
                  <div
                    style={{ backgroundColor: accentColor, color: accentText }}
                    className="w-6 h-6 rounded-md flex items-center justify-center shadow-xs"
                  >
                    <Play className="w-3 h-3 fill-current translate-x-0.5" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  {inProgressItem.series_name && (
                    <p className="text-[10px] text-neutral-400 font-mono truncate">
                      {inProgressItem.series_name}
                    </p>
                  )}
                  <h4 className="text-xs font-medium text-neutral-100 group-hover:text-white line-clamp-1 leading-snug">
                    {inProgressItem.title}
                  </h4>
                </div>
              </div>

              {/* Progress bar */}
              {inProgressItem.duration && inProgressItem.resume_position && (
                <div className="w-full h-1 rounded-full bg-white/[0.08] overflow-hidden mt-2.5">
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
              className="group flex flex-col p-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-900/90 border border-white/[0.08] hover:border-white/[0.18] transition duration-150 cursor-pointer w-full text-left overflow-hidden"
            >
              <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
                <span className="flex items-center gap-1.5 font-semibold text-xs tracking-tight" style={{ color: accentColor }}>
                  <Tv className="w-3.5 h-3.5" />
                  <span>Up Next</span>
                </span>
                <span className="text-[11px] text-neutral-300 font-mono px-1.5 py-0.5 rounded bg-white/[0.06] tabular-nums">
                  {upNextEpisode.episode.season_number && upNextEpisode.episode.episode_number
                    ? `S${String(upNextEpisode.episode.season_number).padStart(2, "0")}E${String(
                        upNextEpisode.episode.episode_number,
                      ).padStart(2, "0")}`
                    : "Next Episode"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
                  <div
                    style={{
                      backgroundColor: accentColor,
                      color: accentText,
                    }}
                    className="w-6 h-6 rounded-md flex items-center justify-center shadow-xs"
                  >
                    <Play className="w-3 h-3 fill-current translate-x-0.5" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-neutral-400 font-mono truncate">
                    {upNextEpisode.seriesName}
                  </p>
                  <h4 className="text-xs font-medium text-neutral-100 group-hover:text-white line-clamp-1 leading-snug">
                    {upNextEpisode.episode.episode_title || upNextEpisode.episode.title}
                  </h4>
                </div>
              </div>
            </button>
          )}

          {/* Fallback to latest recent file if neither in-progress nor up-next exists */}
          {!inProgressItem && !upNextEpisode && latestRecent && (
            <button
              onClick={() => openFile(latestRecent.filePath, { clearQueue: true })}
              className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900/50 hover:bg-neutral-900/80 border border-white/[0.08] hover:border-white/[0.16] transition duration-150 cursor-pointer max-w-full text-left mx-auto"
              title={latestRecent.filePath}
            >
              <div
                style={{ backgroundColor: accentColor, color: accentText }}
                className="w-4 h-4 rounded flex items-center justify-center shrink-0"
              >
                <Play className="w-2.5 h-2.5 fill-current translate-x-0.2" />
              </div>
              <span className="text-xs text-neutral-300 group-hover:text-white truncate max-w-[260px]">
                {latestRecent.title || latestRecent.filePath.split(/[/\\]/).pop()}
              </span>
            </button>
          )}
        </div>

        {/* Drag-and-drop prompt hint */}
        <p className="text-[11px] text-neutral-500 font-sans tracking-wide pt-1">
          Drop any media file or folder to play
        </p>
      </div>
    </div>
  );
}
