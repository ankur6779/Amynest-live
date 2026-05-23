import type { AgeBand, DevelopmentStage, DifficultyLevel, ModuleId } from "../types.js";
import type { LearningProfile, SessionPlanItem } from "../types-v2.js";
import type { NbaAction } from "../ml/types.js";

export type RealtimeEventType =
  | "CONTENT_STARTED"
  | "CONTENT_COMPLETED"
  | "CONTENT_SKIPPED"
  | "USER_IDLE"
  | "RAPID_INTERACTION"
  | "SESSION_PAUSED";

export type RealtimeEventMetadata = {
  responseTime?: number;
  tapCount?: number;
  duration?: number;
  correct?: boolean;
};

export type RealtimeEvent = {
  type: RealtimeEventType;
  childId: string;
  contentId: string;
  moduleId: ModuleId;
  timestamp: number;
  metadata?: RealtimeEventMetadata;
};

export type RealtimeDecisionAction =
  | "ADJUST_DIFFICULTY"
  | "SWAP_CONTENT"
  | "INJECT_REWARD"
  | "SHORTEN_SESSION"
  | "NOOP";

export type RealtimeDecision = {
  action: RealtimeDecisionAction;
  payload: Record<string, unknown>;
  reason: string;
};

export type AttentionState = {
  focusLevel: number;
  fatigueLevel: number;
  boredomLevel: number;
  lastUpdated: number;
};

export type LiveDifficultyState = {
  baseDifficulty: DifficultyLevel;
  baseLevel: number;
  liveLevel: number;
  liveDifficulty: DifficultyLevel;
  adjustments: number;
};

export type RealtimeSessionState = {
  childId: string;
  sessionPlan: SessionPlanItem[];
  currentIndex: number;
  profile: LearningProfile;
  attention: AttentionState;
  liveDifficulty: LiveDifficultyState;
  recentEvents: RealtimeEvent[];
  explorationRate: number;
  startedAt: number;
  lastEventAt: number;
  ageBand?: AgeBand;
  developmentStage?: DevelopmentStage;
  countryCode?: string;
  recentNbaActions?: NbaAction[];
  lastDecisionSource?: "ml" | "rule";
  personalityProfile?: import("../ml/types-personality.js").PersonalityProfile;
  learningPath?: import("../ml/types-personality.js").LearningPath;
  behavioralPrediction?: import("../ml/types-prediction.js").PredictionOutput;
};

export type SessionUpdateMessage = {
  type: "session_update";
  action: RealtimeDecisionAction;
  payload: Record<string, unknown>;
  sessionPlan: SessionPlanItem[];
  currentIndex: number;
  attention: AttentionState;
  liveDifficulty: LiveDifficultyState;
  explorationRate: number;
  source?: "ml" | "rule";
  confidence?: number;
  rewardEstimate?: number;
  nbaAction?: NbaAction;
  mlEnabled?: boolean;
  fallbackUsed?: boolean;
};

export type ClientEmitMessage = {
  type: "event";
  payload: RealtimeEvent;
};

export type ClientSubscribeMessage = {
  type: "subscribe";
  childId: string;
  sessionPlan: SessionPlanItem[];
  profile?: LearningProfile;
  countryCode?: string;
  ageBand?: AgeBand;
  developmentStage?: DevelopmentStage;
};

export type FallbackMode = {
  realtimeDisabled: boolean;
  useStaticPlan: boolean;
};

export type RealtimeExperimentFlags = {
  realtimeEnabled: boolean;
  rewardFrequency: "low" | "medium" | "high";
};

export const DEFAULT_REALTIME_EXPERIMENTS: RealtimeExperimentFlags = {
  realtimeEnabled: true,
  rewardFrequency: "medium",
};

export const DEFAULT_FALLBACK_MODE: FallbackMode = {
  realtimeDisabled: false,
  useStaticPlan: false,
};
