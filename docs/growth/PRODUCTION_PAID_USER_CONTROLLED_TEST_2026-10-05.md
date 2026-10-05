# Production paid-user identity/attribution repair — 5 Oct 2026

**Final status:** `PRODUCTION REPAIR VERIFIED — READY FOR CLEAN DEVICE TEST`

```
ADS CAMPAIGN 23986249354: PAUSED
BUDGET ₹400 UNCHANGED
NO ADS RESUME
NO CONVERSION UPLOAD
NO FAKE GCLID
NO SYNTHETIC PURCHASE
NO PLAY STORE AAB UPLOAD
```

This is **not** `READY FOR ADS RESUME`. Google Ads click → real Play install → real purchase has not been run.

A single unsigned production probe (`probe-device-id-0001`) was sent to prove the live ACK path. It has **no** gclid/gbraid/wbraid/campaign_id and is `ATTRIBUTION_UNKNOWN`. It is not a user, not a purchase, and not Ads attribution.

---

## A. BEFORE FIX

Checked before commit/deploy (5 Oct 2026 ~17:12 UTC).

| Gate | Live evidence |
|---|---|
| Git HEAD | `127e862b8` on `main`; identity files **uncommitted** |
| Production branch | `origin/main` @ `a39cfa0e2` (API/web deploy target) |
| Live SPA | `https://www.amynest.in/` → `assets/index-DaXW0SpR.js` → `main-FqBH5h5U.js` → `analytics-service-QCLKmxf8.js` |
| Live JS first_open | `shouldEmitFirstOpen()` did `localStorage.setItem(v,"1")` **before** POST. No `markFirstOpenDelivered`. |
| Unsigned `POST /api/analytics/preauth-events` | **401** `{error:"Unauthorized", message:"Authentication required. Please sign in again."}` `x-amynest-backend: coolify` |
| Root cause in code | `router.use(requireAuth)` then `router.use(analyticsRouter)` in `artifacts/api-server/src/routes/index.ts` |
| Coolify `device:{id}` | **0** all-time |
| `purchase_success` | **0** |
| `install_source=google_ads` + gclid | **0** |
| `user_acquisition_attribution` | **absent** |
| `ads_conversion_upload_ledger` | **absent** |
| Migration 0051 | **not applied** |
| Ads | campaign `23986249354` **PAUSED**, ₹400/day, customer `6395859996` |

Intended identity work was **not** in any commit reachable from HEAD. It existed only as a dirty working tree.

---

## B. ROOT CAUSE

1. **Unsigned preauth was behind global `requireAuth`.** The handler itself did not call `getAuth`, but the router was mounted after `router.use(requireAuth)`, so every pre-login `first_open` died with 401.
2. **Live JS committed `amynest_analytics_first_open` before the POST.** A failed ingest permanently suppressed retries.
3. **Migration 0051 was never applied**, so there was no durable first-touch table and no Ads ledger.
4. Firebase AUTO `first_open` ≠ internal `analytics_events.first_open`. Internal spine could not start at `device:{id}`.

---

## C. CODE CHANGES

Commit **`c41d74529`** on `main` (pushed to `origin/main`).

| Area | Change |
|---|---|
| API mount | New public `analyticsPreauthRouter` mounted **before** `requireAuth` |
| Protections | Device-id format, event allowlist, taxonomy, 32 KiB body cap, IP/device rate limits, strip client `user_id` / revenue / entitlement, reject `purchase_success` / `upgrade_completed` |
| ACK | Native + JS mark first_open delivered **only after 2xx**. Backend dedupes `first_open` per `user_id` |
| Device id | Native UUID in `amynest_analytics` prefs; document-start inject `__AMYNEST_NATIVE_DEVICE_ID` |
| Stitch | `device:{id}` rows rewritten to Firebase UID on authenticated ingest; first_open extras deleted; first-touch attribution preserved |
| RevenueCat | `syncIdentifiedRevenueCatUser` after Firebase Auth; Android purchase refused while identity is anonymous / `$RCAnonymousID` |
| Purchase truth | RevenueCat `INITIAL_PURCHASE` webhook writes server `purchase_success` + `upgrade_completed` + ledger prepare with `adsUploadEnabled: false` |
| Attribution statuses | `GOOGLE_ADS_VERIFIED` only with click id; `install_source=google_ads` without click id remains `ATTRIBUTION_UNKNOWN`; `OTHER_SOURCE_VERIFIED` for non-ads sources |

Android AAB was **not** uploaded to Play. Native changes ship only after a later internal/device install.

---

## D. MIGRATION

`lib/db/migrations/0051_user_acquisition_attribution.sql` applied **additively** on Coolify Postgres via worker `amynest-worker` @ `167.233.39.146` (CREATE TABLE IF NOT EXISTS only; no backfill).

Verified columns:

`user_acquisition_attribution`: `id, device_id, canonical_user_id, firebase_uid, install_source, gclid, gbraid, wbraid, campaign_id, first_touch_at, last_touch_at, source_metadata, attribution_status, created_at, updated_at`

`ads_conversion_upload_ledger`: includes `canonical_user_id, event_name, event_time, gclid, gbraid, wbraid, campaign_id, source, dedupe_key, upload_status, upload_attempts, last_upload_attempt_at, last_upload_error`. Default `upload_status=blocked_ads_paused`.

---

## E. DEPLOYMENT

| Plane | Result |
|---|---|
| Git | `git push origin main` `a39cfa0e2..c41d74529` |
| GHA | [Production deploy 37346651736](https://github.com/ankur6779/Amynest-live/actions/runs/37346651736) — Pages **success**, Hetzner worker **success**, TypeScript gate **success**, Cloudflare API proxy worker **failure** |
| Web | Cloudflare Pages live hash changed `index-DaXW0SpR.js` → `index-BqBQnCcR.js` |
| API | Coolify origin now returns unsigned preauth **202** (was 401). `x-amynest-backend: coolify` |
| Android AAB | **Not uploaded** to Play Production |
| Ads | **No mutations** |

Cloudflare worker deploy failure did **not** block www preauth or Pages. Origin continued to serve `/api/*`.

---

## F. LIVE PRODUCTION VERIFICATION

Evidence time: **5 Oct 2026 17:21–17:23 UTC**. Source code is not used as proof below.

| # | Gate | Live result |
|---|---|---|
| 1 | Unsigned valid preauth | `POST https://www.amynest.in/api/analytics/preauth-events` **202** `{"ok":true,"ack":true,"received":1,"accepted":1,...}` |
| 2 | Invalid payload | empty `events` → **400** `invalid_body`; missing device header → **400** `missing_device_id` (not 401) |
| 3 | ACK | response includes `"ack":true` |
| 4 | `device:{id}` in DB | `device:probe-device-id-0001` `first_open` persisted |
| 5 | JS no longer marks delivered before POST | live `analytics-service-DKj6LW4T.js`: `shouldEmitFirstOpen()` returns without `localStorage.setItem`; `markFirstOpenDelivered()` exists; `firstOpenAwaitingAck` present |
| 6 | Old setItem-before-POST gone | `OLD_SETITEM_BEFORE_RETURN=false` on live chunk |
| 7 | Migration 0051 | both tables present (section G) |
| 8 | `user_acquisition_attribution` | present |
| 9 | Ads ledger | present; **0** rows; no upload |
| 10 | `purchase_success` server path | webhook route live: unauthenticated POST → **401** `invalid_webhook_signature` (not 404). Event count remains **0** (no real INITIAL_PURCHASE) |
| 11 | RevenueCat webhook path | same as (10) |
| 12 | Production app/version | **Web:** `index-BqBQnCcR.js` / `main-DLZ1C3BD.js` / `analytics-service-DKj6LW4T.js`. **Play native version not identified** (no clean device; AAB not uploaded) |

Retry of the same probe `first_open`: **202** `accepted:0`. DB still **1** `first_open` row.

Unsigned `purchase_success`: **202** `accepted:0`, `rejectedPreauthPolicy:1` (not stored).

---

## G. DATABASE VERIFICATION

Coolify Postgres, read via worker Node `pg` (`ssl:false`). No historical backfill. No fabricated gclid.

```
device_scoped_all_time: 1
probe_first_open_count: 1
probe user_id: device:probe-device-id-0001
probe event: first_open @ 2026-10-05T17:21:52.270Z
probe gclid: none
probe attribution: ATTRIBUTION_UNKNOWN, install_source=unknown, canonical_user_id=null
ads_conversion_upload_ledger rows: 0
purchase_success all-time: 0
```

`install_source=google_ads` without a click id is still **not** treated as Google Ads verified.

---

## H. TEST RESULTS

Repository (not production proof):

| Test | Result |
|---|---|
| Unsigned missing device / invalid body / malformed body (no 401) | pass (`analytics-preauth.test.ts`) |
| Mount order: preauth before `requireAuth` | pass (`launch-security-guards.test.ts`) |
| Allowlist drops purchase; strips client user_id/revenue | pass (`preauthAnalyticsService.test.ts`) |
| Attribution A–R + organic vs google_ads-without-click-id + `shouldUpload=false` | pass (`acquisitionAttributionLogic.test.ts`) |
| JS ACK-before-marker, retry after network failure, preauth flush | pass (`analytics-service.test.ts`) |
| Device id persistence / native inject | pass (`device-id.test.ts`) |
| API `pnpm --filter @workspace/api-server typecheck` | pass after db decls rebuild |

Production: unsigned ACK, invalid 400, purchase policy reject, first_open retry dedupe — **observed live**.

---

## I. KNOWN BLOCKERS

1. **No clean Android device.** `adb` is not available in this environment. Do **not** claim device stitching, RevenueCat login, purchase guard, Play purchase, or Install Referrer as verified.
2. **Play production native build** is still the previously shipped wrapper. Native spine (`NativeAnalyticsSpine`, purchase identity guard) is in git `c41d74529` but **not** in a Play-uploaded AAB.
3. **Cloudflare API proxy worker deploy failed** in GHA 37346651736. www API still reached Coolify for this probe.
4. **`purchase_success` remains 0.** Server path exists; no real RevenueCat `INITIAL_PURCHASE` was processed.
5. **Acquisition → paying-user join** is unproven. No real Ads click, no real Play install, no real subscription from this repair.
6. Probe row `device:probe-device-id-0001` exists in production analytics. It is a repair probe, not a customer.

---

## J. ADS STATUS

Read-only Google Ads API, customer `6395859996`, after repair:

| Field | Value |
|---|---|
| Campaign | `23986249354` App promotion-Android (purchases · metros) |
| Status | **PAUSED** |
| Budget | ₹400 / day (`400000000` micros) |
| Conversion upload | **none** (`ledger_row_count=0`, `adsUploadEnabled=false`) |

No budget, bidding, geo, asset, conversion-action, or status change was made.

---

## K. NEXT REQUIRED TEST

Campaign **`23986249354` stays PAUSED** until a later explicit controlled Ads test.

When a clean physical/emulated Android device is available, and only then:

1. Sideload/internal the native AAB that contains `NativeAnalyticsSpine` (do not resume Ads yet if using organic install).
2. Prove: stable native device id survives WebView reload.
3. Prove: unsigned native `first_open` ACK → `device:{id}`.
4. Firebase Auth → stitch to canonical Firebase UID.
5. RevenueCat `app_user_id` == Firebase UID == `subscriptions.user_id`.
6. Purchase refused while `$RCAnonymousID`.
7. Real Play purchase → RevenueCat `INITIAL_PURCHASE` → server `purchase_success` + subscription row.
8. Only after that spine is green: a **paused-campaign-is-not-enough** paid click test with a **real** gclid from Google Ads (still no auto-resume, no conversion upload until duplicate protection is proven).

Organic install **cannot** prove Google Ads click attribution.

---

## Controlled test preparation (not executed)

Required later chain, every link evidenced:

Google Ads click → Play Store → Install Referrer → native attribution → stable device ID → Firebase UID → RevenueCat UID → real Play purchase → RevenueCat INITIAL_PURCHASE → subscription → acquisition attribution → campaign/click id → Ads conversion ledger (`shouldUpload=false` until separately approved).

Do not fabricate a gclid to skip the click.
