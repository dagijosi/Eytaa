import { storageService } from "../storage/storageService";

export interface ScrapedMediaResult {
  id: number;
  title: string;
  originalTitle?: string;
  year?: string;
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating?: number;
  mediaType: "movie" | "series";
  releaseDate?: string;
}

export interface ScrapedSeriesDetails {
  id: number;
  title: string;
  originalTitle?: string;
  year?: string;
  overview?: string;
  tagline?: string;
  rating?: number;
  voteCount?: number;
  genres: string[];
  status?: string;
  networks: string[];
  firstAirDate?: string;
  lastAirDate?: string;
  createdBy: string[];
  contentRating?: string;
  posterUrl?: string;
  backdropUrl?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
}

export interface ScrapedMediaDetails extends ScrapedMediaResult {
  genres: string[];
  durationMinutes?: number;
  director?: string;
  cast?: string[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
}

export interface ParsedFilenameInfo {
  cleanTitle: string;
  year?: string;
  season?: number;
  episode?: number;
  detectedType: "movie" | "series";
}

// Default community read-only TMDb discovery key
const DEFAULT_TMDB_KEY = "453829794cb30d39e66fcb0a3359d3e4";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

class MetadataScraperService {
  /**
   * Intelligently parses messy scene filenames into clean title and year/season information.
   * e.g. "Dune.Part.Two.2024.1080p.WEBRip.x264.mkv" -> { cleanTitle: "Dune Part Two", year: "2024", detectedType: "movie" }
   * e.g. "Breaking.Bad.S01E03.720p.HDTV.x264.mkv" -> { cleanTitle: "Breaking Bad", season: 1, episode: 3, detectedType: "series" }
   */
  public parseFilename(filename: string): ParsedFilenameInfo {
    let clean = filename.replace(/\.[a-zA-Z0-9]{2,4}$/, ""); // remove extension
    clean = clean.replace(/^\[[^\]]+\]\s*/, ""); // strip release groups [GroupName]

    // 1. Detect standard Season / Episode (e.g., S01E02, 1x02)
    const sPattern = /[._\s-]+[sS](\d{1,2})[._\s-]*[eE](\d{1,3})/i;
    const sMatch = clean.match(sPattern);
    if (sMatch) {
      const showRaw = clean.substring(0, sMatch.index).replace(/[._]/g, " ").trim();
      return {
        cleanTitle: this.stripCommonTags(showRaw),
        season: parseInt(sMatch[1], 10),
        episode: parseInt(sMatch[2], 10),
        detectedType: "series",
      };
    }

    // 2. Detect written Season / Episode (e.g., Season 1 Episode 2)
    const writtenPattern = /[._\s-]+season[._\s-]+(\d{1,2})[._\s-]+episode[._\s-]+(\d{1,3})/i;
    const wMatch = clean.match(writtenPattern);
    if (wMatch) {
      const showRaw = clean.substring(0, wMatch.index).replace(/[._]/g, " ").trim();
      return {
        cleanTitle: this.stripCommonTags(showRaw),
        season: parseInt(wMatch[1], 10),
        episode: parseInt(wMatch[2], 10),
        detectedType: "series",
      };
    }

    // 3. Detect 4-digit release year (e.g., Movie.Title.2024.1080p)
    const yearPattern = /[._\s-[(]((?:19|20)\d{2})[._\s-)\]]/;
    const yMatch = clean.match(yearPattern);
    let year: string | undefined;
    let titlePart = clean;

    if (yMatch && typeof yMatch.index === "number") {
      year = yMatch[1];
      titlePart = clean.substring(0, yMatch.index);
    }

    titlePart = titlePart.replace(/[._]/g, " ").trim();
    return {
      cleanTitle: this.stripCommonTags(titlePart),
      year,
      detectedType: "movie",
    };
  }

  private stripCommonTags(str: string): string {
    const cutPattern =
      /\b(2160p|1080p|720p|480p|4k|uhd|hdr|hdr10|dovi|dv|web-dl|webrip|bluray|bdrip|brrip|dvdrip|hdtv|hevc|x264|x265|h264|h265|10bit|8bit|aac|ac3|dts|truehd|atmos|flux|yify|yts|megusta|rarbg|eztv|repack|proper)\b.*$/i;
    let s = str.replace(cutPattern, "");
    s = s.replace(/\[[^\]]*\]/g, "");
    s = s.replace(/\([^)]*\)/g, "");
    s = s.replace(/^[-–—\s]+|[-–—\s]+$/g, "").trim();
    return s || str;
  }

  public async getApiKey(): Promise<string> {
    const custom = await storageService.getPreference<string>("tmdbApiKey");
    return custom?.trim() || DEFAULT_TMDB_KEY;
  }

  public async setApiKey(key: string): Promise<void> {
    await storageService.setPreference("tmdbApiKey", key.trim());
  }

  /**
   * Searches TMDb for movies or series matching the query.
   */
  public async searchMedia(
    query: string,
    type: "all" | "movie" | "series" = "all",
  ): Promise<ScrapedMediaResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const apiKey = await this.getApiKey();
    const endpoint =
      type === "movie"
        ? `${TMDB_BASE_URL}/search/movie`
        : type === "series"
        ? `${TMDB_BASE_URL}/search/tv`
        : `${TMDB_BASE_URL}/search/multi`;

    const url = new URL(endpoint);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", trimmed);
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("language", "en-US");

    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`TMDb request failed: ${res.status}`);
      }

      const data = await res.json();
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      interface TmdbRawItem {
        id: number;
        title?: string;
        name?: string;
        original_title?: string;
        original_name?: string;
        release_date?: string;
        first_air_date?: string;
        overview?: string;
        poster_path?: string;
        backdrop_path?: string;
        vote_average?: number;
        media_type?: string;
      }

      return data.results
        .filter((item: TmdbRawItem) => {
          if (type === "all" && item.media_type && item.media_type !== "movie" && item.media_type !== "tv") {
            return false;
          }
          return true;
        })
        .slice(0, 10)
        .map((item: TmdbRawItem) => {
          const isTv = item.media_type === "tv" || type === "series" || Boolean(item.first_air_date);
          const title = item.title || item.name || "Untitled";
          const rawDate = item.release_date || item.first_air_date;
          const year = rawDate ? rawDate.slice(0, 4) : undefined;

          return {
            id: item.id,
            title,
            originalTitle: item.original_title || item.original_name,
            year,
            releaseDate: rawDate,
            overview: item.overview || undefined,
            posterUrl: item.poster_path ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}` : undefined,
            backdropUrl: item.backdrop_path ? `${TMDB_IMAGE_BASE}/w1280${item.backdrop_path}` : undefined,
            rating: typeof item.vote_average === "number" ? Math.round(item.vote_average * 10) / 10 : undefined,
            mediaType: isTv ? "series" : "movie",
          };
        });
    } catch (err) {
      console.warn("[MetadataScraper] Search error:", err);
      return [];
    }
  }

  /**
   * Fetches all available posters (portrait) and backdrops (landscape landing images) for a title from TMDb.
   */
  public async fetchMediaImages(
    id: number,
    type: "movie" | "series",
  ): Promise<{ posters: string[]; backdrops: string[] }> {
    const apiKey = await this.getApiKey();
    const endpoint = `${TMDB_BASE_URL}/${type === "series" ? "tv" : "movie"}/${id}/images`;
    const url = new URL(endpoint);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("include_image_language", "en,null");

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch TMDb images");
      const data = await res.json();

      interface ImageEntry {
        file_path: string;
      }

      const posters: string[] = (data.posters || [])
        .slice(0, 12)
        .map((p: ImageEntry) => `${TMDB_IMAGE_BASE}/w500${p.file_path}`);

      const backdrops: string[] = (data.backdrops || [])
        .slice(0, 12)
        .map((b: ImageEntry) => `${TMDB_IMAGE_BASE}/w1280${b.file_path}`);

      return { posters, backdrops };
    } catch (err) {
      console.warn("[MetadataScraper] Fetch images error:", err);
      return { posters: [], backdrops: [] };
    }
  }

  /**
   * Fetches comprehensive TV series details from TMDb:
   * synopsis, tagline, rating, genres, networks, status, creators, and content rating.
   */
  public async fetchSeriesDetails(tmdbId: number): Promise<ScrapedSeriesDetails | null> {
    const apiKey = await this.getApiKey();
    const endpoint = `${TMDB_BASE_URL}/tv/${tmdbId}`;
    const url = new URL(endpoint);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("append_to_response", "content_ratings");
    url.searchParams.set("language", "en-US");

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`TMDb TV details request failed: ${res.status}`);
      const data = await res.json();

      interface GenreObj { id: number; name: string }
      interface NetworkObj { id: number; name: string }
      interface CreatorObj { id: number; name: string }
      interface ContentRatingEntry { iso_3166_1: string; rating: string }

      const genres = Array.isArray(data.genres)
        ? data.genres.map((g: GenreObj) => g.name).filter(Boolean)
        : [];
      const networks = Array.isArray(data.networks)
        ? data.networks.map((n: NetworkObj) => n.name).filter(Boolean)
        : [];
      const createdBy = Array.isArray(data.created_by)
        ? data.created_by.map((c: CreatorObj) => c.name).filter(Boolean)
        : [];

      let contentRating: string | undefined;
      if (data.content_ratings?.results && Array.isArray(data.content_ratings.results)) {
        const usRating = data.content_ratings.results.find(
          (r: ContentRatingEntry) => r.iso_3166_1 === "US",
        );
        contentRating = usRating?.rating || data.content_ratings.results[0]?.rating;
      }

      const year = data.first_air_date ? data.first_air_date.slice(0, 4) : undefined;

      return {
        id: data.id,
        title: data.name || data.original_name || "Untitled",
        originalTitle: data.original_name,
        year,
        overview: data.overview || undefined,
        tagline: data.tagline || undefined,
        rating: typeof data.vote_average === "number" ? Math.round(data.vote_average * 10) / 10 : undefined,
        voteCount: data.vote_count,
        genres,
        status: data.status,
        networks,
        firstAirDate: data.first_air_date,
        lastAirDate: data.last_air_date,
        createdBy,
        contentRating,
        posterUrl: data.poster_path ? `${TMDB_IMAGE_BASE}/w500${data.poster_path}` : undefined,
        backdropUrl: data.backdrop_path ? `${TMDB_IMAGE_BASE}/w1280${data.backdrop_path}` : undefined,
        numberOfSeasons: data.number_of_seasons,
        numberOfEpisodes: data.number_of_episodes,
      };
    } catch (err) {
      console.warn("[MetadataScraper] Fetch TV series details error:", err);
      return null;
    }
  }
}

export const metadataScraperService = new MetadataScraperService();

