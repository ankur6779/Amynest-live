# AmyNest product analytics readiness audit

Date: 2 Nov 2026, Asia/Calcutta. Branch `cursor/analytics-readiness-audit-f731`, based on `29d1943d`.

Verdict: **CONDITIONAL PASS**.

This is not production readiness. Unit tests did not run an Android WebView, an iOS WKWebView, or Coolify Postgres. Migration `0052` was not applied. Google Ads campaign `23986249354` was not changed. No Ads conversion was uploaded. RevenueCat products and prices were not changed.

## 1. Feature instrumentation matrix

All 129 discovered routes already emit `page_view` and `page_exit` from `AnalyticsScreenTracker`. Identity on those events is the device id before login and the Firebase uid after login. Platform is web, Android WebView, and iOS WKWebView once the SPA boots. That page layer is unchanged.

The matrix below is the action layer. `feature_viewed` means the route catalog maps the path and the tracker emits it on entry. Completion means a real product action, not a generic timer.

| Route or surface | Feature | Viewed | Started | Meaningful action | Completed | Abandon or exit | Modal | Identity | Status |
|---|---|---|---|---|---|---|---|---|---|
| `/speech-coach`, `/speech-coach-v2`, `/speech-coach/live`, hub speech routes | speech_coach | yes | named session start plus `feature_started` for `speech_session` | limit, reconnect, ttfa, upgrade shown | `speech_coach_v2_session_complete` plus `feature_completed` | no leave-without-finish event | upgrade shown is not `trackModal` | device id, then Firebase uid. Named events still include numeric `childId` | partial |
| `/talking-amy`, `/speech-coach/talk` | talking_amy | yes | no separate session start found | none beyond page entry | no | page_exit only | no | same | page only |
| `/assistant`, `/amy-ai-tutor`, `/learn-with-amy` | ask_amy | yes | message send | `ask_amy_message_sent` length only, `ask_amy_response_received` latency and success | response received | page_exit | no | same. Prompts and replies are scrubbed | partial |
| Parenting hub coloring tile | coloring | hub open | `coloring_activity_started` on hub feature id | PDF save | `coloring_activity_completed` and `feature_completed` | download error emits `feature_error` | preview dialog is not `trackModal` | same. File id is not sent. Child name is not sent | partial |
| `/worksheet` and hub worksheets | worksheets | yes | hub `feature_started` and `worksheet_opened` | `worksheet_downloaded`, `asset_download` | download is the completion that exists | no abandon event | no | same | partial |
| Story player | stories | when the player route is open | `story_opened`, `video_started`, `feature_started` | playback | `video_completed`, `feature_completed` | no explicit abandon | no | same. Story text is not stored | partial |
| `/games` | gaming_hub | yes | no in-module start found | no match or level event found | no | page_exit | no | same | page only |
| `/discovery-worlds`, `/worlds/:slug` | discovery_worlds | yes | no `feature_started` | `object_open`, `answer_correct`, `answer_incorrect`, `replay` | no feature completion | page_exit | no | same | partial |
| `/health-lab` | health_lab | yes | no | no in-module action found | no | page_exit | no | same | page only |
| `/nutrition` | nutrition | yes | no | no meal-log analytics event found | no | page_exit | no | same | page only |
| Infant hub inside parenting hub | infant | not in `analytics_events` | client-log adapter only | feed, sleep, diaper, cry, growth stay in client logs | not in the product spine | no | no | client logs are not the analytics identity spine | not in spine |
| `/routines`, `/routines/generate`, `/routines/:id` | routines | yes | `routine_generation_started` and `feature_started` | `routine_generated`, `routine_generation_failed`, `routine_feedback_submitted` | `feature_completed` on a committed routine | failure emits `feature_error` | no | same. Feature events do not copy `childId` | partial |
| `/phonics`, `/abacus`, `/spelling`, `/olympiad`, `/rhymes`, `/audio-lessons`, `/study`, `/smart-math-tricks` | learning modules | yes on mapped routes | abacus has `abacus_mode_started` | abacus completion events already existed | abacus mode, mental, and challenge completions | no generic abandon | no | abacus events still include numeric `childId` | partial |
| `/birth-sky/*` | birth_sky | yes | no new start | existing birth-sky events only where they already called `track()` | no new completion | page_exit | no | same | page plus legacy |
| `/dashboard` | today | yes | card taps only where they already called `track()` | existing button events | no | page_exit | no | same | partial |
| `/onboarding`, `/begin` | onboarding | yes | `onboarding_started` | `onboarding_step_completed` | `onboarding_completed` | page_exit | no | same | partial |
| `/pricing`, `/subscription-trial` | paywall | yes | checkout events that already existed | `paywall_view`, `checkout_started` | server `purchase_success` is the paid record | dismiss events that already existed | paywall modal has its own click events, not universal `trackModal` | server uid on webhook rows | partial |
| `/children`, `/profile`, settings routes | profiles and settings | yes | no | `child_created` remains the create event | no second profile-created event | page_exit | no | Firebase uid, not `parent_profiles.id` | page only |

Routes with no feature name in `route-catalog.ts` are page analytics only. That includes marketing, auth callbacks, admin, and debug routes. They are listed in `ANALYTICS_COVERAGE_AUDIT.md`.

## 2. Missing events

These are real product actions that still do not have an event. Generic fillers were not added.

- Talking Amy has no session start or completion separate from the speech coach session events.
- Speech practice has no abandon event when the child leaves before `finishSession`.
- Games have no match start, level complete, or abandon event.
- Health Lab has no result or session event.
- Nutrition has no meal logged, plan opened, or plan completed event in the product spine.
- Infant hub events are client logs. Feed, sleep, diaper, cry, and growth measurements were not copied into `analytics_events`.
- Discovery answers are named events and do not emit `feature_completed`.
- Coloring preview is a dialog and does not emit `trackModal`.
- Most other dialogs and drawers still do not call `trackModal`.
- Setting toggles are not named events.
- Store renewals emit `subscription_funnel_event` step `subscription_renewed`. They do not emit a second `purchase_success`.
- Refund amount is not an event field. The funnel step `refund` is the record.
- iOS has no native `first_open` before the SPA boots.

## 3. Attribution architecture

```
Android Install Referrer (Play)
  -> InstallReferrerBridge stores referrer JSON
  -> NativeAnalyticsSpine parses gclid, gbraid, wbraid, utm_*, campaign id
  -> localStorage amynest:install_attribution
  -> every analytics event copies those fields when still empty
  -> POST preauth or authed ingest
  -> user_acquisition_attribution (migration 0051)
        first_touch_at is the first row time and is kept
        click ids are kept when a later event sends null
        a later non-null click id replaces the stored click id
        last_touch_at moves on every merge
  -> stitch on login writes canonical user and Firebase uid on that row
  -> RevenueCat webhook resolves app_user_id to the same Firebase uid
  -> recordServerPurchaseTruth reads the attribution row by uid or device id
  -> ads_conversion_upload_ledger insert with uploadStatus blocked_ads_paused
  -> no Google Ads upload
```

What is deterministic:

- A stored `gclid`, `gbraid`, or `wbraid` can be joined from the device row to the Firebase uid after stitch, and from that uid to a RevenueCat transaction id on `purchase_success` and the ads ledger.
- Users with no click id stay `attribution_unknown`, including a campaign id alone and a `google_ads` label with no click id.

What is not deterministic:

- Play Install Referrer is not present for every install. Organic and unknown are expected.
- iOS has no SKAdNetwork and no AdAttributionKit integration in `artifacts/amynest-capacitor/ios`. There is no ATT prompt. iOS click-level attribution is not available. SKAdNetwork would be aggregate, not user-level, even if it were added.
- Web gclid depends on the landing URL being captured into the same localStorage key. A WebView that never received the referrer does not become paid acquisition later.
- `installation_id` on events is the AmyNest device id. It is not the Play install referrer token and not an Apple vendor id.

Android and iOS attribution were not executed on a device in this audit. Both are **UNVERIFIED** on hardware.

## 4. Purchase reconciliation

Path for one initial purchase:

1. Store billing is observed by RevenueCat, not by the client analytics SDK.
2. `POST /subscription/webhook` inserts `revenuecat_webhook_events` with `onConflictDoNothing` on the RevenueCat event id. A replay returns `duplicate: true` and does not write a second analytics row.
3. `app_user_id` is resolved to the canonical Firebase uid. `$RCAnonymousID:` is not accepted as the purchase user.
4. `period_type === TRIAL` on `INITIAL_PURCHASE` now writes `subscription_funnel_event` step `trial_started` only. It does not write `purchase_success`, `upgrade_completed`, or an ads ledger row.
5. Any other `INITIAL_PURCHASE` calls `recordServerPurchaseTruth`. That writes `purchase_success`, a funnel step, and `upgrade_completed`, all with `source: server`. The same `transaction_id` collapses to one row. A later server event replaces a client row in place.
6. Price and currency are stored when RevenueCat sends them. They are not invented.
7. `RENEWAL` updates entitlement state and writes funnel step `subscription_renewed`. It is not a new paid conversion.
8. `REFUND`, and `CANCELLATION` with reason `CUSTOMER_SUPPORT`, write funnel step `refund`. Other cancellations write `subscription_cancelled`. No refunded amount is stored.
9. The ads ledger row is prepared with `shouldUpload: false` and `uploadStatus: blocked_ads_paused`. Eligible for a future upload only when a click id exists. Nothing is uploaded.

Trial starts are not paid purchases on the forward path. Historical `purchase_success` rows written before `period_type` was stored cannot be split from trials. The dashboard says that. It does not report those rows as zero.

Internal age trials (`trackServerSubscriptionFunnel(..., "trial_started")`) and `speech_coach_trial_started` are separate from store trials. Speech trials are labeled on their own.

MRR is not computed from `analytics_events`. The Subscriptions section still estimates MRR from plan name times Razorpay list price. That estimate is not store proceeds and is not copied into the Product section as a zero.

## 5. Database migration readiness

`lib/db/migrations/0052_analytics_product_spine.sql` matches the columns already declared on `analyticsEventsTable` in Drizzle: nullable spine columns, a partial unique index on non-empty `event_id`, and a partial unique index on `props->>'event_id'`. It does not rewrite or delete rows. There is no migration runner journal entry. Applying it means executing that file on purpose.

Compatibility: ingest checks `information_schema` for `event_id`. Before the column exists, the same facts stay in `props`. After it exists, ingest also fills the columns. Existing Growth queries that read `props` keep working. `screen_view` queries also match `page_view`.

Safe sequence, only after an explicit schema approval:

1. Deploy this API and web build first. Do not run `0052` in the same step.
2. Confirm `/api/analytics/events` still accepts the previous client payload.
3. Run `0052` once against Coolify. The statements are `ADD COLUMN IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
4. Restart the API so the column cache re-reads `event_id`.
5. Confirm a new event has both `props.event_id` and column `event_id`.

Rollback:

- Redeploy the previous API. Old code ignores the new columns.
- Leave the columns in place. Dropping them deletes the column copy only. `props` still has the payload.
- Do not drop the unique `event_id` index if new writers are still inserting it.

This audit did not apply `0052`.

## 6. Platform readiness

| Platform | Code | Hardware |
|---|---|---|
| Web | Shared SDK, queue, page tracker, new feature completions, envelope `installation_id` | Unit tests only. Browser session not run |
| Android WebView | Same SDK. Install Referrer and native `first_open` are the previous commit. This audit did not change Kotlin | **UNVERIFIED** |
| iOS WKWebView | Same SDK after boot. No SKAdNetwork, no AdAttributionKit, no ATT prompt, no native first_open | **UNVERIFIED** |

## 7. Dashboard completeness

`/admin/growth` Product section now shows installs as first opens, activated users, store trial starts, speech trial starts, server paid conversions, refund or cancel event counts, D1, D3, and D7, paywall, checkout, feature completion, feature users who also have a server paid event in the same range, and acquisition-bucket conversion.

MRR and refund amount render as **Not collected**, with the reason. They are not zeros. An empty table means the query ran and found no rows in the selected range.

Feature-to-paid is same-range overlap, not a causal attribution model.

## 8. Files changed in this audit

- `artifacts/kidschedule/src/lib/analytics/analytics-service.ts`
- `artifacts/kidschedule/src/lib/analytics/product-spine-client.test.ts`
- `artifacts/kidschedule/src/lib/routine-generation-analytics.ts`
- `artifacts/kidschedule/src/lib/routine-generation-analytics.test.ts`
- `artifacts/kidschedule/src/features/speech-coach-v2/lib/analytics.ts`
- `artifacts/kidschedule/src/features/speech-coach-v2/lib/analytics.test.ts`
- `artifacts/kidschedule/src/components/coloring-books.tsx`
- `artifacts/kidschedule/src/components/admin/growth/product-analytics-panel.tsx`
- `artifacts/api-server/src/services/analyticsSpine.ts`
- `artifacts/api-server/src/services/analyticsSpine.test.ts`
- `artifacts/api-server/src/services/revenueCatPurchaseClass.ts`
- `artifacts/api-server/src/services/serverPurchaseTruthService.ts`
- `artifacts/api-server/src/services/acquisitionAttributionLogic.ts`
- `artifacts/api-server/src/services/growth-dashboard/product-analytics.ts`
- `artifacts/api-server/src/routes/subscription.ts`
- `lib/analytics-taxonomy/src/product-spine-events.ts`
- `lib/analytics-taxonomy/src/phase1-events.ts`
- `lib/analytics-taxonomy/src/conversion-funnel-events.ts`
- `lib/analytics-taxonomy/src/index.ts`
- `docs/analytics/ANALYTICS_EVENT_TAXONOMY.md`
- `docs/analytics/ANALYTICS_READINESS_AUDIT.md`

## 9. Test results

Kidschedule vitest, 6 files, 24 passed. Covers page view identity envelope, speech feature start and completion without a child id on the feature event, routine feature start, and the previous queue and route tests.

API node tests, 35 passed. Covers spine allowlist, trial versus paid classification, server identity, purchase dedupe keys, attribution first-touch behavior, taxonomy, and pre-auth scrubbing.

Not run: Android WebView, iOS WKWebView, Coolify Postgres, RevenueCat webhook against a live store, Google Ads upload. Those are **UNVERIFIED**.

## 10. Remaining issues

P0

- Do not apply `0052` or ship this as production measurement until schema deploy is explicitly approved.
- Do not treat historical `purchase_success` rows as trial-free. `period_type` was not stored on them.
- Do not describe iOS users as Google Ads acquired. There is no SKAdNetwork or click-id bridge.
- Infant health, cry, feed, and growth details must stay out of general analytics.

P1

- Games, Health Lab, Nutrition, and Talking Amy still have page entry without in-module actions.
- Speech and abacus named events still carry numeric `childId`.
- `mergeFirstTouch` replaces a stored click id when a later event sends a different non-null id. `first_touch_at` does not move. That is not strict first-touch for the identifier.
- MRR in the Subscriptions section is a list-price estimate, not store proceeds.
- Device queue depth is invisible to the admin API.
- Dialogs are not instrumented except where a call site already existed.

P2

- D14 and D30 cohorts need the user to be old enough. A new cohort shows zero because the day has not arrived, which the rate renders as 0% once cohort size is non-zero. Read cohort size before reading the rate.
- `INTRO` period type is classified as paid because it is billed. Confirm that against a real RevenueCat payload before using it for revenue.
- Admin feature-to-paid overlap is not an incrementality model.

## Verdict

**CONDITIONAL PASS.**

The spine can be reviewed and the API can run before migration `0052`. Staging is allowed only with that migration still unapplied until schema approval, with Android and iOS marked unverified, and with the Product dashboard labels above. It is not ready for production.
