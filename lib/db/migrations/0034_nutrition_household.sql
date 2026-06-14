-- Nutrition Hub Sprint 5 — meal memory + caregiver share links

CREATE TABLE IF NOT EXISTS nutrition_meal_memory (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS nutrition_meal_memory_child_uq ON nutrition_meal_memory (child_id);
CREATE INDEX IF NOT EXISTS nutrition_meal_memory_user_idx ON nutrition_meal_memory (user_id);

CREATE TABLE IF NOT EXISTS nutrition_caregiver_share (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  share_token TEXT NOT NULL,
  child_ids JSONB NOT NULL DEFAULT '[]',
  payload JSONB NOT NULL DEFAULT '{"children":[],"foodStyle":"indian"}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS nutrition_caregiver_share_token_uq ON nutrition_caregiver_share (share_token);
CREATE INDEX IF NOT EXISTS nutrition_caregiver_share_user_idx ON nutrition_caregiver_share (user_id);
