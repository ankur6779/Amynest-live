/**
 * Predictive day context — soft signals for today's routine without rescheduling.
 */
import type { PreviousDayContext } from "./routine-context-engine.js";
import type { DevelopmentalTrajectory } from "./routine-developmental-trajectory.js";
import type { PersonalizationMemory } from "./routine-personalization-memory.js";

export type PredictiveDayHints = {
  suggestLowEnergy: boolean;
  suggestReduceStudy: boolean;
  suggestCalmEvening: boolean;
  suggestConnectionFocus: boolean;
  confidence: "low" | "medium" | "high";
  rationale: string[];
};

export type PredictiveContextResult = {
  hints: PredictiveDayHints;
  enrichedPreviousDay?: PreviousDayContext;
};

function mergePreviousDay(
  existing: PreviousDayContext | undefined,
  trajectory: DevelopmentalTrajectory,
  hints: PredictiveDayHints,
): PreviousDayContext {
  const next: PreviousDayContext = { ...existing };

  if (hints.suggestLowEnergy && !next.sleepQuality) {
    next.sleepQuality = trajectory.regulationTrend === "needs_support" ? "poor" : "average";
  }
  if (trajectory.regulationTrend === "needs_support" && next.moodScore !== "happy") {
    next.moodScore = "tired";
  }
  if (trajectory.consistencyTrend === "improving" && !next.moodScore) {
    next.moodScore = "normal";
  }
  if (trajectory.completionRate > 0) {
    next.activityCompletion = Math.round(trajectory.completionRate * 100);
  }

  return next;
}

/**
 * Build predictive hints and optional enriched previous-day context.
 */
export function buildPredictiveDayContext(opts: {
  trajectory: DevelopmentalTrajectory;
  memory: PersonalizationMemory;
  previousDayContext?: PreviousDayContext;
}): PredictiveContextResult {
  const { trajectory, memory, previousDayContext } = opts;
  const rationale: string[] = [];

  const suggestLowEnergy =
    trajectory.regulationTrend === "needs_support" ||
    trajectory.energyStability === "needs_support";
  if (suggestLowEnergy) {
    rationale.push("recent regulation/energy pattern suggests gentler pacing");
  }

  const suggestReduceStudy =
    suggestLowEnergy ||
    trajectory.consistencyTrend === "needs_support" ||
    memory.skippedActivityKeys.some((k) => /homework|study|learning/.test(k));
  if (suggestReduceStudy) {
    rationale.push("study load trimmed based on recent completion pattern");
  }

  const suggestCalmEvening =
    suggestLowEnergy || trajectory.regulationTrend !== "improving";
  if (suggestCalmEvening) {
    rationale.push("evening wind-down bias from trajectory");
  }

  const suggestConnectionFocus =
    trajectory.dominantStrength !== "connection" &&
    (trajectory.regulationTrend === "needs_support" ||
      memory.completionRate < 0.55);
  if (suggestConnectionFocus) {
    rationale.push("connection-forward day when rhythm has been uneven");
  }

  const signalCount = [
    suggestLowEnergy,
    suggestReduceStudy,
    suggestCalmEvening,
    suggestConnectionFocus,
  ].filter(Boolean).length;

  const hints: PredictiveDayHints = {
    suggestLowEnergy,
    suggestReduceStudy,
    suggestCalmEvening,
    suggestConnectionFocus,
    confidence:
      trajectory.snapshotDays >= 3
        ? "high"
        : trajectory.snapshotDays >= 1
          ? "medium"
          : "low",
    rationale,
  };

  const enrichedPreviousDay = mergePreviousDay(
    previousDayContext,
    trajectory,
    hints,
  );

  return { hints, enrichedPreviousDay };
}
