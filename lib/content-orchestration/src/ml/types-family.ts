import type { SkillKey } from "../types-v2.js";
import type { ModuleId } from "../types.js";

export type FamilyId = string;

export type SiblingPair = {
  olderChildId: string;
  youngerChildId: string;
};

export type FamilyRelationships = {
  siblings: SiblingPair[];
  ageOrder: string[];
};

export type LearningDynamics = {
  explorationBoostFromSiblings: number;
  teachingRoleChildId?: string;
  accelerationTargetChildId?: string;
  highlyEngagedChildIds: string[];
};

export type SharedTraits = {
  avgEngagement: number;
  dominantLearningPace: "slow" | "medium" | "fast";
  sharedStrengths: SkillKey[];
  sharedWeakAreas: SkillKey[];
};

export type FamilyGraph = {
  familyId: FamilyId;
  children: string[];
  relationships: FamilyRelationships;
  sharedTraits: SharedTraits;
  learningDynamics: LearningDynamics;
  version: number;
  updatedAt: string;
};

/** Internal only — never send to child-facing clients. */
export type InternalComparisonMetrics = {
  childId: string;
  relativeSkillLevels: Partial<Record<SkillKey, number>>;
  relativeEngagement: number;
  relativeProgressSpeed: number;
  rankLabel: string;
};

export type LearningGraphNode = {
  skill: SkillKey;
  moduleId?: ModuleId;
};

export type LearningGraphEdge = {
  from: SkillKey;
  to: SkillKey;
};

export type ChildProgressOnGraph = {
  childId: string;
  masteredSkills: SkillKey[];
  inProgressSkills: SkillKey[];
};

export type LearningGraph = {
  nodes: LearningGraphNode[];
  edges: LearningGraphEdge[];
  childProgressMapping: Record<string, ChildProgressOnGraph>;
  sharedKnowledgeAreas: SkillKey[];
};

export type FamilyInsights = {
  strongestSkillAcrossChildren: SkillKey | null;
  weakestAreas: SkillKey[];
  engagementPatterns: string;
  recommendedFocus: string;
  cooperativeOpportunities: string[];
};

export type ParentChildComparisonRow = {
  childId: string;
  displayName: string;
  engagementPercent: number;
  progressPercent: number;
  topSkill: string;
  streakDays: number;
  /** Self-improvement framing only — no "vs sibling" labels for kids */
  personalBestNote?: string;
};

export type FamilySummary = {
  totalLearningTimeMinutes: number;
  progressDistribution: Record<string, number>;
  skillCoverage: Partial<Record<SkillKey, number>>;
  childCount: number;
};

export type ParentDashboardPayload = {
  familySummary: FamilySummary;
  childComparisons: ParentChildComparisonRow[];
  recommendations: string[];
  insights: FamilyInsights;
};

export type FamilyApiPayload = {
  family: {
    insights: FamilyInsights;
    recommendations: string[];
    childComparisons: ParentChildComparisonRow[];
    familySummary?: FamilySummary;
  };
};

export type FamilyRiskPrediction = {
  dropOffRiskPerChild: Record<string, number>;
  overallEngagementTrend: number;
  disengagedChildIds: string[];
};

export type CrossChildSignals = {
  difficultyNudge: number;
  explorationBoost: number;
  teachingRoleRecommended: boolean;
  exposureAcceleration: boolean;
};

export type CooperativeTurnRole = "answer" | "verify" | "collaborate";

export type CooperativeSessionState = {
  familyId: FamilyId;
  activeChildId: string;
  partnerChildId: string;
  turn: CooperativeTurnRole;
  taskId: string;
  round: number;
};

export type AchievementBadge = {
  id: string;
  title: string;
  earnedByChildId: string;
  earnedAt: string;
};

export type HealthyStreakState = {
  childId: string;
  personalStreakDays: number;
  lastActiveDate: string;
};

export type FamilyGraphStore = {
  get(familyId: FamilyId): Promise<FamilyGraphRecord | null>;
  upsert(record: FamilyGraphRecord): Promise<FamilyGraphRecord>;
};

export type FamilyGraphRecord = {
  familyId: FamilyId;
  graph: LearningGraph;
  insights: FamilyInsights;
  version: number;
  updatedAt: string;
};

export type ChildFamilySnapshot = {
  childId: string;
  displayName: string;
  ageMonths: number;
  profile: import("../types-v2.js").LearningProfile;
  personality?: import("./types-personality.js").PersonalityProfile;
  prediction?: import("./types-prediction.js").PredictionOutput;
  sessionMinutes?: number;
};
