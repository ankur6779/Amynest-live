import type { OutcomeSignals, SubscriptionStatus } from "../outcomes/types.js";

export const REENGAGEMENT_SEGMENTS = [
  "NEW_USER",
  "ACTIVE_USER",
  "AT_RISK_USER",
  "INACTIVE_3_DAYS",
  "INACTIVE_7_DAYS",
  "INACTIVE_14_DAYS",
  "INACTIVE_30_DAYS",
  "RETURNED_USER",
] as const;

export type ReengagementSegment = (typeof REENGAGEMENT_SEGMENTS)[number];

export type ReengagementAccountFlavor = "free" | "trial" | "premium" | "cancelled";

export type ActivityTag = "routine" | "amy" | "speech" | "learning";

export interface ReengagementSegmentResolution {
  segment: ReengagementSegment;
  accountFlavor: ReengagementAccountFlavor;
  activityTags: ActivityTag[];
  reason: string;
  neverActivated: boolean;
}

export function resolveAccountFlavor(s: OutcomeSignals): ReengagementAccountFlavor {
  const status: SubscriptionStatus | undefined = s.subscription?.status;
  if (status === "trialing") return "trial";
  if (status === "canceled" || status === "expired" || status === "past_due") {
    return "cancelled";
  }
  if (status === "active" || s.isPremium) return "premium";
  return "free";
}

export function resolveActivityTags(s: OutcomeSignals): ActivityTag[] {
  const tags: ActivityTag[] = [];
  if (s.firstRoutineCompleted || (s.activity?.routinesCompleted7d ?? 0) > 0) {
    tags.push("routine");
  }
  if ((s.activity?.coachInteractions7d ?? 0) > 0) tags.push("amy");
  if ((s.activity?.speechSessions7d ?? 0) > 0) tags.push("speech");
  if (s.firstLearningCompleted || s.lessonsCompletedTotal > 0) tags.push("learning");
  return tags;
}

/**
 * Product-facing re-engagement segment. Precedence:
 * inactivity buckets → returned → new → at-risk → active.
 */
export function resolveReengagementSegment(s: OutcomeSignals): ReengagementSegmentResolution {
  const days = s.daysSinceLastActive;
  const activated = s.firstRoutineCompleted || s.firstLearningCompleted;
  const neverActivated = !activated;
  const accountFlavor = resolveAccountFlavor(s);
  const activityTags = resolveActivityTags(s);

  if (days >= 30) {
    return {
      segment: "INACTIVE_30_DAYS",
      accountFlavor,
      activityTags,
      reason: `inactive_${days}d`,
      neverActivated,
    };
  }
  if (days >= 14) {
    return {
      segment: "INACTIVE_14_DAYS",
      accountFlavor,
      activityTags,
      reason: `inactive_${days}d`,
      neverActivated,
    };
  }
  if (days >= 7) {
    return {
      segment: "INACTIVE_7_DAYS",
      accountFlavor,
      activityTags,
      reason: `inactive_${days}d`,
      neverActivated,
    };
  }
  if (days >= 3) {
    return {
      segment: "INACTIVE_3_DAYS",
      accountFlavor,
      activityTags,
      reason: `inactive_${days}d`,
      neverActivated,
    };
  }

  const returned =
    days <= 1 &&
    s.accountAgeDays > 10 &&
    (s.streakBrokenDaysAgo != null || s.hadSevenDayStreak);

  if (returned) {
    return {
      segment: "RETURNED_USER",
      accountFlavor,
      activityTags,
      reason: "returned_after_lapse",
      neverActivated,
    };
  }

  if (s.accountAgeDays <= 7 && neverActivated) {
    return {
      segment: "NEW_USER",
      accountFlavor,
      activityTags,
      reason: "signed_up_not_activated",
      neverActivated,
    };
  }

  if (days >= 1 && activated && s.accountAgeDays > 3) {
    return {
      segment: "AT_RISK_USER",
      accountFlavor,
      activityTags,
      reason: `at_risk_${days}d`,
      neverActivated,
    };
  }

  return {
    segment: "ACTIVE_USER",
    accountFlavor,
    activityTags,
    reason: "recently_active",
    neverActivated,
  };
}
