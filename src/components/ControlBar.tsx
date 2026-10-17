import { useState, useRef, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Gauge,
  Subtitles,
  ListVideo,
  Sliders,
  Scaling,
  Moon,
  PictureInPicture2,
  Layers,
  Tv,
  MoreHorizontal,
  Check,
  Film,
  Headphones,
  Mic,
  Repeat,
  Repeat1,
  ListEnd,
  Camera,
} from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { toggleWindowFullscreen } from "../utils/windowControls";

function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function ControlBar() {
  const {
    status,
    currentTime,
    duration,
    volume,
    muted,
    playbackRate,
    subtitleTracks,
    audioTracks,
    currentAudioTrackId,
    selectAudioTrack,
    currentSubtitleTrackId,
    playlist,
    togglePlayback,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setPlaybackRate,
    selectSubtitleTrack,
    toggleSubtitleTrack,
    loadSubtitle,
    playNext,
    playPrevious,
    togglePlaylistDrawer,
    toggleSettingsModal,
    videoFitMode,
    cycleVideoFitMode,
    isPiP,
    togglePiP,
    sleepTimer,
    toggleSleepTimer,
    isNightListening,
    profiles,
    activeProfileId,
    applyProfile,
    repeatMode,
    setRepeatMode,
    autoPlayNext,
    toggleAutoPlayNext,
    takeScreenshot,
    showStats,
    toggleStats,
  } = usePlayerStore(
    useShallow((s) => ({
      status: s.status,
      currentTime: s.currentTime,
      duration: s.duration,
      volume: s.volume,
      muted: s.muted,
      playbackRate: s.playbackRate,
      subtitleTracks: s.subtitleTracks,
      audioTracks: s.audioTracks,
      currentAudioTrackId: s.currentAudioTrackId,
      selectAudioTrack: s.selectAudioTrack,
      currentSubtitleTrackId: s.currentSubtitleTrackId,
      playlist: s.playlist,
      togglePlayback: s.togglePlayback,
      seek: s.seek,
      seekRelative: s.seekRelative,
      setVolume: s.setVolume,
      toggleMute: s.toggleMute,
      setPlaybackRate: s.setPlaybackRate,
      selectSubtitleTrack: s.selectSubtitleTrack,
      toggleSubtitleTrack: s.toggleSubtitleTrack,
      loadSubtitle: s.loadSubtitle,
      playNext: s.playNext,
      playPrevious: s.playPrevious,
      togglePlaylistDrawer: s.togglePlaylistDrawer,
      toggleSettingsModal: s.toggleSettingsModal,
      videoFitMode: s.videoFitMode,
      cycleVideoFitMode: s.cycleVideoFitMode,
      isPiP: s.isPiP,
      togglePiP: s.togglePiP,
      sleepTimer: s.sleepTimer,
      toggleSleepTimer: s.toggleSleepTimer,
      isNightListening: s.isNightListening,
      profiles: s.profiles,
      activeProfileId: s.activeProfileId,
      applyProfile: s.applyProfile,
      repeatMode: s.repeatMode,
      setRepeatMode: s.setRepeatMode,
      autoPlayNext: s.autoPlayNext,
      toggleAutoPlayNext: s.toggleAutoPlayNext,
      chapters: s.chapters,
      currentChapterIndex: s.currentChapterIndex,
      seekToChapter: s.seekToChapter,
      takeScreenshot: s.takeScreenshot,
      showStats: s.showStats,
      toggleStats: s.toggleStats,
    })),
  );

  const {
    accentColor,
    accentGlow,
    accentText,
    scrubberGlow,
    scrubberHeight,
  } = useThemeStore();

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showChapterMenu, setShowChapterMenu] = useState(false);
  const [showRepeatMenu, setShowRepeatMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const scrubberRef = useRef<HTMLDivElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const audioMenuRef = useRef<HTMLDivElement>(null);
  const chapterMenuRef = useRef<HTMLDivElement>(null);
  const repeatMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const seekRafRef = useRef<number | null>(null);

  const isPlaying = status === "playing";
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const checkFullscreen = async () => {
      try {
        const appWindow = getCurrentWindow();
        setIsFullscreen(await appWindow.isFullscreen());
      } catch (e) {
        console.warn("Fullscreen check error:", e);
      }
    };
    checkFullscreen();
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (speedMenuRef.current && !speedMenuRef.current.contains(target)) {
        setShowSpeedMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (subMenuRef.current && !subMenuRef.current.contains(target)) {
        setShowSubMenu(false);
      }
      if (audioMenuRef.current && !audioMenuRef.current.contains(target)) {
        setShowAudioMenu(false);
      }
      if (chapterMenuRef.current && !chapterMenuRef.current.contains(target)) {
        setShowChapterMenu(false);
      }
      if (repeatMenuRef.current && !repeatMenuRef.current.contains(target)) {
        setShowRepeatMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setShowMoreMenu(false);
      }
    };
    if (showSpeedMenu || showProfileMenu || showSubMenu || showAudioMenu || showChapterMenu || showRepeatMenu || showMoreMenu) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showSpeedMenu, showProfileMenu, showSubMenu, showAudioMenu, showChapterMenu, showRepeatMenu, showMoreMenu]);

  const handleToggleFullscreen = async () => {
    const newFs = await toggleWindowFullscreen();
    setIsFullscreen(newFs);
  };

  // Coalesce rapid scrub seeks into a single IPC call per animation frame so
  // dragging the scrubber doesn't flood the mpv command queue.
  const flushPendingSeek = () => {
    if (pendingSeekRef.current !== null) {
      seek(pendingSeekRef.current);
      pendingSeekRef.current = null;
    }
  };

  const scheduleSeek = (seconds: number) => {
    pendingSeekRef.current = seconds;
    if (seekRafRef.current === null) {
      seekRafRef.current = window.requestAnimationFrame(() => {
        seekRafRef.current = null;
        flushPendingSeek();
      });
    }
  };

  useEffect(() => {
    return () => {
      if (seekRafRef.current !== null) {
        window.cancelAnimationFrame(seekRafRef.current);
      }
    };
  }, []);

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    setHoverPosition(x);
    setHoverTime(ratio * duration);

    if (isScrubbing) {
      scheduleSeek(ratio * duration);
    }
  };

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    setIsScrubbing(true);
    const rect = scrubberRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    seek(ratio * duration);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      if (isScrubbing) {
        setIsScrubbing(false);
        flushPendingSeek();
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isScrubbing]);

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const getProfileIcon = (icon: string) => {
    switch (icon) {
      case "tv":
      case "sparkles":
        return <Tv style={{ color: accentColor }} className="w-3.5 h-3.5" />;
      case "layers":
        return <Layers style={{ color: accentColor }} className="w-3.5 h-3.5" />;
      case "film":
        return <Film className="w-3.5 h-3.5 text-rose-400" />;
      case "headphones":
        return <Headphones className="w-3.5 h-3.5 text-sky-400" />;
      case "mic":
        return <Mic className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Sliders className="w-3.5 h-3.5 text-neutral-300" />;
    }
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const activeBtnStyle = (active: boolean) =>
    active
      ? {
          backgroundColor: accentGlow,
          color: accentColor,
          borderColor: accentColor,
        }
      : undefined;

  const trackHeightClass =
    scrubberHeight === "slim"
      ? "h-1 group-hover:h-2"
      : scrubberHeight === "bold"
      ? "h-2.5 group-hover:h-3.5"
      : "h-1.5 group-hover:h-2.5";

  const hoverPercent =
    duration > 0 && hoverTime !== null
      ? Math.min(100, Math.max(0, (hoverTime / duration) * 100))
      : 0;

  const deltaSeconds =
    hoverTime !== null ? Math.round(hoverTime - currentTime) : 0;

  const containerWidth = scrubberRef.current?.clientWidth || 300;
  const cardWidth = 176;
  const halfCard = cardWidth / 2;
  const cardLeft = Math.max(halfCard, Math.min(hoverPosition, containerWidth - halfCard));
  const pointerOffset = Math.max(-halfCard + 16, Math.min(halfCard - 16, hoverPosition - cardLeft));

  return (
    <div className="relative px-2 sm:px-4 pb-3 sm:pb-4 pt-1.5 bg-gradient-to-t from-black/95 via-black/75 to-transparent backdrop-blur-md select-none transition-all duration-300 z-30">
      <div className="w-full px-1 sm:px-4 md:px-6 flex flex-col gap-2">
        {/* Progress Scrubber */}
        <div
          ref={scrubberRef}
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          onMouseDown={handleScrubberMouseDown}
          className="group relative h-5 flex items-center cursor-pointer select-none py-1"
        >
          {/* Hover Time Preview Card */}
          {hoverTime !== null && (
            <div
              style={{
                left: `${cardLeft}px`,
              }}
              className="absolute -top-[102px] -translate-x-1/2 pointer-events-none flex flex-col items-center z-50 animate-in fade-in zoom-in-95 duration-100 drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)]"
            >
              {/* Premium Preview Glass Box */}
              <div className="bg-neutral-950/95 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-2xl px-4 py-2.5 flex flex-col items-center gap-1.5 w-44 text-center">
                {/* Header: Progress % and Jump Delta */}
                <div className="flex items-center justify-between w-full text-[11px] font-mono leading-none">
                  <span
                    style={{ color: accentColor }}
                    className="font-bold tracking-tight"
                  >
                    {duration > 0 ? `${hoverPercent.toFixed(1)}%` : "0%"}
                  </span>

                  {Math.abs(deltaSeconds) >= 1 ? (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        deltaSeconds > 0
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {deltaSeconds > 0
                        ? `+${formatSeconds(deltaSeconds)}`
                        : `-${formatSeconds(Math.abs(deltaSeconds))}`}
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-400 bg-white/10 px-1.5 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>

                {/* Primary Hover Time */}
                <div className="text-lg font-black font-mono text-white tracking-wider leading-none py-0.5">
                  {formatSeconds(hoverTime)}
                </div>

                {/* Subtitle: Remaining time from hover */}
                {duration > 0 && (
                  <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between w-full">
                    <span>Remaining</span>
                    <span className="text-neutral-300 font-medium">
                      -{formatSeconds(Math.max(0, duration - hoverTime))}
                    </span>
                  </div>
                )}

                {/* Mini track visualizer with current position & hover position */}
                <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-0.5">
                  {/* Current playback segment */}
                  <div
                    style={{
                      width: `${progressPercent}%`,
                    }}
                    className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
                  />
                  {/* Hover seek target indicator */}
                  <div
                    style={{
                      left: `${hoverPercent}%`,
                      backgroundColor: accentColor,
                    }}
                    className="absolute top-0 bottom-0 w-1 -translate-x-1/2 rounded-full shadow-sm"
                  />
                </div>
              </div>

              {/* Triangle pointer accurately aligned with cursor */}
              <div
                style={{
                  transform: `translateX(${pointerOffset}px) rotate(45deg)`,
                }}
                className="w-2.5 h-2.5 bg-neutral-950 border-r border-b border-white/20 -mt-1 shadow-md transition-transform duration-75"
              />
            </div>
          )}

          {/* Background Track */}
          <div className={`relative w-full ${trackHeightClass} bg-white/15 rounded-full overflow-hidden transition-all duration-150`}>
            {/* Hover Ghost Fill (shows seek range preview on track) */}
            {hoverTime !== null && (
              <div
                style={{
                  width: `${hoverPercent}%`,
                }}
                className="absolute inset-y-0 left-0 bg-white/20 rounded-full pointer-events-none transition-all duration-75"
              />
            )}

            {/* Active Progress Gradient */}
            <div
              style={{
                width: `${progressPercent}%`,
                backgroundColor: accentColor,
                boxShadow: scrubberGlow ? `0 0 14px ${accentGlow}` : "none",
              }}
              className="relative h-full rounded-full transition-all duration-75"
            />
          </div>

          {/* Hover Vertical Marker Tick on track */}
          {hoverTime !== null && (
            <div
              style={{
                left: `${hoverPosition}px`,
                backgroundColor: accentColor,
              }}
              className="absolute -top-1 bottom-1 w-0.5 rounded-full pointer-events-none shadow-md z-10 opacity-90 transition-opacity"
            />
          )}

          {/* Thumb Indicator */}
          <div
            style={{
              left: `${progressPercent}%`,
              backgroundColor: accentColor,
              boxShadow: scrubberGlow ? `0 0 10px ${accentGlow}` : "none",
            }}
            className="absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform duration-150 pointer-events-none border-2 border-neutral-900"
          />
        </div>

        {/* Controls Ribbon (Responsive flex-nowrap) */}
        <div className="flex items-center justify-between gap-1 sm:gap-3 w-full min-w-0">
          {/* Left: Playback controls, Volume & Time */}
          <div className="flex items-center gap-1 sm:gap-2 shrink min-w-0">
            {/* Prev Track (if playlist exists) */}
            {playlist.length > 1 && (
              <button
                onClick={playPrevious}
                className="hidden sm:flex p-1.5 sm:p-2 rounded-full hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white transition shrink-0"
                title="Previous Track"
              >
                <SkipBack className="w-4 h-4" />
              </button>
            )}

            {/* Step Back -10s */}
            <button
              onClick={() => seekRelative(-10)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white transition shrink-0"
              title="Seek -10s (Left Arrow)"
            >
              <RotateCcw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            {/* Main Play / Pause Button */}
            <button
              onClick={togglePlayback}
              style={{
                backgroundColor: accentColor,
                color: accentText,
                boxShadow: `0 4px 18px ${accentGlow}`,
              }}
              className="p-2 sm:p-3 rounded-full hover:brightness-110 active:scale-90 font-bold transition-all shrink-0"
              title="Play / Pause (Space)"
            >
              {isPlaying ? (
                <Pause className="w-4 sm:w-5 h-4 sm:h-5 fill-current" />
              ) : (
                <Play className="w-4 sm:w-5 h-4 sm:h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Step Forward +10s */}
            <button
              onClick={() => seekRelative(10)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white transition shrink-0"
              title="Seek +10s (Right Arrow)"
            >
              <RotateCw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            {/* Next Track (if playlist exists) */}
            {playlist.length > 1 && (
              <button
                onClick={playNext}
                className="hidden sm:flex p-1.5 sm:p-2 rounded-full hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white transition shrink-0"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}

            {/* Volume Control */}
            <div className="flex items-center gap-1 sm:gap-1.5 ml-0.5 sm:ml-1 group shrink-0">
              <button
                onClick={toggleMute}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 active:scale-95 text-neutral-300 hover:text-white transition"
                title="Mute / Unmute (M)"
              >
                {muted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 50 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <div className="w-12 sm:w-16 md:w-20 hidden min-[520px]:flex items-center">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  style={{ accentColor: accentColor }}
                  className="w-full h-1 bg-white/20 rounded-lg cursor-pointer hover:h-1.5 transition-all"
                  title={`Volume: ${muted ? 0 : volume}%`}
                />
              </div>

              <span className="text-[10px] font-mono text-neutral-400 w-7 hidden md:inline">
                {muted ? "0%" : `${volume}%`}
              </span>
            </div>

            {/* Timestamp Readout */}
            <div
              onClick={() => setShowRemainingTime(!showRemainingTime)}
              className="text-[10px] sm:text-xs font-mono text-neutral-300 hover:text-white cursor-pointer transition select-none ml-1 whitespace-nowrap truncate max-w-[130px] sm:max-w-none"
              title="Click to toggle remaining time"
            >
              <span>{formatSeconds(currentTime)}</span>
              <span className="text-neutral-500 mx-0.5 sm:mx-1">/</span>
              <span>
                {showRemainingTime && duration > 0
                  ? `-${formatSeconds(Math.max(0, duration - currentTime))}`
                  : formatSeconds(duration)}
              </span>
            </div>
          </div>

          {/* Right: Secondary Options (Intelligently collapses into More ... menu on small screens) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Speed Picker (Visible on xl+ screens) */}
            <div className="relative hidden xl:block" ref={speedMenuRef}>
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                style={activeBtnStyle(playbackRate !== 1.0)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  playbackRate === 1.0
                    ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                    : ""
                }`}
                title="Playback Speed ([ / ])"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>{playbackRate.toFixed(2)}x</span>
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[85px] z-50">
                  {speedOptions.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        setShowSpeedMenu(false);
                      }}
                      style={{
                        backgroundColor: playbackRate === rate ? accentColor : undefined,
                        color: playbackRate === rate ? accentText : undefined,
                      }}
                      className={`px-3 py-1 text-xs rounded-lg text-left transition font-mono ${
                        playbackRate === rate
                          ? "font-bold shadow"
                          : "text-neutral-200 hover:bg-white/10"
                      }`}
                    >
                      {rate.toFixed(2)}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Audio Track Picker */}
            {audioTracks.length > 1 && (
              <div className="relative" ref={audioMenuRef}>
                <button
                  onClick={() => setShowAudioMenu((prev) => !prev)}
                  style={activeBtnStyle(Boolean(currentAudioTrackId))}
                  className={`hidden xl:flex p-2 rounded-lg border transition ${
                    !currentAudioTrackId
                      ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                      : ""
                  }`}
                  title="Audio Track (A)"
                >
                  <Headphones className="w-4 h-4" />
                </button>

                {showAudioMenu && (
                  <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[160px] z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-1">
                      Audio Tracks
                    </div>
                    {audioTracks.map((track) => {
                      const selected = currentAudioTrackId === track.id;
                      return (
                        <button
                          key={track.id}
                          onClick={() => {
                            selectAudioTrack(track.id);
                            setShowAudioMenu(false);
                          }}
                          style={selected ? { backgroundColor: accentGlow, color: accentColor } : undefined}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                            selected ? "font-bold" : "text-neutral-300 hover:bg-white/10"
                          }`}
                        >
                          <span className="truncate">
                            {track.title || track.lang || `Track ${track.id}`}
                          </span>
                          {selected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Subtitles Quick Toggle & Track Picker */}
            <div className="relative" ref={subMenuRef}>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await toggleSubtitleTrack();
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowSubMenu((prev) => !prev);
                }}
                style={activeBtnStyle(Boolean(currentSubtitleTrackId && currentSubtitleTrackId > 0))}
                className={`p-1.5 sm:p-2 rounded-lg border transition ${
                  !currentSubtitleTrackId
                    ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                    : ""
                }`}
                title={
                  currentSubtitleTrackId && currentSubtitleTrackId > 0
                    ? "Subtitles: ON (Click to turn OFF, right-click to choose language)"
                    : "Subtitles: OFF (Click to turn ON, right-click to choose language)"
                }
              >
                <Subtitles className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>

              {showSubMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[160px] z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-1">
                    Subtitles
                  </div>
                  <button
                    onClick={() => {
                      selectSubtitleTrack(0);
                      setShowSubMenu(false);
                    }}
                    style={!currentSubtitleTrackId ? { backgroundColor: accentGlow, color: accentColor } : undefined}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                      !currentSubtitleTrackId ? "font-bold" : "text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <span>Off</span>
                    {!currentSubtitleTrackId && <Check className="w-3.5 h-3.5" style={{ color: accentColor }} />}
                  </button>
                  {subtitleTracks.map((track) => {
                    const isSelected = currentSubtitleTrackId === track.id;
                    return (
                      <button
                        key={track.id}
                        onClick={() => {
                          selectSubtitleTrack(track.id);
                          setShowSubMenu(false);
                        }}
                        style={isSelected ? { backgroundColor: accentGlow, color: accentColor } : undefined}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition truncate ${
                          isSelected ? "font-bold" : "text-neutral-300 hover:bg-white/10"
                        }`}
                      >
                        <span className="truncate">{track.title || track.lang || `Track ${track.id}`}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />}
                      </button>
                    );
                  })}
                  <div className="h-px bg-white/10 my-1" />
                  <button
                    onClick={async () => {
                      setShowSubMenu(false);
                      try {
                        const file = await openDialog({
                          multiple: false,
                          filters: [{ name: "Subtitles", extensions: ["srt", "vtt", "ass", "ssa"] }],
                        });
                        if (file && typeof file === "string") {
                          await loadSubtitle(file);
                        }
                      } catch (err) {
                        console.warn("Subtitle load error:", err);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                  >
                    <span>+ Load External Subtitle...</span>
                  </button>
                </div>
              )}
            </div>

            {/* Video Aspect / Scaling (Visible on xl+ screens) */}
            <button
              onClick={cycleVideoFitMode}
              style={activeBtnStyle(videoFitMode !== "fit")}
              className={`hidden xl:flex p-2 rounded-lg border transition ${
                videoFitMode === "fit"
                  ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                  : ""
              }`}
              title={`Video Aspect: ${videoFitMode.toUpperCase()} (Click to toggle Fit / Fill / Stretch)`}
            >
              <Scaling className="w-4 h-4" />
            </button>

            {/* Auto-Play Next Toggle (Visible on lg+ screens) */}
            <button
              onClick={() => toggleAutoPlayNext()}
              style={activeBtnStyle(autoPlayNext)}
              className={`hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg border transition text-xs font-semibold ${
                autoPlayNext
                  ? ""
                  : "bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10"
              }`}
              title={
                autoPlayNext
                  ? "Auto-Play Next: On — advances to the next item when this one ends (click to stop at the end)"
                  : "Auto-Play Next: Off — playback stops at the end of each item (click to advance to the next)"
              }
            >
              <ListEnd className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden 2xl:inline uppercase">
                {autoPlayNext ? "Auto" : "Off"}
              </span>
            </button>

            {/* Repeat Mode Dropdown (Visible on lg+ screens) — direct selection, no cycling */}
            <div className="relative hidden lg:block" ref={repeatMenuRef}>
              <button
                onClick={() => setShowRepeatMenu(!showRepeatMenu)}
                style={activeBtnStyle(repeatMode !== "off")}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border transition text-xs font-semibold ${
                  repeatMode === "off"
                    ? "bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10"
                    : ""
                }`}
                title={
                  repeatMode === "off"
                    ? "Repeat: Off — click to choose"
                    : repeatMode === "all"
                    ? "Repeat: Entire Playlist — click to change"
                    : "Repeat: Current File — click to change"
                }
              >
                {repeatMode === "one" ? (
                  <Repeat1 className="w-3.5 h-3.5" />
                ) : (
                  <Repeat className="w-3.5 h-3.5" />
                )}
                <span className="text-[10px] hidden 2xl:inline uppercase">
                  {repeatMode === "off" ? "Off" : repeatMode === "all" ? "All" : "One"}
                </span>
              </button>

              {showRepeatMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 w-56 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-1">
                    Repeat Mode
                  </div>
                  {([
                    { mode: "off", label: "Off", desc: "Stop at the end", icon: <Repeat className="w-3.5 h-3.5" /> },
                    { mode: "all", label: "Repeat Playlist", desc: "Loop the whole queue", icon: <Repeat className="w-3.5 h-3.5" /> },
                    { mode: "one", label: "Repeat One", desc: "Loop the current file", icon: <Repeat1 className="w-3.5 h-3.5" /> },
                  ] as const).map((opt) => {
                    const isSelected = repeatMode === opt.mode;
                    return (
                      <button
                        key={opt.mode}
                        onClick={() => {
                          setRepeatMode(opt.mode);
                          setShowRepeatMenu(false);
                        }}
                        style={isSelected ? { backgroundColor: accentGlow, color: accentColor, borderColor: accentColor } : undefined}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition text-left ${
                          isSelected ? "font-bold border" : "text-neutral-200 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {opt.icon}
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-[10px] font-normal text-neutral-500">{opt.desc}</span>
                          </div>
                        </div>
                        {isSelected && <Check style={{ color: accentColor }} className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Playback Profile Menu (Visible on xl+ screens; 1-click selection menu, NO cycle on click) */}
            <div className="relative hidden xl:block" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={activeBtnStyle(activeProfileId !== "default")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition text-xs font-semibold ${
                  activeProfileId === "default"
                    ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                    : ""
                }`}
                title={`Active Profile: ${activeProfile.name} (Click to choose)`}
              >
                {getProfileIcon(activeProfile.icon)}
                <span className="text-[11px] truncate max-w-[70px]">
                  {activeProfile.name.split(" ")[0]}
                </span>
              </button>

              {showProfileMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 w-56 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-1">
                    Select Profile
                  </div>
                  {profiles.map((p) => {
                    const isSelected = p.id === activeProfileId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          applyProfile(p.id);
                          setShowProfileMenu(false);
                        }}
                        style={isSelected ? { backgroundColor: accentGlow, color: accentColor, borderColor: accentColor } : undefined}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition text-left ${
                          isSelected
                            ? "font-bold border"
                            : "text-neutral-200 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {getProfileIcon(p.icon)}
                          <span>{p.name}</span>
                        </div>
                        {isSelected && <Check style={{ color: accentColor }} className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                  <div className="h-px bg-white/10 my-1" />
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      toggleSettingsModal();
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] text-neutral-400 hover:text-white hover:bg-white/5 transition text-left"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Manage Profiles...</span>
                  </button>
                </div>
              )}
            </div>

            {/* Night Listening / Sleep Timer Quick Modal (Visible on xl+ screens) */}
            <button
              onClick={() => toggleSleepTimer(true)}
              style={activeBtnStyle(sleepTimer.isActive || isNightListening)}
              className={`hidden xl:flex p-2 rounded-lg border transition ${
                !sleepTimer.isActive && !isNightListening
                  ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                  : "shadow-sm"
              }`}
              title={
                sleepTimer.isActive
                  ? `Sleep Timer: ${Math.ceil(sleepTimer.remainingSeconds / 60)}m left`
                  : "Night Listening & Sleep Timer"
              }
            >
              <Moon className="w-4 h-4 text-indigo-400" />
            </button>

            {/* Playlist Drawer Button */}
            <button
              onClick={togglePlaylistDrawer}
              className="relative p-1.5 sm:p-2 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 transition"
              title="Toggle Playlist (P)"
            >
              <ListVideo className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              {playlist.length > 0 && (
                <span
                  style={{ backgroundColor: accentColor, color: accentText }}
                  className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-extrabold rounded-full flex items-center justify-center shadow"
                >
                  {playlist.length}
                </span>
              )}
            </button>

            {/* Picture-in-Picture Button */}
            <button
              onClick={togglePiP}
              style={activeBtnStyle(isPiP)}
              className={`p-1.5 sm:p-2 rounded-lg border transition ${
                !isPiP
                  ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                  : ""
              }`}
              title="Picture-in-Picture Mini Player (Shift+P)"
            >
              <PictureInPicture2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            {/* More Options Dropdown (Reveals on split screens & < xl breakpoints) */}
            <div className="relative xl:hidden" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                style={activeBtnStyle(showMoreMenu)}
                className={`p-1.5 sm:p-2 rounded-lg border transition ${
                  !showMoreMenu
                    ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                    : ""
                }`}
                title="More Controls (Speed, Profiles, Sleep Timer, Scaling)"
              >
                <MoreHorizontal className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>

              {showMoreMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 w-64 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-white/5 mb-1">
                    Quick Controls
                  </div>

                  {/* Playback Speed selector row */}
                  <div className="px-2.5 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Gauge style={{ color: accentColor }} className="w-3.5 h-3.5" />
                      <span>Speed</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setPlaybackRate(rate)}
                          style={{
                            backgroundColor: playbackRate === rate ? accentColor : undefined,
                            color: playbackRate === rate ? accentText : undefined,
                          }}
                          className={`px-1.5 py-0.5 rounded transition ${
                            playbackRate === rate
                              ? "font-bold shadow"
                              : "bg-white/5 text-neutral-300 hover:bg-white/15"
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto-Play Next toggle */}
                  <button
                    onClick={() => toggleAutoPlayNext()}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl text-neutral-200 hover:bg-white/10 text-left transition"
                  >
                    <div className="flex items-center gap-2">
                      <ListEnd style={{ color: accentColor }} className="w-3.5 h-3.5" />
                      <span>Auto-Play Next</span>
                    </div>
                    <span
                      style={autoPlayNext ? { backgroundColor: accentGlow, color: accentColor, borderColor: `${accentColor}66` } : undefined}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        autoPlayNext
                          ? "border uppercase"
                          : "bg-white/5 text-neutral-500 uppercase"
                      }`}
                    >
                      {autoPlayNext ? "On" : "Off"}
                    </span>
                  </button>

                  {/* Repeat Mode selector (direct selection, no cycling) */}
                  <div className="px-2.5 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-neutral-300">
                      {repeatMode === "one" ? (
                        <Repeat1 style={{ color: accentColor }} className="w-3.5 h-3.5" />
                      ) : (
                        <Repeat style={{ color: accentColor }} className="w-3.5 h-3.5" />
                      )}
                      <span>Repeat</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px]">
                      {(["off", "all", "one"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setRepeatMode(mode)}
                          style={{
                            backgroundColor: repeatMode === mode ? accentColor : undefined,
                            color: repeatMode === mode ? accentText : undefined,
                          }}
                          className={`px-1.5 py-0.5 rounded transition uppercase ${
                            repeatMode === mode
                              ? "font-bold shadow"
                              : "bg-white/5 text-neutral-300 hover:bg-white/15"
                          }`}
                        >
                          {mode === "off" ? "Off" : mode === "all" ? "All" : "One"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Video Aspect Mode */}
                  <button
                    onClick={cycleVideoFitMode}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl text-neutral-200 hover:bg-white/10 text-left transition"
                  >
                    <div className="flex items-center gap-2">
                      <Scaling style={{ color: accentColor }} className="w-3.5 h-3.5" />
                      <span>Video Scaling</span>
                    </div>
                    <span className="text-[11px] font-mono uppercase text-neutral-400">
                      {videoFitMode}
                    </span>
                  </button>

                  {/* Profiles Sub-section */}
                  <div className="mt-1 pt-1 border-t border-white/5">
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-neutral-400">
                      Active Profile: <strong className="text-white font-bold">{activeProfile.name}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-1 px-1">
                      {profiles.slice(0, 4).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => applyProfile(p.id)}
                          style={p.id === activeProfileId ? { backgroundColor: accentGlow, color: accentColor, borderColor: accentColor } : undefined}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] transition text-left truncate ${
                            p.id === activeProfileId
                              ? "font-bold border"
                              : "bg-white/5 text-neutral-300 hover:bg-white/10"
                          }`}
                        >
                          {getProfileIcon(p.icon)}
                          <span className="truncate">{p.name.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Screenshot */}
                  <button
                    onClick={() => {
                      takeScreenshot();
                      setShowMoreMenu(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-neutral-200 hover:bg-white/10 text-left transition"
                  >
                    <Camera className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Take Screenshot</span>
                  </button>

                  {/* Playback Stats */}
                  <button
                    onClick={() => {
                      toggleStats(!showStats);
                      setShowMoreMenu(false);
                    }}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl text-neutral-200 hover:bg-white/10 text-left transition"
                  >
                    <div className="flex items-center gap-2">
                      <Gauge className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Playback Stats</span>
                    </div>
                    <span
                      style={showStats ? { backgroundColor: accentGlow, color: accentColor, borderColor: `${accentColor}66` } : undefined}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        showStats ? "border" : "bg-white/5 text-neutral-500"
                      }`}
                    >
                      {showStats ? "ON" : "OFF"}
                    </span>
                  </button>

                  {/* Night Listening / Sleep Timer */}
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      toggleSleepTimer(true);
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-neutral-200 hover:bg-white/10 text-left transition mt-1"
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Night Listening & Sleep Timer</span>
                  </button>

                  {/* Settings Modal */}
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      toggleSettingsModal();
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-neutral-200 hover:bg-white/10 text-left transition border-t border-white/5"
                  >
                    <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                    <span>All Settings & Shortcuts</span>
                  </button>
                </div>
              )}
            </div>

            {/* Settings & Shortcuts Modal Button (Visible on xl+ screens) */}
            <button
              onClick={toggleSettingsModal}
              className="hidden xl:flex p-2 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 transition"
              title="Settings & Shortcuts"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={handleToggleFullscreen}
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 transition shrink-0"
              title="Fullscreen (F)"
            >
              {isFullscreen ? (
                <Minimize style={{ color: accentColor }} className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              ) : (
                <Maximize className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
