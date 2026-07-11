-- Production startup funnel telemetry — append-only, pre-auth safe.
-- Persists every startup milestone and failure for conversion diagnostics.
CREATE TABLE IF NOT EXISTS startup_funnel_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'milestone',
  client_ts TIMESTAMPTZ,
  server_ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  elapsed_ms BIGINT,
  session_id TEXT NOT NULL,
  install_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  device_model TEXT,
  manufacturer TEXT,
  android_version TEXT,
  webview_version TEXT,
  app_version TEXT,
  build_number TEXT,
  network_type TEXT,
  carrier TEXT,
  locale TEXT,
  timezone TEXT,
  memory_class TEXT,
  battery_saver BOOLEAN,
  platform TEXT,
  country TEXT,
  language TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  cpu_architecture TEXT,
  play_store_version TEXT,
  startup_phase TEXT,
  start_type TEXT,
  failure_stack TEXT,
  failure_file TEXT,
  failure_line INTEGER,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS startup_funnel_events_event_server_idx
  ON startup_funnel_events (event_name, server_ts);

CREATE INDEX IF NOT EXISTS startup_funnel_events_device_server_idx
  ON startup_funnel_events (device_id, server_ts);

CREATE INDEX IF NOT EXISTS startup_funnel_events_install_server_idx
  ON startup_funnel_events (install_id, server_ts);

CREATE INDEX IF NOT EXISTS startup_funnel_events_session_idx
  ON startup_funnel_events (session_id);

CREATE INDEX IF NOT EXISTS startup_funnel_events_manufacturer_idx
  ON startup_funnel_events (manufacturer, server_ts);

CREATE INDEX IF NOT EXISTS startup_funnel_events_android_version_idx
  ON startup_funnel_events (android_version, server_ts);

CREATE INDEX IF NOT EXISTS startup_funnel_events_type_server_idx
  ON startup_funnel_events (event_type, server_ts);
