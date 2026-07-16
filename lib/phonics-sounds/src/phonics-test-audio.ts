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

/**
 * Sound lines from letter rows — `extractSound()` for sound_to_letter / identify.
 * "X as in word" lines resolve to curated pure-phoneme clips in phonics mode.
 * Legacy schwa labels ("buh") are kept only for rows seeded before 2026-07.
 */
export const PHONICS_TEST_LETTER_PHONEMES = [
  "a as in apple",
  "b as in ball",
  "c as in cat",
  "d as in dog",
  "e as in egg",
  "f as in fish",
  "g as in goat",
  "h as in hat",
  "i as in igloo",
  "j as in jug",
  "k as in kite",
  "l as in lion",
  "m as in mat",
  "n as in nest",
  "o as in octopus",
  "p as in pig",
  "q as in queen",
  "r as in rat",
  "s as in sun",
  "t as in tap",
  "u as in umbrella",
  "v as in van",
  "w as in water",
  "x as in box",
  "y as in yak",
  "z as in zebra",
  // Legacy pre-2026-07 seeded labels (still resolvable in older DB rows).
  "ah", "buh", "kuh", "duh", "eh", "fff", "guh", "huh", "ih", "juh", "lll",
  "mmm", "nnn", "oh", "puh", "kwuh", "rrr", "sss", "tuh", "uh", "vvv", "wuh",
  "ks", "yuh", "zzz",
] as const;

/** Digraph sound lines for 5–6y identify questions (+ legacy labels). */
export const PHONICS_TEST_DIGRAPH_PHONEMES = [
  "sh as in ship",
  "ch as in chip",
  "th as in thin",
  "wh as in whip",
  "ng as in ring",
  "ck as in duck",
  "qu as in quilt",
  "ph as in phone",
  // Legacy pre-2026-07 seeded labels.
  "shhh", "chuh", "thhh", "wuh", "fff", "kuh",
] as const;

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
