import { useState, useEffect, useCallback, useMemo } from "react";
import { FolderPlus, Play, Trash2, Layers, Plus, Search, Check, Shuffle, Edit3 } from "lucide-react";
import { libraryService, CollectionItem, LibraryItem } from "../../services/library/libraryService";
import { MediaCard } from "./MediaCard";

interface CollectionsViewProps {
  allItems: LibraryItem[];
  accentColor: string;
  accentText: string;
  cardFormat?: "poster" | "widescreen";
  onPlayItem: (item: LibraryItem) => void;
  onQueueCollection: (items: LibraryItem[]) => void;
  onQueue: (filePath: string) => void;
  onEdit: (item: LibraryItem) => void;
  onDelete?: (item: LibraryItem) => void;
  onToggleFavorite: (filePath: string) => void;
  onToggleWatched: (filePath: string, currentWatched: boolean) => void;
  onContextMenu?: (item: LibraryItem, x: number, y: number, collectionId?: number) => void;
  onCollectionsChanged?: () => void;
}

export function CollectionsView({
  allItems,
  accentColor,
  accentText,
  cardFormat = "widescreen",
  onPlayItem,
  onQueueCollection,
  onQueue,
  onEdit,
  onDelete,
  onToggleFavorite,
  onToggleWatched,
  onContextMenu,
  onCollectionsChanged,
}: CollectionsViewProps) {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<number | null>(null);
  const [collectionPaths, setCollectionPaths] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");

  const loadCollections = useCallback(async () => {
    const list = await libraryService.getCollections();
    setCollections(list);
    if (list.length > 0 && activeCollectionId === null) {
      setActiveCollectionId(list[0].id);
    }
  }, [activeCollectionId]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    if (activeCollectionId === null) {
      setCollectionPaths([]);
      return;
    }
    libraryService.getCollectionItems(activeCollectionId).then(setCollectionPaths);
    const unsub = libraryService.onLibraryChange(() => {
      libraryService.getCollectionItems(activeCollectionId).then(setCollectionPaths);
      void loadCollections();
    });
    return () => unsub();
  }, [activeCollectionId, loadCollections]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const created = await libraryService.createCollection(trimmed);
      setNewName("");
      setCollections((prev) => [...prev, created]);
      setActiveCollectionId(created.id);
      setShowAddPicker(true);
      onCollectionsChanged?.();
    } catch (err) {
      console.warn("Create collection failed:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCollection = async (id: number) => {
    await libraryService.deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
    if (activeCollectionId === id) {
      setActiveCollectionId(null);
      setShowAddPicker(false);
      setIsRenaming(false);
    }
    onCollectionsChanged?.();
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCollection) return;
    const trimmed = renameDraft.trim();
    if (!trimmed || trimmed === activeCollection.name) {
      setIsRenaming(false);
      return;
    }
    await libraryService.renameCollection(activeCollection.id, trimmed);
    setCollections((prev) =>
      prev.map((c) => (c.id === activeCollection.id ? { ...c, name: trimmed } : c)),
    );
    setIsRenaming(false);
    onCollectionsChanged?.();
  };

  const handleAddItem = async (filePath: string) => {
    if (activeCollectionId === null) return;
    await libraryService.addToCollection(activeCollectionId, [filePath]);
    setCollectionPaths((prev) => (prev.includes(filePath) ? prev : [filePath, ...prev]));
    void loadCollections();
    onCollectionsChanged?.();
  };

  const handleRemoveItem = async (filePath: string) => {
    if (activeCollectionId === null) return;
    await libraryService.removeFromCollection(activeCollectionId, filePath);
    setCollectionPaths((prev) => prev.filter((p) => p !== filePath));
    void loadCollections();
    onCollectionsChanged?.();
  };

  const pathSet = useMemo(() => new Set(collectionPaths), [collectionPaths]);
  const activeItems = useMemo(
    () => allItems.filter((item) => pathSet.has(item.file_path)),
    [allItems, pathSet],
  );
  const activeCollection = collections.find((c) => c.id === activeCollectionId) || null;

  const pickerCandidates = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return allItems
      .filter((it) => {
        if (!q) return true;
        return (
          it.title.toLowerCase().includes(q) ||
          it.file_name.toLowerCase().includes(q) ||
          (it.series_name && it.series_name.toLowerCase().includes(q))
        );
      })
      .slice(0, 40);
  }, [allItems, pickerSearch]);

  return (
    <div className="space-y-5">
      {/* Create Collection Box */}
      <form
        onSubmit={handleCreate}
        className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2"
      >
        <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
          Create New Collection / Watchlist
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Type a new collection name (e.g. Weekend Watchlist, 4K Sci-Fi)..."
            className="flex-1 min-w-[220px] px-3.5 py-2 rounded-xl bg-black/50 border border-white/20 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/40"
          />
          <button
            type="submit"
            disabled={!newName.trim() || creating}
            style={{ backgroundColor: accentColor, color: accentText }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:brightness-110 disabled:opacity-40 transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Create Collection</span>
          </button>
        </div>
      </form>

      {collections.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
          <Layers className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-neutral-300">No Collections Yet</p>
          <p className="text-xs text-neutral-500 mt-1">
            Type a name above and click Create Collection, then add movies or shows directly inside.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Collection List */}
          <div className="space-y-1.5">
            {collections.map((col) => {
              const active = col.id === activeCollectionId;
              return (
                <div
                  key={col.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition cursor-pointer ${
                    active
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white/[0.03] border-white/5 text-neutral-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                  onClick={() => setActiveCollectionId(col.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{col.name}</div>
                    <div className="text-[10px] font-mono text-neutral-500">
                      {col.item_count} {col.item_count === 1 ? "item" : "items"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteCollection(col.id);
                    }}
                    className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                    title="Delete collection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active Collection Items & Inline Media Picker */}
          <div className="lg:col-span-3 space-y-3">
            {activeCollection && (
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="min-w-0">
                  {isRenaming ? (
                    <form onSubmit={handleRenameSubmit} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setIsRenaming(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/25 text-xs font-bold text-white focus:outline-none focus:border-white/50"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/20 text-[11px] font-semibold text-white cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRenaming(false)}
                        className="px-2 py-1 rounded-lg text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-white truncate">{activeCollection.name}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setRenameDraft(activeCollection.name);
                          setIsRenaming(true);
                        }}
                        className="p-1 rounded-md text-neutral-500 hover:text-white hover:bg-white/10 transition cursor-pointer"
                        title="Rename collection"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-neutral-500">
                    {activeItems.length} items in collection
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPicker((p) => !p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                      showAddPicker
                        ? "bg-white/15 border-white/25 text-white"
                        : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddPicker ? "Done Adding" : "Add Movies / Shows"}</span>
                  </button>
                  {activeItems.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const unwatched = activeItems.filter((i) => !i.is_watched);
                          const pool = unwatched.length > 0 ? unwatched : activeItems;
                          const pick = pool[Math.floor(Math.random() * pool.length)];
                          if (pick) onPlayItem(pick);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 cursor-pointer transition"
                        title="Play a random item from this collection"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>Surprise Me</span>
                      </button>
                      <button
                        onClick={() => onQueueCollection(activeItems)}
                        style={{ backgroundColor: accentColor, color: accentText }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer hover:brightness-110 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play All</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Direct Inline Media Picker */}
            {showAddPicker && activeCollection && (
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/15 space-y-2.5">
                <div className="flex items-center gap-2 bg-black/50 border border-white/15 rounded-xl px-3 py-1.5">
                  <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search your library to add to this collection..."
                    className="flex-1 bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {pickerCandidates.map((cand) => {
                    const added = pathSet.has(cand.file_path);
                    return (
                      <button
                        key={cand.file_path}
                        type="button"
                        onClick={() =>
                          added
                            ? void handleRemoveItem(cand.file_path)
                            : void handleAddItem(cand.file_path)
                        }
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                          added
                            ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                            : "bg-white/[0.03] hover:bg-white/10 text-neutral-300 border border-transparent"
                        }`}
                      >
                        <span className="truncate flex-1">
                          {cand.series_name ? `${cand.series_name} • ` : ""}
                          {cand.title}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                          {cand.category || cand.media_type}
                        </span>
                        {added ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 rounded-xl border border-white/5 bg-white/[0.02]">
                This collection is empty. Click <strong className="text-neutral-300">Add Movies / Shows</strong> above to add items.
              </div>
            ) : (
              <div
                className={`grid gap-3.5 ${
                  cardFormat === "poster"
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                    : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                }`}
              >
                {activeItems.map((item) => (
                  <MediaCard
                    key={item.file_path}
                    item={item}
                    viewFormat={cardFormat}
                    onPlay={() => onPlayItem(item)}
                    onQueue={onQueue}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleFavorite={onToggleFavorite}
                    onToggleWatched={onToggleWatched}
                    onContextMenu={
                      onContextMenu
                        ? (it, x, y) => onContextMenu(it, x, y, activeCollection?.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
