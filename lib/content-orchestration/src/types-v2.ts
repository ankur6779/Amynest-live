import type {
  AgeBand,
  CountryCode,
  DailyPlan,
  DevelopmentStage,
  DifficultyLevel,
  ModuleId,
  VariationFlag,
} from "./types.js";

export type SkillKey = "phonics" | "motor_skills" | "cognitive" | "social";

export type SkillState = {
  level: number;
  confidence: number;
  lastUpdated: string;
};

export type LearningProfileSkills = Record<SkillKey, SkillState>;

export type LearningProfileBehavior = {
  avgSessionTime: number;
  preferredModules: ModuleId[];
  dropOffPoints: string[];
  engagementScore: number;
};

export type LearningProfileAdaptability = {
  difficultyTolerance: number;
  noveltyPreference: number;
  repetitionTolerance: number;
};

export type LearningProfile = {
  childId: string;
  userId?: string;
  version: number;
  skills: LearningProfileSkills;
  behavior: LearningProfileBehavior;
  adaptability: LearningProfileAdaptability;
  updatedAt: string;
  createdAt: string;
};

export type AdaptiveDifficultyResult = {
  targetDifficulty: DifficultyLevel;
  targetLevel: number;
  confidenceAdjusted: number;
  injectHarder: boolean;
};

export type ContentRankingWeights = {
  noveltyWeight: number;
  difficultyMatchWeight: number;
  engagementWeight: number;
  explorationWeight: number;
};

export type RankedContentItem = {
  contentId: string;
  moduleId: ModuleId;
  contentScore: number;
  freshnessScore: number;
  difficultyFit: number;
  isNew: boolean;
  seenCount: number;
  difficultyLevel: DifficultyLevel;
  variationFlags: VariationFlag[];
};

export type SessionSlotKind = "warmup" | "core" | "exploration" | "reward";

export type SessionContentType = "learning" | "interactive" | "fun";

export type SessionPlanItem = {
  slot: SessionSlotKind;
  moduleId: ModuleId;
  contentId: string;
  contentType: SessionContentType;
  difficulty: DifficultyLevel;
  variationFlags?: VariationFlag[];
  explorationItem?: boolean;
};

export type PersonalizationMeta = {
  difficultyUsed: DifficultyLevel;
  explorationTriggered: boolean;
  explorationRate: number;
  experimentVariant?: string;
  profileVersion: number;
};

export type MonetizationHint = {
  showPremiumTeaser: boolean;
  contextualCta?: string;
  triggerReason?: string;
  previewModuleId?: ModuleId;
};

export type PersonalityPlanSnapshot = {
  curiosity: number;
  persistence: number;
  distractibility: number;
};

export type LearningPathPlanSnapshot = {
  currentGoal: string;
  progress: number;
};

export type PredictionPlanSnapshot = {
  dropOffRisk: number;
  recommendedDifficulty: DifficultyLevel;
  sessionLength: number;
  nextMilestones: string[];
  predictedEngagement?: number;
  confidence?: number;
};

export type GlobalInsightsPlanSnapshot = {
  recommendedPath: string[];
  cohortMatchScore: number;
};

export type TutorPlanSnapshot = {
  message: string;
  voiceUrl?: string;
  mode: "explain" | "ask" | "encourage" | "correct";
  nextExpectedResponse: "listen" | "answer" | "repeat" | "continue";
};

export type DailyPlanV2 = DailyPlan & {
  sessionPlan: SessionPlanItem[];
  skillSnapshot: LearningProfileSkills;
  personalizationMeta: PersonalizationMeta;
  monetization?: MonetizationHint;
  sessionFingerprint: string;
  personalitySnapshot?: PersonalityPlanSnapshot;
  learningPath?: LearningPathPlanSnapshot;
  prediction?: PredictionPlanSnapshot;
  tutor?: TutorPlanSnapshot;
  globalInsights?: GlobalInsightsPlanSnapshot;
};

export type ExperimentFlags = {
  explorationRate: readonly [number, number];
  difficultyRampSpeed: readonly ["slow", "fast"];
};

export type CountryLearningProfile = {
  pace: "fast" | "medium" | "slow";
  focus: ModuleId[];
  explorationBias: number;
  modulePriorityBoost?: Partial<Record<ModuleId, number>>;
};

export type CountryLearningProfileConfig = Record<CountryCode, CountryLearningProfile>;

export type SessionFeedbackInput = {
  childId: string;
  userId?: string;
  moduleId: ModuleId;
  contentId: string;
  completionRate: number;
  timeSpentSec: number;
  skips: number;
  retries: number;
  completed: boolean;
};

export type SessionFeedbackResult = {
  profile: LearningProfile;
  adjustments: {
    noveltyPreference?: number;
    difficultyTolerance?: number;
    repetitionTolerance?: number;
  };
};

export type LearningProfileStore = {
  get(childId: string): Promise<LearningProfile | null>;
  upsert(profile: LearningProfile): Promise<LearningProfile>;
};

export type GetDailyPlanV2Input = {
  childId: string;
  childDOB: string | Date;
  countryCode: CountryCode;
  userId?: string;
  dateIso?: string;
  unlockedModules?: ModuleId[];
  bypassCache?: boolean;
  profileStore?: LearningProfileStore;
  personalityStore?: import("./ml/types-personality.js").PersonalityProfileStore;
  learningPathStore?: import("./ml/types-personality.js").LearningPathStore;
  predictionStore?: import("./ml/types-prediction.js").PredictionStore;
  experimentBucket?: number;
  history?: import("./types.js").ContentHistoryEntry[];
  cache?: import("./types.js").CacheAdapter;
  contentPoolsOverride?: import("./types.js").ContentPool[];
};

export type ContentTemplate = {
  id: string;
  moduleId: ModuleId;
  variables: Record<string, readonly string[]>;
};

export type GeneratedTemplateVariant = {
  contentId: string;
  templateId: string;
  params: Record<string, string>;
  difficultyLevel: DifficultyLevel;
};

export type V2CacheKeyInput = {
  childId: string;
  dateIso: string;
  countryCode: CountryCode;
  unlockedModules: ModuleId[];
  skillProfileVersion: number;
  explorationSeed: number;
};
