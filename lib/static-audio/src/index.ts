export {
  getStaticAudioHash,
  getStaticAudioObjectKey,
  staticAudioGcsObjectName,
  staticAudioPublicUrl,
} from "./keys.js";
export { normalizeStaticAudioKey, normalizeSpeakTextForLookup } from "./normalize.js";
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
