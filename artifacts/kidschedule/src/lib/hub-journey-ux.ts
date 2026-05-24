import type { TFunction } from "i18next";
import type { ChildProgressSnapshot, PathStep, PeekAheadItem } from "@workspace/parent-hub-journey";

function jKey(base: string, isInfant: boolean): string {
  return isInfant ? `parent_hub.journey.infant.${base}` : `parent_hub.journey.${base}`;
}

export { jKey as hubJourneyMessageKey };

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
  isInfant = false,
): string {
  if (day === 1) return t(jKey("feedback_day1", isInfant), { name: childName });
  if (day === 2) return t(jKey("feedback_day2", isInfant), { name: childName });
  return t(jKey("feedback_day3", isInfant), { name: childName });
}

/** Reward-focused bonus copy (not feature IDs). */
export function bonusUnlockMessage(
  day: number,
  t: TFunction,
  isInfant = false,
): string | null {
  if (day === 1) return t(jKey("bonus_day1", isInfant));
  if (day === 2) return t(jKey("bonus_day2", isInfant));
  if (day === 3) return t(jKey("bonus_day3", isInfant));
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
  isInfant = false,
): Day3InsightLines {
  const learningStep = pathSteps.find((s) => s.kind === "learning");
  const activityType =
    learningStep?.title ?? t("parent_hub.journey.insight_activity_fallback");

  const activityLine = t(jKey("insight_activity", isInfant), {
    name: childName,
    activity: activityType,
  });

  const consistencyLine =
    progress.consistencyDays >= 2
      ? t(jKey("insight_consistency_yes", isInfant))
      : progress.lifeSkillsStreak >= 1
        ? t(jKey("insight_consistency_streak", isInfant), {
            count: progress.lifeSkillsStreak,
          })
        : t(jKey("insight_consistency_start", isInfant));

  const nextSkill =
    peekAhead[0]?.title ??
    pathSteps.find((s) => s.kind === "life_skill")?.title ??
    t(jKey("insight_next_fallback", isInfant));

  const nextLine = t(jKey("insight_next", isInfant), { skill: nextSkill });

  const stats: string[] = [];
  if (isInfant && progress.consistencyDays > 0) {
    stats.push(
      t("parent_hub.journey.infant.stat_care_days", {
        count: progress.consistencyDays,
      }),
    );
  }
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
