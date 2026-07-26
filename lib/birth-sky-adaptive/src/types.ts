/**
 * Adaptive Intelligence Engine types — privacy-preserving, deterministic.
 * History must contain no personal identifiers (no names, user/child IDs, emails).
 */

import type { DevelopmentSnapshot } from "@workspace/birth-sky-development";

export const ADAPTIVE_ENGINE_VERSION = "adaptive-engine/1.0.0" as const;

export type EngagementLevel = "high" | "medium" | "low";

export type DayPart = "morning" | "afternoon" | "evening" | "night" | "unknown";

export type AdaptationAction = "continue" | "reduce" | "increase" | "rotate";

export type ParentFeedbackSignal =
  | "helpful"
  | "too_difficult"
  | "too_easy"
  | "child_enjoyed"
  | "child_ignored";

/** Anonymized activity counters only — never store titles with PII. */
export type ActivityHistoryItem = {
  type: string;
  completed?: number;
  skipped?: number;
  repeated?: number;
};

export type RoutineHistoryItem = {
  kind: string;
  count?: number;
  /** Optional drop-off step tag (e.g. "wind_down", "focus_block"). */
  dropOffStep?: string;
  lastDayPart?: DayPart | string;
};

export type ParentFeedbackItem = {
  signal: ParentFeedbackSignal | string;
  /** Optional activity/routine kind this feedback applies to. */
  targetType?: string;
  count?: number;
};

/**
 * Child history for adaptation — privacy contract:
 * - no names, emails, userId, childId, device ids
 * - no cross-user aggregates
 * - only this child's anonymized counters / tags
 */
export type AdaptiveHistoryInput = {
  completedRoutines?: RoutineHistoryItem[];
  skippedRoutines?: RoutineHistoryItem[];
  sessionFrequency?: {
    sessionsPerWeek?: number;
    avgSessionMinutes?: number;
  };
  achievements?: Array<{ type: string; count?: number }>;
  activities?: ActivityHistoryItem[];
  parentFeedback?: ParentFeedbackItem[];
};

export type LearningPreferences = {
  preferredActivities: string[];
  completedActivities: string[];
  repeatedInterests: string[];
  avoidedActivities: string[];
  engagementTrend: "rising" | "stable" | "falling" | "unknown";
};

export type EngagementProfile = {
  level: EngagementLevel;
  score: number;
  recommendedSessionLengthMinutes: number;
  preferredActivityTiming: DayPart;
  consistencyScore: number;
};

export type RoutineHealth = {
  completionRate: number;
  dropOffPoints: string[];
  missedStreaks: number;
  successfulStreaks: number;
  recommendations: Array<{
    kind: string;
    action: AdaptationAction;
    reason: string;
  }>;
};

export type AdaptationRecommendation = {
  id: string;
  action: AdaptationAction;
  priority: number;
  target: string;
  reason: string;
};

export type HistorySummary = {
  totalCompletions: number;
  totalSkips: number;
  sessionsPerWeek: number;
  feedbackSignals: string[];
  achievementTypes: string[];
};

export type AdaptiveSnapshot = {
  adaptiveEngineVersion: typeof ADAPTIVE_ENGINE_VERSION | string;
  generatedAt: string;
  engagementProfile: EngagementProfile;
  routineHealth: RoutineHealth;
  learningPreferences: LearningPreferences;
  adaptationRecommendations: AdaptationRecommendation[];
  confidence: number;
  historySummary: HistorySummary;
  /** Compact keys for AI facts — structured only, no advice prose. */
  profile: {
    engagementLevel: EngagementLevel;
    preferredActivityTypes: string[];
    recommendedSessionLengthMinutes: number;
    routineHealthLabel: string;
    adaptationPriority: string;
    consistencyScore: number;
  };
};

export type AdaptiveEngineInput = {
  development: DevelopmentSnapshot;
  history?: AdaptiveHistoryInput | null;
  /** Prefer existing snapshot when same engine version. */
  adaptiveSnapshot?: AdaptiveSnapshot | null;
};
