-- Shared AI learning content pool (Smart Study, Olympiad, Spelling, Phonics, Life Skills)
CREATE TABLE IF NOT EXISTS "ai_content_cache" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "namespace" varchar(64) NOT NULL,
  "lookup_key" text NOT NULL,
  "items" jsonb NOT NULL,
  "source" text DEFAULT 'ai' NOT NULL,
  "hit_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ai_content_cache_ns_lookup_idx"
  ON "ai_content_cache" ("namespace", "lookup_key");
CREATE INDEX IF NOT EXISTS "ai_content_cache_created_at_idx"
  ON "ai_content_cache" ("created_at");
