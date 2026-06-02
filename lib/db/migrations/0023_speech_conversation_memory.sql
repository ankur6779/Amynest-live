-- Cross-device memory for the Amy Live Speech Coach talk bot (one row per user+child)
CREATE TABLE IF NOT EXISTS "speech_conversation_memory" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "child_id" integer NOT NULL,
  "total_sessions" integer NOT NULL DEFAULT 0,
  "last_session_date" text,
  "last_summary" text,
  "last_next_focus" text,
  "target_sounds" jsonb NOT NULL DEFAULT '[]',
  "mastered_words" jsonb NOT NULL DEFAULT '[]',
  "word_stats" jsonb NOT NULL DEFAULT '{}',
  "clarity_avg" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "speech_convo_memory_child_uq"
  ON "speech_conversation_memory" ("user_id", "child_id");
CREATE INDEX IF NOT EXISTS "speech_convo_memory_user_idx"
  ON "speech_conversation_memory" ("user_id");
