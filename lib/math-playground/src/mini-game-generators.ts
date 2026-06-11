import { seededRandom } from "./age-bands";
import type {
  AdaptivityTier,
  MiniGameTemplate,
  PlaygroundAgeBand,
  PuzzlePayload,
  PuzzleTemplate,
} from "./types";

export const MINI_GAME_TEMPLATES: MiniGameTemplate[] = [
  "pop_correct_answer",
  "rocket_counting",
  "balloon_burst",
  "feed_the_monkey",
  "number_train",
  "castle_builder",
];

export function isMiniGameTemplate(template: PuzzleTemplate): template is MiniGameTemplate {
  return (MINI_GAME_TEMPLATES as readonly string[]).includes(template);
}

function randInt(rng: () => number, min: number, max: number): number {
  if (max < min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

function tierCap(ageBand: PlaygroundAgeBand, tier: AdaptivityTier): number {
  const base = ageBand === "2-3" ? 5 : ageBand === "4-5" ? 8 : ageBand === "6-7" ? 10 : 12;
  if (tier === "ease") return Math.max(3, Math.floor(base * 0.6));
  if (tier === "stretch") return base;
  return Math.floor(base * 0.85);
}

function shuffledChoices(rng: () => number, answer: number, cap: number): number[] {
  const pool = new Set<number>([answer]);
  while (pool.size < 3) {
    const delta = randInt(rng, -2, 2);
    const v = Math.max(1, Math.min(cap, answer + delta));
    pool.add(v);
  }
  return [...pool].sort(() => rng() - 0.5);
}

function makeAdditionQuestion(rng: () => number, cap: number): { question: string; answer: number } {
  const a = randInt(rng, 1, Math.max(1, cap - 1));
  const b = randInt(rng, 1, Math.max(1, cap - a));
  return { question: `${a} + ${b} = ?`, answer: a + b };
}

export function generateMiniGame(
  template: MiniGameTemplate,
  ageBand: PlaygroundAgeBand,
  seed: number,
  tier: AdaptivityTier = "standard",
): PuzzlePayload {
  const rng = seededRandom(seed);
  const cap = tierCap(ageBand, tier);

  switch (template) {
    case "pop_correct_answer": {
      const { question, answer } = makeAdditionQuestion(rng, cap);
      const choices = shuffledChoices(rng, answer, cap);
      return {
        template,
        question,
        choices,
        correctIndex: choices.indexOf(answer),
        correctAnswer: answer,
      };
    }
    case "rocket_counting": {
      const fuelTarget = randInt(rng, 2, cap);
      const choices = shuffledChoices(rng, fuelTarget, cap);
      return {
        template,
        question: `Fuel the rocket with ${fuelTarget}!`,
        fuelTarget,
        choices,
        correctAnswer: fuelTarget,
        correctIndex: choices.indexOf(fuelTarget),
      };
    }
    case "balloon_burst": {
      const targetQuantity = randInt(rng, 2, Math.min(5, cap));
      const balloonCount = targetQuantity + randInt(rng, 2, 4);
      const balloons = Array.from({ length: balloonCount }, (_, i) => ({
        id: `b-${seed}-${i}`,
        value: randInt(rng, 1, cap),
      }));
      return { template, targetQuantity, balloons };
    }
    case "feed_the_monkey": {
      const targetBananas = randInt(rng, 2, Math.min(6, cap));
      return {
        template,
        question: `Feed the monkey ${targetBananas} bananas!`,
        targetBananas,
      };
    }
    case "number_train": {
      const step = tier === "ease" ? 1 : randInt(rng, 1, 3);
      const maxStart = Math.max(1, cap - step * 4);
      const start = randInt(rng, 1, Math.max(1, maxStart));
      const seq: (number | null)[] = [
        start,
        start + step,
        start + step * 2,
        null,
        start + step * 4,
      ];
      const correct = Math.min(start + step * 3, cap);
      const choices = shuffledChoices(rng, correct, cap);
      return {
        template,
        trainSequence: seq,
        trainChoices: choices,
        correctAnswer: correct,
      };
    }
    case "castle_builder": {
      const piecesTotal = tier === "ease" ? 2 : 3;
      const rounds = Array.from({ length: piecesTotal }, (_, i) => {
        const roundRng = seededRandom(seed + i * 31);
        const { question, answer } = makeAdditionQuestion(roundRng, cap);
        return { question, answer, choices: shuffledChoices(roundRng, answer, cap) };
      });
      return {
        template,
        castlePiecesTotal: piecesTotal,
        castleRounds: rounds,
      };
    }
    default:
      return generateMiniGame("pop_correct_answer", ageBand, seed, tier);
  }
}
