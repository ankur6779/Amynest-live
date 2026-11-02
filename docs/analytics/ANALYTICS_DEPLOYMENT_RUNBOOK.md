# AmyNest analytics deployment runbook

Date: 2 Nov 2026, Asia/Calcutta.

Migration `0052` was not applied by this certification. Do not apply it, deploy production, change RevenueCat products, or change Google Ads campaign `23986249354` without an explicit approval. This runbook is the check list for that approval. It is not a record that the checks were executed.

## Schema comparison

`lib/db/migrations/0052_analytics_product_spine.sql` adds nullable columns that `lib/db/src/schema/analytics_events.ts` already declares: `event_id`, identity and page columns, attribution columns, and `ingestion_status`.

The difference that matters:

- The SQL unique index `analytics_events_event_id_uq` is partial: `WHERE event_id IS NOT NULL AND event_id <> ''`.
- The Drizzle schema declares `uniqueIndex("analytics_events_event_id_uq").on(t.eventId)` with no predicate.
- The SQL also creates `analytics_events_props_event_id_uq` on `props->>'event_id'`. Drizzle does not declare that expression index.
- `CREATE INDEX IF NOT EXISTS` does not replace an index that already has that name. If a non-partial index is created first, the partial definition is not applied.
- Do not run `db:push` against Coolify. It can try to reconcile the Drizzle index with the database.

PostgreSQL unique indexes allow multiple NULLs. Duplicate non-empty `event_id` values make `CREATE UNIQUE INDEX` fail. That is the pre-check below.

Ingest reads `information_schema` for `event_id`. Before the column exists, the same values stay in `props`. After it exists, ingest also fills the columns. Existing queries that read `props` keep working.

## Pre-migration checks

Run these on Coolify only when schema approval is explicit. They do not change data.

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'analytics_events'
  AND column_name IN ('event_id', 'installation_id', 'firebase_uid', 'gclid');

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'analytics_events'
  AND indexname IN (
    'analytics_events_event_id_uq',
    'analytics_events_props_event_id_uq'
  );

SELECT count(*) AS rows FROM analytics_events;

SELECT event_id, count(*)
FROM analytics_events
WHERE event_id IS NOT NULL AND event_id <> ''
GROUP BY event_id
HAVING count(*) > 1;

SELECT props->>'event_id' AS event_id, count(*)
FROM analytics_events
WHERE coalesce(props->>'event_id', '') <> ''
GROUP BY 1
HAVING count(*) > 1;

SELECT
  count(*) FILTER (WHERE event_id IS NULL) AS null_event_id,
  count(*) FILTER (WHERE event_id = '') AS empty_event_id
FROM analytics_events;
```

Stop if either duplicate query returns rows. Do not delete those rows as part of this migration. Decide the keeper explicitly.

`installation_id` is not a column in `0052`. It is stored in `props` and copied from the device id. The column check above is expected to show no `installation_id` column.

## Apply

Only after the duplicate checks return no rows, and only with approval:

1. Deploy the API and web build first. Do not run `0052` in the same step.
2. Confirm `POST /api/analytics/events` and `POST /api/analytics/preauth-events` still accept the previous payload and return 202.
3. Execute `lib/db/migrations/0052_analytics_product_spine.sql` once. Statements are `ADD COLUMN IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
4. Restart the API so the column cache re-reads `event_id`.
5. Run the post-checks.

There is no migration journal entry. Applying the file is the only application step. Do not rely on `db:push`.

## Post-migration checks

```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'analytics_events'
  AND column_name = 'event_id';

SELECT indexdef
FROM pg_indexes
WHERE indexname = 'analytics_events_event_id_uq';

SELECT id, event_id, props->>'event_id' AS props_event_id
FROM analytics_events
ORDER BY server_ts DESC
LIMIT 20;
```

A new event should have the same id in the column and in `props` after the API restart. Older rows keep their `props` payload. A null `event_id` on an old row is expected, not a failure.

Confirm the Product panel on `/admin/growth` still loads. Unknown purchase class, device queue "Not collected", and purchase reconciliation "Collected" or "Unverified" should be visible. An empty range is zero events, not a collector failure.

## Rollback

- Redeploy the previous API and web build.
- Leave the new columns and indexes in place.
- Do not drop columns if the new API has written them. `props` still holds the payload, but dropping columns removes the column copy.
- Do not drop the unique indexes while the new API is still inserting `event_id`.

## What this certification did not do

- Did not connect to Coolify.
- Did not execute the SQL above.
- Did not deploy the API.
- Did not change RevenueCat products or prices.
- Did not upload a Google Ads conversion or edit campaign `23986249354`.
- Did not run the Android WebView or the iOS WKWebView.

Android and iOS attribution and event delivery remain unverified on hardware. iOS has no SKAdNetwork, AdAttributionKit, or ATT implementation, so unknown iOS acquisition must stay unknown.
