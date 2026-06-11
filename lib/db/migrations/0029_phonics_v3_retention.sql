-- Phonics V3 retention — spaced repetition schedules cloud sync

CREATE TABLE IF NOT EXISTS phonics_v3_retention (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  client_updated_at BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS phonics_v3_retention_child_uq ON phonics_v3_retention (child_id);
CREATE INDEX IF NOT EXISTS phonics_v3_retention_user_idx ON phonics_v3_retention (user_id);
