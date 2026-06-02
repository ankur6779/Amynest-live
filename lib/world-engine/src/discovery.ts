import type { WorldManifestItem } from "./manifest-types.js";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type DiscoverySlidePhase = "image" | "name" | "narration" | "sound" | "advance";

export const DISCOVERY_PHASE_ORDER: DiscoverySlidePhase[] = [
  "image",
  "name",
  "narration",
  "sound",
  "advance",
];

export function buildPlatformDiscoverySequence(
  items: WorldManifestItem[],
  count = 20,
  categoryFilter?: string,
): WorldManifestItem[] {
  const pool = categoryFilter
    ? items.filter((i) => i.category === categoryFilter)
    : items;
  if (pool.length === 0) return [];
  const sequence: WorldManifestItem[] = [];
  while (sequence.length < count) {
    sequence.push(...shuffle(pool));
  }
  return sequence.slice(0, count);
}

export function discoveryPhaseDurationMs(
  phase: DiscoverySlidePhase,
  speedMultiplier: number,
): number {
  const base: Record<DiscoverySlidePhase, number> = {
    image: 1200,
    name: 1000,
    narration: 2200,
    sound: 1800,
    advance: 400,
  };
  return Math.round(base[phase] / Math.max(0.5, speedMultiplier));
}
