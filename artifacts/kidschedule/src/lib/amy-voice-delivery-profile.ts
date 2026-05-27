/**
 * Unified Amy voice delivery profile — merges learning cohorts + A/B experiments.
 */

import type { AmyProsodyProfile } from "@/lib/amy-speech-mode";
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
  type AmyVoiceExperimentAssignment,
} from "@/lib/amy-voice-experiments";
import {
  clampAmyProsodyToInvariants,
  clampDeliveryModifiersToInvariants,
  getAmyVoiceInvariantSnapshot,
} from "@/lib/amy-voice-invariants";
import {
  bootstrapAmyVoiceGovernanceForRuntime,
  getAmyVoiceGovernanceSnapshot,
  getPromotedVariants,
} from "@/lib/amy-voice-governance";
import {
  getAmyVoicePersonalitySnapshot,
  resetAmyVoicePersonalitySession,
  stabilizeAmyVoiceDeliveryModifiers,
} from "@/lib/amy-voice-personality";
import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";

export type AmyVoiceDeliveryModifiers = {
  encouragementMultiplier: number;
  microHumanizeMultiplier: number;
  pacingRateDelta: number;
  pacingGapDelta: number;
  leadInStyle: "control" | "direct" | "conversational";
};

export type AmyVoiceDeliveryProfile = {
  cohortId: string;
  experimentVariants: AmyVoiceExperimentAssignment;
  modifiers: AmyVoiceDeliveryModifiers;
  guidanceTier: AmyVoiceCohortAdjustments["guidanceTier"];
  supportLevel: AmyVoiceCohortAdjustments["supportLevel"];
};

export type AmyVoiceDeliverySignals = {
  replayCount: number;
  difficulty: AmyDifficultyLevel;
  durationMs: number;
};

export type AmyVoiceRuntimeSnapshot = {
  at: number;
  health: import("@/lib/amy-voice-health").AmyVoiceHealthSnapshot;
  analytics: Omit<
    import("@/lib/amy-voice-analytics").AmyVoiceAnalyticsSnapshot,
    "delivery"
  >;
  governance: ReturnType<typeof getAmyVoiceGovernanceSnapshot>;
  experiments: ReturnType<typeof getAmyVoiceExperimentSnapshot>;
  deliveryProfile: AmyVoiceDeliveryProfile | null;
  promotedVariants: Partial<AmyVoiceExperimentAssignment>;
  invariants: ReturnType<typeof getAmyVoiceInvariantSnapshot>;
  personality: ReturnType<typeof getAmyVoicePersonalitySnapshot>;
};

const RUNTIME_SNAPSHOT_INTERVAL = 10;
let runtimeOutcomeCount = 0;
let lastDeliveryProfile: AmyVoiceDeliveryProfile | null = null;

export function isAmyVoiceFallbackLayer(layer?: AmyVoiceLayer | string): boolean {
  return (
    layer === "emergency_local" ||
    layer === "text_visual" ||
    layer === "phonics_sequence" ||
    layer === "speech_coach_split"
  );
}

/** Apply clamped cohort/experiment modifiers to adaptive prosody. */
export function applyAmyVoiceDeliveryModifiers(
  prosody: AmyProsodyProfile,
  modifiers: AmyVoiceDeliveryModifiers,
): AmyProsodyProfile {
  const clamped = clampDeliveryModifiersToInvariants(modifiers);
  let next: AmyProsodyProfile = {
    ...prosody,
    playbackRate: prosody.playbackRate + clamped.pacingRateDelta,
    synthesisRate: prosody.synthesisRate + clamped.pacingRateDelta,
    phraseGapMs: prosody.phraseGapMs + clamped.pacingGapDelta,
    phonicsGapMs: prosody.phonicsGapMs + Math.round(clamped.pacingGapDelta * 0.35),
  };

  if (clamped.encouragementMultiplier !== 1) {
    const rateFactor = 1 - (clamped.encouragementMultiplier - 1) * 0.04;
    next.playbackRate *= rateFactor;
    next.synthesisRate *= rateFactor;
    next.phraseGapMs += Math.round((clamped.encouragementMultiplier - 1) * 40);
  }

  if (clamped.microHumanizeMultiplier !== 1) {
    next.phraseGapMs += Math.round((clamped.microHumanizeMultiplier - 1) * 25);
  }

  return clampAmyProsodyToInvariants(next);
}

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
  bootstrapAmyVoiceGovernanceForRuntime();
  const cohort = getAmyVoiceCohortAdjustments({
    replayCount: signals.replayCount,
    difficulty: signals.difficulty,
    durationMs: signals.durationMs ?? 0,
  });
  const experimentVariants = getAmyVoiceExperimentAssignment();
  const experiment = getAmyVoiceExperimentModifiers(experimentVariants);
  const merged = clampMergedModifiers(mergeModifiers(cohort, experiment));
  const stabilized = stabilizeAmyVoiceDeliveryModifiers(merged);

  const profile: AmyVoiceDeliveryProfile = {
    cohortId: cohort.cohortId,
    experimentVariants,
    modifiers: stabilized.modifiers,
    guidanceTier: cohort.guidanceTier,
    supportLevel: cohort.supportLevel,
  };
  lastDeliveryProfile = profile;
  return profile;
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
  runtimeOutcomeCount += 1;
  if (runtimeOutcomeCount % RUNTIME_SNAPSHOT_INTERVAL === 0) {
    void import("@/lib/amy-voice-telemetry").then((m) =>
      m.reportAmyVoiceRuntimeSnapshot({ trigger: "batched_outcomes" }),
    );
  }
}

export async function getAmyVoiceRuntimeSnapshot(): Promise<AmyVoiceRuntimeSnapshot> {
  bootstrapAmyVoiceGovernanceForRuntime();
  const [{ getAmyVoiceHealthSnapshot }, { getAmyVoiceAnalyticsSnapshot }] = await Promise.all([
    import("@/lib/amy-voice-health"),
    import("@/lib/amy-voice-analytics"),
  ]);
  const analytics = getAmyVoiceAnalyticsSnapshot();
  const { delivery: _delivery, ...analyticsCore } = analytics;

  return {
    at: Date.now(),
    health: getAmyVoiceHealthSnapshot(),
    analytics: analyticsCore,
    governance: getAmyVoiceGovernanceSnapshot(),
    experiments: getAmyVoiceExperimentSnapshot(),
    deliveryProfile: lastDeliveryProfile,
    promotedVariants: getPromotedVariants(),
    invariants: getAmyVoiceInvariantSnapshot(),
    personality: getAmyVoicePersonalitySnapshot(),
  };
}

export function getLastAmyVoiceDeliveryProfile(): AmyVoiceDeliveryProfile | null {
  return lastDeliveryProfile;
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
  runtimeOutcomeCount = 0;
  lastDeliveryProfile = null;
  resetAmyVoicePersonalitySession();
  void import("@/lib/amy-voice-cohorts").then((m) => m.resetAmyVoiceCohortSession());
  void import("@/lib/amy-voice-experiments").then((m) => m.resetAmyVoiceExperimentMetrics());
}
