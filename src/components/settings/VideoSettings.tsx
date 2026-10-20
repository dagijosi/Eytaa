import { useState } from "react";
import { RotateCcw, Check } from "lucide-react";
import { playerService } from "../../services/player/mpvPlayerService";

interface VideoSettingsProps {
  accentColor: string;
  brightness: number;
  handleBrightnessChange: (val: number) => Promise<void>;
  contrast: number;
  handleContrastChange: (val: number) => Promise<void>;
  saturation: number;
  handleSaturationChange: (val: number) => Promise<void>;
  gamma: number;
  handleGammaChange: (val: number) => Promise<void>;
  deinterlace: boolean;
  handleToggleDeinterlace: () => Promise<void>;
  handleResetVideo: () => Promise<void>;
}

export function VideoSettings({
  accentColor,
  brightness,
  handleBrightnessChange,
  contrast,
  handleContrastChange,
  saturation,
  handleSaturationChange,
  gamma,
  handleGammaChange,
  deinterlace,
  handleToggleDeinterlace,
  handleResetVideo,
}: VideoSettingsProps) {
  const [videoRenderer, setVideoRenderer] = useState<"gpu" | "gpu-next">(() =>
    playerService.getVideoRenderer()
  );

  const handleSelectRenderer = async (vo: "gpu" | "gpu-next") => {
    setVideoRenderer(vo);
    await playerService.setVideoRenderer(vo);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">
          Real-time GPU hardware color calibration:
        </span>
        <button
          onClick={handleResetVideo}
          style={{ color: accentColor }}
          className="flex items-center gap-1 text-xs hover:brightness-110 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Picture</span>
        </button>
      </div>

      {/* Brightness */}
      <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-300 font-medium">Brightness</span>
          <span className="font-mono text-neutral-400">{brightness}</span>
        </div>
        <input
          type="range"
          min={-100}
          max={100}
          value={brightness}
          onChange={(e) => handleBrightnessChange(Number(e.target.value))}
          style={{ accentColor }}
          className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
        />
      </div>

      {/* Contrast */}
      <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-300 font-medium">Contrast</span>
          <span className="font-mono text-neutral-400">{contrast}</span>
        </div>
        <input
          type="range"
          min={-100}
          max={100}
          value={contrast}
          onChange={(e) => handleContrastChange(Number(e.target.value))}
          style={{ accentColor }}
          className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
        />
      </div>

      {/* Saturation */}
      <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-300 font-medium">Saturation</span>
          <span className="font-mono text-neutral-400">{saturation}</span>
        </div>
        <input
          type="range"
          min={-100}
          max={100}
          value={saturation}
          onChange={(e) => handleSaturationChange(Number(e.target.value))}
          style={{ accentColor }}
          className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
        />
      </div>

      {/* Gamma */}
      <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-300 font-medium">Gamma</span>
          <span className="font-mono text-neutral-400">{gamma}</span>
        </div>
        <input
          type="range"
          min={-100}
          max={100}
          value={gamma}
          onChange={(e) => handleGammaChange(Number(e.target.value))}
          style={{ accentColor }}
          className="w-full h-1 bg-white/20 rounded-lg cursor-pointer"
        />
      </div>

      {/* Deinterlace */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="font-medium text-neutral-200 text-xs">
            Deinterlacing (Yadif)
          </span>
          <p className="text-xs text-neutral-500">
            Fix interlaced lines on older DVD/broadcast media rips
          </p>
        </div>
        <input
          type="checkbox"
          checked={deinterlace}
          onChange={handleToggleDeinterlace}
          style={{ accentColor }}
          className="w-4 h-4 rounded bg-neutral-800 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>

      {/* Rendering Engine & Power Efficiency */}
      <div className="pt-2">
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <span>GPU Video Output Engine</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Power Tuning
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                Controls the underlying MPV video rendering pipeline and shader workload.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleSelectRenderer("gpu")}
              className={`p-3 rounded-lg border text-left transition-all ${
                videoRenderer === "gpu"
                  ? "bg-white/[0.08] border-emerald-500/50 shadow-sm"
                  : "bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-white/20"
              }`}
            >
              <div className="font-bold text-white flex items-center justify-between mb-1">
                <span>Power-Optimized (vo=gpu)</span>
                {videoRenderer === "gpu" && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                    <Check className="w-3 h-3" />
                    Active
                  </span>
                )}
              </div>
              <div className="text-[11px] text-neutral-400 leading-tight">
                Standard Direct3D11 / Metal rendering. Lowest GPU wattage, ideal for laptops and battery life.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRenderer("gpu-next")}
              className={`p-3 rounded-lg border text-left transition-all ${
                videoRenderer === "gpu-next"
                  ? "bg-white/[0.08] border-indigo-500/50 shadow-sm"
                  : "bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-white/20"
              }`}
            >
              <div className="font-bold text-white flex items-center justify-between mb-1">
                <span>High-Fidelity (vo=gpu-next)</span>
                {videoRenderer === "gpu-next" && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-400">
                    <Check className="w-3 h-3" />
                    Active
                  </span>
                )}
              </div>
              <div className="text-[11px] text-neutral-400 leading-tight">
                Next-gen libplacebo shader pipeline for dynamic HDR tone mapping. Best on AC power.
              </div>
            </button>
          </div>
          <p className="text-[10px] text-neutral-500 italic">
            * Changes are saved immediately and take effect for the next video or app launch.
          </p>
        </div>
      </div>
    </div>
  );
}
