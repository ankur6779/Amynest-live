// ─────────────────────────────────────────────────────────────────────────────
// Module 3 — Explainability Engine
// Core type contracts for the reason attribution + decision tracing system.
// All types are serialisable (no class instances, no Dates — only strings).
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical set of signals that can influence a recommendation. */
export type FactorKind =
  | "sleep_quality"
  | "sleep_duration"
  | "mood"
  | "energy_level"
  | "weather"
  | "caregiver"
  | "learning_weight"
  | "activity_completion"
  | "meal_history"
  | "schedule_density"
  | "age_band"
  | "special_plan"
  | "household_conflict"
  | "allergy"
  | "cultural_preference"
  | "ai_adaptation";

/** A single contributing factor extracted from the recommendation context. */
export interface DecisionFactor {
  kind: FactorKind;
  label: string;
  influence: "positive" | "negative" | "neutral";
  /** Relative importance in [0, 1] where 1 is maximally influential. */
  weight: number;
  detail: string;
  /** Optional icon key (maps to UI icon library). */
  icon?: string;
}

/** Confidence of the explanation itself, not the recommendation. */
export interface ConfidenceScore {
  /** Integer 0–100. */
  value: number;
  tier: "high" | "medium" | "low";
  rationale: string;
}

/** A single step in the decision reasoning chain. */
export interface ReasoningStep {
  order: number;
  title: string;
  detail: string;
  /** Which factor kinds contributed to this step. */
  factors: FactorKind[];
}

/**
 * Ordered trace of the engine's reasoning — enables the Recommendation
 * Trace Panel in the UI.
 */
export interface ReasoningTrace {
  steps: ReasoningStep[];
  totalFactors: number;
  primaryFactor: FactorKind;
}

/**
 * Input context fed to the explainability engine.
 * All fields are optional — the engine degrades gracefully
 * with fewer signals, adjusting confidence accordingly.
 */
export interface ExplanationContext {
  // ── Child signals ──────────────────────────────────────────────────────────
  childId?: number;
  childAgeMonths?: number;
  ageGroup?: string;
  mood?: string;
  sleepQuality?: "good" | "average" | "poor";
  sleepDurationHours?: number;
  energyLevel?: "high" | "medium" | "low";

  // ── Environment ───────────────────────────────────────────────────────────
  weatherOutdoor?: "yes" | "no" | "limited";
  caregiver?: string;

  // ── Routine context ───────────────────────────────────────────────────────
  /** Raw adaptation strings from the routine generation engine. */
  adaptations?: string[];
  activityCategory?: string;
  previousDayCompletionRate?: number;
  learningSuccessRate?: number;

  // ── Meal context ──────────────────────────────────────────────────────────
  mealType?: string;
  dietType?: string;
  allergyFlags?: string[];
  fridgeItems?: string[];
  culturalRegion?: string;

  // ── Household ─────────────────────────────────────────────────────────────
  householdConflicts?: string[];
  specialPlans?: string;
}

/** Provenance metadata attached to every explanation. */
export interface RecommendationMetadata {
  recommendationType: "routine" | "meal" | "activity" | "coaching";
  sourceEngine: "rule_based" | "ai_generated" | "hybrid";
  generatedAt: string;
  version: string;
}

/** Full payload returned by the Explainability Engine. */
export interface ExplanationResponse {
  summary: string;
  factors: DecisionFactor[];
  confidence: ConfidenceScore;
  trace: ReasoningTrace;
  metadata: RecommendationMetadata;
  /** Optional paragraph from LLM post-processing. */
  aiNarrative?: string;
}

/** Lightweight row stored in the explainability audit log. */
export interface ExplanationAuditEntry {
  id: string;
  recommendationType: string;
  summary: string;
  confidenceValue: number;
  confidenceTier: ConfidenceScore["tier"];
  primaryFactor: FactorKind;
  generatedAt: string;
  childId?: number;
}
