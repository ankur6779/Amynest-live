/**
 * Extended Study Zone progression tiers — replaces static 1–20 caps for premium/mastery users.
 * Free journey days 1–3 still use PLAY_JOURNEY_LIMITS from @workspace/study-zone.
 */

export const NUMBERS_STAGES = [
  { id: "1-5", max: 5, label: "Numbers 1–5" },
  { id: "1-10", max: 10, label: "Numbers 1–10" },
  { id: "1-20", max: 20, label: "Numbers 1–20" },
  { id: "1-50", max: 50, label: "Numbers 1–50" },
  { id: "1-100", max: 100, label: "Numbers 1–100" },
  { id: "count-by-2", max: 100, label: "Count by 2s" },
  { id: "count-by-5", max: 100, label: "Count by 5s" },
  { id: "patterns", max: 100, label: "Number patterns" },
  { id: "addition", max: 100, label: "Addition" },
  { id: "subtraction", max: 100, label: "Subtraction" },
  { id: "comparison", max: 100, label: "Compare numbers" },
  { id: "memory-math", max: 100, label: "Memory math" },
] as const;

export const ALPHABET_STAGES = [
  { id: "A-E", start: "A", end: "E", label: "Letters A–E" },
  { id: "F-J", start: "F", end: "J", label: "Letters F–J" },
  { id: "K-O", start: "K", end: "O", label: "Letters K–O" },
  { id: "P-T", start: "P", end: "T", label: "Letters P–T" },
  { id: "U-Z", start: "U", end: "Z", label: "Letters U–Z" },
  { id: "phonics", start: "A", end: "Z", label: "Phonics sounds" },
  { id: "blending", start: "A", end: "Z", label: "Blending" },
  { id: "simple-words", start: "A", end: "Z", label: "Simple words" },
  { id: "sentence-reading", start: "A", end: "Z", label: "Sentence reading" },
] as const;

export const SHAPES_STAGES = [
  "basic",
  "advanced",
  "3d",
  "matching",
  "real-world",
] as const;

export const COLORS_STAGES = [
  "primary",
  "secondary",
  "shades",
  "mixing",
  "object-association",
] as const;

export const PHONICS_LEVELS = [
  "sounds",
  "blends",
  "sight-words",
  "spelling",
  "sentence-reading",
  "fluency",
] as const;

export const SPEECH_LEVELS = [
  "single-words",
  "vowels",
  "phonics",
  "sentence-repetition",
  "conversation",
  "story-narration",
  "confidence",
] as const;

export const STORY_LEVELS = [
  "listen",
  "comprehension",
  "choices",
  "narration",
  "personalized",
] as const;

export const MATH_TRICK_LEVELS = [
  "recognition",
  "patterns",
  "mental-math",
  "speed-math",
  "logic-math",
] as const;

/** Map combined mastery + math section level → numbers stage index. */
export function numbersStageIndex(masteryScore: number, mathLevel: number): number {
  const combined = masteryScore * 0.4 + mathLevel * 12;
  if (combined < 15) return 0;
  if (combined < 30) return 1;
  if (combined < 45) return 2;
  if (combined < 60) return 3;
  if (combined < 75) return 4;
  if (combined < 90) return 5;
  if (combined < 105) return 6;
  if (combined < 120) return 7;
  if (combined < 135) return 8;
  if (combined < 150) return 9;
  if (combined < 165) return 10;
  return 11;
}

export function alphabetsStageIndex(masteryScore: number, phonicsLevel: number): number {
  const combined = masteryScore * 0.35 + phonicsLevel * 15;
  if (combined < 12) return 0;
  if (combined < 24) return 1;
  if (combined < 36) return 2;
  if (combined < 48) return 3;
  if (combined < 60) return 4;
  if (combined < 80) return 5;
  if (combined < 100) return 6;
  if (combined < 120) return 7;
  return 8;
}

export function shapesStageIndex(masteryScore: number): number {
  if (masteryScore < 20) return 0;
  if (masteryScore < 40) return 1;
  if (masteryScore < 60) return 2;
  if (masteryScore < 80) return 3;
  return 4;
}

export function colorsStageIndex(masteryScore: number): number {
  if (masteryScore < 15) return 0;
  if (masteryScore < 35) return 1;
  if (masteryScore < 55) return 2;
  if (masteryScore < 75) return 3;
  return 4;
}

export function phonicsLevelIndex(sectionLevel: number, masteryScore: number): number {
  const combined = sectionLevel * 10 + masteryScore * 0.5;
  if (combined < 15) return 0;
  if (combined < 30) return 1;
  if (combined < 50) return 2;
  if (combined < 70) return 3;
  if (combined < 90) return 4;
  return 5;
}

export function speechLevelIndex(sectionLevel: number): number {
  return Math.min(SPEECH_LEVELS.length - 1, Math.max(0, sectionLevel - 1));
}

export function storyLevelIndex(sectionLevel: number): number {
  return Math.min(STORY_LEVELS.length - 1, Math.max(0, sectionLevel - 1));
}
