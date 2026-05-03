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
const ALPHABET: Array<[string, string, string, string, string[]]> = [
  ["A", "ah",   "Apple",    "🍎",  ["Apple", "Ant", "Arm"]],
  ["B", "buh",  "Ball",     "⚽",  ["Ball", "Bat", "Banana", "Bear"]],
  ["C", "kuh",  "Cat",      "🐱",  ["Cat", "Cup", "Car"]],
  ["D", "duh",  "Dog",      "🐶",  ["Dog", "Duck", "Door"]],
  ["E", "eh",   "Egg",      "🥚",  ["Egg", "Elephant", "Ear"]],
  ["F", "fff",  "Fish",     "🐟",  ["Fish", "Fan", "Frog", "Foot"]],
  ["G", "guh",  "Goat",     "🐐",  ["Goat", "Gift", "Grape"]],
  ["H", "huh",  "Hat",      "🎩",  ["Hat", "House", "Horse"]],
  ["I", "ih",   "Igloo",    "🧊",  ["Igloo", "Ice", "Insect"]],
  ["J", "juh",  "Jug",      "🫙",  ["Jug", "Jam", "Jeep"]],
  ["K", "kuh",  "Kite",     "🪁",  ["Kite", "King", "Key"]],
  ["L", "lll",  "Lion",     "🦁",  ["Lion", "Leaf", "Leg"]],
  ["M", "mmm",  "Moon",     "🌙",  ["Moon", "Mango", "Mum"]],
  ["N", "nnn",  "Nest",     "🪺",  ["Nest", "Nose", "Nine"]],
  ["O", "oh",   "Orange",   "🍊",  ["Orange", "Owl", "Ox"]],
  ["P", "puh",  "Pig",      "🐷",  ["Pig", "Pen", "Pot", "Pan"]],
  ["Q", "kwuh", "Queen",    "👑",  ["Queen", "Quilt", "Question"]],
  ["R", "rrr",  "Rain",     "🌧️", ["Rain", "Rabbit", "Ring"]],
  ["S", "sss",  "Sun",      "☀️",  ["Sun", "Snake", "Star", "Sock"]],
  ["T", "tuh",  "Tiger",    "🐯",  ["Tiger", "Tap", "Top"]],
  ["U", "uh",   "Umbrella", "☂️",  ["Umbrella", "Up", "Under"]],
  ["V", "vvv",  "Van",      "🚐",  ["Van", "Vase", "Violin"]],
  ["W", "wuh",  "Water",    "💧",  ["Water", "Wind", "Wolf"]],
  ["X", "ks",   "Box",      "📦",  ["Box", "Fox", "Six"]],
  ["Y", "yuh",  "Yo-yo",    "🪀",  ["Yo-yo", "Yak", "Yellow"]],
  ["Z", "zzz",  "Zebra",    "🦓",  ["Zebra", "Zoo", "Zip"]],
];

const TIER_2_3Y: SeedItem[] = ALPHABET.map(([letter, phon, word, emoji, examples], i) => ({
  ageGroup: "2_3y",
  level: i + 1,
  type: "letter",
  symbol: letter,
  sound: `${letter} says ${phon}. ${letter} for ${word}.`,
  // Bare phoneme — used by the Phonics learning UI in `mode: "phonics"` so
  // the child hears just /buh/ instead of "B says buh, B for Ball".
  phoneme: phon,
  example: word,
  examples,
  emoji,
  hint: `${letter} is for ${word}`,
}));

// ─── 3–4 years: CVC blending words ───────────────────────────────────────────
const CVC_WORDS: Array<[string, string, string]> = [
  // [word, "c–a–t", emoji]
  ["cat", "c–a–t", "🐱"], ["bat", "b–a–t", "🦇"], ["hat", "h–a–t", "🎩"],
  ["mat", "m–a–t", "🧶"], ["pen", "p–e–n", "🖊️"], ["bed", "b–e–d", "🛏️"],
  ["pig", "p–i–g", "🐷"], ["pin", "p–i–n", "📍"], ["dog", "d–o–g", "🐶"],
  ["pot", "p–o–t", "🪴"], ["cup", "c–u–p", "🥤"], ["bus", "b–u–s", "🚌"],
];

const TIER_3_4Y: SeedItem[] = CVC_WORDS.map(([word, blend, emoji], i) => {
  const sounds = blend.split("–");
  return {
    ageGroup: "3_4y",
    level: i + 1,
    type: "word",
    symbol: word,
    sound: `${sounds.join(". ")}. ${word}.`,
    example: blend,
    emoji,
    hint: "Blend the sounds",
  };
});

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
  // [digraph, phonetic, exampleWord, emoji]
  ["sh", "shhh",  "ship",  "🚢"],
  ["ch", "chuh",  "chop",  "🪓"],
  ["th", "thhh",  "thumb", "👍"],
  ["wh", "wuh",   "whale", "🐋"],
  ["ph", "fff",   "phone", "📱"],
  ["ck", "kuh",   "duck",  "🦆"],
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
    sound: `${dig} says ${phon}, like in ${word}.`,
    // Bare phoneme so digraph tiles in phonics mode play just the blended sound.
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

  console.log(`✓ Done. Inserted ${inserted}, updated ${updated}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
