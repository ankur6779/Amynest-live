import type { FamilyIntelligenceSnapshot } from "@workspace/family-intelligence";
import type { ExplainedRecommendation } from "./types.js";
import type { PrioritizedAction } from "@workspace/family-intelligence";

export function explainRecommendation(
  action: PrioritizedAction,
  snapshot: FamilyIntelligenceSnapshot,
): ExplainedRecommendation {
  const { risks, health, childName } = snapshot;
  let why = "";
  let confidence: ExplainedRecommendation["confidence"] = "observation";
  let uncertaintyNote: string | undefined;

  switch (action.category) {
    case "routine_problem":
      why = `Recommended because routine completion is ${Math.round(snapshot.successMetrics.routineSuccess)}% this week`;
      if (risks.routineCollapseRisk >= 0.5) {
        why += `, and we estimate a ${Math.round(risks.routineCollapseRisk * 100)}% risk of routine collapse.`;
        confidence = "prediction";
        uncertaintyNote = "This is a prediction based on recent patterns, not a certainty.";
      } else {
        why += ".";
      }
      break;
    case "learning_problem":
      why = `Learning success is at ${snapshot.successMetrics.learningSuccess}% this week`;
      if (snapshot.digitalTwin.weaknesses.length > 0) {
        why += `, with ${snapshot.digitalTwin.weaknesses[0]?.replace("weak_", "")} needing extra support.`;
      } else {
        why += ".";
      }
      if (risks.learningDisengagementRisk >= 0.4) {
        confidence = "prediction";
        uncertaintyNote = "Learning engagement may drop if no action is taken this week.";
      }
      break;
    case "retention_problem":
      why = `Recommended because parent engagement signals suggest ${Math.round(risks.parentChurnRisk * 100)}% churn risk.`;
      confidence = "prediction";
      uncertaintyNote = "We may be wrong — life gets busy. A small check-in still helps.";
      break;
    case "subscription_opportunity":
      why = `Recommended because ${childName} has shown consistent engagement — Premium unlocks personalized paths.`;
      confidence = "observation";
      break;
    default:
      why = `Recommended based on ${childName}'s current family health score of ${health.score}.`;
  }

  return {
    title: action.title,
    description: action.description,
    why,
    confidence,
    uncertaintyNote,
    surfaces: [action.primarySurface, ...action.secondarySurfaces],
  };
}

export function explainMetricChange(
  metric: string,
  current: number,
  prior: number,
): string {
  const delta = current - prior;
  const pct = prior > 0 ? Math.round((delta / prior) * 100) : 0;
  const direction = delta >= 0 ? "increased" : "dropped";
  return `${metric} ${direction} ${Math.abs(pct)}% over the recent period (${current} vs ${prior}).`;
}
