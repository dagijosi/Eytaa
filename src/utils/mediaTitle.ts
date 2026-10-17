export interface ParsedMediaTitle {
  displayTitle: string;
  type: "series" | "movie" | "music" | "other";
  seriesName?: string;
  seasonEpisode?: string;
  episodeTitle?: string;
  year?: string;
}

/**
 * Normalizes series names for grouping (strips "The ", years like 2024, punctuation, and season tags)
 */
export function normalizeSeriesKey(name?: string | null): string {
  if (!name) return "";
  let s = name.toLowerCase().trim();
  if (s.startsWith("the ")) s = s.slice(4).trim();
  if (s.startsWith("a ")) s = s.slice(2).trim();
  if (s.startsWith("an ")) s = s.slice(3).trim();
  // eslint-disable-next-line no-useless-escape
  s = s.replace(/[\(\[]?(19\d\d|20\d\d)[\)\]]?/g, "").trim();
  s = s.replace(/\b(season|series)\s*\d+\b/gi, "").trim();
  s = s.replace(/[._\-:,]/g, " ").replace(/\s+/g, " ").trim();
  return s || (name || "").toLowerCase().trim();
}

/**
 * Strips release scene noise, hashes, encoders, and formats TV/movie/music titles cleanly.
 */
export function formatMediaTitle(rawTitle?: string | null, filePath?: string | null): string {
  if (!rawTitle && !filePath) return "No Media";

  // Use filename from path if rawTitle is empty, a generic tag, or suspicious
  let baseName = rawTitle || "";
  const fileFromPath = filePath ? filePath.split(/[/\\]/).pop() || "" : "";

  // If title is missing or is just a common release/container tag
  const suspiciousTags = /^(yts|rarbg|tgx|subsplease|unknown|track\s*\d+|title\s*\d+|video\s*\d+|untitled)$/i;
  if (!baseName || suspiciousTags.test(baseName.trim()) || baseName.length < 3) {
    baseName = fileFromPath;
  }

  // Remove common media extensions
  baseName = baseName.replace(
    /\.(mp4|mkv|webm|avi|mov|ts|m2ts|flv|wmv|mp3|flac|wav|m4a|aac|ogg|opus)$/i,
    "",
  );

  // Check for Music file extension in path
  const isMusicFile = filePath && /\.(mp3|flac|wav|m4a|aac|ogg|opus)$/i.test(filePath);
  if (isMusicFile) {
    // Strip leading track numbers like "01. ", "01 - ", "1-01 "
    // eslint-disable-next-line no-useless-escape
    let musicTitle = baseName.replace(/^(\d{1,2}[.\s\-]+)+/, "").trim();
    // Replace underscores with space
    musicTitle = musicTitle.replace(/_/g, " ");
    return musicTitle || baseName;
  }

  // Strip leading release group in brackets e.g. "[SubsPlease] ", "[Erai-raws] "
  const cleaned = baseName.replace(/^\[[^\]]+\]\s*/, "");




  // 1. Check for standard TV Show pattern: "Show.Name.S01E02.Episode.Title..." or "Show Name S01E02..."
  const tvPattern = /(.*?)[.\s_]+[sS](\d{1,2})[.\s_-]*[eE](\d{1,3})(?:[.\s_-]+(.*))?$/;
  const tvMatch = cleaned.match(tvPattern);

  if (tvMatch) {
    const rawShow = tvMatch[1];
    const season = tvMatch[2].padStart(2, "0");
    const episode = tvMatch[3].padStart(2, "0");
    const rawEpTitle = tvMatch[4] || "";

    const showName = cleanShowOrMovieName(rawShow);
    const epBadge = `S${season}E${episode}`;

    // Clean episode title by stripping trailing codecs/groups
    const epTitle = cleanEpisodeTitle(rawEpTitle);

    if (epTitle) {
      return `${showName} • ${epBadge} - ${epTitle}`;
    }
    return `${showName} • ${epBadge}`;
  }

  // 1b. Check for written Season and Episode: "Show Name Season 1 Episode 2" or "Show Name season 1, episode 2"
  const writtenTvPattern = /(.*?)[.\s_,-]+(?:season|series)[.\s_,-]*(\d{1,2})[.\s_,-]+(?:episode|ep)[.\s_,-]*(\d{1,3})(?:[.\s_,-]+(.*))?$/i;
  const writtenTvMatch = cleaned.match(writtenTvPattern);
  if (writtenTvMatch) {
    const rawShow = writtenTvMatch[1];
    const season = writtenTvMatch[2].padStart(2, "0");
    const episode = writtenTvMatch[3].padStart(2, "0");
    const rawEpTitle = writtenTvMatch[4] || "";

    const showName = cleanShowOrMovieName(rawShow);
    const epBadge = `S${season}E${episode}`;
    const epTitle = cleanEpisodeTitle(rawEpTitle);

    if (epTitle) {
      return `${showName} • ${epBadge} - ${epTitle}`;
    }
    return `${showName} • ${epBadge}`;
  }

  // 2. Check for alternate TV Show pattern: "Show.Name.1x02..."
  const altTvPattern = /(.*?)[.\s_]+(\d{1,2})x(\d{1,3})(?:[.\s_-]+(.*))?$/;
  const altTvMatch = cleaned.match(altTvPattern);
  if (altTvMatch) {
    const rawShow = altTvMatch[1];
    const season = altTvMatch[2].padStart(2, "0");
    const episode = altTvMatch[3].padStart(2, "0");
    const rawEpTitle = altTvMatch[4] || "";

    const showName = cleanShowOrMovieName(rawShow);
    const epBadge = `S${season}E${episode}`;
    const epTitle = cleanEpisodeTitle(rawEpTitle);

    if (epTitle) {
      return `${showName} • ${epBadge} - ${epTitle}`;
    }
    return `${showName} • ${epBadge}`;
  }

  // 3. Check for Anime episode pattern: "Show Name - 01 (1080p)..."
  const animePattern = /(.*?)[.\s_]+-[.\s_]+(\d{1,4})(?:[.\s_]+(.*))?$/;
  const animeMatch = cleaned.match(animePattern);
  if (animeMatch) {
    const rawShow = animeMatch[1];
    const episode = animeMatch[2].padStart(2, "0");
    const showName = cleanShowOrMovieName(rawShow);
    return `${showName} • Ep ${episode}`;
  }

  // 4. Check for Movie with Year: "Movie.Name.2023.1080p..." or "Movie Name (2023)..."
  // eslint-disable-next-line no-useless-escape
  const movieYearPattern = /(.*?)[.\s_]+(?:[\(\[])?((?:19|20)\d{2})(?:[\)\]])?(?:[.\s_]+(.*))?$/;
  const movieMatch = cleaned.match(movieYearPattern);
  if (movieMatch) {
    const rawMovie = movieMatch[1];
    const year = movieMatch[2];
    const movieName = cleanShowOrMovieName(rawMovie);
    return `${movieName} (${year})`;
  }

  // 5. Fallback clean: Remove dots, underscores, brackets, and common quality tags
  return cleanGeneralTitle(cleaned);
}

function cleanShowOrMovieName(str: string): string {
  let s = str
    .replace(/[._]/g, " ")
    .replace(/\[[^\]]*\]/g, "")
    // eslint-disable-next-line no-useless-escape
    .replace(/\([^\)]*\)/g, "")
    .trim();

  // Strip 4-digit release year if attached to show name e.g. "The Godfather 2024" -> "The Godfather"
  s = s.replace(/\b(19\d\d|20\d\d)\b/g, "").trim();

  // Strip leftover season keywords e.g. "Season 1" or "S1"
  s = s.replace(/\b(season|series)\s*\d+\b/gi, "").trim();

  // Remove leading/trailing dashes or symbols
  s = s.replace(/^[-–—,\s]+|[-–—,\s]+$/g, "");
  return s;
}

function cleanEpisodeTitle(str: string): string {
  if (!str) return "";

  // Cut off at first known release tag
  const cutPattern =
    /\b(2160p|1080p|720p|480p|4k|uhd|hdr|hdr10|dovi|dv|web-dl|webrip|bluray|bdrip|brrip|dvdrip|hdtv|hevc|x264|x265|h264|h265|10bit|8bit|aac|ac3|dts|truehd|atmos|flux|yify|yts|megusta|rarbg|eztv|repack|proper)\b.*$/i;

  let s = str.replace(cutPattern, "");
  s = s.replace(/\[[^\]]*\]/g, "");
  s = s.replace(/\([^)]*\)/g, "");
  s = s.replace(/[._]/g, " ").trim();
  s = s.replace(/^[-–—\s]+|[-–—\s]+$/g, "");

  return s;
}

function cleanGeneralTitle(str: string): string {
  const cutPattern =
    /\b(2160p|1080p|720p|480p|4k|uhd|hdr|hdr10|dovi|dv|web-dl|webrip|bluray|bdrip|brrip|dvdrip|hdtv|hevc|x264|x265|h264|h265|10bit|8bit|aac|ac3|dts|truehd|atmos|flux|yify|yts|megusta|rarbg|eztv|repack|proper)\b.*$/i;

  let s = str.replace(cutPattern, "");
  s = s.replace(/\[[^\]]*\]/g, "");
  s = s.replace(/[._]/g, " ").trim();
  s = s.replace(/^[-–—\s]+|[-–—\s]+$/g, "");

  return s || str;
}
