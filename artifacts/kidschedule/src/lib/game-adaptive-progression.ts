/**
 * Phase 7.5 — Adaptive micro-difficulty + per-game content progression.
 * Child UI still shows only Easy / Normal / Hard.
 */
import type { GameDifficulty } from "@/lib/game-difficulty";
import { getGameDifficulty, setGameDifficulty } from "@/lib/game-difficulty";
import type { AgeBand } from "@/lib/game-learning";
import {
  ageBandFromMonths,
  ageDefaultStage,
  getGameMastery,
  getMasteryStage,
  type MasteryStageId,
} from "@/lib/game-mastery";

export type MicroDifficulty =
  | "easy-"
  | "easy"
  | "easy+"
  | "normal-"
  | "normal"
  | "normal+"
  | "hard-"
  | "hard"
  | "hard+";

const MICRO_ORDER: MicroDifficulty[] = [
  "easy-",
  "easy",
  "easy+",
  "normal-",
  "normal",
  "normal+",
  "hard-",
  "hard",
  "hard+",
];

const PLAN_KEY = "amynest_game_session_plan_v1";

export interface GameSessionPlan {
  gameId: string;
  ageBand: AgeBand;
  /** Content progression stage (1–5). */
  contentStage: MasteryStageId;
  micro: MicroDifficulty;
  /** What the child sees in the difficulty control. */
  uiDifficulty: GameDifficulty;
  preparedAt: number;
}

export type PatternMode = "ab" | "aba" | "abb" | "abbc" | "dual";
export type HiddenMode = "list" | "silhouette" | "memory";
export type SpotMode = "obvious" | "subtle" | "camouflage";
export type MathFocus = "add" | "sub" | "mul" | "word";

export interface GameProgressionTable {
  patternMode: PatternMode;
  patternLen: [number, number];
  oddItems: [number, number];
  cardPairs: number;
  cardRevealDelayMs: number;
  sequenceLen: [number, number];
  sequenceReverse: boolean;
  dotCount: [number, number];
  placeValue: boolean;
  mathFocus: MathFocus;
  targetSizeScale: number;
  targetDistractors: boolean;
  mazeTrapBias: number;
  mazeBestPathHint: boolean;
  spotMode: SpotMode;
  hiddenMode: HiddenMode;
  behaviorMultiStep: boolean;
  shapeCount: [number, number];
  fillComplexity: number;
}

const STAGE_TABLES: Record<MasteryStageId, GameProgressionTable> = {
  1: {
    patternMode: "ab",
    patternLen: [4, 7],
    oddItems: [4, 4],
    cardPairs: 3,
    cardRevealDelayMs: 0,
    sequenceLen: [2, 4],
    sequenceReverse: false,
    dotCount: [1, 5],
    placeValue: false,
    mathFocus: "add",
    targetSizeScale: 1.25,
    targetDistractors: false,
    mazeTrapBias: 0,
    mazeBestPathHint: false,
    spotMode: "obvious",
    hiddenMode: "list",
    behaviorMultiStep: false,
    shapeCount: [3, 4],
    fillComplexity: 0.35,
  },
  2: {
    patternMode: "aba",
    patternLen: [5, 8],
    oddItems: [4, 5],
    cardPairs: 4,
    cardRevealDelayMs: 0,
    sequenceLen: [3, 5],
    sequenceReverse: false,
    dotCount: [2, 8],
    placeValue: false,
    mathFocus: "add",
    targetSizeScale: 1.1,
    targetDistractors: false,
    mazeTrapBias: 0.1,
    mazeBestPathHint: false,
    spotMode: "obvious",
    hiddenMode: "list",
    behaviorMultiStep: false,
    shapeCount: [3, 5],
    fillComplexity: 0.5,
  },
  3: {
    patternMode: "abb",
    patternLen: [6, 10],
    oddItems: [5, 5],
    cardPairs: 6,
    cardRevealDelayMs: 200,
    sequenceLen: [3, 6],
    sequenceReverse: false,
    dotCount: [3, 10],
    placeValue: false,
    mathFocus: "sub",
    targetSizeScale: 1,
    targetDistractors: false,
    mazeTrapBias: 0.2,
    mazeBestPathHint: false,
    spotMode: "subtle",
    hiddenMode: "silhouette",
    behaviorMultiStep: true,
    shapeCount: [4, 5],
    fillComplexity: 0.65,
  },
  4: {
    patternMode: "abbc",
    patternLen: [7, 11],
    oddItems: [5, 6],
    cardPairs: 8,
    cardRevealDelayMs: 400,
    sequenceLen: [4, 7],
    sequenceReverse: false,
    dotCount: [4, 12],
    placeValue: true,
    mathFocus: "mul",
    targetSizeScale: 0.9,
    targetDistractors: true,
    mazeTrapBias: 0.35,
    mazeBestPathHint: true,
    spotMode: "subtle",
    hiddenMode: "silhouette",
    behaviorMultiStep: true,
    shapeCount: [4, 6],
    fillComplexity: 0.8,
  },
  5: {
    patternMode: "dual",
    patternLen: [8, 12],
    oddItems: [6, 6],
    cardPairs: 8,
    cardRevealDelayMs: 600,
    sequenceLen: [4, 8],
    sequenceReverse: true,
    dotCount: [5, 12],
    placeValue: true,
    mathFocus: "word",
    targetSizeScale: 0.85,
    targetDistractors: true,
    mazeTrapBias: 0.45,
    mazeBestPathHint: true,
    spotMode: "camouflage",
    hiddenMode: "memory",
    behaviorMultiStep: true,
    shapeCount: [5, 6],
    fillComplexity: 1,
  },
};

let memoryPlan: GameSessionPlan | null = null;

function microIndex(m: MicroDifficulty): number {
  return MICRO_ORDER.indexOf(m);
}

function clampMicro(m: MicroDifficulty, band: AgeBand): MicroDifficulty {
  const max: MicroDifficulty =
    band === "3-4" ? "easy+" : band === "5-6" ? "normal+" : "hard+";
  const min: MicroDifficulty = band === "3-4" ? "easy-" : "easy-";
  const i = Math.max(microIndex(min), Math.min(microIndex(max), microIndex(m)));
  return MICRO_ORDER[i] ?? "easy";
}

export function microToUi(micro: MicroDifficulty): GameDifficulty {
  if (micro.startsWith("easy")) return "easy";
  if (micro.startsWith("hard")) return "hard";
  return "normal";
}

export function uiToMicroCenter(ui: GameDifficulty): MicroDifficulty {
  if (ui === "easy") return "easy";
  if (ui === "hard") return "hard";
  return "normal";
}

function ageDefaultMicro(band: AgeBand): MicroDifficulty {
  if (band === "3-4") return "easy-";
  if (band === "5-6") return "easy";
  return "normal";
}

function nudgeMicro(current: MicroDifficulty, delta: number, band: AgeBand): MicroDifficulty {
  const next = MICRO_ORDER[microIndex(current) + delta] ?? current;
  return clampMicro(next, band);
}

/** Choose micro from recent mastery samples — gradual, no spikes. */
export function resolveMicroDifficulty(
  gameId: string,
  ageBand: AgeBand,
  parentUi?: GameDifficulty,
): MicroDifficulty {
  // Parent Easy/Normal/Hard is respected as the band centre for this session.
  if (parentUi) {
    return clampMicro(uiToMicroCenter(parentUi), ageBand);
  }

  const rec = getGameMastery(gameId);
  let micro = ageDefaultMicro(ageBand);
  const recent = rec.samples.slice(-3);
  if (recent.length === 0) return micro;

  const avg = recent.reduce((s, x) => s + x.accuracy, 0) / recent.length;
  const calm = recent.filter((x) => x.calm).length >= Math.ceil(recent.length * 0.66);
  const frustrated = recent.filter((x) => !x.calm || x.accuracy < 0.35).length >= 2;

  if (frustrated) micro = nudgeMicro(micro, -2, ageBand);
  else if (avg >= 0.85 && calm) micro = nudgeMicro(micro, +1, ageBand);
  else if (avg >= 0.7 && calm) micro = nudgeMicro(micro, 0, ageBand);
  else if (avg < 0.5) micro = nudgeMicro(micro, -1, ageBand);

  return clampMicro(micro, ageBand);
}

export function resolveContentStage(
  gameId: string,
  ageBand: AgeBand,
): MasteryStageId {
  const masteryStage = getMasteryStage(gameId).id;
  const ageFloor = ageDefaultStage(ageBand);
  const sessions = getGameMastery(gameId).samples.length;
  // First two sessions: gently use age-appropriate content floor
  if (sessions < 2) {
    return Math.max(masteryStage, ageFloor) as MasteryStageId;
  }
  // Never jump content more than one stage above mastery
  return Math.min(masteryStage, (masteryStage + 1) as MasteryStageId) as MasteryStageId;
}

export function getProgressionTable(stage: MasteryStageId): GameProgressionTable {
  return STAGE_TABLES[stage] ?? STAGE_TABLES[1];
}

export function prepareGameSession(
  gameId: string,
  ageMonths: number | null | undefined,
  opts?: { respectParentDifficulty?: boolean },
): GameSessionPlan {
  const ageBand = ageBandFromMonths(ageMonths);
  const parentUi = opts?.respectParentDifficulty === false ? undefined : getGameDifficulty();
  const micro = resolveMicroDifficulty(gameId, ageBand, parentUi);
  const uiDifficulty = microToUi(micro);
  const contentStage = resolveContentStage(gameId, ageBand);

  // Sync child-visible control to adaptive UI band (no Hard forced on 3–4).
  if (ageBand === "3-4" && uiDifficulty !== "easy") {
    setGameDifficulty("easy");
  } else {
    setGameDifficulty(uiDifficulty);
  }

  const plan: GameSessionPlan = {
    gameId,
    ageBand,
    contentStage,
    micro: ageBand === "3-4" ? clampMicro(micro, "3-4") : micro,
    uiDifficulty: ageBand === "3-4" ? "easy" : uiDifficulty,
    preparedAt: Date.now(),
  };
  memoryPlan = plan;
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {
    /* ignore */
  }
  return plan;
}

export function getActiveSessionPlan(): GameSessionPlan | null {
  if (memoryPlan) return memoryPlan;
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as GameSessionPlan;
    if (p?.gameId && p.contentStage) {
      memoryPlan = p;
      return p;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function getActiveProgression(gameId?: string): GameProgressionTable {
  const plan = getActiveSessionPlan();
  if (plan && (!gameId || plan.gameId === gameId)) {
    return getProgressionTable(plan.contentStage);
  }
  return getProgressionTable(1);
}

export function getActiveAgeBand(): AgeBand {
  return getActiveSessionPlan()?.ageBand ?? "5-6";
}

export function microFlashScale(micro: MicroDifficulty): number {
  // >1 = slower flashes (easier)
  switch (micro) {
    case "easy-":
      return 1.25;
    case "easy":
      return 1.15;
    case "easy+":
      return 1.05;
    case "normal-":
      return 1.05;
    case "normal":
      return 1;
    case "normal+":
      return 0.95;
    case "hard-":
      return 0.92;
    case "hard":
      return 0.88;
    case "hard+":
      return 0.82;
    default:
      return 1;
  }
}

export function microTimerScale(micro: MicroDifficulty): number {
  // >1 = more time
  return microFlashScale(micro);
}

export function microTargetLifeScale(micro: MicroDifficulty): number {
  return microFlashScale(micro);
}
