/**
 * Multi-skill reading mastery — tracks SoR strands separately from word mastery.
 * Persists in localStorage; feeds adaptive practice + parent dashboard.
 */
import type { ReadingSkillId } from "./reading-lesson-engine";
import { READING_LESSON_STEPS } from "./reading-lesson-engine";

export type SkillMasteryRecord = {
  skill: ReadingSkillId;
  /** 0–100 rolling accuracy. */
  score: number;
  attempts: number;
  correct: number;
  lastAt: number;
};

export type ReadingSkillsState = {
  version: 1;
  skills: Record<ReadingSkillId, SkillMasteryRecord>;
  /** Words the child read independently (cold read). */
  wordsRead: string[];
  /** Cumulative reading stars. */
  readingStars: number;
  /** Mystery word of the day (dateKey → word). */
  mysteryWordByDay: Record<string, string>;
  /** Badges earned. */
  badges: string[];
};

const STORAGE_PREFIX = "amynest:phonics-reading-skills:";

const ALL_SKILLS: ReadingSkillId[] = [
  "phoneme_production",
  "letter_recognition",
  "beginning_sounds",
  "ending_sounds",
  "blending",
  "segmenting",
  "reading",
  "fluency",
];

function emptySkill(skill: ReadingSkillId): SkillMasteryRecord {
  return { skill, score: 0, attempts: 0, correct: 0, lastAt: 0 };
}

export function defaultReadingSkillsState(): ReadingSkillsState {
  const skills = {} as Record<ReadingSkillId, SkillMasteryRecord>;
  for (const s of ALL_SKILLS) skills[s] = emptySkill(s);
  return {
    version: 1,
    skills,
    wordsRead: [],
    readingStars: 0,
    mysteryWordByDay: {},
    badges: [],
  };
}

export function loadReadingSkillsState(childId: number): ReadingSkillsState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultReadingSkillsState();
    const parsed = JSON.parse(raw) as ReadingSkillsState;
    const base = defaultReadingSkillsState();
    return {
      ...base,
      ...parsed,
      skills: { ...base.skills, ...parsed.skills },
    };
  } catch {
    return defaultReadingSkillsState();
  }
}

export function saveReadingSkillsState(
  childId: number,
  state: ReadingSkillsState,
): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

/** Exponential moving average toward 100 on success / 0 on fail. */
export function recordSkillAttempt(
  state: ReadingSkillsState,
  skill: ReadingSkillId,
  correct: boolean,
): ReadingSkillsState {
  const prev = state.skills[skill] ?? emptySkill(skill);
  const attempts = prev.attempts + 1;
  const correctCount = prev.correct + (correct ? 1 : 0);
  const alpha = 0.25;
  const observed = correct ? 100 : Math.max(0, prev.score - 15);
  const score = Math.round(prev.score * (1 - alpha) + observed * alpha);
  return {
    ...state,
    skills: {
      ...state.skills,
      [skill]: {
        skill,
        score: Math.max(0, Math.min(100, score)),
        attempts,
        correct: correctCount,
        lastAt: Date.now(),
      },
    },
  };
}

export function recordLessonSkills(
  state: ReadingSkillsState,
  results: { stepId: string; correct: boolean; skipped?: boolean }[],
  stars: number,
  focusWord: string,
): ReadingSkillsState {
  let next = { ...state, readingStars: state.readingStars + stars };
  for (const r of results) {
    if (r.skipped) continue;
    const step = READING_LESSON_STEPS.find((s) => s.id === r.stepId);
    if (!step) continue;
    next = recordSkillAttempt(next, step.skill, r.correct);
  }
  const completedIndependentRead = results.some(
    (r) => r.stepId === "read_independent" && r.correct && !r.skipped,
  );
  const wordsRead =
    completedIndependentRead && !next.wordsRead.includes(focusWord)
      ? [...next.wordsRead, focusWord].slice(-200)
      : next.wordsRead;

  const badges = new Set(next.badges);
  if (wordsRead.length >= 5) badges.add("first_five_words");
  if (wordsRead.length >= 20) badges.add("word_explorer");
  if (wordsRead.length >= 50) badges.add("reading_star");
  if (next.readingStars >= 15) badges.add("star_collector");
  if ((next.skills.blending?.score ?? 0) >= 80) badges.add("blend_champ");

  return { ...next, wordsRead, badges: [...badges] };
}

export function getWeakSkills(
  state: ReadingSkillsState,
  limit = 3,
): ReadingSkillId[] {
  return ALL_SKILLS.filter((s) => (state.skills[s]?.attempts ?? 0) > 0)
    .sort((a, b) => (state.skills[a]?.score ?? 0) - (state.skills[b]?.score ?? 0))
    .slice(0, limit);
}

export function skillScoresMap(
  state: ReadingSkillsState,
): Partial<Record<ReadingSkillId, number>> {
  const out: Partial<Record<ReadingSkillId, number>> = {};
  for (const s of ALL_SKILLS) out[s] = state.skills[s]?.score ?? 0;
  return out;
}

export function fluencyLabel(score: number): string {
  if (score >= 80) return "Confident";
  if (score >= 60) return "Developing";
  if (score >= 35) return "Emerging";
  return "Getting started";
}

export const SKILL_LABELS: Record<ReadingSkillId, string> = {
  phoneme_production: "Saying sounds",
  letter_recognition: "Letter recognition",
  beginning_sounds: "Beginning sounds",
  ending_sounds: "Ending sounds",
  blending: "Blending",
  segmenting: "Segmenting",
  reading: "Word reading",
  fluency: "Reading fluency",
};

export const BADGE_LABELS: Record<string, string> = {
  first_five_words: "First 5 Words",
  word_explorer: "Word Explorer",
  reading_star: "Reading Star",
  star_collector: "Star Collector",
  blend_champ: "Blend Champ",
};
