/**
 * Milestone idempotency (Pack 5 Addendum A §3).
 * Exactly once per milestoneId per BirthProfile.
 */

import {
  milestoneIdForCount,
  type ReflectionMilestoneId,
} from "../../domain/models/reflection";

export type MilestoneEmissionResult = {
  milestoneId: ReflectionMilestoneId | null;
  /** True only when this call should present UI / analytics / timeline once. */
  shouldEmit: boolean;
  nextEmitted: ReflectionMilestoneId[];
};

export function evaluateMilestoneEmission(
  entryCountAfterSave: number,
  alreadyEmitted: readonly ReflectionMilestoneId[],
): MilestoneEmissionResult {
  const milestoneId = milestoneIdForCount(entryCountAfterSave);
  if (!milestoneId) {
    return { milestoneId: null, shouldEmit: false, nextEmitted: [...alreadyEmitted] };
  }
  if (alreadyEmitted.includes(milestoneId)) {
    return { milestoneId, shouldEmit: false, nextEmitted: [...alreadyEmitted] };
  }
  return {
    milestoneId,
    shouldEmit: true,
    nextEmitted: [...alreadyEmitted, milestoneId],
  };
}
