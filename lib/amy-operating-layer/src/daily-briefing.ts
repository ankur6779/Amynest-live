import type { FamilyIntelligenceSnapshot } from "@workspace/family-intelligence";
import type { DailyFamilyBriefing, ExplainedRecommendation } from "./types.js";
import { explainRecommendation } from "./explainability.js";

export function generateDailyBriefing(
  snapshot: FamilyIntelligenceSnapshot,
  localDate: string,
): DailyFamilyBriefing {
  const { childName, health, weeklyReport, topAction, predictiveInterventions, successMetrics } = snapshot;

  const wins = [...weeklyReport.wins];
  if (successMetrics.routineSuccess >= 70) {
    wins.push(`Routine success at ${successMetrics.routineSuccess}% this week.`);
  }

  const risks = [...weeklyReport.risks];
  for (const p of predictiveInterventions.filter((i) => i.probability >= 0.5)) {
    risks.push(p.prediction);
  }

  const progress = [
    `Family health score: ${health.score}/100 (${health.trend7d >= 0 ? "+" : ""}${health.trend7d} vs recent average).`,
    `Learning: ${successMetrics.learningSuccess}% of weekly target.`,
    `Engagement: ${successMetrics.childEngagement}% child activity score.`,
  ];

  const recommendedActions: ExplainedRecommendation[] = [];
  if (topAction) {
    recommendedActions.push(explainRecommendation(topAction, snapshot));
  }
  for (const action of snapshot.allActions.slice(1, 3)) {
    recommendedActions.push(explainRecommendation(action, snapshot));
  }

  const trendLabel =
    health.trend7d >= 5 ? "improving" : health.trend7d <= -5 ? "needs attention" : "steady";

  return {
    localDate,
    greeting: buildGreeting(childName, health.score, trendLabel),
    wins,
    risks,
    progress,
    recommendedActions,
    suggestedQuestions: buildSuggestedQuestions(snapshot),
    healthScore: health.score,
    healthTrend: trendLabel,
  };
}

function buildGreeting(childName: string, score: number, trend: string): string {
  if (score >= 75 && trend === "improving") {
    return `Good morning. ${childName}'s family rhythm looks strong today — here's your briefing.`;
  }
  if (score < 50 || trend === "needs attention") {
    return `Hi — I've looked at ${childName}'s week. A few things need attention, but small wins today can shift the trend.`;
  }
  return `Here's your family briefing for today.`;
}

function buildSuggestedQuestions(snapshot: FamilyIntelligenceSnapshot): string[] {
  const qs = [
    "How are we doing?",
    "What should we focus on today?",
    "What's the biggest risk right now?",
  ];
  if (snapshot.risks.routineCollapseRisk >= 0.4) {
    qs.push("Why is routine consistency dropping?");
  }
  if (snapshot.digitalTwin.weaknesses.length > 0) {
    qs.push(`How can we help with ${snapshot.digitalTwin.weaknesses[0]?.replace("weak_", "") ?? "learning"}?`);
  }
  return qs.slice(0, 5);
}
