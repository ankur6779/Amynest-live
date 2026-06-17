import type { ScoringConfidence, SpeechCoachV2EvaluationScores } from "./types";

const ENCOURAGEMENT = [
  "Great job!",
  "Nice clear speaking!",
  "You are getting better!",
  "Wonderful effort!",
  "I loved hearing your voice!",
] as const;

const RETRY = [
  "Let's practice that one more time.",
  "Almost there — try again with me.",
  "Great effort! Let's try once more.",
  "Nice try! Say it slowly with me.",
] as const;

const LOW_CONFIDENCE = "Let's practice that one more time.";

function pickStable<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length]!;
}

export function childFriendlyFeedback(
  scores: SpeechCoachV2EvaluationScores,
  needsRetry: boolean,
  scoringConfidence: ScoringConfidence = scores.scoringConfidence,
): string {
  if (scoringConfidence === "LOW") return LOW_CONFIDENCE;

  const seed = scores.overallScore + scores.pronunciationEstimate;
  if (needsRetry) return pickStable(RETRY, seed);
  if (scores.overallScore >= 90 && scoringConfidence === "HIGH") {
    return "Amazing speaking! " + pickStable(ENCOURAGEMENT, seed);
  }
  if (scores.overallScore >= 75) return pickStable(ENCOURAGEMENT, seed);
  return pickStable(ENCOURAGEMENT, seed + 1);
}

export function offTopicRedirect(ackTopic?: string, nextPrompt?: string): string {
  const ack = ackTopic?.trim()
    ? `${ackTopic.trim().replace(/\.$/, "")}. `
    : "";
  const prompt = nextPrompt?.trim() ?? "Let's continue our speaking practice.";
  return `${ack}${prompt}`;
}
