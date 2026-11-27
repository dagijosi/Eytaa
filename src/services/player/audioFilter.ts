export const NIGHT_MODE_AUDIO_FILTER =
  "lavfi=[dynaudnorm=f=150:g=15:m=10.0:r=0.9:b=1]";

export const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export interface EqPreset {
  id: string;
  name: string;
  gains: number[]; // 10 bands, -12 to +12 dB
}

export const EQ_PRESETS: EqPreset[] = [
  { id: "flat", name: "Flat", gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: "cinema", name: "Cinema", gains: [4, 3, 1, 0, -1, 0, 1, 2, 3, 2] },
  { id: "voice", name: "Voice Clarity", gains: [-3, -2, 0, 2, 4, 4, 3, 1, -1, -2] },
  { id: "bass", name: "Bass Boost", gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  { id: "treble", name: "Crisp Treble", gains: [0, 0, 0, 0, 0, 1, 2, 4, 5, 5] },
];

export function buildEqualizerFilter(gains?: number[]): string | null {
  if (!gains || gains.length === 0) return null;
  const active = gains
    .slice(0, EQ_BANDS.length)
    .map((g, idx) => {
      const clamped = Math.max(-12, Math.min(12, Math.round(g)));
      if (clamped === 0) return null;
      return `equalizer=f=${EQ_BANDS[idx]}:t=q:w=1.4:g=${clamped}`;
    })
    .filter((x): x is string => x !== null);

  if (active.length === 0) return null;
  return `lavfi=[${active.join(",")}]`;
}

/**
 * Composes the active mpv `af` filter string so Night Mode dynamic range
 * compression, loudness normalization (`loudnorm`), custom profile filters,
 * and the 10-band Equalizer coexist without overwriting each other.
 */
export function composeAudioFilter(
  baseFilter: string,
  isNightListening: boolean,
  eqGains?: number[],
): string {
  const trimmed = baseFilter.trim();
  const parts = trimmed
    ? trimmed
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p && !p.includes("dynaudnorm") && !p.includes("equalizer=f="))
    : [];

  const eq = buildEqualizerFilter(eqGains);
  if (eq) {
    parts.push(eq);
  }

  if (isNightListening) {
    parts.push(NIGHT_MODE_AUDIO_FILTER);
  }

  return parts.join(",");
}
