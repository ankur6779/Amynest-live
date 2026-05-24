-- 7-day user activation journey (retention habit loop)
CREATE TABLE IF NOT EXISTS "user_activation_journey" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "current_day" integer NOT NULL DEFAULT 1,
  "completed_days" jsonb NOT NULL DEFAULT '[]',
  "day_completed_at" jsonb NOT NULL DEFAULT '{}',
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_activation_journey_user_uq"
  ON "user_activation_journey" ("user_id");
CREATE INDEX IF NOT EXISTS "user_activation_journey_user_idx"
  ON "user_activation_journey" ("user_id");
