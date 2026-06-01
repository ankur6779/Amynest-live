/**
 * Unique practice words from phonics curriculum + DB word-bank seed.
 * Used for static-audio pre-generation and phonics library catalog coverage.
 */

/** Deduplicated lowercase words — matches phonicsWordBankSeed + curriculum level content. */
export const PHONICS_CURRICULUM_WORD_BANK: readonly string[] = [
  // CVC extras (3–4y seed)
  "rat",
  "sun",
  "fun",
  "run",
  "bun",
  "hen",
  "ten",
  "den",
  "log",
  "fog",
  "cog",
  "dig",
  "big",
  "wig",
  // Digraph words (4–5y / 5–6y)
  "ship",
  "shop",
  "fish",
  "dish",
  "chat",
  "chip",
  "chin",
  "thin",
  "this",
  "that",
  "chop",
  // Blend words
  "flag",
  "clap",
  "glad",
  "plan",
  "frog",
  "trip",
  "drum",
  "brag",
  "stop",
  "blue",
  "tree",
  "crab",
] as const;

/** Bare word lines for default static-audio map (tile tap playback). */
export function getPhonicsCurriculumWordsForStaticCatalog(): string[] {
  return [...PHONICS_CURRICULUM_WORD_BANK];
}
