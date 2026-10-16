import { usePlayerStore } from "../stores/playerStore";

export function CenterOSD() {
  const osdMessage = usePlayerStore((s) => s.osdMessage);

  if (!osdMessage) return null;

  return (
    <div className="fixed inset-x-0 top-14 sm:top-16 pointer-events-none flex items-center justify-center z-50 transition-all duration-200">
      <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
        <span className="text-xs sm:text-sm font-medium tracking-wide text-neutral-100">
          {osdMessage}
        </span>
      </div>
    </div>
  );
}
