-- Speech Coach V2 — isolated analytics and usage tables (parallel to V1 speech_* tables)

CREATE TABLE IF NOT EXISTS speech_coach_v2_daily_usage (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  child_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  seconds_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, child_id, day)
);

CREATE TABLE IF NOT EXISTS speech_coach_v2_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  child_id INTEGER NOT NULL,
  age_band TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  words_spoken INTEGER NOT NULL DEFAULT 0,
  sentences_completed INTEGER NOT NULL DEFAULT 0,
  stars_earned INTEGER NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  average_overall_score REAL NOT NULL DEFAULT 0,
  average_accuracy REAL NOT NULL DEFAULT 0,
  average_fluency REAL NOT NULL DEFAULT 0,
  average_confidence REAL NOT NULL DEFAULT 0,
  completion_rate REAL NOT NULL DEFAULT 0,
  badges_earned JSONB NOT NULL DEFAULT '[]',
  phase_reached TEXT NOT NULL,
  scores_json JSONB NOT NULL DEFAULT '[]',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS speech_coach_v2_sessions_child_idx
  ON speech_coach_v2_sessions (user_id, child_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS speech_coach_v2_turn_log (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  child_id INTEGER NOT NULL,
  exercise_id TEXT,
  expected TEXT NOT NULL,
  transcript TEXT NOT NULL,
  accuracy_score INTEGER NOT NULL,
  fluency_score INTEGER NOT NULL,
  confidence_score INTEGER NOT NULL,
  completion_score INTEGER NOT NULL,
  overall_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS speech_coach_v2_turn_log_session_idx
  ON speech_coach_v2_turn_log (session_id);

CREATE TABLE IF NOT EXISTS speech_coach_v2_streaks (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  child_id INTEGER NOT NULL,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  weekly_streak INTEGER NOT NULL DEFAULT 0,
  last_practice_day TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, child_id)
);
