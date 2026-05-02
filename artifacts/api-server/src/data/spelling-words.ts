/**
 * Curated spelling word catalog for the Spelling Mastery module.
 *
 * Four age groups × ~15 words each = 60 starter words. Difficulty is
 * tagged per-word so the route handler can serve "easy → medium → hard"
 * progressions inside an age group as the child levels up.
 *
 * `chunks` groups digraphs and vowel teams (ship → ["sh","i","p"]) so
 * the missing-letter game can ask the child to fill a phonetic unit
 * rather than a single letter when appropriate. `syllables` drives the
 * word-breakdown display in Learn mode.
 *
 * NOTE: The word list is deliberately conservative — common, concrete,
 * easy-to-pronounce vocabulary that a child is likely to recognise. The
 * AI-generation endpoint exists alongside this catalog for parents who
 * want fresher / topical words.
 */

export type SpellingAgeGroup = "2-4" | "4-6" | "6-8" | "8-10+";
export type SpellingDifficulty = "easy" | "medium" | "hard";

export interface SpellingWord {
  /** Stable id across versions (slug of the word). */
  id: string;
  /** Lowercase target word — what the child is spelling. */
  word: string;
  ageGroup: SpellingAgeGroup;
  difficulty: SpellingDifficulty;
  /** Syllable breakdown — e.g. ["el","e","phant"]. */
  syllables: string[];
  /** Phonetic chunks for the missing-letter game — digraphs grouped. */
  chunks: string[];
  /** Short, kid-friendly hint sentence. Shown in Learn mode + Parent mode. */
  hint: string;
}

const w = (
  word: string,
  ageGroup: SpellingAgeGroup,
  difficulty: SpellingDifficulty,
  syllables: string[],
  chunks: string[],
  hint: string,
): SpellingWord => ({
  id: word.toLowerCase(),
  word: word.toLowerCase(),
  ageGroup,
  difficulty,
  syllables,
  chunks,
  hint,
});

// ─── Age 2–4 — Foundation (2–3 letter words, single vowel sounds) ────────────
const AGE_2_4: SpellingWord[] = [
  w("cat", "2-4", "easy",   ["cat"],     ["c","a","t"], "A small furry pet that says meow."),
  w("bat", "2-4", "easy",   ["bat"],     ["b","a","t"], "It can fly at night."),
  w("dog", "2-4", "easy",   ["dog"],     ["d","o","g"], "A friendly pet that says woof."),
  w("sun", "2-4", "easy",   ["sun"],     ["s","u","n"], "It shines brightly in the sky."),
  w("hat", "2-4", "easy",   ["hat"],     ["h","a","t"], "You wear it on your head."),
  w("pen", "2-4", "medium", ["pen"],     ["p","e","n"], "You write with this."),
  w("cup", "2-4", "medium", ["cup"],     ["c","u","p"], "You drink milk from this."),
  w("bed", "2-4", "medium", ["bed"],     ["b","e","d"], "Where you sleep at night."),
  w("pig", "2-4", "medium", ["pig"],     ["p","i","g"], "A pink farm animal that says oink."),
  w("bus", "2-4", "medium", ["bus"],     ["b","u","s"], "A big vehicle that takes you to school."),
  w("mug", "2-4", "hard",   ["mug"],     ["m","u","g"], "A big cup with a handle."),
  w("jam", "2-4", "hard",   ["jam"],     ["j","a","m"], "Sweet fruit spread for bread."),
  w("fan", "2-4", "hard",   ["fan"],     ["f","a","n"], "It spins to make air cool."),
  w("box", "2-4", "hard",   ["box"],     ["b","o","x"], "You keep things inside it."),
  w("toy", "2-4", "hard",   ["toy"],     ["t","oy"],   "Something fun to play with."),
];

// ─── Age 4–6 — Beginner (CVC + simple blends) ────────────────────────────────
const AGE_4_6: SpellingWord[] = [
  w("milk",  "4-6", "easy",   ["milk"],          ["m","i","l","k"],     "A white drink that comes from cows."),
  w("ball",  "4-6", "easy",   ["ball"],          ["b","a","ll"],        "Round, you can throw or kick it."),
  w("frog",  "4-6", "easy",   ["frog"],          ["f","r","o","g"],     "A green animal that hops."),
  w("fish",  "4-6", "easy",   ["fish"],          ["f","i","sh"],        "It swims in water."),
  w("tree",  "4-6", "easy",   ["tree"],          ["t","r","ee"],        "Tall plant with leaves and branches."),
  w("book",  "4-6", "medium", ["book"],          ["b","oo","k"],        "Pages with stories to read."),
  w("cake",  "4-6", "medium", ["cake"],          ["c","a","k","e"],     "A sweet treat for birthdays."),
  w("kite",  "4-6", "medium", ["kite"],          ["k","i","t","e"],     "It flies high in the wind."),
  w("moon",  "4-6", "medium", ["moon"],          ["m","oo","n"],        "It shines white in the night sky."),
  w("star",  "4-6", "medium", ["star"],          ["s","t","a","r"],     "Tiny twinkling lights at night."),
  w("jump",  "4-6", "hard",   ["jump"],          ["j","u","m","p"],     "Push off the ground with your feet."),
  w("drum",  "4-6", "hard",   ["drum"],          ["d","r","u","m"],     "Hit it to make a beat."),
  w("leaf",  "4-6", "hard",   ["leaf"],          ["l","ea","f"],        "Green part of a tree."),
  w("bird",  "4-6", "hard",   ["bird"],          ["b","ir","d"],        "An animal with wings that sings."),
  w("hand",  "4-6", "hard",   ["hand"],          ["h","a","n","d"],     "You have five fingers on each."),
];

// ─── Age 6–8 — Intermediate (digraphs + 5-6 letter words) ────────────────────
const AGE_6_8: SpellingWord[] = [
  w("ship",   "6-8", "easy",   ["ship"],            ["sh","i","p"],          "A big boat on the sea."),
  w("chair",  "6-8", "easy",   ["chair"],           ["ch","ai","r"],         "You sit on it."),
  w("train",  "6-8", "easy",   ["train"],           ["t","r","ai","n"],      "Long vehicle that runs on tracks."),
  w("black",  "6-8", "easy",   ["black"],           ["b","l","a","ck"],      "The colour of night."),
  w("cloud",  "6-8", "easy",   ["cloud"],           ["c","l","ou","d"],      "Fluffy white shape in the sky."),
  w("plant",  "6-8", "medium", ["plant"],           ["p","l","a","n","t"],   "It grows from a seed."),
  w("brush",  "6-8", "medium", ["brush"],           ["b","r","u","sh"],      "You use it on your teeth or hair."),
  w("sheep",  "6-8", "medium", ["sheep"],           ["sh","ee","p"],         "A fluffy animal that gives wool."),
  w("three",  "6-8", "medium", ["three"],           ["th","r","ee"],         "The number after two."),
  w("beach",  "6-8", "medium", ["beach"],           ["b","ea","ch"],         "Sand by the sea."),
  w("grape",  "6-8", "hard",   ["grape"],           ["g","r","a","p","e"],   "A small juicy purple fruit."),
  w("queen",  "6-8", "hard",   ["queen"],           ["qu","ee","n"],         "A royal lady who rules a kingdom."),
  w("phone",  "6-8", "hard",   ["phone"],           ["ph","o","n","e"],      "You talk to people on it."),
  w("snake",  "6-8", "hard",   ["snake"],           ["s","n","a","k","e"],   "A long animal with no legs."),
  w("knife",  "6-8", "hard",   ["knife"],           ["kn","i","f","e"],      "Sharp tool used to cut food."),
];

// ─── Age 8–10+ — Advanced (silent letters, complex spellings) ─────────────────
const AGE_8_10: SpellingWord[] = [
  w("school",      "8-10+", "easy",   ["school"],            ["s","ch","oo","l"],         "Where you go to learn."),
  w("balloon",     "8-10+", "easy",   ["bal","loon"],        ["b","a","ll","oo","n"],     "A rubber bag filled with air."),
  w("picture",     "8-10+", "easy",   ["pic","ture"],        ["p","i","c","t","u","r","e"], "An image on paper or screen."),
  w("library",     "8-10+", "easy",   ["lib","ra","ry"],     ["l","i","b","r","a","r","y"], "A place full of books to borrow."),
  w("journey",     "8-10+", "easy",   ["jour","ney"],        ["j","ou","r","n","ey"],     "A long trip from one place to another."),
  w("elephant",    "8-10+", "medium", ["el","e","phant"],    ["e","l","e","ph","a","n","t"], "A huge grey animal with a long trunk."),
  w("mountain",    "8-10+", "medium", ["moun","tain"],       ["m","ou","n","t","ai","n"], "A very tall hill made of rock."),
  w("computer",    "8-10+", "medium", ["com","pu","ter"],    ["c","o","m","p","u","t","e","r"], "A machine you can type and play games on."),
  w("vacation",    "8-10+", "medium", ["va","ca","tion"],    ["v","a","c","a","tion"],    "A holiday from school or work."),
  w("language",    "8-10+", "medium", ["lan","guage"],       ["l","a","n","g","u","a","g","e"], "How people speak — English, Hindi, etc."),
  w("because",     "8-10+", "hard",   ["be","cause"],        ["b","e","c","au","s","e"],  "A reason word — it explains why."),
  w("beautiful",   "8-10+", "hard",   ["beau","ti","ful"],   ["b","eau","t","i","f","u","l"], "Very nice to look at."),
  w("knowledge",   "8-10+", "hard",   ["know","ledge"],      ["kn","o","w","l","e","dge"], "Things you have learned."),
  w("science",     "8-10+", "hard",   ["sci","ence"],        ["s","c","i","e","n","c","e"], "Studying how the world works."),
  w("friendship",  "8-10+", "hard",   ["friend","ship"],     ["f","r","ie","n","d","sh","i","p"], "The bond between best friends."),
];

export const SPELLING_WORDS: readonly SpellingWord[] = Object.freeze([
  ...AGE_2_4,
  ...AGE_4_6,
  ...AGE_6_8,
  ...AGE_8_10,
]);

export function getSpellingWordsByAge(
  ageGroup: SpellingAgeGroup,
  difficulty?: SpellingDifficulty,
): SpellingWord[] {
  return SPELLING_WORDS.filter(
    (w) => w.ageGroup === ageGroup && (!difficulty || w.difficulty === difficulty),
  );
}

/** Map a child's age in months → spelling age group. */
export function spellingAgeGroupFor(ageMonths: number): SpellingAgeGroup {
  if (ageMonths < 24) return "2-4";       // (no module shown < 24 months)
  if (ageMonths < 48) return "2-4";
  if (ageMonths < 72) return "4-6";
  if (ageMonths < 96) return "6-8";
  return "8-10+";
}

/** All four age groups in display order. */
export const SPELLING_AGE_GROUPS: readonly SpellingAgeGroup[] = Object.freeze([
  "2-4",
  "4-6",
  "6-8",
  "8-10+",
]);
