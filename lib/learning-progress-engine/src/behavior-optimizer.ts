/**
 * Phase 7 — Behavior optimizer.
 *
 * Derives tuning parameters (session size, reward frequency, celebration
 * intensity, comeback timing, recommendation cadence, challenge intensity)
 * from existing engagement signals. Optimizes for CALM CONSISTENCY, not
 * engagement maximisation.
 *
 * Rules:
 *  - Never increases reward frequency past a healthy ceiling.
 *  - Never tightens streak pressure.
 *  - Never recommends more than once per visit when fatigue is detected.
 */

import type { LearningProgressProfile } from "./types";
import type { LearningMemory } from "./learning-memory";

export interface BehavioralSignals {
  /** Sessions completed in the last 7 days. */
  sessionsLast7d?: number;
  /** Activities completed in the last 24 hours. */
  activitiesLast24h?: number;
  /** Recommendations the user ignored consecutively. */
  recommendationsIgnored?: number;
  /** Reward modals shown today (anti-fatigue). */
  rewardsShownToday?: number;
  /** Median session duration in seconds (last 7 days). */
  medianSessionSeconds?: number;
  /** Days since last activity. */
  daysInactive?: number;
}

export type CelebrationIntensity = "calm" | "balanced" | "playful";
export type ChallengeIntensity = "gentle" | "balanced" | "stretch";

export interface OptimizedBehavior {
  /** Recommended steps in the daily session (clamped 3..7). */
  sessionSize: number;
  /** Whether to show a reward modal at all this session. */
  showRewardModal: boolean;
  celebration: CelebrationIntensity;
  challenge: ChallengeIntensity;
  /** Recommend at most this many activities up-front. */
  recommendationLimit: number;
  /** Suggested days before sending a comeback notification. */
  comebackTriggerDays: 3 | 5 | 7 | 14;
  /** Free-form reason — useful in debug + telemetry. */
  reason: string;
  /** True when burnout signals were detected — call sites should slow down. */
  burnoutRisk: boolean;
}

const SAFE_DEFAULT: OptimizedBehavior = {
  sessionSize: 5,
  showRewardModal: true,
  celebration: "balanced",
  challenge: "balanced",
  recommendationLimit: 3,
  comebackTriggerDays: 3,
  reason: "default",
  burnoutRisk: false,
};

export function optimizeBehavior(input: {
  profile: LearningProgressProfile;
  memory: LearningMemory;
  signals?: BehavioralSignals;
}): OptimizedBehavior {
  const s = input.signals ?? {};
  const profile = input.profile;
  const memory = input.memory;

  // ── Burnout detection ──
  // Heavy daily use + struggling skills + many ignored recs = slow down.
  const burnoutRisk =
    (s.activitiesLast24h ?? 0) > 30 ||
    ((s.rewardsShownToday ?? 0) > 4 && memory.strugglingSkills.length >= 2) ||
    (s.recommendationsIgnored ?? 0) >= 4;

  if (burnoutRisk) {
    return {
      sessionSize: 3,
      showRewardModal: false,
      celebration: "calm",
      challenge: "gentle",
      recommendationLimit: 1,
      comebackTriggerDays: 5,
      reason: "burnout_signal",
      burnoutRisk: true,
    };
  }

  // ── Returning learner — make first session feel like a win. ──
  if ((s.daysInactive ?? 0) >= 3 || (s.sessionsLast7d ?? 0) === 0) {
    return {
      ...SAFE_DEFAULT,
      sessionSize: 3,
      celebration: "playful",
      challenge: "gentle",
      recommendationLimit: 2,
      reason: "comeback_warm_in",
    };
  }

  // ── Strong, consistent learners — allow a slightly bigger arc. ──
  if (profile.streakDays >= 7 && profile.masteryScore >= 55) {
    return {
      sessionSize: 6,
      showRewardModal: true,
      celebration: "balanced",
      challenge: "stretch",
      recommendationLimit: 3,
      comebackTriggerDays: 3,
      reason: "strong_steady_learner",
      burnoutRisk: false,
    };
  }

  // ── Building habit — reward consistency, keep things calm. ──
  if (profile.streakDays >= 3 && profile.streakDays < 7) {
    return {
      sessionSize: 5,
      showRewardModal: true,
      celebration: "balanced",
      challenge: "balanced",
      recommendationLimit: 3,
      comebackTriggerDays: 3,
      reason: "habit_building",
      burnoutRisk: false,
    };
  }

  // ── Fresh learner / explorer — keep sessions short and warm. ──
  if (profile.masteryScore < 25) {
    return {
      sessionSize: 4,
      showRewardModal: true,
      celebration: "playful",
      challenge: "gentle",
      recommendationLimit: 2,
      comebackTriggerDays: 3,
      reason: "early_explorer",
      burnoutRisk: false,
    };
  }

  return SAFE_DEFAULT;
}
