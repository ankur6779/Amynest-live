import type { AbacusProblem, LevelId } from "./index.js";
import type { LearningDna } from "./learning-dna.js";
import { dnaEaseFactor } from "./learning-dna.js";
import type { AbacusSkillId } from "./mastery.js";
import { skillToLevelHint } from "./spaced-repetition.js";

export type ProblemFactory = (
  level: LevelId,
  rand: () => number,
  options?: { easeFactor?: number },
) => AbacusProblem;

export type RngFactory = (seed: number) => () => number;

/**
 * Unlimited adaptive practice — never repeats the exact same session seed.
 * Inject generateProblem/rng from the caller to avoid circular imports.
 */
export function generateAdaptivePractice(input: {
  level: LevelId;
  dna?: LearningDna | null;
  reviewSkill?: AbacusSkillId | null;
  sessionSalt: number;
  generateProblem: ProblemFactory;
  rng: RngFactory;
}): AbacusProblem {
  const level = input.reviewSkill
    ? skillToLevelHint(input.reviewSkill)
    : input.level;
  const ease = input.dna ? dnaEaseFactor(input.dna) : 1;
  const seed = (Date.now() ^ (input.sessionSalt * 2654435761)) >>> 0;
  return input.generateProblem(level, input.rng(seed), { easeFactor: ease });
}

export function generateAdaptiveBatch(input: {
  level: LevelId;
  dna?: LearningDna | null;
  reviewSkill?: AbacusSkillId | null;
  sessionSalt: number;
  count: number;
  generateProblem: ProblemFactory;
  rng: RngFactory;
}): AbacusProblem[] {
  const out: AbacusProblem[] = [];
  for (let i = 0; i < input.count; i++) {
    out.push(
      generateAdaptivePractice({
        ...input,
        sessionSalt: input.sessionSalt + i * 997,
      }),
    );
  }
  return out;
}
