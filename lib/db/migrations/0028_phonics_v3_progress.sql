-- Phonics V3 Elite — server persistence for mastery, fluency, stories, missions

CREATE TABLE IF NOT EXISTS phonics_v3_mastery (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  client_updated_at BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS phonics_v3_mastery_child_uq ON phonics_v3_mastery (child_id);
CREATE INDEX IF NOT EXISTS phonics_v3_mastery_user_idx ON phonics_v3_mastery (user_id);

CREATE TABLE IF NOT EXISTS phonics_v3_fluency (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  client_updated_at BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS phonics_v3_fluency_child_uq ON phonics_v3_fluency (child_id);
CREATE INDEX IF NOT EXISTS phonics_v3_fluency_user_idx ON phonics_v3_fluency (user_id);

CREATE TABLE IF NOT EXISTS phonics_v3_story_progress (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  client_updated_at BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS phonics_v3_story_progress_child_uq ON phonics_v3_story_progress (child_id);
CREATE INDEX IF NOT EXISTS phonics_v3_story_progress_user_idx ON phonics_v3_story_progress (user_id);

CREATE TABLE IF NOT EXISTS phonics_v3_missions (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  client_updated_at BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS phonics_v3_missions_child_uq ON phonics_v3_missions (child_id);
CREATE INDEX IF NOT EXISTS phonics_v3_missions_user_idx ON phonics_v3_missions (user_id);
