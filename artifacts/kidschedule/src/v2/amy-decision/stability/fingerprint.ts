/**
 * Meaningful context fingerprint for Stability.
 * Excludes refresh / nav / theme / render noise.
 */

import type { AmyContext } from "@/v2/amy-context";

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Fingerprint of facts that may legitimately change Hero attention.
 */
export function computeStabilityFingerprint(context: AmyContext): string {
  const payload = {
    memoryContextVersion: context.meta.contextVersion,
    ageBand: context.child.ageBand,
    worryId: context.challenge.worryId,
    coachGoalId: context.challenge.coachGoalId,
    missionId: context.mission.missionId,
    missionDateKey: context.mission.dateKey,
    missionCompletedAt: context.mission.completedAt,
    missionDoneToday: context.capabilities.hasCompletedMissionToday,
    coachStatus: context.coach.status,
    coachSessionId: context.coach.sessionId,
    coachGoalIdActive: context.coach.goalId,
    preparedGoalId: context.coach.prepared?.goalId ?? null,
    preparedGateDismissed: context.coach.prepared?.gateDismissed ?? null,
    speechStatus: context.speech.todayMissionStatus,
    hasSpeechConcern: context.capabilities.hasSpeechConcern,
    hasPreparedPlan: context.capabilities.hasPreparedPlan,
    hasCoachJourney: context.capabilities.hasCoachJourney,
    premiumEligible: context.capabilities.premiumEligible,
    premiumUnlocked: context.capabilities.premiumUnlocked,
    isSignedIn: context.capabilities.isSignedIn,
  };
  return `stab_v1_${fnv1a(JSON.stringify(payload))}`;
}

export type DecisionOutcomeKey = Readonly<{
  primary: string;
  secondary: string | null;
  passive: string | null;
  action: string;
  journey: string;
  cta: string;
  policyId: string;
  policyVersion: string;
}>;

export function decisionOutcomeKey(
  decision: import("../types").AmyDecision,
): DecisionOutcomeKey {
  return {
    primary: decision.primaryExperience.experienceId,
    secondary: decision.secondaryExperience?.experienceId ?? null,
    passive: decision.passiveExperience?.experienceId ?? null,
    action: decision.recommendedAction,
    journey: decision.recommendedJourney,
    cta: decision.recommendedCTA,
    policyId: decision.policyId,
    policyVersion: decision.policyVersion,
  };
}

export function outcomesEqual(a: DecisionOutcomeKey, b: DecisionOutcomeKey): boolean {
  return (
    a.primary === b.primary &&
    a.secondary === b.secondary &&
    a.passive === b.passive &&
    a.action === b.action &&
    a.journey === b.journey &&
    a.cta === b.cta &&
    a.policyId === b.policyId &&
    a.policyVersion === b.policyVersion
  );
}
