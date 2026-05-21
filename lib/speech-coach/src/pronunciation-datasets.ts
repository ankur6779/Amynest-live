// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — pronunciation practice datasets (letters, fallbacks)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PronouncePrompt,
  PronouncePromptDifficulty,
  PronouncePromptKind,
  SpeechAgeBand,
} from "./types";

const HINT = (kind: string): string =>
  `screens.speech_coach.prompts.hint.${kind}`;

/** Every age band — letter practice is always available. */
export const ALL_SPEECH_AGE_BANDS: readonly SpeechAgeBand[] = [
  "infant",
  "1y",
  "2y",
  "3y",
  "4y_plus",
] as const;

export type LetterDatasetEntry = {
  text: string;
  phonics: string;
  level: PronouncePromptDifficulty;
};

/** Full A–Z letter set with phoneme-style TTS lines (not letter names). */
export const LETTERS_DATA: readonly LetterDatasetEntry[] = [
  { text: "a", phonics: "a as in apple", level: "easy" },
  { text: "b", phonics: "b", level: "easy" },
  { text: "c", phonics: "k", level: "easy" },
  { text: "d", phonics: "d", level: "easy" },
  { text: "e", phonics: "e as in egg", level: "easy" },
  { text: "f", phonics: "f", level: "easy" },
  { text: "g", phonics: "g", level: "easy" },
  { text: "h", phonics: "h", level: "easy" },
  { text: "i", phonics: "i as in igloo", level: "easy" },
  { text: "j", phonics: "j", level: "easy" },
  { text: "k", phonics: "k", level: "easy" },
  { text: "l", phonics: "l", level: "easy" },
  { text: "m", phonics: "m", level: "easy" },
  { text: "n", phonics: "n", level: "easy" },
  { text: "o", phonics: "o as in octopus", level: "easy" },
  { text: "p", phonics: "p", level: "easy" },
  { text: "q", phonics: "kw", level: "easy" },
  { text: "r", phonics: "r", level: "easy" },
  { text: "s", phonics: "s", level: "easy" },
  { text: "t", phonics: "t", level: "easy" },
  { text: "u", phonics: "u as in umbrella", level: "easy" },
  { text: "v", phonics: "v", level: "easy" },
  { text: "w", phonics: "w", level: "easy" },
  { text: "x", phonics: "ks", level: "easy" },
  { text: "y", phonics: "y", level: "easy" },
  { text: "z", phonics: "z", level: "easy" },
] as const;

function letterToPrompt(entry: LetterDatasetEntry): PronouncePrompt {
  const upper = entry.text.toUpperCase();
  return {
    id: `L_${upper}`,
    kind: "letter",
    text: upper,
    speakText: entry.phonics,
    ageBands: ALL_SPEECH_AGE_BANDS,
    i18nKeyHint: HINT("letter"),
    difficulty: entry.level,
  };
}

/** Canonical A–Z letter prompts (all ages, phonics TTS). */
export const LETTER_PRONUNCIATION_PROMPTS: readonly PronouncePrompt[] =
  LETTERS_DATA.map(letterToPrompt);

const phonicsLookup = new Map(
  LETTERS_DATA.map((e) => [e.text.toLowerCase(), e.phonics]),
);

/** TTS line for a prompt — letters use phonics, not the displayed glyph. */
export function getPromptSpeakText(prompt: PronouncePrompt): string {
  if (prompt.speakText?.trim()) return prompt.speakText.trim();
  if (prompt.kind === "letter") {
    const phonics = phonicsLookup.get(prompt.text.toLowerCase());
    if (phonics) return phonics;
  }
  return prompt.text;
}

/** Default pool per category when band/difficulty filters would otherwise be empty. */
export function getDefaultPromptsForKind(
  kind: PronouncePromptKind,
): readonly PronouncePrompt[] {
  return DEFAULT_PROMPTS_BY_KIND[kind];
}

const DEFAULT_PROMPTS_BY_KIND: Readonly<
  Record<PronouncePromptKind, readonly PronouncePrompt[]>
> = {
  letter: LETTER_PRONUNCIATION_PROMPTS,
  phonic: [
    {
      id: "P_ma",
      kind: "phonic",
      text: "ma",
      speakText: "ma",
      ageBands: ALL_SPEECH_AGE_BANDS,
      i18nKeyHint: HINT("phonic"),
      difficulty: "easy",
    },
    {
      id: "P_pa",
      kind: "phonic",
      text: "pa",
      speakText: "pa",
      ageBands: ALL_SPEECH_AGE_BANDS,
      i18nKeyHint: HINT("phonic"),
      difficulty: "easy",
    },
    {
      id: "P_ba",
      kind: "phonic",
      text: "ba",
      speakText: "ba",
      ageBands: ALL_SPEECH_AGE_BANDS,
      i18nKeyHint: HINT("phonic"),
      difficulty: "easy",
    },
    {
      id: "P_ah",
      kind: "phonic",
      text: "ah",
      speakText: "ah",
      ageBands: ALL_SPEECH_AGE_BANDS,
      i18nKeyHint: HINT("phonic"),
      difficulty: "easy",
    },
  ],
  word: [
    {
      id: "W_mama",
      kind: "word",
      text: "mama",
      ageBands: ALL_SPEECH_AGE_BANDS,
      i18nKeyHint: HINT("word"),
      difficulty: "easy",
    },
    {
      id: "W_ball",
      kind: "word",
      text: "ball",
      ageBands: ALL_SPEECH_AGE_BANDS,
      i18nKeyHint: HINT("word"),
      difficulty: "easy",
    },
    {
      id: "W_cat",
      kind: "word",
      text: "cat",
      ageBands: ALL_SPEECH_AGE_BANDS,
      i18nKeyHint: HINT("word"),
      difficulty: "easy",
    },
    {
      id: "W_dog",
      kind: "word",
      text: "dog",
      ageBands: ALL_SPEECH_AGE_BANDS,
      i18nKeyHint: HINT("word"),
      difficulty: "easy",
    },
  ],
  sentence: [
    {
      id: "S_i_see",
      kind: "sentence",
      text: "I see it.",
      ageBands: ALL_SPEECH_AGE_BANDS,
      i18nKeyHint: HINT("sentence"),
      difficulty: "easy",
    },
    {
      id: "S_come_here",
      kind: "sentence",
      text: "Come here.",
      ageBands: ALL_SPEECH_AGE_BANDS,
      i18nKeyHint: HINT("sentence"),
      difficulty: "easy",
    },
    {
      id: "S_all_done",
      kind: "sentence",
      text: "All done.",
      ageBands: ALL_SPEECH_AGE_BANDS,
      i18nKeyHint: HINT("sentence"),
      difficulty: "easy",
    },
  ],
};
