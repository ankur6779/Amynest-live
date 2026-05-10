// ─────────────────────────────────────────────────────────────────────────
// Priority weighting + age-band intelligence for the constraint solver.
// ─────────────────────────────────────────────────────────────────────────

import type { ActivityPriorityWeights, ChildProfile } from "./types";

/** Production defaults — calibrated so the engine's arbitration order is:
 *  sleep > school > meal > hygiene > study > family > outdoor > play > rest. */
export const DEFAULT_WEIGHTS: ActivityPriorityWeights = {
  sleep:    100,
  school:    95,
  meal:      85,
  hygiene:   75,
  study:     65,
  family:    55,
  outdoor:   50,
  creative:  45,
  play:      40,
  rest:      30,
  ageBandMultiplier: [
    { ageMax: 1,  multiplier: 1.5 },  // infants — sleep dominates
    { ageMax: 3,  multiplier: 1.3 },  // toddlers
    { ageMax: 5,  multiplier: 1.15 }, // preschool
    { ageMax: 9,  multiplier: 1.0 },  // school-age — neutral
    { ageMax: 13, multiplier: 0.9 },  // pre-teen — slightly less rigid
    { ageMax: 99, multiplier: 0.85 }, // teen — most flexible
  ],
  sickBonus: 25,
};

/** Merge user overrides with defaults (sparse-safe). */
export function resolveWeights(
  overrides?: Partial<ActivityPriorityWeights>
): ActivityPriorityWeights {
  if (!overrides) return DEFAULT_WEIGHTS;
  return {
    ...DEFAULT_WEIGHTS,
    ...overrides,
    ageBandMultiplier:
      overrides.ageBandMultiplier ?? DEFAULT_WEIGHTS.ageBandMultiplier,
    sickBonus: overrides.sickBonus ?? DEFAULT_WEIGHTS.sickBonus,
  };
}

/** Categorical lookup with a defensive default. */
export function categoryWeight(
  category: string,
  weights: ActivityPriorityWeights
): number {
  const key = category as keyof ActivityPriorityWeights;
  const v = weights[key];
  return typeof v === "number" ? v : 30; // unknown category → low weight
}

/** Compute the effective priority of a single item for a single child,
 *  including age multiplier and sick-bonus. */
export function effectivePriority(
  category: string,
  child: ChildProfile,
  weights: ActivityPriorityWeights
): number {
  const base = categoryWeight(category, weights);
  const ageMul = ageMultiplier(child.age, weights);
  const sick =
    child.isSick && (category === "sleep" || category === "rest")
      ? (weights.sickBonus ?? 0)
      : 0;
  // Infants override: sleep is always king for <1 year olds.
  const infantBoost = child.isInfant && category === "sleep" ? 50 : 0;
  return Math.round(base * ageMul + sick + infantBoost);
}

export function ageMultiplier(
  age: number,
  weights: ActivityPriorityWeights
): number {
  const bands = weights.ageBandMultiplier ?? [];
  for (const band of bands) {
    if (age <= band.ageMax) return band.multiplier;
  }
  return 1.0;
}
