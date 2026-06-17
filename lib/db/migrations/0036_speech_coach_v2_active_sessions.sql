-- Speech Coach V2 — active session registry + monthly usage + enriched turn log

CREATE TABLE IF NOT EXISTS speech_coach_v2_active_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  child_id INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seconds_consumed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  age_band TEXT NOT NULL,
  session_state_json JSONB NOT NULL DEFAULT '{}',
  tab_lock_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS speech_coach_v2_active_child_unique
  ON speech_coach_v2_active_sessions (user_id, child_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS speech_coach_v2_active_user_child_idx
  ON speech_coach_v2_active_sessions (user_id, child_id, status);

CREATE TABLE IF NOT EXISTS speech_coach_v2_monthly_usage (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  child_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  seconds_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, child_id, month)
);

ALTER TABLE speech_coach_v2_turn_log
  ADD COLUMN IF NOT EXISTS raw_transcript TEXT,
  ADD COLUMN IF NOT EXISTS transcript_accuracy INTEGER,
  ADD COLUMN IF NOT EXISTS pronunciation_estimate INTEGER,
  ADD COLUMN IF NOT EXISTS scoring_confidence TEXT,
  ADD COLUMN IF NOT EXISTS speaking_rate_score INTEGER;
