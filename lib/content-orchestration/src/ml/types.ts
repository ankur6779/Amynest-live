import type { AgeBand, DevelopmentStage, DifficultyLevel, ModuleId } from "../types.js";
import type { SkillKey } from "../types-v2.js";
import type { PersonalityTraits } from "./types-personality.js";
import type { RealtimeDecision, RealtimeDecisionAction } from "../realtime/types.js";

/** NBA action space (ML output). */
export type NbaAction =
  | "INCREASE_DIFFICULTY"
  | "DECREASE_DIFFICULTY"
  | "SWAP_CONTENT"
  | "INJECT_REWARD"
  | "INTRODUCE_EXPLORATION"
  | "KEEP_AS_IS";

export const NBA_ACTIONS: readonly NbaAction[] = [
  "INCREASE_DIFFICULTY",
  "DECREASE_DIFFICULTY",
  "SWAP_CONTENT",
  "INJECT_REWARD",
  "INTRODUCE_EXPLORATION",
  "KEEP_AS_IS",
] as const;

export type LastFiveEventFeatures = {
  skips: number;
  completions: number;
  avgResponseTime: number;
  accuracy: number;
};

export type TrendFeatures = {
  skipTrend: number;
  responseTimeTrend: number;
  engagementTrend: number;
};

export type ActionStabilityFeatures = {
  actionHistory: NbaAction[];
  actionChangeFrequency: number;
  stabilityPenalty: number;
};

export type NbaFeatureVector = {
  ageBand: AgeBand;
  developmentStage: DevelopmentStage;
  currentModule: ModuleId;
  currentDifficulty: DifficultyLevel;
  last5Events: LastFiveEventFeatures;
  attentionState: {
    focusLevel: number;
    fatigueLevel: number;
    boredomLevel: number;
  };
  sessionProgress: number;
  skillLevels: Record<SkillKey, number>;
  engagementScore: number;
  explorationRate: number;
  trends: TrendFeatures;
  actionStability: ActionStabilityFeatures;
  segmentKey: string;
  personalityTraits: PersonalityTraits;
};

/** Normalized flat vector for model input (all values 0–1). */
export type NormalizedFeatureVector = {
  values: Float32Array;
  names: readonly string[];
};

export type ModelPrediction = {
  action: NbaAction;
  confidence: number;
  probabilities: Record<NbaAction, number>;
  rewardEstimate: number;
};

export type HybridDecisionMeta = {
  source: "ml" | "rule";
  confidence: number;
  rewardEstimate: number;
  nbaAction?: NbaAction;
  mlEnabled: boolean;
  fallbackUsed: boolean;
};

export type EnrichedRealtimeDecision = RealtimeDecision & HybridDecisionMeta;

export type DecisionOutcome = {
  completed: boolean;
  skipped: boolean;
  idle: boolean;
  engagementDelta: number;
  engagementHigh?: boolean;
  exploredContent?: boolean;
  difficultyLevel?: number;
  skillLevel?: number;
};

export type RewardResult = {
  rawReward: number;
  normalizedReward: number;
};

export type RewardContext = {
  outcome: DecisionOutcome;
  difficultyLevel: number;
  skillLevel: number;
};

export type NbaDecisionLog = {
  id?: string;
  childId: string;
  timestamp: number;
  features: NbaFeatureVector;
  normalizedFeatures: number[];
  actionTaken: NbaAction;
  mappedAction: RealtimeDecisionAction;
  source: "ml" | "rule";
  confidence: number;
  rewardEstimate: number;
  segmentKey?: string;
  outcome?: DecisionOutcome;
  /** @deprecated use normalizedReward */
  reward?: number;
  rawReward?: number;
  normalizedReward?: number;
};

export type MlMetrics = {
  predictionAccuracy: number;
  avgReward: number;
  engagementLift: number;
  fallbackRate: number;
  sampleCount: number;
  sessionReturnRate: number;
  nextDayRetention: number;
  avgSessionLengthDelta: number;
  mlVsRuleEngagementLift: number;
  mlAvgSessionLength: number;
  ruleAvgSessionLength: number;
};

export type MlExperimentFlags = {
  mlEnabled: boolean;
  mlTrafficPercentage: number;
  mlConfidenceThreshold: number;
  banditEpsilon: number;
  banditStrategy: "epsilon_greedy" | "ucb" | "guided";
  forceRuleFallback?: boolean;
};

export const DEFAULT_ML_EXPERIMENTS: MlExperimentFlags = {
  mlEnabled: true,
  mlTrafficPercentage: 0.3,
  mlConfidenceThreshold: 0.65,
  banditEpsilon: 0.15,
  banditStrategy: "guided",
};
