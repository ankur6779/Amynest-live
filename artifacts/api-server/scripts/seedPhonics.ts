/**
 * Seed the phonics_content table with the canonical catalog for all five
 * age tiers. Idempotent — re-running will UPDATE existing rows in place
 * (matched on ageGroup + level + symbol) and INSERT only what's new.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server tsx scripts/seedPhonics.ts
 */

import { db, phonicsContentTable } from "@workspace/db";
import type { InsertPhonicsContent } from "@workspace/db";
import { sql } from "drizzle-orm";

type SeedItem = Omit<InsertPhonicsContent, "active" | "audioUrl" | "phoneme" | "examples"> & {
  audioUrl?: string | null;
  /**
   * Phonics-only TTS text — the bare phoneme ("buh", "ah", "shhh") with no
   * letter name. Populated for `letter` rows so the learning UI teaches the
   * SOUND not the LETTER NAME. NULL for sounds/words/sentences/stories.
   */
  phoneme?: string | null;
  /**
   * 3–4 example words for a `letter` row (e.g. for "B": ["Ball","Bat","Banana"]).
   * Used by the multi-example chip row in the Phonics learning UI.
   */
  examples?: string[] | null;
};

// ─── 12–24 months: animal + environment sounds ───────────────────────────────
const TIER_12_24M: SeedItem[] = [
  { ageGroup: "12_24m", level: 1,  type: "sound", symbol: "Moo",   sound: "Moo.",        emoji: "🐄", hint: "Cow says…" },
  { ageGroup: "12_24m", level: 2,  type: "sound", symbol: "Woof",  sound: "Woof. Woof.", emoji: "🐶", hint: "Dog says…" },
  { ageGroup: "12_24m", level: 3,  type: "sound", symbol: "Meow",  sound: "Meow.",       emoji: "🐱", hint: "Cat says…" },
  { ageGroup: "12_24m", level: 4,  type: "sound", symbol: "Baa",   sound: "Baa.",        emoji: "🐑", hint: "Sheep says…" },
  { ageGroup: "12_24m", level: 5,  type: "sound", symbol: "Quack", sound: "Quack.",      emoji: "🦆", hint: "Duck says…" },
  { ageGroup: "12_24m", level: 6,  type: "sound", symbol: "Oink",  sound: "Oink.",       emoji: "🐷", hint: "Pig says…" },
  { ageGroup: "12_24m", level: 7,  type: "sound", symbol: "Roar",  sound: "Roar!",       emoji: "🦁", hint: "Lion says…" },
  { ageGroup: "12_24m", level: 8,  type: "sound", symbol: "Tweet", sound: "Tweet tweet.", emoji: "🐦", hint: "Bird says…" },
  { ageGroup: "12_24m", level: 9,  type: "sound", symbol: "Vroom", sound: "Vroom vroom!", emoji: "🚗", hint: "Car says…" },
  { ageGroup: "12_24m", level: 10, type: "sound", symbol: "Ding",  sound: "Ding ding.",  emoji: "🔔", hint: "Bell says…" },
];

// ─── 2–3 years: A–Z phonics ──────────────────────────────────────────────────
// Each row: [letter, phonetic, primaryExampleWord, emoji, [3-4 more examples]]
// `primaryExampleWord` drives the legacy single-example caption; `extraExamples`
// becomes the multi-example chip row in the new Phonics learning UI (T002).
// Synthetic-phonics rules: the `phonetic` column is the LETTER KEY (a–z) so
// runtime audio resolves to the curated pure-phoneme clip — never a schwa-laden
// "buh"/"kuh" TTS hint. Example words must begin with the taught short-vowel /
// consonant phoneme (no "Ice" for short i, no "Arm"/"Orange" for short a/o).
const ALPHABET: Array<[string, string, string, string, string[]]> = [
  ["A", "a", "Apple",    "🍎",  ["Apple", "Ant", "Axe"]],
  ["B", "b", "Ball",     "⚽",  ["Ball", "Bat", "Banana", "Bear"]],
  ["C", "c", "Cat",      "🐱",  ["Cat", "Cup", "Cot"]],
  ["D", "d", "Dog",      "🐶",  ["Dog", "Duck", "Door"]],
  ["E", "e", "Egg",      "🥚",  ["Egg", "Elephant", "Elbow"]],
  ["F", "f", "Fish",     "🐟",  ["Fish", "Fan", "Frog", "Foot"]],
  ["G", "g", "Goat",     "🐐",  ["Goat", "Gift", "Grape"]],
  ["H", "h", "Hat",      "🎩",  ["Hat", "House", "Horse"]],
  ["I", "i", "Igloo",    "🧊",  ["Igloo", "Insect", "In"]],
  ["J", "j", "Jug",      "🫙",  ["Jug", "Jam", "Jeep"]],
  ["K", "k", "Kite",     "🪁",  ["Kite", "King", "Key"]],
  ["L", "l", "Lion",     "🦁",  ["Lion", "Leaf", "Leg"]],
  ["M", "m", "Mat",      "🧶",  ["Mat", "Mango", "Mum"]],
  ["N", "n", "Nest",     "🪺",  ["Nest", "Nose", "Nut"]],
  ["O", "o", "Octopus",  "🐙",  ["Octopus", "Ox", "On"]],
  ["P", "p", "Pig",      "🐷",  ["Pig", "Pen", "Pot", "Pan"]],
  ["Q", "q", "Queen",    "👑",  ["Queen", "Quilt", "Quick"]],
  ["R", "r", "Rat",      "🐀",  ["Rat", "Rabbit", "Ring"]],
  ["S", "s", "Sun",      "☀️",  ["Sun", "Snake", "Star", "Sock"]],
  ["T", "t", "Tap",      "🚰",  ["Tap", "Tiger", "Top"]],
  ["U", "u", "Umbrella", "☂️",  ["Umbrella", "Up", "Under"]],
  ["V", "v", "Van",      "🚐",  ["Van", "Vase", "Violin"]],
  ["W", "w", "Water",    "💧",  ["Water", "Wind", "Wolf"]],
  ["X", "x", "Box",      "📦",  ["Box", "Fox", "Six"]],
  ["Y", "y", "Yak",      "🐂",  ["Yak", "Yes", "Yum"]],
  ["Z", "z", "Zebra",    "🦓",  ["Zebra", "Zoo", "Zip"]],
];

const TIER_2_3Y: SeedItem[] = ALPHABET.map(([letter, phon, word, emoji, examples], i) => ({
  ageGroup: "2_3y",
  level: i + 1,
  type: "letter",
  symbol: letter,
  // "as in" instructional form — the phonics audio pipeline recognises it and
  // resolves to the curated pure-phoneme clip (never letter-name TTS).
  sound: `${letter.toLowerCase()} as in ${word.toLowerCase()}`,
  // Letter key (a–z) — resolves directly to the curated phoneme clip so the
  // child hears the pure sound, never "buh"/"bee".
  phoneme: phon,
  example: word,
  examples,
  emoji,
  hint: `${letter} is for ${word}`,
}));

// ─── 3–4 years: CVC blending words ───────────────────────────────────────────
const CVC_WORDS: Array<[string, string, string]> = [
  // [word, blend hint, emoji]
  ["cat", "c–a–t", "🐱"], ["bat", "b–a–t", "🦇"], ["hat", "h–a–t", "🎩"],
  ["mat", "m–a–t", "🧶"], ["rat", "r–a–t", "🐀"], ["pen", "p–e–n", "🖊️"],
  ["hen", "h–e–n", "🐔"], ["bed", "b–e–d", "🛏️"], ["pig", "p–i–g", "🐷"],
  ["pin", "p–i–n", "📍"], ["sit", "s–i–t", "🪑"], ["dog", "d–o–g", "🐶"],
  ["pot", "p–o–t", "🪴"], ["cup", "c–u–p", "🥤"], ["bus", "b–u–s", "🚌"],
  ["sun", "s–u–n", "☀️"],
];

const TIER_3_4Y: SeedItem[] = CVC_WORDS.map(([word, blend, emoji], i) => ({
  ageGroup: "3_4y",
  level: i + 1,
  type: "word",
  symbol: word,
  // Bare word only — blending UI plays phoneme clips, not lesson paragraphs.
  sound: word,
  example: blend,
  emoji,
  hint: "Tap · then Blend",
}));

// ─── 4–5 years: sight words + simple sentences ───────────────────────────────
const SIGHT_WORDS: Array<[string, string]> = [
  ["the", "✨"], ["and", "✨"], ["is", "✨"], ["it", "✨"], ["to", "✨"],
];

const SIMPLE_SENTENCES: Array<[string, string]> = [
  ["The cat is fat.",     "🐱"],
  ["I see a red bus.",    "🚌"],
  ["Mum and Dad play.",   "👨‍👩‍👧"],
  ["The sun is up.",      "☀️"],
  ["I like my hat.",      "🎩"],
  ["The dog is in bed.",  "🛏️"],
];

const TIER_4_5Y: SeedItem[] = [
  ...SIGHT_WORDS.map<SeedItem>(([word, emoji], i) => ({
    ageGroup: "4_5y",
    level: i + 1,
    type: "letter", // rendered as a card; not blended
    symbol: word,
    sound: `${word}.`,
    example: "Sight word",
    emoji,
    hint: "Read on sight",
  })),
  ...SIMPLE_SENTENCES.map<SeedItem>(([s, emoji], i) => ({
    ageGroup: "4_5y",
    level: SIGHT_WORDS.length + i + 1,
    type: "sentence",
    symbol: s,
    sound: s,
    example: "Read aloud together",
    emoji,
    hint: "Point to each word",
  })),
];

// ─── 5–6 years: digraphs + short stories ─────────────────────────────────────
const DIGRAPHS: Array<[string, string, string, string]> = [
  // [digraph, phoneme key (resolves to curated clip), exampleWord, emoji]
  ["sh", "sh", "ship",  "🚢"],
  ["ch", "ch", "chip",  "🍟"],
  ["th", "th", "thin",  "🪡"],
  ["wh", "wh", "whip",  "🌀"],
  ["ng", "ng", "ring",  "💍"],
  ["ck", "ck", "duck",  "🦆"],
  ["qu", "qu", "quilt", "🛏️"],
  ["ph", "ph", "phone", "📱"],
];

const STORY_LINES: Array<[string, string]> = [
  ["The little duck sat by the pond.",     "🦆"],
  ["She saw a big ship sail past.",        "🚢"],
  ["A whale popped up and waved hello.",   "🐋"],
  ["The duck laughed and flapped her wings.", "🪶"],
  ["What a fun day at the pond!",          "🌊"],
];

const TIER_5_6Y: SeedItem[] = [
  ...DIGRAPHS.map<SeedItem>(([dig, phon, word, emoji], i) => ({
    ageGroup: "5_6y",
    level: i + 1,
    type: "letter", // rendered as a card with an example word
    symbol: dig,
    sound: `${dig} as in ${word}`,
    // Digraph key so phonics mode plays just the curated digraph phoneme clip.
    phoneme: phon,
    example: word,
    emoji,
    hint: "Two letters, one sound",
  })),
  ...STORY_LINES.map<SeedItem>(([line, emoji], i) => ({
    ageGroup: "5_6y",
    level: DIGRAPHS.length + i + 1,
    type: i === 0 ? "story" : "sentence", // first line tagged as story-opener
    symbol: line,
    sound: line,
    example: i === 0 ? "Story: The Pond Friends" : "Read with feeling",
    emoji,
    hint: i === STORY_LINES.length - 1 ? "What did the duck see?" : undefined,
  })),
];

// ─── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  const all: SeedItem[] = [
    ...TIER_12_24M,
    ...TIER_2_3Y,
    ...TIER_3_4Y,
    ...TIER_4_5Y,
    ...TIER_5_6Y,
  ];

  console.log(`Seeding ${all.length} phonics rows…`);

  let inserted = 0;
  let updated = 0;

  for (const item of all) {
    const result = await db
      .insert(phonicsContentTable)
      .values({ ...item, active: true })
      .onConflictDoUpdate({
        target: [
          phonicsContentTable.ageGroup,
          phonicsContentTable.level,
          phonicsContentTable.symbol,
        ],
        set: {
          type: item.type,
          sound: item.sound,
          phoneme: item.phoneme ?? null,
          example: item.example ?? null,
          examples: item.examples ?? null,
          emoji: item.emoji ?? null,
          hint: item.hint ?? null,
          audioUrl: item.audioUrl ?? null,
          active: true,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: phonicsContentTable.id, createdAt: phonicsContentTable.createdAt, updatedAt: phonicsContentTable.updatedAt });

    const row = result[0];
    if (row && row.createdAt.getTime() === row.updatedAt.getTime()) inserted++;
    else updated++;
  }

  // Deactivate stale rows in seeded age groups (e.g. after reordering symbols
  // across levels) so each (ageGroup, level) has exactly one active symbol.
  const ageGroups = [...new Set(all.map((i) => i.ageGroup))];
  let deactivated = 0;
  for (const ageGroup of ageGroups) {
    const keep = all.filter((i) => i.ageGroup === ageGroup);
    const keepKeys = new Set(keep.map((i) => `${i.level}\0${i.symbol}`));
    const rows = await db
      .select({
        id: phonicsContentTable.id,
        level: phonicsContentTable.level,
        symbol: phonicsContentTable.symbol,
        active: phonicsContentTable.active,
      })
      .from(phonicsContentTable)
      .where(sql`${phonicsContentTable.ageGroup} = ${ageGroup}`);
    for (const row of rows) {
      if (row.active && !keepKeys.has(`${row.level}\0${row.symbol}`)) {
        await db
          .update(phonicsContentTable)
          .set({ active: false, updatedAt: sql`now()` })
          .where(sql`${phonicsContentTable.id} = ${row.id}`);
        deactivated++;
      }
    }
  }

  console.log(`✓ Done. Inserted ${inserted}, updated ${updated}, deactivated ${deactivated} stale rows.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
