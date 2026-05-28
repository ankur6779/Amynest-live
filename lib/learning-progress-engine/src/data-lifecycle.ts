/**
 * Phase 7 — Data lifecycle.
 *
 * Pure helpers describing AmyNest's long-term data strategy. Hosts (the
 * API server, scheduled jobs) call these to compute *what to archive*,
 * *what to aggregate*, and *what to compress*. The functions never
 * mutate stores — they return plans.
 */

import type { LearningProgressProfile } from "./types";

/** Retention windows in days. */
export const RETENTION_POLICY = {
  /** Raw completion events — kept fresh for fast queries. */
  rawActivities: 90,
  /** Skill graph entries — kept indefinitely but aggregated weekly past 180d. */
  skillGraph: 180,
  /** Reward events — aggregated weekly past 30d. */
  rewardEvents: 30,
  /** Analytics events — aggregated monthly past 365d. */
  analyticsEvents: 365,
  /** Growth snapshots — kept forever (small, meaningful). */
  growthSnapshots: -1,
  /** Telemetry samples — discarded past 14d. */
  telemetry: 14,
} as const;

export type LifecycleAction = "keep" | "aggregate" | "archive" | "drop";

export interface LifecyclePlanItem {
  collection: keyof typeof RETENTION_POLICY;
  cutoffIso: string;
  action: LifecycleAction;
  reason: string;
}

function isoDateMinusDays(reference: string, days: number): string {
  const d = new Date(`${reference}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Build a data lifecycle plan for the given reference date. Hosts can iterate
 * the result and apply the corresponding action per collection.
 */
export function buildLifecyclePlan(referenceIso: string): LifecyclePlanItem[] {
  const plan: LifecyclePlanItem[] = [];

  plan.push({
    collection: "rawActivities",
    cutoffIso: isoDateMinusDays(referenceIso, RETENTION_POLICY.rawActivities),
    action: "aggregate",
    reason: "older than 90d — aggregate to weekly summaries",
  });
  plan.push({
    collection: "skillGraph",
    cutoffIso: isoDateMinusDays(referenceIso, RETENTION_POLICY.skillGraph),
    action: "aggregate",
    reason: "older than 180d — aggregate weekly",
  });
  plan.push({
    collection: "rewardEvents",
    cutoffIso: isoDateMinusDays(referenceIso, RETENTION_POLICY.rewardEvents),
    action: "aggregate",
    reason: "older than 30d — aggregate weekly",
  });
  plan.push({
    collection: "analyticsEvents",
    cutoffIso: isoDateMinusDays(referenceIso, RETENTION_POLICY.analyticsEvents),
    action: "aggregate",
    reason: "older than 365d — aggregate monthly",
  });
  plan.push({
    collection: "telemetry",
    cutoffIso: isoDateMinusDays(referenceIso, RETENTION_POLICY.telemetry),
    action: "drop",
    reason: "older than 14d — discard raw telemetry samples",
  });
  plan.push({
    collection: "growthSnapshots",
    cutoffIso: referenceIso,
    action: "keep",
    reason: "long-term memory — keep forever",
  });

  return plan;
}

export interface CompactedProfile {
  childId: number;
  totalActivities: number;
  totalXP: number;
  topSections: { section: string; activitiesCompleted: number }[];
  lastActiveDate: string | null;
  streakDays: number;
  masteryScore: number;
  learningLevel: number;
}

/**
 * Produce a small, archive-friendly snapshot of a learning profile. Used by
 * the API server when collapsing old detailed rows into a long-term row.
 */
export function compactProfile(profile: LearningProgressProfile): CompactedProfile {
  const sections = Object.entries(profile.sectionProgress)
    .map(([section, value]) => ({
      section,
      activitiesCompleted: value.activitiesCompleted,
    }))
    .sort((a, b) => b.activitiesCompleted - a.activitiesCompleted)
    .slice(0, 3);
  return {
    childId: profile.childId,
    totalActivities: profile.completedActivities.length,
    totalXP: profile.totalXP,
    topSections: sections,
    lastActiveDate: profile.lastActiveDate,
    streakDays: profile.streakDays,
    masteryScore: profile.masteryScore,
    learningLevel: profile.learningLevel,
  };
}

/** Estimated bytes saved per profile when compacting. Used by dashboards. */
export function estimateProfileBytesSaved(profile: LearningProgressProfile): number {
  const fullSize = JSON.stringify(profile).length;
  const compactSize = JSON.stringify(compactProfile(profile)).length;
  return Math.max(0, fullSize - compactSize);
}
