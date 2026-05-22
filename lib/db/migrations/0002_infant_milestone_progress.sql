-- infant_milestone_progress: cloud sync for Infant Buddy milestone tracker
CREATE TABLE IF NOT EXISTS "infant_milestone_progress" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "child_id" integer NOT NULL,
  "milestone_id" text NOT NULL,
  "state" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "infant_milestone_progress_child_milestone_uniq"
  ON "infant_milestone_progress" ("child_id", "milestone_id");

CREATE INDEX IF NOT EXISTS "infant_milestone_progress_child_idx"
  ON "infant_milestone_progress" ("child_id");

CREATE INDEX IF NOT EXISTS "infant_milestone_progress_user_idx"
  ON "infant_milestone_progress" ("user_id");
