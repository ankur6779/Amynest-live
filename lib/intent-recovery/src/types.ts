import type { ActionTarget } from "@workspace/action-routing";

/** What the parent was trying to accomplish. */
export type IntentType =
  | "COMPLETE_ROUTINE"
  | "FINISH_ROUTINE_ITEM"
  | "FINISH_LESSON"
  | "CONTINUE_LEARNING_SESSION"
  | "CONTINUE_CAMPAIGN"
  | "START_READING_CHALLENGE"
  | "CONTINUE_PHONICS_CHALLENGE"
  | "CONTINUE_NUTRITION_CHALLENGE"
  | "REVIEW_WEEKLY_REPORT"
  | "COMPLETE_GOAL_STEP"
  | "RESUME_AUDIO_LESSON"
  | "CONTINUE_SPEECH_COACH"
  | "AMY_RECOMMENDED_ACTION"
  | "NOTIFICATION_ACTION";

export type IntentSource =
  | "notification"
  | "amy_recommendation"
  | "parent_hub"
  | "campaign"
  | "goal"
  | "learning"
  | "routine"
  | "deep_link"
  | "interruption";

export type IntentState =
  | "pending"
  | "started"
  | "in_progress"
  | "completed"
  | "abandoned"
  | "expired";

export type IntentAnalyticsEvent =
  | "intent_created"
  | "intent_started"
  | "intent_resumed"
  | "intent_completed"
  | "intent_abandoned"
  | "intent_expired"
  | "intent_interrupted";

export interface UserIntent {
  intentId: string;
  userId: string;
  childId: number | null;
  intentType: IntentType;
  intentSource: IntentSource;
  intentPriority: number;
  state: IntentState;
  title: string;
  subtitle: string;
  amyContinuationLine: string;
  actionTarget: ActionTarget;
  entityId: string | null;
  href: string;
  progressPct: number;
  progressJson: Record<string, unknown>;
  deviceId: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  interruptedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
}

export interface ContinueJourneyView {
  hasUnfinished: boolean;
  topIntent: UserIntent | null;
  amyLine: string;
  allUnfinished: UserIntent[];
}

export interface IntentRoiRow {
  intentType: IntentType;
  created: number;
  completed: number;
  abandoned: number;
  completionRate: number;
  avgHoursToComplete: number | null;
}

export interface CreateIntentInput {
  userId: string;
  childId?: number | null;
  intentType: IntentType;
  intentSource: IntentSource;
  intentPriority?: number;
  title: string;
  subtitle?: string;
  amyContinuationLine?: string;
  actionTarget: ActionTarget;
  entityId?: string | null;
  href: string;
  progressPct?: number;
  progressJson?: Record<string, unknown>;
  deviceId?: string | null;
  ttlHours?: number;
}

export interface IntentSyncContext {
  userId: string;
  childId: number | null;
  childName: string;
  /** Active campaign from notification_campaign_progress */
  campaign?: {
    campaignId: string;
    currentStep: number;
    stepCompletedAt: Record<string, string>;
    startedAt: Date;
  } | null;
  /** Incomplete daily learning session */
  learningSession?: {
    sessionId: string;
    stepsCompleted: number;
    stepsTotal: number;
    lastActivityId: string | null;
  } | null;
  /** First incomplete routine item today */
  routineTask?: {
    routineId: number;
    routineTitle: string;
    itemIndex: number;
    itemTitle: string;
    completedCount: number;
    totalCount: number;
  } | null;
  /** Active family goal with partial progress */
  activeGoal?: {
    goalId: string;
    goalType: string;
    progress: number;
    targetValue: number;
  } | null;
}
