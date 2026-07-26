/**
 * Development Intelligence Engine types — normalized developmental guidance.
 * No paragraphs; deterministic concept tags and scores only.
 */

import type { MeaningSnapshot } from "@workspace/birth-sky-meaning";

export const DEVELOPMENT_ENGINE_VERSION = "development-engine/1.0.0" as const;

export type DevelopmentDomain =
  | "emotionalRegulation"
  | "communication"
  | "socialInteraction"
  | "learningStyle"
  | "attention"
  | "creativity"
  | "motorDevelopment"
  | "sleepTendencies"
  | "routineAdaptability"
  | "curiosity"
  | "confidence";

export const DEVELOPMENT_DOMAINS: DevelopmentDomain[] = [
  "emotionalRegulation",
  "communication",
  "socialInteraction",
  "learningStyle",
  "attention",
  "creativity",
  "motorDevelopment",
  "sleepTendencies",
  "routineAdaptability",
  "curiosity",
  "confidence",
];

export type AgeStageId =
  | "infant_0_6"
  | "infant_6_12"
  | "toddler_1_2"
  | "toddler_2_3"
  | "preschool_3_5"
  | "school_5_8"
  | "school_8_12"
  | "teen_12_18";

export type AgeStage = {
  id: AgeStageId;
  label: string;
  ageMonthsMin: number;
  ageMonthsMax: number;
  capabilities: string[];
};

export type ParentGoalId =
  | "better_sleep"
  | "better_focus"
  | "confidence"
  | "emotional_resilience"
  | "learning_habits"
  | "communication"
  | "friendship"
  | "self_regulation";

export type RoutineKind =
  | "sleep"
  | "morning"
  | "focus"
  | "meal"
  | "outdoor"
  | "reading"
  | "play"
  | "wind_down"
  | "social"
  | "other";

export type RoutineInput = {
  kind: RoutineKind | string;
  label?: string;
  present?: boolean;
};

export type DomainScore = {
  domain: DevelopmentDomain;
  score: number;
  labels: string[];
  confidence: number;
};

export type PriorityArea = {
  id: string;
  domain: DevelopmentDomain;
  label: string;
  rank: number;
  score: number;
  reason: string;
};

export type RecommendedItem = {
  id: string;
  label: string;
  domain?: DevelopmentDomain;
  priority: number;
};

export type AvoidPattern = {
  id: string;
  label: string;
};

export type RoutineAlignment = {
  strengths: string[];
  missingOpportunities: string[];
  suggestedImprovements: string[];
  priorityRanking: string[];
};

export type DevelopmentSnapshot = {
  developmentEngineVersion: typeof DEVELOPMENT_ENGINE_VERSION | string;
  generatedAt: string;
  stage: AgeStage;
  ageMonths: number;
  developmentProfile: Record<DevelopmentDomain, DomainScore>;
  priorityAreas: PriorityArea[];
  recommendedActivities: RecommendedItem[];
  recommendedParentActions: RecommendedItem[];
  avoidPatterns: AvoidPattern[];
  routineAlignment: RoutineAlignment;
  confidence: number;
  /** Compact keys for AI facts. */
  profile: {
    developmentStage: string;
    learningProfile: string[];
    emotionalProfile: string[];
    topPriorities: string[];
    recommendedParentActions: string[];
    avoidPatterns: string[];
  };
};

export type DevelopmentEngineInput = {
  meaning: MeaningSnapshot;
  /** Age in whole months (preferred). */
  ageMonths?: number | null;
  /** ISO date YYYY-MM-DD — used when ageMonths omitted. */
  birthDate?: string | null;
  /** Reference date for age calc (tests); defaults to UTC today. */
  asOfDate?: string | null;
  milestones?: string[];
  routines?: RoutineInput[];
  parentGoals?: Array<ParentGoalId | string>;
  /** Prefer existing snapshot when same engine version. */
  developmentSnapshot?: DevelopmentSnapshot | null;
};
