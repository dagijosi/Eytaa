import { useEffect, useState } from "react";
import { FolderPlus, Play, X, Film } from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";

export function SiblingPromptToast() {
  const { accentColor, accentGlow, accentText } = useThemeStore();
  const {
    showSiblingPrompt,
    detectedSiblings,
    addSiblingsToPlaylist,
    dismissSiblingPrompt,
  } = usePlayerStore();

  const [timeLeft, setTimeLeft] = useState(12);

  useEffect(() => {
    if (!showSiblingPrompt || !detectedSiblings || detectedSiblings.length <= 1) {
      return;
    }

    setTimeLeft(12);
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          dismissSiblingPrompt();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [showSiblingPrompt, detectedSiblings, dismissSiblingPrompt]);

  if (!showSiblingPrompt || !detectedSiblings || detectedSiblings.length <= 1) {
    return null;
  }

  const count = detectedSiblings.length;

  return (
    <aside
      aria-label="Season Episodes Detected"
      className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div
        style={{ borderColor: `${accentColor}55` }}
        className="bg-neutral-900/95 border rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-2xl flex items-center gap-3.5 max-w-lg text-white"
      >
        {/* Glow Icon */}
        <div
          style={{ backgroundColor: accentColor, borderColor: accentColor, color: accentText }}
          className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
        >
          <Film className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <span style={{ color: accentColor }} className="text-xs font-semibold uppercase tracking-wider">
              Season / Series Detected
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">({timeLeft}s)</span>
          </div>
          <p className="text-xs text-neutral-200 truncate mt-0.5">
            Found <strong className="text-white font-bold">{count} episodes</strong> in this folder.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={addSiblingsToPlaylist}
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 4px 14px ${accentGlow}`,
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer hover:brightness-110"
            title="Queue all season episodes in order"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Add All</span>
          </button>

          <button
            onClick={dismissSiblingPrompt}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-300 hover:text-white text-xs font-medium transition active:scale-95 cursor-pointer"
            title="Play only the selected episode"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Only This</span>
          </button>

          <button
            onClick={dismissSiblingPrompt}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
