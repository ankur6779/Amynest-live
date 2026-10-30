# Production paid-user identity/attribution repair — 5 Oct 2026

**Backend/web repair status (5 Oct 2026):** `PRODUCTION REPAIR VERIFIED — READY FOR CLEAN DEVICE TEST`

**Android (30 Oct 2026):** `ANDROID DEVICE TEST BLOCKED`

**CI (30 Oct 2026):** `CI FAILURE ROOT CAUSE VERIFIED — FIX BLOCKED`

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

---

## Android Native Readiness

Inspected 30 Oct 2026. Git `main` HEAD `5158b0ca70fe23497b19666b346e5613335a5ca9`, working tree clean, tracking `origin/main`. Both `c41d74529` and `5158b0ca7` are ancestors of HEAD.

Native identity files were introduced in `c41d74529` and remain in HEAD. They live under `android/` (Play WebView wrapper), not Capacitor.

### Native implementation (source + Gradle source set)

| Concern | File / method | Commit |
|---|---|---|
| Install Referrer capture | `InstallReferrerBridge.queryPlayReferrer` / `prefetch` / `fetchOn` | `c41d74529` |
| Persist referrer + click ids | `NativeAnalyticsSpine.onReferrer`, prefs `amynest_analytics` / `referrer_json`; `parseReferrer` stores gclid/gbraid/wbraid/campaign_id | `c41d74529` |
| Stable app-scoped device ID | `NativeAnalyticsSpine.getOrCreateDeviceId` — UUID in `SharedPreferences` `amynest_analytics` / `device_id` (not advertising ID / IMEI / serial / MAC) | `c41d74529` |
| Document-start injection | `NativeAnalyticsSpine.installDocumentStart` → `WebViewCompat.addDocumentStartJavaScript`; called from `MainActivity` **before** `loadUrl` | `c41d74529` |
| Native `first_open` ACK | `sendFirstOpenIfFreshInstall` POSTs `/api/analytics/preauth-events`; `KEY_FIRST_OPEN_SENT` set only if POST ok | `c41d74529` |
| Firebase UID stitch | JS `analytics` authed ingest → `stitchDeviceAnalyticsIdentity` (`device:{id}` → Firebase UID) | `c41d74529` |
| RevenueCat login | `AmyNestApp.initRevenueCat` uses persisted UID if present; JS `syncIdentifiedRevenueCatUser` → `BillingBridge.setUserId` → `Purchases.logInWith` | `c41d74529` |
| Anonymous purchase guard | `BillingBridge.purchase` returns `authenticated_identity_required` if no persisted canonical UID; refuses `$RCAnonymousID` | `c41d74529` |
| Server webhook / subscription | `POST /api/subscription/webhook` Bearer `REVENUECAT_WEBHOOK_SECRET`; `INITIAL_PURCHASE` → `recordServerPurchaseTruth` | `c41d74529` |

Gradle inclusion: `settings.gradle.kts` `include(":app")`; sources under `android/app/src/main/kotlin/`. ProGuard keep rules include `NativeAnalyticsSpine` and `InstallReferrerBridge`.

**Artifact-level proof (not Play-uploaded):** local `assembleRelease` APK dex contains `Lcom/amynest/app/NativeAnalyticsSpine;`, `Lcom/amynest/app/InstallReferrerBridge;`, and `authenticated_identity_required`.

This is **not** proof that Play Production currently ships that APK.

### Build environment

| Item | Result |
|---|---|
| JDK | Android Studio JBR OpenJDK 21.0.10 (`JAVA_HOME` otherwise unset; `/usr/bin/java` is a macOS stub) |
| Android SDK | `$HOME/Library/Android/sdk` — platforms 35/36/36.1, build-tools 36.1.0 |
| Gradle wrapper | `android/gradlew` + Gradle 9.1.0 |
| `local.properties` `sdk.dir` | present |
| `keystore.properties` | present (values not printed) |
| `adb` | `$HOME/Library/Android/sdk/platform-tools/adb` — daemon started; **no devices** |
| Android unit tests | no `android/app/src/test` or `androidTest` tree |

### Artifacts

| Variant | Result |
|---|---|
| `:app:assembleDebug` | **FAILED** — `processDebugGoogleServices`: no client for `com.amynest.app.debug` in `google-services.json` |
| `:app:assembleRelease` | **BUILD SUCCESSFUL** in 26s (local only) |

| Field | Value |
|---|---|
| Git SHA used | `5158b0ca70fe23497b19666b346e5613335a5ca9` |
| Artifact | APK `android/app/build/outputs/apk/release/app-release.apk` |
| Package | `com.amynest.app` |
| versionName | `1.4.66` |
| versionCode | `109` |
| Wrapper constant | `PushBridge.WRAPPER_VERSION = 2.8.0` |
| SHA-256 | `7fafe1a6c9150c489ebf8875ff0ea3f2432bf67cefc4957f6fdbdc00d8b28c4d` |
| Built | 2026-10-30 22:11 local |
| Play Production upload | **not performed** |

### Device availability

`adb devices -l` → empty (daemon running, zero attachments).

**Status: `ANDROID DEVICE TEST BLOCKED`**

To continue:

1. Attach a physical Android device with USB debugging **or** a Google Play–enabled emulator.
2. Confirm `adb devices` lists it.
3. Sideload/internal-install the local `1.4.66` (`109`) artifact that contains `NativeAnalyticsSpine` (do **not** upload to Play Production for this step).
4. Verify on device, in order, before any purchase: native device id stability across WebView reload → unsigned native `first_open` ACK → Firebase login stitch → RevenueCat `appUserID` equals Firebase UID → anonymous purchase refused.
5. Only then a Play Billing test purchase.

Unverified runtime gates (no device evidence): Install Referrer, native device-id persistence, native first_open ACK on device, Firebase stitch, RevenueCat identified login, purchase guard, Play purchase.

---

## GitHub Actions Failure

| Field | Evidence |
|---|---|
| Workflow | Production deploy (gated) — `.github/workflows/deploy-production.yml` |
| Latest run | [37350137383](https://github.com/ankur6779/Amynest-live/actions/runs/37350137383) on `5158b0ca7` (30 Oct 2026 17:40 UTC start) |
| Overall | **failure** |
| Failing job | `Deploy Cloudflare API proxy worker` (databaseId `111899842006`) |
| Failing step | `Deploy amynest-api-proxy` → `bash scripts/deploy-cloudflare-api-proxy.sh` |
| Exit code | **1** |
| Wrangler | 4.147.0 |
| Token present | yes (`CLOUDFLARE_API_TOKEN` set; value redacted) |
| Error | `A request to the Cloudflare API (/accounts/362bb082e16cf42fbcd036e164f0fbc4/workers/services/amynest-api-proxy) failed.` **`No access to the specified service.`** |
| When | **during** `wrangler deploy`, after checkout/setup-node; not a test failure; not a Pages failure |

Same error on earlier identity-repair run [37346651736](https://github.com/ankur6779/Amynest-live/actions/runs/37346651736).

Root cause: GitHub secret `CLOUDFLARE_API_TOKEN` authenticates but lacks **Workers Scripts Edit** (or equivalent) on Cloudflare account `362bb082e16cf42fbcd036e164f0fbc4` for worker `amynest-api-proxy`. The deploy script already documents that Pages Edit is not enough. This is a **credentials/permission** issue, not a worker source bug.

`infra/cloudflare/amynest-api-proxy/src/worker.test.mjs` — **pass** locally (not the CI failure).

No repository code change was made. Fixing CI requires updating the GitHub secret (or Cloudflare API token permissions), which is a production-credentials change and is **blocked** without owner approval. Pushing a no-op to “make CI green” was not done.

### Deployment planes (keep separate)

| Plane | Status | Evidence |
|---|---|---|
| Cloudflare Pages | **success** in run 37350137383 | live `index-DQaIcJb1.js` |
| Coolify API | **serving** | `POST /api/analytics/preauth-events` policy responses; `/api/health` `{ok:true}` `x-amynest-backend: coolify` |
| Cloudflare API proxy worker **CI deploy** | **failed** | wrangler “No access to the specified service” |
| Cloudflare API proxy worker **live traffic** | **still routing** | www `/api/health` has `cf-ray` + `x-amynest-trace-cf-ms` (set in `worker.js`); Coolify origin health lacks that CF trace header |
| Overall GHA | **failure** | one required job failed |

A failed worker **deploy job** does not prove `/api` is down. It proves CI could not **update** the worker.

**CI status: `CI FAILURE ROOT CAUSE VERIFIED — FIX BLOCKED`**

Required owner action: grant the GitHub `CLOUDFLARE_API_TOKEN` secret Workers Scripts Edit on account `362bb082e16cf42fbcd036e164f0fbc4` for `amynest-api-proxy`, then re-run only the worker job (do not treat a Pages/API redeploy as the fix).

---

## Production Safety

Checked 30 Oct 2026 ~16:40 UTC. No Ads mutations. No AAB uploaded to Play. No extra valid `first_open` probe. No production DB writes for this pass (ledger/table SELECT only).

| Check | Result |
|---|---|
| Campaign `23986249354` | **PAUSED**, ₹400/day, customer `6395859996` |
| Invalid preauth body | **400** `invalid_body` |
| Missing device id | **400** `missing_device_id` |
| Unsigned `purchase_success` | **202** `accepted:0` `rejectedPreauthPolicy:1` |
| Live JS ACK-after-POST | `analytics-service-gF6F5k1Y.js`: `shouldEmitFirstOpen` does not `setItem` before return; `markFirstOpenDelivered` present |
| Migration 0051 | both tables present |
| Ads ledger | **0** rows; no upload-like statuses |
| RevenueCat webhook unsigned | **401** `invalid_webhook_signature` |

**Never `READY FOR ADS RESUME`.**

---

## Final status (30 Oct 2026)

| Stream | Status |
|---|---|
| Backend/web identity repair | still `PRODUCTION REPAIR VERIFIED — READY FOR CLEAN DEVICE TEST` |
| Android | **`ANDROID DEVICE TEST BLOCKED`** |
| CI worker job | **`CI FAILURE ROOT CAUSE VERIFIED — FIX BLOCKED`** |
| Ads | **PAUSED** — not resume-ready |
