/**
 * Amy voice intent detection — instruction, feedback, correction, attention.
 */

import type { AmyEmotion } from "@/lib/amy-voice-emotion";
import type { AmyProsodyProfile, AmySpeechMode } from "@/lib/amy-speech-mode";

export type AmyIntent = "instruction" | "feedback" | "correction" | "attention" | "neutral";

const FEEDBACK_RE =
  /\b(good job|well done|great work|amazing|awesome|perfect|excellent|nice work|brilliant|fantastic|wonderful|super job|yay|woo hoo)\b/i;
const CORRECTION_RE =
  /\b(try again|not quite|almost there|let's fix|let's try|one more time|give it another|keep trying|not yet|correct it|mistake|wrong answer)\b/i;
const ATTENTION_RE =
  /\b(listen|look here|watch|pay attention|eyes on|are you ready|focus|wait|listen carefully|look at)\b/i;
const INSTRUCTION_RE =
  /\b(step|count|add|subtract|write|read|find|follow|solve|say|spell|tap|click|press|put|take|make|show|tell)\b/i;

/** Classify communicative intent from text and speech mode. */
export function detectAmyIntent(text: string, speechMode: AmySpeechMode): AmyIntent {
  const t = (text ?? "").trim();
  if (!t) return "neutral";

  if (ATTENTION_RE.test(t)) return "attention";
  if (CORRECTION_RE.test(t)) return "correction";
  if (FEEDBACK_RE.test(t)) return "feedback";
  if (
    INSTRUCTION_RE.test(t) ||
    speechMode === "math" ||
    speechMode === "number" ||
    speechMode === "mixed" ||
    speechMode === "speech_coach"
  ) {
    return "instruction";
  }

  return "neutral";
}

/** Resolve emotion + intent into one coherent delivery tone. */
export function resolveDeliveryEmotion(emotion: AmyEmotion, intent: AmyIntent): AmyEmotion {
  switch (intent) {
    case "correction":
      return "encouraging";
    case "feedback":
      return emotion === "encouraging" ? "encouraging" : "happy";
    case "attention":
      return "instructive";
    case "instruction":
      if (emotion === "happy") return "instructive";
      return emotion === "neutral" ? "instructive" : emotion;
    default:
      return emotion;
  }
}

const INTENT_PROSODY: Record<
  AmyIntent,
  { rateDelta: number; gapDelta: number; pauseScale: number }
> = {
  instruction: { rateDelta: -0.02, gapDelta: 40, pauseScale: 1.1 },
  feedback: { rateDelta: 0.02, gapDelta: -30, pauseScale: 0.9 },
  correction: { rateDelta: -0.04, gapDelta: 55, pauseScale: 1.15 },
  attention: { rateDelta: -0.05, gapDelta: 35, pauseScale: 1.12 },
  neutral: { rateDelta: 0, gapDelta: 0, pauseScale: 1 },
};

function scalePauseMarker(marker: string, scale: number): string {
  if (scale <= 1 || !marker.includes("...")) return marker;
  if (scale >= 1.12 && !marker.includes("... ...")) {
    return marker.includes("...") ? `${marker}${marker}` : " ... ";
  }
  return marker;
}

/** Apply intent-specific pacing on top of emotion-adjusted prosody. */
export function applyIntentToProsody(base: AmyProsodyProfile, intent: AmyIntent): AmyProsodyProfile {
  const mod = INTENT_PROSODY[intent];
  return {
    playbackRate: Math.min(1.06, Math.max(0.74, base.playbackRate + mod.rateDelta)),
    synthesisRate: Math.min(1.03, Math.max(0.72, base.synthesisRate + mod.rateDelta)),
    phonicsGapMs: Math.round(Math.max(95, Math.min(165, base.phonicsGapMs + mod.gapDelta / 4))),
    phraseGapMs: Math.round(Math.max(260, Math.min(740, base.phraseGapMs + mod.gapDelta))),
    pauseMarker: scalePauseMarker(base.pauseMarker, mod.pauseScale),
  };
}

/** Link consecutive phrases with natural conversational transitions. */
export function linkConversationalPhrases(phrases: string[], intent: AmyIntent): string[] {
  if (phrases.length <= 1) return phrases;

  return phrases.map((raw, index) => {
    const p = raw.trim();
    if (index === 0) return p;
    if (/^(now|let's|next|again|then|okay)\b/i.test(p)) return p;

    const lower = p.charAt(0).toLowerCase() + p.slice(1);
    switch (intent) {
      case "correction":
        return `Let's try again. ${lower}`;
      case "feedback":
        return p;
      case "attention":
        return `Now, ${lower}`;
      case "instruction":
        return index === 1 ? `Now, ${lower}` : `Next, ${lower}`;
      default:
        return `Now, ${lower}`;
    }
  });
}

/** Fewer segments when the learner is struggling. */
export function simplifyPhrasesForDifficulty(phrases: string[], struggling: boolean): string[] {
  if (!struggling || phrases.length <= 2) return phrases;

  const mid = Math.ceil(phrases.length / 2);
  const merge = (slice: string[]) =>
    slice
      .join(" ")
      .replace(/\s\.\.\.\s/g, ", ")
      .replace(/\s+/g, " ")
      .trim();

  return [merge(phrases.slice(0, mid)), merge(phrases.slice(mid))].filter(Boolean);
}
