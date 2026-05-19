/**
 * Browser-safe exports (no node:crypto). Use `@workspace/static-audio` on the server.
 */
export { normalizeStaticAudioKey } from "./normalize.js";
export { staticAudioMissingKey } from "./missing.js";
export {
  PHONEME_PROMPTS,
  buildStaticTtsLookup,
  getStaticTtsEntries,
  isStaticTtsText,
} from "./phrases.js";
export type { StaticAudioMap, StaticAudioMode, StaticTtsEntry } from "./types.js";
