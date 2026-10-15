export interface ProfileSettings {
  contrast: number; // -100 to 100
  brightness: number; // -100 to 100
  saturation: number; // -100 to 100
  gamma: number; // -100 to 100
  deinterlace: boolean;
  audioFilter: string; // e.g. "lavfi=[loudnorm]" or ""
  audioNormalize: boolean;
  audioDelay: number; // in ms
  subFontSize: number;
  subColor: string;
  subDelay: number; // in s
  playbackRate: number;
}

export interface PlaybackProfile {
  id: string;
  name: string;
  icon: "tv" | "layers" | "film" | "headphones" | "mic" | "sliders" | "sparkles";
  description: string;
  isBuiltIn?: boolean;
  settings: ProfileSettings;
}

export const DEFAULT_PROFILES: PlaybackProfile[] = [
  {
    id: "default",
    name: "Default (Balanced)",
    icon: "sliders",
    description: "Neutral color reproduction and original studio audio balance.",
    isBuiltIn: true,
    settings: {
      contrast: 0,
      brightness: 0,
      saturation: 0,
      gamma: 0,
      deinterlace: false,
      audioFilter: "",
      audioNormalize: false,
      audioDelay: 0,
      subFontSize: 55,
      subColor: "#FFFFFF",
      subDelay: 0,
      playbackRate: 1.0,
    },
  },
  {
    id: "anime",
    name: "Anime & Animation",
    icon: "tv",
    description: "Vibrant saturation, crisp contrast for lineart, and high-visibility subtitles.",
    isBuiltIn: true,
    settings: {
      contrast: 6,
      brightness: 1,
      saturation: 14,
      gamma: -2,
      deinterlace: false,
      audioFilter: "",
      audioNormalize: false,
      audioDelay: 0,
      subFontSize: 56,
      subColor: "#FFF176", // Soft anime yellow
      subDelay: 0,
      playbackRate: 1.0,
    },
  },
  {
    id: "movie",
    name: "Cinema & Movies",
    icon: "film",
    description: "Deep filmic contrast, shadow detail, and Night Mode loudnorm EQ for balanced audio.",
    isBuiltIn: true,
    settings: {
      contrast: 5,
      brightness: -2,
      saturation: 2,
      gamma: 1,
      deinterlace: false,
      audioFilter: "lavfi=[loudnorm=I=-16:TP=-1.5:LRA=7]",
      audioNormalize: true,
      audioDelay: 0,
      subFontSize: 50,
      subColor: "#EAEAEA",
      subDelay: 0,
      playbackRate: 1.0,
    },
  },
  {
    id: "music",
    name: "Music & Audio",
    icon: "headphones",
    description: "Dynamic audio normalization and loudness leveling for music tracks.",
    isBuiltIn: true,
    settings: {
      contrast: 0,
      brightness: 0,
      saturation: 0,
      gamma: 0,
      deinterlace: false,
      audioFilter: "lavfi=[loudnorm=I=-14:TP=-1.0:LRA=11]",
      audioNormalize: true,
      audioDelay: 0,
      subFontSize: 45,
      subColor: "#FFFFFF",
      subDelay: 0,
      playbackRate: 1.0,
    },
  },
  {
    id: "speech",
    name: "Podcasts & Lectures",
    icon: "mic",
    description: "Dialogue vocal clarity enhancer filter and 1.25x speed default.",
    isBuiltIn: true,
    settings: {
      contrast: 0,
      brightness: 0,
      saturation: 0,
      gamma: 0,
      deinterlace: false,
      audioFilter: "lavfi=[highpass=f=90,lowpass=f=4500,volume=2.0dB]",
      audioNormalize: true,
      audioDelay: 0,
      subFontSize: 55,
      subColor: "#FFFFFF",
      subDelay: 0,
      playbackRate: 1.25,
    },
  },
];
