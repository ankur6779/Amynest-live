import {
  AGE_LIMITS,
  ageYearsToBand,
  dailySeed,
  isActivityUnlocked,
  seededRandom,
} from "./age-bands";
import {
  deriveAdaptivityTier,
  pickDailyTaskIds,
} from "./adaptive";
import {
  generateMiniGame,
  isMiniGameTemplate,
  MINI_GAME_TEMPLATES,
} from "./mini-game-generators";
import type {
  ActivityParams,
  CountingPayload,
  AdditionPayload,
  SubtractionPayload,
  MultiplicationPayload,
  DivisionPayload,
  PatternPayload,
  PuzzlePayload,
  DailyPayload,
  ObjectKind,
  PlaygroundActivityId,
  PlaygroundAgeBand,
  PlaygroundObjectSpec,
  PuzzleTemplate,
  AdaptivityTier,
  PlaygroundLearningState,
} from "./types";

const OBJECT_KINDS: ObjectKind[] = ["apple", "star", "flower", "block", "toy", "cookie"];

function pickKind(rng: () => number): ObjectKind {
  return OBJECT_KINDS[Math.floor(rng() * OBJECT_KINDS.length)] ?? "apple";
}

function scatterObjects(
  count: number,
  kind: ObjectKind,
  seed: number,
): PlaygroundObjectSpec[] {
  const rng = seededRandom(seed);
  const objects: PlaygroundObjectSpec[] = [];
  for (let i = 0; i < count; i++) {
    objects.push({
      id: `obj-${seed}-${i}`,
      kind,
      x: 12 + rng() * 76,
      y: 18 + rng() * 58,
    });
  }
  return objects;
}

function randInt(rng: () => number, min: number, max: number): number {
  if (max < min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

function tierRange(min: number, max: number, tier: AdaptivityTier): [number, number] {
  if (min >= max) return [min, max];
  const span = max - min;
  switch (tier) {
    case "ease":
      return [min, min + Math.max(0, Math.floor(span * 0.5))];
    case "stretch":
      return [min + Math.floor(span * 0.35), max];
    default:
      return [min, max];
  }
}

function tierRandInt(
  rng: () => number,
  min: number,
  max: number,
  tier: AdaptivityTier,
): number {
  const [lo, hi] = tierRange(min, max, tier);
  return randInt(rng, lo, hi);
}

export function generateCounting(
  ageBand: PlaygroundAgeBand,
  seed: number,
  tier: AdaptivityTier = "standard",
): CountingPayload {
  const limits = AGE_LIMITS[ageBand];
  const rng = seededRandom(seed);
  const targetCount = tierRandInt(rng, limits.countMin, limits.countMax, tier);
  const objectKind = pickKind(rng);
  return {
    targetCount,
    objectKind,
    objects: scatterObjects(targetCount, objectKind, seed + 1),
  };
}

export function generateAddition(
  ageBand: PlaygroundAgeBand,
  seed: number,
  tier: AdaptivityTier = "standard",
): AdditionPayload {
  const limits = AGE_LIMITS[ageBand];
  const rng = seededRandom(seed);
  const max = Math.max(2, limits.addMax);
  const augend = tierRandInt(rng, 1, max, tier);
  const addend = tierRandInt(rng, 1, Math.max(1, max - augend + 1), tier);
  return { augend, addend, objectKind: pickKind(rng) };
}

export function generateSubtraction(
  ageBand: PlaygroundAgeBand,
  seed: number,
  tier: AdaptivityTier = "standard",
): SubtractionPayload {
  const limits = AGE_LIMITS[ageBand];
  const rng = seededRandom(seed);
  const max = Math.max(3, limits.subMax);
  const minuend = tierRandInt(rng, 3, max, tier);
  const subtrahend = tierRandInt(rng, 1, minuend - 1, tier);
  return { minuend, subtrahend, objectKind: "flower" };
}

export function generateMultiplication(
  ageBand: PlaygroundAgeBand,
  seed: number,
  tier: AdaptivityTier = "standard",
): MultiplicationPayload {
  const limits = AGE_LIMITS[ageBand];
  const rng = seededRandom(seed);
  const groups = tierRandInt(rng, 2, Math.max(2, limits.mulGroupsMax), tier);
  const perGroup = tierRandInt(rng, 2, Math.max(2, limits.mulPerGroupMax), tier);
  return { groups, perGroup, objectKind: "toy" };
}

export function generateDivision(
  ageBand: PlaygroundAgeBand,
  seed: number,
  tier: AdaptivityTier = "standard",
): DivisionPayload {
  const limits = AGE_LIMITS[ageBand];
  const rng = seededRandom(seed);
  const recipients = tierRandInt(rng, 2, Math.max(2, limits.divRecipientsMax), tier);
  const perChild = tierRandInt(
    rng,
    2,
    Math.max(2, Math.floor(limits.divTotalMax / recipients)),
    tier,
  );
  const total = recipients * perChild;
  return { total, recipients, objectKind: "cookie" };
}

export function generatePattern(
  ageBand: PlaygroundAgeBand,
  seed: number,
  tier: AdaptivityTier = "standard",
): PatternPayload {
  const rng = seededRandom(seed);
  const stepMax = ageBand === "7-8" ? 5 : 3;
  const step = tier === "ease" ? 2 : tierRandInt(rng, 2, stepMax, tier);
  const start = tierRandInt(rng, 1, tier === "stretch" ? 6 : 4, tier);
  const seq = [start, start + step, start + step * 2, null] as (number | null)[];
  const correct = start + step * 3;
  const wrong1 = correct + step;
  const wrong2 = Math.max(1, correct - step);
  const choices = [correct, wrong1, wrong2].sort(() => rng() - 0.5);
  return {
    sequence: seq,
    choices,
    correctChoice: correct,
    stepLabel: `+${step}`,
  };
}

const PUZZLE_TEMPLATES: PuzzleTemplate[] = [
  "bigger_number",
  "match_quantity",
  "sort_ascending",
];

export interface GeneratePuzzleOptions {
  enableMiniGames?: boolean;
}

export function generatePuzzle(
  ageBand: PlaygroundAgeBand,
  seed: number,
  tier: AdaptivityTier = "standard",
  opts?: GeneratePuzzleOptions,
): PuzzlePayload {
  const rng = seededRandom(seed);
  const pool: PuzzleTemplate[] = opts?.enableMiniGames
    ? [...PUZZLE_TEMPLATES, ...MINI_GAME_TEMPLATES]
    : [...PUZZLE_TEMPLATES];
  const template = pool[Math.floor(rng() * pool.length)]!;
  const cap = ageBand === "2-3" ? 5 : tier === "stretch" ? 10 : 8;

  if (isMiniGameTemplate(template)) {
    return generateMiniGame(template, ageBand, seed + 7, tier);
  }

  if (template === "bigger_number") {
    const left = tierRandInt(rng, 2, cap, tier);
    let right = tierRandInt(rng, 2, cap, tier);
    while (right === left) right = tierRandInt(rng, 2, cap, tier);
    return { template, leftValue: left, rightValue: right };
  }

  if (template === "match_quantity") {
    const target = tierRandInt(rng, 2, cap, tier);
    return { template, targetNumeral: target, targetCount: target };
  }

  const sortCap = tier === "ease" ? 8 : 15;
  const nums = [
    tierRandInt(rng, 1, 5, tier),
    tierRandInt(rng, 6, Math.min(10, sortCap), tier),
    tierRandInt(rng, 11, sortCap, tier),
  ].sort((a, b) => a - b);
  return { template: "sort_ascending", sortNumbers: nums.sort(() => rng() - 0.5) };
}

export function generateActivity(opts: {
  activityId: PlaygroundActivityId;
  ageYears: number;
  childId: number;
  seed?: number;
  learning?: PlaygroundLearningState;
  adaptivityTier?: AdaptivityTier;
  enableMiniGames?: boolean;
}): ActivityParams {
  const ageBand = ageYearsToBand(opts.ageYears);
  const seed = opts.seed ?? dailySeed(opts.childId) + opts.activityId.length;
  const id = `${opts.activityId}-${seed}`;
  const learning = opts.learning;
  const tier =
    opts.adaptivityTier ??
    (learning && opts.activityId !== "daily_challenge"
      ? deriveAdaptivityTier(opts.activityId, learning)
      : "standard");

  const wrap = (payload: ActivityParams["payload"]): ActivityParams => ({
    id,
    activityId: opts.activityId,
    seed,
    ageBand,
    payload,
    adaptivityTier: tier,
  });

  switch (opts.activityId) {
    case "counting_adventure":
      return wrap(generateCounting(ageBand, seed, tier));
    case "addition_lab":
      return wrap(generateAddition(ageBand, seed, tier));
    case "subtraction_garden":
      return wrap(generateSubtraction(ageBand, seed, tier));
    case "multiplication_factory":
      return wrap(generateMultiplication(ageBand, seed, tier));
    case "division_bakery":
      return wrap(generateDivision(ageBand, seed, tier));
    case "number_patterns":
      return wrap(generatePattern(ageBand, seed, tier));
    case "math_puzzles":
      return wrap(
        generatePuzzle(ageBand, seed, tier, { enableMiniGames: opts.enableMiniGames }),
      );
    case "daily_challenge": {
      const base = dailySeed(opts.childId);
      const kinds = learning
        ? pickDailyTaskIds(learning, opts.ageYears, 4)
        : pickDailyTaskIds({ sessionHistory: [], activityStats: {} }, opts.ageYears, 4);
      const tasks = kinds.map((kind, i) =>
        generateActivity({
          activityId: kind,
          ageYears: opts.ageYears,
          childId: opts.childId,
          seed: base + i * 997,
          learning,
        }),
      );
      return {
        id,
        activityId: "daily_challenge",
        seed,
        ageBand,
        payload: { tasks, timeLimitSec: 60 } satisfies DailyPayload,
        adaptivityTier: "standard",
      };
    }
    default:
      return generateActivity({
        activityId: "counting_adventure",
        ageYears: opts.ageYears,
        childId: opts.childId,
        seed,
        learning,
      });
  }
}

export const ACTIVITY_CARDS = [
  { id: "counting_adventure" as const, emoji: "🟢", titleKey: "counting_adventure", color: "hsl(var(--brand-green-400))", minAgeYears: 2 },
  { id: "addition_lab" as const, emoji: "➕", titleKey: "addition_lab", color: "hsl(var(--brand-cyan-400))", minAgeYears: 4 },
  { id: "subtraction_garden" as const, emoji: "➖", titleKey: "subtraction_garden", color: "hsl(var(--brand-pink-400))", minAgeYears: 4 },
  { id: "multiplication_factory" as const, emoji: "✖", titleKey: "multiplication_factory", color: "hsl(var(--brand-indigo-500))", minAgeYears: 6 },
  { id: "division_bakery" as const, emoji: "➗", titleKey: "division_bakery", color: "hsl(var(--brand-orange-400))", minAgeYears: 7 },
  { id: "number_patterns" as const, emoji: "🔢", titleKey: "number_patterns", color: "hsl(var(--brand-violet-500))", minAgeYears: 6 },
  { id: "math_puzzles" as const, emoji: "🧩", titleKey: "math_puzzles", color: "hsl(var(--brand-teal-400))", minAgeYears: 2 },
  { id: "daily_challenge" as const, emoji: "🏆", titleKey: "daily_challenge", color: "hsl(var(--brand-amber-300))", minAgeYears: 2 },
] as const;

/** Activities eligible for daily challenge at a given age. */
export function dailyTaskPool(ageYears: number): PlaygroundActivityId[] {
  return ACTIVITY_CARDS.map((c) => c.id).filter(
    (id) => id !== "daily_challenge" && isActivityUnlocked(id, ageYears),
  );
}
