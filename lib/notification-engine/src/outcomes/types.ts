import type { NotificationCategory } from "@workspace/db";

/** Measurable business goal every notification must map to. */
export type NotificationGoal =
  | "GOAL_ROUTINE_COMPLETION"
  | "GOAL_LEARNING_COMPLETION"
  | "GOAL_PARENT_ENGAGEMENT"
  | "GOAL_RETENTION"
  | "GOAL_SUBSCRIPTION"
  | "GOAL_STREAK_RECOVERY"
  | "GOAL_REACTIVATION";

export type ChildLifecycleStage =
  | "NEW_USER"
  | "ACTIVE"
  | "ENGAGED"
  | "POWER_USER"
  | "AT_RISK"
  | "CHURNING"
  | "RETURNED";

export type ParentMilestone =
  | "FIRST_WEEK"
  | "FIRST_ROUTINE_COMPLETED"
  | "FIRST_LEARNING_COMPLETED"
  | "FIRST_7_DAY_STREAK"
  | "FIRST_MONTH"
  | "AT_RISK"
  | "RETURNING";

export type OutcomeEventType =
  | "routine_completed"
  | "routine_started"
  | "lesson_completed"
  | "lesson_started"
  | "subscription_started"
  | "subscription_trial_started"
  | "session_returned"
  | "streak_restored"
  | "campaign_step_completed"
  | "challenge_completed";

export interface BusinessImpactScores {
  routineCompletionProb: number;
  learningCompletionProb: number;
  retentionProb: number;
  subscriptionProb: number;
  engagementProb: number;
  composite: number;
}

export interface OutcomeSignals {
  userId: string;
  childId: number | null;
  childName: string;
  accountAgeDays: number;
  daysSinceLastActive: number;
  isPremium: boolean;
  isFreeTier: boolean;
  routineCompletionRate7d: number;
  routinesCompletedToday: number;
  routinesMissedYesterday: boolean;
  weeklyRoutineConsistency: number;
  lessonsCompletedTotal: number;
  lessonsCompleted7d: number;
  weakSubjects: string[];
  strongSubjects: string[];
  unfinishedLessonCount: number;
  currentStreakDays: number;
  streakBrokenDaysAgo: number | null;
  hadSevenDayStreak: boolean;
  firstRoutineCompleted: boolean;
  firstLearningCompleted: boolean;
  firstWeekComplete: boolean;
  firstMonthComplete: boolean;
  activationJourneyDay: number | null;
  activationJourneyActive: boolean;
  notificationsOpened7d: number;
  sessionsLast7d: number;
  childLifecycleStage: ChildLifecycleStage;
  parentMilestones: ParentMilestone[];
  churnRisk7d: number;
  churnRisk30d: number;
  churnRisk90d: number;

  /**
   * Optional subscription-lifecycle signals. When present they unlock the
   * premium conversion lifecycle journeys (trial, paywall, winback). When
   * absent (undefined) the engine behaves exactly as before — every field is
   * optional so existing callers remain fully backward compatible.
   */
  subscription?: SubscriptionLifecycleSignals;

  /**
   * Optional engagement-affinity signals used by the decision engine and the
   * smart send-time learner. Absent → decision engine falls back to defaults.
   */
  engagement?: EngagementAffinitySignals;

  /** Optional contextual/seasonal signals (birthday, weekend, weather). */
  context?: ContextualSignals;

  /**
   * Optional per-domain activity signals. Power the persona and parent-value
   * engines. Absent fields are treated as 0 so callers can populate only what
   * they cheaply have — the engines degrade gracefully.
   */
  activity?: ActivitySignals;
}

export interface ActivitySignals {
  routinesCompleted7d?: number;
  lessonsCompleted7d?: number;
  speechSessions7d?: number;
  nutritionPlans7d?: number;
  storiesPlayed7d?: number;
  worksheetsCompleted7d?: number;
  coachInteractions7d?: number;
  weekdayActiveDays7d?: number;
  weekendActiveDays7d?: number;
}

/** Billing state — mirrors subscription lifecycle without coupling to the billing schema. */
export type SubscriptionStatus =
  | "free"
  | "trialing"
  | "active"
  | "canceled"
  | "expired"
  | "past_due";

export interface SubscriptionLifecycleSignals {
  status: SubscriptionStatus;
  /** Whole days until the trial ends (0 = ends today, negative = ended). */
  trialDaysRemaining?: number | null;
  /** Whole days until a canceled/expiring subscription lapses. */
  subscriptionDaysRemaining?: number | null;
  /** Days since the user last opened a paywall/pricing surface without buying. */
  paywallViewedDaysAgo?: number | null;
  /** How many times the paywall was viewed without converting. */
  paywallViewCount?: number;
  /** Last plan the user inspected on the paywall, e.g. "yearly". */
  lastPlanViewed?: string | null;
  /** True once the user has ever held a paid/trial entitlement (winback vs. new). */
  everSubscribed?: boolean;
}

export interface EngagementAffinitySignals {
  /** Notifications delivered in the trailing 7 days. */
  notificationsSent7d: number;
  /** Notifications dismissed (swiped away) in the trailing 7 days. */
  notificationsDismissed7d: number;
  /** Consecutive notifications sent without an open — primary fatigue driver. */
  consecutiveIgnored: number;
  /** Learned preferred local open hour 0–23, or null when not yet learned. */
  preferredHourLocal?: number | null;
  /** Confidence 0–1 in the learned preferred hour. */
  preferredHourConfidence?: number;
  /** OS notification permission is currently granted. */
  permissionGranted?: boolean;
}

export interface ContextualSignals {
  /** Whole days until the child's next birthday (0 = today). */
  childBirthdayInDays?: number | null;
  /** True when the local day is Saturday/Sunday. */
  isWeekend?: boolean;
}

/**
 * Comprehensive lifecycle stage spanning acquisition, activation, monetization
 * and re-engagement. Distinct from ChildLifecycleStage (behavioral only): this
 * unifies billing + behavior + inactivity into one strategy-driving stage.
 */
export type LifecycleStage =
  | "NEW_INSTALL"
  | "ONBOARDING"
  | "ROUTINE_CREATED"
  | "FIRST_SUCCESS"
  | "DAILY_USER"
  | "POWER_USER"
  | "TRIAL_USER"
  | "TRIAL_ENDING"
  | "HIGH_PURCHASE_INTENT"
  | "PREMIUM_SUBSCRIBER"
  | "SUBSCRIPTION_EXPIRING"
  | "INACTIVE_1D"
  | "INACTIVE_3D"
  | "INACTIVE_7D"
  | "INACTIVE_14D"
  | "RETURNING_USER";

export interface OutcomeContext {
  signals: OutcomeSignals;
  goal: NotificationGoal;
  childLifecycleStage: ChildLifecycleStage;
  parentMilestone: ParentMilestone | null;
  campaignId: string | null;
  campaignStep: number | null;
  experimentId: string | null;
  experimentVariant: string | null;
}

export interface CampaignDefinition {
  id: string;
  name: string;
  durationDays: 3 | 7 | 14 | 30;
  goal: NotificationGoal;
  steps: Array<{
    day: number;
    title: string;
    body: string;
    deepLink: string;
  }>;
}

export interface OutcomeHistoryEntry {
  notificationLogId?: number;
  category: string;
  goal: NotificationGoal | null;
  sentAt: Date;
  openedAt: Date | null;
  outcomeEvent: OutcomeEventType | null;
  outcomeAt: Date | null;
}

export interface NotificationOutcomeMeta {
  goal: NotificationGoal;
  childLifecycleStage: ChildLifecycleStage;
  parentMilestone?: ParentMilestone | null;
  campaignId?: string | null;
  campaignStep?: number | null;
  businessImpactScore?: number;
  routineCompletionProb?: number;
  learningCompletionProb?: number;
  retentionProb?: number;
  subscriptionProb?: number;
  engagementProb?: number;
  experimentId?: string | null;
  experimentVariant?: string | null;
}

export interface CategoryGoalMapping {
  category: NotificationCategory;
  primaryGoal: NotificationGoal;
  secondaryGoals: NotificationGoal[];
}
