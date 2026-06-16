import {
  parseChildClassNumber,
  resolveStudyMode,
  type StudyMode,
} from "@workspace/study-zone";
import type {
  AgeBand,
  ContentBankUnlockContext,
  SmartStudyDifficulty,
  SmartStudyLesson,
} from "./types.js";
import { AGE_BANDS, ageBandFromChildAge } from "./unlock.js";

const AGE_BAND_INDEX: Record<AgeBand, number> = {
  "2-4": 0,
  "4-6": 1,
  "6-8": 2,
  "8-10": 3,
  "10-12": 4,
};

const DIFFICULTY_ORDER: SmartStudyDifficulty[] = [
  "starter",
  "easy",
  "medium",
  "challenging",
  "advanced",
];

export interface LessonEligibilityProfile {
  childAge: number;
  childClass?: string | null;
  studyMode?: StudyMode;
  learningLevel: number;
  masteryScore: number;
  journeyDay: number;
  isPremium?: boolean;
}

export interface LessonEligibilityStats {
  childId: number;
  childAge: number;
  childClass: string | null;
  studyMode: StudyMode;
  totalLessons: number;
  eligibleLessons: number;
  filteredLessons: number;
  minAgeBand: AgeBand;
  maxAgeBand: AgeBand;
}

function difficultyOf(item: SmartStudyLesson | Record<string, unknown>): SmartStudyDifficulty {
  const record = item as Record<string, unknown>;
  const d = record.difficulty ?? record.confidenceLevel;
  if (d === "gentle") return "starter";
  if (d === "building") return "medium";
  if (d === "ready") return "advanced";
  if (typeof d === "string" && DIFFICULTY_ORDER.includes(d as SmartStudyDifficulty)) {
    return d as SmartStudyDifficulty;
  }
  return "easy";
}

export function resolveStudyModeForContext(
  ctx: Pick<ContentBankUnlockContext, "childAge" | "childClass" | "studyMode">,
): StudyMode {
  return ctx.studyMode ?? resolveStudyMode(ctx.childAge, ctx.childClass);
}

/** Lowest age band a child may receive (excludes toddler content for school-age kids). */
export function minAgeBandIndex(ctx: LessonEligibilityProfile): number {
  const studyMode = ctx.studyMode ?? resolveStudyMode(ctx.childAge, ctx.childClass);
  const classNum = parseChildClassNumber(ctx.childClass, ctx.childAge);

  if (studyMode === "play") return 0;

  if (studyMode === "advanced") {
    if (classNum != null && classNum >= 8) return 3;
    if (classNum != null && classNum >= 6) return 2;
    return 2;
  }

  if (classNum === 0) return 0;
  if (classNum != null && classNum >= 1) return 1;

  if (ctx.childAge <= 4) return 0;
  if (ctx.childAge <= 5) return 1;
  return 1;
}

/** Highest age band unlocked by progress (same progressive ceiling as catalog unlock). */
export function maxAgeBandIndex(ctx: LessonEligibilityProfile): number {
  const base = AGE_BAND_INDEX[ageBandFromChildAge(ctx.childAge)];
  const bonus =
    ctx.masteryScore >= 80 ? 1 : ctx.masteryScore >= 55 ? 0 : -1;
  const premiumBonus = ctx.isPremium ? 1 : 0;
  return Math.min(4, Math.max(0, base + bonus + premiumBonus));
}

function maxDifficultyIndex(ctx: LessonEligibilityProfile): number {
  const fromLevel = Math.floor(ctx.learningLevel / 2);
  const fromMastery = Math.floor(ctx.masteryScore / 20);
  const fromJourney = Math.floor(ctx.journeyDay / 4);
  return Math.min(
    DIFFICULTY_ORDER.length - 1,
    Math.max(0, fromLevel + fromMastery + fromJourney - 1),
  );
}

export function validateLessonEligibility(
  ctx: ContentBankUnlockContext,
  lesson: SmartStudyLesson | Record<string, unknown>,
): boolean {
  const ageBand = lesson.ageBand as AgeBand | undefined;
  if (!ageBand || !(ageBand in AGE_BAND_INDEX)) return false;

  const bandIdx = AGE_BAND_INDEX[ageBand];
  const minIdx = minAgeBandIndex(ctx);
  const maxIdx = maxAgeBandIndex(ctx);
  if (bandIdx < minIdx || bandIdx > maxIdx) return false;

  const diffIdx = DIFFICULTY_ORDER.indexOf(difficultyOf(lesson));
  if (diffIdx > maxDifficultyIndex(ctx)) return false;
  return true;
}

export function filterEligibleSmartStudyLessons<T extends SmartStudyLesson>(
  lessons: T[],
  ctx: ContentBankUnlockContext,
): T[] {
  return lessons.filter((lesson) => validateLessonEligibility(ctx, lesson));
}

export function computeLessonEligibilityStats(
  childId: number,
  lessons: SmartStudyLesson[],
  ctx: ContentBankUnlockContext,
): LessonEligibilityStats {
  const studyMode = resolveStudyModeForContext(ctx);
  const eligible = filterEligibleSmartStudyLessons(lessons, ctx);
  const minIdx = minAgeBandIndex(ctx);
  const maxIdx = maxAgeBandIndex(ctx);
  return {
    childId,
    childAge: ctx.childAge,
    childClass: ctx.childClass ?? null,
    studyMode,
    totalLessons: lessons.length,
    eligibleLessons: eligible.length,
    filteredLessons: lessons.length - eligible.length,
    minAgeBand: AGE_BANDS[minIdx]!,
    maxAgeBand: AGE_BANDS[maxIdx]!,
  };
}

export function pickFirstEligibleLessonId(
  sequence: string[],
  ctx: ContentBankUnlockContext,
  lessons: SmartStudyLesson[],
): string | null {
  const byId = new Map(lessons.map((l) => [l.id, l]));
  for (const id of sequence) {
    const lesson = byId.get(id);
    if (lesson && validateLessonEligibility(ctx, lesson)) return id;
  }
  return null;
}

export function isFreshLessonStateValid(
  state: { currentFreshLessonId: string | null; freshLessonSequence: string[] },
  ctx: ContentBankUnlockContext,
  lessons: SmartStudyLesson[],
): boolean {
  if (!state.currentFreshLessonId) return true;
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const current = byId.get(state.currentFreshLessonId);
  if (!current || !validateLessonEligibility(ctx, current)) return false;
  if (state.freshLessonSequence.length === 0) return false;
  return state.freshLessonSequence.every((id) => {
    const lesson = byId.get(id);
    return lesson != null && validateLessonEligibility(ctx, lesson);
  });
}
