-- V9 global anonymous learning graph (per-skill aggregates)
CREATE TABLE IF NOT EXISTS "global_learning_graph" (
  "id" serial PRIMARY KEY NOT NULL,
  "skill" text NOT NULL,
  "success_rate" real NOT NULL DEFAULT 0.5,
  "engagement_score" real NOT NULL DEFAULT 0.5,
  "transitions" jsonb NOT NULL DEFAULT '{}',
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "global_learning_graph_skill_uq"
  ON "global_learning_graph" ("skill");
