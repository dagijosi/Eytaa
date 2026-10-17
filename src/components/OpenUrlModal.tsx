import { useEffect, useRef, useState } from "react";
import { Link2, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";

const PROTOCOL_HINT = /^(https?|rtsp|rtmp|mms|ftp|udp|tcp|srt|hls):/i;

export function OpenUrlModal() {
  const { isUrlModalOpen, toggleUrlModal, openUrl } = usePlayerStore(
    useShallow((s) => ({
      isUrlModalOpen: s.isUrlModalOpen,
      toggleUrlModal: s.toggleUrlModal,
      openUrl: s.openUrl,
    })),
  );
  const { accentColor, accentGlow, accentText } = useThemeStore(
    useShallow((s) => ({
      accentColor: s.accentColor,
      accentGlow: s.accentGlow,
      accentText: s.accentText,
    })),
  );

  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isUrlModalOpen) {
      setValue("");
      setError(null);
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [isUrlModalOpen]);

  if (!isUrlModalOpen) return null;

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter a stream URL");
      return;
    }
    if (/\s/.test(trimmed)) {
      setError("URLs cannot contain spaces");
      return;
    }
    const normalized = PROTOCOL_HINT.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      new URL(normalized);
    } catch {
      setError("That does not look like a valid URL");
      return;
    }
    await openUrl(normalized);
    toggleUrlModal(false);
  };

  const close = () => toggleUrlModal(false);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950/95 backdrop-blur-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link2 style={{ color: accentColor }} className="w-4 h-4" />
            <span className="text-sm font-bold text-neutral-100">Open Network Stream</span>
          </div>
          <button
            onClick={close}
            className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-neutral-400 mb-3 leading-relaxed">
          Paste a direct media URL or streaming link. Supported schemes include
          HTTPS, RTSP, RTMP, HLS, SRT, and UDP.
        </p>

        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") close();
          }}
          placeholder="https://example.com/stream.m3u8"
          style={{ borderColor: error ? "#f87171" : value ? accentColor : undefined }}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:bg-white/10 transition"
        />

        {error && <div className="text-[11px] text-rose-400 mt-2">{error}</div>}

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={close}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 4px 14px ${accentGlow}`,
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition"
          >
            Open Stream
          </button>
        </div>
      </div>
    </div>
  );
}
