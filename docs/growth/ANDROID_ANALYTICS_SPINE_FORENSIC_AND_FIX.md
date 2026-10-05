# Android analytics spine — forensic and fix

**Status:** `ANALYTICS SPINE FIXED — PRODUCTION VERIFICATION PENDING`

**Date:** 2 Oct 2026  
**Timezone:** Asia/Calcutta unless noted  
**Ads campaign:** `23986249354`  
**Production deploy:** NO (internal AAB only; web/API not shipped without explicit approval)  
**Historical backfill:** NONE — Window A `25 Sep → 1 Oct` remains a documented internal ingest gap

---

## 1. Ads pause verification

| Field | Value |
|---|---|
| Campaign ID | `23986249354` |
| Customer | `6395859996` |
| Previous status | `ENABLED` |
| New status | `PAUSED` |
| Pause mutation | 2 Oct 2026 ~17:10 UTC / ~22:40 IST |
| Re-verified via Ads API | 2 Oct 2026 ~17:51 UTC / ~23:21 IST |
| Daily budget | ₹400 — **UNCHANGED** |
| Bidding / geo / conversions / creatives | **UNCHANGED** |

`get_google_ads_campaigns(customer_id=6395859996, status_filter=PAUSED)` returned this campaign only:

- name: `App promotion-Android (purchases · metros)`
- status: `PAUSED`
- type: `MULTI_CHANNEL`
- budget: `400`

No other Ads mutation was performed. The campaign **must stay paused** until analytics verification succeeds and a separate restart decision is made.

```
ADS CAMPAIGN 23986249354: PAUSED
ADS GEO: UNCHANGED
ADS BUDGET: UNCHANGED
ADS BIDDING: UNCHANGED
PRODUCTION DEPLOYMENT: NO
```

---

## 2. Incident summary

Window **25 Sep 2026 00:00 → 1 Oct 2026 23:59**, Asia/Calcutta.

| Signal | Count | Meaning |
|---|---:|---|
| Google Ads Play installs | 88 | Store install reports |
| Ads / Firebase `first_open` | 55 | Native Firebase AUTO `first_open` |
| Coolify `analytics_events` Android `first_open` | 8 unique / 9 events | Internal JS/API spine |
| Coolify `device:` rows | **0** | Pre-auth ingest never persisted |
| Authenticated Android users | 12 | After login |
| Firebase Auth creates | 7 | Account-wide, **not Ads-attributed** |
| New subscriptions | 7 | Account-wide, **not Ads-attributed** |
| Ads `begin_checkout` / `purchase` | 0 / 0 | Ads conversion window |
| DB checkout | 1 cancelled | Not a purchase |
| DB purchase | 0 | — |

Do **not** conclude “33 installs never opened.” Ads already records 55 Firebase `first_open`. The proven gap is:

**55 Firebase AUTO `first_open` → 8 internal `analytics_events.first_open`**

That is an **internal analytics ingest / instrumentation gap**, not install-to-open conversion.

The 7 Auth creates / 7 new subscriptions are account-wide. They are not Ads-attributed.

---

## 3. Production data sources

| Source | Role | Used |
|---|---|---|
| Coolify Postgres (Hetzner worker `10.0.0.2` → `10.0.2.7`) | Production `analytics_events`, `subscriptions`, `parent_profiles`, billing | READ-ONLY forensic (prior window) |
| Render Postgres | Retired | **Not queried** |
| Google Ads API | Campaign status, install / conversion counts | Pause + verify |
| Firebase Analytics SDK (native Android) | AUTO `first_open` | Explains the 55 |
| Firebase Auth | Account creates | 7 in Window A, account-wide |
| Play Console | Production Android build | `1.4.63` / `106` during the window |

No credentials are recorded here.

---

## 4. Current event architecture

Shipped Android app is the **Play WebView wrapper** (`android/`), not Capacitor.

```
Google Play install
  → AmyNestApp.onCreate
      → FirebaseAnalytics.getInstance()          ← AUTO first_open (the Ads 55)
      → NativeAnalyticsSpine.bootstrap()         ← NEW: preauth first_open POST
  → MainActivity WebView https://www.amynest.in
      → document-start: device id + app version  ← NEW
      → React ClientTelemetryBootstrap
          → AnalyticsService.trackAppOpen()      ← JS first_open (the DB 8)
          → POST /api/analytics/events            ← requires Firebase uid
          → POST /api/analytics/preauth-events    ← device:{deviceId}
      → analytics_events
      → after login: stitch device: → uid         ← NEW
```

Firebase AUTO `first_open` and internal `analytics_events.first_open` are **different events**.

| Event | Origin | Auth required (before fix) | Internal DB |
|---|---|---|---|
| Firebase `first_open` | Native SDK, process start | No | No (Firebase only) |
| `analytics_events.first_open` | JS `trackAppOpen` after SPA hydrate | Effectively yes (preauth never landed) | 8 users |
| `app_open` / `session_start` | JS | Same queue | After login |
| `install_source` | JS after 2.5s referrer wait | Preauth allowlisted, but 0 `device:` rows | 2 `gclid` users |
| `onboarding_completed` | JS conversion funnel | Preauth **rejected** before fix | Only if authed |
| `first_plan_generated` | JS | Preauth **rejected** before fix | Only if authed |
| `speech_coach_v2_session_start` | JS | Preauth **rejected** before fix | 0 in window |
| Trial | `subscription_funnel_event` step `trial_started`; Firebase maps to `start_trial` | Auth | 0 analytics trial |
| Paywall | `paywall_view` / `premium_paywall_viewed` | Preauth **rejected** before fix | 4 |
| Checkout | `checkout_started` (Ads `begin_checkout` is Firebase) | Preauth **rejected** before fix | 1 cancelled |
| Purchase | `purchase_success` / `upgrade_completed` | Auth (correct) | 0 |

Anonymous identifier: `device:{deviceId}` where `deviceId` is `amynest:device:id:v1` in WebView localStorage. Authenticated identifier: Firebase uid. There was **no stitch** before this fix.

---

## 5. `first_open` forensic

### A. Firebase `first_open` is automatic / native

`AmyNestApp.initFirebaseAnalytics()` enables collection. The Firebase Android SDK emits AUTO `first_open` when the app process starts. This does **not** write Coolify `analytics_events`. This is the 55.

### B. `analytics_events.first_open` is separately generated

`AnalyticsService.trackAppOpen()` → `session.shouldEmitFirstOpen()` → `track("first_open")`. This is the 8.

### C. JS/WebView does attempt to emit `first_open`

`ClientTelemetryBootstrap` always calls `trackAppOpen()` + `flushAnalytics()` after React mounts.

### D. Native bridge did **not** forward `first_open` (before this fix)

No native POST existed. `InstallReferrerBridge` injects referrer JS only, and only after a deferred `webView.post`.

### E–H. Auth / anonymous / missing user id

Unsigned `useAuthFetch` posts **without** a Bearer token. `/api/analytics/events` returns **401** unless Firebase uid is present. Preauth fallback exists in `event-queue.ts`, but Window A had **zero** `device:` rows, so that path did not persist in production.

`ClientTelemetryBootstrap` and `AnalyticsBootstrap` previously **always** `setAuthFetch(authFetch)`, so every flush tried `/events` first. Combined with bounce-before-fallback and `FIRST_OPEN_KEY` being set **before** ingest ACK, unsigned `first_open` was lost.

### I–J. WebView loads after Firebase fires; bridge init race

Firebase AUTO fires in `Application.onCreate`. JS `first_open` waits for WebView + SPA hydrate + `ClientTelemetryBootstrap`. Users who open the app (Firebase 55) but never finish SPA ingest never appear internally.

Install referrer and app-version bridges were installed in `installDeferredStartupComponents()` **after** `loadUrl`. First paint can run before `__AMYNEST_INSTALL_REFERRER` / `AmyNestAppNative` exist.

### K–M. Consent / network / queue

Queue + retry + offline requeue already existed (`localStorage` persistent queue, exponential backoff). They only help if the SPA stays alive long enough. Process kill after `FIRST_OPEN_KEY=1` and a failed flush **never retried** `first_open`.

Flush treated HTTP **202** as full delivery even when the server accepted 0 events / dropped preauth-policy events. Funnel events mixed into a preauth batch could be acknowledged and discarded.

### N–O. Name / schema

Event name `first_open` matches. Extra envelope props are Zod-stripped, not rejected. `install_source` schema **stripped `gclid` / `gbraid` / `wbraid` / `campaign_id`** before this fix — attribution was not a typed persisted field even when the client sent it.

### P. Release correlation

Production wrapper during Window A: **`1.4.63` / versionCode `106`**, `PushBridge.WRAPPER_VERSION` `2.7.0`, Firebase BOM `33.7.0`. `analytics_events.app_version` was **`unknown` for all 5337 events** because JS `resolveAppVersion()` used `VITE_APP_VERSION` (unset in prod) and ignored the native version bridge. The 55 → 8 gap is this architecture on the live wrapper, not a unique one-day regression.

### Exact failure mechanism

1. Native Firebase records `first_open` at process start (55).
2. Internal `first_open` is a later JS event that requires SPA hydrate.
3. Unsigned JS flush hits `/api/analytics/events` (401) because `authFetch` was always attached.
4. Preauth fallback either never completed (bounce / WebView death) or never reached production users in this window (`device:` = 0).
5. `FIRST_OPEN_KEY` was set **before** a 202, so a lost queue never re-emitted `first_open`.
6. The 8 DB `first_open` users are those who authenticated so `/events` succeeded with a Firebase uid.

That is why 55 ≠ 8, and why 8/88 is **not** install-to-open conversion.

---

## 6. Anonymous identity forensic

| Lifecycle | Before fix | After fix |
|---|---|---|
| Fresh install | JS UUID in WebView localStorage only, after SPA | Native UUID in `SharedPreferences` + document-start `localStorage` |
| `first_open` before login | Not persisted internally | Native POST `/api/analytics/preauth-events` as `device:{id}` |
| WebView restart | localStorage survives (same origin `www.amynest.in`) | Same + native id preferred if empty |
| App restart | JS id survives unless data cleared | Native id survives in prefs |
| Login | New events use Firebase uid; old `device:` rows (if any) stayed orphaned | Authenticated ingest stitches `device:{id}` → uid |
| Logout | Device id is kept (`user-session-cache` does not delete it) | Unchanged |
| Wrapper upgrade cache purge | Cookies/SW cleared; localStorage usually kept | Native first_open **skipped** if `amynest_webview.wrapper_version` already exists |

PII is not used. Identifiers are `device:{deviceId}` and Firebase uid.

---

## 7. Attribution forensic

| Field | Window A fact |
|---|---|
| `install_source=google_ads` | 2 users |
| `gclid` | Same 2 users |
| Typed `campaign_id` | 0 |
| One JSON substring of `23986249354` | 1 `install_source` row on 26 Sep — **not** a campaign join |
| Play Install Referrer native | `InstallReferrerBridge` existed but ran **after** `loadUrl` |
| JS wait | 2500ms for `amynest-install-referrer` / `__AMYNEST_INSTALL_REFERRER` |
| Schema | `install_source` dropped `gclid`/`gbraid`/`wbraid`/`campaign_id` on ingest |

What Android can receive from Play: the Install Referrer string (`utm_*`, `gclid`, `gbraid`, `wbraid`, timestamps). It was injected into JS late. It was not POSTed natively. It was not a typed DB column.

This fix:

- Persists referrer JSON in native prefs and POSTs `install_source` when Play returns it.
- Injects any already-known referrer at document-start.
- Keeps `gclid` / `gbraid` / `wbraid` / `campaign_id` on `first_open` and `install_source` schemas.
- Stores `campaign_id` only when Play/UTM actually provides a numeric campaign id or `campaign_id` param. **No invented Ads join.**

`gclid` is not PII under this implementation; it is treated as attribution metadata already used in-product.

---

## 8. WebView / native bridge forensic

| Bridge | When installed | Analytics impact |
|---|---|---|
| `PushBridge` document-start `__AMYNEST_WRAPPER` | Before `loadUrl` | Wrapper detection only |
| `InstallReferrerBridge` | Deferred `webView.post` | Race vs JS first_open / 2.5s wait |
| `AmyNestAppNative` / `AmyNestDeviceNative` | Deferred | `app_version` unused by analytics context |
| Analytics queue | JS | Retry/backoff/offline; 202 treated as full delivery |
| Auth | `AuthBridge` | Login is when internal ingest actually worked |

Silent drop paths:

1. SPA never hydrates → no JS events (Firebase still has `first_open`).
2. `FIRST_OPEN_KEY` set before ACK → no retry.
3. Preauth policy drop with HTTP 202 → client discards funnel events.
4. Referrer arrives after `install_source` already emitted as organic.

---

## 9. Root cause

**Primary:** Internal `first_open` is a JS-after-WebView event, while Ads/Firebase `first_open` is native AUTO. Unsigned internal ingest did not persist (`device:` = 0). `first_open` was marked sent before server ACK. Result: only users who signed in appear in Coolify (8), vs 55 native opens.

**Secondary:** Preauth allowlist omitted conversion-spine events (`onboarding_completed`, `first_plan_generated`, `paywall_view`, `checkout_started`, Speech Coach). Anonymous funnel could not land even if preauth worked.

**Tertiary:** No identity stitch. `install_source` schema stripped Ads click ids. Native app version was not used (`app_version=unknown`).

---

## 10. Minimum safe fix

Implemented in this change set. No Ads conversion config changes. No fake events. No historical backfill.

1. **Native `first_open`** (`NativeAnalyticsSpine`) POSTs `/api/analytics/preauth-events` on fresh install from `Application.onCreate`, without waiting for the SPA. Skipped on wrapper upgrades.
2. **Document-start identity** injects native device id + app version into `localStorage` / `window` before page scripts.
3. **JS unsigned flush** only attaches `authFetch` when signed in, so preauth is first-class before login.
4. **`FIRST_OPEN_KEY` after ACK** (or after native confirmed sent). Failed flush retries `first_open`.
5. **Server stitch** on authenticated `/api/analytics/events`: rewrite `device:{deviceId}` rows to the Firebase uid.
6. **Server `first_open` dedupe** per `user_id`.
7. **Preauth allowlist** expanded to the conversion spine (not `purchase_success` / `upgrade_completed`).
8. **Attribution fields** retained on `first_open` and `install_source`; native POSTs `install_source` when Play referrer arrives.
9. **App version** from native injection so production rows are not `unknown`.

Android version: **`1.4.64` / versionCode `107`**. Wrapper marker: **`2.8.0`**.

Web + API changes are in-repo. They do **not** serve production until explicitly deployed. Native `first_open` against the **already-live** preauth endpoint can be verified from an internal-test AAB without a web deploy.

---

## 11. Tests

| Case | Kind | Coverage |
|---|---|---|
| Fresh install / native device id | unit (jsdom) | `device-id.test.ts` |
| First launch before login | unit | `analytics-service.test.ts` preauth flush |
| Duplicate `first_open` prevention | unit + API | client once-per-session; server per `user_id` |
| Network unavailable / restored | unit | queue requeue then 202 ACK |
| Auth 401 → preauth | unit | `analytics-service.test.ts` |
| Attribution persistence | unit | `install-attribution.test.ts` + taxonomy gclid/`campaign_id` |
| Preauth conversion spine | unit | `preauthAnalyticsService.test.ts` |
| Anonymous onboarding/paywall ingest | integration (DB) | `analytics.test.ts` (skipped locally without DB) |
| Anonymous → authenticated stitch | integration (DB) | `analytics.test.ts` (skipped locally without DB) |
| WebView recreation | unit | localStorage restart in `device-id.test.ts` |
| Purchase identity | policy unit | purchases **not** preauth-allowlisted |
| Android emulator / physical device | **not run** | no device attached this session |
| Production verification | **pending** | requires internal testers on `1.4.64` |

Kidschedule vitest (this session): **16 passed** (`analytics-service`, `device-id`, `install-attribution`).  
API unit (this session): taxonomy + preauth policy **passed**. Route DB tests **skipped** (no local integration DB).

---

## 12. Build verification

| Check | Result |
|---|---|
| Taxonomy / API typecheck | `@workspace/api-server` `tsc --noEmit` passed |
| Kidschedule targeted unit tests | 16 passed |
| Android `lintVitalRelease` | passed (Play-blocking lint) |
| Android `lintRelease` | 6 pre-existing `RestrictedApi` errors in Auth/Billing WebView message proxies; 1 `NewApi` WebView package lookup guarded for API 24 |
| `bundleRelease` | BUILD SUCCESSFUL |
| AAB | `android/releases/amynest-1.4.64-107.aab` (33 MB, signed) |
| R8 mapping | `NativeAnalyticsSpine` kept |
| Play upload | **NOT DONE** |
| Production store rollout | **NOT DONE** |

Do not ship this AAB to the production track without explicit approval. Internal testing is the next step.

Incident-window production build for comparison:

| Field | Live during 25 Sep–1 Oct |
|---|---|
| versionName | `1.4.63` |
| versionCode | `106` |
| Wrapper | `2.7.0` |
| Firebase BOM | `33.7.0` |
| Shell | `android/` WebView, UA `AmyNestAndroid/1.0` |

---

## 13. Production verification

**Not complete.** Criteria for later (internal testers on `1.4.64`, Coolify READ-ONLY):

A fresh Android install must produce `first_open` in `analytics_events` with `user_id` like `device:{id}` **before login**.

Then, same `device_id` / stitched uid through:

`onboarding_completed` → `first_plan_generated` → `speech_coach_v2_session_start` → trial (`subscription_funnel_event` / Speech Coach trial) → `paywall_view` → `checkout_started` → `purchase_success` / `upgrade_completed`.

After signup, former `device:` rows must belong to the Firebase uid.

Do not mark complete from code inspection. This document does not.

---

## 14. Historical data limitations

Window **25 Sep → 1 Oct** internal gap is:

**HISTORICAL INTERNAL ANALYTICS INGESTION GAP**

No synthetic `first_open` rows were written. Firebase AUTO events are not copied into Coolify. There is no legitimate source from which to reconstruct the missing 47 internal `first_open` records without fabricating them.

---

## 15. Ads restart readiness

Campaign `23986249354` **remains PAUSED**.

Do not resume automatically. Do not change geo (USA / Canada / UK / India) now.

Restart is **not ready** until production verification shows:

- internal `first_open` captured on fresh Android install
- activation measurable (`onboarding_completed` / `first_plan_generated`)
- attribution persisted when Play provides it (`gclid` / referrer / `campaign_id` when present)
- checkout measurable (`checkout_started` internally; Ads `begin_checkout` still Firebase)
- purchase measurable (`purchase_success` / `upgrade_completed`)

---

## 16. Recommended next experiment

After analytics verification — and only after a separate Ads authorization:

1. Keep this campaign paused until the internal spine is proven on testers.
2. Then consider a **new** geo experiment (USA / Canada / UK, India possibly removed) rather than mutating this paused campaign in place.
3. Optimize only after `first_open`, activation, checkout, and purchase are visible on the **internal** spine, not Firebase AUTO alone.

No geo change is implemented in this task.

---

## Event contract (canonical internal names)

| Event name | Trigger | Unique key | Anonymous id | Auth id | Dedup |
|---|---|---|---|---|---|
| `first_open` | Native cold start (new) + JS first SPA open | `{deviceId}:first_open` | `device:{deviceId}` | Firebase uid after stitch | Client ACK + server per user |
| `signup` | Firebase `sign_up` / `pre_signup_signup_completed` | once per install/session emitters | same | uid | existing once-keys |
| `onboarding_completed` | Onboarding finish | conversion-funnel onceKey | allowed preauth | uid | onceKey |
| `first_plan_generated` | First plan | conversion-funnel onceKey | allowed preauth | uid | onceKey |
| `speech_coach_v2_session_start` | Speech Coach V2 start | session id in props | allowed preauth | uid | 300ms fingerprint |
| `start_trial` | Firebase recommended name; internal `subscription_funnel_event` step `trial_started` / `speech_coach_trial_started` | existing funnel | usually authed | uid | existing |
| `paywall` | Internal `paywall_view` (alias `premium_paywall_viewed`) | source/reason | allowed preauth | uid | 300ms |
| `begin_checkout` | Firebase Ads name; internal `checkout_started` | plan/source | allowed preauth | uid | existing |
| `purchase` / `purchase_success` | Store purchase success | transaction id when present | **not** preauth | uid | existing |
| `upgrade_completed` | Premium unlock | module/source | **not** preauth | uid | existing |

Common envelope (after fix): timestamp (`client_ts` / `server_ts`), `app_version` (native when injected), `platform=android`, attribution fields when legitimately present (`install_source`, `gclid`, `gbraid`, `wbraid`, `campaign_id`, `play_referrer`).

---

## Final status

```
ANALYTICS SPINE FIXED — PRODUCTION VERIFICATION PENDING

ADS CAMPAIGN 23986249354: PAUSED
ADS GEO: UNCHANGED
ADS BUDGET: UNCHANGED
ADS BIDDING: UNCHANGED
PRODUCTION DEPLOYMENT: NO
```
