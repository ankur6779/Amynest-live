/**
 * Scene / camera / pose libraries — script picks, never a single default room.
 */

import type { CompositionCamera, EnvironmentId } from "../creative-composition/types.js";
import type { AmyPoseId, DiversityTopicBucket } from "./types.js";

export const SCENE_LIBRARY: Record<DiversityTopicBucket, EnvironmentId[]> = {
  learning: [
    "study-desk",
    "homework-corner",
    "reading-corner",
    "library",
    "art-room",
    "math-laboratory",
    "indoor-tent",
    "school",
  ],
  phonics: [
    "homework-corner",
    "reading-corner",
    "kitchen-table",
    "bedroom-morning",
    "fridge-magnet-wall",
    "library",
    "study-desk",
  ],
  reading: [
    "reading-corner",
    "library",
    "child-bedroom",
    "living-room",
    "indoor-tent",
    "park-bench",
    "story-castle",
  ],
  speech: [
    "child-bedroom",
    "mirror-practice-nook",
    "living-room",
    "playroom",
    "garden",
    "music-room",
  ],
  health: [
    "garden",
    "outdoor-learning",
    "healthy-kitchen",
    "living-room",
    "park",
    "nature-walk",
    "bedroom-morning",
  ],
  games: [
    "playroom",
    "park",
    "garden",
    "indoor-tent",
    "living-room",
    "birthday",
    "weekend-picnic",
  ],
  astro: [
    "bedroom-night",
    "astro-observatory",
    "space-world",
    "rainy-window",
    "balcony-night",
    "fantasy-learning-world",
  ],
  routine: [
    "morning-breakfast",
    "kitchen-table",
    "bedroom-night",
    "living-room",
    "calendar-wall",
    "school-bus",
    "grandparents",
  ],
  parenting: [
    "dining-table",
    "living-room",
    "kitchen-table",
    "homework-corner",
    "rainy-window",
    "travel",
  ],
  coach: [
    "living-room",
    "garden",
    "reading-corner",
    "playroom",
    "bedroom-morning",
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
  "eye-level",
  "walking-follow",
  "reaction",
  "orbit-soft",
  "dolly",
  "pan-right",
  "pan-left",
  "slow-zoom",
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
  learning: ["books", "whiteboard", "pencil", "flashcards", "lesson card"],
  phonics: ["letter magnets", "flashcards", "CVC tiles", "sound cards", "pencil"],
  reading: ["picture book", "bookmark", "reading lamp", "story pages"],
  speech: ["mirror", "mouth practice card", "mic", "pronunciation cue"],
  health: ["water bottle", "stretch mat", "breathing bubble", "fruit bowl"],
  games: ["soft ball", "jump mat", "celebration confetti", "game tokens"],
  astro: ["star chart", "telescope", "constellation glow", "night sky window"],
  routine: ["calendar", "breakfast bowl", "bedtime lamp", "family checklist"],
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
): T[] {
  if (!items.length) return [];
  const out: T[] = [];
  const used = new Set<number>();
  let i = 0;
  while (out.length < Math.min(count, items.length) && i < items.length * 3) {
    const idx =
      ([...`${seed}|${salt}|${i}`].reduce(
        (a, c) => (a * 33 + c.charCodeAt(0)) >>> 0,
        0,
      ) +
        i * 17) %
      items.length;
    i += 1;
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(items[idx]!);
  }
  // fill remaining sequentially if collisions
  for (let j = 0; out.length < Math.min(count, items.length) && j < items.length; j++) {
    if (used.has(j)) continue;
    used.add(j);
    out.push(items[j]!);
  }
  return out;
}
