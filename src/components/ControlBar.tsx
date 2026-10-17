import { useShallow } from "zustand/react/shallow";
import { usePlayerStore } from "../stores/playerStore";
import { ProgressScrubber } from "./controlBar/ProgressScrubber";
import { TransportControls } from "./controlBar/TransportControls";
import { VolumeControl } from "./controlBar/VolumeControl";
import { TimeDisplay } from "./controlBar/TimeDisplay";
import { AudioTrackMenu, SubtitleMenu } from "./controlBar/TrackMenus";
import { SpeedMenu, RepeatMenu, ProfileMenu } from "./controlBar/PlaybackMenus";
import { MoreMenu } from "./controlBar/MoreMenu";
import {
  VideoFitButton,
  AutoPlayNextButton,
  SleepTimerButton,
  PlaylistButton,
  PipButton,
  SettingsButton,
  FullscreenButton,
} from "./controlBar/RightButtons";

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

  const isPlaying = status === "playing";

  return (
    <div className="relative px-2 sm:px-4 pb-3 sm:pb-4 pt-1.5 bg-gradient-to-t from-black/95 via-black/75 to-transparent backdrop-blur-md select-none transition-all duration-300 z-30">
      <div className="w-full px-1 sm:px-4 md:px-6 flex flex-col gap-2">
        {/* Progress Scrubber */}
        <ProgressScrubber currentTime={currentTime} duration={duration} seek={seek} />

        {/* Controls Ribbon (Responsive flex-nowrap) */}
        <div className="flex items-center justify-between gap-1 sm:gap-3 w-full min-w-0">
          {/* Left: Playback controls, Volume & Time */}
          <div className="flex items-center gap-1 sm:gap-2 shrink min-w-0">
            <TransportControls
              isPlaying={isPlaying}
              playlistLength={playlist.length}
              onTogglePlayback={togglePlayback}
              onSeekRelative={seekRelative}
              onPlayPrevious={playPrevious}
              onPlayNext={playNext}
            />

            <VolumeControl
              volume={volume}
              muted={muted}
              onToggleMute={toggleMute}
              onSetVolume={setVolume}
            />

            <TimeDisplay currentTime={currentTime} duration={duration} />
          </div>

          {/* Right: Secondary Options (Intelligently collapses into More ... menu on small screens) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <SpeedMenu playbackRate={playbackRate} onSetPlaybackRate={setPlaybackRate} />

            <AudioTrackMenu
              audioTracks={audioTracks}
              currentAudioTrackId={currentAudioTrackId}
              onSelectAudioTrack={selectAudioTrack}
            />

            <SubtitleMenu
              subtitleTracks={subtitleTracks}
              currentSubtitleTrackId={currentSubtitleTrackId}
              onSelectSubtitleTrack={selectSubtitleTrack}
              onToggleSubtitleTrack={toggleSubtitleTrack}
              onLoadSubtitle={loadSubtitle}
            />

            <VideoFitButton videoFitMode={videoFitMode} onCycleVideoFitMode={cycleVideoFitMode} />

            <AutoPlayNextButton
              autoPlayNext={autoPlayNext}
              onToggleAutoPlayNext={toggleAutoPlayNext}
            />

            <RepeatMenu repeatMode={repeatMode} onSetRepeatMode={setRepeatMode} />

            <ProfileMenu
              profiles={profiles}
              activeProfileId={activeProfileId}
              onApplyProfile={applyProfile}
              onToggleSettingsModal={toggleSettingsModal}
            />

            <SleepTimerButton
              sleepTimer={sleepTimer}
              isNightListening={isNightListening}
              onToggleSleepTimer={toggleSleepTimer}
            />

            <PlaylistButton
              playlistLength={playlist.length}
              onTogglePlaylistDrawer={togglePlaylistDrawer}
            />

            <PipButton isPiP={isPiP} onTogglePiP={togglePiP} />

            <MoreMenu
              playbackRate={playbackRate}
              onSetPlaybackRate={setPlaybackRate}
              autoPlayNext={autoPlayNext}
              onToggleAutoPlayNext={toggleAutoPlayNext}
              repeatMode={repeatMode}
              onSetRepeatMode={setRepeatMode}
              videoFitMode={videoFitMode}
              onCycleVideoFitMode={cycleVideoFitMode}
              profiles={profiles}
              activeProfileId={activeProfileId}
              onApplyProfile={applyProfile}
              onTakeScreenshot={takeScreenshot}
              showStats={showStats}
              onToggleStats={toggleStats}
              onToggleSleepTimer={toggleSleepTimer}
              onToggleSettingsModal={toggleSettingsModal}
            />

            <SettingsButton onToggleSettingsModal={toggleSettingsModal} />

            <FullscreenButton />
          </div>
        </div>
      </div>
    </div>
  );
}
