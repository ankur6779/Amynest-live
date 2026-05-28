import type { SectionKey, LearningProgressProfile, UnlockResult } from "./types";
import type { LearningMemory } from "./learning-memory";
import { dailyUnlockSeed } from "./daily-freshness";

export interface DailySessionItem {
  id: string;
  section: SectionKey;
  title: string;
  emoji: string;
  href: string;
  completed: boolean;
  skillId: string;
}

export interface DailyLearningSession {
  dateIso: string;
  items: DailySessionItem[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  consistencyScore: number;
  sessionStreakDays: number;
}

const SESSION_TEMPLATE: Omit<DailySessionItem, "completed" | "id">[] = [
  { section: "phonics", title: "Phonics practice", emoji: "🔤", href: "/phonics", skillId: "phonics_letter_sounds" },
  { section: "math", title: "Math play", emoji: "🔢", href: "/study", skillId: "math_counting" },
  { section: "puzzles", title: "Daily puzzle", emoji: "🧩", href: "/parenting-hub#hub-group-creativity", skillId: "puzzles_logic" },
  { section: "speech", title: "Speech practice", emoji: "🎤", href: "/speech-coach", skillId: "speech_clear_sounds" },
  { section: "worksheets", title: "Worksheet moment", emoji: "📝", href: "/parenting-hub#worksheets", skillId: "worksheets_tracing" },
];

export function buildDailyLearningSession(
  profile: LearningProgressProfile,
  memory: LearningMemory,
  unlocks: UnlockResult,
  opts: {
    childId: number;
    dateIso: string;
    completedStepIds?: string[];
  },
): DailyLearningSession {
  const seed = dailyUnlockSeed(opts.dateIso, `${opts.childId}_session`);
  const struggling = new Set(memory.strugglingSkills);

  const items: DailySessionItem[] = SESSION_TEMPLATE.map((t, i) => {
    const prioritize = struggling.has(t.skillId);
    return {
      ...t,
      id: `session_${opts.dateIso}_${t.section}`,
      title: prioritize ? `${t.title} (extra practice)` : t.title,
      completed: (opts.completedStepIds ?? []).includes(`session_${opts.dateIso}_${t.section}`),
    };
  });

  const reordered = [...items].sort((a, b) => {
    const aWeak = struggling.has(a.skillId) ? 0 : 1;
    const bWeak = struggling.has(b.skillId) ? 0 : 1;
    if (aWeak !== bWeak) return aWeak - bWeak;
    return ((seed + a.section.length) % items.length) - ((seed + b.section.length) % items.length);
  });

  const completedCount = reordered.filter((i) => i.completed).length;
  return {
    dateIso: opts.dateIso,
    items: reordered,
    completedCount,
    totalCount: reordered.length,
    isComplete: completedCount >= reordered.length,
    consistencyScore: memory.consistencyScore,
    sessionStreakDays: memory.sessionStreakDays,
  };
}

export function markSessionStepComplete(
  session: DailyLearningSession,
  stepId: string,
): DailyLearningSession {
  const items = session.items.map((i) =>
    i.id === stepId ? { ...i, completed: true } : i,
  );
  const completedCount = items.filter((i) => i.completed).length;
  return {
    ...session,
    items,
    completedCount,
    isComplete: completedCount >= items.length,
  };
}
