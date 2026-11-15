# Analytics event dictionary

**Date:** 15 November 2026  
**Source of truth:** `lib/analytics-taxonomy`. This page records the events and fields changed in the 15 Nov closure pass.

These names are not certified on a staging deployment. The 15 Nov staging attempt stopped before a database was approved.

## Identity

| Field | Stored |
|---|---|
| `user_id` | Firebase uid, or `device:{deviceId}` before login. Not replaced. |
| `device_id` | Client device id in props when the emitter sends it. Not a child id. |
| `child_id` column | Null on newly ingested spine rows. Historical integers remain until a separate approved scrub. |
| `child_ref` | 24 hex characters from `childAnalyticsRef`. Same child id, same ref. Not reversible without enumerating ids. |
| `childId`, `child_name`, health keys | Removed from stored analytics props. |

`first_open` is inserted once per `user_id`. `shouldPersistFirstOpen` skips a later copy. The client must still wait for HTTP 202 before setting its delivered marker.

## `game_abandoned`

Category: `learning`. Allowed before login.

| Prop | Required | Notes |
|---|---|---|
| `game_id` | yes | Hub id or mini-game template |
| `surface` | yes | `games_hub` or `mini_game` |
| `session_key` | yes | One attempt |
| `auth_state` | yes | `authenticated`, `guest`, `unknown` |
| `child_ref` | no | Omitted for guest play without a selected child |

Fired only after a real start and only if that attempt did not complete. One event per `session_key`.

## Subscription funnel

`subscription_funnel_event` additional props:

| Prop | Values |
|---|---|
| `rc_class` | `trial`, `paid_initial`, `introductory`, `renewal`, `trial_conversion`, `cancellation`, `refund`, `billing_issue`, `unknown` |
| `counts_as_paid` | `true` or `false` |
| `period_type` | RevenueCat period when present |
| `event_type` | Raw RevenueCat type |
| `step` | `trial_started`, `subscription_started`, `introductory_purchase`, `subscription_renewed`, `trial_converted`, `subscription_cancelled`, `refund`, `billing_issue`, `unclassified_webhook` |

Paid conversion count:

```sql
SELECT count(*)
FROM analytics_events
WHERE event_name = 'subscription_funnel_event'
  AND props->>'counts_as_paid' = 'true';
```

Do not use `count(*)` from `revenuecat_webhook_events` as that number.

`purchase_success` / server purchase truth is recorded only when `counts_as_paid` would be true (paid initial, renewal, or trial conversion).

## Webhook persistence

`revenuecat_webhook_events.payload` for new events is the redacted snapshot from `redactRevenueCatWebhookPayload`. It is not the raw RevenueCat body. Older rows may still contain a full body. This pass did not rewrite them.

## Pre-auth allowlist addition

`game_abandoned` is allowlisted. `purchase_success` stays rejected on the unsigned route (`rejectedPreauthPolicy`).

Production rate limit, unchanged: 60 requests per IP per minute, 30 per device per minute. The test flag `AMYNEST_PREAUTH_TEST_LIMITS` cannot change that ceiling when `NODE_ENV=production`.
