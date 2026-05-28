-- Unified child learning profile for LearningProgressEngine
CREATE TABLE IF NOT EXISTS "learning_progress" (
  "id" serial PRIMARY KEY NOT NULL,
  "child_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "journey_day" integer DEFAULT 1 NOT NULL,
  "learning_level" integer DEFAULT 1 NOT NULL,
  "mastery_score" integer DEFAULT 0 NOT NULL,
  "streak_days" integer DEFAULT 0 NOT NULL,
  "total_xp" integer DEFAULT 0 NOT NULL,
  "completed_activities" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "unlocked_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "weak_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "preferred_learning_modes" jsonb DEFAULT '["play","visual"]'::jsonb NOT NULL,
  "last_active_date" text,
  "current_phase" text DEFAULT 'explore' NOT NULL,
  "current_curriculum_stage" text DEFAULT 'early' NOT NULL,
  "daily_unlock_seed" integer DEFAULT 0 NOT NULL,
  "next_recommended_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "section_progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "learning_progress_child_uq"
  ON "learning_progress" ("child_id");
CREATE INDEX IF NOT EXISTS "learning_progress_user_idx"
  ON "learning_progress" ("user_id");
CREATE INDEX IF NOT EXISTS "learning_progress_child_idx"
  ON "learning_progress" ("child_id");
