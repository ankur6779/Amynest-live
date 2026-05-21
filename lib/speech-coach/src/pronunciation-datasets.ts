// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — pronunciation practice datasets (all ages per category)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PronouncePrompt,
  PronouncePromptDifficulty,
  PronouncePromptKind,
  SpeechAgeBand,
} from "./types";

const HINT = (kind: string): string =>
  `screens.speech_coach.prompts.hint.${kind}`;

/** Every age band — practice items in these catalogs are always eligible. */
export const ALL_SPEECH_AGE_BANDS: readonly SpeechAgeBand[] = [
  "infant",
  "1y",
  "2y",
  "3y",
  "4y_plus",
] as const;

type CatalogEntry = {
  id: string;
  text: string;
  level: PronouncePromptDifficulty;
  speakText?: string;
};

function toPrompt(
  kind: PronouncePromptKind,
  entry: CatalogEntry,
): PronouncePrompt {
  return {
    id: entry.id,
    kind,
    text: entry.text,
    speakText: entry.speakText,
    ageBands: ALL_SPEECH_AGE_BANDS,
    i18nKeyHint: HINT(kind),
    difficulty: entry.level,
  };
}

// ── Letters (A–Z, phonics TTS) ───────────────────────────────────────────────

export type LetterDatasetEntry = {
  text: string;
  phonics: string;
  level: PronouncePromptDifficulty;
};

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

export const LETTER_PRONUNCIATION_PROMPTS: readonly PronouncePrompt[] =
  LETTERS_DATA.map((e) =>
    toPrompt("letter", {
      id: `L_${e.text.toUpperCase()}`,
      text: e.text.toUpperCase(),
      level: e.level,
      speakText: e.phonics,
    }),
  );

const phonicsLookup = new Map(
  LETTERS_DATA.map((e) => [e.text.toLowerCase(), e.phonics]),
);

// ── Phonics ─────────────────────────────────────────────────────────────────

const PHONICS_DATA: readonly CatalogEntry[] = [
  { id: "P_ah", text: "ah", level: "easy" },
  { id: "P_oo", text: "oo", level: "easy" },
  { id: "P_eh", text: "eh", level: "easy" },
  { id: "P_ma", text: "ma", level: "easy" },
  { id: "P_pa", text: "pa", level: "easy" },
  { id: "P_ba", text: "ba", level: "easy" },
  { id: "P_da", text: "da", level: "easy" },
  { id: "P_ga", text: "ga", level: "easy" },
  { id: "P_ha", text: "ha", level: "easy" },
  { id: "P_na", text: "na", level: "easy" },
  { id: "P_ta", text: "ta", level: "medium" },
  { id: "P_ka", text: "ka", level: "medium" },
  { id: "P_la", text: "la", level: "medium" },
  { id: "P_ra", text: "ra", level: "medium" },
  { id: "P_sa", text: "sa", level: "medium" },
  { id: "P_wa", text: "wa", level: "medium" },
  { id: "P_ya", text: "ya", level: "medium" },
  { id: "P_fa", text: "fa", level: "medium" },
  { id: "P_sh", text: "sh", level: "advanced" },
  { id: "P_th", text: "th", level: "advanced" },
  { id: "P_ch", text: "ch", level: "advanced" },
  { id: "P_wh", text: "wh", level: "advanced" },
  { id: "P_bl", text: "bl", level: "advanced" },
  { id: "P_cr", text: "cr", level: "advanced" },
  { id: "P_st", text: "st", level: "advanced" },
  { id: "P_tr", text: "tr", level: "advanced" },
  { id: "P_gr", text: "gr", level: "advanced" },
  { id: "P_pr", text: "pr", level: "advanced" },
] as const;

export const PHONIC_PRONUNCIATION_PROMPTS: readonly PronouncePrompt[] =
  PHONICS_DATA.map((e) => toPrompt("phonic", e));

// ── Words ───────────────────────────────────────────────────────────────────

export const WORDS_DATA: readonly CatalogEntry[] = [
  { id: "W_mama", text: "mama", level: "easy" },
  { id: "W_dada", text: "dada", level: "easy" },
  { id: "W_ball", text: "ball", level: "easy" },
  { id: "W_cat", text: "cat", level: "easy" },
  { id: "W_dog", text: "dog", level: "easy" },
  { id: "W_cup", text: "cup", level: "easy" },
  { id: "W_up", text: "up", level: "easy" },
  { id: "W_go", text: "go", level: "easy" },
  { id: "W_no", text: "no", level: "easy" },
  { id: "W_bye", text: "bye", level: "easy" },
  { id: "W_more", text: "more", level: "easy" },
  { id: "W_milk", text: "milk", level: "easy" },
  { id: "W_hat", text: "hat", level: "easy" },
  { id: "W_bed", text: "bed", level: "easy" },
  { id: "W_water", text: "water", level: "medium" },
  { id: "W_apple", text: "apple", level: "medium" },
  { id: "W_happy", text: "happy", level: "medium" },
  { id: "W_baby", text: "baby", level: "medium" },
  { id: "W_help", text: "help", level: "medium" },
  { id: "W_open", text: "open", level: "medium" },
  { id: "W_play", text: "play", level: "medium" },
  { id: "W_book", text: "book", level: "medium" },
  { id: "W_tree", text: "tree", level: "medium" },
  { id: "W_blue", text: "blue", level: "medium" },
  { id: "W_bird", text: "bird", level: "medium" },
  { id: "W_fish", text: "fish", level: "medium" },
  { id: "W_frog", text: "frog", level: "medium" },
  { id: "W_star", text: "star", level: "medium" },
  { id: "W_butterfly", text: "butterfly", level: "advanced" },
  { id: "W_elephant", text: "elephant", level: "advanced" },
  { id: "W_rainbow", text: "rainbow", level: "advanced" },
  { id: "W_purple", text: "purple", level: "advanced" },
  { id: "W_banana", text: "banana", level: "advanced" },
  { id: "W_yellow", text: "yellow", level: "advanced" },
  { id: "W_turtle", text: "turtle", level: "advanced" },
  { id: "W_umbrella", text: "umbrella", level: "advanced" },
  { id: "W_beautiful", text: "beautiful", level: "advanced" },
  { id: "W_together", text: "together", level: "advanced" },
  { id: "W_strawberry", text: "strawberry", level: "advanced" },
  { id: "W_chocolate", text: "chocolate", level: "advanced" },
] as const;

export const WORD_PRONUNCIATION_PROMPTS: readonly PronouncePrompt[] =
  WORDS_DATA.map((e) => toPrompt("word", e));

// ── Sentences ───────────────────────────────────────────────────────────────

export const SENTENCES_DATA: readonly CatalogEntry[] = [
  { id: "S_i_see", text: "I see it.", level: "easy" },
  { id: "S_come_here", text: "Come here.", level: "easy" },
  { id: "S_all_done", text: "All done.", level: "easy" },
  { id: "S_more_milk", text: "I want more milk.", level: "easy" },
  { id: "S_go_play", text: "Let us go play.", level: "easy" },
  { id: "S_thank_you", text: "Thank you, mama.", level: "medium" },
  { id: "S_i_want_water", text: "I want some water.", level: "medium" },
  { id: "S_this_is_fun", text: "This is so fun!", level: "medium" },
  { id: "S_help_me_please", text: "Help me please.", level: "medium" },
  { id: "S_what_is_that", text: "What is that?", level: "medium" },
  { id: "S_i_love_you", text: "I love you.", level: "medium" },
  { id: "S_cat_happy", text: "The cat is happy.", level: "medium" },
  { id: "S_play_park", text: "Can we play in the park?", level: "advanced" },
  { id: "S_rainbow_beautiful", text: "The rainbow is so beautiful.", level: "advanced" },
  { id: "S_where_is_mama", text: "Where is mama going?", level: "advanced" },
  { id: "S_i_am_happy_today", text: "I am very happy today.", level: "advanced" },
  { id: "S_can_you_help_me", text: "Can you please help me?", level: "advanced" },
  { id: "S_i_want_to_play_outside", text: "I want to play outside.", level: "advanced" },
  { id: "S_my_favorite_color", text: "My favourite colour is blue.", level: "advanced" },
] as const;

export const SENTENCE_PRONUNCIATION_PROMPTS: readonly PronouncePrompt[] =
  SENTENCES_DATA.map((e) => toPrompt("sentence", e));

const CATALOG_BY_KIND: Readonly<
  Record<PronouncePromptKind, readonly PronouncePrompt[]>
> = {
  letter: LETTER_PRONUNCIATION_PROMPTS,
  phonic: PHONIC_PRONUNCIATION_PROMPTS,
  word: WORD_PRONUNCIATION_PROMPTS,
  sentence: SENTENCE_PRONUNCIATION_PROMPTS,
};

function promptLevel(p: PronouncePrompt): PronouncePromptDifficulty {
  return p.difficulty ?? "easy";
}

/** Selected difficulty, or easy baseline (never strict-only). */
export function matchesPracticeDifficulty(
  p: PronouncePrompt,
  difficulty: PronouncePromptDifficulty,
): boolean {
  const level = promptLevel(p);
  return level === difficulty || level === "easy";
}

/** Full category catalog (all ages). */
export function getPracticeCatalog(
  kind: PronouncePromptKind,
): readonly PronouncePrompt[] {
  return CATALOG_BY_KIND[kind];
}

/** Filter catalog by difficulty; if empty, return full catalog. */
export function filterCatalogByDifficulty(
  catalog: readonly PronouncePrompt[],
  difficulty: PronouncePromptDifficulty,
): readonly PronouncePrompt[] {
  const matched = catalog.filter((p) => matchesPracticeDifficulty(p, difficulty));
  return matched.length > 0 ? matched : catalog;
}

/** TTS line for a prompt — letters use phonics, not the displayed glyph. */
export function getPromptSpeakText(prompt: PronouncePrompt): string {
  if (prompt.speakText?.trim()) return prompt.speakText.trim();
  if (prompt.kind === "letter") {
    const phonics = phonicsLookup.get(prompt.text.toLowerCase());
    if (phonics) return phonics;
  }
  return prompt.text;
}

/** Default pool per category (same as full catalog). */
export function getDefaultPromptsForKind(
  kind: PronouncePromptKind,
): readonly PronouncePrompt[] {
  return CATALOG_BY_KIND[kind];
}
