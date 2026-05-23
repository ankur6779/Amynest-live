-- NBA ML decision logs (realtime V3 training pipeline)
CREATE TABLE IF NOT EXISTS "nba_decision_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "child_id" integer NOT NULL,
  "user_id" text,
  "timestamp" timestamp with time zone NOT NULL,
  "features" jsonb NOT NULL,
  "normalized_features" jsonb NOT NULL,
  "action_taken" text NOT NULL,
  "mapped_action" text NOT NULL,
  "source" text NOT NULL,
  "confidence" double precision NOT NULL,
  "reward_estimate" double precision,
  "outcome" jsonb,
  "reward" double precision,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "nba_decision_logs_child_idx"
  ON "nba_decision_logs" ("child_id");

CREATE INDEX IF NOT EXISTS "nba_decision_logs_timestamp_idx"
  ON "nba_decision_logs" ("timestamp");
