// ─── Phonics content (age-personalized) ──────────────────────────────────────
// Static reference data — letters and their sounds don't change.

export type PhonicsAgeGroup = "12_24m" | "2_3y" | "3_4y" | "4_5y" | "5_6y";

export type PhonicsItem = {
  id: string;
  symbol: string;        // displayed glyph (letter, syllable, word, sentence)
  sound: string;         // verbose TTS line ("B says buh, B for Ball")
  /**
   * Bare phoneme used by the Phonics learning UI in `mode: "phonics"` —
   * just the sound the letter makes, with no letter name and no example
   * word ("buh" not "B says buh, B for Ball"). NULL/absent for animal
   * sounds, sight words, sentences, stories — those keep using `sound`.
   */
  phoneme?: string;
  example?: string;      // example word (legacy single)
  /**
   * Optional 3–4 example words shown as small chips under the tile
   * (e.g. for "B": ["Ball","Bat","Banana"]). Letter rows only.
   */
  examples?: string[];
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
  label: "2–3 years • SATPIN Phonics",
  shortLabel: "SATPIN Phonics",
  description: "Learn letter sounds in SATPIN order so you can blend real words from the first group.",
  emoji: "🔤",
  focus: "Sounds → blend → read (not A–Z)",
  items: [
    // SATPIN Synthetic Phonics order — Group 1 first so children blend sat/pin/tap early.
    // Stable ids (bp-a …) preserve localStorage progress across the reorder.
    { id: "bp-s", symbol: "S", sound: "S says sss", phoneme: "s",   example: "Sun",     examples: ["Sun","Snake","Sock"],          emoji: "☀️" },
    { id: "bp-a", symbol: "A", sound: "A says a as in apple", phoneme: "a",   example: "Apple",   examples: ["Apple","Ant","Axe"],            emoji: "🍎" },
    { id: "bp-t", symbol: "T", sound: "T says t",   phoneme: "t",   example: "Tap",     examples: ["Tap","Tin","Top"],              emoji: "🚰" },
    { id: "bp-p", symbol: "P", sound: "P says p",   phoneme: "p",   example: "Pan",     examples: ["Pan","Pin","Pat"],              emoji: "🍳" },
    { id: "bp-i", symbol: "I", sound: "I says i as in igloo", phoneme: "i",  example: "Igloo",   examples: ["Igloo","Insect","In"],          emoji: "🧊" },
    { id: "bp-n", symbol: "N", sound: "N says nnn", phoneme: "n",   example: "Nest",    examples: ["Nest","Nip","Nut"],            emoji: "🪺" },
    { id: "bp-m", symbol: "M", sound: "M says mmm", phoneme: "m",   example: "Mat",     examples: ["Mat","Mango","Mum"],            emoji: "🧶" },
    { id: "bp-d", symbol: "D", sound: "D says d",   phoneme: "d",   example: "Dog",     examples: ["Dog","Dig","Door"],            emoji: "🐶" },
    { id: "bp-g", symbol: "G", sound: "G says g",   phoneme: "g",   example: "Goat",    examples: ["Goat","Got","Grape"],          emoji: "🐐" },
    { id: "bp-o", symbol: "O", sound: "O says o as in octopus", phoneme: "o", example: "Octopus", examples: ["Octopus","Ox","On"],           emoji: "🐙" },
    { id: "bp-c", symbol: "C", sound: "C says k",   phoneme: "k",   example: "Cat",     examples: ["Cat","Cot","Cup"],              emoji: "🐱" },
    { id: "bp-k", symbol: "K", sound: "K says k",   phoneme: "k",   example: "Kit",     examples: ["Kit","Kite","Key"],            emoji: "🪁" },
    { id: "bp-e", symbol: "E", sound: "E says e as in egg", phoneme: "e",    example: "Egg",     examples: ["Egg","Elephant","Elbow"],       emoji: "🥚" },
    { id: "bp-u", symbol: "U", sound: "U says u as in umbrella", phoneme: "u", example: "Umbrella", examples: ["Umbrella","Up","Under"],     emoji: "☂️" },
    { id: "bp-r", symbol: "R", sound: "R says rrr", phoneme: "r",   example: "Rat",     examples: ["Rat","Run","Ring"],            emoji: "🐀" },
    { id: "bp-h", symbol: "H", sound: "H says h",   phoneme: "h",   example: "Hat",     examples: ["Hat","Hop","Horse"],          emoji: "🎩" },
    { id: "bp-b", symbol: "B", sound: "B says b",   phoneme: "b",   example: "Ball",    examples: ["Ball","Bat","Bed"],            emoji: "⚽" },
    { id: "bp-f", symbol: "F", sound: "F says fff", phoneme: "f",   example: "Fish",    examples: ["Fish","Fan","Fog"],            emoji: "🐟" },
    { id: "bp-l", symbol: "L", sound: "L says lll", phoneme: "l",   example: "Lion",    examples: ["Lion","Log","Lip"],            emoji: "🦁" },
    { id: "bp-j", symbol: "J", sound: "J says j",   phoneme: "j",   example: "Jam",     examples: ["Jam","Jet","Jug"],             emoji: "🫙" },
    { id: "bp-v", symbol: "V", sound: "V says vvv", phoneme: "v",   example: "Van",     examples: ["Van","Vase","Violin"],          emoji: "🚐" },
    { id: "bp-w", symbol: "W", sound: "W says w",   phoneme: "w",   example: "Water",   examples: ["Water","Win","Wet"],          emoji: "💧" },
    { id: "bp-x", symbol: "X", sound: "X says ks",  phoneme: "x",   example: "Box",     examples: ["Box","Fox","Six"],              emoji: "📦" },
    { id: "bp-y", symbol: "Y", sound: "Y says y",   phoneme: "y",   example: "Yak",     examples: ["Yak","Yes","Yum"],              emoji: "🐂" },
    { id: "bp-z", symbol: "Z", sound: "Z says zzz", phoneme: "z",   example: "Zip",     examples: ["Zip","Zoo","Zebra"],          emoji: "🦓" },
    { id: "bp-q", symbol: "Q", sound: "Q says kw (with u)", phoneme: "q", example: "Quilt", examples: ["Quilt","Queen","Quick"], emoji: "👑" },
  ],
  features: {},
  parentTips: [
    "Letters are taught in SATPIN order (s,a,t,p,i,n…) — not A–Z — so children can blend words like sat and pin early.",
    "Say the SOUND (a short, crisp /b/), not the LETTER NAME ('bee') — and avoid adding 'uh' after it ('buh').",
    "After the first six sounds, practise blending: /s/+/a/+/t/ → sat.",
    "Show only 2–3 new letters per session. Quality > quantity at this age.",
  ],
};

// ─── 3–4 years: Blending ─────────────────────────────────────────────────────
const LEVEL_3_4Y: PhonicsLevel = {
  ageGroup: "3_4y",
  label: "3–4 years • Blending",
  shortLabel: "Blending",
  description: "Tap a word, hear each sound, then blend it together.",
  emoji: "🔗",
  focus: "Hear → blend → read",
  items: [
    // Group 1 SATPIN blends first
    { id: "bl-sat", symbol: "sat", sound: "sat", example: "s–a–t", emoji: "😋", hint: "Tap · then Blend" },
    { id: "bl-sit", symbol: "sit", sound: "sit", example: "s–i–t", emoji: "🪑", hint: "Tap · then Blend" },
    { id: "bl-pin", symbol: "pin", sound: "pin", example: "p–i–n", emoji: "📍", hint: "Tap · then Blend" },
    { id: "bl-pan", symbol: "pan", sound: "pan", example: "p–a–n", emoji: "🍳", hint: "Tap · then Blend" },
    { id: "bl-tap", symbol: "tap", sound: "tap", example: "t–a–p", emoji: "🚰", hint: "Tap · then Blend" },
    { id: "bl-pat", symbol: "pat", sound: "pat", example: "p–a–t", emoji: "👋", hint: "Tap · then Blend" },
    { id: "bl-nip", symbol: "nip", sound: "nip", example: "n–i–p", emoji: "✂️", hint: "Tap · then Blend" },
    { id: "bl-tin", symbol: "tin", sound: "tin", example: "t–i–n", emoji: "🥫", hint: "Tap · then Blend" },
    // Group 2
    { id: "bl-dog", symbol: "dog", sound: "dog", example: "d–o–g", emoji: "🐶", hint: "Tap · then Blend" },
    { id: "bl-cat", symbol: "cat", sound: "cat", example: "c–a–t", emoji: "🐱", hint: "Tap · then Blend" },
    { id: "bl-mat", symbol: "mat", sound: "mat", example: "m–a–t", emoji: "🧶", hint: "Tap · then Blend" },
    { id: "bl-mop", symbol: "mop", sound: "mop", example: "m–o–p", emoji: "🧹", hint: "Tap · then Blend" },
    { id: "bl-kit", symbol: "kit", sound: "kit", example: "k–i–t", emoji: "🧰", hint: "Tap · then Blend" },
    { id: "bl-cot", symbol: "cot", sound: "cot", example: "c–o–t", emoji: "🛏️", hint: "Tap · then Blend" },
    { id: "bl-pen", symbol: "pen", sound: "pen", example: "p–e–n", emoji: "🖊️", hint: "Tap · then Blend" },
    { id: "bl-cup", symbol: "cup", sound: "cup", example: "c–u–p", emoji: "🥤", hint: "Tap · then Blend" },
  ],
  features: { blending: true },
  parentTips: [
    "Tap the speaker first — your child hears just the word, not a long lesson.",
    "Then tap Blend: slow sounds first, then faster. One finger per sound helps.",
    "Two or three words per session is enough. Repeat favourites tomorrow.",
    "Stuck? Say the word together once, then let them try the blend button again.",
  ],
};

// ─── 4–5 years: Reading (decodable sentences — sight words gated to L7) ───────
const LEVEL_4_5Y: PhonicsLevel = {
  ageGroup: "4_5y",
  label: "4–5 years • Reading",
  shortLabel: "Reading",
  description: "Read short decodable sentences with rising confidence.",
  emoji: "📖",
  focus: "Read it → understand it → smile 😊",
  items: [
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

// ─── 5–6 years: Fluency (sight words + longer sentences) ─────────────────────
const LEVEL_5_6Y: PhonicsLevel = {
  ageGroup: "5_6y",
  label: "5–6 years • Fluency",
  shortLabel: "Fluency",
  description: "Read smoothly with expression and understanding.",
  emoji: "🚀",
  focus: "Read with feeling, not just words",
  items: [
    { id: "fl-the",  symbol: "the",  sound: "the",  example: "Sight word", emoji: "✨" },
    { id: "fl-and",  symbol: "and",  sound: "and",  example: "Sight word", emoji: "✨" },
    { id: "fl-is",   symbol: "is",   sound: "is",   example: "Sight word", emoji: "✨" },
    { id: "fl-it",   symbol: "it",   sound: "it",   example: "Sight word", emoji: "✨" },
    { id: "fl-to",   symbol: "to",   sound: "to",   example: "Sight word", emoji: "✨" },
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
