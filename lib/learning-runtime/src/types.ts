/**
 * Amy Learning Runtime — consumes learning events, emits learning decisions.
 * Pure types. No React / I/O.
 */

export const LEARNING_RUNTIME_SCHEMA_VERSION = 1 as const;

export type DifficultyDecision = "easier" | "same" | "harder";
export type HintsDecision = "none" | "light" | "guided";
export type NarrationLength = "short" | "medium" | "long";
export type CelebrationLevel = 0 | 1 | 2 | 3;
export type RewardPriority = "low" | "normal" | "high";

export type ActivityKind =
  | "discovery_play"
  | "speech_practice"
  | "story"
  | "reading"
  | "game"
  | "review"
  | "daily_mission"
  | "break"
  | "explore";

export type NextActivity = {
  kind: ActivityKind;
  entityId?: string | null;
  conceptId?: string | null;
  skillId?: string | null;
  href?: string | null;
  label?: string | null;
};

export type ReviewQueueItem = {
  conceptId?: string;
  entityId?: string;
  skillId?: string;
  priority: number;
  reason: string;
};

export type RecommendationDecision = {
  id: string;
  title: string;
  reason: string;
  href?: string | null;
  skillId?: string | null;
  conceptId?: string | null;
  priority: "high" | "medium" | "low";
};

export type DecisionEvidence = {
  key: string;
  value: string | number | boolean | null;
  source: string;
};

/**
 * Observable learning decision — every field a module may consume.
 * Always includes reason / evidence / ruleId / confidence / timestamp.
 */
export type LearningDecision = {
  schemaVersion: typeof LEARNING_RUNTIME_SCHEMA_VERSION;
  id: string;
  childId: string;
  timestamp: string;
  nextActivity: NextActivity | null;
  difficulty: DifficultyDecision;
  hints: HintsDecision;
  celebrationLevel: CelebrationLevel;
  narrationLength: NarrationLength;
  reviewQueue: ReviewQueueItem[];
  recommendation: RecommendationDecision | null;
  breakSuggestion: boolean;
  rewardPriority: RewardPriority;
  /** Primary human/machine reason string. */
  reason: string;
  evidence: DecisionEvidence[];
  /** Winning / primary rule id. */
  ruleId: string;
  /** All rules that contributed patches this tick. */
  contributingRuleIds: string[];
  confidence: number;
  /** Triggering event id when driven by the bus. */
  sourceEventId?: string | null;
  latencyMs?: number;
};

/** Injected read-only snapshots — host supplies, runtime never fetches. */
export type RuntimeChildProfile = {
  id: string | number;
  name?: string;
  age?: number;
  ageMonths?: number;
  isPremium?: boolean;
  energyProfile?: string | null;
};

export type RuntimeSkillEntry = {
  skillId: string;
  mastery: number;
  confidence: number;
  progressionStage?: string;
  weakAreas?: string[];
};

export type RuntimeKnowledgeSnapshot = {
  strugglingNodeIds?: string[];
  forgottenNodeIds?: string[];
  masteredNodeIds?: string[];
  topRecommendations?: Array<{
    nodeId: string;
    label: string;
    reason: string;
    score: number;
    links?: {
      speechRoute?: string;
      discoveryWorldId?: string;
      discoveryItemId?: string;
      storyId?: string;
      readingId?: string;
      gameId?: string;
    };
  }>;
  avgConfidence?: number;
  weakPhonemes?: Array<{ nodeId: string; label: string; confidence: number }>;
};

export type RuntimeAttentionSnapshot = {
  score: number;
  classification: string;
  rhythm?: string;
  suggestBreak?: boolean;
  taskDifficulty?: "easier" | "same" | "harder";
  visualComplexity?: "low" | "medium" | "high";
};

export type RuntimeDailyMissionSnapshot = {
  hubPct: number;
  hubDone: number;
  hubTotal: number;
  worldId?: string;
};

export type RuntimeSessionHistory = {
  recentEventTypes: string[];
  successStreak: number;
  failStreak: number;
  eventsInSession: number;
  lastActivityAt?: string | null;
};

export type RuntimeInputSnapshots = {
  child?: RuntimeChildProfile | null;
  skills?: RuntimeSkillEntry[] | null;
  knowledge?: RuntimeKnowledgeSnapshot | null;
  attention?: RuntimeAttentionSnapshot | null;
  dailyMission?: RuntimeDailyMissionSnapshot | null;
  session?: RuntimeSessionHistory | null;
  /** Feature flags: flag id → enabled. */
  featureFlags?: Record<string, boolean> | null;
};

/** Per-child incremental runtime state (in-memory). */
export type ChildRuntimeState = {
  childId: string;
  updatedAt: string;
  lastEventType: string | null;
  lastEventId: string | null;
  lastEntityId: string | null;
  lastConceptId: string | null;
  lastConfidence: number | null;
  lastModule: string | null;
  attentionClass: string | null;
  attentionScore: number | null;
  suggestBreak: boolean;
  successStreak: number;
  failStreak: number;
  eventsInSession: number;
  sessionId: string | null;
  recentEventTypes: string[];
  /** ruleId → last fired epoch ms */
  ruleCooldowns: Record<string, number>;
  /** Last emitted decision id */
  lastDecisionId: string | null;
  hubMissionPct: number | null;
};

export type NormalizedSignal = {
  eventId: string;
  type: string;
  childId: string;
  timestamp: string;
  module: string;
  entityId: string | null;
  conceptId: string | null;
  confidence: number | null;
  difficulty: string | number | null;
  sessionId: string | null;
  metadata: Record<string, unknown>;
  /** Derived booleans for fast rule conditions. */
  flags: {
    isSuccess: boolean;
    isFailure: boolean;
    isMastery: boolean;
    isAttention: boolean;
    isSpeech: boolean;
    isStory: boolean;
    isReading: boolean;
    isGame: boolean;
    isDailyMission: boolean;
    isKnowledge: boolean;
  };
};

/** Declarative condition DSL — no arbitrary code in rule packs. */
export type RuleCondition =
  | { op: "eq"; path: string; value: unknown }
  | { op: "neq"; path: string; value: unknown }
  | { op: "gte"; path: string; value: number }
  | { op: "lte"; path: string; value: number }
  | { op: "gt"; path: string; value: number }
  | { op: "lt"; path: string; value: number }
  | { op: "in"; path: string; value: unknown[] }
  | { op: "truthy"; path: string }
  | { op: "falsy"; path: string }
  | { op: "and"; all: RuleCondition[] }
  | { op: "or"; any: RuleCondition[] }
  | { op: "not"; cond: RuleCondition };

export type DecisionPatch = {
  nextActivity?: NextActivity | null;
  difficulty?: DifficultyDecision;
  hints?: HintsDecision;
  celebrationLevel?: CelebrationLevel;
  narrationLength?: NarrationLength;
  reviewQueue?: ReviewQueueItem[];
  recommendation?: RecommendationDecision | null;
  breakSuggestion?: boolean;
  rewardPriority?: RewardPriority;
  reason: string;
  evidence?: DecisionEvidence[];
  confidence?: number;
};

export type RuntimeRule = {
  id: string;
  /** Higher wins when merging patches for the same field; evaluation order too. */
  priority: number;
  /** Minimum ms between firings for this child. */
  cooldownMs?: number;
  /** Other rule ids that must have fired in this evaluation tick. */
  dependsOn?: string[];
  /** Feature flag key that must be enabled (missing = enabled). */
  featureFlag?: string;
  when: RuleCondition;
  then: DecisionPatch;
};

export type RuleContext = {
  signal: NormalizedSignal;
  state: ChildRuntimeState;
  snapshots: RuntimeInputSnapshots;
  nowMs: number;
  featureFlags: Record<string, boolean>;
};
