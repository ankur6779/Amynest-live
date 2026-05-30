import { getPhonemeClipIds } from "./audio-catalog.js";
import {
  DIGRAPHS,
  getPhonemeSequence,
  getPhonicsAudioPath,
  LETTER_SOUNDS,
} from "./dataset.js";
import { buildPhonicsElevenLabsPrompt } from "./phonics-generation.js";

/** Curated phoneme audio files — never runtime TTS. */
export const PHONEME_MAP: Record<string, string> = Object.fromEntries(
  [
    ...Object.values(LETTER_SOUNDS).map((e) => [e.audioKey, `${e.audioKey}.mp3`] as const),
    ...Object.values(DIGRAPHS).map((e) => [e.audioKey, `${e.audioKey}.mp3`] as const),
  ],
);

/** IPA / legacy phoneme keys → static audioKey. */
const PHONEME_IPA_TO_AUDIO_KEY: Record<string, string> = {
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
  j: "j",
  v: "v",
  w: "w",
  z: "z",
  æ: "a",
  ɛ: "e",
  ɪ: "i",
  ɒ: "o",
  ʌ: "u",
  ʃ: "sh",
  tʃ: "ch",
  θ: "th1",
  ŋ: "ng",
};

const DIGRAPH_KEY_ALIASES: Record<string, string> = {
  th: "th_unvoiced",
  th_unvoiced: "th_unvoiced",
  th_voiced: "th_voiced",
  ck: "c",
};

/** IndexedDB / prefetch cache key for a single phoneme file. */
export function getPhonicsLetterCacheKey(audioKey: string): string {
  return `phonics:${audioKey.trim().toLowerCase()}`;
}

/** Cache key for a full CVC blend sequence. */
export function getPhonicsCvcCacheKey(word: string): string {
  return `phonics:${word.trim().toLowerCase()}`;
}

/** All unique letter/digraph audio keys (phoneme clips). */
export function getAllPhonicsAudioKeys(): string[] {
  const fromMap = Object.keys(PHONEME_MAP);
  const fromCatalog = getPhonemeClipIds();
  return [...new Set([...fromMap, ...fromCatalog])].sort();
}

export function resolveGraphemeToAudioKey(grapheme: string): string | null {
  const raw = (grapheme ?? "").trim().toLowerCase();
  if (!raw) return null;

  const digraphAlias = DIGRAPH_KEY_ALIASES[raw];
  if (digraphAlias) {
    const dg = DIGRAPHS[digraphAlias];
    if (dg) return dg.audioKey;
  }

  if (LETTER_SOUNDS[raw]) return LETTER_SOUNDS[raw]!.audioKey;
  if (DIGRAPHS[raw]) return DIGRAPHS[raw]!.audioKey;

  const ipa = PHONEME_IPA_TO_AUDIO_KEY[raw];
  if (ipa && PHONEME_MAP[ipa]) return ipa;

  if (PHONEME_MAP[raw]) return raw;
  return null;
}

/** Resolve speak input (letter, phoneme, word chunk) to a static audioKey. */
export function resolvePhonicsAudioKey(input: {
  text?: string;
  phoneme?: string | null;
  letter?: string | null;
}): string | null {
  if (input.phoneme) {
    const fromPhoneme = resolveGraphemeToAudioKey(input.phoneme);
    if (fromPhoneme) return fromPhoneme;
  }

  const text = (input.text ?? input.letter ?? "").trim().toLowerCase();
  if (!text) return null;

  if (PHONEME_MAP[text]) return text;

  const single = resolveGraphemeToAudioKey(text);
  if (single) return single;

  if (text.length <= 2) {
    return resolveGraphemeToAudioKey(text);
  }

  // Instructional vowel lines ("a as in apple") → single static clip key.
  const asIn = text.match(/^([a-z]{1,2})\s+as\s+in\s+/i);
  if (asIn?.[1]) {
    const fromAsIn = resolveGraphemeToAudioKey(asIn[1].toLowerCase());
    if (fromAsIn) return fromAsIn;
  }

  return null;
}

/** Ordered audio keys for a CVC/blend word (phonemes only — no whole-word clip). */
export function resolvePhonicsSequenceKeys(word: string): string[] {
  const graphemes = getPhonemeSequence(word);
  const keys: string[] = [];
  for (const g of graphemes) {
    const key = resolveGraphemeToAudioKey(g);
    if (key) keys.push(key);
  }
  return keys;
}

export function getPhonicsPrompt(phoneme: string): string {
  return buildPhonicsElevenLabsPrompt(phoneme);
}

export { getPhonicsAudioPath };
