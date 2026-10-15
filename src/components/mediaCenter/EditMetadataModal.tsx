import { useState, useEffect } from "react";
import { X, Save, Film, Tv, Music, Video, FolderOpen } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useThemeStore } from "../../stores/themeStore";
import { libraryService, LibraryItem } from "../../services/library/libraryService";

interface EditMetadataModalProps {
  item: LibraryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  existingSeriesNames?: string[];
}

export function EditMetadataModal(props: EditMetadataModalProps) {
  if (!props.isOpen || !props.item) return null;
  return <EditMetadataModalContent {...props} item={props.item} />;
}

function EditMetadataModalContent({
  item,
  onClose,
  onSaved,
  existingSeriesNames = [],
}: EditMetadataModalProps & { item: LibraryItem }) {
  const { accentColor, accentGlow, accentText } = useThemeStore();

  const [title, setTitle] = useState(item.title || "");
  const [category, setCategory] = useState<string>(item.category || "movie");
  const [seriesName, setSeriesName] = useState(item.series_name || "");
  const [seasonNumber, setSeasonNumber] = useState<string>(
    typeof item.season_number === "number" ? String(item.season_number) : "",
  );
  const [episodeNumber, setEpisodeNumber] = useState<string>(
    typeof item.episode_number === "number" ? String(item.episode_number) : "",
  );
  const [episodeTitle, setEpisodeTitle] = useState(item.episode_title || "");
  const [year, setYear] = useState(item.year || "");
  const [customPoster, setCustomPoster] = useState(item.custom_poster || "");
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [applyToSeries, setApplyToSeries] = useState(true);
  const [isWatched, setIsWatched] = useState(item.is_watched || false);
  const [isSaving, setIsSaving] = useState(false);

  // Live artwork preview resolver
  useEffect(() => {
    let isMounted = true;
    const trimmed = customPoster.trim();
    if (!trimmed) {
      setPosterPreview(null);
      return;
    }
    if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      setPosterPreview(trimmed);
      return;
    }
    libraryService
      .getThumbnail(trimmed)
      .then((src) => {
        if (isMounted) {
          setPosterPreview(src);
        }
      })
      .catch(() => {
        if (isMounted) setPosterPreview(null);
      });

    return () => {
      isMounted = false;
    };
  }, [customPoster]);

  const handlePickPoster = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Images",
            extensions: ["jpg", "jpeg", "png", "webp"],
          },
        ],
      });
      if (selected && typeof selected === "string") {
        setCustomPoster(selected);
      }
    } catch (e) {
      console.error("Pick poster error:", e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await libraryService.updateMediaMetadata({
        filePath: item.file_path,
        title: title.trim(),
        category,
        seriesName: seriesName.trim() || undefined,
        seasonNumber: seasonNumber ? parseInt(seasonNumber, 10) : undefined,
        episodeNumber: episodeNumber ? parseInt(episodeNumber, 10) : undefined,
        episodeTitle: episodeTitle.trim() || undefined,
        year: year.trim() || undefined,
        customPoster: customPoster.trim() || undefined,
        applyToSeries: category === "series" ? applyToSeries : undefined,
      });

      if (isWatched !== item.is_watched) {
        await libraryService.setWatchedStatus(item.file_path, isWatched);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error("Save metadata error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Edit Media Information"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 text-white animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
              className="w-8 h-8 rounded-xl flex items-center justify-center"
            >
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Edit Media Information</h2>
              <p className="text-[11px] text-neutral-400 font-mono truncate max-w-sm">
                {item.file_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Media Category Selector */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              Media Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "movie", label: "Movie", icon: Film },
                { id: "series", label: "TV Episode", icon: Tv },
                { id: "music", label: "Music", icon: Music },
                { id: "video", label: "General Video", icon: Video },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={
                      isSelected
                        ? {
                            backgroundColor: `${accentColor}25`,
                            borderColor: accentColor,
                            color: accentColor,
                          }
                        : {}
                    }
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? "shadow-sm font-bold"
                        : "bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
              Title / Display Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Inception or Breaking Bad • S01E01 - Pilot"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-white/40 focus:outline-none text-xs text-white"
            />
          </div>

          {/* Series Specific Fields */}
          {category === "series" && (
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  Series / Show Name
                </label>
                <input
                  type="text"
                  list="series-suggestions"
                  value={seriesName}
                  onChange={(e) => setSeriesName(e.target.value)}
                  placeholder="e.g. Breaking Bad, Stranger Things"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 focus:border-white/40 focus:outline-none text-xs text-white"
                />
                <datalist id="series-suggestions">
                  {existingSeriesNames.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                    Season Number
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={seasonNumber}
                    onChange={(e) => setSeasonNumber(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 focus:border-white/40 focus:outline-none text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                    Episode Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 focus:border-white/40 focus:outline-none text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  Episode Title
                </label>
                <input
                  type="text"
                  value={episodeTitle}
                  onChange={(e) => setEpisodeTitle(e.target.value)}
                  placeholder="e.g. Pilot, Ozymandias"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 focus:border-white/40 focus:outline-none text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* Release Year */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
              Release Year
            </label>
            <input
              type="text"
              maxLength={4}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2024"
              className="w-32 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-white/40 focus:outline-none text-xs text-white font-mono"
            />
          </div>

          {/* Custom Poster Path */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
              Custom Artwork / Poster
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPoster}
                onChange={(e) => setCustomPoster(e.target.value)}
                placeholder="Path to poster image (.jpg, .png, etc.) or click Browse"
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-white/40 focus:outline-none text-xs text-white font-mono"
              />
              <button
                type="button"
                onClick={handlePickPoster}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Browse</span>
              </button>
            </div>

            {/* Poster Preview */}
            {posterPreview ? (
              <div className="mt-2.5 flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="w-12 aspect-[2/3] rounded-lg overflow-hidden bg-neutral-950 border border-white/10 shrink-0 shadow-md">
                  <img
                    src={posterPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setPosterPreview(null)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-emerald-400">
                    Artwork loaded
                  </p>
                  <p className="text-[10px] text-neutral-400 font-mono truncate max-w-xs mt-0.5">
                    {customPoster}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomPoster("")}
                  className="px-2.5 py-1 rounded-lg text-[11px] text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                >
                  Clear
                </button>
              </div>
            ) : customPoster.trim() ? (
              <p className="mt-1.5 text-[10px] text-amber-400/80 font-mono">
                Loading artwork preview...
              </p>
            ) : null}

            {/* Option to apply to all episodes if series */}
            {category === "series" && seriesName.trim() && (
              <label className="flex items-center gap-2 mt-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyToSeries}
                  onChange={(e) => setApplyToSeries(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
                />
                <span className="text-[11px] text-neutral-300">
                  Apply this artwork to all episodes in "{seriesName}"
                </span>
              </label>
            )}
          </div>

          {/* Watched Status Switch */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isWatched}
                onChange={(e) => setIsWatched(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
              />
              <span className="text-xs font-semibold text-neutral-200">
                Mark as Watched
              </span>
            </label>
            <p className="text-[10px] text-neutral-500 mt-0.5 ml-6">
              Watched media won't appear in Continue Watching and will show a completed checkmark.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-semibold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                backgroundColor: accentColor,
                color: accentText,
                boxShadow: `0 4px 14px ${accentGlow}`,
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
