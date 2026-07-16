/**
 * Visible curriculum content per level — used for snapshot regression tests.
 */
import {
  BLEND_WORD_IDS,
  CVCC_WORD_IDS,
  CVC_WORDS,
} from "@workspace/phonics-sounds";
import {
  isBlendPathwayAvailable,
  isContentUnlocked,
  isDigraphPathwayAvailable,
  isCvccPathwayAvailable,
  SIGHT_WORDS,
} from "./level-gating.js";
import { SATPIN_LETTER_ORDER } from "./letter-groups.js";
import { PHONICS_CURRICULUM_LEVELS, WORD_FAMILY_IDS } from "./levels.js";
import type { CurriculumLevel } from "./types.js";

/** Letters in Synthetic Phonics introduction order (not A–Z). */
const LETTERS = [...SATPIN_LETTER_ORDER];

/** Master symbol universe for visibility snapshots. */
export function getAllCurriculumSymbols(): string[] {
  const l4Words =
    PHONICS_CURRICULUM_LEVELS.find((l) => l.level === 4)?.content ?? [];
  const l7Sentences =
    PHONICS_CURRICULUM_LEVELS.find((l) => l.level === 7)?.content.filter((c) =>
      c.includes(" "),
    ) ?? [];

  return [
    ...LETTERS,
    ...CVC_WORDS.map((w) => w.word),
    ...WORD_FAMILY_IDS,
    ...WORD_FAMILY_IDS.map((id) => `pattern:${id}`),
    ...l4Words,
    ...BLEND_WORD_IDS,
    ...CVCC_WORD_IDS,
    ...SIGHT_WORDS,
    ...l7Sentences,
  ];
}

export interface VisibleContentSnapshot {
  level: CurriculumLevel;
  letters: string[];
  words: string[];
  patterns: string[];
  sentences: string[];
  pathways: {
    wordFamilies: boolean;
    digraphs: boolean;
    blends: boolean;
    cvcc: boolean;
  };
}

/**
 * Symbols unlocked at a curriculum level.
 * L1 snapshots assume letterGroupIndex = full groups for regression of the
 * stage ladder; use getVisibleContentSnapshotForGroup for SATPIN drip tests.
 */
export function getVisibleContentSnapshot(
  level: CurriculumLevel,
  masteryScore = 100,
  letterGroupIndex?: number,
): VisibleContentSnapshot {
  const opts = {
    letterGroupIndex:
      letterGroupIndex ?? (level >= 2 ? 8 : 1),
  };
  const letters = LETTERS.filter((l) =>
    isContentUnlocked(l, level, "letter", opts),
  );
  const words: string[] = [];
  const patterns: string[] = [];
  const sentences: string[] = [];

  for (const sym of getAllCurriculumSymbols()) {
    if (sym.startsWith("pattern:")) {
      if (isContentUnlocked(sym, level, undefined, opts)) patterns.push(sym);
      continue;
    }
    if (sym.includes(" ")) {
      if (isContentUnlocked(sym, level, "sentence", opts)) sentences.push(sym);
      continue;
    }
    if (sym.length === 1) continue;
    if (WORD_FAMILY_IDS.includes(sym as (typeof WORD_FAMILY_IDS)[number])) {
      if (isContentUnlocked(sym, level, undefined, opts)) patterns.push(sym);
      continue;
    }
    if (isContentUnlocked(sym, level, "word", opts)) words.push(sym);
  }

  return {
    level,
    letters: [...letters].sort(),
    words: [...new Set(words)].sort(),
    patterns: [...patterns].sort(),
    sentences: [...sentences].sort(),
    pathways: {
      wordFamilies: level >= 3,
      digraphs: isDigraphPathwayAvailable(level, masteryScore),
      blends: isBlendPathwayAvailable(level, masteryScore),
      cvcc: isCvccPathwayAvailable(level, masteryScore),
    },
  };
}

export function serializeVisibleSnapshot(
  snap: VisibleContentSnapshot,
): string {
  return `${JSON.stringify(snap, null, 2)}\n`;
}
