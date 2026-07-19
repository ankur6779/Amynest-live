import type { AdaptiveSessionStats, AdaptiveProfile } from "./adaptive.js";
import { deriveAdaptiveProfile } from "./adaptive.js";
import type { MasteryState } from "./mastery.js";
import { masterySummary } from "./mastery.js";
import type { MicroGameId } from "./micro-games.js";

/** Hidden learner profile that drives future lesson adaptation. */
export type LearningDna = {
  accuracy: number;
  speed: number;
  memory: number;
  attention: number;
  confidence: number;
  consistency: number;
  improvementRate: number;
  preferredGameMode: MicroGameId | "classic";
  preferredTutorStyle: "gentle" | "playful" | "challenge";
  easeFactor: number;
  updatedAt: string;
};

export type LearningDnaInput = {
  stats: AdaptiveSessionStats;
  mastery?: MasteryState | null;
  preferredGameMode?: MicroGameId | null;
  /** Prior DNA for improvement-rate delta. */
  previous?: LearningDna | null;
  /** Recent session count with activity (0–14). */
  activeDaysLastTwoWeeks?: number;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function buildLearningDna(input: LearningDnaInput): LearningDna {
  const profile: AdaptiveProfile = deriveAdaptiveProfile(input.stats);
  const accuracy =
    input.stats.attempts > 0
      ? (input.stats.correct / input.stats.attempts) * 100
      : 50;
  const speed =
    input.stats.avgElapsedMs <= 0
      ? 50
      : clamp01(100 - Math.min(100, input.stats.avgElapsedMs / 150));
  const memory = clamp01(
    100 - input.stats.repeatMistakes * 18 + (input.stats.correct > 0 ? 20 : 0),
  );
  const attention = clamp01(
    100 - input.stats.longHesitations * 15 - input.stats.wildGuesses * 20,
  );
  const confidence = clamp01(
    accuracy * 0.55 + speed * 0.25 + (profile.signal === "fast_learner" ? 20 : 0),
  );
  const active = input.activeDaysLastTwoWeeks ?? 0;
  const consistency = clamp01((active / 14) * 100);
  const summary = input.mastery ? masterySummary(input.mastery) : null;
  const masteryScore = summary?.averageScore ?? accuracy;
  const prevAcc = input.previous?.accuracy ?? accuracy;
  const improvementRate = clamp01(50 + (accuracy - prevAcc) * 2 + (masteryScore - 50) * 0.2);

  let preferredTutorStyle: LearningDna["preferredTutorStyle"] = "playful";
  if (profile.signal === "needs_help" || profile.signal === "repeated_mistakes") {
    preferredTutorStyle = "gentle";
  } else if (profile.signal === "fast_learner") {
    preferredTutorStyle = "challenge";
  }

  return {
    accuracy: clamp01(accuracy),
    speed,
    memory,
    attention,
    confidence,
    consistency,
    improvementRate,
    preferredGameMode: input.preferredGameMode ?? "classic",
    preferredTutorStyle,
    easeFactor: profile.easeFactor,
    updatedAt: new Date().toISOString(),
  };
}

/** Blend DNA into problem generation ease. */
export function dnaEaseFactor(dna: LearningDna): number {
  return Math.min(1.4, Math.max(0.55, dna.easeFactor));
}
