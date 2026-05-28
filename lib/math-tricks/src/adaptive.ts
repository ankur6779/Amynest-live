/**
 * Adaptive Learning Intelligence (Phase 4) — framework-agnostic.
 *
 * We observe lightweight, privacy-safe interaction signals (no PII, no network)
 * and derive a calm *adaptation profile* that nudges pacing, narration density,
 * symbolic complexity and scaffolding. The goal is emotional safety: a
 * struggling child gets slower, more concrete, more narrated support; a
 * confident child gets faster, more symbolic, lighter scaffolding.
 *
 * Pure functions only — trivially testable and reusable on any platform.
 */

export interface ChildLearningSignals {
  /** Rolling average hesitation before acting (ms). */
  hesitationMs: number;
  /** Total retries / wrong attempts this session. */
  retries: number;
  /** 0 (unsure) … 1 (confident). */
  confidenceEstimate: number;
  /** 0 (concrete) … 1 (ready for symbols). */
  abstractionLevel: number;
  /** 0 (calm) … 1 (at risk of frustration). */
  frustrationRisk: number;
  /** How many events have shaped these signals. */
  samples: number;
}

export type LearningSignalEvent =
  | { type: "hesitation"; ms: number }
  | { type: "retry" }
  | { type: "correct"; firstTry?: boolean }
  | { type: "incorrect" }
  | { type: "rapid_guess" }
  | { type: "abandon" }
  | { type: "thinking_replay" }
  | { type: "hint" }
  | { type: "abstraction_up" }
  | { type: "abstraction_down" };

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** Age-aware starting point — older children begin more abstract & confident. */
export function createLearningSignals(ageYears: number): ChildLearningSignals {
  const abstractionLevel = ageYears <= 4 ? 0.1 : ageYears <= 6 ? 0.45 : 0.8;
  return {
    hesitationMs: 0,
    retries: 0,
    confidenceEstimate: 0.5,
    abstractionLevel,
    frustrationRisk: 0.15,
    samples: 0,
  };
}

/** Long hesitation (relative to age expectation) signals struggle. */
function hesitationPressure(ms: number): number {
  if (ms <= 1500) return -0.05; // quick & deliberate → slightly calmer
  if (ms <= 4000) return 0.05;
  if (ms <= 8000) return 0.15;
  return 0.28;
}

export function applyLearningSignal(
  prev: ChildLearningSignals,
  event: LearningSignalEvent,
): ChildLearningSignals {
  const s: ChildLearningSignals = { ...prev, samples: prev.samples + 1 };

  switch (event.type) {
    case "hesitation": {
      // Exponential moving average keeps it stable.
      s.hesitationMs = prev.hesitationMs === 0 ? event.ms : Math.round(prev.hesitationMs * 0.6 + event.ms * 0.4);
      const p = hesitationPressure(event.ms);
      s.frustrationRisk = clamp01(prev.frustrationRisk + p);
      if (p > 0.1) s.confidenceEstimate = clamp01(prev.confidenceEstimate - 0.05);
      break;
    }
    case "retry":
      s.retries = prev.retries + 1;
      s.frustrationRisk = clamp01(prev.frustrationRisk + 0.12);
      s.confidenceEstimate = clamp01(prev.confidenceEstimate - 0.08);
      break;
    case "incorrect":
      s.frustrationRisk = clamp01(prev.frustrationRisk + 0.16);
      s.confidenceEstimate = clamp01(prev.confidenceEstimate - 0.12);
      break;
    case "correct":
      s.confidenceEstimate = clamp01(prev.confidenceEstimate + (event.firstTry ? 0.18 : 0.1));
      s.frustrationRisk = clamp01(prev.frustrationRisk - (event.firstTry ? 0.18 : 0.1));
      if (event.firstTry) s.abstractionLevel = clamp01(prev.abstractionLevel + 0.05);
      break;
    case "rapid_guess":
      // Guessing without thinking — confidence is shallow, nudge more scaffolding.
      s.confidenceEstimate = clamp01(prev.confidenceEstimate - 0.06);
      s.frustrationRisk = clamp01(prev.frustrationRisk + 0.08);
      break;
    case "abandon":
      s.frustrationRisk = clamp01(prev.frustrationRisk + 0.2);
      s.confidenceEstimate = clamp01(prev.confidenceEstimate - 0.1);
      break;
    case "thinking_replay":
      // Wanting the reasoning again is healthy, but means more support helps.
      s.frustrationRisk = clamp01(prev.frustrationRisk + 0.04);
      s.abstractionLevel = clamp01(prev.abstractionLevel - 0.05);
      break;
    case "hint":
      s.frustrationRisk = clamp01(prev.frustrationRisk + 0.06);
      break;
    case "abstraction_up":
      s.abstractionLevel = clamp01(prev.abstractionLevel + 0.1);
      break;
    case "abstraction_down":
      s.abstractionLevel = clamp01(prev.abstractionLevel - 0.1);
      break;
  }

  return s;
}

export interface AdaptationProfile {
  /** Multiplier on base step pacing — >1 slower (calmer), <1 faster. */
  stepDurationScale: number;
  narrationDensity: "low" | "normal" | "high";
  /** 0 (concrete only) … 1 (symbolic-first). Gates equation scaffolding. */
  abstractionLevel: number;
  scaffoldingLevel: "minimal" | "normal" | "strong";
  /** Suggested object-count multiplier for interactive activities. */
  objectCountScale: number;
  hintFrequency: "low" | "normal" | "high";
}

/**
 * Blend an age baseline with live signals. Frustration pulls everything toward
 * calm + concrete + heavily-narrated; confidence pulls toward fast + symbolic +
 * light. Always stays within emotionally-safe bounds.
 */
export function deriveAdaptationProfile(
  signals: ChildLearningSignals,
  ageYears: number,
): AdaptationProfile {
  const baseDuration = ageYears <= 4 ? 1.15 : ageYears <= 6 ? 1.0 : 0.85;

  const struggling = signals.frustrationRisk >= 0.6 || signals.retries >= 3;
  const confident =
    signals.confidenceEstimate >= 0.7 && signals.frustrationRisk <= 0.35 && signals.retries === 0;

  let stepDurationScale = baseDuration;
  let abstractionLevel = signals.abstractionLevel;
  let scaffoldingLevel: AdaptationProfile["scaffoldingLevel"] =
    ageYears <= 4 ? "strong" : ageYears <= 6 ? "normal" : "minimal";
  let narrationDensity: AdaptationProfile["narrationDensity"] =
    ageYears <= 4 ? "high" : ageYears <= 6 ? "normal" : "low";
  let hintFrequency: AdaptationProfile["hintFrequency"] = "normal";
  let objectCountScale = 1;

  if (struggling) {
    stepDurationScale = Math.min(baseDuration * 1.4, 1.8);
    abstractionLevel = clamp01(abstractionLevel - 0.3);
    scaffoldingLevel = "strong";
    narrationDensity = "high";
    hintFrequency = "high";
    objectCountScale = 0.75;
  } else if (confident) {
    stepDurationScale = Math.max(baseDuration * 0.8, 0.6);
    abstractionLevel = clamp01(abstractionLevel + 0.2);
    scaffoldingLevel = "minimal";
    narrationDensity = "low";
    hintFrequency = "low";
    objectCountScale = 1;
  }

  return {
    stepDurationScale: Number(stepDurationScale.toFixed(2)),
    narrationDensity,
    abstractionLevel: Number(abstractionLevel.toFixed(2)),
    scaffoldingLevel,
    objectCountScale,
    hintFrequency,
  };
}
