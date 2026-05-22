/**
 * Unified Amy voice delivery profile — merges learning cohorts + A/B experiments.
 */

import type { AmyDifficultyLevel } from "@/lib/amy-voice-difficulty";
import {
  getAmyVoiceCohortAdjustments,
  getAmyVoiceCohortSnapshot,
  recordAmyVoiceCohortSpeak,
  type AmyVoiceCohortAdjustments,
} from "@/lib/amy-voice-cohorts";
import {
  getAmyVoiceExperimentAssignment,
  getAmyVoiceExperimentModifiers,
  getAmyVoiceExperimentSnapshot,
  recordAmyVoiceExperimentOutcome,
} from "@/lib/amy-voice-experiments";
import { clampDeliveryModifiersToInvariants, getAmyVoiceInvariantSnapshot } from "@/lib/amy-voice-invariants";
import { getAmyVoiceGovernanceSnapshot } from "@/lib/amy-voice-governance";

export type AmyVoiceDeliveryModifiers = {
  encouragementMultiplier: number;
  microHumanizeMultiplier: number;
  pacingRateDelta: number;
  pacingGapDelta: number;
  leadInStyle: "control" | "direct" | "conversational";
};

export type AmyVoiceDeliveryProfile = {
  cohortId: string;
  experimentVariants: Record<string, string>;
  modifiers: AmyVoiceDeliveryModifiers;
  guidanceTier: AmyVoiceCohortAdjustments["guidanceTier"];
  supportLevel: AmyVoiceCohortAdjustments["supportLevel"];
};

export type AmyVoiceDeliverySignals = {
  replayCount: number;
  difficulty: AmyDifficultyLevel;
  durationMs: number;
};

function mergeModifiers(
  cohort: AmyVoiceCohortAdjustments,
  experiment: ReturnType<typeof getAmyVoiceExperimentModifiers>,
): AmyVoiceDeliveryModifiers {
  return {
    encouragementMultiplier:
      cohort.encouragementMultiplier * experiment.encouragementMultiplier,
    microHumanizeMultiplier:
      cohort.microHumanizeMultiplier * experiment.microHumanizeMultiplier,
    pacingRateDelta: cohort.pacingRateDelta + experiment.pacingRateDelta,
    pacingGapDelta: cohort.pacingGapDelta + experiment.pacingGapDelta,
    leadInStyle: experiment.leadInStyle,
  };
}

function clampMergedModifiers(
  modifiers: AmyVoiceDeliveryModifiers,
): AmyVoiceDeliveryModifiers {
  return clampDeliveryModifiersToInvariants(modifiers);
}

export function resolveAmyVoiceDeliveryProfile(
  signals: Omit<AmyVoiceDeliverySignals, "durationMs"> & { durationMs?: number },
): AmyVoiceDeliveryProfile {
  const cohort = getAmyVoiceCohortAdjustments({
    replayCount: signals.replayCount,
    difficulty: signals.difficulty,
    durationMs: signals.durationMs ?? 0,
  });
  const experimentVariants = getAmyVoiceExperimentAssignment();
  const experiment = getAmyVoiceExperimentModifiers(experimentVariants);

  return {
    cohortId: cohort.cohortId,
    experimentVariants,
    modifiers: clampMergedModifiers(mergeModifiers(cohort, experiment)),
    guidanceTier: cohort.guidanceTier,
    supportLevel: cohort.supportLevel,
  };
}

export function recordAmyVoiceDeliveryOutcome(
  profile: AmyVoiceDeliveryProfile,
  outcome: AmyVoiceDeliverySignals & { fallback: boolean },
): void {
  recordAmyVoiceCohortSpeak(outcome);
  recordAmyVoiceExperimentOutcome(profile.experimentVariants, {
    replayCount: outcome.replayCount,
    durationMs: outcome.durationMs,
    fallback: outcome.fallback,
  });
}

export function getAmyVoiceDeliverySnapshot(): {
  cohort: ReturnType<typeof getAmyVoiceCohortSnapshot>;
  experiments: ReturnType<typeof getAmyVoiceExperimentSnapshot>;
  governance: ReturnType<typeof getAmyVoiceGovernanceSnapshot>;
  invariants: ReturnType<typeof getAmyVoiceInvariantSnapshot>;
} {
  return {
    cohort: getAmyVoiceCohortSnapshot(),
    experiments: getAmyVoiceExperimentSnapshot(),
    governance: getAmyVoiceGovernanceSnapshot(),
    invariants: getAmyVoiceInvariantSnapshot(),
  };
}

export function resetAmyVoiceDeliveryProfileSession(): void {
  void import("@/lib/amy-voice-cohorts").then((m) => m.resetAmyVoiceCohortSession());
  void import("@/lib/amy-voice-experiments").then((m) => m.resetAmyVoiceExperimentMetrics());
}
