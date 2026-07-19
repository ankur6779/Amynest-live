/**
 * Pure helpers for the Phonics Learning Hub (UX layer only).
 * Reuses existing SATPIN groups + mastery signals — no new API calls.
 */

import {
  getLetterGroup,
  type LetterIntroductionGroup,
} from "@workspace/phonics-curriculum";
import type { LessonResumeSnapshot } from "./lesson-resume";
import { READING_PETS, type ReadingPetState } from "./reading-pet";

export type HubLessonStatus = "done" | "current" | "upcoming" | "locked";

export type HubLessonRow = {
  index: number;
  grapheme: string;
  label: string;
  status: HubLessonStatus;
};

export type HubPracticeItemId = "lesson" | "reading" | "coach" | "story";

export type HubPracticeItem = {
  id: HubPracticeItemId;
  label: string;
  emoji: string;
  unlocked: boolean;
  hint: string;
  scrollTarget: string;
};

export type LearningHubModel = {
  greeting: string;
  group: LetterIntroductionGroup;
  lessonNumber: number;
  lessonTotal: number;
  focusGrapheme: string;
  estimatedMinutes: number;
  completionPct: number;
  lessonsCompletedInGroup: number;
  wordsLearned: number;
  starsEarned: number;
  dailyGoalLabel: string;
  hasResume: boolean;
  primaryAction: "start" | "continue";
  primaryLabel: string;
  practiceItems: HubPracticeItem[];
  lessons: HubLessonRow[];
  upcoming: {
    nextGroupName: string;
    nextGroupId: number;
    lessonsRemaining: number;
  } | null;
  petLabel: string;
  timeRemainingLabel: string;
};

function graphemeKey(g: string): string {
  const x = g.trim().toLowerCase();
  if (x === "qu") return "q";
  if (x === "ck") return "c";
  return x;
}

export function resolveMasteredGraphemeSet(
  masteredIds: Record<string, boolean | undefined>,
  symbolById: Map<string, string>,
): Set<string> {
  const set = new Set<string>();
  for (const [id, on] of Object.entries(masteredIds)) {
    if (!on) continue;
    const symbol = symbolById.get(id)?.toLowerCase();
    if (symbol) {
      set.add(symbol);
      set.add(graphemeKey(symbol));
    }
  }
  return set;
}

export function buildHubLessonRows(opts: {
  letterGroupIndex: number;
  masteredGraphemes: Set<string>;
  focusGrapheme: string;
}): HubLessonRow[] {
  const group = getLetterGroup(opts.letterGroupIndex);
  const focus = opts.focusGrapheme.trim().toLowerCase();
  let seenCurrent = false;

  return group.graphemes.map((grapheme, i) => {
    const g = grapheme.toLowerCase();
    const done =
      opts.masteredGraphemes.has(g) || opts.masteredGraphemes.has(graphemeKey(g));
    let status: HubLessonStatus;
    if (done) {
      status = "done";
    } else if (!seenCurrent && (g === focus || graphemeKey(g) === graphemeKey(focus))) {
      status = "current";
      seenCurrent = true;
    } else if (!seenCurrent) {
      // Earlier unfinished lesson before focus — still current path
      status = "current";
      seenCurrent = true;
    } else {
      status = "upcoming";
    }
    return {
      index: i + 1,
      grapheme: g,
      label: `Lesson ${i + 1}`,
      status,
    };
  });
}

export function countLessonsCompletedInGroup(
  lessons: HubLessonRow[],
): number {
  return lessons.filter((l) => l.status === "done").length;
}

export function buildPracticeItems(opts: {
  hasResume: boolean;
  lessonsCompletedInGroup: number;
  wordsLearned: number;
  storiesUnlocked: boolean;
}): HubPracticeItem[] {
  const lessonUnlocked = true;
  const readingUnlocked =
    opts.hasResume || opts.lessonsCompletedInGroup > 0 || opts.wordsLearned > 0;
  const coachUnlocked = opts.hasResume || opts.lessonsCompletedInGroup > 0;
  const storyUnlocked = opts.storiesUnlocked || opts.lessonsCompletedInGroup >= 2;

  return [
    {
      id: "lesson",
      label: "Lesson",
      emoji: "📘",
      unlocked: lessonUnlocked,
      hint: "Today's sound lesson",
      scrollTarget: "phonics-reading-lesson",
    },
    {
      id: "reading",
      label: "Reading Practice",
      emoji: "📖",
      unlocked: readingUnlocked,
      hint: readingUnlocked ? "Blend and read words" : "Finish a lesson first",
      scrollTarget: "phonics-v2-karaoke",
    },
    {
      id: "coach",
      label: "AI Coach",
      emoji: "🎙️",
      unlocked: coachUnlocked,
      hint: coachUnlocked ? "Say the sound with Amy" : "Unlock after starting a lesson",
      scrollTarget: "phonics-reading-lesson",
    },
    {
      id: "story",
      label: "Story",
      emoji: "📚",
      unlocked: storyUnlocked,
      hint: storyUnlocked ? "Read a decodable story" : "Complete 2 lessons to unlock",
      scrollTarget: "phonics-v2-stories",
    },
  ];
}

export function buildLearningHubModel(opts: {
  childName: string;
  letterGroupIndex: number;
  focusGrapheme: string;
  masteredGraphemes: Set<string>;
  wordsLearned: number;
  starsEarned: number;
  resume: LessonResumeSnapshot | null;
  pet: ReadingPetState;
  estimatedMinutes?: number;
  storiesUnlocked?: boolean;
  dailyGoalMet?: boolean;
}): LearningHubModel {
  const group = getLetterGroup(opts.letterGroupIndex);
  const lessons = buildHubLessonRows({
    letterGroupIndex: opts.letterGroupIndex,
    masteredGraphemes: opts.masteredGraphemes,
    focusGrapheme: opts.focusGrapheme,
  });
  const lessonsCompletedInGroup = countLessonsCompletedInGroup(lessons);
  const lessonTotal = group.graphemes.length;
  const lessonNumber = Math.min(lessonTotal, lessonsCompletedInGroup + 1);
  const completionPct =
    lessonTotal > 0
      ? Math.round((lessonsCompletedInGroup / lessonTotal) * 100)
      : 0;
  const hasResume = Boolean(
    opts.resume &&
      opts.resume.grapheme === opts.focusGrapheme.trim().toLowerCase() &&
      opts.resume.letterGroupIndex === opts.letterGroupIndex &&
      opts.resume.stepIndex >= 0 &&
      opts.resume.stepIndex < 10,
  );
  const primaryAction: "start" | "continue" = hasResume ? "continue" : "start";
  const primaryLabel = hasResume
    ? "Continue Today's Adventure"
    : "Start Today";
  const lessonsRemaining = Math.max(0, lessonTotal - lessonsCompletedInGroup);
  const nextGroupId = Math.min(8, opts.letterGroupIndex + 1);
  const upcoming =
    opts.letterGroupIndex < 8
      ? {
          nextGroupId,
          nextGroupName: getLetterGroup(nextGroupId).name,
          lessonsRemaining: Math.max(1, lessonsRemaining),
        }
      : null;

  const petMeta = READING_PETS[opts.pet.kind] ?? READING_PETS.owl;
  const minutesLeft = Math.max(
    1,
    Math.ceil(
      (opts.estimatedMinutes ?? 5) *
        (hasResume
          ? Math.max(0.2, 1 - (opts.resume!.stepIndex / 10))
          : 1),
    ),
  );

  return {
    greeting: `Hi ${opts.childName.trim() || "friend"}!`,
    group,
    lessonNumber,
    lessonTotal,
    focusGrapheme: opts.focusGrapheme.trim().toLowerCase(),
    estimatedMinutes: opts.estimatedMinutes ?? 5,
    completionPct,
    lessonsCompletedInGroup,
    wordsLearned: opts.wordsLearned,
    starsEarned: opts.starsEarned,
    dailyGoalLabel: opts.dailyGoalMet ? "Daily goal done ★" : "Daily goal: 1 lesson",
    hasResume,
    primaryAction,
    primaryLabel,
    practiceItems: buildPracticeItems({
      hasResume,
      lessonsCompletedInGroup,
      wordsLearned: opts.wordsLearned,
      storiesUnlocked: Boolean(opts.storiesUnlocked),
    }),
    lessons,
    upcoming,
    petLabel: `${petMeta.emoji} ${petMeta.name}`,
    timeRemainingLabel: `~${minutesLeft} min`,
  };
}
