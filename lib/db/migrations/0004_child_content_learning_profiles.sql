-- V2 adaptive learning profile (content-orchestration)
CREATE TABLE IF NOT EXISTS "child_content_learning_profiles" (
  "id" serial PRIMARY KEY NOT NULL,
  "child_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "profile" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "child_content_learning_profiles_child_uq"
  ON "child_content_learning_profiles" ("child_id");

CREATE INDEX IF NOT EXISTS "child_content_learning_profiles_user_idx"
  ON "child_content_learning_profiles" ("user_id");
