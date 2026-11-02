-- Forward repair for analytics event_id uniqueness.
--
-- 0052 in this revision already creates the partial unique indexes with the
-- same DO blocks. Run 0053 anyway after 0052. When the predicate already
-- matches, each block returns without dropping the index.
--
-- This file exists so a database that already applied an older 0052
-- (CREATE UNIQUE INDEX IF NOT EXISTS) still gets corrected. IF NOT EXISTS
-- does not replace a non-partial index that already has the same name.
-- A missing index is created. A predicate that is null or does not exclude
-- empty strings is replaced only after the duplicate pre-check.
--
-- Do not run this before analytics_events.event_id exists.
-- This file does not drop columns and does not delete rows.

DO $event_id_column_guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'analytics_events'
      AND column_name = 'event_id'
  ) THEN
    RAISE EXCEPTION 'analytics_events.event_id is missing. Apply 0052 column adds before 0053.';
  END IF;
END
$event_id_column_guard$;

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
