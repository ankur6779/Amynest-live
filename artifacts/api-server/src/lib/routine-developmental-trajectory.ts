/**
 * Developmental trajectory — long-horizon rhythm trends from memory + outcomes.
 * Non-diagnostic; supports predictive day context and parent insights.
 */
import type { PersonalizationMemory } from "./routine-personalization-memory.js";
import type { RoutineActivityHistory } from "./routine-behavior-signature.js";
import { getRoutineOutcomeStore } from "./routine-outcome-log.js";
import {
  getFamilyIntelligenceStore,
  type TrajectorySnapshot,
} from "./routine-family-intelligence-store.js";

export type TrendDirection = "improving" | "stable" | "needs_support";

export type DevelopmentalTrajectory = {
  regulationTrend: TrendDirection;
  consistencyTrend: TrendDirection;
  energyStability: TrendDirection;
  autonomyReadiness: TrendDirection;
  completionRate: number;
  completionDelta: number;
  snapshotDays: number;
  dominantStrength: "connection" | "movement" | "learning" | "rest" | "balanced";
};

export type TrajectoryInput = {
  childId?: string;
  memory: PersonalizationMemory;
  history?: RoutineActivityHistory;
};

function trendFromDelta(delta: number): TrendDirection {
  if (delta >= 0.08) return "improving";
  if (delta <= -0.08) return "needs_support";
  return "stable";
}

function completionFromOutcomes(childId?: string): number {
  if (!childId) return 0.65;
  const outcomes = getRoutineOutcomeStore().list({ childId }).slice(-40);
  if (!outcomes.length) return 0.65;
  const done = outcomes.filter((o) => o.completed && !o.skipped).length;
  return Math.round((done / outcomes.length) * 100) / 100;
}

function dominantStrength(
  memory: PersonalizationMemory,
): DevelopmentalTrajectory["dominantStrength"] {
  const pref = memory.preferredCategories[0]?.toLowerCase() ?? "";
  if (pref.includes("play") || pref.includes("outdoor") || pref.includes("exercise")) {
    return "movement";
  }
  if (pref.includes("study")) return "learning";
  if (pref.includes("rest") || pref.includes("wind")) return "rest";
  if (pref.includes("family") || pref.includes("social")) return "connection";
  return "balanced";
}

/**
 * Calculate developmental trajectory from personalization memory and history.
 */
export function calculateDevelopmentalTrajectory(
  input: TrajectoryInput,
): DevelopmentalTrajectory {
  const { childId, memory, history } = input;
  const completionRate = memory.completionRate || completionFromOutcomes(childId);

  const priorSnapshots: TrajectorySnapshot[] =
    childId != null ? getFamilyIntelligenceStore().listTrajectories(childId, 7) : [];
  const priorRate =
    priorSnapshots.length > 0
      ? priorSnapshots[priorSnapshots.length - 1]!.completionRate
      : completionRate;
  const completionDelta = Math.round((completionRate - priorRate) * 100) / 100;

  const sleep = history?.previousDayContext?.sleepQuality;
  const mood = history?.previousDayContext?.moodScore;
  let regulationTrend: TrendDirection = "stable";
  if (sleep === "poor" || mood === "cranky") regulationTrend = "needs_support";
  else if (sleep === "good" && mood === "happy") regulationTrend = "improving";

  const consistencyTrend = trendFromDelta(completionDelta);

  const skippedRatio =
    memory.skippedActivityKeys.length /
    Math.max(1, memory.skippedActivityKeys.length + memory.completedActivityKeys.length);
  const energyStability: TrendDirection =
    skippedRatio > 0.45 ? "needs_support" : skippedRatio < 0.2 ? "improving" : "stable";

  const autonomyReadiness: TrendDirection =
    completionRate >= 0.7 && regulationTrend !== "needs_support"
      ? "improving"
      : completionRate < 0.45
        ? "needs_support"
        : "stable";

  return {
    regulationTrend,
    consistencyTrend,
    energyStability,
    autonomyReadiness,
    completionRate,
    completionDelta,
    snapshotDays: memory.snapshotCount,
    dominantStrength: dominantStrength(memory),
  };
}
