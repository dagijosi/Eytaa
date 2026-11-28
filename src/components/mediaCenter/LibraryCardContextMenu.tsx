import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Play,
  Plus,
  CheckCircle2,
  Circle,
  Heart,
  Edit3,
  Trash2,
  FolderOpen,
  RotateCcw,
  FolderHeart,
  ChevronRight,
} from "lucide-react";
import { LibraryItem } from "../../services/library/libraryService";

export interface LibraryContextMenuState {
  item: LibraryItem;
  x: number;
  y: number;
  collectionIdToRemove?: number;
}

interface LibraryCardContextMenuProps {
  menu: LibraryContextMenuState | null;
  collections: Array<{ id: number; name: string }>;
  onClose: () => void;
  onPlay: (item: LibraryItem) => void;
  onQueue: (filePath: string) => void;
  onToggleWatched: (filePath: string, currentWatched: boolean) => void;
  onToggleFavorite: (filePath: string) => void;
  onResetProgress: (filePath: string) => void;
  onAddToCollection: (collectionId: number, filePath: string) => void;
  onRemoveFromCollection?: (collectionId: number, filePath: string) => void;
  onEdit: (item: LibraryItem) => void;
  onRevealInFolder: (filePath: string) => void;
  onDelete?: (item: LibraryItem) => void;
}

export function LibraryCardContextMenu({
  menu,
  collections,
  onClose,
  onPlay,
  onQueue,
  onToggleWatched,
  onToggleFavorite,
  onResetProgress,
  onAddToCollection,
  onRemoveFromCollection,
  onEdit,
  onRevealInFolder,
  onDelete,
}: LibraryCardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [showCollections, setShowCollections] = useState(false);

  useEffect(() => {
    setShowCollections(false);
  }, [menu?.item.file_path, menu?.x, menu?.y]);

  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const pad = 12;
    const left = Math.min(menu.x, Math.max(pad, window.innerWidth - rect.width - pad));
    const top = Math.min(menu.y, Math.max(pad, window.innerHeight - rect.height - pad));
    setPos({ left, top });
  }, [menu, showCollections]);

  useEffect(() => {
    if (!menu) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const { item, collectionIdToRemove } = menu;
  const hasResume =
    !item.is_watched &&
    typeof item.resume_position === "number" &&
    item.resume_position > 10;

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{ left: pos.left, top: pos.top }}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-[120] w-56 rounded-xl bg-neutral-950/95 backdrop-blur-xl border border-white/15 shadow-2xl p-1.5 text-xs text-neutral-200 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="px-2.5 py-1.5 mb-1 border-b border-white/10">
        <p className="font-semibold text-white truncate">{item.title}</p>
        {item.series_name && (
          <p className="text-[10px] font-mono text-neutral-400 truncate">{item.series_name}</p>
        )}
      </div>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onPlay(item);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left cursor-pointer transition-colors"
      >
        <Play className="w-3.5 h-3.5 text-neutral-300" />
        <span className="font-medium">{hasResume ? "Resume Playing" : "Play Now"}</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onQueue(item.file_path);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left cursor-pointer transition-colors"
      >
        <Plus className="w-3.5 h-3.5 text-neutral-400" />
        <span>Add to Queue</span>
      </button>

      {collections.length > 0 && (
        <div className="relative">
          <button
            type="button"
            role="menuitem"
            onClick={() => setShowCollections((p) => !p)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <FolderHeart className="w-3.5 h-3.5 text-neutral-400" />
              <span>Add to Collection</span>
            </span>
            <ChevronRight
              className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${
                showCollections ? "rotate-90" : ""
              }`}
            />
          </button>
          {showCollections && (
            <div className="mt-0.5 ml-3 pl-2 border-l border-white/10 space-y-0.5 max-h-36 overflow-y-auto">
              {collections.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    onAddToCollection(col.id, item.file_path);
                    onClose();
                  }}
                  className="w-full text-left px-2 py-1 rounded-md text-[11px] text-neutral-300 hover:text-white hover:bg-white/10 truncate cursor-pointer"
                >
                  + {col.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {collectionIdToRemove !== undefined && onRemoveFromCollection && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onRemoveFromCollection(collectionIdToRemove, item.file_path);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/15 text-rose-300 text-left cursor-pointer transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Remove from Collection</span>
        </button>
      )}

      <div className="my-1 border-t border-white/10" />

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onToggleWatched(item.file_path, item.is_watched);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left cursor-pointer transition-colors"
      >
        {item.is_watched ? (
          <>
            <Circle className="w-3.5 h-3.5 text-neutral-400" />
            <span>Mark as Unwatched</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mark as Watched</span>
          </>
        )}
      </button>

      {hasResume && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onResetProgress(item.file_path);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Dismiss from Continue Watching</span>
        </button>
      )}

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onToggleFavorite(item.file_path);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left cursor-pointer transition-colors"
      >
        <Heart
          className={`w-3.5 h-3.5 ${
            item.is_favorite ? "text-rose-400 fill-rose-400" : "text-neutral-400"
          }`}
        />
        <span>{item.is_favorite ? "Remove from Favorites" : "Add to Favorites"}</span>
      </button>

      <div className="my-1 border-t border-white/10" />

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onEdit(item);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left cursor-pointer transition-colors"
      >
        <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
        <span>Edit Details…</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onRevealInFolder(item.file_path);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left cursor-pointer transition-colors"
      >
        <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
        <span>Show in Folder</span>
      </button>

      {onDelete && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onDelete(item);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/15 text-rose-400 text-left cursor-pointer transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete File…</span>
        </button>
      )}
    </div>
  );
}
