CREATE TABLE IF NOT EXISTS "olympiad_scores" (
  "id" serial PRIMARY KEY NOT NULL,
  "child_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "age_band" text NOT NULL,
  "run_type" text NOT NULL,
  "track_id" text,
  "questions_attempted" integer NOT NULL,
  "questions_correct" integer NOT NULL,
  "accuracy_pct" integer NOT NULL,
  "duration_sec" integer NOT NULL,
  "score" integer NOT NULL,
  "week_start" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "olympiad_user_age_week_idx"
  ON "olympiad_scores" ("user_id", "age_band", "week_start");

CREATE INDEX IF NOT EXISTS "olympiad_child_idx"
  ON "olympiad_scores" ("child_id");

CREATE INDEX IF NOT EXISTS "olympiad_global_week_idx"
  ON "olympiad_scores" ("age_band", "week_start");
