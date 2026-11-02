# AmyNest product analytics architecture

This is the first-party measurement path for the web app, the Android WebView, and the iOS WKWebView. It extends the existing `analytics_events` spine. It does not create a second database or a second dashboard.

## Flow

```
Page or feature
  -> AnalyticsService (track, trackPageView, trackFeatureUsage, trackError, startSession, endSession)
  -> localStorage queue (event_id, original client timestamp)
  -> POST /api/analytics/events when a Firebase session exists
  -> otherwise POST /api/analytics/preauth-events as device:{id}
  -> taxonomy validation, privacy scrub, server identity
  -> analytics_events (Coolify PostgreSQL)
  -> /admin/growth and /admin/growth/product
```

Android still posts `first_open` from `NativeAnalyticsSpine` before the SPA hydrates. The web SDK sees `window.__AMYNEST_NATIVE_FIRST_OPEN_SENT` and does not emit a second `first_open`.

## Identity

| Stage | Stored as |
|---|---|
| Install device id | `anonymous_device_id` and `props.device_id` |
| Before login | `user_id = device:{deviceId}` |
| After login | `user_id`, `canonical_user_id`, and `firebase_uid` are the authenticated Firebase uid |
| RevenueCat | Unchanged. Server purchase truth uses that same Firebase uid |

The client cannot set `canonical_user_id` or `firebase_uid`. Pre-login rows are updated in place on stitch, so the journey is kept and not counted twice. `parent_profiles.id` is not the analytics user id.

First-touch attribution stays in `user_acquisition_attribution` (migration 0051). Later events do not overwrite a stored gclid with null. A user is labeled verified paid only when `gclid`, `gbraid`, or `wbraid` is present.

## Delivery

- Each event gets an `event_id` before it is queued.
- The queue survives reload because it is in `localStorage`.
- A batch leaves the queue only after HTTP 202. When the response lists `acceptedEventIds`, `duplicateEventIds`, and `droppedEventIds`, only those ids are removed.
- Invalid events are dropped so they are not retried forever. Insert failures without an ack stay queued.
- The queue drops ordinary events first. `first_open`, install, checkout, and purchase names are kept until a hard cap of 800.
- `session_heartbeat` runs every 30 seconds while the document is visible. Page active time pauses while hidden.

## Schema

Migration `lib/db/migrations/0052_analytics_product_spine.sql` adds nullable columns and indexes (event id, device, canonical user, page, feature, attribution, platform, app version). Existing rows are unchanged.

Ingest detects whether `event_id` exists. Before the migration, the same facts are stored in `props` and the dashboard reads `props`. After the migration, ingest also fills the columns and `event_id` is unique.

This change does not apply the migration to production.

## Purchase authority

`recordServerPurchaseTruth` (RevenueCat webhook path) remains the payment record. Ingest dedupes `purchase_success`, `upgrade_completed`, and purchase-step funnel rows by `transaction_id`. A later server event upgrades a client row in place instead of inserting a second one. A client event is not treated as proof of payment.

## Privacy

Client and server scrub passwords, tokens, email, phone, child name, prompts, transcripts, and message bodies. Ask Amy stores character count, latency, and success or failure.

## Dashboard

`/admin/growth` is unchanged in structure. A Product section calls `GET /api/admin/growth/product-analytics` and aggregates `analytics_events`. Growth queries that filtered `screen_view` also accept `page_view`, so historical rows and new rows are both visible without double-counting a single navigation (the tracker emits `page_view`, not both).
