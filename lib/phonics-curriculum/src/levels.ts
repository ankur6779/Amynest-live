import { CVC_WORDS, BLEND_WORD_IDS, CVCC_WORD_IDS } from "@workspace/phonics-sounds";
import type { CurriculumLevel } from "./types.js";
import { SIGHT_WORDS, WORD_FAMILY_IDS, type WordFamilyId } from "./constants.js";

export { SIGHT_WORDS, WORD_FAMILY_IDS, type WordFamilyId };

export interface CurriculumLevelDef {
  level: CurriculumLevel;
  name: string;
  skills: string[];
  content: string[];
}

const CVC_POOL = CVC_WORDS.map((w) => w.word);
const FLUENCY_SENTENCES = [
  "The cat sat.",
  "I see a dog.",
  "The sun is hot.",
];

/** Representative L2 anchor word per family for L3 practice labels. */
export const WORD_FAMILY_ANCHOR_WORDS: Record<WordFamilyId, string> = {
  at: "cat",
  an: "can",
  og: "dog",
  in: "pin",
  ip: "sip",
};

export function familyIdForAnchorWord(word: string): WordFamilyId | undefined {
  const w = word.trim().toLowerCase();
  for (const id of WORD_FAMILY_IDS) {
    if (WORD_FAMILY_ANCHOR_WORDS[id] === w) return id;
  }
  return undefined;
}

const L3_FAMILY_CONTENT = [
  ...WORD_FAMILY_IDS,
  ...WORD_FAMILY_IDS.map((id) => `pattern:${id}`),
];

/** Seven-stage canonical phonics progression. Level 6 = CVCC (L5B). */
export const PHONICS_CURRICULUM_LEVELS: CurriculumLevelDef[] = [
  {
    level: 1,
    name: "Letter Sounds",
    skills: ["phoneme recognition"],
    content: ["a-z phonics sounds"],
  },
  {
    level: 2,
    name: "CVC Decoding",
    skills: ["blending", "decoding"],
    content: CVC_POOL,
  },
  {
    level: 3,
    name: "Word Families",
    skills: ["rime patterns", "analogy", "family mastery"],
    content: [...L3_FAMILY_CONTENT],
  },
  {
    level: 4,
    name: "Digraphs",
    skills: ["sh", "ch", "th", "wh", "ck", "ng"],
    content: ["ship", "shop", "chat", "chip", "thin", "when", "duck", "ring"],
  },
  {
    level: 5,
    name: "Consonant Blends",
    skills: ["initial blends", "CCVC"],
    content: [...BLEND_WORD_IDS],
  },
  {
    level: 6,
    name: "CVCC",
    skills: ["final blends", "four-letter decode"],
    content: [...CVCC_WORD_IDS],
  },
  {
    level: 7,
    name: "Fluency & Stories",
    skills: ["sight words", "sentence reading", "story fluency"],
    content: [...SIGHT_WORDS, ...FLUENCY_SENTENCES],
  },
];

export const MAX_CURRICULUM_LEVEL = 7 as const;

export function getCurriculumLevelDef(level: CurriculumLevel): CurriculumLevelDef {
  return (
    PHONICS_CURRICULUM_LEVELS.find((l) => l.level === level) ??
    PHONICS_CURRICULUM_LEVELS[0]!
  );
}

export function clampCurriculumLevel(n: number): CurriculumLevel {
  const v = Math.max(1, Math.min(MAX_CURRICULUM_LEVEL, Math.round(n)));
  return v as CurriculumLevel;
}

/** Seed starting level from age in months (fallback when no progress exists). */
export function defaultLevelForAgeMonths(totalMonths: number): CurriculumLevel {
  if (totalMonths < 24) return 1;
  if (totalMonths < 36) return 1;
  if (totalMonths < 48) return 2;
  if (totalMonths < 60) return 3;
  if (totalMonths < 72) return 4;
  return 5;
}
