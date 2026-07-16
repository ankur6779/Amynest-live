/**
 * Reading Academy levels — milestone framework layered on SATPIN + curriculum.
 * Does NOT replace letter groups or curriculum L1–L7; maps onto them.
 */
import type { CurriculumLevel } from "@workspace/phonics-curriculum";

export type ReadingAcademyLevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ReadingAcademyLevel = {
  id: ReadingAcademyLevelId;
  name: string;
  shortName: string;
  emoji: string;
  description: string;
  /** Aligned curriculum level(s) */
  curriculumLevels: CurriculumLevel[];
  /** Minimum letter group typically needed */
  minLetterGroup: number;
  milestoneLabel: string;
};

export const READING_ACADEMY_LEVELS: readonly ReadingAcademyLevel[] = [
  {
    id: 1,
    name: "Learning Sounds",
    shortName: "Sounds",
    emoji: "👂",
    description: "Hear and say letter sounds — the start of reading.",
    curriculumLevels: [1],
    minLetterGroup: 1,
    milestoneLabel: "Sound Explorer",
  },
  {
    id: 2,
    name: "Building Words",
    shortName: "Build",
    emoji: "🧩",
    description: "Blend sounds together to make real words.",
    curriculumLevels: [1, 2],
    minLetterGroup: 1,
    milestoneLabel: "Word Builder",
  },
  {
    id: 3,
    name: "Reading Words",
    shortName: "Words",
    emoji: "📖",
    description: "Read simple words on your own.",
    curriculumLevels: [2],
    minLetterGroup: 2,
    milestoneLabel: "Word Reader",
  },
  {
    id: 4,
    name: "Reading Sentences",
    shortName: "Sentences",
    emoji: "✏️",
    description: "Put words together into short sentences.",
    curriculumLevels: [2, 3],
    minLetterGroup: 2,
    milestoneLabel: "Sentence Starter",
  },
  {
    id: 5,
    name: "Reading Short Stories",
    shortName: "Stories",
    emoji: "📚",
    description: "Enjoy short decodable stories from start to finish.",
    curriculumLevels: [3, 4],
    minLetterGroup: 3,
    milestoneLabel: "Story Friend",
  },
  {
    id: 6,
    name: "Reading Books",
    shortName: "Books",
    emoji: "📗",
    description: "Read longer decodable books with confidence.",
    curriculumLevels: [4, 5, 6],
    minLetterGroup: 4,
    milestoneLabel: "Book Explorer",
  },
  {
    id: 7,
    name: "Reading Fluently",
    shortName: "Fluent",
    emoji: "🌟",
    description: "Read smoothly, with expression and understanding.",
    curriculumLevels: [6, 7],
    minLetterGroup: 6,
    milestoneLabel: "Fluent Reader",
  },
] as const;

/**
 * Resolve academy level from curriculum + letter group + reading milestones.
 * Pure function — never mutates SATPIN unlock state.
 */
export function resolveReadingAcademyLevel(opts: {
  curriculumLevel: number;
  letterGroupIndex: number;
  wordsRead: number;
  storiesCompleted: number;
  blendingScore?: number;
}): ReadingAcademyLevelId {
  const cur = Math.max(1, Math.min(7, Math.round(opts.curriculumLevel || 1)));
  const group = Math.max(1, Math.min(8, Math.round(opts.letterGroupIndex || 1)));
  const words = opts.wordsRead;
  const stories = opts.storiesCompleted;
  const blend = opts.blendingScore ?? 0;

  if (cur >= 6 && stories >= 8 && words >= 80) return 7;
  if (cur >= 4 && stories >= 4) return 6;
  if (stories >= 2 || (cur >= 3 && words >= 25)) return 5;
  if (words >= 12 && group >= 2) return 4;
  if (words >= 5 && (blend >= 50 || group >= 2)) return 3;
  // Level 2 requires evidence of blending/reading — letter group alone stays L1
  if (words >= 1 || blend >= 40) return 2;
  return 1;
}

export function getReadingAcademyLevel(id: number): ReadingAcademyLevel {
  return (
    READING_ACADEMY_LEVELS.find((l) => l.id === id) ?? READING_ACADEMY_LEVELS[0]!
  );
}

export function nextReadingAcademyLevel(
  id: ReadingAcademyLevelId,
): ReadingAcademyLevel | null {
  if (id >= 7) return null;
  return getReadingAcademyLevel(id + 1);
}
