/**
 * Infant Poems Catalog
 *
 * Age-segmented calming poems for the 0–24 month "Poems for your baby"
 * module. The sample poems for the three age groups (Sleep baby sleep /
 * Clap clap little hands / One little star) come straight from the spec;
 * the rest follow the same shape (4–6 short lines, gentle rhyme,
 * soothing imagery).
 *
 * Audio: each poem is read aloud by ElevenLabs via the shared
 * `/api/tts/synthesize` endpoint (see `useInfantPoemPlayer`). The server
 * caches each MP3 by content hash so each poem is generated ONCE
 * GLOBALLY by ElevenLabs, then served from cache to every user. To
 * override with a hand-recorded MP3, set the optional `audioUrl` field
 * on a poem and the player will use it directly, skipping synthesis.
 */

export type PoemAgeGroup = "0-6m" | "6-12m" | "12-24m";

/** Hint shown under the title — keeps the tile readable at a glance. */
export type PoemMood = "Sleep" | "Calm" | "Learning";

/** Lucide icon name — kept as a string so the data file stays render-free. */
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
  /** 4–6 short lines, soft + repetitive. Joined with newlines for display. */
  lines: string[];
  ageGroup: PoemAgeGroup;
  mood: PoemMood;
  /** Lucide icon name — resolved to a component in the UI layer. */
  icon: PoemIconName;
  /** Tailwind gradient classes for the tile background. */
  gradient: string;
  /** Hex tint used in inline styles (orb glow, fullscreen backdrop). */
  tint: string;
  /**
   * Optional pre-recorded MP3 URL. When present the player uses it instead
   * of browser speech synthesis. Spec keeps this open for a future "ship
   * MP3 files via CDN" milestone — today every poem falls through to TTS.
   */
  audioUrl?: string;
}

// ─── 0–6 months: ultra calm + very short ───────────────────────────────────
const POEMS_0_6M: InfantPoem[] = [
  {
    id: "sleep-baby-sleep",
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
    gradient: "from-indigo-600 via-violet-600 to-purple-700",
    tint: "#7c3aed",
  },
  {
    id: "hush-little-cloud",
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
    gradient: "from-slate-600 via-indigo-600 to-blue-700",
    tint: "#4f46e5",
  },
  {
    id: "moon-and-me",
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
    gradient: "from-blue-700 via-indigo-700 to-slate-800",
    tint: "#3730a3",
  },
  {
    id: "tiny-tiny-star",
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
    gradient: "from-violet-700 via-purple-700 to-fuchsia-700",
    tint: "#9333ea",
  },
];

// ─── 6–12 months: rhythmic repetition ───────────────────────────────────────
const POEMS_6_12M: InfantPoem[] = [
  {
    id: "clap-clap-little-hands",
    title: "Clap, Clap, Little Hands",
    lines: [
      "Clap clap little hands,",
      "Smile as the music stands,",
      "Tap tap tiny feet,",
      "Life is soft and sweet.",
    ],
    ageGroup: "6-12m",
    mood: "Calm",
    icon: "Sparkles",
    gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
    tint: "#ec4899",
  },
  {
    id: "round-and-round",
    title: "Round and Round",
    lines: [
      "Round and round the gentle moon,",
      "Baby hums a happy tune,",
      "Up and down the soft hill goes,",
      "Wiggle wiggle little toes.",
    ],
    ageGroup: "6-12m",
    mood: "Calm",
    icon: "Sun",
    gradient: "from-amber-400 via-orange-400 to-rose-400",
    tint: "#fb923c",
  },
  {
    id: "soft-little-bird",
    title: "Soft Little Bird",
    lines: [
      "Soft little bird in the tree,",
      "Singing sweetly just for me,",
      "Flap flap, hop hop, tweet tweet tweet,",
      "Music makes the day complete.",
    ],
    ageGroup: "6-12m",
    mood: "Learning",
    icon: "Bird",
    gradient: "from-sky-400 via-cyan-400 to-teal-400",
    tint: "#22d3ee",
  },
  {
    id: "pat-pat-pat",
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
    gradient: "from-pink-500 via-rose-500 to-red-500",
    tint: "#f43f5e",
  },
  {
    id: "humming-bumblebee",
    title: "Humming Bumblebee",
    lines: [
      "Buzz buzz humming bumblebee,",
      "Flying past the apple tree,",
      "Round the flower, round the leaf,",
      "Resting now beneath the reef.",
    ],
    ageGroup: "6-12m",
    mood: "Learning",
    icon: "Flower2",
    gradient: "from-yellow-400 via-amber-400 to-orange-500",
    tint: "#f59e0b",
  },
];

// ─── 12–24 months: simple learning poems ────────────────────────────────────
const POEMS_12_24M: InfantPoem[] = [
  {
    id: "one-little-star",
    title: "One Little Star",
    lines: [
      "One little star in the sky,",
      "Two birds flying high,",
      "Three clouds drifting slow,",
      "Four winds softly blow.",
    ],
    ageGroup: "12-24m",
    mood: "Learning",
    icon: "Star",
    gradient: "from-indigo-500 via-blue-500 to-cyan-500",
    tint: "#3b82f6",
  },
  {
    id: "colours-of-the-day",
    title: "Colours of the Day",
    lines: [
      "Red is the apple, round and sweet,",
      "Yellow is the sun on baby's feet,",
      "Green is the grass beneath the tree,",
      "Blue is the sky that hugs you and me.",
    ],
    ageGroup: "12-24m",
    mood: "Learning",
    icon: "Sparkles",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    tint: "#14b8a6",
  },
  {
    id: "tiny-feet-walk",
    title: "Tiny Feet, Walk With Me",
    lines: [
      "Tiny feet, walk with me,",
      "Through the garden, past the tree,",
      "Step step slow, step step quick,",
      "Pick a flower, make it stick.",
    ],
    ageGroup: "12-24m",
    mood: "Learning",
    icon: "Sprout",
    gradient: "from-lime-500 via-green-500 to-emerald-500",
    tint: "#22c55e",
  },
  {
    id: "goodnight-little-everything",
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
    gradient: "from-slate-700 via-indigo-700 to-purple-800",
    tint: "#6366f1",
  },
  {
    id: "kind-little-heart",
    title: "Kind Little Heart",
    lines: [
      "Kind little heart, brave little soul,",
      "Soft little hands that pat and roll,",
      "Bright little eyes that learn and see,",
      "There is no one as wonderful as thee.",
    ],
    ageGroup: "12-24m",
    mood: "Calm",
    icon: "Heart",
    gradient: "from-fuchsia-500 via-pink-500 to-rose-500",
    tint: "#d946ef",
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
  /** Inclusive lower bound in months. */
  fromMonths: number;
  /** Exclusive upper bound in months. */
  toMonths: number;
  blurb: string;
}

export const POEM_AGE_GROUPS: readonly PoemAgeGroupMeta[] = [
  { id: "0-6m",   label: "0–6m",   fromMonths: 0,  toMonths: 6,  blurb: "Ultra-calm sounds + very short verses" },
  { id: "6-12m",  label: "6–12m",  fromMonths: 6,  toMonths: 12, blurb: "Rhythmic repetition for early language" },
  { id: "12-24m", label: "12–24m", fromMonths: 12, toMonths: 24, blurb: "Simple counting and colour learning" },
];

/** Pick the age group that best matches a child of the given age in months. */
export function getDefaultAgeGroup(months: number): PoemAgeGroup {
  for (const g of POEM_AGE_GROUPS) {
    if (months >= g.fromMonths && months < g.toMonths) return g.id;
  }
  // For toddlers older than 24m we still default to the oldest bucket — the
  // poems are gentle enough that nobody is harmed by reading them later.
  return "12-24m";
}

export function getPoemsForGroup(group: PoemAgeGroup): InfantPoem[] {
  return ALL_POEMS.filter((p) => p.ageGroup === group);
}
