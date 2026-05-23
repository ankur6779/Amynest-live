-- V10 autonomous meta-learning state
CREATE TABLE IF NOT EXISTS "system_meta_state" (
  "id" serial PRIMARY KEY NOT NULL,
  "metrics" jsonb NOT NULL,
  "active_models" jsonb NOT NULL DEFAULT '[]',
  "experiments" jsonb NOT NULL DEFAULT '[]',
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "system_meta_state_updated_idx"
  ON "system_meta_state" ("updated_at" DESC);
