import type {
  ChildFamilySnapshot,
  CrossChildSignals,
  FamilyGraph,
  LearningDynamics,
  SiblingPair,
} from "./types-family.js";
import type { InternalComparisonMetrics } from "./types-family.js";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function buildSiblingPairs(
  snapshots: ChildFamilySnapshot[],
): SiblingPair[] {
  const sorted = [...snapshots].sort((a, b) => a.ageMonths - b.ageMonths);
  const pairs: SiblingPair[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    pairs.push({
      youngerChildId: sorted[i]!.childId,
      olderChildId: sorted[i + 1]!.childId,
    });
  }
  return pairs;
}

export function computeLearningDynamics(
  snapshots: ChildFamilySnapshot[],
  comparisons: InternalComparisonMetrics[],
): LearningDynamics {
  const siblings = buildSiblingPairs(snapshots);
  const highlyEngaged = snapshots
    .filter((s) => s.profile.behavior.engagementScore >= 70)
    .map((s) => s.childId);

  let explorationBoost = 0;
  if (highlyEngaged.length > 0 && snapshots.length > 1) {
    explorationBoost = Math.min(0.15, highlyEngaged.length * 0.05);
  }

  const byAge = [...snapshots].sort((a, b) => a.ageMonths - b.ageMonths);
  const youngest = byAge[0];
  const oldest = byAge[byAge.length - 1];

  return {
    explorationBoostFromSiblings: explorationBoost,
    teachingRoleChildId: snapshots.length > 1 ? oldest?.childId : undefined,
    accelerationTargetChildId:
      snapshots.length > 1 ? youngest?.childId : undefined,
    highlyEngagedChildIds: highlyEngaged,
  };
}

export function crossChildSignalsForChild(
  childId: string,
  graph: FamilyGraph,
  comparisons: InternalComparisonMetrics[],
  snapshots: ChildFamilySnapshot[],
): CrossChildSignals {
  const self = comparisons.find((c) => c.childId === childId);
  const dynamics = graph.learningDynamics;
  const snapshot = snapshots.find((s) => s.childId === childId);

  let difficultyNudge = 0;
  let explorationBoost = dynamics.explorationBoostFromSiblings;
  let teachingRoleRecommended = dynamics.teachingRoleChildId === childId;
  let exposureAcceleration = dynamics.accelerationTargetChildId === childId;

  const fastSibling = snapshots.find(
    (s) =>
      s.childId !== childId &&
      s.profile.skills.phonics.level >
        (snapshot?.profile.skills.phonics.level ?? 0) + 1,
  );
  if (fastSibling && self && self.relativeProgressSpeed > 0.4) {
    difficultyNudge = Math.min(0.2, 0.08);
  }

  if (dynamics.highlyEngagedChildIds.includes(childId)) {
    explorationBoost += 0.05;
  }

  const isYounger = graph.relationships.siblings.some(
    (p) => p.youngerChildId === childId,
  );
  if (isYounger && exposureAcceleration) {
    difficultyNudge += 0.06;
    explorationBoost += 0.04;
  }

  return {
    difficultyNudge: clamp01(difficultyNudge),
    explorationBoost: clamp01(explorationBoost),
    teachingRoleRecommended,
    exposureAcceleration,
  };
}
