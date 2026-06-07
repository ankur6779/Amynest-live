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
export type OfflineSuitability = "procedural" | "bundled" | "downloadable";

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
  /** Bundled or downloadable MP3 path (relative to /infant-sleep-audio/). */
  assetPath?: string;
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

/** Core lullabies shipped in the app bundle (P0). */
export const LULLABY_CORE_ITEMS: SleepLibraryItem[] = [
  { id: "lul-twinkle", title: "Twinkle, Twinkle Little Star", category: "lullaby", ageGroups: ["0-6m", "6-12m", "12-24m"], primaryAgeGroup: "0-6m", icon: "Star", durationSec: 62, offlineSuitability: "bundled", assetPath: "packs/core-v1/lullabies/twinkle.mp3", calmingIntensity: 2, loopRecommendation: "optional", packId: "core-v1", tags: ["classic"] },
  { id: "lul-brahms", title: "Brahms' Lullaby", category: "lullaby", ageGroups: ["0-6m", "6-12m", "12-24m"], primaryAgeGroup: "0-6m", icon: "Moon", durationSec: 78, offlineSuitability: "bundled", assetPath: "packs/core-v1/lullabies/brahms.mp3", calmingIntensity: 1, loopRecommendation: "optional", packId: "core-v1", tags: ["classic"] },
  { id: "lul-rock-a-bye", title: "Rock-a-Bye Baby", category: "lullaby", ageGroups: ["0-6m", "6-12m"], primaryAgeGroup: "0-6m", icon: "Moon", durationSec: 58, offlineSuitability: "bundled", assetPath: "packs/core-v1/lullabies/rock-a-bye.mp3", calmingIntensity: 2, loopRecommendation: "optional", packId: "core-v1", tags: ["classic"] },
  { id: "lul-hush-baby", title: "Hush, Little Baby", category: "lullaby", ageGroups: ["0-6m", "6-12m"], primaryAgeGroup: "0-6m", icon: "HeartIcon", durationSec: 72, offlineSuitability: "bundled", assetPath: "packs/core-v1/lullabies/hush-baby.mp3", calmingIntensity: 1, loopRecommendation: "optional", packId: "core-v1", tags: ["classic"] },
  { id: "lul-sleep-little-one", title: "Sleep Little One", category: "lullaby", ageGroups: ["0-6m"], primaryAgeGroup: "0-6m", icon: "Sparkles", durationSec: 54, offlineSuitability: "bundled", assetPath: "packs/core-v1/lullabies/sleep-little-one.mp3", calmingIntensity: 1, loopRecommendation: "recommended", packId: "core-v1", tags: ["original"] },
  { id: "lul-sleep-baby-sleep", title: "Sleep, Baby, Sleep", category: "lullaby", ageGroups: ["0-6m"], primaryAgeGroup: "0-6m", icon: "Moon", durationSec: 48, offlineSuitability: "bundled", assetPath: "packs/core-v1/lullabies/sleep-baby-sleep.mp3", calmingIntensity: 1, loopRecommendation: "recommended", packId: "core-v1", tags: ["classic"] },
  { id: "lul-hum-dee-dum", title: "Hum Dee Dum", category: "lullaby", ageGroups: ["0-6m"], primaryAgeGroup: "0-6m", icon: "Music", durationSec: 60, offlineSuitability: "bundled", assetPath: "packs/core-v1/lullabies/hum-dee-dum.mp3", calmingIntensity: 1, loopRecommendation: "always", packId: "core-v1", tags: ["instrumental"] },
  { id: "lul-cradle-song", title: "Cradle Song", category: "lullaby", ageGroups: ["0-6m", "6-12m"], primaryAgeGroup: "0-6m", icon: "HeartIcon", durationSec: 65, offlineSuitability: "bundled", assetPath: "packs/core-v1/lullabies/cradle-song.mp3", calmingIntensity: 1, loopRecommendation: "recommended", packId: "core-v1", tags: ["original"] },
];

/** Extended lullabies — OTA pack (P2). */
export const LULLABY_EXTENDED_ITEMS: SleepLibraryItem[] = [
  { id: "lul-all-through-night", title: "All Through the Night", category: "lullaby", ageGroups: ["0-6m", "6-12m", "12-24m"], primaryAgeGroup: "0-6m", icon: "Moon", durationSec: 85, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/lullabies/all-through-night.mp3", calmingIntensity: 1, loopRecommendation: "optional", packId: "extended-v1", tags: ["classic"] },
  { id: "lul-golden-slumbers", title: "Golden Slumbers", category: "lullaby", ageGroups: ["0-6m", "6-12m", "12-24m"], primaryAgeGroup: "6-12m", icon: "Star", durationSec: 70, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/lullabies/golden-slumbers.mp3", calmingIntensity: 1, loopRecommendation: "optional", packId: "extended-v1", tags: ["classic"] },
  { id: "lul-lavenders-blue", title: "Lavender's Blue", category: "lullaby", ageGroups: ["6-12m", "12-24m"], primaryAgeGroup: "6-12m", icon: "Sparkles", durationSec: 68, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/lullabies/lavenders-blue.mp3", calmingIntensity: 2, loopRecommendation: "optional", packId: "extended-v1", tags: ["classic"] },
  { id: "lul-bye-bunting", title: "Bye, Baby Bunting", category: "lullaby", ageGroups: ["6-12m", "12-24m"], primaryAgeGroup: "6-12m", icon: "Bird", durationSec: 55, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/lullabies/bye-bunting.mp3", calmingIntensity: 2, loopRecommendation: "optional", packId: "extended-v1", tags: ["classic"] },
  { id: "lul-skye-boat", title: "Skye Boat Song", category: "lullaby", ageGroups: ["6-12m", "12-24m"], primaryAgeGroup: "6-12m", icon: "Cloud", durationSec: 80, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/lullabies/skye-boat.mp3", calmingIntensity: 2, loopRecommendation: "optional", packId: "extended-v1", tags: ["classic"] },
  { id: "lul-stars-above", title: "Stars Above You", category: "lullaby", ageGroups: ["6-12m", "12-24m"], primaryAgeGroup: "6-12m", icon: "Star", durationSec: 70, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/lullabies/stars-above.mp3", calmingIntensity: 2, loopRecommendation: "optional", packId: "extended-v1", tags: ["original"] },
  { id: "lul-dreamy-hum", title: "Dreamy Hum", category: "lullaby", ageGroups: ["0-6m", "6-12m", "12-24m"], primaryAgeGroup: "0-6m", icon: "Sparkles", durationSec: 90, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/lullabies/dreamy-hum.mp3", calmingIntensity: 1, loopRecommendation: "always", packId: "extended-v1", tags: ["instrumental"] },
  { id: "lul-cradle-moon", title: "Cradle and Moon", category: "lullaby", ageGroups: ["12-24m"], primaryAgeGroup: "12-24m", icon: "Moon", durationSec: 72, offlineSuitability: "downloadable", assetPath: "packs/extended-v1/lullabies/cradle-moon.mp3", calmingIntensity: 1, loopRecommendation: "optional", packId: "extended-v1", tags: ["original"] },
];

export const LULLABY_ITEMS: SleepLibraryItem[] = [...LULLABY_CORE_ITEMS, ...LULLABY_EXTENDED_ITEMS];

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
    description: "Essential lullabies, poems, and ambient loops — included with the app.",
    estimatedMb: 12,
    bundled: true,
  },
  "extended-v1": {
    id: "extended-v1",
    label: "Extended Sleep Pack",
    description: "More lullabies and gentle sleep stories — download for offline use.",
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
  return ALL_SLEEP_ITEMS.find((i) => i.id === id);
}

export function resolveSleepItemAudioUrl(item: SleepLibraryItem): string | undefined {
  if (!item.assetPath) return undefined;
  return infantSleepAssetUrl(item.assetPath);
}

export function getDefaultFeaturedIds(ageGroup: SleepAgeGroup): string[] {
  const map: Record<SleepAgeGroup, string[]> = {
    "0-6m": ["wn-womb", "lul-sleep-baby-sleep", "poem-sleep-baby-sleep"],
    "6-12m": ["wn-pink", "lul-cradle-song", "poem-pat-pat-pat"],
    "12-24m": ["wn-window-rain", "lul-golden-slumbers", "poem-goodnight-everything"],
  };
  return map[ageGroup];
}

export function getHeroWhiteNoiseId(ageGroup: SleepAgeGroup, hour: number): string {
  if (hour >= 22 || hour < 6) return "wn-window-rain";
  if (ageGroup === "0-6m") return "wn-womb";
  if (ageGroup === "6-12m") return "wn-pink";
  return "wn-brown";
}
