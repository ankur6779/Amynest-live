// ─────────────────────────────────────────────────────────────────────────
// @workspace/abacus
// Pure logic for the Parent Hub "Abacus PRO Zone" learning module. No
// React, no platform deps — runs identically on web (kidschedule) and
// mobile (amynest-mobile) so practice problems / scoring / unlock rules
// stay in lock-step across both clients.
// ─────────────────────────────────────────────────────────────────────────

/** A standard soroban-style abacus has one "heaven" bead worth 5 plus four
 *  "earth" beads worth 1 each on every rod, giving each rod a 0–9 range. */
export const UPPER_BEADS_PER_ROD = 1;
export const LOWER_BEADS_PER_ROD = 4;
export const MAX_VALUE_PER_ROD = 9;

/** Maximum number of rods we render in the Zone (matches the spec). */
export const MAX_RODS = 5;

export type RodIndex = 0 | 1 | 2 | 3 | 4;

/** State of a single rod: how many upper / lower beads are *active*
 *  (i.e. pushed toward the central beam). */
export type RodState = {
  /** 0 or 1 — only one heaven bead per rod. */
  upper: 0 | 1;
  /** 0..LOWER_BEADS_PER_ROD — number of earth beads pushed up. */
  lower: 0 | 1 | 2 | 3 | 4;
};

/** Full abacus state. The first element is the *highest* place value
 *  (so for a 5-rod abacus index 0 is the ten-thousands rod and index 4
 *  is the ones rod) — same convention as a written number. */
export type AbacusState = RodState[];

/** Compute the numeric value represented by a single rod. */
export function rodValue(rod: RodState): number {
  return rod.upper * 5 + rod.lower;
}

/** Sum of all rods in their proper place values (rod 0 is highest). */
export function abacusValue(state: AbacusState): number {
  let total = 0;
  const places = state.length;
  for (let i = 0; i < places; i++) {
    const placePower = Math.pow(10, places - 1 - i);
    total += rodValue(state[i]) * placePower;
  }
  return total;
}

/** Build a fully-cleared abacus with `rods` rods. */
export function emptyAbacus(rods: number): AbacusState {
  const n = Math.min(MAX_RODS, Math.max(1, Math.round(rods)));
  const out: AbacusState = [];
  for (let i = 0; i < n; i++) out.push({ upper: 0, lower: 0 });
  return out;
}

/** Decompose a non-negative integer into rod states. Throws if the value
 *  doesn't fit into the requested rod count. */
export function abacusFromValue(value: number, rods: number): AbacusState {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Error(`abacusFromValue: invalid value ${value}`);
  }
  const n = Math.min(MAX_RODS, Math.max(1, Math.round(rods)));
  const max = Math.pow(10, n) - 1;
  if (value > max) {
    throw new Error(`abacusFromValue: ${value} doesn't fit in ${n} rods`);
  }
  const out: AbacusState = emptyAbacus(n);
  let v = value;
  for (let i = n - 1; i >= 0; i--) {
    const digit = v % 10;
    v = Math.floor(v / 10);
    out[i] = digitToRod(digit);
  }
  return out;
}

/** Convert a 0–9 digit into the canonical rod state for that digit. */
export function digitToRod(digit: number): RodState {
  if (digit < 0 || digit > MAX_VALUE_PER_ROD || !Number.isInteger(digit)) {
    throw new Error(`digitToRod: ${digit} out of range`);
  }
  const upper: 0 | 1 = digit >= 5 ? 1 : 0;
  const lower = (digit - upper * 5) as 0 | 1 | 2 | 3 | 4;
  return { upper, lower };
}

/** Toggle the upper (heaven) bead on a single rod. Pure — returns a new
 *  state, never mutates the input. */
export function toggleUpper(state: AbacusState, rod: number): AbacusState {
  if (rod < 0 || rod >= state.length) return state;
  const next = state.map((r) => ({ ...r }));
  next[rod].upper = next[rod].upper === 1 ? 0 : 1;
  return next;
}

/**
 * Move the lower beads of a rod so that exactly `count` (0–4) are active.
 * On a real soroban tapping the n-th earth bead pushes all lower beads
 * up to and including it — so this matches the natural finger gesture.
 */
export function setLowerCount(
  state: AbacusState,
  rod: number,
  count: number,
): AbacusState {
  if (rod < 0 || rod >= state.length) return state;
  const clamped = Math.min(LOWER_BEADS_PER_ROD, Math.max(0, Math.round(count)));
  const next = state.map((r) => ({ ...r }));
  next[rod].lower = clamped as 0 | 1 | 2 | 3 | 4;
  return next;
}

/** Reset every rod to all-down (value = 0). */
export function clearAbacus(state: AbacusState): AbacusState {
  return state.map(() => ({ upper: 0 as const, lower: 0 as const }));
}

// ─── Levels & progression ────────────────────────────────────────────────

export type LevelId = 1 | 2 | 3 | 4 | 5;

export type LevelMode = "numbers" | "addition" | "subtraction" | "multidigit" | "mental";

export interface LevelDefinition {
  id: LevelId;
  /** Stable slug used in i18n keys + progress payloads. */
  slug: LevelMode;
  /** Smallest rod count needed for problems at this level. */
  rods: number;
  /** Inclusive [min,max] for each operand at this level. */
  operandRange: [number, number];
  /** Number of problems used to evaluate Challenge unlock. */
  challengeCount: number;
  /** Accuracy % required to unlock the next level. */
  unlockAccuracyPct: number;
  /** Default seconds per question in Challenge mode. */
  challengeSecondsPerQ: number;
  /** Bonus points awarded if answered within this fraction of the limit. */
  fastBonusFraction: number;
}

export const LEVELS: readonly LevelDefinition[] = [
  {
    id: 1,
    slug: "numbers",
    rods: 1,
    operandRange: [0, 9],
    challengeCount: 5,
    unlockAccuracyPct: 70,
    challengeSecondsPerQ: 20,
    fastBonusFraction: 0.5,
  },
  {
    id: 2,
    slug: "addition",
    rods: 1,
    operandRange: [1, 4],
    challengeCount: 5,
    unlockAccuracyPct: 70,
    challengeSecondsPerQ: 20,
    fastBonusFraction: 0.5,
  },
  {
    id: 3,
    slug: "subtraction",
    rods: 1,
    operandRange: [0, 9],
    challengeCount: 5,
    unlockAccuracyPct: 70,
    challengeSecondsPerQ: 25,
    fastBonusFraction: 0.5,
  },
  {
    id: 4,
    slug: "multidigit",
    rods: 3,
    operandRange: [10, 99],
    challengeCount: 5,
    unlockAccuracyPct: 60,
    challengeSecondsPerQ: 30,
    fastBonusFraction: 0.5,
  },
  {
    id: 5,
    slug: "mental",
    rods: 2,
    operandRange: [1, 20],
    challengeCount: 5,
    unlockAccuracyPct: 60,
    challengeSecondsPerQ: 25,
    fastBonusFraction: 0.5,
  },
] as const;

export function getLevel(id: LevelId): LevelDefinition {
  const lvl = LEVELS.find((l) => l.id === id);
  if (!lvl) throw new Error(`getLevel: unknown level ${id}`);
  return lvl;
}

/** Highest level that is currently playable for a child whose `completed`
 *  list contains every level they've already passed. Levels unlock in
 *  order — Level 1 is always available; Level N requires Level N-1
 *  passed. */
export function highestUnlockedLevel(
  completed: readonly LevelId[],
): LevelId {
  let highest: LevelId = 1;
  for (const lvl of LEVELS) {
    if (lvl.id === 1) continue;
    const prev = (lvl.id - 1) as LevelId;
    if (completed.includes(prev)) highest = lvl.id;
  }
  return highest;
}

export function isLevelUnlocked(
  id: LevelId,
  completed: readonly LevelId[],
): boolean {
  if (id === 1) return true;
  return completed.includes((id - 1) as LevelId);
}

// ─── Problem generation ──────────────────────────────────────────────────

export interface AbacusProblem {
  /** Display string e.g. "3 + 4" or "26 + 17". */
  prompt: string;
  /** Numeric correct answer. */
  answer: number;
  /** Required rod count to display the answer. */
  rods: number;
  /** Optional hint text — short, kid-friendly. */
  hint: string;
  /** Optional pre-set state to display on the abacus before the child
   *  starts (e.g. for addition: show first operand). Empty for numbers. */
  initialState?: AbacusState;
}

/** Tiny seedable pseudo-random generator (mulberry32) so problem sets are
 *  reproducible in tests but feel random in production (seed = Date.now). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/** Generate a single problem appropriate for the given level. */
export function generateProblem(
  level: LevelId,
  rand: () => number,
): AbacusProblem {
  const def = getLevel(level);
  switch (def.slug) {
    case "numbers": {
      const n = pickInt(rand, def.operandRange[0], def.operandRange[1]);
      return {
        prompt: String(n),
        answer: n,
        rods: 1,
        hint:
          n >= 5
            ? `Push 1 upper bead down (= 5) and ${n - 5} lower beads up.`
            : `Push ${n} lower beads up.`,
      };
    }
    case "addition": {
      const a = pickInt(rand, def.operandRange[0], def.operandRange[1]);
      const b = pickInt(rand, def.operandRange[0], 9 - a); // keep within one rod
      return {
        prompt: `${a} + ${b}`,
        answer: a + b,
        rods: 1,
        hint: `Start at ${a}, then add ${b} more by moving ${b} bead${b === 1 ? "" : "s"}.`,
        initialState: abacusFromValue(a, 1),
      };
    }
    case "subtraction": {
      const a = pickInt(rand, 3, def.operandRange[1]);
      const b = pickInt(rand, 1, a);
      return {
        prompt: `${a} − ${b}`,
        answer: a - b,
        rods: 1,
        hint: `Start at ${a}, then take ${b} away.`,
        initialState: abacusFromValue(a, 1),
      };
    }
    case "multidigit": {
      const a = pickInt(rand, def.operandRange[0], def.operandRange[1]);
      const max = 99 - a; // keep total under 3-digit overflow
      const b = pickInt(rand, def.operandRange[0], Math.max(def.operandRange[0], max));
      return {
        prompt: `${a} + ${b}`,
        answer: a + b,
        rods: 3,
        hint: `Add the ones first, then the tens — carry over to the next rod if a rod overflows.`,
        initialState: abacusFromValue(a, 3),
      };
    }
    case "mental": {
      const op = rand() < 0.5 ? "+" : "−";
      if (op === "+") {
        const a = pickInt(rand, 1, def.operandRange[1]);
        const b = pickInt(rand, 1, def.operandRange[1]);
        return {
          prompt: `${a} + ${b}`,
          answer: a + b,
          rods: 2,
          hint: `Picture the abacus in your head — add ${b} to ${a}.`,
        };
      }
      const a = pickInt(rand, 5, def.operandRange[1]);
      const b = pickInt(rand, 1, a);
      return {
        prompt: `${a} − ${b}`,
        answer: a - b,
        rods: 2,
        hint: `Picture the abacus in your head — take ${b} away from ${a}.`,
      };
    }
  }
}

/** Generate a deterministic batch of problems for Challenge mode. */
export function generateChallenge(
  level: LevelId,
  seed: number,
): AbacusProblem[] {
  const def = getLevel(level);
  const rand = rng(seed);
  const out: AbacusProblem[] = [];
  for (let i = 0; i < def.challengeCount; i++) {
    out.push(generateProblem(level, rand));
  }
  return out;
}

// ─── Scoring ─────────────────────────────────────────────────────────────

export const POINTS_CORRECT = 10;
export const POINTS_FAST_BONUS = 5;

export interface ScoreInput {
  correct: boolean;
  /** Time the child took to answer, in milliseconds. */
  elapsedMs: number;
  /** Time limit for the question, in milliseconds. */
  limitMs: number;
  /** Fraction of `limitMs` under which a fast bonus is granted (0–1). */
  fastBonusFraction: number;
}

export interface ScoreResult {
  points: number;
  basePoints: number;
  bonusPoints: number;
  fastBonus: boolean;
}

/** Score a single Challenge answer. +10 for correct, +5 fast-bonus when
 *  answered within `fastBonusFraction` of the limit. Wrong answers always
 *  return 0 points (no negative scoring at this age range). */
export function scoreAnswer(input: ScoreInput): ScoreResult {
  if (!input.correct) {
    return { points: 0, basePoints: 0, bonusPoints: 0, fastBonus: false };
  }
  const fastBonus =
    input.elapsedMs <= Math.max(0, input.limitMs * input.fastBonusFraction);
  const bonusPoints = fastBonus ? POINTS_FAST_BONUS : 0;
  return {
    points: POINTS_CORRECT + bonusPoints,
    basePoints: POINTS_CORRECT,
    bonusPoints,
    fastBonus,
  };
}

export interface SessionSummary {
  totalQuestions: number;
  correct: number;
  totalPoints: number;
  accuracyPct: number;
  /** True when the session passes the unlock criteria for its level. */
  passed: boolean;
  /** Performance label used for badges & celebratory copy. */
  label: "perfect" | "great" | "good" | "keep_going";
}

export function summarizeSession(
  level: LevelId,
  results: { correct: boolean; points: number }[],
): SessionSummary {
  const def = getLevel(level);
  const totalQuestions = results.length;
  const correct = results.filter((r) => r.correct).length;
  const totalPoints = results.reduce((s, r) => s + r.points, 0);
  const accuracyPct =
    totalQuestions === 0 ? 0 : Math.round((correct / totalQuestions) * 100);
  const passed = totalQuestions > 0 && accuracyPct >= def.unlockAccuracyPct;
  let label: SessionSummary["label"];
  if (accuracyPct === 100) label = "perfect";
  else if (accuracyPct >= 80) label = "great";
  else if (accuracyPct >= def.unlockAccuracyPct) label = "good";
  else label = "keep_going";
  return { totalQuestions, correct, totalPoints, accuracyPct, passed, label };
}

// ─── Lesson scripts (Learn mode) ─────────────────────────────────────────

export interface LessonStep {
  /** Short narration line — also passed to TTS in Learn mode. */
  text: string;
  /** Abacus state to display while this step is on screen. */
  state: AbacusState;
  /** Optional rod index to glow / highlight during this step. */
  highlightRod?: number;
}

export interface LessonScript {
  level: LevelId;
  title: string;
  steps: LessonStep[];
}

/**
 * Canonical Learn-mode walkthrough for each level. Pure data so it can be
 * tested and reused on web + mobile.
 */
export function buildLessonScript(level: LevelId): LessonScript {
  switch (level) {
    case 1:
      return {
        level,
        title: "Numbers 0 to 9",
        steps: [
          { text: "This is one rod of the abacus. The bead on top is worth 5. Each bead at the bottom is worth 1.", state: emptyAbacus(1), highlightRod: 0 },
          { text: "Push one lower bead up — that is the number 1.", state: abacusFromValue(1, 1), highlightRod: 0 },
          { text: "Push three lower beads up — that is the number 3.", state: abacusFromValue(3, 1), highlightRod: 0 },
          { text: "Push the top bead down — that is 5 all by itself.", state: abacusFromValue(5, 1), highlightRod: 0 },
          { text: "5 plus 4 lower beads makes 9 — the biggest number on one rod.", state: abacusFromValue(9, 1), highlightRod: 0 },
        ],
      };
    case 2:
      return {
        level,
        title: "Adding small numbers",
        steps: [
          { text: "Let us add 2 plus 3. First, show 2 by pushing two lower beads up.", state: abacusFromValue(2, 1), highlightRod: 0 },
          { text: "Now add 3 more by pushing three more lower beads up.", state: abacusFromValue(5, 1), highlightRod: 0 },
          { text: "Four lower beads plus the top bead — that gives us 5. The answer is 5!", state: abacusFromValue(5, 1), highlightRod: 0 },
          { text: "When you run out of lower beads, push the top bead down — it is worth 5.", state: abacusFromValue(5, 1), highlightRod: 0 },
        ],
      };
    case 3:
      return {
        level,
        title: "Subtracting numbers",
        steps: [
          { text: "Let us take 3 away from 7. First, show 7 — that is the top bead plus two lower beads.", state: abacusFromValue(7, 1), highlightRod: 0 },
          { text: "Now take 3 away. Push two lower beads down — that takes away 2.", state: abacusFromValue(5, 1), highlightRod: 0 },
          { text: "We still need to take away 1 more. Push the top bead up and one lower bead up — that swaps 5 for 4.", state: abacusFromValue(4, 1), highlightRod: 0 },
          { text: "7 minus 3 is 4!", state: abacusFromValue(4, 1), highlightRod: 0 },
        ],
      };
    case 4:
      return {
        level,
        title: "Bigger numbers — many rods",
        steps: [
          { text: "Now we use more rods. The right rod is the ones place. The next rod is the tens place.", state: emptyAbacus(3) },
          { text: "Show the number 23 — push two lower beads up on the tens rod, three on the ones rod.", state: abacusFromValue(23, 3) },
          { text: "Add 14. Add 4 to the ones rod and 1 to the tens rod.", state: abacusFromValue(37, 3) },
          { text: "If a rod gets full, push it back down and add 1 to the next rod — that is called carrying.", state: abacusFromValue(37, 3) },
        ],
      };
    case 5:
      return {
        level,
        title: "Mental math — see it in your head",
        steps: [
          { text: "Now close your eyes and picture the abacus in your mind.", state: emptyAbacus(2) },
          { text: "Imagine pushing 6 beads up. Now add 3 more — what do you see?", state: emptyAbacus(2) },
          { text: "If you ran out of lower beads, picture the top bead going down to make 5.", state: emptyAbacus(2) },
          { text: "The more you practise, the faster the picture forms — that is mental math!", state: emptyAbacus(2) },
        ],
      };
  }
}

// ─── Age helpers ─────────────────────────────────────────────────────────

/** Minimum age (years) at which a child can sensibly start each level. */
export function minAgeForLevel(level: LevelId): number {
  switch (level) {
    case 1:
      return 4;
    case 2:
      return 5;
    case 3:
      return 6;
    case 4:
      return 7;
    case 5:
      return 8;
  }
}

/** True when this child is in the Abacus Zone's eligible age window. */
export function isAbacusEligible(ageYears: number): boolean {
  return ageYears >= 4 && ageYears <= 10;
}

// ─── Server-side AI Tutor prompt builder ────────────────────────────────

export type AbacusLang = "en";

/**
 * Build the system prompt + user message for Amy's AI Tutor mode. Pure
 * function so the API server and any future test harness produce
 * identical prompts.
 */
export function buildAbacusTutorPrompt(input: {
  level: LevelId;
  ageYears: number;
  language: AbacusLang;
  question: string;
}): { system: string; user: string } {
  const def = getLevel(input.level);
  const langLine = "Reply in clear, simple English a child age " + input.ageYears + " can follow.";

  const system = [
    "You are Amy, a warm, patient Indian-style abacus tutor for kids age 4–10.",
    "You teach the soroban: 1 upper bead (worth 5) and 4 lower beads (worth 1) per rod.",
    "Keep answers SHORT — 2 to 4 sentences. Use bead-movement language: 'push 3 lower beads up', 'push 1 upper bead down', 'carry 1 to the next rod'.",
    "Never use jargon. Never give long lectures. Never write code or math symbols other than + − × ÷ =.",
    "Always end with a tiny encouragement like 'try it!' or 'you can do it!'.",
    `Current level: Level ${def.id} (${def.slug}). Operands ${def.operandRange[0]}–${def.operandRange[1]}.`,
    langLine,
  ].join(" ");

  const user = (input.question || "").trim().slice(0, 500);
  return { system, user };
}
