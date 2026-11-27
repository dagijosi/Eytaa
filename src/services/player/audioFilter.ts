export const NIGHT_MODE_AUDIO_FILTER =
  "lavfi=[dynaudnorm=f=150:g=15:m=10.0:r=0.9:b=1]";

/**
 * Composes the active mpv `af` filter string so Night Mode dynamic range
 * compression can coexist with loudness normalization (`loudnorm`) or
 * custom profile filters without overwriting them.
 */
export function composeAudioFilter(
  baseFilter: string,
  isNightListening: boolean,
): string {
  const trimmed = baseFilter.trim();
  const parts = trimmed
    ? trimmed
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p && !p.includes("dynaudnorm"))
    : [];

  if (isNightListening) {
    parts.push(NIGHT_MODE_AUDIO_FILTER);
  }

  return parts.join(",");
}
