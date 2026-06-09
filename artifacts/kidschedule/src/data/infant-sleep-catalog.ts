/**
 * Infant Sleep Library — offline-first catalog (white noise, lullabies, poems, stories).
 * English-only content; paths resolve under /infant-sleep-audio/.
 */

export type SleepAgeGroup = "0-6m" | "6-12m" | "12-24m";
export type SleepCategory = "white_noise" | "lullaby" | "poem" | "story";
export type SleepIconName =
  | "Wind"
  | "Heart"
  | "HeartPulse"
  | "Waves"
  | "Radio"
  | "Mountain"
  | "Fan"
  | "Thermometer"
  | "CloudRain"
  | "Cloud"
  | "Droplets"
  | "Music"
  | "Moon"
  | "Star"
  | "Sparkles"
  | "HeartIcon"
  | "Bird"
  | "Sprout"
  | "Flower2"
  | "Sun"
  | "BookOpen";

export type LoopRecommendation = "always" | "recommended" | "optional" | "single-play";
export type OfflineSuitability = "procedural" | "bundled" | "downloadable" | "streaming";

export interface SleepLibraryItem {
  id: string;
  title: string;
  category: SleepCategory;
  ageGroups: SleepAgeGroup[];
  primaryAgeGroup: SleepAgeGroup;
  icon: SleepIconName;
  durationSec: number | null;
  offlineSuitability: OfflineSuitability;
  calmingIntensity: 1 | 2 | 3 | 4;
  loopRecommendation: LoopRecommendation;
  packId: "core-v1" | "extended-v1" | "none";
  tags: string[];
  /** Bundled or downloadable MP3 path (relative to /infant-sleep-audio/). Lullabies use GCS streaming instead. */
  assetPath?: string;
  /** GCS-backed lullaby id for signed URL playback (Rhymes/ library). */
  gcsAudioId?: string;
  /** Procedural sound-engine id when offlineSuitability is procedural. */
  proceduralId?: string;
  /** Poem lines (poem category only). */
  lines?: string[];
  gradient?: string;
  tint?: string;
  mood?: "Sleep" | "Calm" | "Learning";
}

export const INFANT_SLEEP_AUDIO_PREFIX = "/infant-sleep-audio";

export function infantSleepAssetUrl(relativePath: string): string {
  const trimmed = relativePath.replace(/^\/+/, "");
  return `${INFANT_SLEEP_AUDIO_PREFIX}/${trimmed}`;
}

/** True when the URL points at a bundled /infant-sleep-audio/ MP3 (not API TTS). */
export function isBundledInfantSleepAudioUrl(url: string | undefined): boolean {
  const u = (url ?? "").trim();
  if (!u) return false;
  return u.includes(`${INFANT_SLEEP_AUDIO_PREFIX}/`);
}

export const SLEEP_AGE_GROUPS = [
  {
    id: "0-6m" as const,
    label: "0–6m",
    fromMonths: 0,
    toMonths: 6,
    blurb: "Ultra-calm sounds and very short verses",
  },
  {
    id: "6-12m" as const,
    label: "6–12m",
    fromMonths: 6,
    toMonths: 12,
    blurb: "Rhythmic repetition for early language",
  },
  {
    id: "12-24m" as const,
    label: "12–24m",
    fromMonths: 12,
    toMonths: 24,
    blurb: "Gentle stories and counting wind-down",
  },
] as const;

export const WHITE_NOISE_ITEMS: SleepLibraryItem[] = [
  {
    id: "wn-shush",
    title: "Gentle Shushing",
    category: "white_noise",
    ageGroups: ["0-6m", "6-12m"],
    primaryAgeGroup: "0-6m",
    icon: "Wind",
    durationSec: null,
    offlineSuitability: "procedural",
    proceduralId: "shush",
    calmingIntensity: 1,
    loopRecommendation: "always",
    packId: "none",
    tags: ["newborn", "night"],
  },
  {
    id: "wn-womb",
    title: "Womb Soundscape",
    category: "white_noise",
    ageGroups: ["0-6m"],
    primaryAgeGroup: "0-6m",
    icon: "Heart",
    durationSec: null,
    offlineSuitability: "procedural",
    proceduralId: "womb",
    calmingIntensity: 1,
    loopRecommendation: "always",
    packId: "none",
    tags: ["newborn", "night"],
  },
  {
    id: "wn-heartbeat",
    title: "Soft Heartbeat",
    category: "white_noise",
    ageGroups: ["0-6m"],
    primaryAgeGroup: "0-6m",
    icon: "HeartPulse",
    durationSec: null,
    offlineSuitability: "procedural",
    proceduralId: "heartbeat",
    calmingIntensity: 1,
    loopRecommendation: "always",
    packId: "none",
    tags: ["newborn"],
  },
  {
    id: "wn-pink",
    title: "Pink Noise",
    category: "white_noise",
    ageGroups: ["0-6m", "6-12m", "12-24m"],
    primaryAgeGroup: "6-12m",
    icon: "Waves",
    durationSec: null,
    offlineSuitability: "procedural",
    proceduralId: "pink",
    calmingIntensity: 2,
    loopRecommendation: "always",
    packId: "none",
    tags: ["nap", "night"],
  },
  {
    id: "wn-white",
    title: "Classic White Noise",
    category: "white_noise",
    ageGroups: ["0-6m", "6-12m"],
    primaryAgeGroup: "0-6m",
    icon: "Radio",
    durationSec: null,
    offlineSuitability: "procedural",
    proceduralId: "white",
    calmingIntensity: 3,
    loopRecommendation: "always",
    packId: "none",
    tags: ["masking"],
  },
  {
    id: "wn-brown",
    title: "Deep Brown Noise",
    category: "white_noise",
    ageGroups: ["6-12m", "12-24m"],
    primaryAgeGroup: "6-12m",
    icon: "Mountain",
    durationSec: null,
    offlineSuitability: "procedural",
    proceduralId: "brown",
    calmingIntensity: 2,
    loopRecommendation: "always",
    packId: "none",
    tags: ["nap"],
  },
  {
    id: "wn-fan",
    title: "Ceiling Fan",
    category: "white_noise",
    ageGroups: ["0-6m", "6-12m", "12-24m"],
    primaryAgeGroup: "0-6m",
    icon: "Fan",
    durationSec: null,
    offlineSuitability: "procedural",
    proceduralId: "fan",
    calmingIntensity: 2,
    loopRecommendation: "always",
    packId: "none",
    tags: ["summer", "nap"],
  },
  {
    id: "wn-hvac",
    title: "Soft HVAC Hum",
    category: "white_noise",
    ageGroups: ["0-6m", "6-12m", "12-24m"],
    primaryAgeGroup: "6-12m",
    icon: "Thermometer",
    durationSec: null,
    offlineSuitability: "procedural",
    proceduralId: "hvac",
    calmingIntensity: 3,
    loopRecommendation: "always",
    packId: "none",
    tags: ["masking"],
  },
  {
    id: "wn-rain",
    title: "Soft Rain",
    category: "white_noise",
    ageGroups: ["0-6m", "6-12m", "12-24m"],
    primaryAgeGroup: "0-6m",
    icon: "CloudRain",
    durationSec: null,
    offlineSuitability: "procedural",
    proceduralId: "rain",
    calmingIntensity: 2,
    loopRecommendation: "always",
    packId: "none",
    tags: ["nap", "night"],
  },
  {
    id: "wn-ocean-gentle",
    title: "Gentle Ocean",
    category: "white_noise",
    ageGroups: ["6-12m", "12-24m"],
    primaryAgeGroup: "6-12m",
    icon: "Waves",
    durationSec: 90,
    offlineSuitability: "bundled",
    assetPath: "packs/core-v1/white-noise/ocean-gentle-loop.mp3",
    calmingIntensity: 2,
    loopRecommendation: "always",
    packId: "core-v1",
    tags: ["night"],
  },
  {
    id: "wn-stream",
    title: "Quiet Stream",
    category: "white_noise",
    ageGroups: ["6-12m", "12-24m"],
    primaryAgeGroup: "6-12m",
    icon: "Droplets",
    durationSec: 90,
    offlineSuitability: "bundled",
    assetPath: "packs/core-v1/white-noise/stream-loop.mp3",
    calmingIntensity: 2,
    loopRecommendation: "always",
    packId: "core-v1",
    tags: ["nap"],
  },
  {
    id: "wn-window-rain",
    title: "Rain on Window",
    category: "white_noise",
    ageGroups: ["0-6m", "6-12m", "12-24m"],
    primaryAgeGroup: "0-6m",
    icon: "Cloud",
    durationSec: 90,
    offlineSuitability: "bundled",
    assetPath: "packs/core-v1/white-noise/window-rain-loop.mp3",
    calmingIntensity: 2,
    loopRecommendation: "always",
    packId: "core-v1",
    tags: ["night"],
  },
];

import { LULLABY_ITEMS, LULLABY_LEGACY_ID_ALIASES } from "./infant-lullaby-gcs-catalog";

export const STORY_ITEMS: SleepLibraryItem[] = [
  { id: "story-moon-blanket", title: "The Moon's Soft Blanket", category: "story", ageGroups: ["6-12m", "12-24m"], primaryAgeGroup: "6-12m", icon: "Moon", durationSec: 180, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/stories/moon-blanket.mp3", calmingIntensity: 1, loopRecommendation: "single-play", packId: "extended-v1", tags: ["bedtime"] },
  { id: "story-cloud-pillow", title: "Cloud Pillow", category: "story", ageGroups: ["6-12m", "12-24m"], primaryAgeGroup: "6-12m", icon: "Cloud", durationSec: 165, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/stories/cloud-pillow.mp3", calmingIntensity: 1, loopRecommendation: "single-play", packId: "extended-v1", tags: ["bedtime"] },
  { id: "story-star-friend", title: "Your Star Friend", category: "story", ageGroups: ["12-24m"], primaryAgeGroup: "12-24m", icon: "Star", durationSec: 195, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/stories/star-friend.mp3", calmingIntensity: 2, loopRecommendation: "single-play", packId: "extended-v1", tags: ["bedtime"] },
  { id: "story-garden-sleep", title: "The Sleepy Garden", category: "story", ageGroups: ["12-24m"], primaryAgeGroup: "12-24m", icon: "Sprout", durationSec: 210, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/stories/garden-sleep.mp3", calmingIntensity: 2, loopRecommendation: "single-play", packId: "extended-v1", tags: ["bedtime"] },
  { id: "story-boat-dreams", title: "Boat of Quiet Dreams", category: "story", ageGroups: ["6-12m", "12-24m"], primaryAgeGroup: "6-12m", icon: "Waves", durationSec: 170, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/stories/boat-dreams.mp3", calmingIntensity: 1, loopRecommendation: "single-play", packId: "extended-v1", tags: ["bedtime"] },
];

export const ALL_SLEEP_ITEMS: SleepLibraryItem[] = [
  ...WHITE_NOISE_ITEMS,
  ...LULLABY_ITEMS,
  ...STORY_ITEMS,
];

export const SLEEP_PACKS = {
  "core-v1": {
    id: "core-v1",
    label: "Core Sleep Pack",
    description: "Essential poems and ambient loops — lullabies stream from cloud.",
    estimatedMb: 12,
    bundled: true,
  },
  "extended-v1": {
    id: "extended-v1",
    label: "Extended Sleep Pack",
    description: "Gentle sleep stories — download for offline use.",
    estimatedMb: 8,
    bundled: false,
  },
} as const;

export type SleepPackId = keyof typeof SLEEP_PACKS;

export function getDefaultSleepAgeGroup(months: number): SleepAgeGroup {
  for (const g of SLEEP_AGE_GROUPS) {
    if (months >= g.fromMonths && months < g.toMonths) return g.id;
  }
  return "12-24m";
}

export function getItemsForCategory(category: SleepCategory): SleepLibraryItem[] {
  return ALL_SLEEP_ITEMS.filter((i) => i.category === category);
}

export function getItemsForAgeAndCategory(
  category: SleepCategory,
  ageGroup: SleepAgeGroup,
): SleepLibraryItem[] {
  return getItemsForCategory(category).filter((i) => i.ageGroups.includes(ageGroup));
}

export function getSleepItemById(id: string): SleepLibraryItem | undefined {
  const aliased = LULLABY_LEGACY_ID_ALIASES[id] ?? id;
  return ALL_SLEEP_ITEMS.find((i) => i.id === aliased);
}

export function resolveSleepItemAudioUrl(item: SleepLibraryItem): string | undefined {
  if (item.category === "lullaby" && item.gcsAudioId) return undefined;
  if (!item.assetPath) return undefined;
  return infantSleepAssetUrl(item.assetPath);
}

export function getDefaultFeaturedIds(ageGroup: SleepAgeGroup): string[] {
  const map: Record<SleepAgeGroup, string[]> = {
    "0-6m": ["wn-womb", "twinkle-twinkle-little-star", "poem-sleep-baby-sleep"],
    "6-12m": ["wn-pink", "brahms-lullaby", "poem-pat-pat-pat"],
    "12-24m": ["wn-window-rain", "a-star-s-lullaby", "poem-goodnight-everything"],
  };
  return map[ageGroup];
}

export function getHeroWhiteNoiseId(ageGroup: SleepAgeGroup, hour: number): string {
  if (hour >= 22 || hour < 6) return "wn-window-rain";
  if (ageGroup === "0-6m") return "wn-womb";
  if (ageGroup === "6-12m") return "wn-pink";
  return "wn-brown";
}
