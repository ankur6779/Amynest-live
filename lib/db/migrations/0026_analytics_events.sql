-- Unified product analytics spine (append-only). Events are validated against
-- the analytics taxonomy before insert. Pure measurement; never feeds the
-- frozen routine generation engine.
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  child_id INTEGER,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  session_id TEXT,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  platform TEXT,
  app_version TEXT,
  client_ts TIMESTAMPTZ,
  server_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_events_event_created_idx
  ON analytics_events (event_name, server_ts);

CREATE INDEX IF NOT EXISTS analytics_events_user_created_idx
  ON analytics_events (user_id, server_ts);

CREATE INDEX IF NOT EXISTS analytics_events_category_created_idx
  ON analytics_events (event_category, server_ts);
