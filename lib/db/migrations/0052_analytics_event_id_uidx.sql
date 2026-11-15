-- Nullable analytics event_id uniqueness.
--
-- Intended semantics:
--   NULL and blank event_id values are not idempotency keys. Many rows may omit one.
--   A non-empty event_id is unique across analytics_events.
--
-- Drizzle defines the same rule as a partial unique index:
--   uniqueIndex("analytics_events_event_id_uidx").on(event_id)
--   WHERE event_id IS NOT NULL AND btrim(event_id) <> ''
--
-- A non-partial UNIQUE (event_id) is the wrong index: PostgreSQL would still
-- allow multiple NULLs, but only one blank string, and CREATE INDEX IF NOT EXISTS
-- would keep that wrong index forever. This migration compares the predicate
-- and replaces a wrong index. It does not delete rows.
--
-- DO NOT APPLY until the prechecks in
-- docs/analytics/ANALYTICS_DEPLOYMENT_RUNBOOK.md have been run by a human
-- against the target database. Run this file as one transaction.

BEGIN;

ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_id text;

DO $$
DECLARE
  rec record;
  cols name[];
  dup_count bigint;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT event_id
    FROM analytics_events
    WHERE event_id IS NOT NULL AND btrim(event_id) <> ''
    GROUP BY event_id
    HAVING count(*) > 1
  ) d;

  IF dup_count > 0 THEN
    RAISE EXCEPTION
      '0052 aborted: % duplicate non-empty event_id group(s) exist. No rows were deleted.',
      dup_count;
  END IF;

  FOR rec IN
    SELECT i.relname AS index_name,
           ix.indisunique,
           pg_get_expr(ix.indpred, ix.indrelid) AS pred,
           (
             SELECT array_agg(a.attname ORDER BY k.ord)
             FROM unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord)
             JOIN pg_attribute a
               ON a.attrelid = t.oid AND a.attnum = k.attnum AND a.attnum > 0
           ) AS cols
    FROM pg_class t
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_index ix ON ix.indrelid = t.oid
    JOIN pg_class i ON i.oid = ix.indexrelid
    WHERE n.nspname = 'public'
      AND t.relname = 'analytics_events'
  LOOP
    cols := rec.cols;
    IF cols = ARRAY['event_id']::name[] AND rec.indisunique THEN
      IF rec.pred IS NULL
         OR rec.pred NOT LIKE '%event_id IS NOT NULL%'
         OR rec.pred NOT LIKE '%btrim(event_id)%'
         OR rec.index_name <> 'analytics_events_event_id_uidx'
      THEN
        EXECUTE format('DROP INDEX IF EXISTS %I', rec.index_name);
      END IF;
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_event_id_uidx
  ON analytics_events (event_id)
  WHERE event_id IS NOT NULL AND btrim(event_id) <> '';

COMMIT;
