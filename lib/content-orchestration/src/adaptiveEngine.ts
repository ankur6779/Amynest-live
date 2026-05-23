import type { DifficultyLevel, ModuleId } from "./types.js";
import type {
  AdaptiveDifficultyResult,
  LearningProfile,
  LearningProfileAdaptability,
} from "./types-v2.js";
import { moduleToSkill } from "./learningProfileEngine.js";

const LEVEL_TO_DIFFICULTY: Record<number, DifficultyLevel> = {
  1: "easy",
  2: "easy",
  3: "medium",
  4: "hard",
  5: "hard",
};

function levelWithVariance(level: number, seed: number): number {
  const variance = ((seed % 7) - 3) / 10;
  return Math.max(1, Math.min(5, level + variance));
}

export function difficultyFromLevel(level: number): DifficultyLevel {
  const rounded = Math.max(1, Math.min(5, Math.round(level)));
  return LEVEL_TO_DIFFICULTY[rounded] ?? "medium";
}

export function computeTargetDifficulty(
  profile: LearningProfile,
  moduleId: ModuleId,
  seed: number,
  injectHarderRate = 0.15,
): AdaptiveDifficultyResult {
  const skill = profile.skills[moduleToSkill(moduleId)];
  const adapt: LearningProfileAdaptability = profile.adaptability;

  const toleranceBoost = (adapt.difficultyTolerance - 0.5) * 0.8;
  const adjustedLevel = levelWithVariance(
    skill.level + toleranceBoost,
    seed,
  );

  const injectHarder = seed % 100 < injectHarderRate * 100;
  let targetLevel = adjustedLevel;
  if (injectHarder) {
    targetLevel = Math.min(5, adjustedLevel + 0.6);
  }

  const confidenceAdjusted = Math.min(
    1,
    Math.max(0, skill.confidence * (0.85 + adapt.difficultyTolerance * 0.3)),
  );

  return {
    targetDifficulty: difficultyFromLevel(targetLevel),
    targetLevel,
    confidenceAdjusted,
    injectHarder,
  };
}

export function difficultyFitScore(
  itemDifficulty: DifficultyLevel,
  target: DifficultyLevel,
): number {
  const order = { easy: 0, medium: 1, hard: 2 };
  const diff = Math.abs(order[itemDifficulty] - order[target]);
  if (diff === 0) return 1;
  if (diff === 1) return 0.55;
  return 0.2;
}

export type RealTimeAdjustmentInput = {
  responseTimeMs?: number;
  skips?: number;
  accuracy?: number;
  direction?: "up" | "down";
  delta?: number;
};

/**
 * Micro-adaptive layer: liveDifficulty = baseDifficulty + realTimeAdjustments
 */
export function computeRealTimeAdjustments(
  input: RealTimeAdjustmentInput,
): number {
  let adj = 0;
  if (input.direction === "down") adj -= input.delta ?? 0.5;
  if (input.direction === "up") adj += input.delta ?? 0.35;

  if (input.skips !== undefined && input.skips >= 2) adj -= 0.4;
  if (input.accuracy !== undefined) {
    adj += (input.accuracy - 0.5) * 0.6;
  }
  if (input.responseTimeMs !== undefined) {
    if (input.responseTimeMs < 1500) adj += 0.25;
    else if (input.responseTimeMs > 8000) adj -= 0.2;
  }
  return Math.max(-1.5, Math.min(1.5, adj));
}

export function computeLiveDifficulty(
  baseLevel: number,
  baseDifficulty: DifficultyLevel,
  adjustments: number,
): { liveLevel: number; liveDifficulty: DifficultyLevel } {
  const liveLevel = Math.max(1, Math.min(5, baseLevel + adjustments));
  return {
    liveLevel,
    liveDifficulty: difficultyFromLevel(liveLevel),
  };
}

export function applyLiveDifficultyAdjustment(
  state: { baseLevel: number; baseDifficulty: DifficultyLevel; adjustments: number },
  input: RealTimeAdjustmentInput,
): { liveLevel: number; liveDifficulty: DifficultyLevel; adjustments: number } {
  const delta = computeRealTimeAdjustments(input);
  const adjustments = Math.max(-1.5, Math.min(1.5, state.adjustments + delta));
  const { liveLevel, liveDifficulty } = computeLiveDifficulty(
    state.baseLevel,
    state.baseDifficulty,
    adjustments,
  );
  return { liveLevel, liveDifficulty, adjustments };
}
