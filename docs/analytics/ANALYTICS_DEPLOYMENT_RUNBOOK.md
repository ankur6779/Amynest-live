# Analytics deployment runbook

**Date:** 15 November 2026  
**Migration `0052`:** written, **not applied**.  
**Production deploy:** not performed.  
**Staging deploy:** not performed. Stopped before migration prechecks because no staging database is configured.

## Planes

| Plane | This pass |
|---|---|
| Cloudflare Pages | not deployed |
| Coolify API | not deployed |
| Cloudflare API proxy worker | not deployed |
| Local dev Postgres `amynest_dev` | read-only index inspection only |
| Production database | not contacted |

## Migration 0052 prechecks

Run these yourself against the target database. Do not skip a database because another environment was clean.

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'analytics_events'
  AND column_name = 'event_id';

SELECT i.relname AS index_name,
       ix.indisunique,
       pg_get_expr(ix.indpred, ix.indrelid) AS predicate
FROM pg_class t
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_index ix ON ix.indrelid = t.oid
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE n.nspname = 'public'
  AND t.relname = 'analytics_events'
ORDER BY 1;
```

If `event_id` already exists, run the duplicate precheck **before** applying the file:

```sql
SELECT event_id, count(*)
FROM analytics_events
WHERE event_id IS NOT NULL AND btrim(event_id) <> ''
GROUP BY event_id
HAVING count(*) > 1;
```

Stop if that query returns rows. The migration will also raise and will not delete those rows. Fix the duplicates in a separately approved change, then rerun.

Local `amynest_dev` on 15 Nov 2026: `event_id` was absent, and the only unique index was `analytics_events_pkey` on `id`. The duplicate query was not run because the column does not exist. That result does not describe production.

## Apply

Human approval required. Not done in this pass.

```bash
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/migrations/0052_analytics_event_id_uidx.sql
```

The file is `BEGIN` … `COMMIT`. Run it as one transaction. Do not use `db:push`.

What it does:

1. Adds nullable `analytics_events.event_id` if missing.
2. Raises if any non-empty `event_id` is duplicated.
3. Drops a unique index whose only column is `event_id` when it is non-partial, has the wrong predicate, or uses a different name. `CREATE INDEX IF NOT EXISTS` alone is not used for that repair.
4. Creates `analytics_events_event_id_uidx` on non-blank `event_id`.

A second run is a no-op when that partial index is already correct.

## Verification

```sql
SELECT pg_get_indexdef(i.oid) AS indexdef
FROM pg_class i
JOIN pg_namespace n ON n.oid = i.relnamespace
WHERE n.nspname = 'public'
  AND i.relname = 'analytics_events_event_id_uidx';
```

Expect a unique index whose `WHERE` clause contains `event_id IS NOT NULL` and `btrim(event_id)`.

```sql
SELECT count(*) AS blank_or_null
FROM analytics_events
WHERE event_id IS NULL OR btrim(event_id) = '';
```

That count may be the whole table. Those rows are allowed to repeat.

Do not start writing `event_id` from `analyticsIngestService` until this verification succeeds on the database that will receive the deploy. The current insert omits the column so a deploy before the migration does not reference a missing column.

## Rollback limitations

- `ROLLBACK` works only if the `COMMIT` has not happened.
- After commit, dropping the index removes idempotency enforcement. It does not restore a previous wrong index.
- `ALTER TABLE analytics_events DROP COLUMN event_id` deletes every stored idempotency key. Do that only with a backup and a separate approval.
- The migration never deletes duplicate rows, so there is nothing to restore from a data delete.
- Historical `child_id` values were not scrubbed. Do not add a scrub to this migration.

## Staging checklist

Do these in order. This pass completed none of the apply or device steps.

1. Approve a staging database target that is not production.
2. Run the prechecks above on that database.
3. Apply `0052` in one transaction and run the verification SQL.
4. Only then ship an ingest change that writes non-empty `event_id`.
5. Deploy the API and web build that contain child redaction, `game_abandoned`, and RevenueCat classification to **staging**.
6. Send a RevenueCat **sandbox** webhook and confirm `classification` is `trial` or `paid_initial` from `period_type`, and that a trial does not call purchase truth.
7. Install a debug Android or iOS build on a real device or a booted simulator. Confirm `first_open` ACK, offline queue, login stitch, and one abandoned game versus one completed game.
8. Leave production, Play production, App Store production, Google Ads, prices, and trial policy unchanged.

## Production

Blocked until staging steps 2–7 have evidence, and until a separate production approval exists. Do not apply `0052` to production to make a dashboard match.
