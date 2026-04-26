// ─── Phonics content (age-personalized) ──────────────────────────────────────
// Static reference data — letters and their sounds don't change.

export type PhonicsAgeGroup = "12_24m" | "2_3y" | "3_4y" | "4_5y" | "5_6y";

export type PhonicsItem = {
  id: string;
  symbol: string;        // displayed glyph (letter, syllable, word, sentence)
  sound: string;         // what the TTS will say (the phonetic sound)
  example?: string;      // example word
  emoji?: string;        // visual aid
  hint?: string;         // small caption shown under the tile
};

export type PhonicsLevel = {
  ageGroup: PhonicsAgeGroup;
  label: string;
  shortLabel: string;
  description: string;
  emoji: string;
  /** What the child should actually be DOING at this stage */
  focus: string;
  items: PhonicsItem[];
  /** Higher-order activities unlocked at this stage */
  features: {
    blending?: boolean;
    sentenceReading?: boolean;
    sightWords?: boolean;
  };
  /** Practical tips to show in the Parent Tips card */
  parentTips: string[];
};

// ─── 12–24 months: Sound awareness ───────────────────────────────────────────
const LEVEL_12_24M: PhonicsLevel = {
  ageGroup: "12_24m",
  label: "12–24 months • Sound Awareness",
  shortLabel: "Sound Awareness",
  description: "Listen, mimic and recognise familiar sounds — the foundation of phonics.",
  emoji: "👂",
  focus: "Hear it → mimic it → giggle 🎉",
  items: [
    { id: "sa-ba", symbol: "Ba",  sound: "Ba",       emoji: "👶", hint: "Baby sound" },
    { id: "sa-ma", symbol: "Ma",  sound: "Ma",       emoji: "🤱", hint: "Mama" },
    { id: "sa-da", symbol: "Da",  sound: "Da",       emoji: "👨",  hint: "Dada" },
    { id: "sa-pa", symbol: "Pa",  sound: "Pa",       emoji: "🧓", hint: "Papa" },
    { id: "sa-na", symbol: "Na",  sound: "Na",       emoji: "🙅", hint: "No-no" },
    { id: "sa-moo", symbol: "Moo", sound: "Moo",     emoji: "🐄", hint: "Cow says…" },
    { id: "sa-baa", symbol: "Baa", sound: "Baa",     emoji: "🐑", hint: "Sheep says…" },
    { id: "sa-woof", symbol: "Woof", sound: "Woof",  emoji: "🐶", hint: "Dog says…" },
    { id: "sa-meow", symbol: "Meow", sound: "Meow",  emoji: "🐱", hint: "Cat says…" },
    { id: "sa-quack", symbol: "Quack", sound: "Quack", emoji: "🦆", hint: "Duck says…" },
  ],
  features: {},
  parentTips: [
    "Repeat the same sound 3–4 times slowly — repetition wires the brain.",
    "Pair every sound with a hand action or a hug — multi-sensory memory.",
    "Talk to baby ALL day — narrate what you're doing. Quantity of words matters most now.",
    "When baby babbles back, respond! It builds the conversational rhythm.",
  ],
};

// ─── 2–3 years: Basic phonics ────────────────────────────────────────────────
const LEVEL_2_3Y: PhonicsLevel = {
  ageGroup: "2_3y",
  label: "2–3 years • Basic Phonics",
  shortLabel: "Basic Phonics",
  description: "Learn each letter's true sound (not just its name) with a picture clue.",
  emoji: "🔤",
  focus: "One letter, one sound, one picture",
  items: [
    { id: "bp-a", symbol: "A", sound: "A says ah",  example: "Apple",   emoji: "🍎" },
    { id: "bp-b", symbol: "B", sound: "B says buh", example: "Ball",    emoji: "⚽" },
    { id: "bp-c", symbol: "C", sound: "C says kuh", example: "Cat",     emoji: "🐱" },
    { id: "bp-d", symbol: "D", sound: "D says duh", example: "Dog",     emoji: "🐶" },
    { id: "bp-e", symbol: "E", sound: "E says eh",  example: "Egg",     emoji: "🥚" },
    { id: "bp-f", symbol: "F", sound: "F says fff", example: "Fish",    emoji: "🐟" },
    { id: "bp-g", symbol: "G", sound: "G says guh", example: "Goat",    emoji: "🐐" },
    { id: "bp-h", symbol: "H", sound: "H says huh", example: "Hat",     emoji: "🎩" },
    { id: "bp-i", symbol: "I", sound: "I says ih",  example: "Igloo",   emoji: "🧊" },
    { id: "bp-j", symbol: "J", sound: "J says juh", example: "Jug",     emoji: "🫙" },
  ],
  features: {},
  parentTips: [
    "Say the SOUND ('buh'), not the LETTER NAME ('bee') — this is real phonics.",
    "Show only 2–3 letters per session. Quality > quantity at this age.",
    "Trace the letter in flour, sand, or with a finger on the back — touch helps memory.",
    "Praise the effort, not the result. 'You tried!' is more powerful than 'Correct!'",
  ],
};

// ─── 3–4 years: Blending ─────────────────────────────────────────────────────
const LEVEL_3_4Y: PhonicsLevel = {
  ageGroup: "3_4y",
  label: "3–4 years • Blending",
  shortLabel: "Blending",
  description: "Blend three sounds into a real word — the magic of reading begins!",
  emoji: "🔗",
  focus: "c–a–t → cat",
  items: [
    { id: "bl-cat", symbol: "cat", sound: "c. a. t. cat.", example: "c–a–t", emoji: "🐱" },
    { id: "bl-bat", symbol: "bat", sound: "b. a. t. bat.", example: "b–a–t", emoji: "🦇" },
    { id: "bl-hat", symbol: "hat", sound: "h. a. t. hat.", example: "h–a–t", emoji: "🎩" },
    { id: "bl-pen", symbol: "pen", sound: "p. e. n. pen.", example: "p–e–n", emoji: "🖊️" },
    { id: "bl-bus", symbol: "bus", sound: "b. u. s. bus.", example: "b–u–s", emoji: "🚌" },
    { id: "bl-sun", symbol: "sun", sound: "s. u. n. sun.", example: "s–u–n", emoji: "☀️" },
    { id: "bl-dog", symbol: "dog", sound: "d. o. g. dog.", example: "d–o–g", emoji: "🐶" },
    { id: "bl-cup", symbol: "cup", sound: "c. u. p. cup.", example: "c–u–p", emoji: "🥤" },
    { id: "bl-pig", symbol: "pig", sound: "p. i. g. pig.", example: "p–i–g", emoji: "🐷" },
    { id: "bl-bed", symbol: "bed", sound: "b. e. d. bed.", example: "b–e–d", emoji: "🛏️" },
  ],
  features: { blending: true },
  parentTips: [
    "Stretch the sounds slowly: 'caaa–aaa–t' then say it fast: 'cat!'",
    "Use your fingers — one finger per sound. It makes blending visible.",
    "Celebrate every successful blend with a high-five. Confidence drives reading.",
    "If your child is stuck, say the word and let them repeat — don't rush.",
  ],
};

// ─── 4–5 years: Reading ──────────────────────────────────────────────────────
const LEVEL_4_5Y: PhonicsLevel = {
  ageGroup: "4_5y",
  label: "4–5 years • Reading",
  shortLabel: "Reading",
  description: "Read short words and tiny sentences with rising confidence.",
  emoji: "📖",
  focus: "Read it → understand it → smile 😊",
  items: [
    { id: "rd-the",  symbol: "the",  sound: "the",  example: "Sight word", emoji: "✨" },
    { id: "rd-and",  symbol: "and",  sound: "and",  example: "Sight word", emoji: "✨" },
    { id: "rd-is",   symbol: "is",   sound: "is",   example: "Sight word", emoji: "✨" },
    { id: "rd-it",   symbol: "it",   sound: "it",   example: "Sight word", emoji: "✨" },
    { id: "rd-to",   symbol: "to",   sound: "to",   example: "Sight word", emoji: "✨" },
    { id: "rd-s1",   symbol: "The cat is fat.", sound: "The cat is fat.", example: "Sentence", emoji: "🐱" },
    { id: "rd-s2",   symbol: "I see a dog.",    sound: "I see a dog.",    example: "Sentence", emoji: "🐶" },
    { id: "rd-s3",   symbol: "It is a red bus.", sound: "It is a red bus.", example: "Sentence", emoji: "🚌" },
    { id: "rd-s4",   symbol: "Mum and Dad.",     sound: "Mum and Dad.",    example: "Sentence", emoji: "👨‍👩‍👧" },
    { id: "rd-s5",   symbol: "The sun is hot.",  sound: "The sun is hot.", example: "Sentence", emoji: "☀️" },
  ],
  features: { blending: true, sentenceReading: true, sightWords: true },
  parentTips: [
    "Sight words can't be sounded out — recognise them on sight, like logos.",
    "Read together with a finger pointing at each word. Eye-tracking matters.",
    "Re-reading the same book builds fluency. Don't worry if it's the 50th time!",
    "Ask 'What just happened?' after a sentence — comprehension > speed.",
  ],
};

// ─── 5–6 years: Fluency ──────────────────────────────────────────────────────
const LEVEL_5_6Y: PhonicsLevel = {
  ageGroup: "5_6y",
  label: "5–6 years • Fluency",
  shortLabel: "Fluency",
  description: "Read smoothly with expression and understanding.",
  emoji: "🚀",
  focus: "Read with feeling, not just words",
  items: [
    { id: "fl-s1", symbol: "The big brown dog ran fast.",         sound: "The big brown dog ran fast.",         example: "Sentence", emoji: "🐕" },
    { id: "fl-s2", symbol: "I like to play in the park.",         sound: "I like to play in the park.",         example: "Sentence", emoji: "🛝" },
    { id: "fl-s3", symbol: "My mum makes the best food.",         sound: "My mum makes the best food.",         example: "Sentence", emoji: "🍲" },
    { id: "fl-s4", symbol: "We went to school on the bus.",       sound: "We went to school on the bus.",       example: "Sentence", emoji: "🚌" },
    { id: "fl-s5", symbol: "The little bird flew up to the sky.", sound: "The little bird flew up to the sky.", example: "Sentence", emoji: "🐦" },
    { id: "fl-s6", symbol: "Can you help me find my book?",       sound: "Can you help me find my book?",       example: "Question", emoji: "📚" },
    { id: "fl-s7", symbol: "I love my baby sister.",              sound: "I love my baby sister.",              example: "Sentence", emoji: "👶" },
    { id: "fl-s8", symbol: "Wow, look at the rainbow!",           sound: "Wow, look at the rainbow!",           example: "Exclamation", emoji: "🌈" },
  ],
  features: { blending: true, sentenceReading: true, sightWords: true },
  parentTips: [
    "Encourage expression: question marks rise, exclamations are LOUD!",
    "Take turns reading — one sentence each. Modelling matters.",
    "Discuss the story, characters, feelings — comprehension is the real goal.",
    "Time short reading sessions occasionally. Improvement is motivating.",
  ],
};

// ─── Public API ──────────────────────────────────────────────────────────────

export const PHONICS_LEVELS: Record<PhonicsAgeGroup, PhonicsLevel> = {
  "12_24m": LEVEL_12_24M,
  "2_3y":   LEVEL_2_3Y,
  "3_4y":   LEVEL_3_4Y,
  "4_5y":   LEVEL_4_5Y,
  "5_6y":   LEVEL_5_6Y,
};

/**
 * Map a child's total age (in months) to the correct phonics level.
 * Returns null if the child is outside the supported range (12m – 6y).
 */
export function getPhonicsAgeGroup(totalAgeMonths: number): PhonicsAgeGroup | null {
  if (totalAgeMonths < 12) return null;
  if (totalAgeMonths < 24) return "12_24m";
  if (totalAgeMonths < 36) return "2_3y";
  if (totalAgeMonths < 48) return "3_4y";
  if (totalAgeMonths < 60) return "4_5y";
  if (totalAgeMonths < 72) return "5_6y";
  return null;
}

export function getPhonicsLevel(totalAgeMonths: number): PhonicsLevel | null {
  const group = getPhonicsAgeGroup(totalAgeMonths);
  return group ? PHONICS_LEVELS[group] : null;
}
