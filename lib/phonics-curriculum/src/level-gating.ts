/**
 * Curriculum level gating — single source of truth for unlocks and content visibility.
 */
import { CVC_WORDS, BLEND_WORD_IDS, CVCC_WORD_IDS, DIGRAPH_WORD_IDS } from "@workspace/phonics-sounds";
import type { CurriculumLevel } from "./types.js";
import {
  DIGRAPH_IDS,
  SIGHT_WORDS,
  WORD_FAMILY_IDS,
} from "./constants.js";
import {
  clampCurriculumLevel,
  PHONICS_CURRICULUM_LEVELS,
  WORD_FAMILY_ANCHOR_WORDS,
} from "./levels.js";

export { SIGHT_WORDS, DIGRAPH_IDS, WORD_FAMILY_IDS };

export const MASTERY_UNLOCK = {
  digraphPathway: 60,
  digraphStage: 65,
  blendPathway: 55,
  cvccPathway: 55,
} as const;

const CVC_WORD_SET = new Set<string>(CVC_WORDS.map((w) => w.word));
const BLEND_WORD_SET = new Set<string>(BLEND_WORD_IDS);
const CVCC_WORD_SET = new Set<string>(CVCC_WORD_IDS);
const DIGRAPH_WORD_SET = new Set<string>(DIGRAPH_WORD_IDS);
const SIGHT_WORD_SET = new Set<string>(SIGHT_WORDS);
const WORD_FAMILY_ID_SET = new Set<string>(WORD_FAMILY_IDS);

/** Map legacy 6-level saves to 7-level progression (old L6 fluency → L7). */
export function migrateCurriculumLevel(stored: number): CurriculumLevel {
  const n = Math.round(stored);
  if (n <= 0) return 1;
  if (n <= 5) return n as CurriculumLevel;
  if (n === 6) return 7;
  return clampCurriculumLevel(n);
}

export function requiredLevelForSymbol(symbol: string, type?: string): CurriculumLevel {
  if (symbol == null || typeof symbol !== "string") return 1;
  const s = symbol.trim().toLowerCase();
  if (!s) return 1;
  if (type === "sound") return 1;
  if (type === "letter" || (s.length === 1 && s >= "a" && s <= "z")) return 1;
  if (SIGHT_WORD_SET.has(s)) return 7;
  if (s.includes(" ")) return 7;
  if (s.startsWith("pattern:")) return 3;
  if (WORD_FAMILY_ID_SET.has(s)) return 3;
  if (DIGRAPH_WORD_SET.has(s)) return 4;
  if (CVCC_WORD_SET.has(s)) return 6;
  if (BLEND_WORD_SET.has(s)) return 5;
  if (CVC_WORD_SET.has(s)) return 2;
  if (type === "word") return 2;
  if (type === "sentence" || type === "story") return 7;
  return 1;
}

export function isContentUnlocked(
  symbol: string,
  currentLevel: CurriculumLevel,
  type?: string,
): boolean {
  return requiredLevelForSymbol(symbol, type) <= currentLevel;
}

export function isDigraphPathwayAvailable(
  currentLevel: CurriculumLevel,
  avgMasteryScore: number,
): boolean {
  return currentLevel >= 4 && avgMasteryScore >= MASTERY_UNLOCK.digraphPathway;
}

export function isBlendPathwayAvailable(
  currentLevel: CurriculumLevel,
  avgMasteryScore: number,
): boolean {
  return currentLevel >= 5 && avgMasteryScore >= MASTERY_UNLOCK.blendPathway;
}

export function isCvccPathwayAvailable(
  currentLevel: CurriculumLevel,
  avgMasteryScore: number,
): boolean {
  return currentLevel >= 6 && avgMasteryScore >= MASTERY_UNLOCK.cvccPathway;
}

export function getUnlockedDigraphIds(
  currentLevel: CurriculumLevel,
  avgMasteryScore: number,
): string[] {
  if (!isDigraphPathwayAvailable(currentLevel, avgMasteryScore)) return [];
  const thresholds: Record<string, number> = {
    sh: 65,
    ch: 65,
    th: 70,
    wh: 72,
    ck: 68,
    ng: 75,
  };
  return DIGRAPH_IDS.filter((id) => avgMasteryScore >= (thresholds[id] ?? 65));
}

/** Word pool for a curriculum level (plan + assessments). */
export function getLevelWordPool(level: CurriculumLevel): string[] {
  const def = PHONICS_CURRICULUM_LEVELS.find((l) => l.level === level);
  if (!def) return [];
  if (level === 3) {
    return WORD_FAMILY_IDS.map((id) => WORD_FAMILY_ANCHOR_WORDS[id]);
  }
  return def.content
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && !s.includes(" ") && !s.startsWith("pattern:"));
}

export function getAllCvcWords(): string[] {
  return CVC_WORDS.map((w) => w.word);
}

export function filterSymbolsForLevel(
  symbols: string[],
  currentLevel: CurriculumLevel,
): string[] {
  return symbols.filter((s) => isContentUnlocked(s, currentLevel));
}
