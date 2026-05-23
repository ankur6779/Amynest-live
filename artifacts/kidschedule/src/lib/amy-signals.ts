import { LESSONS, type Lesson } from "@/lib/audio-lessons";
import { lessonsForNavGroup, type AgeNavGroup } from "@/lib/audio-lessons-nav";
import {
  loadLastAgeGroup,
  loadLastLessonId,
  loadLastPlayedAt,
  loadRecentSkips,
  loadResume,
} from "@/lib/audio-lessons-storage";
import {
  collectUserSignals,
  getAmyHomeState,
  getEmergencyLesson,
  getRecommendedLessons,
  type AmyHomeState,
  type EmergencyType,
  type LessonRef,
  type RecommendationOutput,
  type UserSignals,
} from "@workspace/amy-intelligence";
import { LESSONS_COMPLETE_STORAGE_KEY, parseCompletedLessonIds } from "@/lib/audio-lessons";

export function toLessonRef(lesson: Lesson): LessonRef {
  return { id: lesson.id, tier: lesson.tier, ageBucket: lesson.ageBucket };
}

export function buildAmySignals(nowMs = Date.now()): UserSignals {
  let completedLessonIds: string[] = [];
  try {
    completedLessonIds = [...parseCompletedLessonIds(localStorage.getItem(LESSONS_COMPLETE_STORAGE_KEY))];
  } catch {
    completedLessonIds = [];
  }

  return collectUserSignals({
    lastPlayedLessonId: loadLastLessonId(),
    lastPlayedAt: loadLastPlayedAt(),
    completedLessonIds,
    lastAgeGroup: loadLastAgeGroup(),
    resumeMap: loadResume(),
    recentSkips: loadRecentSkips(),
    nowMs,
  });
}

export function lessonsForSignals(signals: UserSignals): Lesson[] {
  const group = (signals.lastAgeGroup as AgeNavGroup | null) ?? "2-4";
  return lessonsForNavGroup(group);
}

export function allLessonRefs(): LessonRef[] {
  return LESSONS.map(toLessonRef);
}

export function computeAmyHomeState(signals: UserSignals): AmyHomeState {
  const pool = lessonsForSignals(signals).map(toLessonRef);
  const refs = pool.length > 0 ? pool : allLessonRefs();
  return getAmyHomeState(signals, refs);
}

export function computeAgeRecommendations(
  signals: UserSignals,
  ageGroup: AgeNavGroup,
  limit = 3,
): RecommendationOutput {
  const lessons = lessonsForNavGroup(ageGroup).map(toLessonRef);
  return getRecommendedLessons(signals, lessons, limit);
}

export function computeEmergencyLesson(type: EmergencyType, ageGroup: AgeNavGroup | null) {
  const age = ageGroup ?? (loadLastAgeGroup() as AgeNavGroup | null);
  return getEmergencyLesson(type, age, allLessonRefs());
}

export type { AmyHomeState, RecommendationOutput, UserSignals, EmergencyType };
