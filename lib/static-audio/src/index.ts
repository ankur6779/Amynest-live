export {
  getStaticAudioHash,
  getStaticAudioObjectKey,
  staticAudioGcsObjectName,
  staticAudioPublicUrl,
} from "./keys.js";
export { normalizeStaticAudioKey } from "./normalize.js";
export {
  computeCatalogMissingStaticAudioKeys,
  extractTextFromMissingKey,
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
