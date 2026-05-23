import type { AttentionState } from "../realtime/types.js";
import type { PersonalityProfile } from "../ml/types-personality.js";
import type { PredictionOutput } from "../ml/types-prediction.js";
import type { TeachingMode, TopicContext } from "./types.js";
import { isBoredomHigh, isFatigueHigh } from "../realtime/attentionEngine.js";

export type TeachingAdaptation = {
  complexity: "low" | "medium" | "high";
  style: "calm" | "playful" | "game";
  preferredMode: TeachingMode;
  shortenPrompts: boolean;
};

export function adaptTeachingStyle(input: {
  ctx: TopicContext;
  personality?: PersonalityProfile;
  prediction?: PredictionOutput;
  attention?: AttentionState;
  recentMistakes?: number;
  childAnswerFast?: boolean;
}): TeachingAdaptation {
  let complexity: TeachingAdaptation["complexity"] = "medium";
  let style: TeachingAdaptation["style"] = "calm";
  let preferredMode: TeachingMode = "explain";
  let shortenPrompts = false;

  const struggling =
    (input.recentMistakes ?? 0) >= 2 ||
    (input.prediction?.predictedDropOffRisk ?? 0) > 0.5 ||
    (input.attention && input.attention.focusLevel < 0.4);

  const bored = input.attention && isBoredomHigh(input.attention);
  const tired = input.attention && isFatigueHigh(input.attention);
  const fast =
    input.childAnswerFast ||
    (input.personality?.traits.persistence ?? 0) > 0.7;

  if (struggling || tired) {
    complexity = "low";
    preferredMode = "encourage";
    shortenPrompts = true;
  } else if (fast && !struggling) {
    complexity = "high";
    preferredMode = "ask";
  }

  if (bored) {
    style = "game";
    preferredMode = "encourage";
    shortenPrompts = true;
  } else if (input.personality?.traits.curiosity && input.personality.traits.curiosity > 0.65) {
    style = "playful";
    preferredMode = "ask";
  }

  if (input.personality?.traits.distractibility && input.personality.traits.distractibility > 0.65) {
    shortenPrompts = true;
  }

  if (input.personality?.traits.persistence && input.personality.traits.persistence > 0.7) {
    if (!struggling) complexity = "high";
  }

  if (input.prediction?.predictedEngagement && input.prediction.predictedEngagement < 0.45) {
    style = "game";
    preferredMode = "encourage";
  }

  return { complexity, style, preferredMode, shortenPrompts };
}

export function simplifyExplanation(text: string): string {
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  if (sentences.length <= 1) return text;
  return sentences[0]!.trim() + ".";
}

export function playfulWrap(text: string, style: TeachingAdaptation["style"]): string {
  if (style === "game") return `Let's play! ${text}`;
  if (style === "playful") return `Fun one — ${text}`;
  return text;
}
