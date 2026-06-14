-- Nutrition Hub — server-backed daily score / checklist log

CREATE TABLE IF NOT EXISTS nutrition_daily_log (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  checklist JSONB NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  min_day_met BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS nutrition_daily_log_child_date_uq
  ON nutrition_daily_log (child_id, date_key);

CREATE INDEX IF NOT EXISTS nutrition_daily_log_user_idx ON nutrition_daily_log (user_id);
CREATE INDEX IF NOT EXISTS nutrition_daily_log_child_idx ON nutrition_daily_log (child_id);
