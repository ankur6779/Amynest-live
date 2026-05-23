import { getDailyPick } from "./daily-engine.js";
import { getEmergencyLesson } from "./emergency-engine.js";
import { getRecommendedLessons } from "./recommendation-engine.js";
import type {
  AmyHomeState,
  DailyPickCard,
  EmergencyType,
  LessonRef,
  QuickPlayCard,
  RecommendationOutput,
  UserSignals,
} from "./types.js";

function isCompleted(signals: UserSignals, id: string): boolean {
  return signals.completedLessonIds.includes(id);
}

export function getQuickPlay(signals: UserSignals, lessons: LessonRef[]): QuickPlayCard | null {
  if (lessons.length === 0) return null;

  const lastId = signals.lastPlayedLessonId;
  if (lastId) {
    const inPool = lessons.some((l) => l.id === lastId);
    const progress = signals.resumeMap[lastId] ?? 0;
    if (inPool && progress > 0 && !isCompleted(signals, lastId)) {
      return { lessonId: lastId, reason: "resume_last", action: "continue" };
    }
  }

  const inProgress = lessons
    .filter((l) => (signals.resumeMap[l.id] ?? 0) > 0 && !isCompleted(signals, l.id))
    .sort((a, b) => (signals.resumeMap[b.id] ?? 0) - (signals.resumeMap[a.id] ?? 0));

  if (inProgress[0]) {
    return { lessonId: inProgress[0].id, reason: "continue_in_progress", action: "continue" };
  }

  const rec = getRecommendedLessons(signals, lessons, 1);
  if (rec.lessonIds[0]) {
    return { lessonId: rec.lessonIds[0], reason: rec.reason, action: "start" };
  }

  const quick = lessons.find((l) => l.tier === "quick" && !isCompleted(signals, l.id));
  if (quick) return { lessonId: quick.id, reason: "quick_start", action: "start" };

  return lessons[0] ? { lessonId: lessons[0].id, reason: "discover", action: "start" } : null;
}

export function getAmyHomeState(
  signals: UserSignals,
  lessons: LessonRef[],
  nowMs = Date.now(),
  userKey?: string,
): AmyHomeState {
  return {
    quickPlay: getQuickPlay(signals, lessons),
    dailyPick: getDailyPick(signals, lessons, nowMs, userKey),
  };
}

export { getRecommendedLessons, getEmergencyLesson };
export type { AmyHomeState, RecommendationOutput, UserSignals, QuickPlayCard, DailyPickCard, EmergencyType };
