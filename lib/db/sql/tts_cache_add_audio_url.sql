-- Add public GCS URL column for TTS cache (Render + object storage).
-- Safe to run multiple times.

ALTER TABLE tts_cache ADD COLUMN IF NOT EXISTS audio_url TEXT;
