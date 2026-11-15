# Analytics coverage audit

**Date:** 15 November 2026  
**Verdict:** `CONDITIONAL PASS`

Staging end-to-end certification was not run. No non-production staging database or deploy target is configured. Coverage below is repository and local-test evidence only.

## Child identifiers

Numeric child ids are accepted by several taxonomy schemas so an old client is not dropped. After validation, `validateAnalyticsEvent` removes `childId`, `child_id`, child-name keys, and health keys (`diagnosis`, `symptom`, `allergy`, `medication`, `condition`, `weight_kg`, `height_cm`, `bmi`, and the same names in nested objects). A positive integer becomes `child_ref` from `childAnalyticsRef`. `device_id` and `user_id` are left in place so guest and Firebase stitching still work.

`analyticsIngestService` writes `child_id` as null on new rows. The column remains for historical rows.

Client `scrubAnalyticsProps` runs the same redaction before the offline queue. Math Playground and Health Lab client logs emit `child_ref` instead of the numeric id.

Call sites may still pass a numeric id into `track()`. That value is removed before the queue and again before insert. It is not required in the stored payload.

Not changed, because they are product APIs rather than the analytics spine: learning-progress posts that send `childId` to their own routes. Those are not analytics events.

## Game abandonment

Event: `game_abandoned`.

| Field | Meaning |
|---|---|
| `game_id` | Template or hub game id |
| `surface` | `games_hub` or `mini_game` |
| `session_key` | Attempt id, not a child id |
| `auth_state` | `authenticated`, `guest`, or `unknown` |
| `child_ref` | Present only when a positive child id was known |

Rules in `artifacts/kidschedule/src/lib/game-abandonment.ts`:

- No event unless `noteGameStarted` ran.
- `noteGameCompleted` suppresses abandonment.
- `takeGameAbandonment` returns the event once.
- A second start of the same key cancels a pending cleanup timer, so a remount does not double-fire.
- Hub intro is not a start. Start is `onStartPlay`. Leave uses an immediate take. Unmount schedules a take that a restart can cancel.
- Guest sessions omit `child_ref`. Authenticated sessions include it.
- `game_abandoned` is on the pre-auth allowlist so a guest flush is not rejected.

## RevenueCat

Classifier: `artifacts/api-server/src/services/revenueCatWebhookClassification.ts`.

| Class | Paid conversion |
|---|---|
| `trial` (`INITIAL_PURCHASE` + `TRIAL`) | no |
| `introductory` (`INITIAL_PURCHASE` + `INTRO`) | no |
| `paid_initial` (`INITIAL_PURCHASE` + `NORMAL`, price null or > 0) | yes |
| `renewal` | yes |
| `trial_conversion` (`RENEWAL` + `is_trial_conversion`) | yes |
| `cancellation` | no |
| `refund` | no |
| `billing_issue` | no |
| `unknown` (missing `period_type`, zero-price normal purchase, or any other type) | no |

`subscription_funnel_event` stores `rc_class`, `counts_as_paid` (`"true"` / `"false"`), and `period_type`. Dashboard paid totals must filter `counts_as_paid = true`. A count of `revenuecat_webhook_events` rows is not a paid-conversion count.

`recordServerPurchaseTruth` runs only when `countsAsPaidConversion` is true. Trials no longer take that path.

New webhook rows store `redactRevenueCatWebhookPayload`: event type, product, store, price, transaction ids, and the class. They do not store `subscriber_attributes`, email, or `app_user_id` inside the JSON snapshot. `app_user_id` remains the existing table column.

## Pre-auth

`POST /api/analytics/preauth-events` limits are still 60 requests per IP and 30 per device per 60 seconds in production. The 429 in `analytics-preauth.test.ts` came from that shared IP bucket, including a Redis key when Redis is configured. Tests now isolate `X-Forwarded-For`. A lower ceiling is used only when `AMYNEST_PREAUTH_TEST_LIMITS=1` and `NODE_ENV` is not `production`.

Duplicate `first_open` persistence is `shouldPersistFirstOpen`: a second `first_open` for a user that already has one is not inserted. The HTTP duplicate case asserts the route still returns 202 with `accepted: 0` when ingest reports that result.

## Not covered by a device

Offline queue, ACK, login stitch, background/foreground, and page lifecycle were not exercised on Android or iOS hardware. See the readiness audit.
