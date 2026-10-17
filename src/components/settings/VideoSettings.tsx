import { RotateCcw } from "lucide-react";

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
    </div>
  );
}
