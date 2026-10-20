import { libraryService } from "../services/library/libraryService";

/**
 * Returns the poster value when it can be used directly as an image source.
 * Local file paths must be resolved through the thumbnail service instead.
 */
export function isDirectPosterUrl(poster?: string | null): string | null {
  const trimmed = poster?.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }
  return null;
}

export function pickPosterItem<T extends { custom_poster?: string }>(
  items: T[],
): T | undefined {
  return items.find((item) => Boolean(item.custom_poster?.trim()));
}

/**
 * Resolves a custom poster to a renderable source, falling back to the media
 * thumbnail when the custom poster is empty, local, or cannot be resolved.
 */
export async function resolvePoster(
  customPoster?: string | null,
  filePath?: string | null,
): Promise<string | null> {
  const trimmed = customPoster?.trim();

  if (trimmed) {
    const direct = isDirectPosterUrl(trimmed);
    if (direct) return direct;

    const thumb = await libraryService.getThumbnail(trimmed);
    if (thumb) return thumb;
  }

  if (filePath) {
    return libraryService.getThumbnail(filePath);
  }

  return null;
}
