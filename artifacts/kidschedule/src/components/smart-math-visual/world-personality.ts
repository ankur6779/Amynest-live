/**
 * World personality — subtle tempo / energy for ambience only.
 * Does not affect learning, audio, or rewards.
 */

import type { MathWorldId, MathWorldTheme } from "./world-themes";

export type WorldPersonality = {
  id: MathWorldId;
  traits: string[];
  /** Seconds for one full scene breath */
  breathSeconds: number;
  /** Multiplier for idle animation speed (0.7 calm → 1.35 energetic) */
  tempo: number;
  /** Particle motion energy */
  particleEnergy: number;
  /** How often curiosity glances happen (ms base) */
  curiosityMs: number;
  /** Micro-story interval range [min, max] ms */
  storyMs: [number, number];
  /** Amy idle glance tempo */
  amyTempo: number;
  /** Shared light travel duration */
  lightTravelSeconds: number;
};

const PERSONALITIES: Record<MathWorldId, WorldPersonality> = {
  crystal_cave: {
    id: "crystal_cave",
    traits: ["calm", "quiet", "sparkly", "patient"],
    breathSeconds: 9.5,
    tempo: 0.78,
    particleEnergy: 0.7,
    curiosityMs: 9000,
    storyMs: [28000, 48000],
    amyTempo: 0.85,
    lightTravelSeconds: 2.4,
  },
  sunny_meadow: {
    id: "sunny_meadow",
    traits: ["happy", "warm", "cheerful"],
    breathSeconds: 7.5,
    tempo: 1.05,
    particleEnergy: 1.05,
    curiosityMs: 7000,
    storyMs: [22000, 40000],
    amyTempo: 1.1,
    lightTravelSeconds: 1.8,
  },
  moon_forest: {
    id: "moon_forest",
    traits: ["gentle", "slow", "dreamy"],
    breathSeconds: 11,
    tempo: 0.72,
    particleEnergy: 0.65,
    curiosityMs: 11000,
    storyMs: [32000, 55000],
    amyTempo: 0.75,
    lightTravelSeconds: 2.8,
  },
  rocket_base: {
    id: "rocket_base",
    traits: ["energetic", "fast", "playful"],
    breathSeconds: 6.2,
    tempo: 1.32,
    particleEnergy: 1.35,
    curiosityMs: 5500,
    storyMs: [18000, 34000],
    amyTempo: 1.35,
    lightTravelSeconds: 1.4,
  },
  toy_workshop: {
    id: "toy_workshop",
    traits: ["playful", "curious", "friendly"],
    breathSeconds: 7,
    tempo: 1.15,
    particleEnergy: 1.15,
    curiosityMs: 6500,
    storyMs: [20000, 38000],
    amyTempo: 1.2,
    lightTravelSeconds: 1.7,
  },
  magic_garden: {
    id: "magic_garden",
    traits: ["curious", "friendly", "soft"],
    breathSeconds: 8.2,
    tempo: 0.92,
    particleEnergy: 0.9,
    curiosityMs: 8000,
    storyMs: [24000, 44000],
    amyTempo: 1.0,
    lightTravelSeconds: 2.1,
  },
};

export function personalityForTheme(theme: MathWorldTheme): WorldPersonality {
  return PERSONALITIES[theme.id] ?? PERSONALITIES.sunny_meadow;
}

/** Tiny organic jitter so loops never feel identical. */
export function organicJitter(seed: number, amount = 0.12): number {
  const s = Number.isFinite(seed) ? seed : 1;
  const a = Number.isFinite(amount) ? Math.min(1, Math.max(0, amount)) : 0.12;
  const n = Math.abs(Math.sin(s * 12.9898) * 43758.5453) % 1;
  if (!Number.isFinite(n)) return 1;
  return 1 + (n - 0.5) * 2 * a;
}
