/**
 * Emotional + educational copy for intros, feedback, and parent notes.
 * No XP, coins, streaks, or mechanic changes.
 */
import type { GameDef } from "@/lib/games";
import {
  getGameLearning,
  getLearningPracticeSummary,
} from "@/lib/game-learning";
import { formatSkillTimeLine } from "@/lib/game-hub-meta";
import {
  formatParentMastery,
  getPracticeSkillFamily,
} from "@/lib/game-mastery";

const CORRECT_LINES = [
  "Great job!",
  "You got it!",
  "Awesome!",
  "Nice thinking!",
  "Yes!",
  "Brilliant!",
  "Super star!",
  "That sparkles!",
  "Amy loves that!",
  "Smart move!",
];

const WRONG_LINES = [
  "Almost — try again!",
  "Good try! Have another go.",
  "So close — you can do it!",
  "Keep going — you've got this!",
  "Nice effort — try once more!",
  "Learning moment — another try!",
  "Brave try — go again!",
  "You're getting warmer!",
];

const IDLE_HINTS = [
  "Take your time — no rush.",
  "Look carefully — you've got this!",
  "It's okay to think for a moment.",
  "Breathe — Amy is cheering quietly.",
  "Soft and steady wins the round.",
];

/** Stable pick from a list (avoids flicker within a round). */
function pickLine(lines: string[], salt: number): string {
  const i = Math.abs(Math.floor(salt)) % lines.length;
  return lines[i] ?? lines[0];
}

export function getCorrectEncouragement(round = 0): string {
  return pickLine(CORRECT_LINES, round + 3);
}

export function getWrongEncouragement(round = 0): string {
  return pickLine(WRONG_LINES, round + 7);
}

export function getIdleHint(round = 0): string {
  return pickLine(IDLE_HINTS, round + 11);
}

export interface GameIntroCopy {
  title: string;
  body: string;
  /** Parent-facing one-liner under the child instruction. */
  parentWhy: string;
  cta: string;
}

const INTRO_CTAS = ["Let's play!", "I'm ready!", "Start!", "Go!"];

export function getGameIntro(game: GameDef): GameIntroCopy {
  const L = getGameLearning(game);
  return {
    title: game.title,
    body: L.childHowTo,
    parentWhy: `${L.skillName} · ${L.ageLabel}. ${L.whyItMatters}`,
    cta: pickLine(INTRO_CTAS, game.title.length + 5),
  };
}

/** Parent-facing practice summary — learning science clarity, no analytics. */
export function getParentPracticeNote(game: GameDef, score: number, total: number): string {
  const summary = getLearningPracticeSummary(game, score, total);
  const mastery = formatParentMastery(game.id, true);
  return `${summary.headline}. ${summary.body} Growth: ${mastery}. ${summary.tip}`;
}

export function getChildResultHeadline(perfect: boolean, score: number, total: number): string {
  if (perfect) return "Amazing work!";
  const ratio = total > 0 ? score / total : 0;
  if (ratio >= 0.75) return "You did great!";
  if (ratio >= 0.4) return "Nice practice!";
  return "You kept trying — proud of you!";
}

export function getChildResultSubline(game: GameDef): string {
  const family = getPracticeSkillFamily(game.id);
  return `Today you practised ${family}`;
}

export function getChildPracticeFamily(game: GameDef): string {
  return getPracticeSkillFamily(game.id);
}

/** Idle hint delay — gentle, not pressure. */
export const GAME_IDLE_HINT_MS = 12_000;

/**
 * Intro auto-advance — intentionally long so parents can read “Why it helps”.
 * Prefer tap-to-start; auto is a fallback only (disabled under reduced motion).
 */
export const GAME_INTRO_AUTO_MS = 18_000;

/** Attempts before advancing without revealing the exact answer. */
export const SOFT_FAIL_MAX_ATTEMPTS = 2;

/** Encouragement on a wrong try — never includes the solution. */
export function getSoftFailEncouragement(attempt: number, round = 0): string {
  if (attempt <= 1) return getWrongEncouragement(round);
  return pickLine(
    [
      "Almost — look once more!",
      "You're close — try a different choice!",
      "Good thinking — one more look!",
    ],
    round + attempt + 3,
  );
}

/** Gentle process hint — never names the correct option. */
export function getSoftFailHint(kind: SoftFailHintKind, attempt: number): string | null {
  if (attempt < 2) return null;
  switch (kind) {
    case "pattern":
      return "Hint: say the pattern out loud, then pick.";
    case "odd-one":
      return "Hint: which one does not match the group?";
    case "mistake":
      return "Hint: scan slowly — find the different one.";
    case "number":
      return "Hint: count the dots one by one.";
    case "math":
      return "Hint: try the sum again carefully.";
    case "shape":
      return "Hint: match the shape to its name.";
    default:
      return "Hint: take a slow look, then try again.";
  }
}

export type SoftFailHintKind =
  | "pattern"
  | "odd-one"
  | "mistake"
  | "number"
  | "math"
  | "shape"
  | "generic";
