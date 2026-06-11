import {
  computeSkillBreakdown,
  deriveSkillTrend,
  PARENT_REPORT_SESSION_INTERVAL,
  type ParentLearningReport,
  type PlaygroundEngagementState,
  type PlaygroundIntelligenceState,
  type PlaygroundLearningState,
  type SkillBreakdown,
  type SkillTrend,
} from "@workspace/math-playground";
import { computeSchoolReadiness } from "@workspace/math-playground-assessment";
import type { SchoolReadinessSnapshot } from "@workspace/math-playground";

const SKILL_AGE_BASE: Record<keyof SkillBreakdown, number> = {
  counting: 3.5,
  addition: 4.5,
  subtraction: 5.0,
  multiplication: 6.5,
  division: 7.0,
  patterns: 4.0,
};

function estimateSkillAgeYears(breakdown: SkillBreakdown): number {
  const entries = (Object.keys(breakdown) as (keyof SkillBreakdown)[]).filter(
    (k) => breakdown[k] > 0,
  );
  if (entries.length === 0) return 4.0;

  let total = 0;
  let weight = 0;
  for (const skill of entries) {
    const mastery = breakdown[skill] / 100;
    total += SKILL_AGE_BASE[skill] + mastery * 2.5;
    weight += 1;
  }
  return Math.round((total / weight) * 10) / 10;
}

function overallConfidenceTrend(learning: PlaygroundLearningState): SkillTrend {
  const skills: (keyof SkillBreakdown)[] = [
    "counting",
    "addition",
    "subtraction",
    "patterns",
  ];
  let improving = 0;
  let needs = 0;
  for (const skill of skills) {
    const trend = deriveSkillTrend(learning, skill);
    if (trend === "improving") improving++;
    if (trend === "needs_practice") needs++;
  }
  if (improving >= 2) return "improving";
  if (needs >= 2) return "needs_practice";
  return "stable";
}

export function shouldGenerateParentReport(
  intelligence: PlaygroundIntelligenceState | undefined,
  sessionCount: number,
): boolean {
  if (sessionCount < PARENT_REPORT_SESSION_INTERVAL) return false;
  if (sessionCount % PARENT_REPORT_SESSION_INTERVAL !== 0) return false;
  const lastIncluded = intelligence?.parentReports?.[0]?.sessionsIncluded ?? 0;
  return lastIncluded !== sessionCount;
}

export function buildParentLearningReport(
  learning: PlaygroundLearningState,
  ageYears: number,
  engagement?: PlaygroundEngagementState,
): ParentLearningReport {
  const breakdown = computeSkillBreakdown(learning);
  const readiness = computeSchoolReadiness(learning, engagement);

  const strengths = (Object.keys(breakdown) as (keyof SkillBreakdown)[])
    .filter((k) => breakdown[k] >= 75)
    .sort((a, b) => breakdown[b] - breakdown[a]);

  const areasToImprove = (Object.keys(breakdown) as (keyof SkillBreakdown)[])
    .filter((k) => breakdown[k] > 0 && breakdown[k] < 60)
    .sort((a, b) => breakdown[a] - breakdown[b]);

  const gaps = areasToImprove.length > 0 ? areasToImprove : strengths.slice(-2);

  const recommendedActivities = gaps.map((skill) => {
    const map: Record<keyof SkillBreakdown, ParentLearningReport["recommendedActivities"][0]> = {
      counting: "counting_adventure",
      addition: "addition_lab",
      subtraction: "subtraction_garden",
      multiplication: "multiplication_factory",
      division: "division_bakery",
      patterns: "number_patterns",
    };
    return map[skill];
  });

  return {
    id: `report_${Date.now()}_${learning.sessionHistory.length}`,
    generatedAt: Date.now(),
    sessionsIncluded: learning.sessionHistory.length,
    strengths: strengths.slice(0, 3),
    areasToImprove: gaps.slice(0, 3),
    schoolReadiness: readiness,
    confidenceTrend: overallConfidenceTrend(learning),
    recommendedActivities: [...new Set(recommendedActivities)].slice(0, 3),
    estimatedSkillAgeYears: estimateSkillAgeYears(breakdown),
    childAgeYears: ageYears,
    summaryKey: strengths.length > 0 ? "parent_report_summary_strong" : "parent_report_summary_building",
  };
}

export type { SchoolReadinessSnapshot };
