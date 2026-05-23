-- Store SHA-256 checksum of TTS MP3 bytes for corrupt-upload detection.
ALTER TABLE "tts_cache" ADD COLUMN IF NOT EXISTS "content_sha256" varchar(64);
