export const SKY_ISLAND_MAX_SECONDS = 90;

export const SKY_ISLAND_EVOLUTION = [
  { startSec: 0, endSec: 10, tier: "tiny", label: "Tiny Island", scale: 0.82, flowers: 2, butterflies: 0, birds: 0, rainbow: false },
  { startSec: 10, endSec: 20, tier: "garden", label: "Flower Garden", scale: 0.88, flowers: 5, butterflies: 0, birds: 0, rainbow: false },
  { startSec: 20, endSec: 30, tier: "butterflies", label: "Butterfly Meadow", scale: 0.94, flowers: 6, butterflies: 3, birds: 0, rainbow: false },
  { startSec: 30, endSec: 45, tier: "birds", label: "Sky Sanctuary", scale: 1, flowers: 7, butterflies: 4, birds: 3, rainbow: false },
  { startSec: 45, endSec: 60, tier: "rainbow", label: "Rainbow Realm", scale: 1.05, flowers: 8, butterflies: 5, birds: 4, rainbow: true },
  { startSec: 60, endSec: 90, tier: "legendary", label: "Sky Kingdom", scale: 1.12, flowers: 10, butterflies: 6, birds: 5, rainbow: true },
] as const;

export type IslandEvolution = (typeof SKY_ISLAND_EVOLUTION)[number];

export const SKY_ISLAND_MILESTONES = [
  { seconds: 10, label: "Flower Garden", emoji: "🌸" },
  { seconds: 20, label: "Butterfly Friend", emoji: "🦋" },
  { seconds: 30, label: "Sky Bird Visitor", emoji: "🐦" },
  { seconds: 45, label: "Rainbow Builder", emoji: "🌈" },
  { seconds: 60, label: "Sky Kingdom Protector", emoji: "👑" },
  { seconds: 90, label: "Legendary Balance Master", emoji: "🏆" },
] as const;

export type SkyIslandEvolutionTier = (typeof SKY_ISLAND_EVOLUTION)[number]["tier"];

export function getIslandEvolution(elapsed: number) {
  const clamped = Math.min(elapsed, SKY_ISLAND_MAX_SECONDS);
  return (
    [...SKY_ISLAND_EVOLUTION].reverse().find((e) => clamped >= e.startSec) ?? SKY_ISLAND_EVOLUTION[0]
  );
}

export type StabilityVisualTier = "perfect" | "slight" | "wobble" | "danger";

export function getStabilityVisualTier(
  zone: "balanced" | "wobbling" | "unstable",
  stability: number,
): StabilityVisualTier {
  if (zone === "unstable" || stability < 35) return "danger";
  if (zone === "wobbling" || stability < 65) return "wobble";
  if (stability >= 88) return "perfect";
  return "slight";
}
