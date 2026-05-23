import { categoryForLesson, rankLessonsByCategories } from "./lesson-categories.js";
import type { LessonRef, RecommendationOutput, UserSignals } from "./types.js";

const SESSION_CATEGORY_BIAS: Record<UserSignals["sessionTime"], string[]> = {
  morning: ["development", "school", "nutrition"],
  afternoon: ["behavior", "school", "social"],
  evening: ["sleep", "behavior", "screens"],
  night: ["sleep", "behavior"],
};

function isCompleted(signals: UserSignals, id: string): boolean {
  return signals.completedLessonIds.includes(id);
}

function isSkipped(signals: UserSignals, id: string): boolean {
  return signals.recentSkips.includes(id);
}

function resumeScore(signals: UserSignals, id: string): number {
  return signals.resumeMap[id] ?? 0;
}

export function getRecommendedLessons(
  signals: UserSignals,
  lessons: LessonRef[],
  limit = 3,
): RecommendationOutput {
  const pool = lessons.filter((l) => !isCompleted(signals, l.id));
  if (pool.length === 0) {
    return { lessonIds: lessons.slice(0, limit).map((l) => l.id), reason: "replay_favorites" };
  }

  const bias = SESSION_CATEGORY_BIAS[signals.sessionTime];
  const mergedPrefs = [
    ...signals.preferredCategories,
    ...(bias as UserSignals["preferredCategories"]),
  ];

  const ranked = rankLessonsByCategories(pool, mergedPrefs);

  const withProgress = ranked.filter((l) => resumeScore(signals, l.id) > 0 && !isSkipped(signals, l.id));
  if (withProgress.length >= 2) {
    return {
      lessonIds: withProgress.slice(0, limit).map((l) => l.id),
      reason: "continue_your_path",
    };
  }

  const fresh = ranked.filter((l) => !isSkipped(signals, l.id));
  const quickFirst = [...fresh].sort((a, b) => {
    const tierOrder = { quick: 0, standard: 1, deep: 2 };
    return tierOrder[a.tier] - tierOrder[b.tier];
  });

  const topCat = mergedPrefs[0] ?? "general";
  const catMatch = quickFirst.find((l) => categoryForLesson(l) === topCat);
  if (catMatch) {
    const rest = quickFirst.filter((l) => l.id !== catMatch.id).slice(0, limit - 1);
    return {
      lessonIds: [catMatch.id, ...rest.map((l) => l.id)].slice(0, limit),
      reason: "matched_interests",
    };
  }

  return {
    lessonIds: quickFirst.slice(0, limit).map((l) => l.id),
    reason: "fresh_for_you",
  };
}
