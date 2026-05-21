import type { CurriculumLevel } from "./types.js";

export interface CurriculumLevelDef {
  level: CurriculumLevel;
  name: string;
  skills: string[];
  content: string[];
}

/** Six-stage phonics curriculum (maps to game types + content pools). */
export const PHONICS_CURRICULUM_LEVELS: CurriculumLevelDef[] = [
  {
    level: 1,
    name: "Letter Sounds",
    skills: ["phoneme recognition"],
    content: ["a-z phonics sounds"],
  },
  {
    level: 2,
    name: "CVC Blending",
    skills: ["blending"],
    content: ["cat", "bat", "mat", "sat", "pat", "dog", "log", "fog"],
  },
  {
    level: 3,
    name: "Short Vowel Words",
    skills: ["reading"],
    content: ["pen", "hen", "ten", "sit", "hit", "cup", "sun"],
  },
  {
    level: 4,
    name: "Digraphs",
    skills: ["sh", "ch", "th"],
    content: ["ship", "chat", "thin", "shop", "chop"],
  },
  {
    level: 5,
    name: "Blends",
    skills: ["st", "bl", "tr"],
    content: ["stop", "blue", "tree", "flag", "crab"],
  },
  {
    level: 6,
    name: "Fluency",
    skills: ["sentence reading"],
    content: ["The cat sat.", "I see a dog.", "The sun is hot."],
  },
];

export function getCurriculumLevelDef(level: CurriculumLevel): CurriculumLevelDef {
  return (
    PHONICS_CURRICULUM_LEVELS.find((l) => l.level === level) ??
    PHONICS_CURRICULUM_LEVELS[0]!
  );
}

export function clampCurriculumLevel(n: number): CurriculumLevel {
  const v = Math.max(1, Math.min(6, Math.round(n)));
  return v as CurriculumLevel;
}

/** Seed starting level from age in months (12m–6y phonics band). */
export function defaultLevelForAgeMonths(totalMonths: number): CurriculumLevel {
  if (totalMonths < 24) return 1;
  if (totalMonths < 36) return 1;
  if (totalMonths < 48) return 2;
  if (totalMonths < 60) return 3;
  return 4;
}
