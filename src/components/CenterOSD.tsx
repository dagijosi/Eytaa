import { usePlayerStore } from "../stores/playerStore";

export function CenterOSD() {
  const osdMessage = usePlayerStore((s) => s.osdMessage);

  if (!osdMessage) return null;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 transition-opacity duration-200">
      <div className="bg-neutral-900/80 backdrop-blur-xl border border-white/15 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
        <span className="text-sm font-semibold tracking-wide text-neutral-100">
          {osdMessage}
        </span>
      </div>
    </div>
  );
}
