import type { AgeBand, CountryCode, ModuleId } from "../types.js";
import type { DifficultyLevel } from "../types.js";
import type { SkillKey } from "../types-v2.js";
import type { PersonalityProfile } from "./types-personality.js";

/** Anonymous aggregate event — no childId or PII. */
export type AnonymousAggregateEvent = {
  skill: SkillKey;
  moduleId: ModuleId;
  contentKey: string;
  success: boolean;
  attempts: number;
  engagementScore: number;
  droppedOff: boolean;
  cohortKey: CohortKey;
};

export type CohortKey = string;

export type GlobalGraph = {
  skills: SkillKey[];
  difficultyLevels: Record<string, number>;
  successRates: Record<string, number>;
  engagementStats: Record<string, number>;
  transitions: Record<string, Record<string, number>>;
  version: number;
  updatedAt: string;
};

export type CommunityPatterns = {
  bestSequences: string[][];
  riskySequences: string[][];
  highRetentionFlows: string[][];
};

export type GlobalInsights = {
  recommendedPath: string[];
  difficultyCalibration: Record<string, number>;
  cohortMatchScore: number;
};

export type GlobalApiPayload = {
  globalInsights: GlobalInsights;
};

export type GlobalPlanContext = {
  cohortKey: CohortKey;
  insights: GlobalInsights;
  globalSuccessWeight: number;
  explorationCandidates: string[];
  isColdStart: boolean;
};

export type GlobalLearningGraphRow = {
  skill: string;
  successRate: number;
  engagementScore: number;
  transitions: Record<string, number>;
  updatedAt: string;
};

export type GlobalGraphStore = {
  getAll(): Promise<GlobalLearningGraphRow[]>;
  upsertSkill(row: GlobalLearningGraphRow): Promise<void>;
  upsertMany(rows: GlobalLearningGraphRow[]): Promise<void>;
};

export type GlobalContentBoostInput = {
  contentKey: string;
  moduleId: ModuleId;
  skill?: SkillKey;
  successRate?: number;
  weight?: number;
};

export type CohortDefinition = {
  ageBand: AgeBand;
  countryCode: CountryCode;
  personalityCluster: PersonalityCluster;
};

export type PersonalityCluster =
  | "explorer"
  | "steady"
  | "focused"
  | "balanced";

export type ColdStartPath = {
  modules: ModuleId[];
  skills: SkillKey[];
  difficulty: DifficultyLevel;
};
