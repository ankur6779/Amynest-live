/**
 * Speakable phrases for Phonics Test mini-games (daily / weekly / practice).
 * Mirrors instruction + ttsText strings from phonicsTests question builders.
 */
import { QUIZ_PROMPT_TEXTS } from "./audio-catalog.js";
import { PHONICS_CURRICULUM_WORD_BANK } from "./curriculum-word-bank.js";

export type PhonicsTestStaticAudioMode = "default" | "phonics";

export type PhonicsTestStaticAudioEntry = {
  text: string;
  mode: PhonicsTestStaticAudioMode;
};

/** 12–24m animal / environment sounds — `prompt.ttsText` for animal_sound questions. */
export const PHONICS_TEST_ANIMAL_SOUNDS = [
  "Moo.",
  "Woof. Woof.",
  "Meow.",
  "Baa.",
  "Quack.",
  "Oink.",
  "Roar!",
  "Tweet tweet.",
  "Vroom vroom!",
  "Ding ding.",
] as const;

/** Bare phonemes from letter rows — `extractSound()` for sound_to_letter / identify. */
export const PHONICS_TEST_LETTER_PHONEMES = [
  "ah",
  "buh",
  "kuh",
  "duh",
  "eh",
  "fff",
  "guh",
  "huh",
  "ih",
  "juh",
  "lll",
  "mmm",
  "nnn",
  "oh",
  "puh",
  "kwuh",
  "rrr",
  "sss",
  "tuh",
  "uh",
  "vvv",
  "wuh",
  "ks",
  "yuh",
  "zzz",
] as const;

/** Digraph phonemes for 5–6y identify questions. */
export const PHONICS_TEST_DIGRAPH_PHONEMES = ["shhh", "chuh", "thhh", "wuh", "fff", "kuh"] as const;

/** Core CVC + word-bank symbols used as listening / build_word / missing_letter ttsText. */
export const PHONICS_TEST_WORD_TTS = [
  "cat",
  "bat",
  "hat",
  "mat",
  "pen",
  "bed",
  "pig",
  "pin",
  "dog",
  "pot",
  "cup",
  "bus",
  ...PHONICS_CURRICULUM_WORD_BANK,
] as const;

function pushUnique(
  out: PhonicsTestStaticAudioEntry[],
  seen: Set<string>,
  text: string,
  mode: PhonicsTestStaticAudioMode,
): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  const k = `${mode}\0${trimmed.toLowerCase()}`;
  if (seen.has(k)) return;
  seen.add(k);
  out.push({ text: trimmed, mode });
}

/**
 * Static-audio corpus entries for Phonics Test playback.
 * Test client calls TTS with `mode: "phonics"` — animal sounds and words must
 * exist under the phonics map, not only default.
 */
export function getPhonicsTestAudioEntriesForStaticCatalog(): PhonicsTestStaticAudioEntry[] {
  const out: PhonicsTestStaticAudioEntry[] = [];
  const seen = new Set<string>();

  for (const instruction of QUIZ_PROMPT_TEXTS) {
    pushUnique(out, seen, instruction, "default");
  }

  for (const sound of PHONICS_TEST_ANIMAL_SOUNDS) {
    pushUnique(out, seen, sound, "phonics");
  }

  for (const phoneme of [...PHONICS_TEST_LETTER_PHONEMES, ...PHONICS_TEST_DIGRAPH_PHONEMES]) {
    pushUnique(out, seen, phoneme, "phonics");
  }

  for (const word of PHONICS_TEST_WORD_TTS) {
    const w = word.trim().toLowerCase();
    if (!w) continue;
    pushUnique(out, seen, w, "phonics");
    pushUnique(out, seen, w, "default");
  }

  return out;
}

/** Flat text list (legacy helper). */
export function getPhonicsTestAudioTextsForStaticCatalog(): string[] {
  return getPhonicsTestAudioEntriesForStaticCatalog().map((e) => e.text);
}
