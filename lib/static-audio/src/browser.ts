/**
 * Browser-safe exports (no node:crypto). Use `@workspace/static-audio` on the server.
 */
export {
  AMY_TTS_MODEL_ID,
  AMY_TTS_MODEL_FALLBACK,
  AMY_TTS_VOICE_ID,
  AMY_TTS_OUTPUT_FORMAT,
  AMY_TTS_STREAM_LATENCY,
  resolveAmyTtsModelId,
} from "./amy-tts-config.js";
export { normalizeStaticAudioKey, normalizeSpeakTextForLookup } from "./normalize.js";
export {
  staticAudioMissingKey,
  parseStaticAudioMissingKey,
  extractTextFromMissingKey,
} from "./missing-browser.js";
export {
  PHONEME_PROMPTS,
  buildStaticTtsLookup,
  getStaticTtsEntries,
  isStaticTtsText,
} from "./phrases.js";
export type { StaticAudioMap, StaticAudioMode, StaticTtsEntry } from "./types.js";
