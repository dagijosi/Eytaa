import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import type { SettingsMode } from "./types";

interface SimpleModeCalloutProps {
  icon: ReactNode;
  text: string;
  accentColor: string;
  handleModeChange: (mode: SettingsMode) => void;
}

export function SimpleModeCallout({
  icon,
  text,
  accentColor,
  handleModeChange,
}: SimpleModeCalloutProps) {
  return (
    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-neutral-400">
      <div className="flex items-center gap-2">
        {icon}
        <span>{text}</span>
      </div>
      <button
        onClick={() => handleModeChange("advanced")}
        style={{ color: accentColor }}
        className="font-bold hover:underline cursor-pointer shrink-0"
      >
        Switch to Advanced &rarr;
      </button>
    </div>
  );
}

interface RestoreDefaultsDialogProps {
  accentColor: string;
  accentGlow: string;
  accentText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestoreDefaultsDialog({
  accentColor,
  accentGlow,
  accentText,
  onConfirm,
  onCancel,
}: RestoreDefaultsDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: `${accentGlow}`, color: accentColor }}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
          >
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Restore All Factory Defaults?</h3>
            <p className="text-xs text-neutral-400">Reset settings, themes, calibrations & profiles</p>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
          This will reset all playback profiles, theme colors, video adjustments, audio normalization, and preferences to their factory defaults. Your media library and playlists will not be affected.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-neutral-300 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ backgroundColor: accentColor, color: accentText }}
            className="px-4 py-2 rounded-xl text-xs font-bold transition shadow hover:brightness-110 active:scale-95 cursor-pointer"
          >
            Restore Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
