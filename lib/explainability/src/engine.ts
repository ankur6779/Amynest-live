// ─────────────────────────────────────────────────────────────────────────────
// Module 3 — Explainability Engine — Core Logic
//
// Deterministic reason-attribution pipeline:
//  1. extractFactors()     — maps ExplanationContext → DecisionFactor[]
//  2. computeConfidence()  — derives ConfidenceScore from factor coverage
//  3. buildTrace()         — assembles ordered ReasoningTrace steps
//  4. buildSummary()       — constructs the human-readable headline
//  5. explainRoutine()     — composes full ExplanationResponse for routine
//  6. explainMeal()        — same for meal recommendations
//
// No external I/O. Pure functions → trivially testable.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  DecisionFactor,
  FactorKind,
  ConfidenceScore,
  ReasoningStep,
  ReasoningTrace,
  ExplanationContext,
  ExplanationResponse,
  RecommendationMetadata,
} from "./types.js";

// ── 1. Factor Extraction ───────────────────────────────────────────────────

function extractRoutineFactors(ctx: ExplanationContext): DecisionFactor[] {
  const factors: DecisionFactor[] = [];

  // Sleep quality
  if (ctx.sleepQuality) {
    const poor = ctx.sleepQuality === "poor";
    const great = ctx.sleepQuality === "good";
    factors.push({
      kind: "sleep_quality",
      label: "Sleep Quality",
      influence: poor ? "negative" : great ? "positive" : "neutral",
      weight: poor ? 0.85 : great ? 0.6 : 0.35,
      detail: poor
        ? "Below-average sleep detected — bedtime moved earlier and high-intensity activities reduced."
        : great
          ? "Good sleep quality — full activity load maintained."
          : "Average sleep — routine unchanged.",
      icon: "moon",
    });
  }

  // Sleep duration
  if (ctx.sleepDurationHours !== undefined) {
    const hours = ctx.sleepDurationHours;
    const ageMonths = ctx.childAgeMonths ?? 60;
    const minHours = ageMonths < 12 ? 14 : ageMonths < 36 ? 11 : ageMonths < 84 ? 9 : 8;
    if (hours < minHours) {
      factors.push({
        kind: "sleep_duration",
        label: "Sleep Duration",
        influence: "negative",
        weight: 0.7,
        detail: `Child slept ${hours}h — below age-minimum of ${minHours}h. Cognitive load activities shortened.`,
        icon: "clock",
      });
    }
  }

  // Mood
  if (ctx.mood) {
    const negMoods = ["grumpy", "tired", "sad", "sick"];
    const posMoods = ["happy", "excited", "energetic"];
    const isNeg = negMoods.includes(ctx.mood);
    const isPos = posMoods.includes(ctx.mood);
    factors.push({
      kind: "mood",
      label: "Child Mood",
      influence: isNeg ? "negative" : isPos ? "positive" : "neutral",
      weight: isNeg ? 0.75 : isPos ? 0.55 : 0.3,
      detail: isNeg
        ? `Mood detected as "${ctx.mood}" — calming activities prioritised, screen-time limits applied.`
        : isPos
          ? `Mood detected as "${ctx.mood}" — high-engagement activities unlocked.`
          : `Neutral mood — standard routine applied.`,
      icon: "smile",
    });
  }

  // Energy level
  if (ctx.energyLevel) {
    const low = ctx.energyLevel === "low";
    const high = ctx.energyLevel === "high";
    factors.push({
      kind: "energy_level",
      label: "Energy Level",
      influence: low ? "negative" : high ? "positive" : "neutral",
      weight: low ? 0.65 : high ? 0.5 : 0.2,
      detail: low
        ? "Low energy detected — active play replaced with creative or quiet activities."
        : high
          ? "High energy — outdoor or physical activities brought forward."
          : "Normal energy profile — default pacing maintained.",
      icon: "zap",
    });
  }

  // Weather
  if (ctx.weatherOutdoor) {
    const unsuitable = ctx.weatherOutdoor === "no";
    const limited = ctx.weatherOutdoor === "limited";
    if (unsuitable || limited) {
      factors.push({
        kind: "weather",
        label: "Weather Conditions",
        influence: "negative",
        weight: unsuitable ? 0.7 : 0.45,
        detail: unsuitable
          ? "Outdoor conditions unsuitable — all outdoor activities replaced with indoor alternatives."
          : "Limited outdoor suitability — outdoor activity durations reduced by 50%.",
        icon: "cloud-rain",
      });
    }
  }

  // Caregiver
  if (ctx.caregiver) {
    const specialCaregivers = ["grandparent", "babysitter", "nanny"];
    const isSpecial = specialCaregivers.some((c) =>
      ctx.caregiver!.toLowerCase().includes(c),
    );
    if (isSpecial) {
      factors.push({
        kind: "caregiver",
        label: "Caregiver",
        influence: "neutral",
        weight: 0.55,
        detail: `Caregiver is "${ctx.caregiver}" — activity complexity simplified and written instructions added.`,
        icon: "user",
      });
    }
  }

  // Activity completion
  if (ctx.previousDayCompletionRate !== undefined) {
    const rate = ctx.previousDayCompletionRate;
    if (rate < 0.65) {
      factors.push({
        kind: "activity_completion",
        label: "Previous Day Completion",
        influence: "negative",
        weight: 0.6,
        detail: `Only ${Math.round(rate * 100)}% of yesterday's activities completed — today's schedule lightened by ~20%.`,
        icon: "check-circle",
      });
    } else if (rate >= 0.9) {
      factors.push({
        kind: "activity_completion",
        label: "Previous Day Completion",
        influence: "positive",
        weight: 0.4,
        detail: `Excellent ${Math.round(rate * 100)}% completion rate yesterday — enrichment activities added today.`,
        icon: "star",
      });
    }
  }

  // Learning weight
  if (ctx.learningSuccessRate !== undefined && ctx.learningSuccessRate < 0.6) {
    factors.push({
      kind: "learning_weight",
      label: "Learning Performance",
      influence: "negative",
      weight: 0.5,
      detail: `Learning success rate is ${Math.round(ctx.learningSuccessRate * 100)}% — extra practice sessions added.`,
      icon: "book-open",
    });
  }

  // Age band
  if (ctx.ageGroup) {
    factors.push({
      kind: "age_band",
      label: "Age Band",
      influence: "neutral",
      weight: 0.8,
      detail: `Activities, meal portions, and cognitive load calibrated for the "${ctx.ageGroup}" developmental band.`,
      icon: "layers",
    });
  }

  // Special plan
  if (ctx.specialPlans && ctx.specialPlans.trim().length > 0) {
    factors.push({
      kind: "special_plan",
      label: "Special Plan",
      influence: "neutral",
      weight: 0.75,
      detail: `Special event "${ctx.specialPlans}" incorporated — routine adapted around it.`,
      icon: "calendar",
    });
  }

  // Household conflicts
  if (ctx.householdConflicts && ctx.householdConflicts.length > 0) {
    factors.push({
      kind: "household_conflict",
      label: "Household Conflicts",
      influence: "negative",
      weight: 0.65,
      detail: `${ctx.householdConflicts.length} caregiver/resource conflict(s) detected — schedule shifted to resolve overlap.`,
      icon: "alert-triangle",
    });
  }

  // AI adaptations (parsed from the generation engine's free-text array)
  if (ctx.adaptations && ctx.adaptations.length > 0) {
    factors.push({
      kind: "ai_adaptation",
      label: "AI Contextual Adaptations",
      influence: "neutral",
      weight: 0.45,
      detail: `${ctx.adaptations.length} adaptive adjustment(s) applied by the contextual inference pipeline.`,
      icon: "cpu",
    });
  }

  return factors;
}

function extractMealFactors(ctx: ExplanationContext): DecisionFactor[] {
  const factors: DecisionFactor[] = [];

  if (ctx.dietType) {
    factors.push({
      kind: "cultural_preference",
      label: "Diet Preference",
      influence: "neutral",
      weight: 0.9,
      detail: `Meals filtered to match "${ctx.dietType}" dietary preference.`,
      icon: "leaf",
    });
  }

  if (ctx.allergyFlags && ctx.allergyFlags.length > 0) {
    factors.push({
      kind: "allergy",
      label: "Allergy Constraints",
      influence: "negative",
      weight: 0.95,
      detail: `Ingredients containing ${ctx.allergyFlags.join(", ")} excluded for safety.`,
      icon: "shield",
    });
  }

  if (ctx.culturalRegion) {
    factors.push({
      kind: "cultural_preference",
      label: "Regional Cuisine",
      influence: "positive",
      weight: 0.7,
      detail: `Meal list tailored to "${ctx.culturalRegion}" regional cuisine preferences.`,
      icon: "map-pin",
    });
  }

  if (ctx.fridgeItems && ctx.fridgeItems.length > 0) {
    factors.push({
      kind: "meal_history",
      label: "Available Ingredients",
      influence: "positive",
      weight: 0.6,
      detail: `Suggestions prioritised items from your fridge: ${ctx.fridgeItems.slice(0, 3).join(", ")}.`,
      icon: "package",
    });
  }

  if (ctx.previousDayCompletionRate !== undefined && ctx.previousDayCompletionRate < 0.6) {
    factors.push({
      kind: "activity_completion",
      label: "Morning Activity Drop",
      influence: "negative",
      weight: 0.55,
      detail: "Protein-enriched breakfast suggested — morning activity completion was below threshold yesterday.",
      icon: "trending-down",
    });
  }

  if (ctx.ageGroup) {
    factors.push({
      kind: "age_band",
      label: "Age-Appropriate Portions",
      influence: "neutral",
      weight: 0.8,
      detail: `Serving sizes, textures, and nutrients calibrated for "${ctx.ageGroup}" age group.`,
      icon: "layers",
    });
  }

  if (ctx.mealType) {
    factors.push({
      kind: "schedule_density",
      label: "Meal Timing",
      influence: "neutral",
      weight: 0.5,
      detail: `Composition optimised for a "${ctx.mealType}" — macro balance adjusted accordingly.`,
      icon: "clock",
    });
  }

  return factors;
}

// ── 2. Confidence Computation ─────────────────────────────────────────────

export function computeConfidence(factors: DecisionFactor[]): ConfidenceScore {
  if (factors.length === 0) {
    return {
      value: 20,
      tier: "low",
      rationale: "No contextual signals provided — recommendation is a default template.",
    };
  }
  const weightedSum = factors.reduce((s, f) => s + f.weight, 0);
  const maxPossible = 8; // normalise against expected max factors
  const raw = Math.min((weightedSum / maxPossible) * 100, 100);
  const value = Math.round(raw);
  const tier: ConfidenceScore["tier"] =
    value >= 70 ? "high" : value >= 45 ? "medium" : "low";
  const rationale =
    tier === "high"
      ? `${factors.length} strong contextual signals informed this recommendation.`
      : tier === "medium"
        ? `Moderate signal coverage (${factors.length} factors). Adding mood or sleep data would increase confidence.`
        : `Limited context available. Providing daily signals will personalise recommendations further.`;
  return { value, tier, rationale };
}

// ── 3. Reasoning Trace Builder ────────────────────────────────────────────

export function buildTrace(factors: DecisionFactor[]): ReasoningTrace {
  if (factors.length === 0) {
    return {
      steps: [
        {
          order: 1,
          title: "Default Template Applied",
          detail: "No contextual signals detected. Age-appropriate default routine used.",
          factors: ["age_band"],
        },
      ],
      totalFactors: 0,
      primaryFactor: "age_band",
    };
  }

  const sorted = [...factors].sort((a, b) => b.weight - a.weight);
  const steps: ReasoningStep[] = sorted.slice(0, 5).map((f, i) => ({
    order: i + 1,
    title: f.label,
    detail: f.detail,
    factors: [f.kind],
  }));

  return {
    steps,
    totalFactors: factors.length,
    primaryFactor: sorted[0].kind,
  };
}

// ── 4. Summary Builder ────────────────────────────────────────────────────

function buildSummary(factors: DecisionFactor[], ctx: ExplanationContext): string {
  if (factors.length === 0) {
    return "A default age-appropriate routine was generated — add daily signals to personalise it.";
  }

  const primary = [...factors].sort((a, b) => b.weight - a.weight)[0];
  const typeLabel = ctx.mealType
    ? `${ctx.mealType} suggestion`
    : ctx.activityCategory
      ? `${ctx.activityCategory} activity`
      : "routine";

  const summaryMap: Record<FactorKind, string> = {
    sleep_quality:
      ctx.sleepQuality === "poor"
        ? `This ${typeLabel} was adjusted because last night's sleep quality was below average.`
        : `Good sleep quality unlocked higher-engagement activities in this ${typeLabel}.`,
    sleep_duration: `Sleep duration was shorter than the age-minimum, so today's cognitive load was reduced.`,
    mood: `Child's mood (${ctx.mood ?? "unknown"}) was the primary driver — activity intensity adapted accordingly.`,
    energy_level: `Detected ${ctx.energyLevel ?? "normal"} energy — activity mix reordered to match.`,
    weather: `Weather conditions shaped outdoor activity decisions in this ${typeLabel}.`,
    caregiver: `Caregiver context (${ctx.caregiver ?? "primary"}) guided activity complexity and instructions.`,
    learning_weight: `Recent learning performance gaps drove targeted practice additions.`,
    activity_completion: `Yesterday's completion rate directly influenced today's schedule density.`,
    meal_history: `Available ingredients and dietary history shaped this meal suggestion.`,
    schedule_density: `Overall schedule density was tuned based on time constraints.`,
    age_band: `Activities are calibrated to the "${ctx.ageGroup ?? "current"}" developmental stage.`,
    special_plan: `A special event ("${ctx.specialPlans ?? ""}") reshaped the standard ${typeLabel}.`,
    household_conflict: `Household scheduling conflicts were resolved to produce this ${typeLabel}.`,
    allergy: `Allergy safety rules filtered ingredient choices for this meal.`,
    cultural_preference: `Regional cuisine and cultural norms guided meal selection.`,
    ai_adaptation: `The adaptive inference pipeline applied ${ctx.adaptations?.length ?? 0} contextual adjustment(s).`,
  };

  return summaryMap[primary.kind] ?? `This ${typeLabel} was personalised based on ${factors.length} detected signals.`;
}

// ── 5. Public API ─────────────────────────────────────────────────────────

/**
 * Generate a full ExplanationResponse for a routine or activity recommendation.
 */
export function explainRoutine(
  ctx: ExplanationContext,
  sourceEngine: RecommendationMetadata["sourceEngine"] = "hybrid",
): ExplanationResponse {
  const factors = extractRoutineFactors(ctx);
  const confidence = computeConfidence(factors);
  const trace = buildTrace(factors);
  const summary = buildSummary(factors, ctx);
  const metadata: RecommendationMetadata = {
    recommendationType: "routine",
    sourceEngine,
    generatedAt: new Date().toISOString(),
    version: "3.0.0",
  };
  return { summary, factors, confidence, trace, metadata };
}

/**
 * Generate a full ExplanationResponse for a meal recommendation.
 */
export function explainMeal(
  ctx: ExplanationContext,
  sourceEngine: RecommendationMetadata["sourceEngine"] = "rule_based",
): ExplanationResponse {
  const factors = extractMealFactors(ctx);
  const confidence = computeConfidence(factors);
  const trace = buildTrace(factors);
  const summary = buildSummary(factors, ctx);
  const metadata: RecommendationMetadata = {
    recommendationType: "meal",
    sourceEngine,
    generatedAt: new Date().toISOString(),
    version: "3.0.0",
  };
  return { summary, factors, confidence, trace, metadata };
}
