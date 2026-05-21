import type { PromptScoreHistory } from "@workspace/speech-coach";

export type SpeechViewMode = "parent" | "child";

const VIEW_KEY = "speech_coach_view_mode";

export function getSpeechViewMode(): SpeechViewMode {
  if (typeof window === "undefined") return "parent";
  try {
    return localStorage.getItem(VIEW_KEY) === "child" ? "child" : "parent";
  } catch {
    return "parent";
  }
}

export function setSpeechViewMode(mode: SpeechViewMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VIEW_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
}

export function isToddlerMonths(ageMonths: number): boolean {
  return ageMonths >= 12 && ageMonths < 36;
}

export function weakSoundsToHistory(
  weakSounds: readonly {
    promptId: string;
    avgScore: number;
    attempts: number;
  }[],
): PromptScoreHistory[] {
  return weakSounds.map((w) => ({
    promptId: w.promptId,
    bestScore: w.avgScore,
    attempts: w.attempts,
  }));
}

/** Safe clarity score for API (0–100 integer). */
export function clampClarityScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}
