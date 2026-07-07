import type { LifecycleStage, OutcomeSignals } from "../outcomes/types.js";

export interface LifecycleStrategy {
  stage: LifecycleStage;
  /** One-line intent that every notification for this stage must serve. */
  intent: string;
  /** Ranked goals the stage should pursue (maps to NotificationGoal names). */
  prioritizeGoals: string[];
  /** Cap on non-critical sends per day for this stage. */
  maxNonCriticalPerDay: number;
  /** How assertively to intervene. */
  interventionIntensity: "minimal" | "low" | "medium" | "high";
  /** Whether monetization messaging is appropriate for this stage. */
  monetizationAllowed: boolean;
}

const TRIAL_ENDING_THRESHOLD_DAYS = 3;
const EXPIRING_THRESHOLD_DAYS = 5;
const HIGH_INTENT_RECENCY_DAYS = 3;

/**
 * Classify a user into a single, strategy-driving lifecycle stage.
 *
 * Precedence (highest first):
 *   1. Deep inactivity (retention emergencies win over everything)
 *   2. Subscription lifecycle (trial ending, expiring, high intent)
 *   3. Premium / trial membership
 *   4. Behavioral activation ladder (new → power user)
 *
 * The function is pure and degrades gracefully: when the optional
 * `subscription` / `engagement` signals are absent it relies purely on the
 * behavioral fields that every OutcomeSignals already carries.
 */
export function detectLifecycleStage(s: OutcomeSignals): LifecycleStage {
  const sub = s.subscription;
  const inactive = s.daysSinceLastActive;

  // ── 1. Inactivity emergencies ────────────────────────────────────────────
  // A user who once had momentum but stopped is a retention priority even if
  // they are a paying subscriber (silent churn is the most expensive churn).
  if (inactive >= 14) return "INACTIVE_14D";
  if (inactive >= 7) return "INACTIVE_7D";
  if (inactive >= 3) return "INACTIVE_3D";

  // A returning user: was away >=2 days, now active again, with prior habit.
  if (inactive <= 1 && s.hadSevenDayStreak && s.currentStreakDays <= 1 && s.accountAgeDays > 10) {
    // Only treat as RETURNING if they recently lapsed (streak reset) — a fresh
    // open after a gap. Distinct from a steady daily user.
    if (s.streakBrokenDaysAgo != null) return "RETURNING_USER";
  }

  if (inactive >= 1 && s.accountAgeDays > 3) return "INACTIVE_1D";

  // ── 2. Subscription lifecycle ────────────────────────────────────────────
  if (sub) {
    if (sub.status === "active" || sub.status === "canceled" || sub.status === "past_due") {
      const remaining = sub.subscriptionDaysRemaining;
      if (
        (sub.status === "canceled" || sub.status === "past_due") &&
        remaining != null &&
        remaining <= EXPIRING_THRESHOLD_DAYS
      ) {
        return "SUBSCRIPTION_EXPIRING";
      }
      return "PREMIUM_SUBSCRIBER";
    }

    if (sub.status === "trialing") {
      const remaining = sub.trialDaysRemaining;
      if (remaining != null && remaining <= TRIAL_ENDING_THRESHOLD_DAYS) {
        return "TRIAL_ENDING";
      }
      return "TRIAL_USER";
    }

    // Free tier with recent unconverted paywall interest = hottest lead.
    if (
      sub.status === "free" &&
      sub.paywallViewedDaysAgo != null &&
      sub.paywallViewedDaysAgo <= HIGH_INTENT_RECENCY_DAYS
    ) {
      return "HIGH_PURCHASE_INTENT";
    }
  } else if (s.isPremium) {
    // Backward-compat path: no detailed subscription object, but isPremium set.
    return "PREMIUM_SUBSCRIBER";
  }

  // ── 3. Behavioral activation ladder (free / unknown billing) ─────────────
  const activeScore =
    s.sessionsLast7d * 10 +
    s.lessonsCompleted7d * 8 +
    s.routineCompletionRate7d * 40 +
    Math.min(s.currentStreakDays, 14) * 3;

  if (activeScore >= 80 && s.currentStreakDays >= 7) return "POWER_USER";

  if (s.accountAgeDays <= 1 && !s.firstRoutineCompleted && !s.firstLearningCompleted) {
    return "NEW_INSTALL";
  }

  if (s.accountAgeDays <= 7 && !s.firstRoutineCompleted) return "ONBOARDING";

  if (s.firstRoutineCompleted && !s.firstLearningCompleted && s.accountAgeDays <= 7) {
    return "ROUTINE_CREATED";
  }

  if (
    (s.firstRoutineCompleted || s.firstLearningCompleted) &&
    s.accountAgeDays <= 10 &&
    s.currentStreakDays < 3
  ) {
    return "FIRST_SUCCESS";
  }

  return "DAILY_USER";
}

const STRATEGIES: Record<LifecycleStage, Omit<LifecycleStrategy, "stage">> = {
  NEW_INSTALL: {
    intent: "Deliver the first magic moment fast; zero monetization.",
    prioritizeGoals: ["GOAL_ROUTINE_COMPLETION", "GOAL_PARENT_ENGAGEMENT"],
    maxNonCriticalPerDay: 2,
    interventionIntensity: "medium",
    monetizationAllowed: false,
  },
  ONBOARDING: {
    intent: "Guide to first routine creation; celebrate every small step.",
    prioritizeGoals: ["GOAL_ROUTINE_COMPLETION", "GOAL_PARENT_ENGAGEMENT"],
    maxNonCriticalPerDay: 2,
    interventionIntensity: "medium",
    monetizationAllowed: false,
  },
  ROUTINE_CREATED: {
    intent: "Turn the first routine into a first completion.",
    prioritizeGoals: ["GOAL_ROUTINE_COMPLETION", "GOAL_LEARNING_COMPLETION"],
    maxNonCriticalPerDay: 2,
    interventionIntensity: "medium",
    monetizationAllowed: false,
  },
  FIRST_SUCCESS: {
    intent: "Reinforce the win and build a daily habit loop.",
    prioritizeGoals: ["GOAL_LEARNING_COMPLETION", "GOAL_ROUTINE_COMPLETION"],
    maxNonCriticalPerDay: 3,
    interventionIntensity: "low",
    monetizationAllowed: false,
  },
  DAILY_USER: {
    intent: "Deepen the habit; introduce value that Premium extends.",
    prioritizeGoals: ["GOAL_LEARNING_COMPLETION", "GOAL_PARENT_ENGAGEMENT"],
    maxNonCriticalPerDay: 3,
    interventionIntensity: "low",
    monetizationAllowed: true,
  },
  POWER_USER: {
    intent: "Reward mastery; convert clear value into subscription.",
    prioritizeGoals: ["GOAL_SUBSCRIPTION", "GOAL_LEARNING_COMPLETION"],
    maxNonCriticalPerDay: 3,
    interventionIntensity: "low",
    monetizationAllowed: true,
  },
  TRIAL_USER: {
    intent: "Maximize realized value during trial so upgrade feels obvious.",
    prioritizeGoals: ["GOAL_LEARNING_COMPLETION", "GOAL_SUBSCRIPTION"],
    maxNonCriticalPerDay: 3,
    interventionIntensity: "medium",
    monetizationAllowed: true,
  },
  TRIAL_ENDING: {
    intent: "Recap concrete value and make continuing effortless — no fake urgency.",
    prioritizeGoals: ["GOAL_SUBSCRIPTION", "GOAL_RETENTION"],
    maxNonCriticalPerDay: 2,
    interventionIntensity: "high",
    monetizationAllowed: true,
  },
  HIGH_PURCHASE_INTENT: {
    intent: "Answer the hesitation behind the last paywall view.",
    prioritizeGoals: ["GOAL_SUBSCRIPTION"],
    maxNonCriticalPerDay: 2,
    interventionIntensity: "high",
    monetizationAllowed: true,
  },
  PREMIUM_SUBSCRIBER: {
    intent: "Deliver ongoing value; never sell; protect retention.",
    prioritizeGoals: ["GOAL_LEARNING_COMPLETION", "GOAL_RETENTION"],
    maxNonCriticalPerDay: 3,
    interventionIntensity: "low",
    monetizationAllowed: false,
  },
  SUBSCRIPTION_EXPIRING: {
    intent: "Remind of value at risk and make renewal one tap.",
    prioritizeGoals: ["GOAL_RETENTION", "GOAL_SUBSCRIPTION"],
    maxNonCriticalPerDay: 2,
    interventionIntensity: "high",
    monetizationAllowed: true,
  },
  INACTIVE_1D: {
    intent: "Low-friction nudge tied to unfinished, concrete value.",
    prioritizeGoals: ["GOAL_ROUTINE_COMPLETION", "GOAL_RETENTION"],
    maxNonCriticalPerDay: 1,
    interventionIntensity: "low",
    monetizationAllowed: false,
  },
  INACTIVE_3D: {
    intent: "Reconnect with what they were doing; reduce guilt.",
    prioritizeGoals: ["GOAL_RETENTION", "GOAL_REACTIVATION"],
    maxNonCriticalPerDay: 1,
    interventionIntensity: "high",
    monetizationAllowed: false,
  },
  INACTIVE_7D: {
    intent: "Offer a genuinely fresh reason to return; single message.",
    prioritizeGoals: ["GOAL_REACTIVATION", "GOAL_RETENTION"],
    maxNonCriticalPerDay: 1,
    interventionIntensity: "high",
    monetizationAllowed: false,
  },
  INACTIVE_14D: {
    intent: "Last respectful touch; strongest reason, then back off.",
    prioritizeGoals: ["GOAL_REACTIVATION"],
    maxNonCriticalPerDay: 1,
    interventionIntensity: "high",
    monetizationAllowed: false,
  },
  RETURNING_USER: {
    intent: "Welcome back warmly; rebuild the streak immediately.",
    prioritizeGoals: ["GOAL_ROUTINE_COMPLETION", "GOAL_STREAK_RECOVERY"],
    maxNonCriticalPerDay: 2,
    interventionIntensity: "medium",
    monetizationAllowed: false,
  },
};

export function strategyForLifecycleStage(stage: LifecycleStage): LifecycleStrategy {
  return { stage, ...STRATEGIES[stage] };
}

/** Inactivity stages, in ascending severity, for callers that need to branch. */
export function isInactiveStage(stage: LifecycleStage): boolean {
  return (
    stage === "INACTIVE_1D" ||
    stage === "INACTIVE_3D" ||
    stage === "INACTIVE_7D" ||
    stage === "INACTIVE_14D"
  );
}

/** Stages where a subscription offer is contextually earned (not spammy). */
export function isMonetizationStage(stage: LifecycleStage): boolean {
  return STRATEGIES[stage].monetizationAllowed;
}
