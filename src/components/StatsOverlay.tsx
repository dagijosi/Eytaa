import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { X } from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { playerService } from "../services/player/mpvPlayerService";
import { useThemeStore } from "../stores/themeStore";

interface StatsSnapshot {
  resolution: string;
  containerFps: string;
  estimatedFps: string;
  hwdec: string;
  videoCodec: string;
  audioCodec: string;
  droppedFrames: string;
  playbackRate: string;
}

const EMPTY: StatsSnapshot = {
  resolution: "—",
  containerFps: "—",
  estimatedFps: "—",
  hwdec: "—",
  videoCodec: "—",
  audioCodec: "—",
  droppedFrames: "—",
  playbackRate: "—",
};

async function readProp(name: string): Promise<string> {
  try {
    const value = await playerService.getMpvProperty<string | number>(name);
    if (value === null || value === undefined || value === "") return "—";
    return typeof value === "number" ? value.toFixed(2) : String(value);
  } catch {
    return "—";
  }
}

export function StatsOverlay() {
  const { showStats, toggleStats, status, playbackRate } = usePlayerStore(
    useShallow((s) => ({
      showStats: s.showStats,
      toggleStats: s.toggleStats,
      status: s.status,
      playbackRate: s.playbackRate,
    })),
  );
  const { accentColor } = useThemeStore(
    useShallow((s) => ({ accentColor: s.accentColor })),
  );
  const [stats, setStats] = useState<StatsSnapshot>(EMPTY);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!showStats) return;

    if (status !== "playing" && status !== "paused") {
      setStats(EMPTY);
      return;
    }

    let cancelled = false;

    const sample = async () => {
      const [width, height, containerFps, estimatedFps, hwdec, fps] =
        await Promise.all([
          readProp("video-params/w"),
          readProp("video-params/h"),
          readProp("container-fps"),
          readProp("estimated-vf-fps"),
          readProp("hwdec-current"),
          readProp("fps"),
        ]);
      const [vCodec, aCodec, drops] = await Promise.all([
        readProp("video-codec"),
        readProp("audio-codec-name"),
        readProp("frame-drop-count"),
      ]);
      if (cancelled) return;
      setStats({
        resolution:
          width !== "—" && height !== "—" ? `${width} × ${height}` : "—",
        containerFps: `${containerFps} fps`,
        estimatedFps: `${estimatedFps} fps (render)`,
        hwdec: hwdec === "—" ? "—" : hwdec,
        videoCodec: vCodec,
        audioCodec: aCodec,
        droppedFrames: drops,
        playbackRate: `${fps} fps`,
      });
    };

    void sample();
    timerRef.current = window.setInterval(sample, 1000);
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [showStats, status]);

  if (!showStats) return null;

  const rows: Array<[string, string]> = [
    ["Resolution", stats.resolution],
    ["Container FPS", stats.containerFps],
    ["Render FPS", stats.estimatedFps],
    ["Video Codec", stats.videoCodec],
    ["Audio Codec", stats.audioCodec],
    ["Hardware Decode", stats.hwdec],
    ["Dropped Frames", stats.droppedFrames],
    ["Display FPS", stats.playbackRate],
    ["Speed", `${playbackRate.toFixed(2)}x`],
  ];

  return (
    <div className="absolute top-14 right-4 z-40 w-68 rounded-xl border border-white/[0.1] bg-neutral-950/92 backdrop-blur-2xl p-3 text-[11px] font-mono text-neutral-200 select-none shadow-xl animate-in fade-in duration-150">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
          <span className="font-semibold tracking-wider text-[10px] uppercase text-neutral-300">
            Playback Telemetry
          </span>
        </div>
        <button
          onClick={() => toggleStats(false)}
          className="p-1 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-white transition duration-150 cursor-pointer"
          title="Close (F9)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="text-neutral-500 font-sans text-[11px]">{label}</span>
            <span className="text-neutral-200 tabular-nums truncate font-mono text-right" title={value}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
