import type { GameDifficulty } from "@/lib/game-difficulty";
import {
  getActiveProgression,
  getActiveSessionPlan,
  microTargetLifeScale,
  microTimerScale,
} from "@/lib/game-adaptive-progression";

/** Standard session length — all round-based mini games ramp across these rounds. */
export const GAME_SESSION_ROUNDS = 8;

/** 0 on first round → 1 on last round (smooth gradual ramp). */
export function sessionProgress(roundIndex: number, totalRounds = GAME_SESSION_ROUNDS): number {
  if (totalRounds <= 1) return 0;
  return Math.min(1, Math.max(0, roundIndex / (totalRounds - 1)));
}

/** Integer value that grows from min → max across the session. */
export function sessionScale(
  roundIndex: number,
  min: number,
  max: number,
  total = GAME_SESSION_ROUNDS,
): number {
  const t = sessionProgress(roundIndex, total);
  return Math.round(min + (max - min) * t);
}

/** Memory / sequence lengths per round — mastery stage sets start/end. */
export function sessionSequenceLengths(
  total = GAME_SESSION_ROUNDS,
  startLen?: number,
  endLen?: number,
): number[] {
  const prog = getActiveProgression();
  const start = startLen ?? prog.sequenceLen[0];
  const end = endLen ?? prog.sequenceLen[1];
  return Array.from({ length: total }, (_, i) => sessionScale(i, start, end, total));
}

export function sessionChoiceCount(
  roundIndex: number,
  min = 4,
  max = 6,
  total = GAME_SESSION_ROUNDS,
): number {
  return sessionScale(roundIndex, min, max, total);
}

/** 3×3 early rounds, 4×4 later rounds. */
export function sessionGridSide(roundIndex: number, total = GAME_SESSION_ROUNDS): number {
  const stage = getActiveSessionPlan()?.contentStage ?? 1;
  if (stage <= 2) return 3;
  return roundIndex < Math.floor(total * 0.45) ? 3 : 4;
}

export function sessionDotCount(roundIndex: number, total = GAME_SESSION_ROUNDS): number {
  const [min, max] = getActiveProgression().dotCount;
  return sessionScale(roundIndex, min, max, total);
}

export function sessionShapeCount(roundIndex: number, total = GAME_SESSION_ROUNDS): number {
  const [min, max] = getActiveProgression().shapeCount;
  return sessionScale(roundIndex, min, max, total);
}

export function sessionOddOneOutItems(roundIndex: number, total = GAME_SESSION_ROUNDS): number {
  const [min, max] = getActiveProgression().oddItems;
  return sessionScale(roundIndex, min, max, total);
}

export function sessionHiddenTargetCount(roundIndex: number, total = GAME_SESSION_ROUNDS): number {
  const stage = getActiveSessionPlan()?.contentStage ?? 1;
  const min = stage <= 2 ? 3 : 3;
  const max = stage >= 4 ? 6 : stage >= 3 ? 5 : 4;
  return sessionScale(roundIndex, min, max, total);
}

export function sessionPatternLength(roundIndex: number, total = GAME_SESSION_ROUNDS): number {
  const [min, max] = getActiveProgression().patternLen;
  return sessionScale(roundIndex, min, max, total);
}

export interface SessionMathRoundConfig {
  perQSeconds: number;
  maxNum: number;
  allowMultiply: boolean;
  allowDivide: boolean;
  preferSubtract: boolean;
  wordProblem: boolean;
}

export function sessionMathConfig(
  roundIndex: number,
  total = GAME_SESSION_ROUNDS,
): SessionMathRoundConfig {
  const t = sessionProgress(roundIndex, total);
  const prog = getActiveProgression();
  const plan = getActiveSessionPlan();
  const timer = microTimerScale(plan?.micro ?? "normal");
  const focus = prog.mathFocus;

  return {
    perQSeconds: Math.max(4, Math.round((12 - t * 7) * timer)),
    maxNum: Math.round(8 + t * (focus === "mul" || focus === "word" ? 12 : 10)),
    allowMultiply: focus === "mul" || focus === "word" || (focus === "sub" && roundIndex >= 5),
    allowDivide: focus === "word" && roundIndex >= Math.floor(total * 0.7),
    preferSubtract: focus === "sub" || focus === "mul" || focus === "word",
    wordProblem: focus === "word" && roundIndex >= Math.floor(total * 0.55),
  };
}

export function sessionMazeSize(
  roundIndex: number,
  difficulty: GameDifficulty = "normal",
  total = GAME_SESSION_ROUNDS,
): number {
  const stage = getActiveSessionPlan()?.contentStage ?? 2;
  const stageBump = Math.max(0, stage - 2);
  switch (difficulty) {
    case "easy":
      return sessionScale(roundIndex, 5, 6 + Math.min(1, stageBump), total);
    case "hard":
      return sessionScale(roundIndex, 9, 12, total);
    default:
      return sessionScale(roundIndex, 7, 8 + Math.min(1, stageBump), total);
  }
}

export function sessionMazeMaxMoves(
  size: number,
  roundIndex: number,
  shortestPath = size * 2,
): number {
  const trap = getActiveProgression().mazeTrapBias;
  const explorationRoom = Math.floor(size * size * (0.4 - trap * 0.15)) + roundIndex * 2;
  return Math.max(shortestPath * 2 + explorationRoom, size * 3);
}

export interface TargetTapWaveConfig {
  spawnMs: number;
  lifeMs: number;
  sizeScale: number;
  distractors: boolean;
}

export function sessionTargetTapWave(
  roundIndex: number,
  total = GAME_SESSION_ROUNDS,
): TargetTapWaveConfig {
  const t = sessionProgress(roundIndex, total);
  const prog = getActiveProgression();
  const plan = getActiveSessionPlan();
  const lifeScale = microTargetLifeScale(plan?.micro ?? "normal");
  return {
    spawnMs: Math.max(450, Math.round((950 - t * 450) * lifeScale)),
    lifeMs: Math.max(800, Math.round((1500 - t * 550) * lifeScale)),
    sizeScale: prog.targetSizeScale,
    distractors: prog.targetDistractors && t > 0.4,
  };
}

export const TARGET_TAP_WAVE_MS = 6000;

/** Whether sequence should ask for reverse order (stage 5 + ages 7–8 only). */
export function sessionSequenceReverse(): boolean {
  const plan = getActiveSessionPlan();
  const prog = getActiveProgression();
  return Boolean(prog.sequenceReverse && plan?.ageBand === "7-8" && (plan.contentStage ?? 1) >= 5);
}

export function sessionCardPairs(): number {
  return getActiveProgression().cardPairs;
}

export function sessionCardRevealDelayMs(): number {
  return getActiveProgression().cardRevealDelayMs;
}

export function sessionPatternMode() {
  return getActiveProgression().patternMode;
}

export function sessionHiddenMode() {
  return getActiveProgression().hiddenMode;
}

export function sessionSpotMode() {
  return getActiveProgression().spotMode;
}
