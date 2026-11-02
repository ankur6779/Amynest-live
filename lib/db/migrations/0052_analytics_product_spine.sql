-- Additive product-analytics spine columns.
-- Existing rows stay valid. New columns are nullable.
-- Apply this migration before relying on column indexes.
-- Ingest still persists the same facts inside props JSONB when columns
-- are not present yet, so a code deploy can precede this migration.

ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS anonymous_device_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS canonical_user_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS firebase_uid TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS page_name TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS page_path TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS previous_page TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS referrer_page TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS route_transition_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS feature_name TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS page_visit_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS page_duration_ms INTEGER;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS interaction_type TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS app_build TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS os_version TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS device_model TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS webview_version TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS install_source TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS gclid TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS gbraid TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS wbraid TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS campaign_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS attribution_status TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS network_type TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_schema_version TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS ingestion_status TEXT DEFAULT 'accepted';

CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_event_id_uq
  ON analytics_events (event_id)
  WHERE event_id IS NOT NULL AND event_id <> '';

CREATE INDEX IF NOT EXISTS analytics_events_anonymous_device_idx
  ON analytics_events (anonymous_device_id, server_ts);
CREATE INDEX IF NOT EXISTS analytics_events_canonical_user_idx
  ON analytics_events (canonical_user_id, server_ts);
CREATE INDEX IF NOT EXISTS analytics_events_session_idx
  ON analytics_events (session_id, server_ts);
CREATE INDEX IF NOT EXISTS analytics_events_page_name_idx
  ON analytics_events (page_name, server_ts);
CREATE INDEX IF NOT EXISTS analytics_events_feature_name_idx
  ON analytics_events (feature_name, server_ts);
CREATE INDEX IF NOT EXISTS analytics_events_platform_idx
  ON analytics_events (platform, server_ts);
CREATE INDEX IF NOT EXISTS analytics_events_app_version_idx
  ON analytics_events (app_version, server_ts);
CREATE INDEX IF NOT EXISTS analytics_events_campaign_idx
  ON analytics_events (campaign_id, server_ts);
CREATE INDEX IF NOT EXISTS analytics_events_client_ts_idx
  ON analytics_events (client_ts);

-- Idempotency for events stored before columns were backfilled.
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_props_event_id_uq
  ON analytics_events ((props->>'event_id'))
  WHERE props->>'event_id' IS NOT NULL AND props->>'event_id' <> '';
