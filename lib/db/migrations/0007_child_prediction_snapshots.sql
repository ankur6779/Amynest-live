-- V6 behavioral prediction snapshots (content-orchestration)
CREATE TABLE IF NOT EXISTS "child_prediction_snapshots" (
  "id" serial PRIMARY KEY NOT NULL,
  "child_id" integer NOT NULL,
  "predicted_skills" jsonb NOT NULL,
  "drop_off_risk" real NOT NULL,
  "engagement_score" real NOT NULL,
  "confidence" real NOT NULL DEFAULT 0.5,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "child_prediction_snapshots_child_created_idx"
  ON "child_prediction_snapshots" ("child_id", "created_at" DESC);
