import type { OlympiadRunType } from "./types.js";

/** Server-side score formula — keep in sync with api-server olympiad route. */
export function computeOlympiadScore(
  runType: OlympiadRunType,
  questionsCorrect: number,
  questionsAttempted: number,
  durationSec: number,
): number {
  const base: Record<OlympiadRunType, number> = {
    daily: 10,
    weekly: 15,
    practice: 5,
    mock: 20,
    track: 8,
  };
  let score = questionsCorrect * base[runType];
  const perfect = questionsCorrect === questionsAttempted && questionsAttempted > 0;
  if (perfect && runType === "daily") score += 10;
  if (perfect && runType === "weekly") score += 50;
  if (perfect && runType === "mock") score += 100;
  if (runType === "mock" && durationSec <= 1350 && questionsCorrect >= questionsAttempted * 0.8) {
    score += 50;
  }
  return score;
}
