import { useEffect, useState } from "react";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";

export function UpdateNotificationToast() {
  const { accentColor, accentGlow, accentText } = useThemeStore();
  const {
    availableUpdate,
    showUpdateToast,
    dismissUpdateToast,
    toggleSettingsModal,
    status,
    isSettingsOpen,
  } = usePlayerStore();

  const [timeLeft, setTimeLeft] = useState(15);

  // Auto-dismiss countdown after 15 seconds so it never lingers or annoys the user
  useEffect(() => {
    if (!showUpdateToast || !availableUpdate || isSettingsOpen) return;

    setTimeLeft(15);
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          dismissUpdateToast();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [showUpdateToast, availableUpdate, isSettingsOpen, dismissUpdateToast]);

  // Don't show if disabled, dismissed, settings already open, or video is playing
  if (!showUpdateToast || !availableUpdate || isSettingsOpen || status === "playing") {
    return null;
  }

  const handleViewUpdate = () => {
    dismissUpdateToast();
    toggleSettingsModal(true, "updates");
  };

  return (
    <aside
      aria-label="New Update Available"
      className="fixed bottom-24 right-6 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300 select-none pointer-events-auto"
    >
      <div
        style={{ borderColor: `${accentColor}44` }}
        className="bg-neutral-900/95 border rounded-2xl p-3.5 shadow-2xl backdrop-blur-2xl flex items-center gap-3.5 max-w-sm text-white"
      >
        {/* Glow Sparkle Icon */}
        <div
          style={{
            backgroundColor: `${accentColor}18`,
            borderColor: `${accentColor}55`,
            color: accentColor,
            boxShadow: `0 0 16px ${accentGlow}`,
          }}
          className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>

        {/* Content */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">
              Update Available
            </span>
            <span
              style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
              className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold"
            >
              v{availableUpdate.version}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 truncate mt-0.5">
            A new version of EYTAA is ready.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <button
            onClick={handleViewUpdate}
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 2px 10px ${accentGlow}`,
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition hover:brightness-110 active:scale-95 cursor-pointer"
            title="View update details in Settings"
          >
            <span>View</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            onClick={dismissUpdateToast}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title={`Dismiss (${timeLeft}s)`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
