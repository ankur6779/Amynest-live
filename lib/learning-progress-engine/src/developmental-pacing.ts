/**
 * Continuous Optimization — Developmental pacing.
 *
 * Decides whether Amy should push, slow down, simplify, or reinforce
 * right now. Distinct from `behavior-optimizer.ts` (which tunes reward
 * pacing and session size) — this module tunes the *developmental*
 * cadence: when a child is ready for stretch vs needs anchoring.
 *
 * Pure derivation from existing profile + memory + skill graph trend.
 */

import type { LearningProgressProfile } from "./types";
import type { LearningMemory } from "./learning-memory";
import type { LearningEffectivenessReport } from "./learning-effectiveness";

export type DevelopmentalAction = "push" | "reinforce" | "simplify" | "slow_down" | "steady";

export interface DevelopmentalPacing {
  action: DevelopmentalAction;
  reason: string;
  /** Parent-readable, never algorithmic. */
  parentLine: string;
  /** Soft cap on session size for this state (3..6). */
  recommendedSessionSize: number;
  /** Suggested difficulty band. */
  difficultyHint: "lighter" | "balanced" | "stretch";
}

export interface DevelopmentalPacingInput {
  profile: LearningProgressProfile;
  memory: LearningMemory;
  /** Optional learning effectiveness report if the host has it. */
  effectiveness?: LearningEffectivenessReport;
  /** Signals derived from telemetry / session outcomes. */
  signals?: {
    /** Median accuracy in last 7d, 0..1. */
    recentAccuracy?: number;
    /** Times the child abandoned a session in last 7d. */
    abandonedSessions?: number;
    /** Times the child re-attempted the same skill mid-session. */
    retryClicks?: number;
    /** Days since last completed activity. */
    daysInactive?: number;
  };
}

export function buildDevelopmentalPacing(
  input: DevelopmentalPacingInput,
): DevelopmentalPacing {
  const s = input.signals ?? {};
  const memory = input.memory;
  const profile = input.profile;

  // ── Frustration / overwhelm — slow down. ──
  if (
    (s.abandonedSessions ?? 0) >= 2 ||
    (s.retryClicks ?? 0) >= 5 ||
    memory.strugglingSkills.length >= 3
  ) {
    return {
      action: "slow_down",
      reason: "frustration_signals",
      parentLine: "A lighter session may feel better today.",
      recommendedSessionSize: 3,
      difficultyHint: "lighter",
    };
  }

  // ── Returning learner — simplify the re-entry. ──
  if ((s.daysInactive ?? 0) >= 4) {
    return {
      action: "simplify",
      reason: "warm_re_entry",
      parentLine: "Starting back simple — Amy will rebuild rhythm gently.",
      recommendedSessionSize: 3,
      difficultyHint: "lighter",
    };
  }

  // ── Forgotten skills — reinforce before pushing forward. ──
  if (memory.forgottenSkills.length >= 2) {
    return {
      action: "reinforce",
      reason: "skill_decay",
      parentLine: "Today reinforces a few skills before adding new ones.",
      recommendedSessionSize: 4,
      difficultyHint: "balanced",
    };
  }

  // ── Strong, stable growth — gentle push. ──
  const growing =
    input.effectiveness?.label === "growing" ||
    (profile.masteryScore >= 60 &&
      profile.streakDays >= 5 &&
      (s.recentAccuracy ?? 0.7) >= 0.75);
  if (growing) {
    return {
      action: "push",
      reason: "ready_for_stretch",
      parentLine: "A little stretch today — your child's confidence is ready.",
      recommendedSessionSize: 6,
      difficultyHint: "stretch",
    };
  }

  // ── Default — keep things steady. ──
  return {
    action: "steady",
    reason: "stable_rhythm",
    parentLine: "Today matches the rhythm we've been building.",
    recommendedSessionSize: 5,
    difficultyHint: "balanced",
  };
}

/**
 * A small parent-friendly summary line for the "today's plan" header.
 */
export function pacingHeadline(pacing: DevelopmentalPacing): string {
  switch (pacing.action) {
    case "push":
      return "Today: gentle stretch";
    case "reinforce":
      return "Today: warm reinforcement";
    case "simplify":
      return "Today: easing back in";
    case "slow_down":
      return "Today: a lighter, calmer rhythm";
    case "steady":
    default:
      return "Today: steady rhythm";
  }
}
