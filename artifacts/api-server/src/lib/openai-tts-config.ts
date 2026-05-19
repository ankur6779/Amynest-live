/**
 * OpenAI TTS defaults for AmyNest (gpt-4o-mini-tts).
 *
 * OpenAI has no dedicated "Indian" voice ID — use a female voice plus
 * `instructions` for Indian English accent. Set OPENAI_TTS_ACCENT=us for
 * standard American female delivery without Indian intonation.
 */
import { readEnv } from "./env.js";

export const OPENAI_TTS_MODEL_DEFAULT = "gpt-4o-mini-tts";

const ALLOWED_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
]);

/** Built-in female voices (English-optimized; accent shaped via instructions). */
export const OPENAI_TTS_FEMALE_VOICES = [
  "nova",
  "coral",
  "shimmer",
  "sage",
  "marin",
  "cedar",
] as const;

export type OpenAiTtsAccent = "indian" | "us";
export type OpenAiTtsMode = "default" | "phonics";

function resolveAccent(): OpenAiTtsAccent {
  const raw = (readEnv("OPENAI_TTS_ACCENT") ?? "indian").toLowerCase();
  if (raw === "us" || raw === "american" || raw === "en-us") return "us";
  return "indian";
}

export function getOpenAiTtsModel(): string {
  const model = readEnv("OPENAI_TTS_MODEL")?.trim();
  return model && model.length > 0 ? model : OPENAI_TTS_MODEL_DEFAULT;
}

/**
 * Female voice for all OpenAI TTS modules.
 * Override with OPENAI_TTS_VOICE (e.g. nova, coral, shimmer).
 */
export function getOpenAiTtsVoice(): string {
  const explicit = readEnv("OPENAI_TTS_VOICE")?.toLowerCase().trim();
  if (explicit && ALLOWED_VOICES.has(explicit)) return explicit;

  const accent = resolveAccent();
  // coral: warm female (docs default for gpt-4o-mini-tts); nova: classic US female
  return accent === "us" ? "nova" : "coral";
}

export function getOpenAiTtsAccent(): OpenAiTtsAccent {
  return resolveAccent();
}

/** Steer accent/tone; full override via OPENAI_TTS_INSTRUCTIONS. */
export function getOpenAiTtsInstructions(mode: OpenAiTtsMode = "default"): string {
  const custom = readEnv("OPENAI_TTS_INSTRUCTIONS")?.trim();
  if (custom) return custom;

  const accent = resolveAccent();
  const phonics = mode === "phonics";

  if (accent === "us") {
    if (phonics) {
      return "Speak clearly and slowly in a warm, friendly female American English voice. Enunciate each sound for young children learning phonics.";
    }
    return "Speak in a warm, friendly female American English voice, like a supportive parenting coach.";
  }

  if (phonics) {
    return "Speak clearly and slowly with a natural Indian English accent in a warm, friendly female voice. Enunciate each sound for children learning phonics.";
  }
  return "Speak in a warm, friendly female voice with a natural Indian English accent, like a caring Indian parent coach. Keep tone gentle and clear.";
}

export function getOpenAiTtsConfigSummary(): {
  model: string;
  voice: string;
  accent: OpenAiTtsAccent;
  instructionsPreview: string;
} {
  const instructions = getOpenAiTtsInstructions("default");
  return {
    model: getOpenAiTtsModel(),
    voice: getOpenAiTtsVoice(),
    accent: getOpenAiTtsAccent(),
    instructionsPreview: instructions.slice(0, 120),
  };
}
