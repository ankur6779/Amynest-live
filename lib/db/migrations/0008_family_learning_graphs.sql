-- V8 family learning graph (multi-child intelligence)
CREATE TABLE IF NOT EXISTS "family_learning_graphs" (
  "id" serial PRIMARY KEY NOT NULL,
  "family_id" text NOT NULL,
  "graph" jsonb NOT NULL,
  "insights" jsonb NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "family_learning_graphs_family_uq"
  ON "family_learning_graphs" ("family_id");
