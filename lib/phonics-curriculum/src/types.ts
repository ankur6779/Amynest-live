/** Curriculum engine types — pure data, no I/O. */

export type CurriculumLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ChildCurriculumProgress {
  childId: number;
  userId: string;
  currentLevel: CurriculumLevel;
  /** 0–100 rolling mastery for the active level. */
  masteryScore: number;
  /** IPA / phoneme keys the child struggles with (e.g. ɪ, æ). */
  weakPhonemes: string[];
  streak: number;
  lastPlayedAt: string | null;
  lastTestScore: number | null;
  lastTestAt: string | null;
  /**
   * Highest SATPIN-style letter group unlocked (1–8).
   * Group 1 = SATPIN; blending words unlock immediately after Group 1.
   * Absent/undefined → treat as 1 for new learners; migrate from mastered letters.
   */
  letterGroupIndex?: number;
}

export type PlanActivityKind =
  | "letter_sound"
  | "blend_word"
  | "read_word"
  | "digraph"
  | "blend_cluster"
  | "sentence"
  | "revision_phoneme"
  | "daily_test";

export type CurriculumGameMode =
  | "hear_tap"
  | "build_word"
  | "missing_letter"
  | "speed_challenge"
  | "mixed";

export interface PlanActivity {
  id: string;
  kind: PlanActivityKind;
  gameMode: CurriculumGameMode;
  label: string;
  /** Word, letter, or phoneme target for TTS / UI. */
  target: string;
  level: CurriculumLevel;
  completed: boolean;
}

export interface PhonicsDailyPlan {
  date: string;
  childId: number;
  currentLevel: CurriculumLevel;
  levelName: string;
  masteryScore: number;
  streak: number;
  practice: PlanActivity[];
  revision: PlanActivity[];
  test: PlanActivity;
  weakPhonemes: string[];
}

export interface TestOutcomeInput {
  scorePct: number;
  weakConceptIds: number[];
  weakPhonemesFromContent?: string[];
  /** Letters the child has mastered — used to advance SATPIN groups. */
  masteredLetters?: string[];
}

export interface TestOutcomeResult {
  masteryScore: number;
  currentLevel: CurriculumLevel;
  levelChanged: boolean;
  weakPhonemes: string[];
  repeatLevel: boolean;
  insight: string;
  /** Updated SATPIN letter group after the test (if advanced). */
  letterGroupIndex?: number;
  letterGroupAdvanced?: boolean;
}
