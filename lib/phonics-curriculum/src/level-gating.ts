/**
 * Curriculum level gating — single source of truth for unlocks and content visibility.
 * Letter introduction follows SATPIN-style groups (not A–Z).
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
import {
  clampLetterGroupIndex,
  getUnlockedGraphemes,
  getUnlockedGroupWords,
  MAX_LETTER_GROUP,
  wordDecodableWithGraphemes,
  type LetterGroupId,
} from "./letter-groups.js";

export { SIGHT_WORDS, DIGRAPH_IDS, WORD_FAMILY_IDS };

/** Words introduced via SATPIN groups (L1 ownership); other CVC remain L2. */
const EARLY_GROUP_WORD_SET = new Set(getUnlockedGroupWords(7));

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

export type UnlockOptions = {
  /**
   * Highest SATPIN letter group unlocked (1–8).
   * At curriculum L1, letters/CVC are gated by this group.
   * At L2+, all letter groups are treated as unlocked.
   */
  letterGroupIndex?: number;
};

/** Resolve effective unlocked grapheme set for a child. */
export function resolveUnlockedGraphemes(
  currentLevel: CurriculumLevel,
  letterGroupIndex?: number,
): Set<string> {
  if (currentLevel >= 2) {
    return getUnlockedGraphemes(MAX_LETTER_GROUP);
  }
  const idx = clampLetterGroupIndex(letterGroupIndex ?? 1);
  return getUnlockedGraphemes(idx);
}

/** Map legacy 6-level saves to 7-level progression (old L6 fluency → L7). */
export function migrateCurriculumLevel(stored: number): CurriculumLevel {
  const n = Math.round(stored);
  if (n <= 0) return 1;
  if (n <= 5) return n as CurriculumLevel;
  if (n === 6) return 7;
  return clampCurriculumLevel(n);
}

/**
 * Migrate / normalize letter-group index for existing users.
 * L2+ children keep full alphabet access (all groups).
 */
export function migrateLetterGroupIndex(
  stored: number | null | undefined,
  currentLevel: CurriculumLevel,
): LetterGroupId {
  if (currentLevel >= 2) return MAX_LETTER_GROUP;
  if (stored == null || !Number.isFinite(stored)) return 1;
  return clampLetterGroupIndex(stored);
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
  // SATPIN group banks (incl. early ck words like duck) before digraph catalog.
  if (EARLY_GROUP_WORD_SET.has(s)) return 1;
  if (DIGRAPH_WORD_SET.has(s)) return 4;
  if (CVCC_WORD_SET.has(s)) return 6;
  if (BLEND_WORD_SET.has(s)) return 5;
  // Remaining CVC decoding owned by L2.
  if (CVC_WORD_SET.has(s)) return 2;
  if (type === "word") return 2;
  if (type === "sentence" || type === "story") return 7;
  return 1;
}

export function isContentUnlocked(
  symbol: string,
  currentLevel: CurriculumLevel,
  type?: string,
  opts?: UnlockOptions,
): boolean {
  const s = (symbol ?? "").trim().toLowerCase();
  if (!s) return true;

  const graphemes = resolveUnlockedGraphemes(currentLevel, opts?.letterGroupIndex);
  const groupIdx =
    currentLevel >= 2 ? MAX_LETTER_GROUP : (opts?.letterGroupIndex ?? 1);
  const groupWords = new Set(getUnlockedGroupWords(groupIdx));

  // Letters: only those in unlocked SATPIN groups (L1). L2+ = all.
  if (type === "letter" || (s.length === 1 && s >= "a" && s <= "z")) {
    if (currentLevel >= 2) return true;
    return graphemes.has(s);
  }

  // SATPIN group word banks unlock as soon as the group is reached (L1+),
  // even if the same word also appears in the L4 digraph catalog (e.g. duck).
  if (groupWords.has(s) && currentLevel >= 1) {
    return true;
  }

  if (requiredLevelForSymbol(symbol, type) > currentLevel) return false;

  // Other CVC / short words: must be decodable with unlocked graphemes at L1.
  if (CVC_WORD_SET.has(s) || (type === "word" && /^[a-z]{2,4}$/.test(s))) {
    if (currentLevel >= 2) return true;
    return wordDecodableWithGraphemes(s, graphemes);
  }

  return true;
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
export function getLevelWordPool(
  level: CurriculumLevel,
  opts?: UnlockOptions,
): string[] {
  if (level === 1) {
    const groupIdx = opts?.letterGroupIndex ?? 1;
    const letters = [...resolveUnlockedGraphemes(level, groupIdx)].filter(
      (g) => g.length === 1 && g >= "a" && g <= "z",
    );
    const words = getUnlockedGroupWords(groupIdx);
    return [...letters, ...words];
  }
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
  opts?: UnlockOptions,
): string[] {
  return symbols.filter((s) => isContentUnlocked(s, currentLevel, undefined, opts));
}
