import type { WellnessMetric } from "../../../types";

export const WELLNESS_JOURNEY_TITLE = "Amy Wellness Journey";

export const WELLNESS_RANKS = [
  { minXp: 0, maxXp: 100, label: "Beginner Explorer", emoji: "🌱", glow: "rgba(52,211,153,0.5)" },
  { minXp: 101, maxXp: 250, label: "Rising Adventurer", emoji: "⭐", glow: "rgba(34,211,238,0.55)" },
  { minXp: 251, maxXp: 500, label: "Wellness Hero", emoji: "🦸", glow: "rgba(167,139,250,0.6)" },
  { minXp: 501, maxXp: Infinity, label: "Galaxy Champion", emoji: "🌌", glow: "rgba(251,191,36,0.65)" },
] as const;

export const AVATAR_TIERS = [
  { minLevel: 1, maxLevel: 2, label: "Explorer", emoji: "🧭" },
  { minLevel: 3, maxLevel: 4, label: "Guardian", emoji: "🛡️" },
  { minLevel: 5, maxLevel: 6, label: "Champion", emoji: "🏆" },
  { minLevel: 7, maxLevel: 8, label: "Master", emoji: "👑" },
  { minLevel: 9, maxLevel: 10, label: "Legend", emoji: "✨" },
] as const;

export const STREAK_TIERS = [
  { minDays: 30, label: "Legendary Flame", emoji: "🔥", scale: 1.4 },
  { minDays: 14, label: "Phoenix", emoji: "🦅", scale: 1.25 },
  { minDays: 7, label: "Bonfire", emoji: "🔥", scale: 1.1 },
  { minDays: 3, label: "Fire", emoji: "🔥", scale: 1 },
  { minDays: 1, label: "Spark", emoji: "✨", scale: 0.85 },
] as const;

export type WellnessCategoryKey = "balance" | "focus" | "coordination" | "calmness" | "breathing";

export const WELLNESS_CATEGORIES: {
  key: WellnessCategoryKey;
  metric: WellnessMetric | "breathing";
  label: string;
  emoji: string;
  island: string;
  animation: "island" | "tower" | "rocket" | "forest" | "waterfall";
}[] = [
  { key: "balance", metric: "balance", label: "Balance", emoji: "🦩", island: "Floating islands", animation: "island" },
  { key: "focus", metric: "focus", label: "Focus", emoji: "💎", island: "Crystal towers", animation: "tower" },
  { key: "coordination", metric: "coordination", label: "Reaction", emoji: "🚀", island: "Launch pads", animation: "rocket" },
  { key: "calmness", metric: "calmness", label: "Movement", emoji: "🌲", island: "Energy forests", animation: "forest" },
  { key: "breathing", metric: "breathing", label: "Breathing", emoji: "🎈", island: "Sky waterfalls", animation: "waterfall" },
];

export const SHOWCASE_ACHIEVEMENTS = [
  { id: "first", emoji: "🏆", label: "First Adventure", check: (sessions: number) => sessions >= 1 },
  { id: "garden", emoji: "🌸", label: "Crystal Garden Hero", gameId: "freeze-statue" as const },
  { id: "rocket", emoji: "🚀", label: "Rocket Commander", gameId: "reaction-time" as const },
  { id: "reflex", emoji: "⚡", label: "Lightning Reflex", badgeId: "reaction-ninja" as const },
  { id: "balance", emoji: "🌈", label: "Balance Champion", badgeId: "balance-master" as const },
  { id: "explorer", emoji: "⭐", label: "Wellness Explorer", check: (sessions: number) => sessions >= 5 },
];

export function getWellnessRank(totalXp: number) {
  return (
    [...WELLNESS_RANKS].reverse().find((r) => totalXp >= r.minXp) ?? WELLNESS_RANKS[0]
  );
}

export function getAvatarTier(level: number) {
  return (
    [...AVATAR_TIERS].reverse().find((t) => level >= t.minLevel) ?? AVATAR_TIERS[0]
  );
}

export function getStreakTier(days: number) {
  return STREAK_TIERS.find((t) => days >= t.minDays) ?? STREAK_TIERS[STREAK_TIERS.length - 1];
}
