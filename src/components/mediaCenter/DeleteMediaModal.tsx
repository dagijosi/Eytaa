import { useState } from "react";
import { Trash2, AlertTriangle, Archive, HardDrive, X } from "lucide-react";
import { LibraryItem } from "../../services/library/libraryService";

interface DeleteMediaModalProps {
  item: LibraryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: LibraryItem, toRecycleBin: boolean, keepInArchive: boolean) => Promise<void>;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let b = bytes;
  let idx = 0;
  while (b >= 1024 && idx < units.length - 1) {
    b /= 1024;
    idx++;
  }
  return `${b.toFixed(1)} ${units[idx]}`;
}

export function DeleteMediaModal({
  item,
  isOpen,
  onClose,
  onConfirm,
}: DeleteMediaModalProps) {
  const [toRecycleBin, setToRecycleBin] = useState(true);
  const [keepInArchive, setKeepInArchive] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !item) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm(item, toRecycleBin, keepInArchive);
      onClose();
    } catch (e) {
      console.error("Delete media error:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const isEpisode = item.category === "series" || !!item.series_name;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Delete Media File</h3>
              <p className="text-xs text-neutral-400">Remove media file from your computer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Item Preview Card */}
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/5 space-y-1.5">
            <h4 className="text-sm font-semibold text-white line-clamp-1">{item.title}</h4>
            {isEpisode && (
              <p className="text-xs text-neutral-300 font-mono">
                {item.series_name} • Season {item.season_number ?? 1}, Episode {item.episode_number ?? 1}
              </p>
            )}
            <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono truncate">
              <HardDrive className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
              <span className="truncate">{item.file_path}</span>
              <span className="text-neutral-500">•</span>
              <span className="shrink-0">{formatBytes(item.file_size)}</span>
            </div>
          </div>

          {/* Deletion Type Options */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Deletion Target
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setToRecycleBin(true)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  toRecycleBin
                    ? "bg-white/10 border-white/30 text-white shadow-xs"
                    : "bg-white/[0.02] border-white/5 text-neutral-400 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${toRecycleBin ? "bg-emerald-400" : "bg-neutral-600"}`} />
                  <span className="text-xs font-semibold text-white">Recycle Bin</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Safe & recoverable. Moves the file to Windows Recycle Bin.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setToRecycleBin(false)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  !toRecycleBin
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-200 shadow-xs"
                    : "bg-white/[0.02] border-white/5 text-neutral-400 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${!toRecycleBin ? "bg-rose-400" : "bg-neutral-600"}`} />
                  <span className="text-xs font-semibold text-white">Permanent Delete</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Instantly frees disk space. File cannot be restored.
                </p>
              </button>
            </div>
          </div>

          {/* Keep In Watch Report Checkbox */}
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
            <input
              type="checkbox"
              id="keepInArchive"
              checked={keepInArchive}
              onChange={(e) => setKeepInArchive(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-indigo-500 focus:ring-0 bg-neutral-900 border-white/20 cursor-pointer"
            />
            <label htmlFor="keepInArchive" className="text-xs text-neutral-200 cursor-pointer select-none space-y-0.5">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-indigo-400" />
                Keep in Watch Report & Analytics
              </span>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Retains this item in your Watch History and Reports dashboard. You can free up hard drive space without losing track of what you've watched!
              </p>
            </label>
          </div>

          {!toRecycleBin && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Permanent deletion removes the file directly from disk without using the Recycle Bin.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-rose-950/40 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? "Deleting..." : toRecycleBin ? "Move to Recycle Bin" : "Delete Permanently"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
