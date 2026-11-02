-- Additive product-analytics spine columns.
-- Existing rows stay valid. New columns are nullable.
-- Apply this migration before relying on column indexes.
-- Ingest still persists the same facts inside props JSONB when columns
-- are not present yet, so a code deploy can precede this migration.
--
-- event_id is a nullable client idempotency key. Multiple NULL rows are
-- valid. Empty string is not a key. Uniqueness applies only when the value
-- is non-empty. The same rule applies to props->>'event_id'.
--
-- Do not use CREATE UNIQUE INDEX IF NOT EXISTS for these two indexes.
-- That statement leaves an existing index of the same name unchanged, including
-- a non-partial unique index. Each DO block below compares pg_get_expr of the
-- predicate. A matching partial predicate is a no-op. Any other state checks
-- for duplicate non-empty keys first and raises, leaving the old index in
-- place, when duplicates exist. Drop and create run in the same statement, so
-- a create failure rolls the drop back.

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

DO $event_id_uq$
DECLARE
  idx_oid oid;
  pred text;
  dup_groups bigint;
BEGIN
  SELECT c.oid, pg_get_expr(i.indpred, i.indrelid)
    INTO idx_oid, pred
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_index i ON i.indexrelid = c.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'i'
    AND c.relname = 'analytics_events_event_id_uq';

  IF idx_oid IS NOT NULL
     AND pred IS NOT NULL
     AND position('props' in pred) = 0
     AND position('event_id' in pred) > 0
     AND position('IS NOT NULL' in pred) > 0
     AND position('<>' in pred) > 0
     AND position(' OR ' in upper(pred)) = 0 THEN
    RETURN;
  END IF;

  SELECT count(*) INTO dup_groups
  FROM (
    SELECT event_id
    FROM analytics_events
    WHERE event_id IS NOT NULL AND event_id <> ''
    GROUP BY event_id
    HAVING count(*) > 1
  ) d;

  IF dup_groups > 0 THEN
    RAISE EXCEPTION 'analytics_events_event_id_uq left unchanged: % duplicate non-empty event_id groups', dup_groups;
  END IF;

  IF idx_oid IS NOT NULL THEN
    EXECUTE 'DROP INDEX public.analytics_events_event_id_uq';
  END IF;

  CREATE UNIQUE INDEX analytics_events_event_id_uq
    ON public.analytics_events (event_id)
    WHERE event_id IS NOT NULL AND event_id <> '';
END
$event_id_uq$;

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
DO $props_event_id_uq$
DECLARE
  idx_oid oid;
  pred text;
  dup_groups bigint;
BEGIN
  SELECT c.oid, pg_get_expr(i.indpred, i.indrelid)
    INTO idx_oid, pred
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_index i ON i.indexrelid = c.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'i'
    AND c.relname = 'analytics_events_props_event_id_uq';

  IF idx_oid IS NOT NULL
     AND pred IS NOT NULL
     AND position('props' in pred) > 0
     AND position('event_id' in pred) > 0
     AND position('IS NOT NULL' in pred) > 0
     AND position('<>' in pred) > 0
     AND position(' OR ' in upper(pred)) = 0 THEN
    RETURN;
  END IF;

  SELECT count(*) INTO dup_groups
  FROM (
    SELECT props->>'event_id' AS event_id
    FROM analytics_events
    WHERE coalesce(props->>'event_id', '') <> ''
    GROUP BY 1
    HAVING count(*) > 1
  ) d;

  IF dup_groups > 0 THEN
    RAISE EXCEPTION 'analytics_events_props_event_id_uq left unchanged: % duplicate non-empty props event_id groups', dup_groups;
  END IF;

  IF idx_oid IS NOT NULL THEN
    EXECUTE 'DROP INDEX public.analytics_events_props_event_id_uq';
  END IF;

  CREATE UNIQUE INDEX analytics_events_props_event_id_uq
    ON public.analytics_events ((props->>'event_id'))
    WHERE props->>'event_id' IS NOT NULL AND props->>'event_id' <> '';
END
$props_event_id_uq$;
