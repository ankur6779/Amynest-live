CREATE TABLE IF NOT EXISTS "olympiad_child_stats" (
  "id" serial PRIMARY KEY NOT NULL,
  "child_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "stats_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "client_updated_at" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "olympiad_child_stats_child_uq"
  ON "olympiad_child_stats" ("child_id");
CREATE INDEX IF NOT EXISTS "olympiad_child_stats_user_idx"
  ON "olympiad_child_stats" ("user_id");
