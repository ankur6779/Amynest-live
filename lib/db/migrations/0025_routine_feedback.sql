-- Parent feedback loop (Priority 1): lightweight qualitative tags on routines
-- and activities. Lives above the frozen routine generation engine.
CREATE TABLE IF NOT EXISTS routine_feedback (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL,
  routine_id INTEGER NOT NULL,
  routine_date TEXT NOT NULL,
  activity_key TEXT,
  signal TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS routine_feedback_child_created_idx
  ON routine_feedback (child_id, created_at);

CREATE INDEX IF NOT EXISTS routine_feedback_routine_idx
  ON routine_feedback (routine_id);
