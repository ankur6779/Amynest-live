/**
 * Unified child learning profile — single source of truth for progression state.
 * Persisted in `learning_progress` table; aggregated from legacy tables on read.
 */

export type SectionKey =
  | "phonics"
  | "math"
  | "speech"
  | "stories"
  | "lifeSkills"
  | "puzzles"
  | "worksheets"
  | "spelling"
  | "memory"
  | "creativity";

export type LearningPhase =
  | "explore"
  | "foundation"
  | "practice"
  | "mastery"
  | "advanced"
  | "expert";

export type CurriculumStage =
  | "early"
  | "beginner"
  | "intermediate"
  | "advanced"
  | "fluent";

export interface SectionProgress {
  level: number;
  masteryPct: number;
  activitiesCompleted: number;
  lastActivityId: string | null;
}

export const EMPTY_SECTION_PROGRESS: SectionProgress = {
  level: 1,
  masteryPct: 0,
  activitiesCompleted: 0,
  lastActivityId: null,
};

export const DEFAULT_SECTION_KEYS: SectionKey[] = [
  "phonics",
  "math",
  "speech",
  "stories",
  "lifeSkills",
  "puzzles",
  "worksheets",
  "spelling",
  "memory",
  "creativity",
];

export function defaultSectionProgress(): Record<SectionKey, SectionProgress> {
  const out = {} as Record<SectionKey, SectionProgress>;
  for (const k of DEFAULT_SECTION_KEYS) {
    out[k] = { ...EMPTY_SECTION_PROGRESS };
  }
  return out;
}

export interface LearningProgressProfile {
  childId: number;
  journeyDay: number;
  learningLevel: number;
  masteryScore: number;
  streakDays: number;
  totalXP: number;
  completedActivities: string[];
  unlockedSkills: string[];
  weakSkills: string[];
  preferredLearningModes: string[];
  lastActiveDate: string | null;
  currentPhase: LearningPhase;
  currentCurriculumStage: CurriculumStage;
  dailyUnlockSeed: number;
  nextRecommendedSkills: string[];
  sectionProgress: Record<SectionKey, SectionProgress>;
}

export interface DailyUnlockItem {
  id: string;
  section: SectionKey | "numbers" | "alphabets" | "rhymes" | "general";
  title: string;
  emoji: string;
  description: string;
}

export interface UnlockResult {
  numbersMax: number;
  alphabetRange: { start: string; end: string };
  unlockedShapes: string[];
  unlockedAnimals: number;
  phonicsLevel: number;
  speechLevel: number;
  storyLevel: number;
  puzzleDifficulty: "easy" | "medium" | "hard";
  worksheetDifficulty: "easy" | "medium" | "hard";
  todaysUnlocks: DailyUnlockItem[];
  nextSessionUnlocks: DailyUnlockItem[];
  revisionContent: DailyUnlockItem[];
  /** Extended study-zone play tiers (premium / mastery-driven). */
  numbersStage: string;
  alphabetsStage: string;
  shapesStage: string;
  colorsStage: string;
  learningLevel: number;
  isRevisionDay: boolean;
}

export interface GetUnlocksInput {
  age: number;
  journeyDay: number;
  masteryScore: number;
  streakDays: number;
  completedActivities: string[];
  sectionProgress: Record<SectionKey, SectionProgress>;
  isPremium?: boolean;
  dateIso?: string;
  childId?: number | string;
}

export interface AiTutorContext {
  weakSkills: string[];
  recentMistakes: string[];
  learningLevel: number;
  unlockedSkills: string[];
  age: number;
  masteryScore: number;
  currentPhase: LearningPhase;
  journeyDay: number;
}

export interface WeeklyParentReport {
  weekStart: string;
  weekEnd: string;
  newWordsLearned: number;
  countingImprovement: string | null;
  pronunciationImprovementPct: number | null;
  activitiesCompleted: number;
  streakDays: number;
  highlights: string[];
  sectionGains: Partial<Record<SectionKey, { from: number; to: number }>>;
}

export type ProgressAnalyticsEvent =
  | "journey_completed"
  | "skill_unlocked"
  | "daily_return"
  | "next_session_opened"
  | "worksheet_completed"
  | "speech_improved"
  | "phonics_mastered"
  | "story_completion"
  | "retention_day_1"
  | "retention_day_7"
  | "retention_day_30"
  | "session_completed"
  | "level_up"
  | "comeback_started"
  | "streak_recovered"
  | "unlock_conversion"
  | "session_quality_high";
