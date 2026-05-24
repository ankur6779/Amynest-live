-- Routine 3-day guided journey (free period → paywall)
CREATE TABLE IF NOT EXISTS "routine_journey" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "completed_days" jsonb NOT NULL DEFAULT '[]',
  "current_day" integer NOT NULL DEFAULT 1,
  "generations_completed" jsonb NOT NULL DEFAULT '[]',
  "day_completed_at" jsonb NOT NULL DEFAULT '{}',
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "routine_journey_user_uq"
  ON "routine_journey" ("user_id");
CREATE INDEX IF NOT EXISTS "routine_journey_user_idx"
  ON "routine_journey" ("user_id");
