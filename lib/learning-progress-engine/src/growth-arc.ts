/**
 * Phase 6 — Long-term growth arcs.
 *
 * Builds monthly snapshots and trend lines derived from the existing
 * LearningProgressProfile + LearningMemory + skill graph. NO new persistent
 * state is introduced — callers pass in whatever recent snapshots they have
 * stored (e.g. last 6 monthly rows from `learning_progress`).
 */

import type { LearningProgressProfile } from "./types";
import type { LearningMemory } from "./learning-memory";
import type { SkillGraphEntry } from "./skill-graph";

export interface GrowthArcSnapshot {
  /** YYYY-MM. */
  month: string;
  masteryScore: number;
  totalXP: number;
  streakDays: number;
  activitiesCompleted: number;
  masteredSkills: number;
  strugglingSkills: number;
}

export interface GrowthArcTrend {
  /** -1..1 — negative means regression, positive means growth. */
  direction: number;
  label: "growing" | "steady" | "needs_support";
  message: string;
}

export interface GrowthArcSummary {
  snapshots: GrowthArcSnapshot[];
  vocabularyTrend: GrowthArcTrend;
  readingConfidence: GrowthArcTrend;
  speechDevelopment: GrowthArcTrend;
  consistencyEvolution: GrowthArcTrend;
}

/** Format Date → "YYYY-MM". */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Build a snapshot for "today" from the live profile. */
export function snapshotForToday(input: {
  profile: LearningProgressProfile;
  skillEntries: SkillGraphEntry[];
  memory: LearningMemory;
  dateIso?: string;
}): GrowthArcSnapshot {
  const date = input.dateIso ? new Date(input.dateIso) : new Date();
  return {
    month: monthKey(date),
    masteryScore: input.profile.masteryScore,
    totalXP: input.profile.totalXP,
    streakDays: input.profile.streakDays,
    activitiesCompleted: input.profile.completedActivities.length,
    masteredSkills: input.skillEntries.filter((e) => e.progressionStage === "mastered")
      .length,
    strugglingSkills: input.memory.strugglingSkills.length,
  };
}

function trendFromSeries(values: number[]): GrowthArcTrend {
  if (values.length < 2) {
    return { direction: 0, label: "steady", message: "A few more sessions will reveal the trend." };
  }
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const range = Math.max(1, Math.max(...values) - Math.min(...values));
  const direction = Math.max(-1, Math.min(1, (last - first) / Math.max(range, 5)));
  if (direction > 0.2) {
    return { direction, label: "growing", message: "Beautiful upward arc this month." };
  }
  if (direction < -0.2) {
    return {
      direction,
      label: "needs_support",
      message: "A gentle dip — Amy is choosing easier wins for now.",
    };
  }
  return {
    direction,
    label: "steady",
    message: "Calm, steady progress — exactly what young brains need.",
  };
}

function valuesFor(field: keyof GrowthArcSnapshot, snapshots: GrowthArcSnapshot[]): number[] {
  return snapshots.map((s) => Number(s[field] ?? 0));
}

/**
 * Build a growth arc summary across the last N monthly snapshots.
 * `snapshots` should be sorted oldest → newest.
 */
export function buildGrowthArcSummary(input: {
  snapshots: GrowthArcSnapshot[];
  profile: LearningProgressProfile;
  memory: LearningMemory;
  skillEntries: SkillGraphEntry[];
}): GrowthArcSummary {
  const today = snapshotForToday({
    profile: input.profile,
    skillEntries: input.skillEntries,
    memory: input.memory,
  });
  const merged = [...input.snapshots];
  const lastMonth = merged[merged.length - 1]?.month;
  if (lastMonth === today.month) {
    merged[merged.length - 1] = today;
  } else {
    merged.push(today);
  }
  const trimmed = merged.slice(-6);

  const vocabularyTrend = trendFromSeries(
    trimmed.map(
      (s) =>
        // Phonics section drives vocabulary — but we keep it implicit.
        s.activitiesCompleted * 0.4 + s.masteredSkills * 6,
    ),
  );
  const readingConfidence = trendFromSeries(
    trimmed.map((s) => s.masteryScore * 0.7 + s.masteredSkills * 4),
  );
  const speechDevelopment = trendFromSeries(
    trimmed.map((s) => s.masteryScore * 0.5 + (s.strugglingSkills > 0 ? -5 : 0)),
  );
  const consistencyEvolution = trendFromSeries(valuesFor("streakDays", trimmed));

  return {
    snapshots: trimmed,
    vocabularyTrend,
    readingConfidence,
    speechDevelopment,
    consistencyEvolution,
  };
}
