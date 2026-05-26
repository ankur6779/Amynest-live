import type { GeneratedQuestion } from "./questionEngine.js";
import type { TeachingMode } from "./types.js";
import { TUTOR_SAFETY } from "./types.js";
import { truncateForSafety } from "./voiceEngine.js";

export type CorrectionStep = "explain_why" | "hint" | "retry";

export type CorrectionResult = {
  message: string;
  mode: TeachingMode;
  step: CorrectionStep;
  nextExpectedResponse: "answer" | "repeat" | "listen" | "continue";
};

/**
 * Wrong answer flow: explain → hint → retry (never give full answer first).
 */
export function buildCorrectionResponse(
  question: GeneratedQuestion,
  step: CorrectionStep,
  attempt: number,
): CorrectionResult {
  if (step === "explain_why") {
    return {
      message: truncateForSafety(
        `Good try! That one's tricky. ${question.prompt.replace("?", "")} needs a careful listen.`,
      ),
      mode: "correct",
      step: "explain_why",
      nextExpectedResponse: "listen",
    };
  }

  if (step === "hint") {
    return {
      message: truncateForSafety(`Here's a hint: ${question.hint}`),
      mode: "correct",
      step: "hint",
      nextExpectedResponse: "answer",
    };
  }

  return {
    message: truncateForSafety(
      `Let's try a small variation. ${attempt >= 2 ? "Take your time — " : ""}${question.prompt}`,
    ),
    mode: "ask",
    step: "retry",
    nextExpectedResponse: "answer",
  };
}

export function nextCorrectionStep(
  attempt: number,
): CorrectionStep {
  if (attempt <= 1) return "explain_why";
  if (attempt === 2) return "hint";
  return "retry";
}

export function shouldGiveUpAfterAttempts(attempt: number): boolean {
  return attempt > 4;
}

export function encouragementAfterManyTries(): CorrectionResult {
  return {
    message: truncateForSafety(
      "You're working hard — let's switch to something fun and come back later!",
    ),
    mode: "encourage",
    step: "retry",
    nextExpectedResponse: "continue",
  };
}
