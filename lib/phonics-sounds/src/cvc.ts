/**
 * CVC word blending dataset — phoneme sequences (not letter names) for TTS.
 */

export type CvcWordEntry = {
  word: string;
  /** IPA-ish phoneme keys matching PHONEME_AUDIO (e.g. k, æ, t). */
  phonemes: string[];
  /** 1 = short-a family, 2 = mixed vowels, 3 = full pool / random practice */
  level: 1 | 2 | 3;
};

/** TTS lines for individual phonemes — never alphabet names. */
export const PHONEME_AUDIO: Record<string, string> = {
  k: "k",
  b: "b",
  m: "m",
  s: "s",
  p: "p",
  d: "d",
  l: "l",
  f: "f",
  h: "h",
  t: "t",
  g: "g",
  n: "n",
  r: "r",

  æ: "a as in apple",
  ɛ: "e as in egg",
  ɪ: "i as in igloo",
  ɒ: "o as in octopus",
  ʌ: "u as in umbrella",
};

/** Vowel phoneme → example word slug for GCS cache names. */
const VOWEL_PHONEME_EXAMPLE: Record<string, string> = {
  æ: "apple",
  ɛ: "egg",
  ɪ: "igloo",
  ɒ: "octopus",
  ʌ: "umbrella",
};

/** ASCII-safe IPA slug for object keys (æ → ae). */
const IPA_CACHE_SLUG: Record<string, string> = {
  æ: "ae",
  ɛ: "e",
  ɪ: "i",
  ɒ: "o",
  ʌ: "u",
};

export const CVC_WORDS: CvcWordEntry[] = [
  { word: "cat", phonemes: ["k", "æ", "t"], level: 1 },
  { word: "bat", phonemes: ["b", "æ", "t"], level: 1 },
  { word: "mat", phonemes: ["m", "æ", "t"], level: 1 },
  { word: "sat", phonemes: ["s", "æ", "t"], level: 1 },
  { word: "pat", phonemes: ["p", "æ", "t"], level: 1 },

  { word: "dog", phonemes: ["d", "ɒ", "g"], level: 2 },
  { word: "log", phonemes: ["l", "ɒ", "g"], level: 2 },
  { word: "fog", phonemes: ["f", "ɒ", "g"], level: 2 },

  { word: "pen", phonemes: ["p", "ɛ", "n"], level: 2 },
  { word: "hen", phonemes: ["h", "ɛ", "n"], level: 2 },
  { word: "ten", phonemes: ["t", "ɛ", "n"], level: 2 },

  { word: "sit", phonemes: ["s", "ɪ", "t"], level: 2 },
  { word: "hit", phonemes: ["h", "ɪ", "t"], level: 2 },

  { word: "cup", phonemes: ["k", "ʌ", "p"], level: 2 },
  { word: "sun", phonemes: ["s", "ʌ", "n"], level: 2 },

  // Level 3 — same words, used in random-order practice
  { word: "hat", phonemes: ["h", "æ", "t"], level: 3 },
  { word: "rat", phonemes: ["r", "æ", "t"], level: 3 },
  { word: "pig", phonemes: ["p", "ɪ", "g"], level: 3 },
  { word: "bed", phonemes: ["b", "ɛ", "d"], level: 3 },
  { word: "bus", phonemes: ["b", "ʌ", "s"], level: 3 },
];

const CVC_BY_WORD = new Map(CVC_WORDS.map((e) => [e.word.toLowerCase(), e]));

/** Grapheme letters shown in UI (c → a → t → cat). */
export function getCvcDisplayLetters(word: string): string[] {
  return word.trim().toLowerCase().split("");
}

export function getCvcWordEntry(word: string): CvcWordEntry | undefined {
  return CVC_BY_WORD.get(word.trim().toLowerCase());
}

export function getCvcWordsByLevel(level: 1 | 2 | 3): CvcWordEntry[] {
  if (level === 3) return getCvcWordsRandomOrder();
  return CVC_WORDS.filter((e) => e.level === level);
}

/** Level 3 practice: shuffled copy of all unique words. */
export function getCvcWordsRandomOrder(): CvcWordEntry[] {
  const seen = new Set<string>();
  const unique: CvcWordEntry[] = [];
  for (const e of CVC_WORDS) {
    if (seen.has(e.word)) continue;
    seen.add(e.word);
    unique.push(e);
  }
  return [...unique].sort(() => Math.random() - 0.5);
}

export function getPhonemeAudioText(phoneme: string): string {
  const key = (phoneme ?? "").trim();
  if (!key) return key;
  if (PHONEME_AUDIO[key]) return PHONEME_AUDIO[key];
  if (/ as in /i.test(key) || / sound$/i.test(key)) return key;
  return key;
}

/** Bare word for CVC finale (not "the word cat"). */
export function getCvcWordAudioText(word: string): string {
  return word.trim().toLowerCase();
}

/** GCS stem: phoneme_k, phoneme_æ_apple */
export function getPhonemeCacheFileName(phoneme: string): string {
  const key = (phoneme ?? "").trim();
  const example = VOWEL_PHONEME_EXAMPLE[key];
  if (example) {
    const ipaSlug = IPA_CACHE_SLUG[key] ?? key.replace(/[^a-z0-9]+/gi, "");
    return `phoneme_${ipaSlug}_${example}`;
  }
  const slug = key.replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "unknown";
  return `phoneme_${slug}`;
}

/** GCS stem: word_cat */
export function getCvcWordCacheFileName(word: string): string {
  const w = word.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `word_${w || "unknown"}`;
}

/** All phoneme + CVC word lines for static-audio pre-generation. */
export function getCvcPhonemeAudioTextsForStaticCatalog(): string[] {
  const lines = new Set<string>();
  for (const text of Object.values(PHONEME_AUDIO)) {
    lines.add(text);
  }
  for (const entry of CVC_WORDS) {
    lines.add(getCvcWordAudioText(entry.word));
  }
  return [...lines];
}
