import type { LessonSeries } from "./lesson-series.js";

export const LESSONS_COMPLETE_STORAGE_KEY = "amynest_audio_lessons_complete_v1";

export function parseCompletedLessonIds(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id): id is string => typeof id === "string"));
    }
    if (parsed && typeof parsed === "object") {
      return new Set(
        Object.entries(parsed as Record<string, boolean>)
          .filter(([, v]) => v)
          .map(([k]) => k),
      );
    }
  } catch {
    /* ignore */
  }
  return new Set();
}

export function serializeCompletedLessonIds(ids: Set<string>): string {
  return JSON.stringify([...ids]);
}

export function markLessonComplete(ids: Set<string>, lessonId: string): Set<string> {
  const next = new Set(ids);
  next.add(lessonId);
  return next;
}

export interface SeriesProgress {
  completed: number;
  total: number;
  percent: number;
}

export function getSeriesProgress(
  series: LessonSeries,
  completedIds: Set<string>,
): SeriesProgress {
  const total = series.lessonIds.length;
  const completed = series.lessonIds.filter((id) => completedIds.has(id)).length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function firstIncompleteLessonId(
  series: LessonSeries,
  completedIds: Set<string>,
): string | undefined {
  return series.lessonIds.find((id) => !completedIds.has(id));
}

export function partIndexForLesson(series: LessonSeries, lessonId: string): number {
  return series.lessonIds.indexOf(lessonId);
}
