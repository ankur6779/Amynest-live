# AmyNest product analytics readiness audit

Date: 2 Nov 2026, Asia/Calcutta. Branch `cursor/analytics-readiness-audit-f731`. Certification update the same day. Base commit of the earlier audit was `29d1943d`.

Verdict: **CONDITIONAL PASS**.

This is not production readiness. Unit tests did not run an Android WebView, an iOS WKWebView, Coolify Postgres, or a live RevenueCat webhook. Migration `0052` was not applied. Google Ads campaign `23986249354` was not changed. No Ads conversion was uploaded. RevenueCat products and prices were not changed. The lifecycle and purchase-class work in this file is implemented in code. It was not deployed.

## 1. Feature instrumentation matrix

All 129 discovered routes already emit `page_view` and `page_exit` from `AnalyticsScreenTracker`. Identity on those events is the device id before login and the Firebase uid after login. Platform is web, Android WebView, and iOS WKWebView once the SPA boots. That page layer is unchanged.

The matrix below is the action layer. `feature_viewed` means the route catalog maps the path and the tracker emits it on entry. Completion means a real product action, not a generic timer.

| Route or surface | Feature | Viewed | Started | Meaningful action | Completed | Abandon or exit | Modal | Identity | Status |
|---|---|---|---|---|---|---|---|---|---|
| `/speech-coach`, `/speech-coach-v2`, `/speech-coach/live`, hub speech routes | speech_coach | yes | named session start plus `feature_started` for `speech_session` | one `speech_session_progress` on the first successful heartbeat | `speech_coach_v2_session_complete` plus `feature_completed` | `speech_session_abandoned` reason `leave` if the session started and `finishSession` did not run | upgrade shown is not `trackModal` | device id, then Firebase uid. Named events still include numeric `childId`. Feature events do not | partial |
| `/talking-amy`, `/speech-coach/talk` | talking_amy | yes | `talking_amy_session_started` once per visit when a child profile exists | `talking_amy_first_interaction` on the first successful recording | `talking_amy_session_completed` the first time a turn reaches celebrate | `talking_amy_session_abandoned` reason `leave` if the visit ends before that | no | product events omit child id. The screen does not start without a child profile | partial |
| `/assistant`, `/amy-ai-tutor`, `/learn-with-amy` | ask_amy | yes | message send | `ask_amy_message_sent` length only, `ask_amy_response_received` latency and success | response received | page_exit | no | same. Prompts and replies are scrubbed | partial |
| Parenting hub coloring tile | coloring | hub open | `coloring_activity_started` on hub feature id | `coloring_preview_opened` when the preview dialog opens | `coloring_activity_completed` and `feature_completed` on PDF save | download error emits `feature_error` | preview is an event, not `trackModal` | same. File id is not sent. Child name is not sent | partial |
| `/worksheet` and hub worksheets | worksheets | yes | hub `feature_started` and `worksheet_opened` | `worksheet_downloaded`, `asset_download` | download is the completion that exists | `worksheet_generation_failed` with `error_class` `worksheet_error`. The error message is not copied | no | same | partial |
| Story player | stories | when the player route is open | `story_opened`, `video_started`, `feature_started` | playback | `video_completed`, `feature_completed` | `feature_abandoned` if playback started and `ended` did not fire | no | same. Story text is not stored | partial |
| `/games` | gaming_hub | yes | `game_opened` on play, `game_started` when play begins, including guests | `game_completed` and `game_result` with score, total, and perfect | result panel is that completion | no separate abandon. Leaving mid-game is `page_exit` | no | game id only. Title and child id are not on these events | partial |
| `/discovery-worlds`, `/worlds/:slug` | discovery_worlds | yes | no `feature_started` | `object_open`, `answer_correct`, `answer_incorrect`, `replay` | `discovery_completed` when the daily adventure completes, outcome `complete` | page_exit | no | world id only. Child id from the client log is not copied | partial |
| `/health-lab` | health_lab | yes | `health_lab_tool_opened` once per page load from the dashboard view | `health_lab_assessment_started` | `health_lab_assessment_completed` outcome `completed` | same event with outcome `abandoned` | no | game id and duration only. Score, shop, and cheat text stay in client logs | partial |
| `/nutrition` | nutrition | yes | `nutrition_tool_opened` for hub and plan, once per session | `nutrition_plan_generated` for grocery and tiffin, counts only | `nutrition_plan_saved` with `entry_count` 1 when a meal outcome is recorded | no separate abandon | no | meal names are not copied | partial |
| Infant hub inside parenting hub | infant | `infant_action` `hub_opened` once per load | not a session | `log_created`, `milestone_completed`, `exercise_completed` | those actions are the signal | no | no | no child id, measurements, notes, or cry text | partial |
| `/routines`, `/routines/generate`, `/routines/:id` | routines | yes | `routine_generation_started` and `feature_started` | `routine_generated`, `routine_generation_failed`, `routine_feedback_submitted` | `feature_completed` on a committed routine | failure emits `feature_error` | no | same. Feature events do not copy `childId` | partial |
| `/phonics`, `/abacus`, `/spelling`, `/olympiad`, `/rhymes`, `/audio-lessons`, `/study`, `/smart-math-tricks` | learning modules | yes on mapped routes | abacus has `abacus_mode_started`. Study zone session start is `learning_activity_started` | abacus completion events already existed | abacus completions, and `learning_activity_completed` when the study zone session ends | no generic abandon | no | study zone product events omit child id. Abacus events still include numeric `childId`. Phonics has no single completion callback, so none was invented | partial |
| `/birth-sky/*` | birth_sky | yes | no new start | existing birth-sky events only where they already called `track()` | no new completion | page_exit | no | same | page plus legacy |
| `/dashboard` | today | yes | card taps only where they already called `track()` | existing button events | no | page_exit | no | same | partial |
| `/onboarding`, `/begin` | onboarding | yes | `onboarding_started` | `onboarding_step_completed` | `onboarding_completed` | page_exit | no | same | partial |
| `/pricing`, `/subscription-trial` | paywall | yes | checkout events that already existed | `paywall_view`, `checkout_started` | server `purchase_success` is the paid record | dismiss events that already existed | paywall modal has its own click events, not universal `trackModal` | server uid on webhook rows | partial |
| `/children`, `/profile`, settings routes | profiles and settings | yes | no | `child_created` remains the create event | no second profile-created event | page_exit | no | Firebase uid, not `parent_profiles.id` | page only |

Routes with no feature name in `route-catalog.ts` are page analytics only. That includes marketing, auth callbacks, admin, and debug routes. They are listed in `ANALYTICS_COVERAGE_AUDIT.md`.

## 2. Missing events

These are real product actions that still do not have an event. Generic fillers were not added.

- Games have no abandon event when the player leaves before `finishGame`. `page_exit` is the leave signal.
- Phonics, spelling, olympiad, rhymes, and audio lessons have page entry and no single completion callback. No completion event was added.
- Infant feed, sleep, diaper, and burp details stay in client logs. The spine receives `infant_action` `log_created` only. Growth measurements and cry text are not copied.
- Coloring preview is `coloring_preview_opened`. It is not `trackModal`.
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
        a stored non-null click id is never replaced
        an empty first-touch click id can still be filled
        a conflicting later click id is stored in source_metadata.lastTouch
        last_touch_at moves on every merge
        the browser keeps the same rule in localStorage and writes amynest:last_touch_attribution
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
5. `INITIAL_PURCHASE` is classified by `classifyRevenueCatWebhook`. `NORMAL` writes `purchase_success` with `purchase_class` `paid`. A priced `INTRO` writes `purchase_class` `introductory` and counts as paid. An `INTRO` without a positive price writes funnel step `introductory_unpriced` and does not count as paid. `PROMOTIONAL` writes `promotional_grant` and does not count as paid. A missing period type still writes `purchase_success` with `purchase_class` `unknown` and `countsAsPaid` false. The same `transaction_id` collapses to one row. Historical rows are not rewritten.
6. Price and currency are stored when RevenueCat sends them. They are not invented.
7. `RENEWAL` updates entitlement state and writes funnel step `subscription_renewed`. It is not a new paid conversion.
8. `REFUND`, and `CANCELLATION` with reason `CUSTOMER_SUPPORT`, write funnel step `refund`. Other cancellations write `subscription_cancelled`. No refunded amount is stored.
9. The ads ledger row is prepared with `shouldUpload: false` and `uploadStatus: blocked_ads_paused`. Eligible for a future upload only when a click id exists. Nothing is uploaded.

Trial starts are not paid purchases. The Product paid-conversion count includes `purchase_class` `paid` or `introductory`, and legacy server rows whose `period_type` is `NORMAL`. Other server purchase rows, including rows with no class and no `NORMAL` period, are `unknownPurchaseClass`. They are not rewritten and they are not counted as paid. Taxes, store commission, and net proceeds are not in the webhook payload. Razorpay list-price MRR is not store proceeds.

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

`/admin/growth` Product section shows installs, activation, store trial starts, speech trial starts, server paid conversions, unknown purchase class, refund or cancel event counts, retention, feature starts and completions for the named lifecycle events, and acquisition-bucket conversion.

Reliability labels:

- Received and rejected are process counters since the API process started. Zero means this process has not seen that outcome.
- Device queue, device retries, and last device acknowledgement are **Not collected**.
- Latest stored event is the newest `server_ts` in range. Null renders as **Zero** events in range.
- Unknown attribution share is **Not applicable** when the range has no install events.
- Missing platform and missing app version are counts. Zero is a real zero.
- Purchase reconciliation is **Collected** when `revenuecat_webhook_events` can be read, and **Unverified** when it cannot. A difference between webhook rows and `purchase_success` is not itself an error, because trials do not write `purchase_success`.
- MRR, refund amount, taxes, and net proceeds are **Not collected**.

An empty table means the query ran and found no rows in the selected range.

Feature-to-paid is same-range overlap, not a causal attribution model.

## 8. Files changed in this certification

Feature bridges and attribution:

- `artifacts/kidschedule/src/pages/talking-amy/index.tsx`
- `artifacts/kidschedule/src/lib/talking-amy-telemetry.ts`
- `artifacts/kidschedule/src/pages/games.tsx`
- `artifacts/kidschedule/src/features/health-lab/health-lab-analytics.ts`
- `artifacts/kidschedule/src/features/nutrition/lib/nutrition-hub-analytics.ts`
- `artifacts/kidschedule/src/features/nutrition/lib/nutrition-memory-sync.ts`
- `artifacts/kidschedule/src/lib/infant-hub-analytics.ts`
- `artifacts/kidschedule/src/lib/discovery-worlds-telemetry.ts`
- `artifacts/kidschedule/src/lib/study-zone-analytics.ts`
- `artifacts/kidschedule/src/components/coloring-books.tsx`
- `artifacts/kidschedule/src/components/story-player.tsx`
- `artifacts/kidschedule/src/features/worksheet-studio/worksheet-studio-analytics.ts`
- `artifacts/kidschedule/src/features/speech-coach-v2/lib/analytics.ts`
- `artifacts/kidschedule/src/features/speech-coach-v2/hooks/use-speech-coach-v2-session.ts`
- `artifacts/kidschedule/src/lib/install-attribution.ts`
- `artifacts/kidschedule/src/lib/analytics/analytics-service.ts`
- `artifacts/kidschedule/src/lib/analytics/safe-product-track.ts`

Server, dashboard, and tests:

- `artifacts/api-server/src/services/revenueCatPurchaseClass.ts`
- `artifacts/api-server/src/services/revenueCatPurchaseClass.test.ts`
- `artifacts/api-server/src/services/acquisitionAttributionLogic.ts`
- `artifacts/api-server/src/services/growth-dashboard/product-analytics.ts`
- `artifacts/api-server/src/services/analyticsSpine.ts`
- `artifacts/kidschedule/src/components/admin/growth/product-analytics-panel.tsx`
- `lib/analytics-taxonomy/src/product-spine-events.ts`
- `docs/analytics/ANALYTICS_EVENT_DICTIONARY.md`
- `docs/analytics/ANALYTICS_DEPLOYMENT_RUNBOOK.md`

## 8b. Files changed in the earlier audit pass

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

Kidschedule vitest for the eight touched analytics files: 34 passed, 0 failed. Covers install first-touch immutability, Talking Amy, Health Lab, and infant product payloads, speech feature events, routine feature start, nutrition hub, meal memory, and the product spine client.

API node tests: `revenueCatPurchaseClass.test.ts`, `analyticsSpine.test.ts`, and `acquisitionAttributionLogic.test.ts` — 34 passed, 0 failed. Taxonomy catalog test: 11 passed. Catalog size is 215 names.

`analytics-preauth.test.ts` was started in this environment and returned HTTP 429 from the in-memory rate limiter, then the process kept retrying Redis. Those route tests are **not passed**. They were not changed by this certification.

Not run: Android WebView, iOS WKWebView, Coolify Postgres, a database integration test, a live RevenueCat webhook, and Google Ads upload. Those are **UNVERIFIED**. Migration `0052` was not executed.

## 10. Remaining issues

P0

- Do not apply `0052` until the pre-migration duplicate checks in the runbook pass on Coolify. This certification did not run those checks.
- Do not run `db:push` against Coolify. The Drizzle `event_id` unique index is not partial. Migration `0052` is partial. `CREATE INDEX IF NOT EXISTS` will not change an index that already exists.
- Do not count `purchase_class` `unknown`, missing class without `period_type` `NORMAL`, trials, promotional grants, or unpriced introductory offers as paid.
- Do not describe iOS users as Google Ads acquired. There is no SKAdNetwork, AdAttributionKit, or ATT prompt in `artifacts/amynest-capacitor/ios`.
- Infant measurements, cry text, meal names, prompts, and child names stay out of these product events.

P1

- Speech and abacus named events still carry numeric `childId`.
- Games have no abandon event before finish.
- Phonics and the other learning routes without a completion callback stay at `feature_viewed`.
- Device queue depth, retry count, and last device acknowledgement are not collected.
- MRR in the Subscriptions section is a Razorpay list-price estimate, not App Store or Play Store proceeds.
- Purchase reconciliation counts webhook rows. It does not classify trial versus paid from the webhook payload column.
- Android WebView and iOS WKWebView were not executed.

P2

- D14 and D30 need a cohort old enough to measure. Read cohort size before the rate.
- Most dialogs still do not call `trackModal`.
- Admin feature-to-paid overlap is not an incrementality model.

## Verdict

**CONDITIONAL PASS.**

The lifecycle events, first-touch rule, purchase classes, and reliability labels are implemented and covered by the unit tests that passed. The API can be deployed before migration `0052`. It is not READY FOR STAGING as a certified environment, and it is not READY FOR PRODUCTION. Database application, device behavior, live purchase reconciliation, and production event freshness are unverified.
