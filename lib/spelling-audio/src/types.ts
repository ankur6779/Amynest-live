/** Versioned GCS folder — bump for new audio generations (v1, v2, v3). */
export type SpellingAudioVersion = "v1" | "v2" | "v3";

export const SPELLING_AUDIO_VERSION: SpellingAudioVersion = "v2";

export const SPELLING_AUDIO_VOICE_DEFAULT = "nova";
export const SPELLING_AUDIO_MODEL_DEFAULT = "gpt-4o-mini-tts";

export interface SpellingAudioManifestEntry {
  /** Display word (catalog spelling). */
  word: string;
  /** Spelling catalog entry id, e.g. `4-6:easy:cat`. */
  catalogId: string;
  /** GCS object path relative to bucket, e.g. `spelling/v2/cat.mp3`. */
  gcsPath: string;
  /** Public GCS HTTPS URL (manifest reference — playback uses proxy). */
  url: string;
  /** Duration in seconds (null until generated). */
  durationSec: number | null;
  voice: string;
  version: SpellingAudioVersion;
  /** Reserved for future slow-pronunciation assets. */
  slowGcsPath?: string | null;
  slowUrl?: string | null;
}

export interface SpellingAudioManifestMeta {
  version: SpellingAudioVersion;
  voice: string;
  model: string;
  generatedAt: string;
  bucket: string;
  catalogEntryCount: number;
  uniqueWordCount: number;
}

export interface SpellingAudioManifest {
  meta: SpellingAudioManifestMeta;
  /** Keyed by spelling catalog entry id. */
  entries: Record<string, SpellingAudioManifestEntry>;
}
