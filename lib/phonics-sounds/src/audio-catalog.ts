/**
 * Complete phonics audio library catalog — single source of truth for
 * pre-generated ElevenLabs assets. Runtime NEVER synthesizes these at playback.
 */

import { CVC_WORDS } from "./cvc.js";
import { PHONICS_CURRICULUM_WORD_BANK } from "./curriculum-word-bank.js";
import { DIGRAPHS, LETTER_SOUNDS } from "./dataset.js";
import { ELEVENLABS_SPEAK_TEXT } from "./phonics-generation.js";
import {
  getPhonicsCatalogKey,
  getPhonicsGcsObjectPath,
  phonicsLibraryProxyPath,
  type PhonicsAssetType,
} from "./gcs-paths.js";

export const PHONICS_LIBRARY_VERSION = 1;

export type PhonicsCatalogEntry = {
  /** Stable id within type (e.g. "a", "sh", "cat", "quiz_blend_sounds") */
  id: string;
  type: PhonicsAssetType;
  /** Display / TTS source text */
  text: string;
  /** IPA-ish phoneme label for letters/digraphs/blends */
  phoneme?: string;
  /** Optional alternate phoneme for future expansion (c→/s/, g→/j/) */
  alternatePhoneme?: string;
  /** 1–6 curriculum stage */
  curriculumLevel?: number;
  /** 1=easiest */
  difficulty?: number;
  /** ElevenLabs speak line — pure phoneme for letters, full phrase for words/sentences */
  speakText: string;
  /** True = use phoneme voice settings (short, isolated); false = word/sentence pacing */
  isolatedPhoneme: boolean;
};

/** Consonant blends — each gets a dedicated clip (not sequential letter phonemes). */
export const BLEND_IDS = [
  "bl",
  "cl",
  "fl",
  "gl",
  "pl",
  "sl",
  "br",
  "cr",
  "dr",
  "fr",
  "gr",
  "pr",
  "tr",
  "sc",
  "sk",
  "sm",
  "sn",
  "sp",
  "st",
  "sw",
] as const;

/** Minimal speak hints for blend clips — one blended sound unit. */
export const BLEND_SPEAK_TEXT: Record<string, string> = {
  bl: "bl",
  cl: "cl",
  fl: "fl",
  gl: "gl",
  pl: "pl",
  sl: "sl",
  br: "br",
  cr: "cr",
  dr: "dr",
  fr: "fr",
  gr: "gr",
  pr: "pr",
  tr: "tr",
  sc: "sc",
  sk: "sk",
  sm: "sm",
  sn: "sn",
  sp: "sp",
  st: "st",
  sw: "sw",
};

/** th unvoiced uses th1 key; th voiced uses th2 */
export const TH_AUDIO_IDS = ["th1", "th2"] as const;

/** Curriculum sight words (seed + fluency). */
export const SIGHT_WORD_IDS = [
  "the",
  "and",
  "is",
  "it",
  "to",
  "was",
  "you",
  "said",
] as const;

/** Curriculum reading sentences. */
export const SENTENCE_TEXTS = [
  "The cat is fat.",
  "I see a red bus.",
  "Mum and Dad play.",
  "The sun is up.",
  "I like my hat.",
  "The dog is in bed.",
  "The cat sat.",
  "I see a dog.",
  "The sun is hot.",
  "The big brown dog ran fast.",
  "I like to play in the park.",
  "My mum makes the best food.",
  "We went to school on the bus.",
  "The little bird flew up to the sky.",
  "Can you help me find my book?",
  "I love my baby sister.",
  "Wow, look at the rainbow!",
  "The little duck sat by the pond.",
  "She saw a big ship sail past.",
  "A whale popped up and waved hello.",
  "The duck laughed and flapped her wings.",
  "What a fun day at the pond!",
] as const;

/** Quiz / test instruction prompts — must have pre-generated audio. */
export const QUIZ_PROMPT_TEXTS = [
  "Tap the animal making this sound",
  "Which sound does this letter make?",
  "Tap the letter that makes this sound",
  "What is this?",
  "Blend the sounds — which word is it?",
  "What letter is missing?",
  "Which word starts with this sound?",
  "Tap the letters to spell the word",
  "Listen and pick the word",
  "Which word says ship?",
  "Tap the word cat.",
  "What sound do you hear?",
] as const;

function slugQuizId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

function buildLetterEntries(): PhonicsCatalogEntry[] {
  const entries: PhonicsCatalogEntry[] = [];
  for (const [letter, meta] of Object.entries(LETTER_SOUNDS)) {
    const speakText = ELEVENLABS_SPEAK_TEXT[meta.audioKey];
    if (!speakText) continue;
    entries.push({
      id: meta.audioKey,
      type: "letter",
      text: letter,
      phoneme: meta.phoneme,
      alternatePhoneme:
        letter === "c" ? "s" : letter === "g" ? "j" : undefined,
      curriculumLevel: 1,
      difficulty: 1,
      speakText,
      isolatedPhoneme: true,
    });
  }
  return entries;
}

function buildDigraphEntries(): PhonicsCatalogEntry[] {
  const entries: PhonicsCatalogEntry[] = [];
  for (const entry of Object.values(DIGRAPHS)) {
    const speakText = ELEVENLABS_SPEAK_TEXT[entry.audioKey];
    if (!speakText) continue;
    entries.push({
      id: entry.audioKey,
      type: "digraph",
      text: entry.audioKey,
      phoneme: entry.phoneme,
      curriculumLevel: 4,
      difficulty: 2,
      speakText,
      isolatedPhoneme: true,
    });
  }
  return entries;
}

function buildBlendEntries(): PhonicsCatalogEntry[] {
  return BLEND_IDS.map((id) => ({
    id,
    type: "blend" as const,
    text: id,
    phoneme: id,
    curriculumLevel: 5,
    difficulty: 3,
    speakText: BLEND_SPEAK_TEXT[id] ?? id,
    isolatedPhoneme: true,
  }));
}

function buildCvcEntries(): PhonicsCatalogEntry[] {
  const seen = new Set<string>();
  const entries: PhonicsCatalogEntry[] = [];
  for (const row of CVC_WORDS) {
    const word = row.word.toLowerCase();
    if (seen.has(word)) continue;
    seen.add(word);
    entries.push({
      id: word,
      type: "cvc",
      text: word,
      curriculumLevel: row.level <= 2 ? 2 : 3,
      difficulty: row.level,
      speakText: word,
      isolatedPhoneme: false,
    });
  }
  // Extra CVC from seed not in CVC_WORDS
  for (const word of ["hat", "rat", "mat", "pin", "pot", "bus", "run", "fog", "hen", "bit"]) {
    if (seen.has(word)) continue;
    seen.add(word);
    entries.push({
      id: word,
      type: "cvc",
      text: word,
      curriculumLevel: 2,
      difficulty: 2,
      speakText: word,
      isolatedPhoneme: false,
    });
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

function buildCurriculumWordBankEntries(): PhonicsCatalogEntry[] {
  const seen = new Set<string>();
  for (const row of CVC_WORDS) {
    seen.add(row.word.toLowerCase());
  }
  for (const word of ["hat", "rat", "mat", "pin", "pot", "bus", "run", "fog", "hen", "bit"]) {
    seen.add(word);
  }

  const entries: PhonicsCatalogEntry[] = [];
  for (const raw of PHONICS_CURRICULUM_WORD_BANK) {
    const word = raw.trim().toLowerCase();
    if (!word || seen.has(word)) continue;
    seen.add(word);
    entries.push({
      id: word,
      type: "cvc",
      text: word,
      curriculumLevel: 4,
      difficulty: 3,
      speakText: word,
      isolatedPhoneme: false,
    });
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

function buildSightWordEntries(): PhonicsCatalogEntry[] {
  return SIGHT_WORD_IDS.map((word) => ({
    id: word,
    type: "sight_word" as const,
    text: word,
    curriculumLevel: 4,
    difficulty: 2,
    speakText: word,
    isolatedPhoneme: false,
  }));
}

function buildSentenceEntries(): PhonicsCatalogEntry[] {
  return SENTENCE_TEXTS.map((text, i) => ({
    id: slugQuizId(text),
    type: "sentence" as const,
    text,
    curriculumLevel: text.length < 30 ? 4 : 6,
    difficulty: Math.min(6, 2 + Math.floor(text.split(/\s+/).length / 4)),
    speakText: text,
    isolatedPhoneme: false,
  }));
}

function buildQuizEntries(): PhonicsCatalogEntry[] {
  return QUIZ_PROMPT_TEXTS.map((text) => ({
    id: slugQuizId(text),
    type: "quiz" as const,
    text,
    curriculumLevel: 1,
    difficulty: 1,
    speakText: text,
    isolatedPhoneme: false,
  }));
}

/** Full library catalog — every asset that must exist before lesson playback. */
export function buildPhonicsAudioCatalog(): PhonicsCatalogEntry[] {
  return [
    ...buildLetterEntries(),
    ...buildDigraphEntries(),
    ...buildBlendEntries(),
    ...buildCvcEntries(),
    ...buildCurriculumWordBankEntries(),
    ...buildSightWordEntries(),
    ...buildSentenceEntries(),
    ...buildQuizEntries(),
  ];
}

/** Letter/digraph audio keys for legacy phoneme playback (a, sh, th1, …). */
export function getPhonemeClipIds(): string[] {
  return buildPhonicsAudioCatalog()
    .filter((e) => e.type === "letter" || e.type === "digraph")
    .map((e) => e.id)
    .sort();
}

/** Priority prewarm tiers — letters + digraphs + common CVC. */
export const PHONICS_PREWARM_TIER_HIGH = ["a", "b", "c", "d", "e"] as const;
export const PHONICS_PREWARM_TIER_MEDIUM = [
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "sh",
  "ch",
] as const;
export const PHONICS_PREWARM_TIER_LOW = [
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "th1",
  "th2",
  "ph",
  "ng",
  "wh",
  "ck",
  "qu",
] as const;
export const PHONICS_PREWARM_CVC = ["cat", "bat", "mat", "dog", "sun", "run"] as const;

export type PhonicsAudioManifestAsset = {
  id: string;
  type: PhonicsAssetType;
  text: string;
  phoneme?: string;
  alternatePhoneme?: string;
  difficulty?: number;
  curriculumLevel?: number;
  gcsPath: string;
  url: string;
  durationMs?: number;
  checksum?: string;
  version: number;
  source?: "elevenlabs" | "fallback_tone";
  quality?: "auto" | "approved" | "needs_review";
};

export type PhonicsAudioLibraryManifest = {
  version: number;
  libraryVersion: number;
  generatedAt: string;
  bucket: string;
  baseUrl: string;
  voiceId: string;
  modelId: string;
  /** Provenance hardening (Phase B) — optional for backward compat, required at certification. */
  provider?: "elevenlabs";
  curriculumVersion?: number;
  phonemeVersion?: number;
  normalizationVersion?: number;
  assetCount: number;
  assets: Record<string, PhonicsAudioManifestAsset>;
};

export function catalogEntryToManifestAsset(
  entry: PhonicsCatalogEntry,
  bucketId: string,
  overrides?: Partial<PhonicsAudioManifestAsset>,
): PhonicsAudioManifestAsset {
  const gcsPath = getPhonicsGcsObjectPath(entry.type, entry.id);
  const catalogKey = getPhonicsCatalogKey(entry.type, entry.id);
  return {
    id: entry.id,
    type: entry.type,
    text: entry.text,
    phoneme: entry.phoneme,
    alternatePhoneme: entry.alternatePhoneme,
    difficulty: entry.difficulty,
    curriculumLevel: entry.curriculumLevel,
    gcsPath,
    url: phonicsLibraryProxyPath(gcsPath),
    version: PHONICS_LIBRARY_VERSION,
    quality: "auto",
    ...overrides,
    // catalogKey stored as manifest record key externally
  };
}

/** Resolve legacy letter audioKey → manifest asset (letters + digraphs only). */
export function resolveLetterClipCatalogKey(audioKey: string): string | null {
  const key = audioKey.trim().toLowerCase();
  if (LETTER_SOUNDS[key]) return getPhonicsCatalogKey("letter", key);
  if (Object.values(DIGRAPHS).some((d) => d.audioKey === key)) {
    return getPhonicsCatalogKey("digraph", key);
  }
  return null;
}

/** Resolve word/sentence/quiz text → manifest catalog key. */
export function resolveContentCatalogKey(
  text: string,
  preferredType?: PhonicsAssetType,
): string | null {
  const norm = text.trim().toLowerCase();
  if (!norm) return null;

  const catalog = buildPhonicsAudioCatalog();

  if (preferredType) {
    const match = catalog.find(
      (e) => e.type === preferredType && e.text.toLowerCase() === norm,
    );
    if (match) return getPhonicsCatalogKey(match.type, match.id);
  }

  for (const type of ["cvc", "sight_word", "sentence", "quiz"] as const) {
    const match = catalog.find((e) => e.type === type && e.text.toLowerCase() === norm);
    if (match) return getPhonicsCatalogKey(match.type, match.id);
  }

  return null;
}
