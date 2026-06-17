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

const VOWEL_LETTERS = new Set(["a", "e", "i", "o", "u"]);

function letterAudioText(letter: string, sound: string, example: string): string {
  if (VOWEL_LETTERS.has(letter)) return `${letter} as in ${example}`;
  return sound.length <= 2 ? sound : `${letter} as in ${example}`;
}

export const PHONICS_SOUNDS: Record<string, PhonicsSoundEntry> = {
  a: { sound: "æ", example: "apple", audioText: letterAudioText("a", "æ", "apple") },
  b: { sound: "b", example: "bat", audioText: letterAudioText("b", "b", "bat") },
  c: { sound: "k", example: "cat", audioText: letterAudioText("c", "k", "cat") },
  d: { sound: "d", example: "dog", audioText: letterAudioText("d", "d", "dog") },
  e: { sound: "ɛ", example: "egg", audioText: letterAudioText("e", "ɛ", "egg") },
  f: { sound: "f", example: "fish", audioText: letterAudioText("f", "f", "fish") },
  g: { sound: "g", example: "goat", audioText: letterAudioText("g", "g", "goat") },
  h: { sound: "h", example: "hat", audioText: letterAudioText("h", "h", "hat") },
  i: { sound: "ɪ", example: "igloo", audioText: letterAudioText("i", "ɪ", "igloo") },
  j: { sound: "dʒ", example: "jam", audioText: letterAudioText("j", "j", "jam") },
  k: { sound: "k", example: "kite", audioText: letterAudioText("k", "k", "kite") },
  l: { sound: "l", example: "lion", audioText: letterAudioText("l", "l", "lion") },
  m: { sound: "m", example: "mat", audioText: letterAudioText("m", "m", "mat") },
  n: { sound: "n", example: "net", audioText: letterAudioText("n", "n", "net") },
  o: { sound: "ɒ", example: "octopus", audioText: letterAudioText("o", "ɒ", "octopus") },
  p: { sound: "p", example: "pen", audioText: letterAudioText("p", "p", "pen") },
  q: { sound: "kw", example: "queen", audioText: letterAudioText("q", "kw", "queen") },
  r: { sound: "r", example: "rat", audioText: letterAudioText("r", "r", "rat") },
  s: { sound: "s", example: "sun", audioText: letterAudioText("s", "s", "sun") },
  t: { sound: "t", example: "top", audioText: letterAudioText("t", "t", "top") },
  u: { sound: "ʌ", example: "umbrella", audioText: letterAudioText("u", "ʌ", "umbrella") },
  v: { sound: "v", example: "van", audioText: letterAudioText("v", "v", "van") },
  w: { sound: "w", example: "water", audioText: letterAudioText("w", "w", "water") },
  x: { sound: "ks", example: "box", audioText: letterAudioText("x", "ks", "box") },
  // P4 fix — y is the /j/ glide ("yak"). The bare "j" audioText made TTS speak
  // the /dʒ/ ("juh") sound of letter j; force the example form for clarity.
  y: { sound: "j", example: "yak", audioText: "y as in yak" },
  z: { sound: "z", example: "zebra", audioText: letterAudioText("z", "z", "zebra") },
};

/** Common digraphs taught in blending stages. */
export const PHONICS_DIGRAPH_SOUNDS: Record<string, PhonicsSoundEntry> = {
  sh: { sound: "ʃ", example: "ship", audioText: "sh" },
  ch: { sound: "tʃ", example: "chop", audioText: "ch" },
  th: { sound: "θ", example: "thumb", audioText: "th" },
  wh: { sound: "w", example: "whale", audioText: "wh" },
  ph: { sound: "f", example: "phone", audioText: "ph" },
  ng: { sound: "ŋ", example: "ring", audioText: "ng" },
  ck: { sound: "k", example: "duck", audioText: "ck" },
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

/** Canonical TTS phrase for phonics tiles — same key on Web, Android PWA, and iOS. */
export function resolvePhonicsPlaybackText(input: {
  symbol: string;
  phoneme?: string | null;
  sound?: string;
}): string {
  const key = resolvePhonicsLetterFromSymbol(input.symbol, input.phoneme ?? null);
  if (key) return getPhonicsAudioText(key);
  if (input.phoneme) return getPhonicsAudioText(input.phoneme);
  const sound = (input.sound ?? "").trim();
  if (/ as in /i.test(sound)) return sound;
  return sound || input.symbol.trim();
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

export * from "./curriculum-word-bank.js";
export * from "./phonics-text.js";
export * from "./cvc.js";
export * from "./dataset.js";
export * from "./phoneme-map.js";
export * from "./phonics-generation.js";
export * from "./phonics-generation-modes.js";
export * from "./audio-standards.js";
export * from "./audio-review-spec.js";
export * from "./phoneme-registry.js";
export * from "./phonics-quality.js";
export * from "./phonics-audio-master.js";
export * from "./phonics-audio-demos.js";
export * from "./gcs-paths.js";
export * from "./audio-catalog.js";
export * from "./phonics-audio-inventory.js";
export * from "./phonics-test-audio.js";
export { playCvcBlend, type CvcBlendPhase, type CvcBlendSpeakFn, type PlayCvcBlendOptions } from "./cvc-blend.js";
