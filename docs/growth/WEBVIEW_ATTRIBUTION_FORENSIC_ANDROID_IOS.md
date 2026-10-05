# WebView attribution forensic — Android + iOS

**Status:** `WEBVIEW ATTRIBUTION: FIX IMPLEMENTED — PRODUCTION VERIFICATION PENDING`

**Date:** 2 Oct 2026  
**Timezone:** Asia/Calcutta  
**Ads campaign:** `23986249354` — **PAUSED** (verified via Ads API; budget ₹400 unchanged)  
**GA4 OAuth:** STOPPED — not used  
**Render Postgres:** not queried  
**Historical backfill:** NONE

```
ADS CAMPAIGN 23986249354: PAUSED
NO ADS RESUME
NO GEO CHANGE
NO BUDGET CHANGE
NO BIDDING CHANGE
PRODUCTION DEPLOYMENT: NO
```

---

## 1. Executive summary

WebView is **a contributing cause, not the sole cause**, and it is **not** a mystery “33 installs never opened” story.

Proven independently:

| Claim | Verdict |
|---|---|
| WebView drops Play Install Referrer for every Ads install | **DISPROVED** — 2 authenticated users have `install_source=google_ads` and `gclid` on later events |
| WebView is unused / attribution is fully native | **DISPROVED** — internal `first_open` is a JS event |
| Firebase/Ads `first_open` = Coolify `first_open` | **DISPROVED** — independently generated |
| Anonymous Android users land in Coolify | **DISPROVED for Window A** — `device:` rows = **0** |
| The 8 DB `first_open` users share a technical path | **VERIFIED** — all `authenticated` Firebase uids, `app_version=unknown`, no `gclid` on the `first_open` row itself |

**55 Firebase AUTO first_open → 8 internal first_open** is an ingest / identity gap: internal first_open required SPA hydrate + authenticated `/api/analytics/events`. Unsigned preauth never persisted.

**88 Play installs → 2 google_ads users** is a separate attribution gap: Play referrer was queried **after** WebView `loadUrl`, `install_source` schema stripped `gclid`, and most opens never reached the JS/API spine at all.

iOS is **not** the Ads campaign path. iOS has **no** native install-referrer / ASA / Firebase Analytics pod. One iOS `first_open` in Window A: authenticated, `install_source` null, no `gclid`.

---

## 2. Architecture map

Traced from source. Links marked **NOT IMPLEMENTED** do not exist.

### Android (Play WebView wrapper — `android/`, **not** Capacitor)

```
Google Ads campaign 23986249354
  → Google Play install
  → Play Install Referrer API
      InstallReferrerClient 2.2
      InstallReferrerBridge.kt
      NativeAnalyticsSpine SharedPreferences (amynest_analytics)
  → AmyNestApp.onCreate
      FirebaseAnalytics.getInstance()          AUTO first_open (Ads 55)
      NativeAnalyticsSpine.bootstrap()         internal first_open POST (1.4.64+)
      InstallReferrerBridge.prefetch()         BEFORE WebView (1.4.65+)
  → MainActivity WebView https://www.amynest.in
      document-start: device id + cached referrer
      evaluateJavascript: __AMYNEST_INSTALL_REFERRER + CustomEvent
  → kidschedule JS
      install-attribution.ts
      AnalyticsService / event-queue.ts
  → POST /api/analytics/preauth-events | /api/analytics/events
  → Coolify analytics_events
```

| Boundary | File / symbol | Status |
|---|---|---|
| Play Referrer SDK | `android/app/build.gradle.kts` `com.android.installreferrer:installreferrer:2.2` | VERIFIED |
| Referrer query | `InstallReferrerBridge.queryPlayReferrer` | VERIFIED |
| Native persist | `NativeAnalyticsSpine.onReferrer` → prefs `referrer_json` | VERIFIED (1.4.64+) |
| Prefetch before WebView | `AmyNestApp` → `InstallReferrerBridge.prefetch` | VERIFIED (1.4.65; **not** on live 1.4.63) |
| JS inject | `evaluateJavascript` `__AMYNEST_INSTALL_REFERRER` + `amynest-install-referrer` | VERIFIED |
| JS capture | `install-attribution.ts` `capturePlayInstallReferrer` | VERIFIED |
| JS analytics | `analytics-service.ts` `trackAppOpen` | VERIFIED |
| Native Firebase AUTO | `AmyNestApp.initFirebaseAnalytics` | VERIFIED |
| JS → native Firebase | `BillingBridge.logSubscriptionAnalytics` / `logQualityAnalytics` → `FirebaseSubscriptionAnalytics` | VERIFIED (checkout/purchase/signup/quality only) |
| Internal API | `artifacts/api-server/src/routes/analytics.ts` | VERIFIED |
| Identity stitch | `analyticsIdentityStitchService.ts` | IMPLEMENTED in repo, **not production-deployed** |

### iOS (Capacitor WKWebView — `artifacts/amynest-capacitor/ios/`)

```
App Store / ASA / SKAdNetwork
  → native AppDelegate                    NO attribution capture
  → FirebaseApp.configure()               FCM only (Firebase/CoreOnly + Messaging)
  → WKWebView bundled/OTA kidschedule
  → JS install-attribution.ts             URL utm/gclid only
  → POST /api/analytics/...
  → Coolify analytics_events
```

| Boundary | File / symbol | Status |
|---|---|---|
| Apple Search Ads / AdServices | — | **NOT IMPLEMENTED** |
| SKAdNetwork capture | — | **NOT IMPLEMENTED** |
| Play-style install referrer | N/A on iOS | **NOT IMPLEMENTED** |
| Native attribution storage | — | **NOT IMPLEMENTED** |
| Native → JS attribution bridge | — | **NOT IMPLEMENTED** |
| Firebase Analytics iOS | Podfile comment: “NOT Firebase/Core” | **NOT IMPLEMENTED** |
| FCM → JS | `AmyNestFcmBridge.dispatchTokenToWebView` `evaluateJavaScript` | VERIFIED (push only) |
| Device id | JS `localStorage` `amynest:device:id:v1` | VERIFIED |
| Internal analytics | same JS + API as web/Android | VERIFIED |

---

## 3. Android attribution flow

**SDK:** Play Install Referrer `2.2` is integrated.

**Live production (1.4.63 / 106) timing:**

1. `AmyNestApp.onCreate` — Firebase AUTO `first_open` (no referrer attached).
2. `MainActivity.onCreate` — `loadUrl(https://www.amynest.in)`.
3. `webView.post { installDeferredStartupComponents() }` — **then** `InstallReferrerBridge.fetchOn`.
4. Play Referrer is async. Inject uses `evaluateJavascript` (not `JavascriptInterface`, not cookies).
5. JS waits **2500ms** for `amynest-install-referrer`, then emits `install_source` anyway.

**Answers (live 1.4.63 unless noted):**

| # | Question | Answer |
|---|---|---|
| 1 | SDK integrated? | YES — `2.2` |
| 2 | Version | `com.android.installreferrer:installreferrer:2.2` |
| 3 | Initialized before WebView? | **NO on 1.4.63**. YES prefetch on 1.4.65 (unreleased) |
| 4 | When queried? | After first frame / deferred startup |
| 5 | Query successful? | Sometimes — 2 users got `gclid` |
| 6 | Cached natively? | **NO on 1.4.63**. YES prefs on 1.4.64+ |
| 7 | Where stored? | Live: JS `localStorage` `amynest:install_attribution` only |
| 8 | How long? | Until WebView data clear / uninstall |
| 9 | Available to JS? | YES if inject wins the race or arrives <2.5s / via later event |
| 10 | Attached to first_open? | Label only (`install_source`); `gclid` was **stripped** by taxonomy |
| 11 | Attached to internal analytics? | Only if JS ingest succeeded (8 users) |
| 12 | Attached after auth? | The 2 `gclid` users are authenticated |
| 13 | Lost before WebView? | Referrer was not even queried yet on 1.4.63 |
| 14 | WebView recreation lose native cache? | Live: native cache **did not exist**. JS localStorage usually survives same-origin reload |
| 15 | App restart lose it? | JS localStorage survives. Native prefs survive on 1.4.64+ |

The “native fires JS before listener, no retry, event disappears” pattern is **partially true on 1.4.63** (`evaluateJavascript` + CustomEvent can miss), but **not total**: JS also reads `window.__AMYNEST_INSTALL_REFERRER`, waits 2.5s, and re-emits if a later event changes the fingerprint. That is why 2 users still have `gclid`.

---

## 4. iOS attribution flow

iOS does **not** implement Play Install Referrer (impossible) and also does **not** implement Apple Search Ads / AdServices / SKAdNetwork readback.

`AppDelegate` starts Facebook SDK, appearance, and `AmyNestFcmBridge` only.

`Podfile`:

```
pod 'Firebase/CoreOnly'
pod 'Firebase/Messaging'
# FCM push only — NOT Firebase/Core (pulls Analytics + Google Ads measurement).
```

JS `install-attribution.ts` on iOS: URL `utm_*` / `gclid` / `gbraid` / `wbraid` only. App Store installs do not put `gclid` on the WKWebView URL.

Window A iOS `first_open`: **1** authenticated user, `install_source` null, no `gclid`.

Campaign `23986249354` is an **Android App** campaign. iOS is out of that spend path.

---

## 5. Native → WebView bridge

**Android mechanism (actual):**

- `WebViewCompat.addDocumentStartJavaScript` — device id, app version, cached referrer (1.4.64+)
- `WebView.evaluateJavascript` — referrer global + `CustomEvent`
- `addJavascriptInterface` — billing / auth / device / push — **not** the referrer path
- No `postWebMessage` / `WebMessagePort` for attribution
- No cookies / IndexedDB for attribution

**Race on live 1.4.63:** referrer query starts after `loadUrl`. First document-start has no referrer. CustomEvent can fire before `initInstallAttributionListeners`. JS timeout then emits organic.

**1.4.65 fix:** `prefetch` in `Application.onCreate` persists referrer **without WebView**, then document-start / `fetchOn` injects the cache and still re-queries Play.

**iOS:** no attribution bridge. FCM uses the same `evaluateJavaScript` race pattern for tokens only.

---

## 6. WebView → backend analytics

| Event | JS? | Native? | Firebase AUTO? | Internal DB? | User id (Window A) |
|---|---|---|---|---|---|
| `first_open` | YES `trackAppOpen` | POST preauth on 1.4.64+ only | YES native Android AUTO | Separate JS row | 8 authenticated; 0 `device:` |
| `signup` | YES + Firebase `sign_up` via BillingBridge on Android | Native Firebase if wrapper | NO | growth / pre_signup events | authed |
| `onboarding_completed` | YES conversion funnel | quality event via BillingBridge | NO | YES if authed; preauth rejected on live API allowlist | authed |
| `first_plan_generated` | YES | quality → native Firebase | NO | YES if authed | authed |
| `speech_coach_v2_session_start` | YES | NO | NO | 0 Android rows in window | — |
| `start_trial` | Firebase name; internal `subscription_funnel_event` step `trial_started` | quality map | NO | 0 | — |
| `begin_checkout` | Firebase via BillingBridge; internal `checkout_started` | YES native Firebase | NO | 1 cancelled | authed |
| `purchase` / `upgrade_completed` | YES + native `FirebaseSubscriptionAnalytics` | YES | NO | 0 | — |

**Why 55 ≠ 8:** Firebase AUTO fires in `Application.onCreate`. Internal `first_open` waited for React `ClientTelemetryBootstrap`. Unsigned flush hit `/api/analytics/events` (401). Preauth fallback did not persist (`device:` = 0). `FIRST_OPEN_KEY` was set before ACK. The 8 are users who signed in so `/events` succeeded.

---

## 7. Identity stitching

| Layer | Android live 1.4.63 | iOS | After repo fix (undeployed) |
|---|---|---|---|
| Anonymous id | JS UUID localStorage | JS UUID localStorage | Native UUID + document-start |
| WebView id | same | same | prefers native if empty |
| Firebase app instance | SDK AUTO | **no Analytics pod** | unchanged |
| Internal user id | Firebase uid only in Window A | Firebase uid | `device:{id}` then stitch |
| Auth uid | Firebase | Firebase | stitch on `/events` |
| parent_profile / subscription | no attribution columns | same | unchanged |

A user **can** (and in Window A **did**) have Firebase AUTO `first_open` with no internal row, then later appear as an authenticated `first_open` with no `device:` ancestor. That is a **reliable linkage failure** on production.

---

## 8. Install referrer / identifier matrix

| Identifier | Native captured? | Stored? | Sent to WebView? | Sent to backend? | Persisted to user? |
|---|---|---|---|---|---|
| Play `install_referrer` string | YES (late on 1.4.63) | JS localStorage; native prefs 1.4.64+ | YES `evaluateJavascript` | `play_referrer` on `install_source` | Only if JS ingest ran |
| `gclid` | Only if inside referrer / URL | JS; schema **stripped** on live ingest | YES | Stripped from `install_source`/`first_open` on live taxonomy | 2 users on *other* events |
| `gbraid` | Same | Same | YES | Stripped on live | **0** Window A |
| `wbraid` | Same | Same | YES | Stripped on live | **0** Window A |
| Firebase campaign params | AUTO first_open only | Firebase | NO | NO | Ads 55 — not Coolify |
| Google Ads campaign ID | NOT a typed native field | 1 opaque JSON substring 26 Sep | NO typed | **0** typed `campaign_id` | NO join |
| Apple Search Ads token | **NOT IMPLEMENTED** | — | — | — | — |

These identifiers are **not interchangeable**. Ads campaign ID is not inferred from `gclid`.

---

## 9. Firebase / Ads / internal `first_open`

| System | What it actually is |
|---|---|
| Firebase `first_open` | Android SDK **automatic** event when `FirebaseAnalytics.getInstance()` runs. Not written to Coolify. |
| Ads `first_open` conversion | Google Ads import of that Firebase event (action used in prior forensic). Count **55** = campaign/account Ads all-conversions for the window. |
| Internal `analytics_events.first_open` | JS `AnalyticsService.trackAppOpen()` after SPA mount. Optional native preauth POST on 1.4.64+. |

**Independently generated.** Do not divide 8/88 as open-rate.

---

## 10. Backend API (anonymous rejection)

`POST /api/analytics/events`:

- **401** if no Firebase uid (`getAuth`)
- **400** invalid body
- 202 even if taxonomy drops events

`POST /api/analytics/preauth-events`:

- **400** `missing_device_id` unless `x-amynest-device-id` matches `^[a-zA-Z0-9_-]{8,128}$` (hyphenated UUID allowed)
- Allowlist on live production **omits** `onboarding_completed`, `first_plan_generated`, `paywall_view`, `checkout_started` (expanded in repo, not deployed)
- Window A: **zero** `device:` rows ⇒ anonymous Android users did **not** persist

---

## 11. Production DB evidence (Coolify READ-ONLY, 2 Oct 2026)

Re-queried worker → Coolify Postgres. No PII. Render not used.

Window A Android `analytics_events`: **5337** rows / **12** users / **`device:` = 0**.

`first_open` grouping:

| id_type | platform | app_version | install_source | gclid on row | events | users |
|---|---|---|---|---|---:|---:|
| authenticated | android | unknown | organic | no | 7 | 6 |
| authenticated | android | unknown | google_ads | no | 2 | 2 |
| authenticated | ios | unknown | null | no | 1 | 1 |

**Common characteristic of the 8 Android successes:** Firebase-authenticated `user_id`, `app_version=unknown`, JS ingest after login. Not a shared campaign id. Not a shared native bridge version field (version never recorded).

The 2 `google_ads` first_open rows themselves have **no** `gclid` key (taxonomy strip). `gclid` exists on other events for those same 2 users.

---

## 12. Controlled test

| Environment | Result |
|---|---|
| Physical Android device | **NOT AVAILABLE** this session |
| Android emulator + Play Referrer | **NOT RUN** — Play Referrer typically empty / `FEATURE_NOT_SUPPORTED` off Play |
| iOS device | **NOT AVAILABLE** |
| Unit (jsdom) | 18 passed: late referrer re-emit, localStorage restart, native device id, first_open ACK, 401→preauth |

Do not claim device verification. Play Install Referrer cannot be faithfully reproduced without a Play-installed build.

---

## 13. Root causes (multiple)

| Class | Finding |
|---|---|
| A. Ads configuration | **NOT** the 55→8 cause. Firebase AUTO is working. Campaign remains paused. |
| B. Play / App Store attribution | Play Referrer **can** return `gclid` (2 users). Often empty/organic. iOS ASA **NOT IMPLEMENTED**. |
| C. Native attribution capture | SDK present; on live **queried after WebView**. |
| D. Native → WebView bridge | `evaluateJavascript` race is real; not total loss (2 `gclid`). Live had **no native cache**. |
| E. WebView analytics | Internal `first_open` is JS-after-hydrate. |
| F. WebView → backend | Unsigned `/events` **401**; preauth did not land. |
| G. Identity stitching | **Missing on production**. Anonymous → auth unlink. |
| H. Firebase integration | AUTO first_open ≠ internal first_open. iOS has no Analytics pod. |
| I. Database ingestion | Extra props stripped; `gclid` dropped from `install_source`/`first_open` on live taxonomy. |
| J. Release / build | Live **1.4.63 / 106**. Fixes are **1.4.64–1.4.65** + undeployed web/API. |

---

## 14. Fixes (minimum, in repo)

Already in tree from the analytics-spine work, plus this attribution prefetch:

1. Native preauth `first_open` without SPA (`NativeAnalyticsSpine`).
2. Native device id at document-start.
3. Referrer persisted in SharedPreferences; **prefetch before WebView** (`InstallReferrerBridge.prefetch`).
4. JS unsigned flush uses preauth; `first_open` ACK after 202.
5. Server stitch `device:` → uid; `first_open` dedupe.
6. Taxonomy keeps `gclid` / `gbraid` / `wbraid` / `campaign_id`.
7. Preauth allowlist includes conversion spine (not purchases).

No PII. No fake historical rows. No Ads conversion-config changes. No iOS ASA added (not this campaign’s failure mode).

---

## 15. Tests

| Case | Kind | Result |
|---|---|---|
| Play referrer parse / `gclid` / `campaign_id` | unit | passed |
| Late referrer after organic emit | unit | passed |
| Attribution survives simulated WebView restart | unit | passed |
| Native device id / app version | unit | passed |
| Anonymous first_open / 401 fallback / ACK | unit | passed |
| Preauth allowlist / stitch / dedupe | API unit + DB integration | unit passed; DB tests skip without local DB |
| Emulator / physical | — | **not run** |
| iOS native attribution | — | **N/A — not implemented** |

---

## 16. Release verification

| Artifact | Status |
|---|---|
| Android `1.4.65` / `108` | `android/releases/amynest-1.4.65-108.aab` built for internal testing only |
| iOS IPA | **no native attribution code change** — no iOS release required for this Ads incident |
| Play production rollout | **NO** |
| Web / API production deploy | **NO** without explicit approval |

Live users still run **1.4.63**. Repo fixes do not change Window A history.

---

## 17. Remaining unknowns

- GA4 unique `first_open` (OAuth stopped).
- Whether Play returned an empty referrer for most of the 55 vs JS never ingesting.
- Exact Play Referrer response codes in the field (no device logs).
- Whether Cloudflare/WAF ever blocked `/preauth-events` (code allows it; Window A has zero rows).

---

## 18. Ads restart readiness

**NOT READY.**

Campaign `23986249354` must stay **PAUSED**. Do not change India / USA / Canada / UK, budget, bidding, conversions, or creatives.

Restart only after internal testers on **1.4.65** + deployed API/web show:

- `device:` `first_open` before login
- referrer/`gclid` persisted when Play provides it
- stitch after signup
- checkout / purchase on the internal spine

---

## Android vs iOS scorecard

| Layer | Android | iOS |
|---|---|---|
| Attribution source | Play Install Referrer | App Store / ASA — **NOT IMPLEMENTED** |
| Native capture | VERIFIED (late on live; prefetch in 1.4.65) | **NOT IMPLEMENTED** |
| Identifier | referrer string / `gclid` | URL params only |
| Storage | JS localStorage; native prefs 1.4.64+ | JS localStorage only |
| WebView bridge | `evaluateJavascript` + document-start | **NOT IMPLEMENTED** for attribution |
| JS access | VERIFIED | URL only |
| Backend forwarding | VERIFIED (auth-gated on live) | VERIFIED (same JS API) |
| Identity stitching | BROKEN on live; IMPLEMENTED in repo | same JS/API gap |
| Purchase attribution | Native Firebase via BillingBridge | RevenueCat Capacitor; no campaign join |
| Firebase AUTO first_open | VERIFIED | **NOT IMPLEMENTED** (CoreOnly) |

---

## Final status

```
WEBVIEW ATTRIBUTION:
FIX IMPLEMENTED — PRODUCTION VERIFICATION PENDING

ADS CAMPAIGN 23986249354:
PAUSED
```
