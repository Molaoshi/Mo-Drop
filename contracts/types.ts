export * from "./errors";

// ---------- Structured job spec (New Job form) ----------

export type SpokenLanguage = "ar" | "en" | "zh" | "mixed";
export type SubLanguage = "ar" | "en" | "zh";
export type MusicChoice = "cinematic" | "upbeat" | "arabic" | "none";
export type EndCardChoice = "auto" | "en" | "zh" | "ar" | "none";

export type JobSpec = {
  preset: string; // presets.key
  spokenLanguage: SpokenLanguage;
  subtitles: SubLanguage[];
  music: MusicChoice;
  titleCard: { enabled: boolean; hook: string };
  aiBroll: { enabled: boolean; prompt: string };
  stockBroll: { enabled: boolean; keywords: string };
  titleBar: string;
  endCard: EndCardChoice;
};

// Form defaults — a future control center will make these editable.
export const DEFAULT_JOB_SPEC: JobSpec = {
  preset: "customer-update",
  spokenLanguage: "ar",
  subtitles: ["zh"],
  music: "cinematic",
  titleCard: { enabled: true, hook: "" },
  aiBroll: { enabled: false, prompt: "" },
  stockBroll: { enabled: false, keywords: "" },
  titleBar: "",
  endCard: "auto",
};

export const SPOKEN_LANGUAGE_LABELS: Record<SpokenLanguage, string> = {
  ar: "العربية",
  en: "English",
  zh: "中文",
  mixed: "Mixed",
};

export const MUSIC_LABELS: Record<MusicChoice, string> = {
  cinematic: "Cinematic corporate",
  upbeat: "Upbeat & energetic",
  arabic: "Arabic flavor",
  none: "No music",
};

export const END_CARD_LABELS: Record<EndCardChoice, string> = {
  auto: "Auto (video language)",
  en: "English",
  zh: "中文",
  ar: "العربية",
  none: "No end card",
};
