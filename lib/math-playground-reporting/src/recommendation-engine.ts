import {
  computeSkillBreakdown,
  pickComebackActivity,
  type PlaygroundActivityId,
  type PlaygroundLearningState,
  type RecommendationBundle,
  type RecommendationItem,
  type SkillBreakdown,
} from "@workspace/math-playground";
import { detectLearningGaps } from "@workspace/math-playground-assessment";

function topSkillFocus(breakdown: SkillBreakdown): keyof SkillBreakdown | undefined {
  let lowest: keyof SkillBreakdown = "counting";
  let score = 101;
  for (const key of Object.keys(breakdown) as (keyof SkillBreakdown)[]) {
    if (breakdown[key] > 0 && breakdown[key] < score) {
      score = breakdown[key];
      lowest = key;
    }
  }
  return score <= 100 ? lowest : undefined;
}

export function buildRecommendations(
  learning: PlaygroundLearningState,
  ageYears: number,
): RecommendationBundle {
  const breakdown = computeSkillBreakdown(learning);
  const gaps = detectLearningGaps(learning, ageYears);
  const dailyActivity =
    gaps.recommendedFocus[0] ?? pickComebackActivity(learning, ageYears) ?? "counting_adventure";
  const weeklyActivity = gaps.recommendedFocus[1] ?? ("number_patterns" as PlaygroundActivityId);
  const skillFocus = topSkillFocus(breakdown) ?? "counting";

  const items: RecommendationItem[] = [
    {
      horizon: "daily",
      titleKey: "rec_daily_focus",
      activityId: dailyActivity,
      priority: "primary",
    },
    {
      horizon: "weekly",
      titleKey: "rec_weekly_focus",
      activityId: weeklyActivity,
      priority: "primary",
    },
    {
      horizon: "monthly",
      titleKey: "rec_monthly_skill",
      skillFocus,
      priority: "secondary",
    },
  ];

  return {
    generatedAt: Date.now(),
    items,
  };
}

/** AI recommendation engine entry point. */
export const RecommendationEngine = {
  build: buildRecommendations,
};
