import type { ContentRankingWeights } from "../types-v2.js";
import type { ExperimentFlags } from "../types-v2.js";
import type { MlMetrics } from "./types.js";

export type OptimizationGoal = {
  id: string;
  metric: "engagement" | "retention" | "reward" | "accuracy";
  target: number;
  weight: number;
  priority: number;
};

export type SystemPerformanceSnapshot = {
  engagementScore: number;
  retentionRate: number;
  avgReward: number;
  modelAccuracy: number;
  sampleCount: number;
  updatedAt: string;
};

export type ModelHealthSnapshot = {
  activeVersion: number;
  candidateVersion?: number;
  lastTrainAt?: string;
  lastDeployAt?: string;
  validationScore: number;
  rollbackAvailable: boolean;
  status: "healthy" | "degraded" | "rolling_back";
};

export type ExperimentVariantState = {
  id: string;
  label: string;
  trafficShare: number;
  metrics: { engagement: number; retention: number; reward: number };
  status: "running" | "winner" | "disabled";
};

export type ExperimentState = {
  id: string;
  name: string;
  variants: ExperimentVariantState[];
  startedAt: string;
  winnerId?: string;
};

export type MetaState = {
  systemPerformance: SystemPerformanceSnapshot;
  modelHealth: ModelHealthSnapshot;
  experimentResults: Record<string, ExperimentState>;
  optimizationGoals: OptimizationGoal[];
  version: number;
  updatedAt: string;
};

export type SystemPolicy = {
  maxDifficultyJump: number;
  minEngagementThreshold: number;
  explorationBounds: { min: number; max: number };
  rewardLimits: { minCooldownMs: number; maxCooldownMs: number };
  maxTuningDeltaPerCycle: number;
};

export type TuningParameters = {
  explorationRate: number;
  difficultyRamp: "slow" | "fast";
  rewardFrequency: "low" | "medium" | "high";
  contentRankingWeights?: Partial<ContentRankingWeights>;
};

export type TuningAdjustments = {
  explorationRateDelta: number;
  difficultyRampShift?: "slower" | "faster" | "hold";
  rewardFrequencyShift?: "lower" | "higher" | "hold";
  reason: string;
};

export type DriftReport = {
  modelDrift: number;
  behaviorDrift: number;
  engagementDrop: number;
  severity: "none" | "low" | "medium" | "high";
  triggers: string[];
};

export type HumanOverride = {
  enabled: boolean;
  freezeAutoTuning?: boolean;
  forceRuleFallback?: boolean;
  explorationRate?: number;
  difficultyRamp?: "slow" | "fast";
  rewardFrequency?: "low" | "medium" | "high";
  note?: string;
  setAt?: string;
};

export type SystemHealthApi = {
  systemHealth: {
    engagementScore: number;
    retentionRate: number;
    modelAccuracy: number;
    experimentStatus: string;
    modelVersion: number;
    autoTuningActive: boolean;
    failSafeActive: boolean;
  };
};

export type MetaStateRecord = {
  metrics: MetaState;
  activeModels: { version: number; deployedAt: string }[];
  experiments: ExperimentState[];
  updatedAt: string;
};

export type MetaStateStore = {
  get(): Promise<MetaStateRecord | null>;
  upsert(record: MetaStateRecord): Promise<void>;
};

export type EffectiveRuntimeConfig = {
  experimentFlags: ExperimentFlags;
  explorationRate: number;
  difficultyRamp: "slow" | "fast";
  rewardFrequency: "low" | "medium" | "high";
  contentWeights: ContentRankingWeights;
  mlTrafficPercentage: number;
  forceRuleFallback: boolean;
  policyApplied: boolean;
};
