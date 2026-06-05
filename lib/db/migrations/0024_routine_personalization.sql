-- Routine personalization memory + activity outcome persistence
CREATE TABLE IF NOT EXISTS routine_personalization_snapshots (
  id SERIAL PRIMARY KEY,
  child_id TEXT NOT NULL,
  routine_date TEXT NOT NULL,
  activity_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS routine_pers_snap_child_date_uq
  ON routine_personalization_snapshots (child_id, routine_date);

CREATE INDEX IF NOT EXISTS routine_pers_snap_child_recorded_idx
  ON routine_personalization_snapshots (child_id, recorded_at);

CREATE TABLE IF NOT EXISTS routine_activity_outcomes (
  id TEXT PRIMARY KEY,
  child_id TEXT,
  routine_date TEXT,
  activity TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'unknown',
  completed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS routine_outcome_child_recorded_idx
  ON routine_activity_outcomes (child_id, recorded_at);
