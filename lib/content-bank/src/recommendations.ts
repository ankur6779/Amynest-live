import type { SmartStudyLesson } from "./types.js";
import type { ContentBankLessonVisibility } from "./lesson-visibility.js";
import { extractCompletedSmartStudyIds } from "./lesson-visibility.js";

export interface FreshLessonSummary {
  id: string;
  title: string;
  subject: string;
  subjectEmoji: string;
  estimatedMinutes: number;
  description: string;
  ageBand: SmartStudyLesson["ageBand"];
  isUnseen: boolean;
  isCompleted?: boolean;
  assignedAt?: string | null;
}

const SUBJECT_EMOJI: Record<string, string> = {
  Numbers: "🔢",
  Counting: "🔢",
  Addition: "➕",
  Subtraction: "➖",
  Multiplication: "✖️",
  Division: "➗",
  Patterns: "🔁",
  Shapes: "🔷",
  Colors: "🎨",
  Measurement: "📏",
  Time: "🕐",
  Money: "💰",
  Logic: "🧩",
  Memory: "🧠",
  Observation: "👀",
  "Science Basics": "🔬",
  "Geography Basics": "🌍",
  Language: "📖",
  Vocabulary: "📝",
  Reading: "📚",
};

/** Curriculum topic → content-bank subject labels for related-lesson matching. */
const CURRICULUM_TO_BANK_SUBJECTS: Record<string, string[]> = {
  "math:addition": ["Addition", "Counting", "Numbers"],
  "math:subtraction": ["Subtraction", "Counting"],
  "math:multiplication": ["Multiplication", "Patterns"],
  "math:division": ["Division", "Multiplication"],
  "math:fractions": ["Patterns", "Division"],
  "math:geometry-basics": ["Shapes", "Measurement"],
  "math:time-calendar": ["Time", "Measurement"],
  "math:algebra-basics": ["Logic", "Patterns"],
  "math:linear-equations": ["Logic", "Patterns"],
  "math:quadratic-equations": ["Logic", "Patterns"],
  "math:geometry-triangles": ["Shapes", "Measurement"],
  "math:mensuration": ["Measurement", "Shapes"],
  "math:trigonometry-basics": ["Measurement", "Logic"],
  "math:statistics-basics": ["Logic", "Observation"],
  "science:plants": ["Science Basics", "Observation"],
  "science:animals": ["Science Basics", "Observation"],
  "science:states-of-matter": ["Science Basics"],
  "science:human-body": ["Science Basics"],
  "science:weather-seasons": ["Science Basics", "Observation"],
  "science:food-nutrition": ["Science Basics"],
  "science:force-motion": ["Science Basics", "Logic"],
  "science:cells": ["Science Basics"],
  "english:nouns": ["Language", "Vocabulary"],
  "english:verbs": ["Language", "Vocabulary"],
  "english:adjectives": ["Language", "Vocabulary"],
  "english:pronouns": ["Language", "Reading"],
  "english:sentences": ["Reading", "Language"],
  "gk:country-basics": ["Geography Basics"],
  "gk:solar-system": ["Geography Basics", "Science Basics"],
  "gk:transport": ["Geography Basics", "Observation"],
  "gk:community-helpers": ["Geography Basics", "Observation"],
};

function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function dailyFreshSeed(childId: number, dateIso: string): number {
  return hashSeed(`${childId}:${dateIso}:daily-fresh`);
}

export function estimateLessonDurationMinutes(lesson: SmartStudyLesson): number {
  const words = lesson.lessonContent.split(/\s+/).filter(Boolean).length;
  const quizMinutes = lesson.questions.length * 1;
  return Math.max(3, Math.min(12, Math.ceil(words / 90) + quizMinutes));
}

export function subjectEmojiFor(subject: string): string {
  return SUBJECT_EMOJI[subject] ?? "✨";
}

export function toFreshLessonSummary(
  lesson: SmartStudyLesson,
  isUnseen: boolean,
  opts?: { isCompleted?: boolean; assignedAt?: string | null },
): FreshLessonSummary {
  return {
    id: lesson.id,
    title: lesson.title,
    subject: lesson.subject,
    subjectEmoji: subjectEmojiFor(lesson.subject),
    estimatedMinutes: estimateLessonDurationMinutes(lesson),
    description: lesson.description,
    ageBand: lesson.ageBand,
    isUnseen,
    isCompleted: opts?.isCompleted,
    assignedAt: opts?.assignedAt,
  };
}

/**
 * @deprecated Use login-driven `resolveFreshLessonOnLogin` via the API service.
 * Kept for topic-based recommendations only.
 */
export function pickDailyFreshLesson(
  childId: number,
  dateIso: string,
  unlockedLessons: SmartStudyLesson[],
  visibility: ContentBankLessonVisibility,
  completedActivityIds: string[],
): FreshLessonSummary | null {
  if (unlockedLessons.length === 0) return null;
  const seed = dailyFreshSeed(childId, dateIso);
  const unseen = getUnseenLessons(unlockedLessons, visibility, completedActivityIds);
  if (unseen.length > 0) {
    const sorted = [...unseen].sort(
      (a, b) => hashSeed(`${seed}:${a.id}`) - hashSeed(`${seed}:${b.id}`),
    );
    const picked = sorted[0]!;
    return toFreshLessonSummary(picked, true);
  }

  const completed = extractCompletedSmartStudyIds(completedActivityIds);
  const revisitPool = unlockedLessons.filter((l) => !completed.has(l.id));
  const pool = revisitPool.length > 0 ? revisitPool : unlockedLessons;
  const ranked = [...pool].sort((a, b) => {
    const ta = visibility.viewed[a.id];
    const tb = visibility.viewed[b.id];
    if (!ta && !tb) return hashSeed(`${seed}:${a.id}`) - hashSeed(`${seed}:${b.id}`);
    if (!ta) return -1;
    if (!tb) return 1;
    if (ta !== tb) return ta.localeCompare(tb);
    return hashSeed(`${seed}:${a.id}`) - hashSeed(`${seed}:${b.id}`);
  });
  const picked = ranked[0];
  if (!picked) return null;
  return toFreshLessonSummary(picked, false);
}

export function mapCurriculumTopicToBankSubjects(
  subjectPackId: string,
  topicId: string,
): string[] {
  return CURRICULUM_TO_BANK_SUBJECTS[`${subjectPackId}:${topicId}`] ?? [];
}

export function getUnseenLessons(
  unlockedLessons: SmartStudyLesson[],
  visibility: ContentBankLessonVisibility,
  completedActivityIds: string[],
): SmartStudyLesson[] {
  const completed = extractCompletedSmartStudyIds(completedActivityIds);
  const viewed = new Set(Object.keys(visibility.viewed));
  return unlockedLessons.filter(
    (l) => !completed.has(l.id) && !viewed.has(l.id),
  );
}

export function lessonSummaryFromId(
  lessonId: string,
  unlockedLessons: SmartStudyLesson[],
  visibility: ContentBankLessonVisibility,
  completedActivityIds: string[],
  assignedAt?: string | null,
): FreshLessonSummary | null {
  const lesson = unlockedLessons.find((l) => l.id === lessonId);
  if (!lesson) return null;
  const completed = extractCompletedSmartStudyIds(completedActivityIds);
  const isUnseen = !visibility.viewed[lessonId] && !completed.has(lessonId);
  return toFreshLessonSummary(lesson, isUnseen, {
    isCompleted: completed.has(lessonId),
    assignedAt,
  });
}

export function getRecommendedNextLesson(
  childId: number,
  dateIso: string,
  subjectPackId: string,
  topicId: string,
  unlockedLessons: SmartStudyLesson[],
  visibility: ContentBankLessonVisibility,
  completedActivityIds: string[],
): FreshLessonSummary | null {
  const subjects = mapCurriculumTopicToBankSubjects(subjectPackId, topicId);
  const completed = extractCompletedSmartStudyIds(completedActivityIds);
  const viewed = visibility.viewed;

  let pool = unlockedLessons.filter((l) => {
    if (completed.has(l.id)) return false;
    if (subjects.length === 0) return true;
    return subjects.includes(l.subject);
  });

  if (pool.length === 0) {
    pool = unlockedLessons.filter((l) => !completed.has(l.id));
  }
  if (pool.length === 0) {
    pool = unlockedLessons;
  }

  const unseen = pool.filter((l) => !viewed[l.id]);
  const seed = hashSeed(`${childId}:${dateIso}:${subjectPackId}:${topicId}:next`);
  const candidates = unseen.length > 0 ? unseen : pool;
  const sorted = [...candidates].sort(
    (a, b) => hashSeed(`${seed}:${a.id}`) - hashSeed(`${seed}:${b.id}`),
  );
  const picked = sorted[0];
  if (!picked) return null;
  return toFreshLessonSummary(picked, !viewed[picked.id]);
}
