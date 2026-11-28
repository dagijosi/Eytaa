import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";

export function CenterOSD() {
  const osdMessage = usePlayerStore((s) => s.osdMessage);
  const osdPosition = useThemeStore((s) => s.osdPosition);

  if (!osdMessage) return null;

  const isTopLeft = osdPosition === "top-left";
  const isMinimal = osdPosition === "minimal";

  return (
    <div
      className={`fixed inset-x-0 pointer-events-none flex items-center z-50 transition-all duration-200 ${
        isTopLeft
          ? "top-14 sm:top-16 justify-start pl-4 sm:pl-6"
          : isMinimal
          ? "top-12 justify-center"
          : "top-14 sm:top-16 justify-center"
      }`}
    >
      <div
        className={`ui-glass-panel flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-150 ${
          isMinimal
            ? "px-3 py-1 rounded-full shadow-lg"
            : "px-4 py-2 rounded-full shadow-2xl"
        }`}
      >
        <span
          className={`font-medium tracking-wide text-neutral-100 ${
            isMinimal ? "text-[11px]" : "text-xs sm:text-sm"
          }`}
        >
          {osdMessage}
        </span>
      </div>
    </div>
  );
}
