-- Unified retention state: streaks, daily goals, rewards, resume, win-back
CREATE TABLE IF NOT EXISTS "user_retention" (
  "user_id" text PRIMARY KEY NOT NULL,
  "current_streak" integer NOT NULL DEFAULT 0,
  "longest_streak" integer NOT NULL DEFAULT 0,
  "last_active_date" date,
  "last_checkin_date" date,
  "shield_used_month" text,
  "total_stars" integer NOT NULL DEFAULT 0,
  "total_coins" integer NOT NULL DEFAULT 0,
  "parent_xp" integer NOT NULL DEFAULT 0,
  "daily_goals" jsonb NOT NULL DEFAULT '{"routine":false,"story":false,"activity":false,"speech":false}',
  "goals_date" date,
  "achievements" jsonb NOT NULL DEFAULT '[]',
  "preferences" jsonb NOT NULL DEFAULT '{}',
  "resume_items" jsonb NOT NULL DEFAULT '[]',
  "inactive_days" integer NOT NULL DEFAULT 0,
  "winback_level" integer NOT NULL DEFAULT 0,
  "weekly_summary_cache" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_retention_user_idx" ON "user_retention" ("user_id");
CREATE INDEX IF NOT EXISTS "user_retention_last_active_idx" ON "user_retention" ("last_active_date");
