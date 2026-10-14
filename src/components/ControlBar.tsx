import { useState, useRef, useEffect } from "react";
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
  Sparkles,
  MoreHorizontal,
  Check,
  Film,
  Headphones,
  Mic,
  Repeat,
} from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";
import { getCurrentWindow } from "@tauri-apps/api/window";

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
    currentSubtitleTrackId,
    playlist,
    togglePlayback,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setPlaybackRate,
    selectSubtitleTrack,
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
    autoPlayNext,
    toggleAutoPlayNext,
  } = usePlayerStore();

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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const scrubberRef = useRef<HTMLDivElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

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
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setShowMoreMenu(false);
      }
    };
    if (showSpeedMenu || showProfileMenu || showMoreMenu) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [showSpeedMenu, showProfileMenu, showMoreMenu]);

  const handleToggleFullscreen = async () => {
    try {
      const appWindow = getCurrentWindow();
      const current = await appWindow.isFullscreen();
      await appWindow.setFullscreen(!current);
      setIsFullscreen(!current);
    } catch (e) {
      console.warn("Fullscreen toggle error:", e);
    }
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    setHoverPosition(x);
    setHoverTime(ratio * duration);

    if (isScrubbing) {
      seek(ratio * duration);
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
      if (isScrubbing) setIsScrubbing(false);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isScrubbing]);

  const handleCycleSubtitles = () => {
    if (subtitleTracks.length === 0) return;
    const trackIds = [0, ...subtitleTracks.map((t) => t.id)];
    const currentIdx = trackIds.indexOf(currentSubtitleTrackId || 0);
    const nextIdx = (currentIdx + 1) % trackIds.length;
    selectSubtitleTrack(trackIds[nextIdx]);
  };

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const getProfileIcon = (icon: string) => {
    switch (icon) {
      case "sparkles":
        return <Sparkles style={{ color: accentColor }} className="w-3.5 h-3.5" />;
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

            {/* Subtitles Quick Toggle */}
            <button
              onClick={handleCycleSubtitles}
              style={activeBtnStyle(Boolean(currentSubtitleTrackId && currentSubtitleTrackId > 0))}
              className={`p-1.5 sm:p-2 rounded-lg border transition ${
                !currentSubtitleTrackId
                  ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                  : ""
              }`}
              title="Cycle Subtitles (S)"
            >
              <Subtitles className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

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
                !autoPlayNext
                  ? "bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10"
                  : ""
              }`}
              title={autoPlayNext ? "Auto-Play Next: ON (Click to disable)" : "Auto-Play Next: OFF (Click to enable)"}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden 2xl:inline">Auto Next</span>
            </button>

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
                      <Repeat style={{ color: accentColor }} className="w-3.5 h-3.5" />
                      <span>Auto-Play Next</span>
                    </div>
                    <span
                      style={autoPlayNext ? { backgroundColor: accentGlow, color: accentColor, borderColor: `${accentColor}66` } : undefined}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        autoPlayNext
                          ? "border"
                          : "bg-white/5 text-neutral-500"
                      }`}
                    >
                      {autoPlayNext ? "ON" : "OFF"}
                    </span>
                  </button>

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
