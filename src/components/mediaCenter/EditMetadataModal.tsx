import { useState, useEffect } from "react";
import { X, Save, Film, Tv, Music, Video, FolderOpen, Globe, Search, Star, Check, Image as ImageIcon } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useThemeStore } from "../../stores/themeStore";
import { libraryService, LibraryItem } from "../../services/library/libraryService";
import { resolvePoster } from "../../utils/mediaPoster";
import { metadataScraperService, ScrapedMediaResult } from "../../services/metadata/metadataScraperService";
import { normalizeSeriesKey } from "../../utils/mediaTitle";

export interface EditMetadataModalProps {
  item: LibraryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (renamedSeries?: { oldName: string; newName: string }) => void;
  existingSeriesNames?: string[];
  seriesMode?: boolean;
  seriesName?: string;
  episodesCount?: number;
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
  seriesMode = false,
  seriesName: initialSeriesNameProp,
  episodesCount,
}: EditMetadataModalProps & { item: LibraryItem }) {
  const { accentColor, accentGlow, accentText } = useThemeStore();

  const [title, setTitle] = useState(
    seriesMode ? initialSeriesNameProp || item.series_name || item.title || "" : item.title || "",
  );
  const [category, setCategory] = useState<string>(seriesMode ? "series" : item.category || "movie");
  const [seriesName, setSeriesName] = useState(
    seriesMode ? initialSeriesNameProp || item.series_name || "" : item.series_name || "",
  );
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

  // Online TMDb Scraper State
  const [isScraperOpen, setIsScraperOpen] = useState(false);
  const [scraperQuery, setScraperQuery] = useState("");
  const [scraperResults, setScraperResults] = useState<ScrapedMediaResult[]>([]);
  const [isSearchingScraper, setIsSearchingScraper] = useState(false);
  const [scraperSearched, setScraperSearched] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [hasCustomKey, setHasCustomKey] = useState(false);

  // Artwork Selection State (Landing Images vs Posters)
  const [availablePosters, setAvailablePosters] = useState<string[]>([]);
  const [availableBackdrops, setAvailableBackdrops] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [artworkTab, setArtworkTab] = useState<"backdrops" | "posters">("backdrops");

  // Rich TV Series Metadata State (from TMDb / SQLite)
  const [seriesOverview, setSeriesOverview] = useState("");
  const [seriesTagline, setSeriesTagline] = useState("");
  const [seriesRating, setSeriesRating] = useState<number | undefined>();
  const [seriesVoteCount, setSeriesVoteCount] = useState<number | undefined>();
  const [seriesGenres, setSeriesGenres] = useState<string[]>([]);
  const [seriesStatus, setSeriesStatus] = useState<string | undefined>();
  const [seriesNetworks, setSeriesNetworks] = useState<string[]>([]);
  const [seriesContentRating, setSeriesContentRating] = useState<string | undefined>();
  const [seriesFirstAirDate, setSeriesFirstAirDate] = useState<string | undefined>();
  const [seriesLastAirDate, setSeriesLastAirDate] = useState<string | undefined>();
  const [seriesCreatedBy, setSeriesCreatedBy] = useState<string[]>([]);
  const [seriesTmdbId, setSeriesTmdbId] = useState<number | undefined>();
  const [seriesBackdropUrl, setSeriesBackdropUrl] = useState<string | undefined>();

  useEffect(() => {
    if (seriesMode) {
      const key = normalizeSeriesKey(initialSeriesNameProp || item.series_name || "");
      if (key) {
        libraryService.getSeriesMetadata(key).then((meta) => {
          if (meta) {
            if (meta.overview) setSeriesOverview(meta.overview);
            if (meta.tagline) setSeriesTagline(meta.tagline);
            if (typeof meta.rating === "number") setSeriesRating(meta.rating);
            if (typeof meta.vote_count === "number") setSeriesVoteCount(meta.vote_count);
            if (meta.status) setSeriesStatus(meta.status);
            if (meta.first_air_date) setSeriesFirstAirDate(meta.first_air_date);
            if (meta.last_air_date) setSeriesLastAirDate(meta.last_air_date);
            if (meta.content_rating) setSeriesContentRating(meta.content_rating);
            if (meta.backdrop_url) setSeriesBackdropUrl(meta.backdrop_url);
            if (typeof meta.tmdb_id === "number") setSeriesTmdbId(meta.tmdb_id);
            if (meta.genres) {
              try {
                const parsed = JSON.parse(meta.genres);
                if (Array.isArray(parsed)) setSeriesGenres(parsed);
              } catch {}
            }
            if (meta.networks) {
              setSeriesNetworks(meta.networks.split(",").map((s) => s.trim()).filter(Boolean));
            }
            if (meta.created_by) {
              setSeriesCreatedBy(meta.created_by.split(",").map((s) => s.trim()).filter(Boolean));
            }
          }
        });
      }
    }
  }, [seriesMode, initialSeriesNameProp, item.series_name]);

  // Pre-fill query with smart cleaned filename or show name
  const handleOpenScraper = () => {
    if (!isScraperOpen) {
      metadataScraperService.getApiKey().then(() => {
        import("../../services/storage/storageService").then(({ storageService }) => {
          storageService.getPreference<string>("tmdbApiKey").then((saved) => {
            if (saved) {
              setCustomApiKey(saved);
              setHasCustomKey(true);
            }
          });
        });
      });
      const queryInit = seriesMode
        ? (initialSeriesNameProp || seriesName || title).trim()
        : metadataScraperService.parseFilename(item.file_name).cleanTitle || title || item.file_name;
      setScraperQuery(queryInit);
      setIsScraperOpen(true);
      performScraperSearch(queryInit);
    } else {
      setIsScraperOpen(false);
    }
  };

  const handleSaveCustomKey = async () => {
    await metadataScraperService.setApiKey(customApiKey.trim());
    setHasCustomKey(Boolean(customApiKey.trim()));
    setShowKeyConfig(false);
    if (scraperQuery) {
      performScraperSearch(scraperQuery);
    }
  };

  const performScraperSearch = async (searchTerm: string) => {
    const q = searchTerm.trim();
    if (!q) return;

    setIsSearchingScraper(true);
    setScraperSearched(true);
    try {
      const searchCategory = seriesMode
        ? "series"
        : category === "series"
          ? "series"
          : category === "movie"
            ? "movie"
            : "all";
      const results = await metadataScraperService.searchMedia(q, searchCategory);
      setScraperResults(results);
    } catch {
      setScraperResults([]);
    } finally {
      setIsSearchingScraper(false);
    }
  };

  const handleApplyMatch = async (match: ScrapedMediaResult) => {
    setTitle(match.title);
    if (match.year) setYear(match.year);
    if (seriesMode || match.mediaType === "series") {
      setCategory("series");
      setSeriesName(match.title);
      // Fetch comprehensive TV series details (synopsis, tagline, rating, genres, networks, status)
      metadataScraperService.fetchSeriesDetails(match.id).then((details) => {
        if (details) {
          setSeriesTmdbId(details.id);
          if (details.overview) setSeriesOverview(details.overview);
          if (details.tagline) setSeriesTagline(details.tagline);
          if (typeof details.rating === "number") setSeriesRating(details.rating);
          if (typeof details.voteCount === "number") setSeriesVoteCount(details.voteCount);
          if (details.genres.length > 0) setSeriesGenres(details.genres);
          if (details.status) setSeriesStatus(details.status);
          if (details.networks.length > 0) setSeriesNetworks(details.networks);
          if (details.contentRating) setSeriesContentRating(details.contentRating);
          if (details.firstAirDate) setSeriesFirstAirDate(details.firstAirDate);
          if (details.lastAirDate) setSeriesLastAirDate(details.lastAirDate);
          if (details.createdBy.length > 0) setSeriesCreatedBy(details.createdBy);
          if (details.backdropUrl) setSeriesBackdropUrl(details.backdropUrl);
        }
      });
    } else {
      setCategory("movie");
    }

    // Default to landscape landing image if available, otherwise poster
    const initialPoster = match.backdropUrl || match.posterUrl || "";
    if (initialPoster) {
      setCustomPoster(initialPoster);
      setArtworkTab(match.backdropUrl ? "backdrops" : "posters");
    }

    setIsScraperOpen(false);

    // Fetch full gallery of available posters and landing backdrops
    setIsLoadingImages(true);
    try {
      const { posters, backdrops } = await metadataScraperService.fetchMediaImages(
        match.id,
        match.mediaType,
      );
      const allBackdrops = Array.from(
        new Set([match.backdropUrl, ...backdrops].filter((u): u is string => Boolean(u))),
      );
      const allPosters = Array.from(
        new Set([match.posterUrl, ...posters].filter((u): u is string => Boolean(u))),
      );
      setAvailableBackdrops(allBackdrops);
      setAvailablePosters(allPosters);
    } catch {
      if (match.backdropUrl) setAvailableBackdrops([match.backdropUrl]);
      if (match.posterUrl) setAvailablePosters([match.posterUrl]);
    } finally {
      setIsLoadingImages(false);
    }
  };

  // Live artwork preview resolver
  useEffect(() => {
    let isMounted = true;
    resolvePoster(customPoster).then((src) => {
      if (isMounted) setPosterPreview(src);
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
      if (seriesMode) {
        const origName = (initialSeriesNameProp || item.series_name || title).trim();
        const newName = title.trim();
        const normKey = normalizeSeriesKey(newName);

        // Update episodes in library items
        await libraryService.updateSeriesMetadata({
          seriesName: origName,
          newSeriesName: newName,
          year: year.trim() || undefined,
          customPoster: customPoster.trim() ? customPoster.trim() : "",
        });

        // Store comprehensive TMDb details in series_metadata
        await libraryService.saveSeriesMetadata({
          series_key: normKey,
          series_name: newName,
          tmdb_id: seriesTmdbId,
          overview: seriesOverview.trim() || undefined,
          tagline: seriesTagline.trim() || undefined,
          rating: seriesRating,
          vote_count: seriesVoteCount,
          genres: seriesGenres.length > 0 ? JSON.stringify(seriesGenres) : undefined,
          status: seriesStatus,
          networks: seriesNetworks.length > 0 ? seriesNetworks.join(", ") : undefined,
          first_air_date: seriesFirstAirDate,
          last_air_date: seriesLastAirDate,
          backdrop_url: seriesBackdropUrl || customPoster.trim() || undefined,
          poster_url: customPoster.trim() || undefined,
          created_by: seriesCreatedBy.length > 0 ? seriesCreatedBy.join(", ") : undefined,
          content_rating: seriesContentRating,
        });

        onSaved({ oldName: origName, newName });
        onClose();
        return;
      }

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
              style={{ backgroundColor: accentColor, color: accentText, boxShadow: `0 2px 10px ${accentGlow}` }}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            >
              {seriesMode ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  {seriesMode ? "Edit TV Series (Entire Show)" : "Edit Media Information"}
                </h2>
                {seriesMode && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/10 text-neutral-300 border border-white/10">
                    Series Main Folder
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-mono truncate max-w-sm">
                {seriesMode ? (
                  <span>
                    {initialSeriesNameProp || item.series_name || title}
                    {typeof episodesCount === "number" && (
                      <span className="tabular-nums"> • Affects all {episodesCount} episodes</span>
                    )}
                  </span>
                ) : (
                  item.file_name
                )}
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
          {/* Media Category Selector (Single Media File Mode Only) */}
          {!seriesMode && (
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
                              backgroundColor: accentColor,
                              borderColor: accentColor,
                              color: accentText,
                              boxShadow: `0 2px 8px ${accentGlow}`,
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
          )}

          {/* Title and TMDb Scraper Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                {seriesMode ? "Series / Show Title" : "Title / Display Name"}
              </label>
              <button
                type="button"
                onClick={handleOpenScraper}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-neutral-200 hover:text-white text-[11px] font-semibold transition cursor-pointer border border-white/10"
              >
                <Globe className="w-3.5 h-3.5 text-neutral-400" />
                <span>{isScraperOpen ? "Close Search" : "Fetch from TMDb"}</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (seriesMode) setSeriesName(e.target.value);
              }}
              placeholder={seriesMode ? "e.g. Breaking Bad" : "e.g. Inception or Breaking Bad • S01E01 - Pilot"}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-white/40 focus:outline-none text-xs text-white"
            />
            {seriesMode && (
              <p className="text-[10px] text-neutral-400 mt-1">
                Saving will rename the TV series across all episodes and season folders in your library.
              </p>
            )}
          </div>

          {/* TMDb Online Match Panel */}
          {isScraperOpen && (
            <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-white/15 space-y-3 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={scraperQuery}
                  onChange={(e) => setScraperQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      performScraperSearch(scraperQuery);
                    }
                  }}
                  placeholder="Search movie or TV show on TMDb..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={() => performScraperSearch(scraperQuery)}
                  disabled={isSearchingScraper}
                  className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isSearchingScraper ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Search</span>
                </button>
              </div>

              {/* API Key Status & Quick Config Toggle */}
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono px-0.5">
                <span>
                  Key:{" "}
                  <strong className={hasCustomKey ? "text-emerald-400 font-semibold" : "text-neutral-300"}>
                    {hasCustomKey ? "Custom Key Active" : "Default Community Key Active"}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowKeyConfig(!showKeyConfig)}
                  className="text-neutral-400 hover:text-white underline transition cursor-pointer"
                >
                  {showKeyConfig ? "Hide Key Input" : "Configure API Key"}
                </button>
              </div>

              {/* Inline Custom API Key Config Box */}
              {showKeyConfig && (
                <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 space-y-1.5 animate-in fade-in duration-100">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="password"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="Paste TMDb API Key (v3 auth)..."
                      className="flex-1 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-white/30"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomKey}
                      className="px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    Get a free personal API key at <span className="text-neutral-400">themoviedb.org/settings/api</span>
                  </div>
                </div>
              )}

              {/* Match Results */}
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {isSearchingScraper ? (
                  <div className="py-6 text-center text-neutral-400 text-xs flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Searching TMDb database...</span>
                  </div>
                ) : scraperResults.length > 0 ? (
                  scraperResults.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-start gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition cursor-pointer group"
                      onClick={() => handleApplyMatch(match)}
                    >
                      {/* Poster Preview */}
                      <div className="w-10 h-14 bg-black/60 rounded-md overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                        {match.posterUrl ? (
                          <img
                            src={match.posterUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Film className="w-4 h-4 text-neutral-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white truncate text-xs">
                            {match.title}
                          </span>
                          {match.year && (
                            <span className="text-[10px] text-neutral-400 font-mono">
                              ({match.year})
                            </span>
                          )}
                          <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-white/10 text-neutral-400">
                            {match.mediaType}
                          </span>
                          {match.rating && (
                            <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5 ml-auto">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              {match.rating}
                            </span>
                          )}
                        </div>

                        {match.overview && (
                          <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5 leading-snug">
                            {match.overview}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        className="px-2 py-1 rounded bg-white/10 group-hover:bg-white/25 text-neutral-200 group-hover:text-white text-[10px] font-semibold shrink-0 transition"
                      >
                        Apply
                      </button>
                    </div>
                  ))
                ) : scraperSearched ? (
                  <div className="py-4 text-center text-neutral-500 text-xs">
                    No results found on TMDb for "{scraperQuery}"
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Series Specific Fields (Single Episode Mode Only) */}
          {category === "series" && !seriesMode && (
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
              {seriesMode ? "Series Release Year" : "Release Year"}
            </label>
            <input
              type="text"
              maxLength={4}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2024"
              className="w-32 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-white/40 focus:outline-none text-xs text-white font-mono tabular-nums"
            />
          </div>

          {/* Rich Series Metadata (Overview, Tagline, TMDb Details) */}
          {seriesMode && (
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                  Series Synopsis & Storyline
                </label>
                {typeof seriesRating === "number" && (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="tabular-nums">{seriesRating.toFixed(1)}</span>
                    <span className="text-neutral-500 text-[10px]">/ 10</span>
                  </span>
                )}
              </div>

              <textarea
                rows={3}
                value={seriesOverview}
                onChange={(e) => setSeriesOverview(e.target.value)}
                placeholder="Plot synopsis or premise of this show (auto-populated when fetching from TMDb)..."
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 focus:border-white/40 focus:outline-none text-xs text-white leading-relaxed resize-none"
              />

              <div>
                <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={seriesTagline}
                  onChange={(e) => setSeriesTagline(e.target.value)}
                  placeholder="e.g. Change the equation."
                  className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-300 focus:outline-none focus:border-white/30 italic"
                />
              </div>

              {(seriesGenres.length > 0 || seriesStatus || seriesNetworks.length > 0 || seriesContentRating) && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    {seriesContentRating && (
                      <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-white font-bold">
                        {seriesContentRating}
                      </span>
                    )}
                    {seriesStatus && (
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300">
                        {seriesStatus}
                      </span>
                    )}
                    {seriesNetworks.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300">
                        {seriesNetworks.join(", ")}
                      </span>
                    )}
                    {seriesFirstAirDate && (
                      <span className="text-neutral-500 tabular-nums">
                        Premiered {seriesFirstAirDate}
                      </span>
                    )}
                  </div>

                  {seriesGenres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {seriesGenres.map((g) => (
                        <span
                          key={g}
                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-neutral-300"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

            {/* TMDb Artwork Chooser (Landing Images vs Posters) */}
            {(availableBackdrops.length > 0 || availablePosters.length > 0) && (
              <div className="mt-3 p-3 rounded-xl bg-neutral-950/70 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Choose Artwork (Landing Image or Poster)</span>
                  </div>
                  {isLoadingImages && (
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  )}
                </div>

                {/* Tabs: Landing Images vs Vertical Posters */}
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <button
                    type="button"
                    onClick={() => setArtworkTab("backdrops")}
                    style={
                      artworkTab === "backdrops"
                        ? { backgroundColor: `${accentColor}25`, color: accentColor, borderColor: `${accentColor}50` }
                        : undefined
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      artworkTab === "backdrops"
                        ? "font-semibold shadow-xs"
                        : "border-transparent bg-white/5 text-neutral-400 hover:text-white"
                    }`}
                  >
                    Landing Images (16:9 Landscape)
                    {availableBackdrops.length > 0 && ` (${availableBackdrops.length})`}
                  </button>

                  <button
                    type="button"
                    onClick={() => setArtworkTab("posters")}
                    style={
                      artworkTab === "posters"
                        ? { backgroundColor: `${accentColor}25`, color: accentColor, borderColor: `${accentColor}50` }
                        : undefined
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      artworkTab === "posters"
                        ? "font-semibold shadow-xs"
                        : "border-transparent bg-white/5 text-neutral-400 hover:text-white"
                    }`}
                  >
                    Vertical Posters (2:3 Portrait)
                    {availablePosters.length > 0 && ` (${availablePosters.length})`}
                  </button>
                </div>

                {/* Horizontal Scrolling Image Gallery */}
                <div className="flex items-center gap-2.5 overflow-x-auto py-1 no-scrollbar">
                  {artworkTab === "backdrops" ? (
                    availableBackdrops.length > 0 ? (
                      availableBackdrops.map((url, i) => {
                        const isSelected = customPoster === url;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setCustomPoster(url)}
                            style={isSelected ? { borderColor: accentColor } : undefined}
                            className={`group relative w-36 aspect-video rounded-lg overflow-hidden border shrink-0 transition cursor-pointer ${
                              isSelected
                                ? "ring-2 ring-emerald-500/80 shadow-md"
                                : "border-white/10 hover:border-white/30 opacity-75 hover:opacity-100"
                            }`}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            {isSelected && (
                              <div
                                style={{ backgroundColor: accentColor }}
                                className="absolute bottom-1 right-1 p-0.5 rounded-full text-black shadow"
                              >
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-xs text-neutral-500 py-2">No landing backdrops found.</p>
                    )
                  ) : availablePosters.length > 0 ? (
                    availablePosters.map((url, i) => {
                      const isSelected = customPoster === url;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCustomPoster(url)}
                          style={isSelected ? { borderColor: accentColor } : undefined}
                          className={`group relative w-20 aspect-[2/3] rounded-lg overflow-hidden border shrink-0 transition cursor-pointer ${
                            isSelected
                              ? "ring-2 ring-emerald-500/80 shadow-md"
                              : "border-white/10 hover:border-white/30 opacity-75 hover:opacity-100"
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {isSelected && (
                            <div
                              style={{ backgroundColor: accentColor }}
                              className="absolute bottom-1 right-1 p-0.5 rounded-full text-black shadow"
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-xs text-neutral-500 py-2">No vertical posters found.</p>
                  )}
                </div>
              </div>
            )}

            {/* Poster Preview */}
            {posterPreview ? (
              <div className="mt-2.5 flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="max-w-[120px] max-h-20 rounded-lg overflow-hidden bg-neutral-950 border border-white/10 shrink-0 shadow-md flex items-center justify-center">
                  <img
                    src={posterPreview}
                    alt="Preview"
                    className="max-w-full max-h-20 object-contain rounded"
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

            {/* Option to apply to all episodes if series (Single Episode Mode Only) */}
            {!seriesMode && category === "series" && seriesName.trim() && (
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

          {/* Watched Status Switch (Single Episode Mode Only) */}
          {!seriesMode && (
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
          )}

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
              <span>
                {isSaving
                  ? seriesMode
                    ? "Updating Series..."
                    : "Saving..."
                  : seriesMode
                    ? "Save Series Details"
                    : "Save Changes"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
