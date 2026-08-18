/**
 * Scene / camera / pose libraries — script picks a unique short-film world.
 * Never a single default living-room / study-desk template.
 */

import type { CompositionCamera, EnvironmentId } from "../creative-composition/types.js";
import type { AmyPoseId, DiversityTopicBucket } from "./types.js";

/** Full rotatable world — Indian premium middle-class + public spaces. */
export const WORLD_LOCATIONS: EnvironmentId[] = [
  "living-room",
  "kitchen-table",
  "healthy-kitchen",
  "balcony",
  "terrace",
  "balcony-night",
  "child-bedroom",
  "bedroom-morning",
  "bedroom-night",
  "homework-corner",
  "study-desk",
  "reading-corner",
  "garden",
  "park",
  "park-bench",
  "playground",
  "school",
  "school-bus",
  "library",
  "book-store",
  "cafe",
  "museum",
  "science-center",
  "science-room",
  "math-laboratory",
  "art-room",
  "music-room",
  "apartment-hallway",
  "car-ride",
  "rainy-window",
  "festival-home",
  "festival",
  "morning-breakfast",
  "dining-table",
  "playroom",
  "indoor-tent",
  "grandparents",
  "outdoor-learning",
  "nature-walk",
  "weekend-picnic",
  "fridge-magnet-wall",
  "mirror-practice-nook",
  "calendar-wall",
  "astro-observatory",
];

export const SCENE_LIBRARY: Record<DiversityTopicBucket, EnvironmentId[]> = {
  learning: [
    "homework-corner",
    "reading-corner",
    "library",
    "book-store",
    "school",
    "science-center",
    "math-laboratory",
    "art-room",
    "cafe",
    "apartment-hallway",
    "terrace",
    "dining-table",
    "car-ride",
    "museum",
  ],
  phonics: [
    "fridge-magnet-wall",
    "kitchen-table",
    "homework-corner",
    "reading-corner",
    "bedroom-morning",
    "library",
    "book-store",
    "living-room",
    "festival-home",
    "grandparents",
  ],
  reading: [
    "reading-corner",
    "library",
    "book-store",
    "child-bedroom",
    "rainy-window",
    "park-bench",
    "cafe",
    "terrace",
    "indoor-tent",
    "living-room",
  ],
  speech: [
    "mirror-practice-nook",
    "child-bedroom",
    "living-room",
    "balcony",
    "car-ride",
    "playroom",
    "garden",
    "music-room",
    "apartment-hallway",
    "cafe",
  ],
  health: [
    "garden",
    "balcony",
    "terrace",
    "park",
    "playground",
    "healthy-kitchen",
    "nature-walk",
    "bedroom-morning",
    "outdoor-learning",
  ],
  games: [
    "playground",
    "park",
    "garden",
    "playroom",
    "indoor-tent",
    "weekend-picnic",
    "terrace",
    "living-room",
    "birthday",
  ],
  astro: [
    "balcony-night",
    "terrace",
    "astro-observatory",
    "bedroom-night",
    "rainy-window",
    "apartment-hallway",
    "park-bench",
  ],
  routine: [
    "morning-breakfast",
    "kitchen-table",
    "bedroom-night",
    "school-bus",
    "car-ride",
    "apartment-hallway",
    "calendar-wall",
    "living-room",
    "balcony",
  ],
  parenting: [
    "dining-table",
    "kitchen-table",
    "living-room",
    "rainy-window",
    "cafe",
    "car-ride",
    "terrace",
    "festival-home",
    "homework-corner",
  ],
  coach: [
    "living-room",
    "garden",
    "balcony",
    "reading-corner",
    "cafe",
    "park-bench",
    "bedroom-morning",
    "terrace",
  ],
};

export const CAMERA_LIBRARY: CompositionCamera[] = [
  "wide",
  "medium",
  "close-up",
  "over-shoulder",
  "top-down",
  "hand-close-up",
  "child-pov",
  "amy-pov",
  "tracking",
  "push-in",
  "pull-out",
  "low-angle",
  "high-angle",
  "handheld",
  "eye-level",
  "walking-follow",
  "reaction",
  "orbit-soft",
  "dolly",
  "pan-right",
  "pan-left",
  "slow-zoom",
  "two-shot",
  "profile",
];

/** Dialogue coverage — rotate these; avoid frontal talking heads. */
export const CONVERSATION_COVERAGE: CompositionCamera[] = [
  "wide",
  "over-shoulder",
  "close-up",
  "reaction",
  "two-shot",
  "profile",
  "medium",
  "handheld",
];

export const AMY_POSE_LIBRARY: AmyPoseId[] = [
  "sitting",
  "kneeling",
  "walking",
  "pointing",
  "celebrating",
  "reading",
  "floating-beside",
  "drawing",
  "high-five",
  "helping",
  "encouraging",
  "listening",
  "watching",
  "interacting",
];

export const FEATURE_PROPS: Record<DiversityTopicBucket, string[]> = {
  learning: ["books", "whiteboard", "pencil", "flashcards", "lesson card", "school bag"],
  phonics: ["letter magnets", "flashcards", "CVC tiles", "sound cards", "pencil"],
  reading: ["picture book", "bookmark", "reading lamp", "story pages", "library shelf"],
  speech: ["mirror", "mouth practice card", "mic", "pronunciation cue"],
  health: ["water bottle", "stretch mat", "breathing bubble", "fruit bowl"],
  games: ["soft ball", "jump mat", "celebration confetti", "game tokens"],
  astro: ["star chart", "telescope", "constellation glow", "night sky window"],
  routine: ["calendar", "breakfast bowl", "bedtime lamp", "family checklist", "shoes by door"],
  parenting: ["notebook", "warm mug", "soft lamp", "family photo frame"],
  coach: ["coach card", "habit sticker", "encouragement star"],
};

/** Stable hash → index for deterministic but script-unique picks. */
export function pickBySeed<T>(items: readonly T[], seed: string, salt: string): T {
  if (!items.length) {
    throw new Error("pickBySeed: empty list");
  }
  let h = 0;
  const s = `${seed}|${salt}`;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return items[h % items.length]!;
}

export function pickUniqueBySeed<T>(
  items: readonly T[],
  seed: string,
  count: number,
  salt: string,
  avoid: readonly T[] = [],
): T[] {
  if (!items.length) return [];
  const avoidSet = new Set(avoid.map((x) => String(x)));
  const preferred = items.filter((x) => !avoidSet.has(String(x)));
  const pool = preferred.length >= Math.min(2, count) ? preferred : [...items];
  const out: T[] = [];
  const used = new Set<number>();
  let i = 0;
  while (out.length < Math.min(count, pool.length) && i < pool.length * 4) {
    const idx =
      ([...`${seed}|${salt}|${i}`].reduce(
        (a, c) => (a * 33 + c.charCodeAt(0)) >>> 0,
        0,
      ) +
        i * 17) %
      pool.length;
    i += 1;
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(pool[idx]!);
  }
  for (let j = 0; out.length < Math.min(count, pool.length) && j < pool.length; j++) {
    if (used.has(j)) continue;
    used.add(j);
    out.push(pool[j]!);
  }
  return out;
}
