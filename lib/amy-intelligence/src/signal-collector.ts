import { categoryForLessonId } from "./lesson-categories.js";
import type { LessonCategory, SessionTime, SignalInput, UserSignals } from "./types.js";

export function deriveSessionTime(nowMs: number): SessionTime {
  const hour = new Date(nowMs).getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function buildPreferredCategories(
  completedIds: string[],
  resumeMap: Record<string, number>,
  lastPlayedLessonId: string | null,
): LessonCategory[] {
  const scores = new Map<LessonCategory, number>();

  const bump = (id: string, amount: number) => {
    const cat = categoryForLessonId(id);
    scores.set(cat, (scores.get(cat) ?? 0) + amount);
  };

  for (const id of completedIds) bump(id, 3);
  for (const [id, idx] of Object.entries(resumeMap)) {
    if (idx > 0) bump(id, 2);
  }
  if (lastPlayedLessonId) bump(lastPlayedLessonId, 4);

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat)
    .slice(0, 4);
}

export function collectUserSignals(input: SignalInput): UserSignals {
  const nowMs = input.nowMs ?? Date.now();
  const completed = input.completedLessonIds;
  const totalEngaged = new Set([...completed, ...Object.keys(input.resumeMap)]).size;
  const completionRate =
    totalEngaged === 0 ? 0 : Math.min(1, completed.length / Math.max(totalEngaged, 1));

  return {
    lastPlayedLessonId: input.lastPlayedLessonId,
    lastPlayedAt: input.lastPlayedAt,
    completionRate,
    preferredCategories: buildPreferredCategories(
      completed,
      input.resumeMap,
      input.lastPlayedLessonId,
    ),
    sessionTime: deriveSessionTime(nowMs),
    recentSkips: input.recentSkips.slice(0, 10),
    completedLessonIds: completed,
    lastAgeGroup: input.lastAgeGroup,
    resumeMap: input.resumeMap,
  };
}
