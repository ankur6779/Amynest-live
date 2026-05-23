import { categoryForLesson } from "./lesson-categories.js";
import type { DailyPickCard, LessonRef, UserSignals } from "./types.js";

function dateKey(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SESSION_DAILY_BIAS: Record<UserSignals["sessionTime"], string> = {
  morning: "development",
  afternoon: "school",
  evening: "sleep",
  night: "sleep",
};

export function getDailyPick(
  signals: UserSignals,
  lessons: LessonRef[],
  nowMs = Date.now(),
  userKey?: string,
): DailyPickCard | null {
  if (lessons.length === 0) return null;

  const key = dateKey(nowMs);
  const stableKey = userKey ?? signals.lastPlayedLessonId ?? signals.lastAgeGroup ?? "amy";
  const seed = hashSeed(`${key}:${stableKey}`);

  const incomplete = lessons.filter((l) => !signals.completedLessonIds.includes(l.id));
  const pool = incomplete.length > 0 ? incomplete : lessons;

  const nonSkipped = pool.filter((l) => !signals.recentSkips.includes(l.id));
  const candidates = nonSkipped.length > 0 ? nonSkipped : pool;

  const biasCat = SESSION_DAILY_BIAS[signals.sessionTime];
  const biased = candidates.filter((l) => categoryForLesson(l) === biasCat);
  const pickPool = biased.length > 0 ? biased : candidates;

  const idx = seed % pickPool.length;
  const lesson = pickPool[idx]!;

  const reason =
    biased.length > 0 ? "daily_session_fit" : signals.preferredCategories[0] ? "daily_for_you" : "daily_discovery";

  return { lessonId: lesson.id, reason, dateKey: key };
}
