-- Parent Hub 3-day guided journey (free period → paywall)
CREATE TABLE IF NOT EXISTS "parent_hub_journey" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "child_id" integer,
  "completed_days" jsonb NOT NULL DEFAULT '[]',
  "current_day" integer NOT NULL DEFAULT 1,
  "peek_ahead_used" jsonb NOT NULL DEFAULT '[]',
  "bonus_unlocks" jsonb NOT NULL DEFAULT '[]',
  "day_completed_at" jsonb NOT NULL DEFAULT '{}',
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "parent_hub_journey_user_uq"
  ON "parent_hub_journey" ("user_id");
CREATE INDEX IF NOT EXISTS "parent_hub_journey_user_idx"
  ON "parent_hub_journey" ("user_id");
