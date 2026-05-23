import type { SkillKey } from "../types-v2.js";

const DOMINANT_COHORT_CAP = 0.15;
const MIN_PATH_DIVERSITY = 3;

let pathRotationIndex = 0;

/**
 * Prevent overfitting to a single global path; rotate among top candidates.
 */
export function applyGlobalBiasToPath(candidates: SkillKey[]): SkillKey[] {
  if (candidates.length <= 1) return candidates;

  const unique = [...new Set(candidates)];
  if (unique.length < MIN_PATH_DIVERSITY) {
    const filler: SkillKey[] = ["phonics", "motor_skills", "cognitive", "social"];
    for (const f of filler) {
      if (!unique.includes(f)) unique.push(f);
      if (unique.length >= MIN_PATH_DIVERSITY) break;
    }
  }

  pathRotationIndex = (pathRotationIndex + 1) % unique.length;
  const rotated = [
    ...unique.slice(pathRotationIndex),
    ...unique.slice(0, pathRotationIndex),
  ];
  return rotated;
}

export function capGlobalBoost(rawBoost: number, cohortShare = 1): number {
  const capped = Math.min(DOMINANT_COHORT_CAP, rawBoost);
  if (cohortShare > 0.7) return capped * 0.85;
  return capped;
}

export function shouldAvoidRiskySequence(
  sequence: string[],
  riskySequences: string[][],
): boolean {
  const key = sequence.join(">");
  return riskySequences.some((r) => r.join(">") === key);
}

export function dampWeakPatternBoost(
  successRate: number,
  minSuccess = 0.35,
): number {
  if (successRate < minSuccess) return 0;
  return successRate;
}
