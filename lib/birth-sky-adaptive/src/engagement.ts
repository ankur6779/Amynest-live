/**
 * Engagement scoring — high / medium / low + session length + timing + consistency.
 */

import { accumulateFeedbackWeights } from "./feedback.js";
import type {
  AdaptiveHistoryInput,
  DayPart,
  EngagementLevel,
  EngagementProfile,
  LearningPreferences,
} from "./types.js";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function normalizeDayPart(raw: string | undefined): DayPart {
  const k = (raw ?? "unknown").toLowerCase();
  if (k === "morning" || k === "afternoon" || k === "evening" || k === "night") {
    return k;
  }
  return "unknown";
}

export function buildEngagementProfile(input: {
  history?: AdaptiveHistoryInput | null;
  learning: LearningPreferences;
}): EngagementProfile {
  const freq = input.history?.sessionFrequency ?? {};
  const sessionsPerWeek = Math.max(
    0,
    Math.min(40, freq.sessionsPerWeek ?? 0),
  );
  const avgMinutes = Math.max(
    0,
    Math.min(120, freq.avgSessionMinutes ?? 0),
  );

  let completions = 0;
  let skips = 0;
  for (const a of input.history?.activities ?? []) {
    completions += a.completed ?? 0;
    skips += a.skipped ?? 0;
  }
  for (const r of input.history?.completedRoutines ?? []) {
    completions += r.count ?? 1;
  }
  for (const r of input.history?.skippedRoutines ?? []) {
    skips += r.count ?? 1;
  }

  const feedback = accumulateFeedbackWeights(input.history?.parentFeedback);
  const hasSignals =
    completions + skips > 0 ||
    sessionsPerWeek > 0 ||
    avgMinutes > 0 ||
    (input.history?.parentFeedback?.length ?? 0) > 0;

  // No history → neutral medium baseline (still deterministic).
  if (!hasSignals) {
    return {
      level: "medium",
      score: 0.5,
      recommendedSessionLengthMinutes: 12,
      preferredActivityTiming: "unknown",
      consistencyScore: 0.5,
    };
  }

  const completionRatio =
    completions + skips === 0 ? 0.5 : completions / (completions + skips);

  // Deterministic score components
  const sessionScore = clamp01(sessionsPerWeek / 7);
  const durationScore = clamp01(avgMinutes / 25);
  const feedbackScore = clamp01(0.5 + feedback.enjoyment + feedback.helpfulness);
  let score = clamp01(
    completionRatio * 0.4 +
      sessionScore * 0.25 +
      durationScore * 0.15 +
      feedbackScore * 0.2,
  );

  if (input.learning.engagementTrend === "rising") score = clamp01(score + 0.05);
  if (input.learning.engagementTrend === "falling") score = clamp01(score - 0.08);

  score = Math.round(score * 100) / 100;

  let level: EngagementLevel = "medium";
  if (score >= 0.67) level = "high";
  else if (score < 0.4) level = "low";

  // Session length recommendation from engagement + history avg
  let recommendedSessionLengthMinutes = 12;
  if (level === "high") recommendedSessionLengthMinutes = 18;
  if (level === "low") recommendedSessionLengthMinutes = 8;
  if (avgMinutes > 0) {
    recommendedSessionLengthMinutes = Math.round(
      (recommendedSessionLengthMinutes * 0.6 + avgMinutes * 0.4) / 1,
    );
  }
  if (feedback.difficulty < -0.2) {
    recommendedSessionLengthMinutes = Math.max(
      5,
      recommendedSessionLengthMinutes - 3,
    );
  }
  if (feedback.difficulty > 0.15) {
    recommendedSessionLengthMinutes = Math.min(
      30,
      recommendedSessionLengthMinutes + 3,
    );
  }
  recommendedSessionLengthMinutes = Math.max(
    5,
    Math.min(30, recommendedSessionLengthMinutes),
  );

  // Preferred timing from completed routine day-parts
  const dayCounts: Record<DayPart, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
    unknown: 0,
  };
  for (const r of input.history?.completedRoutines ?? []) {
    const dp = normalizeDayPart(r.lastDayPart);
    dayCounts[dp] += r.count ?? 1;
  }
  let preferredActivityTiming: DayPart = "morning";
  let best = -1;
  for (const dp of ["morning", "afternoon", "evening", "night"] as DayPart[]) {
    if (dayCounts[dp] > best) {
      best = dayCounts[dp];
      preferredActivityTiming = dp;
    }
  }
  if (best <= 0) preferredActivityTiming = "unknown";

  // Consistency: sessions/week vs skips
  const consistencyScore =
    Math.round(
      clamp01(sessionScore * 0.6 + completionRatio * 0.4 - Math.min(0.3, skips * 0.02)) *
        100,
    ) / 100;

  return {
    level,
    score,
    recommendedSessionLengthMinutes,
    preferredActivityTiming,
    consistencyScore,
  };
}
