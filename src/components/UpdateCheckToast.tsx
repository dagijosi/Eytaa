import { useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  X,
} from "lucide-react";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";

export function UpdateCheckToast() {
  const { accentColor, accentGlow, accentText } = useThemeStore();
  const { updateCheckToast, dismissUpdateCheckToast, toggleSettingsModal } = usePlayerStore();

  const state = updateCheckToast?.state;
  const isTerminal = state === "up-to-date" || state === "error";

  // Auto-dismiss success/failure after a few seconds; "available" stays until acted on
  useEffect(() => {
    if (!isTerminal) return;
    const timer = window.setTimeout(() => dismissUpdateCheckToast(), 6000);
    return () => window.clearTimeout(timer);
  }, [isTerminal, state, dismissUpdateCheckToast]);

  if (!updateCheckToast) return null;

  const handleViewUpdate = () => {
    dismissUpdateCheckToast();
    toggleSettingsModal(true, "updates");
  };

  const content = (() => {
    switch (updateCheckToast.state) {
      case "checking":
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          title: "Checking for updates…",
          subtitle: "Contacting release server",
          color: accentColor,
        };
      case "up-to-date":
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          title: "You're up to date",
          subtitle: "You're running the latest version of EYTAA",
          color: "#34d399",
        };
      case "available":
        return {
          icon: <Sparkles className="w-4 h-4 animate-pulse" />,
          title: "Update Available",
          subtitle: `Version v${updateCheckToast.version} is ready to install`,
          color: accentColor,
        };
      case "error":
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          title: "Update check failed",
          subtitle: updateCheckToast.message || "Could not reach the update server",
          color: "#f87171",
        };
    }
  })();

  return (
    <aside
      aria-live="polite"
      aria-label="Update status"
      className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300 select-none pointer-events-auto"
    >
      <div
        style={{ borderColor: `${content.color}44` }}
        className="bg-neutral-900/95 border rounded-2xl p-3.5 shadow-2xl backdrop-blur-2xl flex items-center gap-3.5 max-w-sm text-white"
      >
        <div
          style={{
            backgroundColor: `${content.color}1c`,
            borderColor: `${content.color}55`,
            color: content.color,
            boxShadow: state === "available" ? `0 0 16px ${accentGlow}` : "none",
          }}
          className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0"
        >
          {content.icon}
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">{content.title}</span>
            {updateCheckToast.state === "available" && updateCheckToast.version && (
              <span
                style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold"
              >
                v{updateCheckToast.version}
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-400 truncate mt-0.5">{content.subtitle}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {updateCheckToast.state === "available" && (
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
          )}

          {updateCheckToast.state !== "checking" && (
            <button
              onClick={dismissUpdateCheckToast}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
