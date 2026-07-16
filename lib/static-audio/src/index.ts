export {
  AMY_TTS_MODEL_ID,
  AMY_TTS_MODEL_FALLBACK,
  AMY_TTS_VOICE_ID,
  AMY_TTS_OUTPUT_FORMAT,
  AMY_TTS_STREAM_LATENCY,
  resolveAmyTtsModelId,
} from "./amy-tts-config.js";
export {
  getStaticAudioHash,
  getStaticAudioObjectKey,
  staticAudioGcsObjectName,
  staticAudioPublicUrl,
} from "./keys.js";
export {
  canonicalizeStaticAudioText,
  normalizeStaticAudioKey,
  normalizeSpeakTextForLookup,
  staticAudioLookupKeyVariants,
} from "./normalize.js";
export {
  diagnoseStaticAudioLookup,
  diffNormalizedTexts,
  levenshteinDistance,
  type StaticAudioLookupDiagnostic,
  type StaticAudioLookupDiff,
} from "./lookup-diagnostics.js";
export {
  computeCatalogMissingStaticAudioKeys,
  computeCorpusMissingStaticAudioKeys,
  extractTextFromMissingKey,
  isValidStaticAudioMapEntryUrl,
  mergeMissingStaticAudioKeys,
  parseStaticAudioMissingKey,
  resolveStaticTtsFromMissingKey,
  staticAudioMissingKey,
} from "./missing.js";
export {
  PHONEME_PROMPTS,
  buildStaticTtsLookup,
  getStaticTtsEntries,
  isStaticTtsText,
} from "./phrases.js";
export type { StaticAudioMap, StaticAudioMode, StaticTtsEntry } from "./types.js";
export {
  collectAllSpeakablePhrases,
  buildHashToPhraseIndex,
  type SpeakablePhraseRecord,
} from "./phrase-corpus.js";
