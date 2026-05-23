import type { SkillKey } from "../types-v2.js";
import type {
  ChildFamilySnapshot,
  FamilyGraph,
  FamilyInsights,
  FamilySummary,
  ParentChildComparisonRow,
  ParentDashboardPayload,
  LearningGraph,
} from "./types-family.js";

export function generateFamilyInsights(
  graph: FamilyGraph,
  learningGraph: LearningGraph,
  snapshots: ChildFamilySnapshot[],
): FamilyInsights {
  const skillTotals: Record<SkillKey, number> = {
    phonics: 0,
    motor_skills: 0,
    cognitive: 0,
    social: 0,
  };

  for (const s of snapshots) {
    for (const k of Object.keys(skillTotals) as SkillKey[]) {
      skillTotals[k] += s.profile.skills[k].level;
    }
  }

  const ranked = (Object.keys(skillTotals) as SkillKey[]).sort(
    (a, b) => skillTotals[b]! - skillTotals[a]!,
  );

  const weakest = ranked.slice(-2);
  const strongest = ranked[0] ?? null;

  const engagementPatterns =
    graph.sharedTraits.avgEngagement > 65
      ? "High family engagement — good time for collaborative activities."
      : graph.sharedTraits.avgEngagement < 45
        ? "Mixed engagement — shorter sessions and more rewards recommended."
        : "Steady engagement across children.";

  const recommendedFocus =
    weakest.length > 0
      ? `Gentle focus on ${weakest.join(" and ")} with play-based practice.`
      : "Continue balanced daily practice.";

  const cooperativeOpportunities: string[] = [];
  if (snapshots.length >= 2) {
    cooperativeOpportunities.push("sibling_quiz_turn_based");
    if (learningGraph.sharedKnowledgeAreas.includes("phonics")) {
      cooperativeOpportunities.push("phonics_buddy_verify");
    }
    if (graph.learningDynamics.teachingRoleChildId) {
      cooperativeOpportunities.push("older_sibling_teaching_moment");
    }
  }

  return {
    strongestSkillAcrossChildren: strongest,
    weakestAreas: weakest,
    engagementPatterns,
    recommendedFocus,
    cooperativeOpportunities,
  };
}

export function buildParentChildComparisons(
  snapshots: ChildFamilySnapshot[],
): ParentChildComparisonRow[] {
  return snapshots.map((s) => {
    const skills = s.profile.skills;
    const top = (["phonics", "motor_skills", "cognitive", "social"] as SkillKey[]).sort(
      (a, b) => skills[b].level - skills[a].level,
    )[0]!;

    const progress =
      s.prediction?.skillForecasts?.reduce((a, f) => a + f.nextSkillLevel, 0) ??
      Object.values(skills).reduce((a, sk) => a + sk.level, 0);

    return {
      childId: s.childId,
      displayName: s.displayName,
      engagementPercent: Math.round(s.profile.behavior.engagementScore),
      progressPercent: Math.round((progress / 20) * 100),
      topSkill: top,
      streakDays: Math.min(30, Math.floor((s.sessionMinutes ?? 0) / 15)),
      personalBestNote: "Beat your own best from last week!",
    };
  });
}

export function buildFamilySummary(
  snapshots: ChildFamilySnapshot[],
): FamilySummary {
  const totalLearningTimeMinutes = snapshots.reduce(
    (a, s) => a + (s.sessionMinutes ?? 0),
    0,
  );
  const progressDistribution: Record<string, number> = {};
  const skillCoverage: Partial<Record<SkillKey, number>> = {};

  for (const s of snapshots) {
    const pct =
      s.prediction?.skillForecasts?.reduce((a, f) => a + f.nextSkillLevel, 0) ?? 5;
    progressDistribution[s.childId] = Math.round((pct / 20) * 100);
    for (const k of ["phonics", "motor_skills", "cognitive", "social"] as SkillKey[]) {
      skillCoverage[k] = Math.max(skillCoverage[k] ?? 0, s.profile.skills[k].level / 5);
    }
  }

  return {
    totalLearningTimeMinutes,
    progressDistribution,
    skillCoverage,
    childCount: snapshots.length,
  };
}

export function buildParentDashboard(
  graph: FamilyGraph,
  learningGraph: LearningGraph,
  snapshots: ChildFamilySnapshot[],
): ParentDashboardPayload {
  const insights = generateFamilyInsights(graph, learningGraph, snapshots);
  const recommendations = [
    insights.recommendedFocus,
    ...insights.cooperativeOpportunities.map((c) => `Try cooperative mode: ${c.replace(/_/g, " ")}`),
    graph.learningDynamics.highlyEngagedChildIds.length > 0
      ? "Celebrate each child's personal streak — avoid comparing aloud."
      : "Schedule short 1:1 learning moments per child.",
  ];

  return {
    familySummary: buildFamilySummary(snapshots),
    childComparisons: buildParentChildComparisons(snapshots),
    recommendations,
    insights,
  };
}
