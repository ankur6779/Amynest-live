ALTER TABLE "story_content" ADD COLUMN IF NOT EXISTS "gcs_url" text;
ALTER TABLE "story_content" ADD COLUMN IF NOT EXISTS "gcs_synced_at" timestamp;
