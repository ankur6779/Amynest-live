import {
  getCvcWordEntry,
  getPhonemeAudioText,
  getCvcWordAudioText,
  PHONEME_AUDIO,
} from "./cvc.js";

export type PhonicsTextType = "phoneme" | "blend" | "word";

const VOWEL_IPA = new Set(["æ", "ɛ", "ɪ", "ɒ", "ʌ"]);

/** Instructional line for a phoneme key (vowel = "a as in apple", consonant = short "k"). */
export function formatPhonemeLine(phoneme: string): string {
  const key = (phoneme ?? "").trim();
  if (!key) return key;
  if (key === "æ" || key === "a") return "a as in apple";
  if (PHONEME_AUDIO[key]) return PHONEME_AUDIO[key];
  if (/ as in /i.test(key)) return key;
  if (VOWEL_IPA.has(key)) return getPhonemeAudioText(key);
  return key.length <= 2 ? key : getPhonemeAudioText(key);
}

/** Blend line: "k...a...t... cat" */
export function formatBlendLine(word: string): string {
  const entry = getCvcWordEntry(word);
  if (!entry) return word.trim().toLowerCase();
  const parts = entry.phonemes.map((p) => formatPhonemeLine(p));
  return `${parts.join("... ")}... ${entry.word}`;
}

/**
 * Single formatter for all phonics TTS input.
 * Vowels → "a as in apple"; consonants → "k"; blends → segmented line; words → bare word.
 */
export function getPhonicsText(type: PhonicsTextType, input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return raw;

  switch (type) {
    case "phoneme":
      return formatPhonemeLine(raw);
    case "blend":
      return formatBlendLine(raw);
    case "word":
      return getCvcWordAudioText(raw);
    default:
      return raw;
  }
}

/** GCS stem: blend_cat */
export function getBlendCacheFileName(word: string): string {
  const w = word.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `blend_${w || "unknown"}`;
}
