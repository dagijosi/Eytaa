import { Clock, Play, Trash2 } from "lucide-react";
import type { HistoryEntry } from "../../services/storage/storageService";

interface HistorySettingsProps {
  accentColor: string;
  accentGlow: string;
  recentFiles: HistoryEntry[];
  clearPlaybackHistory: () => Promise<void>;
  deleteHistoryItem: (filePath: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  toggleSettingsModal: (open?: boolean | unknown, initialTab?: string) => void;
}

export function HistorySettings({
  accentColor,
  accentGlow,
  recentFiles,
  clearPlaybackHistory,
  deleteHistoryItem,
  openFile,
  toggleSettingsModal,
}: HistorySettingsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-neutral-400">
          Playback history stored in local SQLite database:
        </p>
        {recentFiles.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Clear all playback history?")) {
                clearPlaybackHistory();
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 active:scale-95 transition-all font-medium"
            title="Clear All History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {recentFiles.length === 0 ? (
        <p className="text-xs text-neutral-500 italic text-center py-6">
          No playback history recorded yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {recentFiles.map((item) => (
            <div
              key={item.id}
              onClick={async () => {
                await openFile(item.filePath);
                toggleSettingsModal();
              }}
              className="group flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 cursor-pointer transition"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  style={{
                    backgroundColor: accentColor,
                    color: "var(--accent-text)",
                    boxShadow: `0 2px 10px ${accentGlow}`,
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate text-neutral-200">
                    {item.title || item.filePath.split(/[/\\]/).pop()}
                  </span>
                  <span className="text-[10px] text-neutral-500 truncate font-mono">
                    {item.filePath}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-right shrink-0 ml-2">
                {item.position && item.duration ? (
                  <span
                    style={{ color: accentColor }}
                    className="text-[10px] font-mono font-bold"
                  >
                    {Math.round((item.position / item.duration) * 100)}%
                  </span>
                ) : null}
                <Clock className="w-3 h-3 text-neutral-500" />

                {/* Delete single history item button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHistoryItem(item.filePath);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/15 transition-all ml-1"
                  title="Remove from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
