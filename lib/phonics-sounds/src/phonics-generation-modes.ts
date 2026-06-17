/**
 * Phase F — phonics speech generation standards (educational synthesis, NOT
 * generic TTS). One canonical per-mode profile for ElevenLabs voice settings,
 * reviewer prompt templates, and duration validation bounds.
 *
 * Letter names and letter sounds must NEVER be confused: A → /a/ (not "ay"),
 * B → /b/ (not "bee"). The pure-sound text comes from the phoneme registry /
 * ELEVENLABS_SPEAK_TEXT; this module governs HOW it is voiced.
 */
import type { PhonicsAssetType } from "./gcs-paths.js";

export type PhonicsGenerationMode =
  | "letter_sound"
  | "phoneme"
  | "blending"
  | "segmenting"
  | "word"
  | "sentence"
  | "decodable_story";

export type PhonicsVoiceProfile = {
  stability: number;
  similarity_boost: number;
  style: number;
  /** ElevenLabs playback speed multiplier (slower for decoding). */
  speed: number;
  use_speaker_boost: boolean;
};

/**
 * Tuned for phonics learning (ages 2–10). Isolated sounds: high stability +
 * zero style for repeatable articulation. Connected speech: lower stability +
 * mild style + faster for natural fluency. Same voice identity throughout
 * (similarity_boost high) + speaker_boost for small device speakers.
 */
export const PHONICS_GENERATION_PROFILES: Record<PhonicsGenerationMode, PhonicsVoiceProfile> = {
  letter_sound: { stability: 0.55, similarity_boost: 0.8, style: 0.0, speed: 0.85, use_speaker_boost: true },
  phoneme: { stability: 0.55, similarity_boost: 0.8, style: 0.0, speed: 0.85, use_speaker_boost: true },
  blending: { stability: 0.5, similarity_boost: 0.8, style: 0.05, speed: 0.9, use_speaker_boost: true },
  segmenting: { stability: 0.55, similarity_boost: 0.8, style: 0.0, speed: 0.85, use_speaker_boost: true },
  word: { stability: 0.5, similarity_boost: 0.8, style: 0.05, speed: 0.9, use_speaker_boost: true },
  sentence: { stability: 0.45, similarity_boost: 0.75, style: 0.2, speed: 0.95, use_speaker_boost: true },
  decodable_story: { stability: 0.45, similarity_boost: 0.75, style: 0.2, speed: 0.95, use_speaker_boost: true },
};

/** Catalog asset type → generation mode. */
export function modeForAssetType(type: PhonicsAssetType): PhonicsGenerationMode {
  switch (type) {
    case "letter":
      return "letter_sound";
    case "digraph":
      return "phoneme";
    case "blend":
      return "blending";
    case "cvc":
      return "word";
    case "sight_word":
      return "word";
    case "sentence":
      return "sentence";
    case "quiz":
      return "sentence";
    default:
      return "word";
  }
}

export function getPhonicsGenerationProfile(mode: PhonicsGenerationMode): PhonicsVoiceProfile {
  return PHONICS_GENERATION_PROFILES[mode];
}

/** Per-mode acceptable clip duration (ms) — validation bounds for QA / CI. */
export const PHONICS_MODE_DURATION_MS: Record<PhonicsGenerationMode, { min: number; max: number }> = {
  letter_sound: { min: 250, max: 900 },
  phoneme: { min: 250, max: 900 },
  blending: { min: 300, max: 1500 },
  segmenting: { min: 300, max: 1500 },
  word: { min: 350, max: 1800 },
  sentence: { min: 600, max: 8000 },
  decodable_story: { min: 600, max: 12000 },
};

/**
 * Reviewer prompt templates — human QA guidance, NEVER sent to ElevenLabs
 * (the model only receives the pure `speakText`). `token` is the phoneme /
 * word / line under review.
 */
export const PHONICS_PROMPT_TEMPLATES: Record<PhonicsGenerationMode, (token: string) => string> = {
  letter_sound: (t) =>
    `LETTER SOUND "${t}": pure phoneme only. A→/a/ not "ay"; B→/b/ not "bee"; C→/k/ not "see". No letter name, no schwa ("buh"), no "sound"/"as in". 250–900ms.`,
  phoneme: (t) =>
    `PHONEME "${t}": single isolated sound (digraph = one unit, e.g. sh→/ʃ/, th unvoiced vs voiced distinct). No letter spelling. 250–900ms.`,
  blending: (t) =>
    `BLENDING "${t}": teach /s/ … /a/ … /t/ … then blended /sat/. Each phoneme crisp; final blend natural, no over-articulation.`,
  segmenting: (t) =>
    `SEGMENTING "${t}": break into ordered phonemes (ship→/sh/ /i/ /p/). Equal, clear, slightly spaced.`,
  word: (t) =>
    `WORD "${t}": natural blended pronunciation, kindergarten-teacher clarity, slightly slow. No letter-by-letter spelling.`,
  sentence: (t) =>
    `SENTENCE "${t}": warm, clear, early-reader pace. Preserve phoneme clarity for decodable words.`,
  decodable_story: (t) =>
    `STORY "${t}": expressive but phoneme-clear; support early readers; steady pacing for karaoke highlight timing.`,
};

export function buildPhonicsReviewerPrompt(mode: PhonicsGenerationMode, token: string): string {
  return PHONICS_PROMPT_TEMPLATES[mode](token);
}
