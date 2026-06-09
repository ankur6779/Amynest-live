/**
 * Infant Poems Catalog — 10 sleep-focused bedtime poems (0–24 months).
 * Bundled MP3 paths exist for offline pack generation; playback uses TTS narration
 * of the full poem lines (Amy voice, server-cached by content hash).
 */

import { infantSleepAssetUrl } from "@/data/infant-sleep-catalog";

export type PoemAgeGroup = "0-6m" | "6-12m" | "12-24m";
export type PoemMood = "Sleep" | "Calm" | "Learning";

export type PoemIconName =
  | "Moon"
  | "Star"
  | "Cloud"
  | "Sparkles"
  | "Sun"
  | "Heart"
  | "Sprout"
  | "Bird"
  | "Flower2";

export interface InfantPoem {
  id: string;
  title: string;
  lines: string[];
  ageGroup: PoemAgeGroup;
  mood: PoemMood;
  icon: PoemIconName;
  gradient: string;
  tint: string;
  audioUrl?: string;
}

const POEMS_0_6M: InfantPoem[] = [
  {
    id: "poem-sleep-baby-sleep",
    title: "Sleep, Baby, Sleep",
    lines: [
      "Sleep baby sleep,",
      "Stars are shining deep,",
      "Moon is watching you,",
      "Dreams will come true.",
    ],
    ageGroup: "0-6m",
    mood: "Sleep",
    icon: "Moon",
    gradient: "from-violet-600 via-purple-700 to-indigo-950",
    tint: "hsl(var(--brand-violet-600))",
    audioUrl: infantSleepAssetUrl("packs/core-v1/poems/sleep-baby-sleep.mp3"),
  },
  {
    id: "poem-hush-little-cloud",
    title: "Hush, Little Cloud",
    lines: [
      "Hush little cloud, drift soft and slow,",
      "Cradle the moon in its silver glow,",
      "Whisper a story, soft as a sigh,",
      "Rock baby gently across the sky.",
    ],
    ageGroup: "0-6m",
    mood: "Sleep",
    icon: "Cloud",
    gradient: "from-slate-600 via-indigo-700 to-blue-950",
    tint: "hsl(var(--brand-indigo-600))",
    audioUrl: infantSleepAssetUrl("packs/core-v1/poems/hush-little-cloud.mp3"),
  },
  {
    id: "poem-moon-and-me",
    title: "The Moon and Me",
    lines: [
      "Moon up high, soft and bright,",
      "Watching baby through the night,",
      "Close your eyes, breathe so slow,",
      "Off to dreamland we will go.",
    ],
    ageGroup: "0-6m",
    mood: "Calm",
    icon: "Moon",
    gradient: "from-muted via-indigo-900 to-violet-950",
    tint: "hsl(var(--brand-indigo-800))",
    audioUrl: infantSleepAssetUrl("packs/core-v1/poems/moon-and-me.mp3"),
  },
  {
    id: "poem-tiny-star",
    title: "Tiny, Tiny Star",
    lines: [
      "Tiny tiny little star,",
      "Watching baby from afar,",
      "Soft and gentle, soft and slow,",
      "Sleepy sleepy off we go.",
    ],
    ageGroup: "0-6m",
    mood: "Sleep",
    icon: "Star",
    gradient: "from-fuchsia-700 via-purple-800 to-violet-950",
    tint: "hsl(var(--brand-purple-600))",
    audioUrl: infantSleepAssetUrl("packs/core-v1/poems/tiny-star.mp3"),
  },
];

const POEMS_6_12M: InfantPoem[] = [
  {
    id: "poem-pat-pat-pat",
    title: "Pat, Pat, Pat",
    lines: [
      "Pat pat pat, on baby's back,",
      "Gentle taps, a steady knack,",
      "Slow and soft and warm and near,",
      "Mama's love is always here.",
    ],
    ageGroup: "6-12m",
    mood: "Sleep",
    icon: "Heart",
    gradient: "from-rose-600 via-fuchsia-800 to-purple-950",
    tint: "hsl(var(--brand-rose-500))",
    audioUrl: infantSleepAssetUrl("packs/core-v1/poems/pat-pat-pat.mp3"),
  },
  {
    id: "poem-soft-bird-sleep",
    title: "Sleepy Little Bird",
    lines: [
      "Sleepy little bird in the tree,",
      "Resting now so quietly,",
      "Flap flap slow, then tuck in tight,",
      "Dream of stars throughout the night.",
    ],
    ageGroup: "6-12m",
    mood: "Sleep",
    icon: "Bird",
    gradient: "from-teal-700 via-cyan-800 to-indigo-950",
    tint: "hsl(var(--brand-cyan-500))",
    audioUrl: infantSleepAssetUrl("packs/core-v1/poems/soft-bird-sleep.mp3"),
  },
  {
    id: "poem-dream-boat",
    title: "Little Dream Boat",
    lines: [
      "Little dream boat, soft and slow,",
      "Rocking where the moonbeams go,",
      "Drift and drift on quiet sea,",
      "Sleep is waiting patiently.",
    ],
    ageGroup: "6-12m",
    mood: "Sleep",
    icon: "Cloud",
    gradient: "from-blue-700 via-indigo-800 to-violet-950",
    tint: "hsl(var(--brand-indigo-500))",
    audioUrl: infantSleepAssetUrl("packs/core-v1/poems/dream-boat.mp3"),
  },
  {
    id: "poem-cozy-nest",
    title: "Cozy Nest",
    lines: [
      "Cozy nest, so warm and deep,",
      "Time for baby now to sleep,",
      "Close your eyes, breathe in, breathe out,",
      "Safe and loved, without a doubt.",
    ],
    ageGroup: "6-12m",
    mood: "Sleep",
    icon: "Heart",
    gradient: "from-amber-600 via-orange-700 to-rose-950",
    tint: "hsl(var(--brand-amber-500))",
    audioUrl: infantSleepAssetUrl("packs/core-v1/poems/cozy-nest.mp3"),
  },
];

const POEMS_12_24M: InfantPoem[] = [
  {
    id: "poem-goodnight-everything",
    title: "Goodnight, Little Everything",
    lines: [
      "Goodnight to the moon up so high,",
      "Goodnight to the stars in the sky,",
      "Goodnight to the wind in the tree,",
      "Goodnight little dreamer — sleep peacefully.",
    ],
    ageGroup: "12-24m",
    mood: "Sleep",
    icon: "Moon",
    gradient: "from-indigo-700 via-blue-900 to-slate-950",
    tint: "hsl(var(--brand-indigo-500))",
    audioUrl: infantSleepAssetUrl("packs/core-v1/poems/goodnight-everything.mp3"),
  },
  {
    id: "poem-stars-count",
    title: "One Star, Two Stars",
    lines: [
      "One star, two stars, three stars slow,",
      "Four stars watching as you go,",
      "Five stars blink a soft goodnight,",
      "Sleep now baby, hold me tight.",
    ],
    ageGroup: "12-24m",
    mood: "Calm",
    icon: "Star",
    gradient: "from-blue-600 via-indigo-800 to-violet-950",
    tint: "hsl(var(--brand-blue-500))",
    audioUrl: infantSleepAssetUrl("packs/core-v1/poems/stars-count.mp3"),
  },
];

export const ALL_POEMS: readonly InfantPoem[] = Object.freeze([
  ...POEMS_0_6M,
  ...POEMS_6_12M,
  ...POEMS_12_24M,
]);

export interface PoemAgeGroupMeta {
  id: PoemAgeGroup;
  label: string;
  fromMonths: number;
  toMonths: number;
  blurb: string;
}

export const POEM_AGE_GROUPS: readonly PoemAgeGroupMeta[] = [
  { id: "0-6m", label: "0–6m", fromMonths: 0, toMonths: 6, blurb: "Ultra-calm sounds and very short verses" },
  { id: "6-12m", label: "6–12m", fromMonths: 6, toMonths: 12, blurb: "Rhythmic repetition for early language" },
  { id: "12-24m", label: "12–24m", fromMonths: 12, toMonths: 24, blurb: "Gentle counting and wind-down" },
];

export function getDefaultAgeGroup(months: number): PoemAgeGroup {
  for (const g of POEM_AGE_GROUPS) {
    if (months >= g.fromMonths && months < g.toMonths) return g.id;
  }
  return "12-24m";
}

export function getPoemsForGroup(group: PoemAgeGroup): InfantPoem[] {
  return ALL_POEMS.filter((p) => p.ageGroup === group);
}
