import type { DifficultyLevel, ModuleId } from "../types.js";
import type { SkillKey } from "../types-v2.js";
import type { LearningPathMilestone } from "./types-personality.js";

export type SkillProgressionStatus = "plateau" | "fast_growth" | "steady";

export type SkillForecast = {
  skill: SkillKey;
  currentLevel: number;
  nextSkillLevel: number;
  progressionRate: number;
  status: SkillProgressionStatus;
};

export type PredictionOutput = {
  childId: string;
  nextSkillLevels: Partial<Record<SkillKey, number>>;
  skillForecasts: SkillForecast[];
  predictedEngagement: number;
  predictedDropOffRisk: number;
  recommendedDifficulty: DifficultyLevel;
  recommendedSessionLength: number;
  confidence: number;
  explorationSuccessRate: number;
  engagementTrend: number;
};

export type PredictionApiSnapshot = {
  dropOffRisk: number;
  recommendedDifficulty: DifficultyLevel;
  sessionLength: number;
  nextMilestones: string[];
  predictedEngagement: number;
  confidence: number;
};

export type SessionHistoryEntry = {
  endedAt: string;
  durationMinutes: number;
  skips: number;
  completions: number;
  engagementScore: number;
  explorationSuccesses: number;
  boredomSignals: number;
  skillLevels: Partial<Record<SkillKey, number>>;
};

export type FuturePathForecast = {
  nextMilestones: LearningPathMilestone[];
  estimatedCompletionDays: number;
  riskAreas: string[];
};

export type PredictionSnapshotRecord = {
  childId: string;
  predictedSkills: Partial<Record<SkillKey, number>>;
  dropOffRisk: number;
  engagementScore: number;
  confidence: number;
  createdAt: string;
};

export type PredictionStore = {
  save(snapshot: PredictionSnapshotRecord): Promise<void>;
  getLatest(childId: string): Promise<PredictionSnapshotRecord | null>;
};

export type PredictionDriftResult = {
  mismatch: number;
  confidencePenalty: number;
  explorationBoost: number;
};

export type PreSessionPlanAdjustments = {
  modulePriorityBoost: Partial<Record<ModuleId, number>>;
  difficultyBaseline: DifficultyLevel;
  explorationSlotBias: number;
  rewardFrequencyMultiplier: number;
  maxSessionItems: number;
  earlyIntervention: boolean;
};
