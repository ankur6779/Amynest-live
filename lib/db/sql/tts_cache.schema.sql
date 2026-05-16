-- Global ElevenLabs TTS cache (shared across all users).
-- Key = SHA-256(model_id | voice_id | text) or phonics-namespaced variant.
-- Run via your migration tool (e.g. pnpm --filter @workspace/db push).

CREATE TABLE IF NOT EXISTS tts_cache (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key       TEXT NOT NULL UNIQUE,
  text            TEXT NOT NULL,
  voice_id        VARCHAR(64) NOT NULL,
  model_id        VARCHAR(64) NOT NULL,
  audio_path      TEXT NOT NULL,
  audio_data      BYTEA,
  content_type    VARCHAR(32) NOT NULL DEFAULT 'audio/mpeg',
  char_count      INTEGER NOT NULL,
  hit_count       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tts_cache_voice_idx ON tts_cache (voice_id);
CREATE INDEX IF NOT EXISTS tts_cache_created_at_idx ON tts_cache (created_at);
