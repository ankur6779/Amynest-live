// Programmatic science & English practice questions — complements math generators
// in levels.ts. Each topic has level-banded templates; pickTopicPracticeQuestions
// shuffles options and assigns stable ids for anti-repetition.

import type { Level, SmartQuestion } from "./levels";
import { rng, pickAdaptiveQuestions, type SmartSubjectId, SMART_SUBJECTS } from "./levels";
import { BASIC_SUBJECTS } from "./content/basic";
import { ADVANCED_SUBJECTS } from "./content/advanced";
import {
  pickAdvancedMathQuestions,
  isAdvancedMathPracticeSubject,
  ADVANCED_MATH_PRACTICE_SUBJECTS,
} from "./advanced-math-practice";
import {
  pickBasicMathExtraQuestions,
  isBasicMathExtraPracticeSubject,
  BASIC_MATH_EXTRA_PRACTICE_SUBJECTS,
} from "./basic-math-extra-practice";

type Template = {
  q: string;
  options: string[];
  answer: string;
  hint?: string;
  minLevel?: Level;
  maxLevel?: Level;
};

function shuffleInPlace<T>(arr: T[], r: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function pickInt(r: () => number, lo: number, hi: number): number {
  return Math.floor(r() * (hi - lo + 1)) + lo;
}

function fromTemplate(
  topicId: string,
  level: Level,
  tpl: Template,
  r: () => number,
  seq: number,
): SmartQuestion {
  const opts = shuffleInPlace([...tpl.options], r);
  return {
    id: `${topicId}-L${level}-${seq}-${tpl.answer.slice(0, 8)}`,
    level,
    subject: topicId as SmartSubjectId,
    q: tpl.q,
    options: opts,
    answer: tpl.answer,
    hint: tpl.hint,
  };
}

function pickFromPool(
  topicId: string,
  level: Level,
  pool: Template[],
  r: () => number,
  seq: number,
): SmartQuestion {
  const eligible = pool.filter(
    (t) => level >= (t.minLevel ?? 1) && level <= (t.maxLevel ?? 6),
  );
  const use = eligible.length > 0 ? eligible : pool;
  const tpl = use[pickInt(r, 0, use.length - 1)]!;
  return fromTemplate(topicId, level, tpl, r, seq);
}

// ─── Science (basic) ─────────────────────────────────────────────────────────

const SCIENCE_TEMPLATES: Record<string, Template[]> = {
  plants: [
    { q: "Which part of a plant makes food?", options: ["Roots", "Stem", "Leaves", "Flower"], answer: "Leaves", hint: "Leaves use sunlight.", minLevel: 1, maxLevel: 3 },
    { q: "Which part holds the plant in the soil?", options: ["Roots", "Leaves", "Flower", "Fruit"], answer: "Roots", minLevel: 1, maxLevel: 4 },
    { q: "What helps plants make food?", options: ["Moonlight", "Sunlight", "Wind", "Snow"], answer: "Sunlight", minLevel: 2, maxLevel: 4 },
    { q: "New plants grow from?", options: ["Stem", "Leaves", "Seeds", "Roots"], answer: "Seeds", minLevel: 3, maxLevel: 6 },
  ],
  animals: [
    { q: "Where does a lion live?", options: ["Home", "Farm", "Forest", "Sea"], answer: "Forest", minLevel: 1, maxLevel: 3 },
    { q: "Which is a pet animal?", options: ["Tiger", "Dog", "Shark", "Elephant"], answer: "Dog", minLevel: 1, maxLevel: 3 },
    { q: "Fish live in?", options: ["Forest", "Desert", "Water", "Air"], answer: "Water", minLevel: 1, maxLevel: 4 },
    { q: "Which animal gives us milk?", options: ["Cat", "Dog", "Cow", "Fish"], answer: "Cow", minLevel: 2, maxLevel: 4 },
  ],
  "states-of-matter": [
    { q: "Which is a liquid?", options: ["Wood", "Water", "Stone", "Ice"], answer: "Water", minLevel: 3, maxLevel: 5 },
    { q: "Which is a gas?", options: ["Milk", "Air", "Sugar", "Sand"], answer: "Air", minLevel: 3, maxLevel: 5 },
    { q: "Ice is a ___?", options: ["Solid", "Liquid", "Gas", "Plasma"], answer: "Solid", minLevel: 3, maxLevel: 6 },
    { q: "How many main states of matter?", options: ["1", "2", "3", "5"], answer: "3", minLevel: 4, maxLevel: 6 },
  ],
  "human-body": [
    { q: "Which part do we use to see?", options: ["Ears", "Nose", "Eyes", "Mouth"], answer: "Eyes", minLevel: 1, maxLevel: 3 },
    { q: "Which part do we use to hear?", options: ["Eyes", "Ears", "Hands", "Feet"], answer: "Ears", minLevel: 1, maxLevel: 3 },
    { q: "What helps us walk and run?", options: ["Arms", "Eyes", "Legs", "Mouth"], answer: "Legs", minLevel: 2, maxLevel: 4 },
    { q: "Which organ controls our body?", options: ["Heart", "Lungs", "Brain", "Stomach"], answer: "Brain", minLevel: 4, maxLevel: 6 },
  ],
  "weather-seasons": [
    { q: "Which season is usually the hottest?", options: ["Winter", "Summer", "Autumn", "Spring"], answer: "Summer", minLevel: 2, maxLevel: 4 },
    { q: "We wear a coat in which season?", options: ["Summer", "Autumn", "Winter", "Spring"], answer: "Winter", minLevel: 2, maxLevel: 4 },
    { q: "What shows today's weather?", options: ["Calendar", "Clock", "Sky", "Ruler"], answer: "Sky", minLevel: 3, maxLevel: 5 },
    { q: "Rainy days have lots of?", options: ["Snow", "Wind only", "Water falling", "Heat"], answer: "Water falling", minLevel: 3, maxLevel: 6 },
  ],
  "food-nutrition": [
    { q: "Which gives us the most energy?", options: ["Grains", "Sweets", "Water", "Salt"], answer: "Grains", minLevel: 3, maxLevel: 5 },
    { q: "Milk belongs to which food group?", options: ["Fruits", "Grains", "Dairy", "Protein"], answer: "Dairy", minLevel: 3, maxLevel: 5 },
    { q: "Eating all food groups is called?", options: ["Junk diet", "Balanced diet", "Sweet diet", "Liquid diet"], answer: "Balanced diet", minLevel: 4, maxLevel: 6 },
    { q: "Which is a healthy food?", options: ["Chips", "Cold drink", "Apple", "Candy"], answer: "Apple", minLevel: 3, maxLevel: 6 },
  ],
  "force-motion": [
    { q: "A force is a ___ or pull.", options: ["push", "sound", "colour", "smell"], answer: "push", minLevel: 6, maxLevel: 7 },
    { q: "Friction acts when two surfaces ___?", options: ["touch", "float", "vanish", "glow"], answer: "touch", minLevel: 6, maxLevel: 8 },
    { q: "Speed = distance ÷ ?", options: ["mass", "time", "colour", "volume"], answer: "time", minLevel: 7, maxLevel: 9 },
    { q: "Gravity pulls objects ___?", options: ["sideways", "downward", "upward only", "in circles"], answer: "downward", minLevel: 7, maxLevel: 10 },
  ],
  cells: [
    { q: "All living things are made of?", options: ["Rocks", "Cells", "Air only", "Light"], answer: "Cells", minLevel: 6, maxLevel: 8 },
    { q: "Plant cells have a ___?", options: ["tail", "cell wall", "wing", "shell"], answer: "cell wall", minLevel: 7, maxLevel: 9 },
    { q: "The control centre of a cell is the ___?", options: ["nucleus", "root", "leaf", "bone"], answer: "nucleus", minLevel: 7, maxLevel: 10 },
    { q: "Cells are seen with a ___?", options: ["ruler", "microscope", "thermometer", "compass"], answer: "microscope", minLevel: 6, maxLevel: 8 },
  ],
  "acids-bases": [
    { q: "Lemon juice is an ___?", options: ["acid", "base", "metal", "gas"], answer: "acid", minLevel: 7, maxLevel: 9 },
    { q: "Soap feels ___?", options: ["sharp", "soapy/slippery", "frozen", "magnetic"], answer: "soapy/slippery", minLevel: 7, maxLevel: 9 },
    { q: "pH 7 is ___?", options: ["acidic", "neutral", "very hot", "solid"], answer: "neutral", minLevel: 8, maxLevel: 10 },
    { q: "Acids taste ___?", options: ["sweet", "sour", "bitter only", "silent"], answer: "sour", minLevel: 7, maxLevel: 10 },
  ],
  electricity: [
    { q: "Copper is a good ___?", options: ["insulator", "conductor", "magnet always", "gas"], answer: "conductor", minLevel: 8, maxLevel: 10 },
    { q: "Current flows through a closed ___?", options: ["circuit", "box only", "cloud", "book"], answer: "circuit", minLevel: 8, maxLevel: 10 },
    { q: "A battery provides ___?", options: ["gravity", "voltage", "rain", "oxygen"], answer: "voltage", minLevel: 8, maxLevel: 10 },
    { q: "Rubber is usually an ___?", options: ["conductor", "insulator", "acid", "metal"], answer: "insulator", minLevel: 8, maxLevel: 10 },
  ],
  "digestive-system": [
    { q: "Food digestion starts in the ___?", options: ["mouth", "ear", "knee", "hair"], answer: "mouth", minLevel: 6, maxLevel: 8 },
    { q: "The stomach breaks food with ___?", options: ["juice/acid", "paint", "wind", "light"], answer: "juice/acid", minLevel: 7, maxLevel: 9 },
    { q: "Nutrients are absorbed mainly in the ___?", options: ["intestines", "nails", "teeth", "eyes"], answer: "intestines", minLevel: 7, maxLevel: 10 },
    { q: "Chewing helps ___ food.", options: ["freeze", "break down", "hide", "float"], answer: "break down", minLevel: 6, maxLevel: 8 },
  ],
  "light-optics": [
    { q: "Light travels in ___ lines.", options: ["straight", "circular only", "random zigzag always", "never"], answer: "straight", minLevel: 8, maxLevel: 10 },
    { q: "A mirror ___ light.", options: ["reflects", "eats", "freezes", "melts"], answer: "reflects", minLevel: 8, maxLevel: 10 },
    { q: "A rainbow shows many ___?", options: ["colours", "numbers", "animals", "planets"], answer: "colours", minLevel: 8, maxLevel: 10 },
    { q: "Shadows form when light is ___?", options: ["blocked", "invisible always", "inside water only", "gone forever"], answer: "blocked", minLevel: 8, maxLevel: 10 },
  ],
};

// ─── English ─────────────────────────────────────────────────────────────────

const ENGLISH_TEMPLATES: Record<string, Template[]> = {
  nouns: [
    { q: "Which word is a noun?", options: ["Run", "Quickly", "Apple", "Happy"], answer: "Apple", minLevel: 1, maxLevel: 3 },
    { q: "Which is a proper noun?", options: ["girl", "boy", "Emma", "school"], answer: "Emma", minLevel: 2, maxLevel: 4 },
    { q: "A noun names a ___?", options: ["sound only", "person, place, animal or thing", "colour only", "feeling only"], answer: "person, place, animal or thing", minLevel: 1, maxLevel: 3 },
    { q: "Pick the noun: 'The dog barks.'", options: ["barking", "loudly", "is", "dog"], answer: "dog", minLevel: 2, maxLevel: 4 },
  ],
  verbs: [
    { q: "Which word is a verb?", options: ["Tree", "Jump", "Blue", "Soft"], answer: "Jump", minLevel: 1, maxLevel: 3 },
    { q: "Pick the verb: 'She reads a book.'", options: ["She", "reads", "a", "book"], answer: "reads", minLevel: 2, maxLevel: 4 },
    { q: "Which one is NOT a verb?", options: ["Eat", "Sleep", "Apple", "Run"], answer: "Apple", minLevel: 2, maxLevel: 4 },
    { q: "A verb is a ___ word.", options: ["naming", "doing", "describing", "joining"], answer: "doing", minLevel: 1, maxLevel: 3 },
  ],
  adjectives: [
    { q: "Which word is an adjective in 'sweet mango'?", options: ["mango", "sweet", "the", "a"], answer: "sweet", minLevel: 2, maxLevel: 4 },
    { q: "An adjective describes a ___?", options: ["verb", "noun", "pronoun", "sentence"], answer: "noun", minLevel: 2, maxLevel: 4 },
    { q: "Pick the adjective: 'a tall tree'", options: ["a", "tall", "tree", "is"], answer: "tall", minLevel: 2, maxLevel: 5 },
    { q: "Which is an adjective?", options: ["jump", "slowly", "cold", "run"], answer: "cold", minLevel: 3, maxLevel: 5 },
  ],
  pronouns: [
    { q: "Which is a pronoun?", options: ["Dog", "Run", "She", "Happy"], answer: "She", minLevel: 2, maxLevel: 4 },
    { q: "Pronoun for 'Tom and Jake'?", options: ["He", "She", "They", "It"], answer: "They", minLevel: 3, maxLevel: 5 },
    { q: "Pronoun for one boy?", options: ["She", "He", "They", "We"], answer: "He", minLevel: 2, maxLevel: 4 },
    { q: "Pronouns replace ___?", options: ["Adjectives", "Nouns", "Verbs", "Adverbs"], answer: "Nouns", minLevel: 3, maxLevel: 5 },
  ],
  sentences: [
    { q: "A sentence must begin with a ___?", options: ["full stop", "comma", "capital letter", "question mark"], answer: "capital letter", minLevel: 2, maxLevel: 5 },
    { q: "Which is a complete sentence?", options: ["running fast", "The dog barks.", "big red", "under the table"], answer: "The dog barks.", minLevel: 2, maxLevel: 5 },
    { q: "The 'doing' part of a sentence is the ___?", options: ["Subject", "Verb", "Object", "Adjective"], answer: "Verb", minLevel: 3, maxLevel: 6 },
    { q: "A sentence ends with?", options: ["comma", "capital letter", "full stop / ? / !", "nothing"], answer: "full stop / ? / !", minLevel: 2, maxLevel: 5 },
  ],
  tenses: [
    { q: "'I walked' is ___ tense.", options: ["past", "present", "future", "no tense"], answer: "past", minLevel: 6, maxLevel: 8 },
    { q: "'She will go' is ___ tense.", options: ["past", "present", "future", "perfect only"], answer: "future", minLevel: 6, maxLevel: 8 },
    { q: "'They play' is ___ tense.", options: ["past", "present", "future", "passive"], answer: "present", minLevel: 6, maxLevel: 8 },
    { q: "Tense tells us ___?", options: ["colour", "when something happens", "size", "shape"], answer: "when something happens", minLevel: 6, maxLevel: 9 },
  ],
  "active-passive": [
    { q: "Active voice: the subject ___ the action.", options: ["does", "receives only", "hides", "floats"], answer: "does", minLevel: 7, maxLevel: 9 },
    { q: "'The ball was kicked' is ___ voice.", options: ["active", "passive", "future", "plural"], answer: "passive", minLevel: 7, maxLevel: 10 },
    { q: "'Ravi eats rice' is ___ voice.", options: ["active", "passive", "question", "command"], answer: "active", minLevel: 7, maxLevel: 9 },
    { q: "Passive often uses 'was' or '___'?", options: ["is/am/are", "never", "only nouns", "colours"], answer: "is/am/are", minLevel: 8, maxLevel: 10 },
  ],
  prepositions: [
    { q: "'The cat is ___ the table' — under/on/in are ___?", options: ["prepositions", "verbs", "nouns", "adjectives"], answer: "prepositions", minLevel: 6, maxLevel: 8 },
    { q: "Which is a preposition?", options: ["run", "under", "happy", "she"], answer: "under", minLevel: 6, maxLevel: 8 },
    { q: "'At 5 o'clock' — 'at' shows ___?", options: ["time", "colour", "animal", "verb"], answer: "time", minLevel: 7, maxLevel: 9 },
    { q: "'In the box' — 'in' shows ___?", options: ["place", "taste", "number", "sound"], answer: "place", minLevel: 6, maxLevel: 8 },
  ],
  "reported-speech": [
    { q: "Reported speech tells what someone said ___ their exact words.", options: ["without", "only with", "never about", "in colour"], answer: "without", minLevel: 8, maxLevel: 10 },
    { q: "'He said that he was tired' is ___ speech.", options: ["reported", "active only", "noun", "preposition"], answer: "reported", minLevel: 8, maxLevel: 10 },
    { q: "Direct: 'I am fine.' Reported: He said he ___ fine.", options: ["was", "is always", "will never", "are"], answer: "was", minLevel: 9, maxLevel: 10 },
    { q: "We often change the tense ___ one step back.", options: ["forward", "back", "never", "randomly always"], answer: "back", minLevel: 9, maxLevel: 10 },
  ],
  "essay-writing": [
    { q: "An essay usually has introduction, body, and ___?", options: ["conclusion", "only title", "random list", "one word"], answer: "conclusion", minLevel: 9, maxLevel: 10 },
    { q: "The first paragraph often introduces the ___?", options: ["topic", "alphabet", "math sum", "weather only"], answer: "topic", minLevel: 9, maxLevel: 10 },
    { q: "Each body paragraph should focus on ___ main idea.", options: ["one", "fifty", "zero", "none ever"], answer: "one", minLevel: 9, maxLevel: 10 },
    { q: "A strong essay uses clear ___?", options: ["sentences", "only emojis", "blank pages", "no verbs"], answer: "sentences", minLevel: 9, maxLevel: 10 },
  ],
};

const TOPIC_POOLS: Record<string, Template[]> = {
  ...SCIENCE_TEMPLATES,
  ...ENGLISH_TEMPLATES,
};

export const MATH_PRACTICE_SUBJECTS = new Set<string>([
  "addition", "subtraction", "multiplication", "division", "fractions", "word-problems",
]);

export const TOPIC_PRACTICE_SUBJECTS = new Set<string>([
  ...MATH_PRACTICE_SUBJECTS,
  ...BASIC_MATH_EXTRA_PRACTICE_SUBJECTS,
  ...ADVANCED_MATH_PRACTICE_SUBJECTS,
  ...Object.keys(TOPIC_POOLS),
]);

export function isMathPracticeSubject(id: string): boolean {
  return MATH_PRACTICE_SUBJECTS.has(id)
    || isBasicMathExtraPracticeSubject(id)
    || isAdvancedMathPracticeSubject(id);
}

/** Basic math only (levels.ts generators + AI). */
export function isBasicMathPracticeSubject(id: string): boolean {
  return MATH_PRACTICE_SUBJECTS.has(id);
}

export function isTopicPracticeSubject(id: string): boolean {
  return TOPIC_PRACTICE_SUBJECTS.has(id);
}

/** Map a practice subject id back to its subject-pack id for attempt tracking. */
export function practicePackForSubject(practiceId: string): string {
  if (
    MATH_PRACTICE_SUBJECTS.has(practiceId)
    || isBasicMathExtraPracticeSubject(practiceId)
    || isAdvancedMathPracticeSubject(practiceId)
  ) return "math";
  if (practiceId in SCIENCE_TEMPLATES) return "science";
  if (practiceId in ENGLISH_TEMPLATES) return "english";
  return practiceId;
}

export interface PracticePickInput {
  level: Level;
  subject: string;
  country?: string | null;
  exclude?: string[] | Set<string>;
  count?: number;
  seed?: number;
}

export function pickTopicPracticeQuestions(input: PracticePickInput): SmartQuestion[] {
  const count = Math.max(1, Math.min(20, input.count ?? 5));
  const exclude = input.exclude instanceof Set
    ? input.exclude
    : new Set(input.exclude ?? []);
  const baseSeed = input.seed ?? Date.now();
  const r = rng(baseSeed ^ ((input.level * 0x9e37) + input.subject.length));
  const pool = TOPIC_POOLS[input.subject];
  if (!pool?.length) return [];

  const out: SmartQuestion[] = [];
  const localIds = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 8 + 16;
  while (out.length < count && attempts < maxAttempts) {
    attempts++;
    const q = pickFromPool(input.subject, input.level, pool, r, out.length);
    if (exclude.has(q.id) || localIds.has(q.id)) continue;
    localIds.add(q.id);
    out.push(q);
  }
  return out;
}

/** Unified picker — basic math, advanced math, or science/English topic pools. */
export function pickPracticeQuestions(input: PracticePickInput): SmartQuestion[] {
  if (isBasicMathPracticeSubject(input.subject)) {
    return pickAdaptiveQuestions({
      level: input.level,
      subject: input.subject as SmartSubjectId,
      country: input.country,
      exclude: input.exclude,
      count: input.count,
      seed: input.seed,
    });
  }
  if (isAdvancedMathPracticeSubject(input.subject)) {
    return pickAdvancedMathQuestions({
      level: input.level,
      subject: input.subject,
      exclude: input.exclude,
      count: input.count,
      seed: input.seed,
    });
  }
  if (isBasicMathExtraPracticeSubject(input.subject)) {
    return pickBasicMathExtraQuestions({
      level: input.level,
      subject: input.subject,
      exclude: input.exclude,
      count: input.count,
      seed: input.seed,
    });
  }
  return pickTopicPracticeQuestions(input);
}

export function lookupPracticeTitle(
  practiceId: string,
  mode: "basic" | "advanced" | "play",
): { packId: string; title: string; emoji: string } | null {
  const packId = practicePackForSubject(practiceId);
  const primary = mode === "advanced" ? ADVANCED_SUBJECTS : BASIC_SUBJECTS;
  const secondary = mode === "advanced" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const pack = primary.find((p) => p.id === packId) ?? secondary.find((p) => p.id === packId);
  if (!pack) {
    const smart = SMART_SUBJECTS.find((s) => s.id === practiceId);
    if (smart) return { packId: "math", title: smart.title, emoji: smart.emoji };
    return null;
  }
  const topic = pack.topics.find((t) => t.id === practiceId);
  if (topic) return { packId, title: topic.title, emoji: pack.emoji };
  const smart = SMART_SUBJECTS.find((s) => s.id === practiceId);
  if (smart) return { packId, title: smart.title, emoji: pack.emoji };
  return { packId, title: practiceId, emoji: pack.emoji };
}
