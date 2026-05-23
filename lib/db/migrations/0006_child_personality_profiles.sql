-- Personality + learning style per child (content-orchestration V5 layer)
CREATE TABLE IF NOT EXISTS "child_personality_profiles" (
  "id" serial PRIMARY KEY NOT NULL,
  "child_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "traits" jsonb NOT NULL,
  "learning_style" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "child_personality_profiles_child_uq"
  ON "child_personality_profiles" ("child_id");

CREATE INDEX IF NOT EXISTS "child_personality_profiles_user_idx"
  ON "child_personality_profiles" ("user_id");
