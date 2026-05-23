import type { TeachingMode, ConversationTurn, TutorState } from "./types.js";
import type { GeneratedQuestion } from "./questionEngine.js";
import type { TeachingAdaptation } from "./adaptiveTeaching.js";
import { simplifyExplanation, playfulWrap } from "./adaptiveTeaching.js";
import { truncateForSafety } from "./voiceEngine.js";
import type { EmotionSignal } from "./emotionAware.js";
import { buildEmotionAwareMessage } from "./emotionAware.js";

export type FlowPhase = "explain" | "ask" | "evaluate" | "adapt" | "continue";

export function nextFlowPhase(
  state: TutorState,
  evaluation?: { correct: boolean },
): FlowPhase {
  const last = state.teachingMode;
  if (last === "explain") return "ask";
  if (last === "ask" && evaluation === undefined) return "evaluate";
  if (last === "ask" && evaluation) {
    return evaluation.correct ? "continue" : "adapt";
  }
  if (last === "correct" || last === "encourage") return "ask";
  return "explain";
}

export function buildExplainMessage(
  topic: string,
  adaptation: TeachingAdaptation,
  emotion: EmotionSignal,
): { text: string; mode: TeachingMode } {
  let text =
    adaptation.complexity === "low"
      ? `Let's learn about ${topic} — nice and easy.`
      : adaptation.complexity === "high"
        ? `Ready? ${topic} — let's explore a bit more.`
        : `Hi! Let's learn ${topic} together.`;
  text = playfulWrap(text, adaptation.style);
  if (adaptation.shortenPrompts) text = simplifyExplanation(text);
  text = buildEmotionAwareMessage(emotion, text);
  return { text: truncateForSafety(text), mode: "explain" };
}

export function buildAskMessage(
  question: GeneratedQuestion,
  adaptation: TeachingAdaptation,
): { text: string; mode: TeachingMode } {
  let text = question.prompt;
  if (adaptation.shortenPrompts) {
    text = text.split(" ").slice(0, 12).join(" ") + "?";
  }
  text = playfulWrap(text, adaptation.style);
  return { text: truncateForSafety(text), mode: "ask" };
}

export function buildEncourageMessage(
  emotion: EmotionSignal,
  adaptation: TeachingAdaptation,
): { text: string; mode: TeachingMode } {
  const base =
    emotion === "success"
      ? "You did it! Want to try one more?"
      : "You're doing great — keep going!";
  const text = buildEmotionAwareMessage(
    emotion,
    playfulWrap(base, adaptation.style),
  );
  return { text: truncateForSafety(text), mode: "encourage" };
}

export function appendTurn(
  state: TutorState,
  role: ConversationTurn["role"],
  text: string,
  mode?: TeachingMode,
): TutorState {
  return {
    ...state,
    conversationHistory: [
      ...state.conversationHistory,
      { role, text, timestamp: Date.now(), mode },
    ].slice(-30),
    teachingMode: mode ?? state.teachingMode,
  };
}

export function shouldStartMicroCycle(state: TutorState, now = Date.now()): boolean {
  return now - state.lastCycleAt >= 10_000;
}

export function markMicroCycle(state: TutorState): TutorState {
  return {
    ...state,
    cycleCount: state.cycleCount + 1,
    lastCycleAt: Date.now(),
  };
}
