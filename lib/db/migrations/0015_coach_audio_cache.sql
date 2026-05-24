-- Amy Coach win listen-aloud audio — global cache keyed by plan + win index
CREATE TABLE IF NOT EXISTS "coach_audio_cache" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_cache_key" text NOT NULL,
  "win_index" integer NOT NULL,
  "text" text NOT NULL,
  "text_hash" varchar(64) NOT NULL,
  "tts_cache_key" text NOT NULL,
  "audio_url" text,
  "char_count" integer NOT NULL,
  "hit_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "coach_audio_cache_plan_win_uq"
  ON "coach_audio_cache" ("plan_cache_key", "win_index");
CREATE INDEX IF NOT EXISTS "coach_audio_cache_plan_idx"
  ON "coach_audio_cache" ("plan_cache_key");
CREATE INDEX IF NOT EXISTS "coach_audio_cache_tts_idx"
  ON "coach_audio_cache" ("tts_cache_key");
