# Analytics readiness audit

**Date:** 15 November 2026  
**Verdict:** `CONDITIONAL PASS`  
**Not** `READY FOR STAGING`. **Not** `READY FOR PRODUCTION`.

Staging certification stopped at environment identification on 15 November 2026, 22:19 IST. No staging database, staging API, or staging web target could be identified. Migration `0052` was not applied. Nothing was deployed. Production was not contacted.

The four documents in this folder were not in the repository at the start of this pass. This audit is the current repository state, not a restatement of an earlier report.

Production was not deployed. Migration `0052` was not applied. `db:push` was not run. Ads, pricing, trial policy, and store releases were not changed.

## What is true in git

`analytics_events` is defined in `lib/db/src/schema/analytics_events.ts` and `lib/db/migrations/0026_analytics_events.sql`. Before this pass the table had no `event_id` column and no unique index on an event id. There was no migration `0052`, so there was no Drizzle-versus-SQL predicate mismatch in the tree. The incorrect state was the absence of the idempotency index, not two conflicting definitions.

Local database `amynest_dev` on `localhost` (read-only, 15 Nov 2026):

| Index | Definition |
|---|---|
| `analytics_events_pkey` | unique on `id` |
| `analytics_events_event_created_idx` | `(event_name, server_ts)` |
| `analytics_events_user_created_idx` | `(user_id, server_ts)` |
| `analytics_events_category_created_idx` | `(event_category, server_ts)` |

`event_id` column: **absent**. Duplicate non-empty `event_id` query: **not runnable** until the column exists. Production was not queried.

## Uniqueness semantics

`event_id` is nullable.

- `NULL` and blank values are not idempotency keys. Many rows may omit one.
- A non-empty `event_id` is unique.
- A non-partial `UNIQUE (event_id)` is the wrong index. PostgreSQL allows many `NULL`s, but only one `''`, and `CREATE INDEX IF NOT EXISTS` would keep that wrong index.

Drizzle and `0052_analytics_event_id_uidx.sql` both use:

```sql
CREATE UNIQUE INDEX analytics_events_event_id_uidx
  ON analytics_events (event_id)
  WHERE event_id IS NOT NULL AND btrim(event_id) <> '';
```

The SQL drops any unique index whose only column is `event_id` when the predicate is missing or does not mention both `event_id IS NOT NULL` and `btrim(event_id)`. It raises if non-empty duplicates exist and does not delete rows. The file is one transaction (`BEGIN`/`COMMIT`).

Ingest does **not** write `event_id` yet. Writing it before the column exists would break production inserts. That write is a follow-up after a human applies `0052`.

## Closed in this pass

| Item | Evidence |
|---|---|
| Child ids in analytics props | `redactAnalyticsIdentifiers` / `validateAnalyticsEvent` replace numeric `childId` / `child_id` with `child_ref` and drop child names and health keys. New spine rows set `child_id` to null. |
| Game abandonment | `game_abandoned` plus `noteGameStarted` / `noteGameCompleted` / `takeGameAbandonment`. Completed or unstarted sessions do not emit. A second take returns null. |
| RevenueCat classes | `classifyRevenueCatWebhook`. Paid truth is `countsAsPaidConversion` only. Trial, intro, cancel, refund, billing issue, and unknown are not paid. Stored webhook JSON is a redacted snapshot. |
| Pre-auth 429 | Tests were sharing an IP bucket (`127.0.0.1` / Redis). Each test now sends its own `X-Forwarded-For`. Production ceilings stay 60/IP and 30/device per minute. `PREAUTH_TEST_*` applies only when `AMYNEST_PREAUTH_TEST_LIMITS=1` and `NODE_ENV` is not `production`. |

## Still blocked

| Gate | Status |
|---|---|
| Migration `0052` applied on staging or production | Not applied |
| Ingest persisting `event_id` | Blocked on the migration |
| Physical Android or booted iOS device | `adb devices` empty. Simulators exist and are shutdown. No runtime pass. |
| Live RevenueCat webhook | Fixture tests only |
| Historical `analytics_events.child_id` | Unchanged. No scrub was run. |
| Child-ref pepper | Stable and enumerable for small integer ids until a secret pepper is approved |

## Verdict rule

`READY FOR STAGING` requires the migration prechecks, a staging apply, device lifecycle evidence, and a sandbox webhook. None of those were executed here.
