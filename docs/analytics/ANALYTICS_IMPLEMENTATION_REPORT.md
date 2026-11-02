# AmyNest analytics implementation report

Date: 2 Nov 2026, Asia/Calcutta. Production data was not modified and no historical events were inserted.

## Counts

| Item | Value |
|---|---|
| Routes discovered | 129 unique (`AppCore` has 136 route declarations; dev/prod copies collapse) |
| Routes with page_view and page_exit | 129 |
| Feature names mapped on routes | 41 distinct names across 66 routes |
| Feature actions fully instrumented | Not all. See the coverage audit. Page entry is complete. In-module actions are partial |
| Taxonomy size | 192 event names |
| New product-spine names | 23 |

## Database

`lib/db/migrations/0052_analytics_product_spine.sql` adds nullable columns and indexes on `analytics_events`, including a unique `event_id`. It does not rewrite or delete existing rows. It was not applied to Coolify. Ingest checks for the `event_id` column and keeps writing `props` either way, so the API can run before the migration. Apply 0052 when a production schema change is approved. Until then, page and feature queries read `props`.

Migration 0051 (`user_acquisition_attribution`) is unchanged.

## Backend

- `POST /api/analytics/events` rate-limits per user, accepts `eventId`, resolves identity from auth, and returns accepted, duplicate, and dropped ids.
- `POST /api/analytics/preauth-events` accepts the new navigation and feature names and still rejects unsigned purchase events.
- Identity stitch writes canonical and Firebase ids without copying rows.
- Purchase rows with the same event name and `transaction_id` collapse. A server source replaces a client source in place.
- `GET /api/admin/growth/product-analytics` feeds the Product section on `/admin/growth`.
- Cancel completion records `subscription_cancelled` from the server.

## Clients

| Surface | Coverage |
|---|---|
| Web | Shared SDK, durable queue, page tracker, feature API |
| Android | Existing native `first_open` kept. Document-start now also exposes OS, model, WebView version, and app build to the page |
| iOS | WKWebView runs the same web SDK after boot. No native pre-hydration `first_open` was added, to avoid a second install event |

## Tests

Kidschedule vitest, 4 files, 21 tests passed:

- `src/lib/analytics/product-spine-client.test.ts`
- `src/lib/analytics/route-catalog.test.ts`
- `src/lib/analytics.test.ts`
- `src/lib/analytics-service.test.ts`

API node tests, 20 tests passed:

- `src/services/analyticsSpine.test.ts`
- `src/lib/analytics-taxonomy.test.ts`
- `src/services/preauthAnalyticsService.test.ts`

These cover page view and exit, same-path dedupe, feature start and completion, offline retention, ack-by-event-id, sensitive-field scrubbing, server identity, purchase dedupe keys, attribution labeling, and the route catalog against `AppCore`. They do not execute a real Android or iOS shell, and they do not hit production Postgres.

## Known gaps

- Modal, filter, and CTA coverage is only where a call site already existed or `trackModal` is used. Dialogs are not automatic page views.
- Coloring has a start event and no completion event.
- Many learning modules have `feature_viewed` on entry and keep their previous action events only if they already called `track()`.
- iOS has no native first-open poster.
- Queue depth is on the device. The admin API reports server accept/reject counts since process start, not a device backlog.
- `session_heartbeat` is excluded from activity totals so it does not inflate engagement.

## Deployment readiness

Safe to review. Not applied to production.

Do not run migration 0052 against Coolify until schema deploy is approved. Do not ship a Play production AAB from this change. Google Ads campaign `23986249354` was not modified. No Ads conversion upload was added. RevenueCat products and prices were not changed. Existing `/admin/growth` sections still read the same dashboard payload. `screen_view` queries also match `page_view`.
