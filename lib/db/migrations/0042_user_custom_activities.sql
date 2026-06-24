CREATE TABLE IF NOT EXISTS "user_custom_activities" (
  "id" serial PRIMARY KEY,
  "user_id" text NOT NULL,
  "child_id" integer,
  "title" text NOT NULL,
  "category" text NOT NULL DEFAULT 'activity',
  "days_of_week" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "location" text,
  "notes" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "user_custom_activities_user_child_idx"
  ON "user_custom_activities" ("user_id", "child_id");

CREATE INDEX IF NOT EXISTS "user_custom_activities_active_idx"
  ON "user_custom_activities" ("user_id", "is_active");
