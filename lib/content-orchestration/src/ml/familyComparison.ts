import type { SkillKey } from "../types-v2.js";
import type { ChildFamilySnapshot, InternalComparisonMetrics } from "./types-family.js";

const SKILL_KEYS: SkillKey[] = ["phonics", "motor_skills", "cognitive", "social"];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Internal relative metrics — anonymized rank labels, never "you are worse than X".
 */
export function computeInternalComparisons(
  snapshots: ChildFamilySnapshot[],
): InternalComparisonMetrics[] {
  if (snapshots.length === 0) return [];

  const avgSkill: Record<SkillKey, number> = {
    phonics: 0,
    motor_skills: 0,
    cognitive: 0,
    social: 0,
  };
  let avgEngagement = 0;
  let avgProgress = 0;

  for (const s of snapshots) {
    for (const k of SKILL_KEYS) {
      avgSkill[k] += s.profile.skills[k].level;
    }
    avgEngagement += s.profile.behavior.engagementScore;
    const progress =
      s.prediction?.skillForecasts?.reduce(
        (a, f) => a + f.nextSkillLevel,
        0,
      ) ?? Object.values(s.profile.skills).reduce((a, sk) => a + sk.level, 0);
    avgProgress += progress / SKILL_KEYS.length;
  }

  const n = snapshots.length;
  for (const k of SKILL_KEYS) avgSkill[k] /= n;
  avgEngagement /= n;
  avgProgress /= n;

  const engagementSorted = [...snapshots].sort(
    (a, b) => b.profile.behavior.engagementScore - a.profile.behavior.engagementScore,
  );

  return snapshots.map((s, idx) => {
    const relativeSkillLevels: Partial<Record<SkillKey, number>> = {};
    for (const k of SKILL_KEYS) {
      const level = s.profile.skills[k].level;
      relativeSkillLevels[k] = clamp01(
        avgSkill[k] > 0 ? level / (avgSkill[k] * 1.2) : 0.5,
      );
    }

    const engRank = engagementSorted.findIndex((x) => x.childId === s.childId);
    const relativeEngagement = clamp01(
      1 - engRank / Math.max(1, n - 1),
    );

    const progress =
      s.prediction?.skillForecasts?.reduce((a, f) => a + f.progressionRate, 0) ??
      0.1;
    const relativeProgressSpeed = clamp01(
      avgProgress > 0 ? progress / (avgProgress / n + 0.05) : 0.5,
    );

    return {
      childId: s.childId,
      relativeSkillLevels,
      relativeEngagement,
      relativeProgressSpeed,
      rankLabel: `internal_c${idx + 1}`,
    };
  });
}

export function anonymizeForStorage(
  metrics: InternalComparisonMetrics[],
): Record<string, Omit<InternalComparisonMetrics, "childId">> {
  const out: Record<string, Omit<InternalComparisonMetrics, "childId">> = {};
  for (const m of metrics) {
    out[m.rankLabel] = {
      relativeSkillLevels: m.relativeSkillLevels,
      relativeEngagement: m.relativeEngagement,
      relativeProgressSpeed: m.relativeProgressSpeed,
      rankLabel: m.rankLabel,
    };
  }
  return out;
}
