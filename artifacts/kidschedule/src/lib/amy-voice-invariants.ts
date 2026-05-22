/**
 * Amy voice core invariants — protected rules experiments and cohorts cannot override.
 */

import type { AmyProsodyProfile, AmySpeechMode, AmySpeechPolicy } from "@/lib/amy-speech-mode";
import type { AmyVoiceDeliveryModifiers } from "@/lib/amy-voice-delivery-profile";

/** Protected behavior contract for Amy voice at scale. */
export const AMY_VOICE_INVARIANTS = {
  /** Sentence-like modes must never route through phonics sequence fallback. */
  sentenceModesNoPhonics: [
    "sentence",
    "speech_coach",
    "mixed",
    "math",
    "number",
    "word",
  ] as const satisfies readonly AmySpeechMode[],
  /** Pipeline must always reach audible or visual fallback — never silent. */
  requireAudibleFallback: true,
  maxInstructionPauses: 2,
  maxProsodyDeviationRatio: 0.11,
  minPlaybackRate: 0.72,
  maxPlaybackRate: 1.08,
  minEncouragementMultiplier: 0.65,
  maxEncouragementMultiplier: 1.4,
  minMicroHumanizeMultiplier: 0.7,
  maxMicroHumanizeMultiplier: 1.25,
  minPacingRateDelta: -0.07,
  maxPacingRateDelta: 0.05,
  minPacingGapDelta: -50,
  maxPacingGapDelta: 80,
} as const;

const SENTENCE_MODES = new Set<AmySpeechMode>(AMY_VOICE_INVARIANTS.sentenceModesNoPhonics);
const PAUSE_TOKEN_RE = /\s*(?:…|\.\.\.)\s*/g;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Count instructional pause markers in normalized phrase text. */
export function countInstructionPauses(text: string): number {
  const matches = text.match(PAUSE_TOKEN_RE);
  return matches?.length ?? 0;
}

/** Cap pause markers to invariant maximum. */
export function capInstructionPauses(text: string, max = AMY_VOICE_INVARIANTS.maxInstructionPauses): string {
  let seen = 0;
  return text.replace(PAUSE_TOKEN_RE, (match) => {
    seen += 1;
    return seen <= max ? match : " ";
  });
}

/** Clamp prosody rates and gaps to protected bounds after live delivery tuning. */
export function clampAmyProsodyToInvariants(prosody: AmyProsodyProfile): AmyProsodyProfile {
  return clampProsody(prosody);
}

function clampProsody(prosody: AmyProsodyProfile): AmyProsodyProfile {
  return {
    ...prosody,
    playbackRate: clamp(
      prosody.playbackRate,
      AMY_VOICE_INVARIANTS.minPlaybackRate,
      AMY_VOICE_INVARIANTS.maxPlaybackRate,
    ),
    synthesisRate: clamp(
      prosody.synthesisRate,
      AMY_VOICE_INVARIANTS.minPlaybackRate,
      AMY_VOICE_INVARIANTS.maxPlaybackRate,
    ),
    phraseGapMs: clamp(prosody.phraseGapMs, 240, 760),
    phonicsGapMs: clamp(prosody.phonicsGapMs, 100, 170),
  };
}

/** Clamp cohort/experiment modifiers so they cannot violate tone and pacing bounds. */
export function clampDeliveryModifiersToInvariants(
  modifiers: AmyVoiceDeliveryModifiers,
): AmyVoiceDeliveryModifiers {
  return {
    encouragementMultiplier: clamp(
      modifiers.encouragementMultiplier,
      AMY_VOICE_INVARIANTS.minEncouragementMultiplier,
      AMY_VOICE_INVARIANTS.maxEncouragementMultiplier,
    ),
    microHumanizeMultiplier: clamp(
      modifiers.microHumanizeMultiplier,
      AMY_VOICE_INVARIANTS.minMicroHumanizeMultiplier,
      AMY_VOICE_INVARIANTS.maxMicroHumanizeMultiplier,
    ),
    pacingRateDelta: clamp(
      modifiers.pacingRateDelta,
      AMY_VOICE_INVARIANTS.minPacingRateDelta,
      AMY_VOICE_INVARIANTS.maxPacingRateDelta,
    ),
    pacingGapDelta: clamp(
      modifiers.pacingGapDelta,
      AMY_VOICE_INVARIANTS.minPacingGapDelta,
      AMY_VOICE_INVARIANTS.maxPacingGapDelta,
    ),
    leadInStyle: modifiers.leadInStyle,
  };
}

/** Apply protected invariants to speech policy before any pipeline layer runs. */
export function enforceAmySpeechPolicyInvariants(policy: AmySpeechPolicy): AmySpeechPolicy {
  const next: AmySpeechPolicy = {
    ...policy,
    phrases: [...policy.phrases],
    prosody: clampProsody(policy.prosody),
  };

  if (SENTENCE_MODES.has(next.speechMode)) {
    next.allowPhonicsSequence = false;
    next.allowPhonicsFallback = false;
  }

  next.phrases = next.phrases.map((phrase) => capInstructionPauses(phrase));
  next.normalizedText =
    next.phrases.length === 1
      ? next.phrases[0]!
      : next.phrases.join(next.prosody.pauseMarker);

  return next;
}

export function getAmyVoiceInvariantSnapshot(): {
  invariants: typeof AMY_VOICE_INVARIANTS;
  enforced: true;
} {
  return { invariants: AMY_VOICE_INVARIANTS, enforced: true };
}
