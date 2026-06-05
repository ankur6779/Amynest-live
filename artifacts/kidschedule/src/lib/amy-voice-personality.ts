/**
 * Amy voice personality baseline — prevents long-term behavioral drift while
 * allowing experiments and governance to evolve delivery safely.
 */

import type { AmyProsodyProfile } from "@/lib/amy-speech-mode";
import type { AmyVoiceDeliveryModifiers } from "@/lib/amy-voice-delivery-profile";
import { clampDeliveryModifiersToInvariants } from "@/lib/amy-voice-invariants";

/** Amy's recognizable teaching personality — narrower than hard invariants. */
export const AMY_PERSONALITY_BASELINE = {
  /** Expected delivery modifier targets and acceptable personality bands. */
  modifiers: {
    encouragementMultiplier: { target: 1, min: 0.88, max: 1.12 },
    microHumanizeMultiplier: { target: 1, min: 0.92, max: 1.08 },
    pacingRateDelta: { target: 0, min: -0.025, max: 0.02 },
    pacingGapDelta: { target: 0, min: -18, max: 24 },
    leadInStyle: "control" as const,
  },
  /** Expected prosody tone range after adaptive delivery. */
  prosody: {
    playbackRate: { target: 1, min: 0.9, max: 1.02 },
    synthesisRate: { target: 1, min: 0.9, max: 1.02 },
    phraseGapMs: { target: 420, min: 340, max: 520 },
    phonicsGapMs: { target: 130, min: 110, max: 150 },
  },
  validation: {
    /** Validate personality drift every N speaks in a session. */
    validateEverySpeaks: 8,
    /** Run an initial check at session start. */
    validateOnSessionStart: true,
    /** Normalized drift above this triggers soft correction (0–1 scale). */
    driftThreshold: 0.14,
    /** Gentle pull toward baseline per correction — never abrupt. */
    softCorrectionBlend: 0.16,
    /** Cap correction strength so stabilizer stays subtle. */
    maxCorrectionBlend: 0.28,
    /** Rolling window for session-average drift comparison. */
    sessionAverageWindow: 12,
  },
} as const;

export type PersonalityDriftMetric = {
  key: keyof AmyVoiceDeliveryModifiers;
  value: number;
  target: number;
  drift: number;
};

export type PersonalityValidationResult = {
  at: number;
  sessionSpeakCount: number;
  driftScore: number;
  threshold: number;
  exceededThreshold: boolean;
  corrected: boolean;
  metrics: PersonalityDriftMetric[];
  correctionBlend: number;
};

export type AmyVoicePersonalitySnapshot = {
  baseline: typeof AMY_PERSONALITY_BASELINE;
  sessionSpeakCount: number;
  sessionAverage: AmyVoiceDeliveryModifiers | null;
  lastValidation: PersonalityValidationResult | null;
  correctionCount: number;
};

const NUMERIC_MODIFIER_KEYS: Array<
  keyof Pick<
    AmyVoiceDeliveryModifiers,
    | "encouragementMultiplier"
    | "microHumanizeMultiplier"
    | "pacingRateDelta"
    | "pacingGapDelta"
  >
> = [
  "encouragementMultiplier",
  "microHumanizeMultiplier",
  "pacingRateDelta",
  "pacingGapDelta",
];

let sessionSpeakCount = 0;
let correctionCount = 0;
const sessionModifierSamples: AmyVoiceDeliveryModifiers[] = [];
let lastValidation: PersonalityValidationResult | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function baselineTargetModifiers(): AmyVoiceDeliveryModifiers {
  const baseline = AMY_PERSONALITY_BASELINE.modifiers;
  return {
    encouragementMultiplier: baseline.encouragementMultiplier.target,
    microHumanizeMultiplier: baseline.microHumanizeMultiplier.target,
    pacingRateDelta: baseline.pacingRateDelta.target,
    pacingGapDelta: baseline.pacingGapDelta.target,
    leadInStyle: baseline.leadInStyle,
  };
}

function measureModifierDrift(
  modifiers: AmyVoiceDeliveryModifiers,
): { score: number; metrics: PersonalityDriftMetric[] } {
  const baseline = AMY_PERSONALITY_BASELINE.modifiers;
  const metrics: PersonalityDriftMetric[] = NUMERIC_MODIFIER_KEYS.map((key) => {
    const band = baseline[key];
    const span = Math.max(band.max - band.min, 0.001);
    const value = modifiers[key];
    let drift = 0;
    if (value < band.min) drift = (band.min - value) / span;
    else if (value > band.max) drift = (value - band.max) / span;
    return { key, value, target: band.target, drift };
  });

  return {
    score: Math.max(...metrics.map((metric) => metric.drift)),
    metrics,
  };
}

function averageSessionModifiers(): AmyVoiceDeliveryModifiers | null {
  if (sessionModifierSamples.length === 0) return null;

  const totals = {
    encouragementMultiplier: 0,
    microHumanizeMultiplier: 0,
    pacingRateDelta: 0,
    pacingGapDelta: 0,
  };

  for (const sample of sessionModifierSamples) {
    totals.encouragementMultiplier += sample.encouragementMultiplier;
    totals.microHumanizeMultiplier += sample.microHumanizeMultiplier;
    totals.pacingRateDelta += sample.pacingRateDelta;
    totals.pacingGapDelta += sample.pacingGapDelta;
  }

  const count = sessionModifierSamples.length;
  return {
    encouragementMultiplier: totals.encouragementMultiplier / count,
    microHumanizeMultiplier: totals.microHumanizeMultiplier / count,
    pacingRateDelta: totals.pacingRateDelta / count,
    pacingGapDelta: totals.pacingGapDelta / count,
    leadInStyle: sessionModifierSamples[sessionModifierSamples.length - 1]!.leadInStyle,
  };
}

function shouldValidatePersonality(): boolean {
  const policy = AMY_PERSONALITY_BASELINE.validation;
  if (sessionSpeakCount === 1 && policy.validateOnSessionStart) return true;
  return sessionSpeakCount % policy.validateEverySpeaks === 0;
}

function computeCorrectionBlend(driftScore: number): number {
  const { driftThreshold, softCorrectionBlend, maxCorrectionBlend } =
    AMY_PERSONALITY_BASELINE.validation;
  if (driftScore <= driftThreshold) return 0;

  const excess = (driftScore - driftThreshold) / Math.max(1 - driftThreshold, 0.001);
  return clamp(softCorrectionBlend + excess * 0.08, softCorrectionBlend, maxCorrectionBlend);
}

/** Gently pull modifiers toward baseline — stabilizer, not controller. */
export function softCorrectModifiersTowardBaseline(
  modifiers: AmyVoiceDeliveryModifiers,
  blend: number,
): AmyVoiceDeliveryModifiers {
  const target = baselineTargetModifiers();
  const t = clamp(blend, 0, AMY_PERSONALITY_BASELINE.validation.maxCorrectionBlend);

  return clampDeliveryModifiersToInvariants({
    encouragementMultiplier: lerp(modifiers.encouragementMultiplier, target.encouragementMultiplier, t),
    microHumanizeMultiplier: lerp(modifiers.microHumanizeMultiplier, target.microHumanizeMultiplier, t),
    pacingRateDelta: lerp(modifiers.pacingRateDelta, target.pacingRateDelta, t),
    pacingGapDelta: lerp(modifiers.pacingGapDelta, target.pacingGapDelta, t),
    leadInStyle: modifiers.leadInStyle,
  });
}

export function measureAmyVoicePersonalityDrift(
  modifiers: AmyVoiceDeliveryModifiers,
): PersonalityValidationResult {
  const { score, metrics } = measureModifierDrift(modifiers);
  const threshold = AMY_PERSONALITY_BASELINE.validation.driftThreshold;

  return {
    at: Date.now(),
    sessionSpeakCount,
    driftScore: score,
    threshold,
    exceededThreshold: score > threshold,
    corrected: false,
    metrics,
    correctionBlend: 0,
  };
}

/** Record a delivery sample and optionally apply soft personality stabilization. */
export function stabilizeAmyVoiceDeliveryModifiers(
  modifiers: AmyVoiceDeliveryModifiers,
): {
  modifiers: AmyVoiceDeliveryModifiers;
  validation: PersonalityValidationResult | null;
} {
  sessionSpeakCount += 1;
  sessionModifierSamples.push({ ...modifiers });
  while (sessionModifierSamples.length > AMY_PERSONALITY_BASELINE.validation.sessionAverageWindow) {
    sessionModifierSamples.shift();
  }

  if (!shouldValidatePersonality()) {
    return { modifiers, validation: null };
  }

  const comparison = averageSessionModifiers() ?? modifiers;
  const validation = measureAmyVoicePersonalityDrift(comparison);
  lastValidation = validation;

  if (!validation.exceededThreshold) {
    return { modifiers, validation };
  }

  const blend = computeCorrectionBlend(validation.driftScore);
  const stabilized = softCorrectModifiersTowardBaseline(modifiers, blend);
  correctionCount += 1;

  const correctedValidation: PersonalityValidationResult = {
    ...validation,
    corrected: true,
    correctionBlend: blend,
  };
  lastValidation = correctedValidation;

  if (import.meta.env.DEV) {
    console.info("[AMY VOICE]", "personality_stabilize", {
      driftScore: validation.driftScore,
      blend,
      before: modifiers,
      after: stabilized,
    });
  }

  return { modifiers: stabilized, validation: correctedValidation };
}

/** Compare resolved prosody against baseline tone range (diagnostic only). */
export function measureAmyProsodyPersonalityDrift(prosody: AmyProsodyProfile): number {
  const baseline = AMY_PERSONALITY_BASELINE.prosody;
  const drifts = [
    Math.abs(prosody.playbackRate - baseline.playbackRate.target) /
      Math.max(baseline.playbackRate.max - baseline.playbackRate.min, 0.001),
    Math.abs(prosody.phraseGapMs - baseline.phraseGapMs.target) /
      Math.max(baseline.phraseGapMs.max - baseline.phraseGapMs.min, 0.001),
  ];
  return Math.max(...drifts);
}

export function getAmyVoicePersonalitySnapshot(): AmyVoicePersonalitySnapshot {
  return {
    baseline: AMY_PERSONALITY_BASELINE,
    sessionSpeakCount,
    sessionAverage: averageSessionModifiers(),
    lastValidation,
    correctionCount,
  };
}

export function resetAmyVoicePersonalitySession(): void {
  sessionSpeakCount = 0;
  correctionCount = 0;
  sessionModifierSamples.length = 0;
  lastValidation = null;
}
