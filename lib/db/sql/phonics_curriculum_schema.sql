-- Phonics curriculum engine tables (run once on Postgres).

CREATE TABLE IF NOT EXISTS phonics_curriculum_progress (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  current_level INTEGER NOT NULL DEFAULT 1,
  mastery_score INTEGER NOT NULL DEFAULT 0,
  weak_phonemes JSONB NOT NULL DEFAULT '[]',
  streak INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  last_test_score INTEGER,
  last_test_at TIMESTAMPTZ,
  completed_today JSONB NOT NULL DEFAULT '{"date":"","ids":[]}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS phonics_curriculum_progress_child_uq
  ON phonics_curriculum_progress (child_id);

CREATE INDEX IF NOT EXISTS phonics_curriculum_progress_user_idx
  ON phonics_curriculum_progress (user_id);

CREATE TABLE IF NOT EXISTS phonics_daily_plans (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  plan_date TEXT NOT NULL,
  plan_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS phonics_daily_plans_child_date_uq
  ON phonics_daily_plans (child_id, plan_date);

CREATE INDEX IF NOT EXISTS phonics_daily_plans_user_idx
  ON phonics_daily_plans (user_id);

CREATE TABLE IF NOT EXISTS phonics_content_cache (
  id SERIAL PRIMARY KEY,
  cache_key TEXT NOT NULL,
  level INTEGER NOT NULL,
  vowel_focus TEXT,
  words JSONB NOT NULL DEFAULT '[]',
  prompt TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS phonics_content_cache_key_uq
  ON phonics_content_cache (cache_key);

CREATE INDEX IF NOT EXISTS phonics_content_cache_level_idx
  ON phonics_content_cache (level);
