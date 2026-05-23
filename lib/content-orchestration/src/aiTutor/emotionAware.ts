import type { AttentionState } from "../realtime/types.js";
import type { ChildAnswerEvaluation } from "./types.js";
import type { TeachingMode } from "./types.js";
import { isBoredomHigh, isFatigueHigh } from "../realtime/attentionEngine.js";

export type EmotionSignal = "frustration" | "success" | "neutral" | "bored";

export function detectEmotion(
  attention: AttentionState | undefined,
  evaluation?: ChildAnswerEvaluation,
  recentMistakes = 0,
): EmotionSignal {
  if (evaluation?.correct) return "success";
  if (
    recentMistakes >= 2 ||
    (attention && (isFatigueHigh(attention) || attention.focusLevel < 0.35))
  ) {
    return "frustration";
  }
  if (attention && isBoredomHigh(attention)) return "bored";
  return "neutral";
}

export function emotionToMode(emotion: EmotionSignal): TeachingMode {
  if (emotion === "frustration" || emotion === "bored") return "encourage";
  if (emotion === "success") return "encourage";
  return "explain";
}

export function buildEmotionAwareMessage(
  emotion: EmotionSignal,
  baseMessage: string,
): string {
  switch (emotion) {
    case "frustration":
      return `It's okay — we can do this together. ${baseMessage}`;
    case "bored":
      return `Let's make it fun! ${baseMessage}`;
    case "success":
      return `Great job! ${baseMessage}`;
    default:
      return baseMessage;
  }
}
