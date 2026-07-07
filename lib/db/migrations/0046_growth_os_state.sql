-- Growth Operating System — operational state (decisions, experiments, alerts, audit).
CREATE TABLE IF NOT EXISTS "growth_os_state" (
  "id" text PRIMARY KEY DEFAULT 'singleton',
  "payload" jsonb NOT NULL DEFAULT '{}',
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
