export type {
  SpellingAudioManifest,
  SpellingAudioManifestEntry,
  SpellingAudioManifestMeta,
  SpellingAudioVersion,
} from "./types.js";

export {
  SPELLING_AUDIO_VERSION,
  SPELLING_AUDIO_VOICE_DEFAULT,
  SPELLING_AUDIO_MODEL_DEFAULT,
} from "./types.js";

export {
  sanitizeSpellingWordSlug,
  getSpellingGcsObjectPath,
  getSpellingGcsPublicUrl,
  isValidSpellingGcsObjectPath,
  spellingLibraryProxyPath,
  SPELLING_GCS_OBJECT_PATH_RE,
} from "./gcs-paths.js";

export {
  buildSpellingAudioManifestEntry,
  buildSpellingAudioManifestFromCatalog,
  resolveSpellingLibraryProxyUrl,
} from "./manifest-build.js";
