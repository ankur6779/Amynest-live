/**
 * AI Evaluation Framework — quality measurement only.
 * Does not alter astronomy / meaning / development / adaptive / conversation / evidence engines.
 */

export const EVALUATION_FRAMEWORK_VERSION = "ai-evaluation/1.0.0" as const;

/** Default CI threshold (0–100). */
export const DEFAULT_MIN_OVERALL_SCORE = 90;

export type MetricId =
  | "consistency"
  | "completeness"
  | "safety"
  | "developmentAlignment"
  | "conversationQuality"
  | "evidenceCoverage"
  | "noHallucinatedAstronomy"
  | "determinism"
  | "readability"
  | "parentUsefulness";

export type MetricScore = {
  id: MetricId;
  score: number;
  weight: number;
  notes: string[];
};

export type EngineScoreId =
  | "meaning"
  | "development"
  | "adaptive"
  | "conversation"
  | "evidence";

export type ScenarioCategory =
  | "newborn"
  | "toddler"
  | "preschool"
  | "school_age"
  | "teen"
  | "routine"
  | "sleep"
  | "behaviour"
  | "astrology";

export type GoldenScenario = {
  id: string;
  category: ScenarioCategory;
  label: string;
  astronomy: {
    sunSign: string;
    moonSign: string;
    risingSign?: string | null;
    planetHouseMap?: Partial<Record<string, number>>;
  };
  ageMonths: number;
  parentGoals?: string[];
  routines?: Array<{ kind: string; present?: boolean }>;
  adaptiveHistory?: {
    sessionFrequency?: { sessionsPerWeek?: number; avgSessionMinutes?: number };
    completedRoutines?: Array<{ kind: string; count?: number }>;
    skippedRoutines?: Array<{ kind: string; count?: number }>;
    activities?: Array<{
      type: string;
      completed?: number;
      skipped?: number;
      repeated?: number;
    }>;
    parentFeedback?: Array<{ signal: string; targetType?: string; count?: number }>;
  };
  userQuestion: string;
  entryPoint?: string;
  /** Expected conversation intent (soft check). */
  expectedIntent?: string;
  /** Topics that should appear in conversation avoid list. */
  requiredAvoidTopics?: string[];
};

export type ScenarioPipelineOutput = {
  meaningEngineVersion: string;
  developmentEngineVersion: string;
  adaptiveEngineVersion: string;
  conversationEngineVersion: string;
  evidenceEngineVersion: string;
  meaningProfile: Record<string, string[]>;
  developmentStage: string;
  developmentPriorities: string[];
  engagementLevel: string;
  conversationIntent: string;
  conversationDepth: string;
  conversationTone: string;
  conversationOrder: string[];
  safetyFlags: string[];
  avoidTopics: string[];
  evidenceTraceCount: number;
  evidenceEdgeCount: number;
  fingerprint: string;
};

export type ScenarioResult = {
  scenarioId: string;
  category: ScenarioCategory;
  passed: boolean;
  overallScore: number;
  metrics: MetricScore[];
  warnings: string[];
  failures: string[];
  output: ScenarioPipelineOutput;
  baselineMatch: boolean | null;
};

export type EvaluationReport = {
  evaluationFrameworkVersion: typeof EVALUATION_FRAMEWORK_VERSION | string;
  generatedAt: string;
  overallScore: number;
  threshold: number;
  passed: boolean;
  perEngineScores: Record<EngineScoreId, number>;
  scenarioResults: ScenarioResult[];
  failedScenarios: string[];
  warnings: string[];
  trend: {
    direction: "up" | "flat" | "down" | "unknown";
    previousOverall: number | null;
    delta: number | null;
  };
  summary: string;
};

export type EvaluationOptions = {
  threshold?: number;
  updateBaselines?: boolean;
  baselinesPath?: string;
  previousOverall?: number | null;
};
