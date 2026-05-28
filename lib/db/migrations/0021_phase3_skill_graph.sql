-- Phase 3: skill graph + reward economy fields on learning_progress
CREATE TABLE IF NOT EXISTS "skill_graph_progress" (
  "id" serial PRIMARY KEY NOT NULL,
  "child_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "skill_id" text NOT NULL,
  "category" text NOT NULL,
  "mastery" integer DEFAULT 0 NOT NULL,
  "confidence" integer DEFAULT 0 NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_practiced_at" text,
  "related_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "weak_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "progression_stage" text DEFAULT 'not_started' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "skill_graph_progress_child_skill_uq"
  ON "skill_graph_progress" ("child_id", "skill_id");
CREATE INDEX IF NOT EXISTS "skill_graph_progress_child_idx"
  ON "skill_graph_progress" ("child_id");

ALTER TABLE "learning_progress" ADD COLUMN IF NOT EXISTS "coins" integer DEFAULT 0 NOT NULL;
ALTER TABLE "learning_progress" ADD COLUMN IF NOT EXISTS "stars" integer DEFAULT 0 NOT NULL;
ALTER TABLE "learning_progress" ADD COLUMN IF NOT EXISTS "badges" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "learning_progress" ADD COLUMN IF NOT EXISTS "daily_session" jsonb;
ALTER TABLE "learning_progress" ADD COLUMN IF NOT EXISTS "learning_memory" jsonb;
