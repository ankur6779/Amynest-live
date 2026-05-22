-- static_audio_registry: permanent phrase audio store (run on Render if db:push unavailable locally)
CREATE TABLE IF NOT EXISTS "static_audio_registry" (
  "hash" varchar(32) PRIMARY KEY NOT NULL,
  "text" text NOT NULL,
  "mode" varchar(16) DEFAULT 'default' NOT NULL,
  "normalized_key" text NOT NULL,
  "audio_url" text,
  "audio_data" bytea,
  "content_type" varchar(32) DEFAULT 'audio/mpeg' NOT NULL,
  "gcs_present" boolean DEFAULT false NOT NULL,
  "source" varchar(32) DEFAULT 'catalog' NOT NULL,
  "miss_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "static_audio_registry_normalized_idx"
  ON "static_audio_registry" ("normalized_key", "mode");

CREATE INDEX IF NOT EXISTS "static_audio_registry_miss_idx"
  ON "static_audio_registry" ("miss_count");
