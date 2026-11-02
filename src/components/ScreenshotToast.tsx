import { useEffect, useState } from "react";
import { Camera, Copy, Check, FolderOpen, ExternalLink, X } from "lucide-react";
import { revealItemInDir, openPath } from "@tauri-apps/plugin-opener";
import { usePlayerStore } from "../stores/playerStore";
import { useThemeStore } from "../stores/themeStore";

export function ScreenshotToast() {
  const { accentColor } = useThemeStore();
  const lastScreenshot = usePlayerStore((s) => s.lastScreenshot);
  const dismissScreenshotToast = usePlayerStore((s) => s.dismissScreenshotToast);
  const copyScreenshotToClipboard = usePlayerStore((s) => s.copyScreenshotToClipboard);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!lastScreenshot) return;

    setCopied(lastScreenshot.copied);
    const timer = window.setTimeout(() => {
      dismissScreenshotToast();
    }, 5500);

    return () => window.clearTimeout(timer);
  }, [lastScreenshot, dismissScreenshotToast]);

  if (!lastScreenshot) return null;

  const fileName = lastScreenshot.path.split(/[/\\]/).pop() || "screenshot.png";
  const isClean = lastScreenshot.mode === "video";

  const handleCopy = async () => {
    const success = await copyScreenshotToClipboard(lastScreenshot.path);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReveal = async () => {
    try {
      await revealItemInDir(lastScreenshot.path);
    } catch (err) {
      console.warn("Reveal item in folder failed:", err);
    }
  };

  const handleOpen = async () => {
    try {
      await openPath(lastScreenshot.path);
    } catch (err) {
      console.warn("Open path failed:", err);
    }
  };

  return (
    <aside
      aria-label="Screenshot Notification"
      className="fixed top-14 right-4 z-50 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto max-w-sm"
    >
      <div className="bg-neutral-900/95 border border-white/15 rounded-2xl p-3 shadow-2xl backdrop-blur-2xl text-white flex flex-col gap-2.5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: `${accentColor}25`, borderColor: `${accentColor}55` }}
              className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0"
            >
              <Camera className="w-3.5 h-3.5" style={{ color: accentColor }} />
            </div>
            <span className="text-xs font-semibold text-neutral-200">
              {copied ? "Copied to Clipboard" : "Screenshot Saved"}
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
              {isClean ? "Clean" : "Subtitles"}
            </span>
          </div>

          <button
            onClick={dismissScreenshotToast}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content row with preview thumbnail */}
        <div className="flex items-center gap-3">
          {lastScreenshot.thumbnail ? (
            <img
              src={lastScreenshot.thumbnail}
              alt="Screenshot preview"
              className="w-16 h-10 object-cover rounded-lg border border-white/10 shrink-0 bg-black/40"
            />
          ) : (
            <div className="w-16 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-neutral-500" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-xs text-neutral-100 font-medium truncate" title={fileName}>
              {fileName}
            </p>
            <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-mono">
              PNG Lossless Frame
            </p>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 text-xs font-medium">
          <button
            onClick={handleCopy}
            className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] transition cursor-pointer ${
              copied
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-white/5 hover:bg-white/10 text-neutral-200 border-white/10"
            }`}
            title="Copy image pixels to OS clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleReveal}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 text-[11px] transition cursor-pointer"
            title="Reveal in File Explorer"
          >
            <FolderOpen className="w-3 h-3 text-amber-400" />
            <span>Folder</span>
          </button>

          <button
            onClick={handleOpen}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 text-[11px] transition cursor-pointer"
            title="Open in default viewer"
          >
            <ExternalLink className="w-3 h-3 text-cyan-400" />
            <span>Open</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

