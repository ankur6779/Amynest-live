import type { DifficultyLevel } from "../types.js";
import type { SkillKey } from "../types-v2.js";
import type { GlobalGraph } from "./types-global.js";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Global difficulty score 0–1 (higher = concept is harder for population).
 */
export function difficultyScore(
  skill: SkillKey,
  graph: GlobalGraph,
  opts?: { avgAttempts?: number; dropOffRate?: number },
): number {
  const success = graph.successRates[skill] ?? 0.65;
  const base = graph.difficultyLevels[skill];
  if (base !== undefined) return base;

  const attempts = opts?.avgAttempts ?? 2;
  const drop = opts?.dropOffRate ?? 0.15;
  return clamp01((1 - success) * 0.5 + clamp01(attempts / 5) * 0.3 + drop * 0.2);
}

export function calibratedDifficultyForChild(
  personalLevel: DifficultyLevel,
  globalScore: number,
  personalWeight = 0.85,
): DifficultyLevel {
  const order: DifficultyLevel[] = ["easy", "medium", "hard"];
  const personalIdx = order.indexOf(personalLevel);
  const globalIdx = globalScore < 0.35 ? 0 : globalScore > 0.65 ? 2 : 1;
  const blended = personalIdx * personalWeight + globalIdx * (1 - personalWeight);
  if (blended < 0.45) return "easy";
  if (blended > 1.55) return "hard";
  return "medium";
}

export function buildDifficultyCalibrationMap(
  graph: GlobalGraph,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const skill of graph.skills) {
    out[skill] = difficultyScore(skill, graph);
  }
  return out;
}
