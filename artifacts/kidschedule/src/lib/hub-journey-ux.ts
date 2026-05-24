import type { TFunction } from "i18next";
import type { ChildProgressSnapshot, PathStep, PeekAheadItem } from "@workspace/parent-hub-journey";

/** Calendar countdown copy for the journey strip. */
export function calendarCountdownMessage(
  daysLeft: number,
  t: TFunction,
): string | null {
  if (daysLeft <= 0) return t("parent_hub.journey.calendar_last_day");
  if (daysLeft === 1) return t("parent_hub.journey.calendar_one_day");
  if (daysLeft <= 7) return t("parent_hub.journey.calendar_days_left", { days: daysLeft });
  return null;
}

/** Short emotional feedback after completing a journey day. */
export function dayCompletionMessage(
  day: number,
  childName: string,
  t: TFunction,
): string {
  if (day === 1) return t("parent_hub.journey.feedback_day1");
  if (day === 2) return t("parent_hub.journey.feedback_day2");
  return t("parent_hub.journey.feedback_day3", { name: childName });
}

/** Reward-focused bonus copy (not feature IDs). */
export function bonusUnlockMessage(day: number, t: TFunction): string | null {
  if (day === 1) return t("parent_hub.journey.bonus_day1");
  if (day === 2) return t("parent_hub.journey.bonus_day2");
  if (day === 3) return t("parent_hub.journey.bonus_day3");
  return null;
}

export interface Day3InsightLines {
  activityLine: string;
  consistencyLine: string;
  nextLine: string;
  stats: string[];
}

/** Build personalized Day 3 insight lines from existing progress + path data. */
export function buildDay3Insights(
  childName: string,
  progress: ChildProgressSnapshot,
  pathSteps: PathStep[],
  peekAhead: PeekAheadItem[],
  t: TFunction,
): Day3InsightLines {
  const learningStep = pathSteps.find((s) => s.kind === "learning");
  const activityType = learningStep?.title ?? t("parent_hub.journey.insight_activity_fallback");

  const activityLine = t("parent_hub.journey.insight_activity", {
    name: childName,
    activity: activityType,
  });

  const consistencyLine =
    progress.consistencyDays >= 2
      ? t("parent_hub.journey.insight_consistency_yes")
      : progress.lifeSkillsStreak >= 1
        ? t("parent_hub.journey.insight_consistency_streak", {
            count: progress.lifeSkillsStreak,
          })
        : t("parent_hub.journey.insight_consistency_start");

  const nextSkill =
    peekAhead[0]?.title ??
    pathSteps.find((s) => s.kind === "life_skill")?.title ??
    t("parent_hub.journey.insight_next_fallback");

  const nextLine = t("parent_hub.journey.insight_next", { skill: nextSkill });

  const stats: string[] = [];
  if (progress.lifeSkillsDone > 0) {
    stats.push(
      t("parent_hub.journey.stat_life_skills", { count: progress.lifeSkillsDone }),
    );
  }
  if (progress.lifeSkillsStreak > 0) {
    stats.push(
      t("parent_hub.journey.stat_streak", { count: progress.lifeSkillsStreak }),
    );
  }
  if (progress.levelLabel) {
    stats.push(progress.levelLabel);
  }

  return { activityLine, consistencyLine, nextLine, stats };
}
