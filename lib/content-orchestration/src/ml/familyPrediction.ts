import type { ChildFamilySnapshot, FamilyRiskPrediction } from "./types-family.js";
import type { FamilyGraph } from "./types-family.js";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * V6 extension: family-level engagement and per-child drop-off risk.
 */
export function predictFamilyRisk(
  snapshots: ChildFamilySnapshot[],
  _graph: FamilyGraph,
): FamilyRiskPrediction {
  const dropOffRiskPerChild: Record<string, number> = {};
  const disengagedChildIds: string[] = [];
  let engagementSum = 0;

  for (const s of snapshots) {
    const risk =
      s.prediction?.predictedDropOffRisk ??
      clamp01(1 - s.profile.behavior.engagementScore / 100);
    dropOffRiskPerChild[s.childId] = risk;
    engagementSum += s.profile.behavior.engagementScore / 100;
    if (risk > 0.55 || s.profile.behavior.engagementScore < 40) {
      disengagedChildIds.push(s.childId);
    }
  }

  const overallEngagementTrend =
    snapshots.length > 0 ? engagementSum / snapshots.length : 0.5;

  return {
    dropOffRiskPerChild,
    overallEngagementTrend,
    disengagedChildIds,
  };
}

export function familyWideExperienceAdjustment(
  risk: FamilyRiskPrediction,
): { explorationBoostAll: number; rewardBoostAll: number } {
  if (risk.disengagedChildIds.length === 0) {
    return { explorationBoostAll: 0, rewardBoostAll: 0 };
  }
  const severity = risk.disengagedChildIds.length / Math.max(1, Object.keys(risk.dropOffRiskPerChild).length);
  return {
    explorationBoostAll: Math.min(0.1, severity * 0.08),
    rewardBoostAll: Math.min(0.12, severity * 0.1),
  };
}
