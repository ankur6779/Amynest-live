# AmyNest analytics deployment runbook

Date: 2 Nov 2026, Asia/Calcutta.

Migrations `0052` and `0053` were not applied by the 2 Nov certification. On 10 Nov 2026 the schema change was approved. They still have not been executed: the database host does not resolve from outside Coolify, and the ops route is not on the running API until that build is released. Do not release the live API, change RevenueCat products, or change Google Ads campaign `23986249354` without an explicit approval. This runbook is the procedure. It is not a record that the checks were executed.

## Intended uniqueness

`event_id` is a nullable client idempotency key.

- Multiple NULL values are allowed. Historical rows have no key.
- Empty string is not a key.
- The same non-empty `event_id` may be stored once.
- The same rule applies to `props->>'event_id'`, which covers rows written before the column existed.

A non-partial unique index is the wrong shape. PostgreSQL already allows many NULLs in a non-partial unique index, but it treats `''` as a real key, and `CREATE UNIQUE INDEX IF NOT EXISTS` will not replace an index that already has that name.

Drizzle now declares both indexes as partial:

- `analytics_events_event_id_uq` where `event_id IS NOT NULL AND event_id <> ''`
- `analytics_events_props_event_id_uq` where `props->>'event_id' IS NOT NULL AND props->>'event_id' <> ''`

Do not run `db:push` against Coolify. Apply the SQL files below.

## What was checked from this environment

A read-only `SELECT` was attempted against the configured database. The host did not resolve (`getaddrinfo ENOTFOUND`). No index definition was read. No duplicate count was read. No migration was executed. Live index state and live duplicate state are **UNVERIFIED**.

`psql` is not installed here. Android `adb` is not installed. `ANDROID_HOME` is unset. `xcodebuild` is not installed. No signing credentials and no physical device were available. That is not a device pass.

## Pre-migration checks

Run these read-only statements on the target database only when schema approval is explicit. Stop if either duplicate query returns a group count above zero. Do not delete rows from this migration.

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'analytics_events'
  AND column_name IN ('event_id', 'installation_id', 'firebase_uid', 'gclid');

SELECT c.relname AS indexname,
       i.indisunique,
       pg_get_expr(i.indpred, i.indrelid) AS predicate,
       pg_get_indexdef(i.indexrelid) AS indexdef
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_index i ON i.indexrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relname IN (
    'analytics_events_event_id_uq',
    'analytics_events_props_event_id_uq'
  );

SELECT count(*) AS rows FROM analytics_events;

SELECT count(*) AS duplicate_groups
FROM (
  SELECT event_id
  FROM analytics_events
  WHERE event_id IS NOT NULL AND event_id <> ''
  GROUP BY event_id
  HAVING count(*) > 1
) d;

SELECT count(*) AS props_duplicate_groups
FROM (
  SELECT props->>'event_id' AS event_id
  FROM analytics_events
  WHERE coalesce(props->>'event_id', '') <> ''
  GROUP BY 1
  HAVING count(*) > 1
) d;

SELECT
  count(*) FILTER (WHERE event_id IS NULL) AS null_event_id,
  count(*) FILTER (WHERE event_id = '') AS empty_event_id
FROM analytics_events;
```

`installation_id` is not a column. It stays in `props`. A missing `installation_id` column is expected.

If `analytics_events_event_id_uq` already exists and `predicate` is null, the index is non-partial. Do not leave it in place. `0052` and `0053` replace it only after the duplicate count is zero. If the duplicate count is not zero, the migration raises and does not drop the existing index. Decide the keeper row outside this migration.

## Migration SQL

Execute the files. Do not retype them as `CREATE UNIQUE INDEX IF NOT EXISTS`. That form silently keeps a wrong index of the same name.

1. `lib/db/migrations/0052_analytics_product_spine.sql`
2. `lib/db/migrations/0053_analytics_event_id_partial_unique.sql`

`0052` adds the nullable columns, then runs one `DO` block per unique index. `0053` is the forward repair for a database that already applied an older `0052`. Each block:

- Reads `pg_get_expr` for the index predicate.
- Returns immediately when the predicate is already partial, references `event_id`, contains `IS NOT NULL` and `<>`, and does not contain `OR`. The column index must not mention `props`. The props index must mention `props`.
- Counts duplicate non-empty keys and `RAISE EXCEPTION` before any `DROP` when that count is above zero.
- Drops the wrong index only after that check, then creates the partial unique index.
- The drop and create are one statement. A create failure rolls the drop back.

`0053` raises if `analytics_events.event_id` does not exist yet. Apply `0052` first. Running `0053` after the new `0052` is a no-op when the predicate already matches.

There is no migration journal. Executing the files is the application step.

## Apply order

Only after the duplicate checks return zero, and only with approval.

On 10 Nov 2026 the schema change was approved. Coolify Postgres does not accept a connection from outside the Docker network, so the running API applies the files. Deploy the API build that contains `POST /api/healthz/ops/analytics-mig-0052-0053`, then call that route with `x-health-secret`. The route reads the two SQL files from `/app/migrations`, refuses to start when a non-empty `event_id` is duplicated, and runs `0052` then `0053` in one transaction. It does not delete rows and it does not run `db:push`.

Direct order, when a database session is available:

1. Deploy the API and web build first. Do not run the migrations in the same step.
2. Confirm `POST /api/analytics/events` and `POST /api/analytics/preauth-events` still accept a previous allowlisted payload and return 202. A missing device id on the pre-auth route returns 400. The production limits stay 60 requests per IP and 30 requests per device per 60 seconds.
3. Execute `0052`, then `0053`.
4. Restart the API so the column cache re-reads `event_id`.
5. Run the verification SQL.

## Verification SQL

```sql
SELECT c.relname AS indexname,
       i.indisunique,
       pg_get_expr(i.indpred, i.indrelid) AS predicate
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_index i ON i.indexrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relname IN (
    'analytics_events_event_id_uq',
    'analytics_events_props_event_id_uq'
  );

SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'analytics_events'
  AND column_name = 'event_id';

SELECT id, event_id, props->>'event_id' AS props_event_id
FROM analytics_events
ORDER BY server_ts DESC
LIMIT 20;
```

Pass conditions:

- Both indexes exist, `indisunique` is true, and `predicate` is not null.
- The column-index predicate contains `event_id`, `IS NOT NULL`, and `<>`, and does not contain `props`.
- The props-index predicate contains `props`, `event_id`, `IS NOT NULL`, and `<>`.
- A new event after the API restart has the same id in the column and in `props`.
- Older rows may keep a null `event_id`. That is expected.

Confirm `/admin/growth` Product still loads. Webhook classes are listed separately. The webhook row total is not a paid conversion. Paid conversions remain the `purchase_class` `paid` and `introductory` count. Device queue stays **Not collected** until a device check exists.

## Rollback limitations

- There is no down migration. Do not drop columns. `props` still holds the payload, and dropping a column removes only the column copy.
- Each `DO` block is atomic. An error inside it restores the index that block dropped. It does not undo an earlier `ADD COLUMN` that already committed.
- If duplicate non-empty ids exist, the block raises and the previous index stays. Do not delete those rows as part of the migration.
- Do not drop the new unique indexes while the API is still writing `event_id`. Old API builds ignore the new columns and can keep running with the indexes left in place.
- Re-running `0053` does not rebuild a correct partial index.
- This procedure does not rewrite historical analytics rows, historical purchase classes, or stored webhook payloads.

## Staging checklist

1. Deploy API and web to the staging environment. Do not apply `0052` or `0053` in that same step.
2. Check pre-auth: missing device id is 400, an allowlisted event is 202, a second delivery of the same event id is a duplicate summary, `purchase_success` is rejected by the pre-auth allowlist, and the 31st request for one device in a minute is 429. Do not raise the production limits to make the check pass.
3. Run the read-only prechecks on the staging database. Stop if duplicate groups are not zero.
4. After approval, execute `0052`, then `0053`, then the verification SQL. Restart the API.
5. Send one staging event and confirm the column and `props` event ids match.
6. Open Product analytics and confirm trial, paid initial, introductory, renewal, cancellation, refund, billing issue, and unclassified webhook counts are separate from paid conversions.
7. Do not upload a Google Ads conversion, edit campaign `23986249354`, change a price or trial, or ship a Play Store or App Store production release.

## Actions that require a person

- Run the read-only prechecks on the real database. This environment could not resolve the host.
- Approve and execute `0052` and `0053`.
- Deploy the API and web build to staging, then later to production, as separate decisions.
- Set `ANALYTICS_CHILD_REF_SECRET` only if stored events should keep a pseudonymous child reference. Leave it unset to drop numeric child ids with no replacement. Do not put the secret in client code.
- Run a signed Android WebView build and a signed iOS build. No device or signing material was available here.
- Send one sandbox RevenueCat webhook to a non-production project and compare it with the fixture classes. Fixture tests are not that check.
- Any change to subscription price, trial policy, Google Ads campaign `23986249354`, Play Store production, or Apple production.
