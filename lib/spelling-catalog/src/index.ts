/** @deprecated Import from ./types.js — re-export for backward compatibility. */
export type {
  SpellingAgeGroup,
  SpellingDifficulty,
  SpellingWord,
  SpellingCatalogEntry,
} from "./types.js";

export {
  SPELLING_WORDS,
  SPELLING_AGE_GROUPS,
  getSpellingWordsByAge,
  spellingAgeGroupFor,
  getSpellingManifest,
  getBucketEntries,
  getBucketWordCount,
  getAllCatalogWords,
  getAllCatalogEntries,
} from "./manifest.js";

export {
  selectSessionWords,
  markSessionCompleted,
  loadSessionHistory,
  saveSessionHistory,
  historyStorageKey,
  emptySessionHistory,
} from "./session.js";

export {
  filterByPlayerLevel,
  levelFromStars,
  MAX_PLAYER_LEVEL,
  recommendedDifficulties,
} from "./progression.js";

export { catalogEntryToWord, bucketKey } from "./types.js";
export { getSpellingAudioTextsForStaticCatalog } from "./catalog.js";
