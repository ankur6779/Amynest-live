/**
 * Amy voice emotional intelligence — tone detection, adaptive prosody, session continuity.
 */

import type { AmyProsodyProfile, AmySpeechMode } from "@/lib/amy-speech-mode";
import type { AmyDifficultyLevel } from "@/lib/amy-voice-difficulty";
import {
  applyDifficultyProsody,
  mergeDifficultyEmotion,
} from "@/lib/amy-voice-difficulty";
import type { AmyIntent } from "@/lib/amy-voice-intent";
import {
  applyIntentToProsody,
  detectAmyIntent,
  resolveDeliveryEmotion,
} from "@/lib/amy-voice-intent";

export type AmyEmotion = "happy" | "encouraging" | "instructive" | "patient" | "neutral";

const HAPPY_RE =
  /\b(great|good job|well done|amazing|awesome|perfect|excellent|yay|woo|nice work|brilliant|super|fantastic|wonderful)\b/i;
const ENCOURAGING_RE =
  /\b(try again|keep going|you can|don't give up|almost|one more|another go|have another|keep trying|not yet|give it)\b/i;
const INSTRUCTIVE_RE =
  /\b(step|listen|look|count|add|subtract|plus|minus|times|divide|equals|first|remember|follow|find|write|read|solve)\b/i;
const TRANSITION_RE = /\b(then|next|after|now)\b/i;

let sessionEmotion: AmyEmotion = "neutral";
let sessionPlaybackRate = 1;

/** Detect emotional tone from text and speech mode. */
export function detectAmyEmotion(text: string, speechMode: AmySpeechMode): AmyEmotion {
  const t = (text ?? "").trim();
  if (!t) return "neutral";

  if (speechMode === "phonics" || speechMode === "spelling") return "patient";
  if (speechMode === "math" || speechMode === "number") return "instructive";

  if (HAPPY_RE.test(t)) return "happy";
  if (ENCOURAGING_RE.test(t)) return "encouraging";
  if (
    INSTRUCTIVE_RE.test(t) ||
    TRANSITION_RE.test(t) ||
    speechMode === "mixed" ||
    speechMode === "speech_coach"
  ) {
    return "instructive";
  }

  return "neutral";
}

const EMOTION_PROSODY: Record<
  AmyEmotion,
  { rateDelta: number; gapDelta: number; pauseScale: number }
> = {
  happy: { rateDelta: 0.03, gapDelta: -50, pauseScale: 0.85 },
  encouraging: { rateDelta: -0.05, gapDelta: 70, pauseScale: 1.2 },
  instructive: { rateDelta: -0.03, gapDelta: 55, pauseScale: 1.15 },
  patient: { rateDelta: -0.04, gapDelta: 20, pauseScale: 1.05 },
  neutral: { rateDelta: 0, gapDelta: 0, pauseScale: 1 },
};

function scalePauseMarker(marker: string, scale: number): string {
  if (scale <= 1 || !marker.includes("...")) return marker;
  if (scale >= 1.15) return marker.includes("... ...") ? marker : `${marker}${marker}`;
  return marker;
}

/** Apply emotional tone modifiers to a base prosody profile. */
export function applyEmotionToProsody(
  base: AmyProsodyProfile,
  emotion: AmyEmotion,
): AmyProsodyProfile {
  const mod = EMOTION_PROSODY[emotion];
  return {
    playbackRate: Math.min(1.08, Math.max(0.78, base.playbackRate + mod.rateDelta)),
    synthesisRate: Math.min(1.05, Math.max(0.75, base.synthesisRate + mod.rateDelta)),
    phonicsGapMs: Math.round(
      Math.max(95, Math.min(145, base.phonicsGapMs + (emotion === "patient" ? 5 : 0))),
    ),
    phraseGapMs: Math.round(Math.max(280, Math.min(680, base.phraseGapMs + mod.gapDelta))),
    pauseMarker: scalePauseMarker(base.pauseMarker, mod.pauseScale),
  };
}

/** Slow down and widen spacing on repeated plays for clarity. */
export function applyReplayProsody(
  base: AmyProsodyProfile,
  replayCount: number,
): AmyProsodyProfile {
  if (replayCount <= 1) return base;
  const extra = Math.min(replayCount - 1, 4);
  const rateDrop = 0.035 * extra;
  const gapBoost = 45 * extra;
  return {
    playbackRate: Math.max(0.75, base.playbackRate - rateDrop),
    synthesisRate: Math.max(0.72, base.synthesisRate - rateDrop),
    phonicsGapMs: Math.min(160, base.phonicsGapMs + Math.round(8 * extra)),
    phraseGapMs: Math.min(720, base.phraseGapMs + gapBoost),
    pauseMarker: scalePauseMarker(base.pauseMarker, 1 + extra * 0.08),
  };
}

/** Smooth session-wide tone — avoid abrupt pacing jumps between speaks. */
export function blendProsodyWithSessionTone(
  prosody: AmyProsodyProfile,
  emotion: AmyEmotion,
): AmyProsodyProfile {
  const blendedRate = sessionPlaybackRate * 0.35 + prosody.playbackRate * 0.65;
  sessionPlaybackRate = blendedRate;
  sessionEmotion = emotion;
  return {
    ...prosody,
    playbackRate: Math.round(blendedRate * 1000) / 1000,
    synthesisRate: Math.round((sessionPlaybackRate * 0.35 + prosody.synthesisRate * 0.65) * 1000) / 1000,
  };
}

export function getSessionAmyTone(): { emotion: AmyEmotion; playbackRate: number } {
  return { emotion: sessionEmotion, playbackRate: sessionPlaybackRate };
}

export function resetSessionAmyTone(): void {
  sessionEmotion = "neutral";
  sessionPlaybackRate = 1;
}

/** Micro-timing between semantic phrases — smooth instructional transitions. */
export function computePhraseTransitionGap(
  currentPhrase: string,
  nextPhrase: string,
  baseGapMs: number,
  emotion: AmyEmotion,
  intent?: AmyIntent,
): number {
  const currentWords = currentPhrase.split(/\s+/).filter(Boolean).length;
  const nextWords = nextPhrase.split(/\s+/).filter(Boolean).length;

  let gap = baseGapMs;

  if (currentWords <= 4 && nextWords <= 4) gap *= 0.72;
  else if (currentWords <= 6 && nextWords <= 6) gap *= 0.85;

  if (TRANSITION_RE.test(nextPhrase)) gap *= 1.28;
  if (TRANSITION_RE.test(currentPhrase)) gap *= 1.12;
  if (/\bstep\b/i.test(currentPhrase) || /\bstep\b/i.test(nextPhrase)) gap *= 1.18;

  if (emotion === "encouraging") gap += 65;
  else if (emotion === "instructive") gap += 45;
  else if (emotion === "happy") gap -= 35;
  else if (emotion === "patient") gap += 15;

  if (intent === "correction") gap += 40;
  else if (intent === "instruction") gap += 25;
  else if (intent === "feedback") gap -= 25;

  return Math.round(Math.max(280, Math.min(720, gap)));
}

export type AmyDeliveryProfile = {
  prosody: AmyProsodyProfile;
  emotion: AmyEmotion;
  intent: AmyIntent;
  difficulty: AmyDifficultyLevel;
};

/** Full adaptive delivery: emotion + intent + replay + difficulty + session tone. */
export function buildAdaptiveDelivery(
  base: AmyProsodyProfile,
  speechMode: AmySpeechMode,
  text: string,
  replayCount: number,
  intent?: AmyIntent,
  difficulty: AmyDifficultyLevel = "neutral",
): AmyDeliveryProfile {
  const detectedIntent = intent ?? detectAmyIntent(text, speechMode);
  const rawEmotion = detectAmyEmotion(text, speechMode);
  let emotion = resolveDeliveryEmotion(rawEmotion, detectedIntent);

  let prosody = applyEmotionToProsody(base, emotion);
  prosody = applyIntentToProsody(prosody, detectedIntent);
  prosody = applyReplayProsody(prosody, replayCount);

  const diff = applyDifficultyProsody(prosody, difficulty);
  prosody = diff.prosody;
  emotion = mergeDifficultyEmotion(emotion, difficulty, diff.preferEncouraging);

  prosody = blendProsodyWithSessionTone(prosody, emotion);

  return {
    prosody,
    emotion,
    intent: detectedIntent,
    difficulty,
  };
}

/** @deprecated Use buildAdaptiveDelivery */
export function buildAdaptiveProsody(
  base: AmyProsodyProfile,
  speechMode: AmySpeechMode,
  text: string,
  replayCount: number,
): { prosody: AmyProsodyProfile; emotion: AmyEmotion } {
  const delivery = buildAdaptiveDelivery(base, speechMode, text, replayCount);
  return { prosody: delivery.prosody, emotion: delivery.emotion };
}
