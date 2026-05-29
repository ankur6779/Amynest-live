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
}

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
