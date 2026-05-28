/**
 * Continuous Optimization — Recommendation clarity.
 *
 * Every adaptive recommendation must be explainable in *one short, warm,
 * human sentence*. This module replaces opaque, algorithmic reasons with
 * parent-readable phrasing.
 *
 * It does NOT generate recommendations. It only rewrites the `reason`
 * field on an existing `AdaptiveRecommendation` set so the UI can render
 * trustworthy why-strings.
 */

import type { AdaptiveRecommendation } from "./adaptive-routing";
import type { LearningMemory } from "./learning-memory";

export interface ExplainedRecommendation extends AdaptiveRecommendation {
  /** Warm, parent-readable explanation. */
  warmReason: string;
  /** Short tag used for analytics buckets. */
  category:
    | "reinforcement"
    | "revision"
    | "stretch"
    | "interest"
    | "warm_return"
    | "freshness"
    | "general";
}

export interface ExplanationInput {
  memory: LearningMemory;
  /** True when the day is a revision day per `UnlockResult.isRevisionDay`. */
  isRevisionDay?: boolean;
  childName?: string;
}

const NAME = (n?: string) => (n && n.trim() ? n : "your child");

function categorize(rec: AdaptiveRecommendation): ExplainedRecommendation["category"] {
  if (rec.id.startsWith("rec_weak_")) return "reinforcement";
  if (rec.id === "rec_revision") return "revision";
  if (rec.id === "rec_challenge") return "stretch";
  if (rec.id === "rec_favorite") return "interest";
  if (rec.id === "rec_comeback") return "warm_return";
  if (rec.id.startsWith("rec_fresh_")) return "freshness";
  return "general";
}

function explainFor(
  rec: AdaptiveRecommendation,
  category: ExplainedRecommendation["category"],
  input: ExplanationInput,
): string {
  const name = NAME(input.childName);
  switch (category) {
    case "reinforcement":
      return `Chosen to gently reinforce a skill ${name} is still building.`;
    case "revision":
      return "A lighter review day — Amy is helping yesterday's learning settle.";
    case "stretch":
      return `Picked because ${name}'s recent confidence is ready for a small stretch.`;
    case "interest":
      return `${name} loves this kind of activity — playing into what feels easy.`;
    case "warm_return":
      return `A soft re-entry — designed to feel like a win on the way back.`;
    case "freshness":
      return "A fresh moment for today, sized to feel calm and finishable.";
    case "general":
    default:
      return "This matches the rhythm Amy is building with your family.";
  }
}

/**
 * Rewrites the `reason` field with a warm, parent-readable explanation.
 * Always returns a new array — input is never mutated.
 */
export function explainRecommendations(
  recs: AdaptiveRecommendation[],
  input: ExplanationInput,
): ExplainedRecommendation[] {
  return recs.map((rec) => {
    const category = categorize(rec);
    const warmReason = explainFor(rec, category, input);
    return {
      ...rec,
      reason: warmReason,
      warmReason,
      category,
    };
  });
}

/** A single-line summary banner used at the top of the recommendation list. */
export function recommendationsBannerLine(input: ExplanationInput): string {
  if (input.isRevisionDay) {
    return "Today leans gentler — yesterday's learning is settling in.";
  }
  if (input.memory.strugglingSkills.length >= 2) {
    return "Today gently reinforces a few skills before adding new ones.";
  }
  if (input.memory.masteredSkills.length >= 3) {
    return "Today builds on what's already clicking.";
  }
  return "Today's plan is shaped around what feels best for your family.";
}
