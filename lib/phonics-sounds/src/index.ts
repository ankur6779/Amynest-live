/**
 * Canonical phonics letter → phoneme audio lines for TTS and static-audio cache.
 * Always use `audioText` (e.g. "a as in apple"), never bare letter names.
 */

export type PhonicsSoundEntry = {
  /** IPA-ish label for docs / tooling (not sent to TTS). */
  sound: string;
  example: string;
  /** Exact phrase sent to OpenAI TTS / static-audio catalog. */
  audioText: string;
};

export const PHONICS_SOUNDS: Record<string, PhonicsSoundEntry> = {
  a: { sound: "æ", example: "apple", audioText: "a as in apple" },
  b: { sound: "b", example: "bat", audioText: "b as in bat" },
  c: { sound: "k", example: "cat", audioText: "c as in cat" },
  d: { sound: "d", example: "dog", audioText: "d as in dog" },
  e: { sound: "ɛ", example: "egg", audioText: "e as in egg" },
  f: { sound: "f", example: "fish", audioText: "f as in fish" },
  g: { sound: "g", example: "goat", audioText: "g as in goat" },
  h: { sound: "h", example: "hat", audioText: "h as in hat" },
  i: { sound: "ɪ", example: "igloo", audioText: "i as in igloo" },
  j: { sound: "dʒ", example: "jam", audioText: "j as in jam" },
  k: { sound: "k", example: "kite", audioText: "k as in kite" },
  l: { sound: "l", example: "lion", audioText: "l as in lion" },
  m: { sound: "m", example: "mat", audioText: "m as in mat" },
  n: { sound: "n", example: "net", audioText: "n as in net" },
  o: { sound: "ɒ", example: "octopus", audioText: "o as in octopus" },
  p: { sound: "p", example: "pen", audioText: "p as in pen" },
  q: { sound: "kw", example: "queen", audioText: "q as in queen" },
  r: { sound: "r", example: "rat", audioText: "r as in rat" },
  s: { sound: "s", example: "sun", audioText: "s as in sun" },
  t: { sound: "t", example: "top", audioText: "t as in top" },
  u: { sound: "ʌ", example: "umbrella", audioText: "u as in umbrella" },
  v: { sound: "v", example: "van", audioText: "v as in van" },
  w: { sound: "w", example: "water", audioText: "w as in water" },
  x: { sound: "ks", example: "box", audioText: "x as in box" },
  y: { sound: "j", example: "yak", audioText: "y as in yak" },
  z: { sound: "z", example: "zebra", audioText: "z as in zebra" },
};

/** Common digraphs taught in blending stages. */
export const PHONICS_DIGRAPH_SOUNDS: Record<string, PhonicsSoundEntry> = {
  sh: { sound: "ʃ", example: "ship", audioText: "sh as in ship" },
  ch: { sound: "tʃ", example: "chop", audioText: "ch as in chop" },
  th: { sound: "θ", example: "thumb", audioText: "th as in thumb" },
  wh: { sound: "w", example: "whale", audioText: "wh as in whale" },
  ph: { sound: "f", example: "phone", audioText: "ph as in phone" },
  ng: { sound: "ŋ", example: "ring", audioText: "ng as in ring" },
  ck: { sound: "k", example: "duck", audioText: "ck as in duck" },
};

/** Legacy bare-phoneme spellings → letter key (kidschedule + API historical). */
const LEGACY_PHONEME_TO_LETTER: Record<string, string> = {
  ah: "a",
  buh: "b",
  kuh: "c",
  duh: "d",
  eh: "e",
  fff: "f",
  guh: "g",
  huh: "h",
  ih: "i",
  juh: "j",
  lll: "l",
  mmm: "m",
  nnn: "n",
  oh: "o",
  puh: "p",
  kwuh: "q",
  rrr: "r",
  sss: "s",
  tuh: "t",
  uh: "u",
  vvv: "v",
  wuh: "w",
  ks: "x",
  yuh: "y",
  zzz: "z",
  shhh: "sh",
  chuh: "ch",
  thhh: "th",
  ng: "ng",
};

const ALL_SOUNDS: Record<string, PhonicsSoundEntry> = {
  ...PHONICS_SOUNDS,
  ...PHONICS_DIGRAPH_SOUNDS,
};

/** Normalize user/API input to a single letter or digraph key. */
export function normalizePhonicsLetterKey(input: string): string | null {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) return null;

  if (Object.prototype.hasOwnProperty.call(ALL_SOUNDS, raw)) return raw;

  if (LEGACY_PHONEME_TO_LETTER[raw]) return LEGACY_PHONEME_TO_LETTER[raw];

  const asIn = raw.match(/^([a-z]{1,2})\s+as\s+in\s+/i);
  if (asIn?.[1] && ALL_SOUNDS[asIn[1].toLowerCase()]) return asIn[1].toLowerCase();

  const says = raw.match(/^([a-z])\s+says\s+/i);
  if (says?.[1] && ALL_SOUNDS[says[1].toLowerCase()]) return says[1].toLowerCase();

  if (raw.length === 1 && /[a-z]/.test(raw)) return raw;

  return null;
}

/** Resolve tile symbol + optional legacy phoneme to a catalog key. */
export function resolvePhonicsLetterFromSymbol(
  symbol: string,
  phoneme?: string | null,
): string | null {
  const fromSymbol = normalizePhonicsLetterKey(symbol);
  if (fromSymbol) return fromSymbol;
  if (phoneme) return normalizePhonicsLetterKey(phoneme);
  return null;
}

/**
 * TTS phrase for a letter, digraph, or legacy phoneme string.
 * Pass-through if already an "as in" instructional line.
 */
export function getPhonicsAudioText(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return trimmed;

  if (/ as in /i.test(trimmed)) return trimmed;

  const key = normalizePhonicsLetterKey(trimmed);
  if (key && ALL_SOUNDS[key]) return ALL_SOUNDS[key].audioText;

  return trimmed;
}

/** GCS-friendly filename stem: phonics_a_apple */
export function getPhonicsCacheFileName(letterKey: string): string {
  const key = normalizePhonicsLetterKey(letterKey);
  const entry = key ? ALL_SOUNDS[key] : null;
  if (!entry) {
    const slug = letterKey.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    return `phonics_unknown_${slug}`;
  }
  const exampleSlug = entry.example.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  return `phonics_${key}_${exampleSlug}`;
}

/** All phonics-mode static-audio phrases (unique). */
export function getPhonicsAudioTextsForStaticCatalog(): string[] {
  const lines = new Set<string>();
  for (const entry of Object.values(ALL_SOUNDS)) {
    lines.add(entry.audioText);
  }
  return [...lines];
}

/** Map letter key → audioText (replaces bare PHONEME_PROMPTS for API). */
export function getPhonicsAudioTextByLetter(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(ALL_SOUNDS)) {
    out[key] = entry.audioText;
  }
  return out;
}

/** Full word line for blend finale (e.g. "cat"). */
export function getPhonicsWordAudioText(word: string): string {
  const w = word.trim().toLowerCase();
  if (!w) return w;
  return `the word ${w}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export * from "./cvc.js";
export { playCvcBlend, type CvcBlendPhase, type CvcBlendSpeakFn, type PlayCvcBlendOptions } from "./cvc-blend.js";
