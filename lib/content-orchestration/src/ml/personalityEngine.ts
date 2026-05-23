import type { RealtimeEvent } from "../realtime/types.js";
import type { SessionFeedbackInput } from "../types-v2.js";
import {
  DEFAULT_TRAIT_VALUES,
  type PersonalityBehaviorBatch,
  type PersonalityDriftResult,
  type PersonalityLearningStyle,
  type PersonalityProfile,
  type PersonalitySnapshot,
  type PersonalityTraits,
} from "./types-personality.js";

/** Max per-update trait movement (slow evolution). */
const TRAIT_EMA_ALPHA = 0.12;
const DRIFT_THRESHOLD = 0.25;
const MIN_EVENTS_FOR_INFERENCE = 2;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function emaBlend(current: number, target: number, alpha = TRAIT_EMA_ALPHA): number {
  return clamp01(current * (1 - alpha) + target * alpha);
}

export function createDefaultPersonalityProfile(childId: string): PersonalityProfile {
  const now = new Date().toISOString();
  return {
    childId,
    traits: { ...DEFAULT_TRAIT_VALUES },
    learningStyle: {
      prefersRepetition: false,
      prefersExploration: true,
      pace: "medium",
    },
    version: 1,
    lastUpdated: now,
  };
}

export function ensurePersonalityProfile(
  existing: PersonalityProfile | null | undefined,
  childId: string,
): PersonalityProfile {
  if (existing && existing.childId === childId) return existing;
  return createDefaultPersonalityProfile(childId);
}

/**
 * Infer trait targets from a behavior batch (0–1 each).
 */
export function inferTraitsFromBehavior(
  batch: PersonalityBehaviorBatch,
): PersonalityTraits {
  const totalSignals =
    batch.skips +
    batch.rapidTaps +
    batch.explorationSuccesses +
    batch.retries +
    batch.rewardEngagements +
    batch.completions +
    1;

  const skipRate = batch.skips / totalSignals;
  const completionRate = batch.completions / totalSignals;
  const retryRate = batch.retries / totalSignals;
  const exploreRate = batch.explorationSuccesses / totalSignals;
  const rewardRate = batch.rewardEngagements / totalSignals;
  const rapidRate = batch.rapidTaps / totalSignals;

  return {
    curiosity: clamp01(0.35 + exploreRate * 0.55 + completionRate * 0.1),
    persistence: clamp01(0.3 + retryRate * 0.45 + completionRate * 0.35 - skipRate * 0.4),
    distractibility: clamp01(0.25 + rapidRate * 0.5 + skipRate * 0.35),
    challengeSeeking: clamp01(
      0.35 + completionRate * 0.35 + retryRate * 0.2 - skipRate * 0.25,
    ),
    rewardSensitivity: clamp01(0.3 + rewardRate * 0.55 + completionRate * 0.15),
  };
}

export function inferTraitsFromRealtimeEvents(events: RealtimeEvent[]): PersonalityTraits {
  const batch: PersonalityBehaviorBatch = {
    skips: 0,
    rapidTaps: 0,
    explorationSuccesses: 0,
    retries: 0,
    rewardEngagements: 0,
    completions: 0,
  };

  for (const e of events) {
    if (e.type === "CONTENT_SKIPPED") batch.skips += 1;
    if (e.type === "CONTENT_COMPLETED") {
      batch.completions += 1;
      if (e.metadata?.correct !== false) batch.explorationSuccesses += 0.5;
    }
    if (e.type === "RAPID_INTERACTION") {
      batch.rapidTaps += e.metadata?.tapCount ?? 1;
    }
    if (e.type === "USER_IDLE") batch.skips += 0.25;
    if ((e.metadata?.tapCount ?? 0) > 6) batch.retries += 1;
    if (e.metadata?.duration && e.metadata.duration < 3000 && e.type === "CONTENT_COMPLETED") {
      batch.rewardEngagements += 0.5;
    }
  }

  return inferTraitsFromBehavior(batch);
}

export function inferTraitsFromSessionFeedback(
  input: SessionFeedbackInput,
): PersonalityTraits {
  return inferTraitsFromBehavior({
    skips: input.skips,
    rapidTaps: input.timeSpentSec < 30 && input.completionRate > 0.5 ? 2 : 0,
    explorationSuccesses: input.completed && input.completionRate >= 0.8 ? 1 : 0,
    retries: input.retries,
    rewardEngagements: input.completed ? 1 : 0,
    completions: input.completed ? 1 : 0,
    sessionMinutes: input.timeSpentSec / 60,
  });
}

export function mergeTraitsSlowly(
  current: PersonalityTraits,
  inferred: PersonalityTraits,
): PersonalityTraits {
  return {
    curiosity: emaBlend(current.curiosity, inferred.curiosity),
    persistence: emaBlend(current.persistence, inferred.persistence),
    distractibility: emaBlend(current.distractibility, inferred.distractibility),
    challengeSeeking: emaBlend(current.challengeSeeking, inferred.challengeSeeking),
    rewardSensitivity: emaBlend(current.rewardSensitivity, inferred.rewardSensitivity),
  };
}

export function deriveLearningStyle(traits: PersonalityTraits): PersonalityLearningStyle {
  return {
    prefersRepetition: traits.persistence > 0.62 && traits.curiosity < 0.45,
    prefersExploration: traits.curiosity > 0.55,
    pace:
      traits.distractibility > 0.65
        ? "fast"
        : traits.persistence > 0.65
          ? "slow"
          : "medium",
  };
}

export function updatePersonalityFromBehavior(
  profile: PersonalityProfile,
  batch: PersonalityBehaviorBatch,
): PersonalityProfile {
  const signalCount =
    batch.skips +
    batch.completions +
    batch.retries +
    batch.explorationSuccesses +
    batch.rewardEngagements +
    batch.rapidTaps;
  if (signalCount < MIN_EVENTS_FOR_INFERENCE) return profile;

  const inferred = inferTraitsFromBehavior(batch);
  const traits = mergeTraitsSlowly(profile.traits, inferred);
  return {
    ...profile,
    traits,
    learningStyle: deriveLearningStyle(traits),
    version: profile.version + 1,
    lastUpdated: new Date().toISOString(),
  };
}

export function updatePersonalityFromEvents(
  profile: PersonalityProfile,
  events: RealtimeEvent[],
): PersonalityProfile {
  if (events.length < MIN_EVENTS_FOR_INFERENCE) return profile;
  const inferred = inferTraitsFromRealtimeEvents(events);
  const traits = mergeTraitsSlowly(profile.traits, inferred);
  return {
    ...profile,
    traits,
    learningStyle: deriveLearningStyle(traits),
    version: profile.version + 1,
    lastUpdated: new Date().toISOString(),
  };
}

export function updatePersonalityFromSessionFeedback(
  profile: PersonalityProfile,
  feedback: SessionFeedbackInput,
): PersonalityProfile {
  const inferred = inferTraitsFromSessionFeedback(feedback);
  const traits = mergeTraitsSlowly(profile.traits, inferred);
  return {
    ...profile,
    traits,
    learningStyle: deriveLearningStyle(traits),
    version: profile.version + 1,
    lastUpdated: new Date().toISOString(),
  };
}

export function personalitySnapshot(
  profile: PersonalityProfile,
): PersonalitySnapshot {
  return {
    curiosity: profile.traits.curiosity,
    persistence: profile.traits.persistence,
    distractibility: profile.traits.distractibility,
  };
}

export function traitL1Distance(a: PersonalityTraits, b: PersonalityTraits): number {
  return (
    Math.abs(a.curiosity - b.curiosity) +
    Math.abs(a.persistence - b.persistence) +
    Math.abs(a.distractibility - b.distractibility) +
    Math.abs(a.challengeSeeking - b.challengeSeeking) +
    Math.abs(a.rewardSensitivity - b.rewardSensitivity)
  );
}

/**
 * Detect significant personality drift; triggers temporary exploration + path re-eval.
 */
export function detectPersonalityDrift(
  previous: PersonalityTraits,
  next: PersonalityTraits,
): PersonalityDriftResult {
  const magnitude = traitL1Distance(previous, next) / 5;
  const drifted = magnitude >= DRIFT_THRESHOLD;
  return {
    drifted,
    magnitude,
    explorationBoost: drifted ? Math.min(0.2, magnitude * 0.35) : 0,
  };
}

export function applyPersonalityDriftResponse(
  profile: PersonalityProfile,
  previousTraits: PersonalityTraits,
  onDrift?: (result: PersonalityDriftResult) => void,
): { profile: PersonalityProfile; drift: PersonalityDriftResult } {
  const drift = detectPersonalityDrift(previousTraits, profile.traits);
  onDrift?.(drift);
  return { profile, drift };
}
