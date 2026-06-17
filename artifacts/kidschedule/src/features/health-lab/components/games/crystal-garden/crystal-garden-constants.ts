export const CRYSTAL_GARDEN_ROUNDS = 5;

export const GARDEN_STAGES = [
  {
    crystals: 0,
    label: "Crystal Sprouts",
    sprouts: 4,
    flowers: 0,
    butterflies: 0,
    animals: [] as string[],
    tree: false,
    dragon: false,
  },
  {
    crystals: 1,
    label: "Crystal Flowers",
    sprouts: 4,
    flowers: 5,
    butterflies: 0,
    animals: [],
    tree: false,
    dragon: false,
  },
  {
    crystals: 2,
    label: "Butterfly Grove",
    sprouts: 4,
    flowers: 6,
    butterflies: 4,
    animals: [],
    tree: false,
    dragon: false,
  },
  {
    crystals: 3,
    label: "Crystal Meadow",
    sprouts: 4,
    flowers: 7,
    butterflies: 5,
    animals: ["🐇", "🦜"],
    tree: false,
    dragon: false,
  },
  {
    crystals: 4,
    label: "Growing Tree",
    sprouts: 4,
    flowers: 8,
    butterflies: 5,
    animals: ["🐇", "🦜", "🦄"],
    tree: true,
    dragon: false,
  },
  {
    crystals: 5,
    label: "Crystal Kingdom",
    sprouts: 4,
    flowers: 10,
    butterflies: 6,
    animals: ["🐇", "🦜", "🦄", "🐉"],
    tree: true,
    dragon: true,
  },
] as const;

export type GardenStage = (typeof GARDEN_STAGES)[number];

export const ROUND_CELEBRATIONS = [
  { round: 1, emoji: "🌸", label: "Crystal Flower Grown!" },
  { round: 2, emoji: "💎", label: "Crystal Bloom Expanded!" },
  { round: 3, emoji: "🦋", label: "Butterfly Unlocked!" },
  { round: 4, emoji: "🦄", label: "Crystal Creature Arrived!" },
  { round: 5, emoji: "🌳", label: "Legendary Crystal Tree!" },
] as const;

export type FreezeMotionTier = "perfect" | "slight" | "wobble" | "danger";

export function getGardenStage(crystals: number): GardenStage {
  return GARDEN_STAGES[Math.min(crystals, GARDEN_STAGES.length - 1)];
}

export function getFreezeMotionTier(stability: number, variance: number): FreezeMotionTier {
  if (stability >= 88 && variance < 0.08) return "perfect";
  if (stability >= 72 && variance < 0.15) return "slight";
  if (stability >= 50 && variance < 0.28) return "wobble";
  return "danger";
}

export type StatueRating = "master" | "amazing" | "perfect" | "fail";

export function getStatueRating(stability: number, peakVariance: number, simulated: boolean): StatueRating {
  if (simulated) return stability >= 65 ? "perfect" : "fail";
  if (stability >= 92 && peakVariance < 0.06) return "master";
  if (stability >= 80 && peakVariance < 0.12) return "amazing";
  if (stability >= 65 && peakVariance < 0.22) return "perfect";
  return "fail";
}

export const STATUE_MESSAGES: Record<Exclude<StatueRating, "fail">, string> = {
  perfect: "🧊 PERFECT STATUE",
  amazing: "⭐ AMAZING CONTROL",
  master: "👑 CRYSTAL MASTER",
};

export const MOTION_TIER_LABELS: Record<FreezeMotionTier, string> = {
  perfect: "Perfect freeze!",
  slight: "Tiny wiggle…",
  wobble: "Hold still!",
  danger: "Too much movement!",
};
