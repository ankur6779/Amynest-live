/**
 * Phonics Word Bank Seed
 *
 * Seeds the `phonics_content` table with word rows drawn from the phonics
 * engine spec shared by the product team:
 *
 *   cvc_words    → 3_4y  (Blending level, easy difficulty)
 *   digraph_words → 4_5y + 5_6y  (medium difficulty)
 *   blend_words  → 4_5y + 5_6y  (medium / hard difficulty)
 *
 * The insert uses `onConflictDoNothing` on the unique index
 * (age_group, level, symbol) so repeated startup calls are safe.
 *
 * Call `seedPhonicsWordBank()` once at server startup — it completes in
 * < 100 ms and is a no-op after the first successful run.
 */

import { db, phonicsContentTable } from "@workspace/db";
import { logger } from "./logger";

interface SeedRow {
  ageGroup: string;
  level: number;
  type: string;
  symbol: string;
  sound: string;
  example: string | null;
  emoji: string | null;
  hint: string | null;
}

// ─── 3_4y: extra CVC words from spec (levels 20+) ────────────────────────────
// Already in DB (levels 1-12): cat, bat, hat, mat, pen, bed, pig, pin, dog, pot, cup, bus
// Adding the remainder from the spec's cvc_words bank.

const CVC_EXTRA: SeedRow[] = [
  { ageGroup: "3_4y", level: 20, type: "word", symbol: "rat",  sound: "r. a. t. rat.",   example: "r-a-t", emoji: "🐀",  hint: "CVC word" },
  { ageGroup: "3_4y", level: 21, type: "word", symbol: "sun",  sound: "s. u. n. sun.",   example: "s-u-n", emoji: "☀️", hint: "CVC word" },
  { ageGroup: "3_4y", level: 22, type: "word", symbol: "fun",  sound: "f. u. n. fun.",   example: "f-u-n", emoji: "🎉",  hint: "CVC word" },
  { ageGroup: "3_4y", level: 23, type: "word", symbol: "run",  sound: "r. u. n. run.",   example: "r-u-n", emoji: "🏃",  hint: "CVC word" },
  { ageGroup: "3_4y", level: 24, type: "word", symbol: "bun",  sound: "b. u. n. bun.",   example: "b-u-n", emoji: "🍞",  hint: "CVC word" },
  { ageGroup: "3_4y", level: 25, type: "word", symbol: "hen",  sound: "h. e. n. hen.",   example: "h-e-n", emoji: "🐔",  hint: "CVC word" },
  { ageGroup: "3_4y", level: 26, type: "word", symbol: "ten",  sound: "t. e. n. ten.",   example: "t-e-n", emoji: "🔟",  hint: "CVC word" },
  { ageGroup: "3_4y", level: 27, type: "word", symbol: "den",  sound: "d. e. n. den.",   example: "d-e-n", emoji: "🏠",  hint: "CVC word" },
  { ageGroup: "3_4y", level: 28, type: "word", symbol: "log",  sound: "l. o. g. log.",   example: "l-o-g", emoji: "🪵",  hint: "CVC word" },
  { ageGroup: "3_4y", level: 29, type: "word", symbol: "fog",  sound: "f. o. g. fog.",   example: "f-o-g", emoji: "🌫️", hint: "CVC word" },
  { ageGroup: "3_4y", level: 30, type: "word", symbol: "cog",  sound: "c. o. g. cog.",   example: "c-o-g", emoji: "⚙️", hint: "CVC word" },
  { ageGroup: "3_4y", level: 31, type: "word", symbol: "dig",  sound: "d. i. g. dig.",   example: "d-i-g", emoji: "⛏️", hint: "CVC word" },
  { ageGroup: "3_4y", level: 32, type: "word", symbol: "big",  sound: "b. i. g. big.",   example: "b-i-g", emoji: "🦣",  hint: "CVC word" },
  { ageGroup: "3_4y", level: 33, type: "word", symbol: "wig",  sound: "w. i. g. wig.",   example: "w-i-g", emoji: "👩‍🦱", hint: "CVC word" },
];

// ─── 4_5y: digraph words (levels 20+) ────────────────────────────────────────
// sh-words, ch-words, th-words — medium difficulty.

const DIGRAPH_WORDS_4_5Y: SeedRow[] = [
  { ageGroup: "4_5y", level: 20, type: "word", symbol: "ship",  sound: "ship",  example: "sh word", emoji: "🚢",  hint: "sh sound" },
  { ageGroup: "4_5y", level: 21, type: "word", symbol: "shop",  sound: "shop",  example: "sh word", emoji: "🛒",  hint: "sh sound" },
  { ageGroup: "4_5y", level: 22, type: "word", symbol: "fish",  sound: "fish",  example: "sh word", emoji: "🐟",  hint: "sh sound" },
  { ageGroup: "4_5y", level: 23, type: "word", symbol: "dish",  sound: "dish",  example: "sh word", emoji: "🍽️", hint: "sh sound" },
  { ageGroup: "4_5y", level: 24, type: "word", symbol: "chat",  sound: "chat",  example: "ch word", emoji: "💬",  hint: "ch sound" },
  { ageGroup: "4_5y", level: 25, type: "word", symbol: "chip",  sound: "chip",  example: "ch word", emoji: "🍟",  hint: "ch sound" },
  { ageGroup: "4_5y", level: 26, type: "word", symbol: "chin",  sound: "chin",  example: "ch word", emoji: "🫦",  hint: "ch sound" },
  { ageGroup: "4_5y", level: 27, type: "word", symbol: "thin",  sound: "thin",  example: "th word", emoji: "📏",  hint: "th sound" },
  { ageGroup: "4_5y", level: 28, type: "word", symbol: "this",  sound: "this",  example: "th word", emoji: "✨",  hint: "th sound" },
  { ageGroup: "4_5y", level: 29, type: "word", symbol: "that",  sound: "that",  example: "th word", emoji: "✨",  hint: "th sound" },
];

// ─── 4_5y: blend words (levels 30+) ──────────────────────────────────────────

const BLEND_WORDS_4_5Y: SeedRow[] = [
  { ageGroup: "4_5y", level: 30, type: "word", symbol: "flag",  sound: "flag",  example: "fl blend", emoji: "🚩", hint: "fl blend" },
  { ageGroup: "4_5y", level: 31, type: "word", symbol: "clap",  sound: "clap",  example: "cl blend", emoji: "👏", hint: "cl blend" },
  { ageGroup: "4_5y", level: 32, type: "word", symbol: "glad",  sound: "glad",  example: "gl blend", emoji: "😊", hint: "gl blend" },
  { ageGroup: "4_5y", level: 33, type: "word", symbol: "plan",  sound: "plan",  example: "pl blend", emoji: "📋", hint: "pl blend" },
  { ageGroup: "4_5y", level: 34, type: "word", symbol: "frog",  sound: "frog",  example: "fr blend", emoji: "🐸", hint: "fr blend" },
  { ageGroup: "4_5y", level: 35, type: "word", symbol: "trip",  sound: "trip",  example: "tr blend", emoji: "✈️", hint: "tr blend" },
  { ageGroup: "4_5y", level: 36, type: "word", symbol: "drum",  sound: "drum",  example: "dr blend", emoji: "🥁", hint: "dr blend" },
  { ageGroup: "4_5y", level: 37, type: "word", symbol: "brag",  sound: "brag",  example: "br blend", emoji: "😏", hint: "br blend" },
];

// ─── 5_6y: digraph words (levels 20+) ────────────────────────────────────────
// Same digraph set as 4_5y — the `identify` game mode ("Which word starts with
// this sound?") is unlocked here where the digraph letter rows live (sh, ch, th…).

const DIGRAPH_WORDS_5_6Y: SeedRow[] = [
  { ageGroup: "5_6y", level: 20, type: "word", symbol: "ship",  sound: "ship",  example: "sh word", emoji: "🚢",  hint: "sh sound" },
  { ageGroup: "5_6y", level: 21, type: "word", symbol: "shop",  sound: "shop",  example: "sh word", emoji: "🛒",  hint: "sh sound" },
  { ageGroup: "5_6y", level: 22, type: "word", symbol: "fish",  sound: "fish",  example: "sh word", emoji: "🐟",  hint: "sh sound" },
  { ageGroup: "5_6y", level: 23, type: "word", symbol: "dish",  sound: "dish",  example: "sh word", emoji: "🍽️", hint: "sh sound" },
  { ageGroup: "5_6y", level: 24, type: "word", symbol: "chat",  sound: "chat",  example: "ch word", emoji: "💬",  hint: "ch sound" },
  { ageGroup: "5_6y", level: 25, type: "word", symbol: "chip",  sound: "chip",  example: "ch word", emoji: "🍟",  hint: "ch sound" },
  { ageGroup: "5_6y", level: 26, type: "word", symbol: "chin",  sound: "chin",  example: "ch word", emoji: "🫦",  hint: "ch sound" },
  { ageGroup: "5_6y", level: 27, type: "word", symbol: "thin",  sound: "thin",  example: "th word", emoji: "📏",  hint: "th sound" },
  { ageGroup: "5_6y", level: 28, type: "word", symbol: "this",  sound: "this",  example: "th word", emoji: "✨",  hint: "th sound" },
  { ageGroup: "5_6y", level: 29, type: "word", symbol: "that",  sound: "that",  example: "th word", emoji: "✨",  hint: "th sound" },
];

// ─── 5_6y: blend words (levels 30+) ──────────────────────────────────────────

const BLEND_WORDS_5_6Y: SeedRow[] = [
  { ageGroup: "5_6y", level: 30, type: "word", symbol: "flag",  sound: "flag",  example: "fl blend", emoji: "🚩", hint: "fl blend" },
  { ageGroup: "5_6y", level: 31, type: "word", symbol: "clap",  sound: "clap",  example: "cl blend", emoji: "👏", hint: "cl blend" },
  { ageGroup: "5_6y", level: 32, type: "word", symbol: "glad",  sound: "glad",  example: "gl blend", emoji: "😊", hint: "gl blend" },
  { ageGroup: "5_6y", level: 33, type: "word", symbol: "plan",  sound: "plan",  example: "pl blend", emoji: "📋", hint: "pl blend" },
  { ageGroup: "5_6y", level: 34, type: "word", symbol: "frog",  sound: "frog",  example: "fr blend", emoji: "🐸", hint: "fr blend" },
  { ageGroup: "5_6y", level: 35, type: "word", symbol: "trip",  sound: "trip",  example: "tr blend", emoji: "✈️", hint: "tr blend" },
  { ageGroup: "5_6y", level: 36, type: "word", symbol: "drum",  sound: "drum",  example: "dr blend", emoji: "🥁", hint: "dr blend" },
  { ageGroup: "5_6y", level: 37, type: "word", symbol: "brag",  sound: "brag",  example: "br blend", emoji: "😏", hint: "br blend" },
];

const ALL_SEED_ROWS: SeedRow[] = [
  ...CVC_EXTRA,
  ...DIGRAPH_WORDS_4_5Y,
  ...BLEND_WORDS_4_5Y,
  ...DIGRAPH_WORDS_5_6Y,
  ...BLEND_WORDS_5_6Y,
];

let seeded = false;

export async function seedPhonicsWordBank(): Promise<void> {
  if (seeded) return;
  seeded = true;
  try {
    await db
      .insert(phonicsContentTable)
      .values(
        ALL_SEED_ROWS.map((r) => ({
          ageGroup: r.ageGroup,
          level: r.level,
          type: r.type,
          symbol: r.symbol,
          sound: r.sound,
          example: r.example ?? undefined,
          emoji: r.emoji ?? undefined,
          hint: r.hint ?? undefined,
          active: true,
        })),
      )
      .onConflictDoNothing({
        target: [
          phonicsContentTable.ageGroup,
          phonicsContentTable.level,
          phonicsContentTable.symbol,
        ],
      });
    logger.info(
      { rows: ALL_SEED_ROWS.length },
      "phonics word bank seed: complete (new rows inserted, existing rows skipped)",
    );
  } catch (err) {
    // Non-fatal — the app still works, just with fewer question types available.
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "phonics word bank seed: failed (non-fatal)",
    );
  }
}
