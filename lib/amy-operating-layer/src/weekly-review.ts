import type { FamilyIntelligenceSnapshot } from "@workspace/family-intelligence";
import type { WeeklyFamilyReview } from "./types.js";

export function generateWeeklyReview(snapshot: FamilyIntelligenceSnapshot): WeeklyFamilyReview {
  const { weeklyReport, successMetrics, health, childName, goals, digitalTwin } = snapshot;

  const learningProgress = [
    `Learning success rate: ${successMetrics.learningSuccess}% of weekly target.`,
    digitalTwin.strengths.filter((s) => s.startsWith("strong_")).length > 0
      ? `Strengths: ${digitalTwin.strengths.filter((s) => s.startsWith("strong_")).map((s) => s.replace("strong_", "")).join(", ")}.`
      : "Building learning momentum — consistency matters more than volume.",
  ];

  const routineConsistency = [
    `Routine success: ${successMetrics.routineSuccess}%.`,
    health.components.routineConsistency >= 70
      ? `${childName}'s routine rhythm is solid.`
      : "Routine consistency has room to improve — simplifying may help.",
  ];

  const goalAchievement = goals.length > 0
    ? goals.map((g) => `${g.target}: ${g.progress}/${g.targetValue} ${g.unit} (${Math.round((g.progress / g.targetValue) * 100)}%).`)
    : ["No active goals set — consider adding a reading or routine goal."];

  const screenTimeTrends = [
    health.components.screenTimeBalance >= 70
      ? "Screen-time balance is within a healthy range."
      : "Screen-time balance could improve — consider a screen-free window before dinner.",
  ];

  const parentEngagement = [
    `Parent engagement score: ${successMetrics.parentSatisfaction}%.`,
    `Overall retention signal: ${successMetrics.retentionSuccess}%.`,
  ];

  const insights = [...weeklyReport.recommendations];
  if (health.trend7d >= 5) insights.unshift("Family health is trending upward — protect what's working.");
  if (health.trend7d <= -5) insights.unshift("Health score declined this week — early intervention recommended.");

  const executiveSummary = buildExecutiveSummary(snapshot);

  return {
    weekKey: weeklyReport.weekKey,
    executiveSummary,
    learningProgress,
    routineConsistency,
    goalAchievement,
    screenTimeTrends,
    parentEngagement,
    insights,
    nextWeekFocus: weeklyReport.recommendations.slice(0, 3),
  };
}

function buildExecutiveSummary(snapshot: FamilyIntelligenceSnapshot): string {
  const { childName, health, successMetrics, risks } = snapshot;
  const riskNote =
    risks.overallRisk >= 0.5
      ? `Primary concern: ${risks.primaryRisk.replace(/_/g, " ")}.`
      : "No critical risks detected.";
  return (
    `This week, ${childName}'s family health score is ${health.score}/100 with ` +
    `${successMetrics.overallSuccess}% overall success. ${riskNote} ` +
    `Focus next on ${snapshot.topAction?.title ?? "maintaining consistency"}.`
  );
}
