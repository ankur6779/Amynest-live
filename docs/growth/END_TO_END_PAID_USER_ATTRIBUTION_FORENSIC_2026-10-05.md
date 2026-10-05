# End-to-end paid user attribution forensic — 5 Oct 2026

**Executive status:** `ROOT CAUSE IDENTIFIED`

```
ADS CAMPAIGN 23986249354: PAUSED
ADS GEO / BUDGET / BIDDING / CREATIVES / CONVERSIONS: UNCHANGED
WEB/API PRODUCTION DEPLOY: NO
PLAY PRODUCTION ROLLOUT: NO
HISTORICAL BACKFILL: NONE
FAKE GCLID / SYNTHETIC ANALYTICS: NONE
ADS RESUME: DO NOT RESUME
```

This is not a first_open ticket. The business question is:

> Which Google Ads campaign acquired this user, and can we follow that exact user to a real paying subscription?

**Answer from production evidence: NO.**

---

## 1. Executive diagnosis

Three independent identity/revenue planes exist and do not join.

| Plane | What it knows | What it cannot answer |
|---|---|---|
| Google Ads + Firebase AUTO | Play installs, native `first_open`, native `purchase` if the SDK fires | Coolify user, `device:{id}`, RevenueCat customer, rupee revenue |
| Coolify `analytics_events` | Authenticated product events after SPA hydrate | Pre-auth device rows (0 all-time). `gclid` on `install_source`/`first_open` (0). `purchase_success` / `upgrade_completed` (0 all-time) |
| RevenueCat + `subscriptions` | Store entitlement keyed by Firebase UID **after** `logIn` | Campaign / `gclid`. Android customers created as `$RCAnonymousID` at boot |

**Production proof (Coolify READ-ONLY, 5 Oct 2026 05:14–05:16 UTC):**

| Fact | Evidence |
|---|---|
| `user_id LIKE 'device:%'` | **0 events, 0 devices, all-time** |
| `app_version = 1.4.65` | **0** |
| `install_source` rows with `gclid` | **0** (40 rows labeled `google_ads`) |
| `first_open` rows with `gclid` | **0** |
| `purchase_success` + `upgrade_completed` | **0 all-time** |
| `subscription_funnel_event` step `purchase_success` | **0 all-time** |
| Real paying store rows | **1 Play + 1 App Store + 1 manual** |
| Those 3 payers have `gclid` | **NO** |
| Those 3 payers have a purchase analytics event | **NO** |
| Play payer RC id = Firebase uid | **YES** (`eq_uid`) |
| Live SPA `shouldEmitFirstOpen` | Sets `localStorage` **before** ACK |
| RevenueCat Android customers | Large `$RCAnonymousID` population (sampled 30/40 latest after first page) |
| Ads campaign | **PAUSED**, budget ₹400, last 30d: 2,516 clicks / ₹6,460 / 98 conversions / **conversions_value = 0** |

Root causes (all `ROOT CAUSE IDENTIFIED`):

1. **Internal first_open required authenticated JS ingest.** Live production never persisted `device:` rows. Firebase AUTO `first_open` is a different event.
2. **Live taxonomy stripped `gclid`/`gbraid`/`wbraid`/`campaign_id` from `first_open` and `install_source`.** 40 `google_ads` install_source rows have label only.
3. **`upgrade_completed` and `subscription_funnel_event` still strip purchase identity** (repo now keeps them; live API does not). Even then, **zero** purchase events exist in Coolify.
4. **Android RevenueCat configures with no `appUserID`.** Production RC customer list is dominated by `$RCAnonymousID` Android installs. Purchase can land on anonymous customer B if `logIn(Firebase A)` races.
5. **`subscriptions` has no acquisition columns.** Join is `user_id` only. No server-side Ads offline conversion upload.
6. **Play Install Referrer on live 1.4.63 is queried after WebView `loadUrl`.** Native persist/prefetch exists only in unreleased 1.4.65.

`first_open` passing would not close this. The paid-user chain is still broken.

---

## 2. Current architecture

```
Google Ads 23986249354 (PAUSED)
  → Play install
  → Play Install Referrer API 2.2
  → android/ WebView wrapper (NOT Capacitor)
       AmyNestApp.onCreate
         FirebaseAnalytics.getInstance()     → Ads AUTO first_open
         Purchases.configure(no appUserID)   → $RCAnonymousID  (1.4.65 AAB)
         NativeAnalyticsSpine.bootstrap()    → preauth first_open (1.4.65 only)
         InstallReferrerBridge.prefetch()    → native prefs (1.4.65 only)
       MainActivity WebView https://www.amynest.in
         document-start device id / cached referrer (1.4.65 only)
         kidschedule JS analytics
  → POST /api/analytics/preauth-events | /events
  → Coolify analytics_events
  → login → (repo) stitch device: → Firebase uid
  → BillingBridge Purchases.logIn(Firebase uid) when JS billing ready
  → Play Billing → RevenueCat → webhook / rc-sync → subscriptions
  → native Firebase purchase → Google Ads import
```

| Hop | Source → dest | Identifier | Persist | Timing | Auth | Retry | Dedupe | Failure |
|---|---|---|---|---|---|---|---|---|
| Ads click | Ads → Play | `gclid` / `gbraid` / `wbraid` / campaign | Play referrer | Click + install | No | Play | Store | Organic sideload: empty |
| Referrer | Play → native | raw referrer | **Live 1.4.63: JS only.** Repo: `amynest_analytics/referrer_json` | **Live: after loadUrl.** Repo: `Application.onCreate` | No | Re-query | fingerprint | Empty → `unknown` |
| Native device | UUID | `device_id` prefs | Until uninstall | Bootstrap | No | n/a | n/a | New id on reinstall |
| Native first_open | Native → preauth | `device:{id}` | ACK then `first_open_sent` | Before WebView (1.4.65) | No | Next launch | flag | Live Play never sends this |
| JS first_open | SPA → API | same | **Live: localStorage before POST** | After hydrate | Effectively yes on live | queue | localStorage | Unsigned 401 historically |
| Stitch | API UPDATE | `device:` → uid | physical rewrite | First authed `/events` | Yes | logged | n/a | **Not on live API** |
| RC | SDK | `$RCAnonymousID` then uid | RC cloud + `subscriptions` | Configure at boot; `logIn` after JS | Purchase gated | alias | txn | Anonymous persists if no login |
| Purchase | Play → RC → webhook | uid + txn | `subscriptions` | After `logIn` intended | Yes | rc-sync | event_id | No acquisition on row |
| Ads purchase | Native FA | Firebase userId | Firebase / Ads | Native purchase | Best-effort | txn prefs | **conversions_value = 0** |

**No schema migration required.** `analytics_events.props` is JSONB. `subscriptions` has no campaign columns by design.

---

## 3. Identity graph

| Identifier | Created | Stored | Reload | Restart | Login | Logout | Reinstall | Backend | Join to revenue |
|---|---|---|---|---|---|---|---|---|---|
| `gclid` / `gbraid` / `wbraid` / `campaign_id` | Play referrer / URL | JS `amynest:install_attribution`; native prefs (1.4.65) | Keep | Keep | Keep | Keep | Lost unless Play still returns | Intended on `install_source` / funnel. **Live strips on first_open/install_source** | **NO in production** |
| Play referrer string | Install Referrer API | native + JS | Keep after capture | Keep | Keep | Keep | New query | `install_source.play_referrer` | Indirect |
| Native device UUID | `NativeAnalyticsSpine` | SharedPreferences | Keep | Keep | Keep | Keep | **New** | `x-amynest-device-id` | After stitch only |
| `device:{id}` | preauth ingest | `analytics_events.user_id` | n/a | n/a | Stitched in repo | n/a | New | Yes | **0 rows live** |
| JS localStorage device | `amynest:device:id:v1` | localStorage | Keep | Keep | Keep | Keep | Lost | Header | If same device |
| Firebase UID | Firebase Auth | SDK + session | Keep | Keep | Is login | Cleared | Same account = same | Authed events, billing | **Canonical** |
| AmyNest user id | Same as Firebase for billing | `subscriptions.user_id` | Keep | Keep | Keep | — | Same | Yes | Yes |
| RC `app_user_id` | Anonymous at configure; uid at `logIn` | RC + `subscriptions.revenuecat_app_user_id` | SDK | **Anonymous again unless persisted** | `logIn` | New anonymous | New anonymous | Webhook | Yes **if** `logIn` won |
| Play token / orderId | Play / RC | webhook + `latest_transaction_id` | Keep | Keep | Keep | Keep (store) | Restore | Yes | Yes, not to Ads |
| Ads click (Ads UI) | Ads | Google Ads only | n/a | n/a | n/a | n/a | n/a | **No offline upload in repo** | Firebase import only |

**Canonical join strategy (required, not live):**

```
Play referrer click ids
  → same native device UUID
  → analytics_events.user_id = device:{uuid}
  → stitch UPDATE to Firebase uid
  → RevenueCat.app_user_id = same Firebase uid BEFORE purchase
  → subscriptions.user_id = same Firebase uid
  → purchase analytics keep gclid + transaction_id
```

Physical rewrite of `analytics_events.user_id` is the analytics join. There is **no** acquisition column on `subscriptions`. Do not backfill history.

**Phase 6 defect is real:** Ads-attributed Android device → Firebase A → RC anonymous B → purchase under C **can happen**. Production RC list is full of Android `$RCAnonymousID` (examples last seen on 1.4.55 / 1.4.59). The one Play payer escaped because `logIn` succeeded (`rc_id_shape=eq_uid`). Hundreds of Android customers did not alias.

---

## 4. Event graph

| Event | Native | JS | Preauth (repo) | Live preauth | Firebase | Coolify | Ads action | RC | Identity | Production 30d |
|---|---|---|---|---|---|---|---|---|---|---|
| `first_open` | 1.4.65 POST | Yes | Yes | Exists but JS sets flag first | AUTO separate | Yes after auth | `7665026078` secondary | No | Live: Firebase uid only | 35 events, 0 gclid, 0 device |
| `signup` | No | `signup_completed` / FA `sign_up` | Partial | Partial | Native if bridge | No canonical `signup` | FA | No | uid | — |
| `onboarding_completed` | No | Yes | Yes | Rejected historically | Quality | Yes | FA quality | No | uid | 12 / 2 gclid |
| `first_plan_generated` | No | Yes | Yes | Rejected historically | Quality | Yes | FA | No | uid | 46 / 4 gclid |
| `speech_coach_v2_session_start` | No | Yes | Yes | Rejected historically | Quality | Yes | FA | No | uid | 2 / 0 gclid |
| `start_trial` | No | Funnel | No | Auth | FA `start_trial` | Funnel step | FA | No | uid | 9 `trial_started` |
| `paywall` | No | `paywall_view` | Yes | Rejected historically | No on open | Yes | No | No | uid | 26 / 1 gclid |
| `begin_checkout` | Native FA | Android CTA often skipped | `checkout_started` | Rejected historically | Native | `checkout_started` | `7665026090` | No | uid | 10 checkout / 14 funnel |
| `purchase` | Native FA | Coordinator | No (correct) | No | Native `purchase` + convert | **0 events** | `7665026069` primary | Yes | intended uid | **0** |
| `upgrade_completed` | No | Fan-out | No (correct) | No | Via purchase | **0 all-time** | Via purchase | No | uid | **0** |

Drops `ROOT CAUSE IDENTIFIED`:

- Emitted but never backend: unsigned conversion-spine on live; native first_open not on Play 1.4.63.
- Backend without identity: not observed (`device:` = 0).
- Firebase but not backend: AUTO `first_open` (Ads 55 in Window A vs 8 internal).
- Backend without attribution: 40 `google_ads` install_source, 0 gclid.
- Purchase not joinable to acquisition: both Coolify payers have `first_open` + `install_source` and **no click id** and **no purchase event**.

---

## 5. Attribution graph

```
Ads click
  → Play referrer (utm_source=google-play / gclid sometimes)
  → live 1.4.63: query AFTER WebView; store in JS localStorage only
  → JS install_source
  → live API taxonomy STRIPS gclid
  → analytics_events.install_source source=google_ads, gclid=null
  → later events may keep gclid if funnel schema allows (4 first_plan, 2 onboarding, 1 paywall, 3 users all-time)
  → subscriptions: no campaign fields
  → Ads conversions: Firebase import, conversions_value=0
```

Repo 1.4.65: prefetch in `Application.onCreate`, persist `referrer_json`, inject at document-start, native `install_source` POST with parsed click ids. **Not on Play. Not on any tester (adb empty).**

Organic internal AAB: **NOT TESTABLE IN INTERNAL ORGANIC INSTALL**. No fake click ids created.

---

## 6. Subscription / revenue graph

```
Play Billing
  → BillingBridge.purchaseWith
  → RevenueCat customer at purchase-time app_user_id
  → POST /subscription/webhook + /subscription/rc-sync
  → subscriptions (user_id, revenuecat_app_user_id, latest_transaction_id, store)
  → billing_audit_events / revenuecat_webhook_events
  → client recordVerifiedStorePurchase
       intended: purchase_success + upgrade_completed + funnel
       live Coolify: ZERO of those events all-time
  → native Firebase purchase → Ads
```

RevenueCat project `proj9c1919f0` / last 28d: 3 active subscriptions, $5 MRR, $4 revenue, 187 new customers, 304 active users.

Coolify real paid (5 Oct 2026):

| Provider | Store | RC id | Orig id | Txn | install_source | first_open | gclid | purchase event |
|---|---|---|---|---|---|---|---|---|
| revenuecat | play_store | eq_uid | orig_eq | YES | YES | YES | **NO** | **NO** |
| revenuecat | app_store | eq_uid | orig_eq | YES | YES | YES | **NO** | **NO** |
| manual | null | null | null | NO | YES | YES | **NO** | **NO** |

Growth dashboard joins campaign → “subscriptions” via `analytics_events` `upgrade_completed` / funnel `purchase_success`. Both are **empty**. Revenue column is hardcoded null.

**There is no SQL path from Play rupees to campaign `23986249354`.**

---

## 7. Every known failure point

| # | Failure | Status | Lost |
|---|---|---|---|
| F1 | Live JS marks first_open before ACK | `VERIFIED` (live chunk `analytics-service-QCLKmxf8.js`) | Internal first_open if POST fails |
| F2 | Unsigned `/events` 401; preauth never persisted | `VERIFIED` (`device:` = 0 all-time) | Entire pre-login funnel |
| F3 | Live taxonomy strips click ids on first_open/install_source | `VERIFIED` (40 google_ads, 0 gclid) | Campaign join |
| F4 | Referrer after loadUrl on 1.4.63 | `VERIFIED` | Race vs 2.5s JS timeout |
| F5 | Native first_open not on Play | `VERIFIED` | Pre-login first_open |
| F6 | Stitch not deployed | `VERIFIED` | device → uid |
| F7 | RC anonymous at Android configure | `VERIFIED` (RC customer list) | Purchase under wrong customer |
| F8 | RC `logIn` waits for JS billing | `VERIFIED` (AuthBridge does not set RC id) | First-session anonymous |
| F9 | `upgrade_completed` / funnel strip txn + gclid | `ROOT CAUSE IDENTIFIED` (live schema) | Purchase identity in Coolify |
| F10 | Zero purchase analytics events all-time | `VERIFIED` | Acquisition → revenue in Postgres |
| F11 | `subscriptions` acquisition-blind | `VERIFIED` | Campaign on entitlement |
| F12 | No Ads offline conversion upload | `VERIFIED` | Server-side purchase→Ads |
| F13 | WebView localStorage clear | `PARTIALLY VERIFIED` (code) | JS attribution / queue |
| F14 | DOCUMENT_START unsupported | `NOT VERIFIED` on device | Native inject |
| F15 | Process death before ACK | `FIX IMPLEMENTED` in repo native; `NOT VERIFIED` on device | first_open until retry |
| F16 | Organic sideload has no Ads referrer | `VERIFIED` | Click ids |

---

## 8. Root causes

1. Internal measurement was **post-login JS**, not install-time native. Firebase AUTO hid the gap.
2. Zod taxonomy **dropped unknown keys**, including Ads click ids, on the events used for acquisition.
3. Android RC **boots anonymous** and only aliases when the WebView billing hook runs.
4. Purchase truth lives in **RevenueCat / `subscriptions`**, while Ads and the growth dashboard look at **different events that never land**.
5. No durable **campaign_id on the subscription row** and no offline Ads upload.

These are architectural, not a single missed `first_open`.

---

## 9. Fixes already implemented (repo, not production)

| Fix | Status | In 1.4.65-108 AAB? | On www.amynest.in / Coolify? |
|---|---|---|---|
| Native preauth first_open + ACK flag after 2xx | `FIX IMPLEMENTED` | YES | NO (needs that AAB + live API) |
| Referrer prefetch + native prefs | `FIX IMPLEMENTED` | YES | NO |
| Document-start device id | `FIX IMPLEMENTED` | YES | NO |
| JS ACK after successful flush | `FIX IMPLEMENTED` | n/a | **NO — live opposite** |
| Expanded preauth allowlist | `FIX IMPLEMENTED` | n/a | NO |
| `device:` → uid stitch | `FIX IMPLEMENTED` | n/a | NO |
| first_open / install_source keep gclid | `FIX IMPLEMENTED` | n/a | NO |
| first_open server dedupe | `FIX IMPLEMENTED` | n/a | NO |
| Purchase events keep gclid + transaction_id | `FIX IMPLEMENTED` (this session) | n/a | NO |
| RC persist last Firebase uid + configure with it | `FIX IMPLEMENTED` (this session) | **NO — after AAB build** | NO |
| Native first_open attach cached referrer | `FIX IMPLEMENTED` (this session) | **NO — after AAB build** | NO |

No historical backfill. No fake production events.

---

## 10. Fixes still required

| Fix | Why | Status |
|---|---|---|
| Deploy **only** analytics Web/API (taxonomy + preauth + stitch + ACK) | Live SPA/API still old | `BLOCKED` — uncommitted mixed tree; no device to prove |
| Ship Android build that includes RC persist (not 1.4.65-108) | 1.4.65 still configures RC anonymous on first launch | `BLOCKED` |
| Sideload fresh install, no login, Coolify proof | adb devices empty | `BLOCKED` |
| Controlled Ads install (campaign still paused) | Organic AAB cannot produce gclid | `BLOCKED` |
| Controlled Play purchase after that install | Cannot fake | `BLOCKED` |
| Persist acquisition onto `subscriptions` **or** reliable `user_id` join via `purchase_success` | Today both missing | `NOT VERIFIED` |
| Server-side Ads conversion upload (optional, after join works) | Firebase value = 0 | `NOT VERIFIED` |
| iOS AdServices / ASA / FA pod | Separate platform | `NOT VERIFIED` — do not mix |

---

## 11. Production deployment status

| Item | Value |
|---|---|
| Git HEAD | `127e862b8` |
| Analytics / RC / taxonomy changes | **Uncommitted** on `main` |
| Live SPA | `https://www.amynest.in/assets/analytics-service-QCLKmxf8.js` — `shouldEmitFirstOpen` does `localStorage.setItem` then returns true. No `markFirstOpenDelivered`, no `__AMYNEST_NATIVE_DEVICE_ID` |
| Live API stitch / new taxonomy | **NOT present** (Coolify still 0 `device:`, 0 gclid on install_source) |
| Schema migration | None required |
| Deploy executed this session | **NO** |

Deploy was not run. Pushing a dirty `main` (sale-listing tree + unverified API stitch) is not a minimum analytics deploy. Live assets were checked; they do not contain the fix.

---

## 12. Internal Android test evidence

| Item | Result |
|---|---|
| AAB | `android/releases/amynest-1.4.65-108.aab` (33,210,641 bytes, 5 Oct 2026 10:28 IST) |
| Play upload | NO |
| `adb devices` | empty |
| Fresh uninstall / install | **NOT RUN** |
| first_open before login | `NOT VERIFIED` |
| `device:{id}` | `NOT VERIFIED` |
| `app_version=1.4.65` | `NOT VERIFIED` (Coolify 0) |
| Login stitch | `NOT VERIFIED` |
| Reload / restart | `NOT VERIFIED` |

---

## 13. Ads attribution evidence

| Item | Result |
|---|---|
| Campaign | `23986249354` **PAUSED** (Ads API 5 Oct 2026, customer `6395859996`) |
| Budget | ₹400 **unchanged** |
| Last 30d | 55,428 impr / 2,516 clicks / ₹6,460.23 / 98 conversions / **value 0** |
| Real Ads referrer on tester | **NOT TESTABLE IN INTERNAL ORGANIC INSTALL** |
| Fake gclid | NONE |
| Resume | **DO NOT RESUME** |

98 Ads conversions with value 0 is consistent with Firebase install/`first_open` import, not rupee purchases.

---

## 14. Purchase / revenue evidence

| System | Evidence |
|---|---|
| Google Play / RC | 1 live `play_store` ACTIVE row; txn present; RC id = Firebase uid |
| AmyNest `subscriptions` | No `gclid` / `campaign_id` columns |
| `analytics_events` purchase | **0** `purchase_success`, **0** `upgrade_completed`, **0** funnel `purchase_success` all-time |
| Ads purchase conversion value | **0** last 30d |
| Join Ads campaign → this Play payer | **NO** |

The Play payer is identified. That payer is **not** Ads-attributed in Coolify.

---

## 15. Exact remaining blockers

1. No Android device attached — cannot sideload 1.4.65-108.
2. Web/API fix not deployed; live JS still ACKs first_open locally first.
3. 1.4.65-108 does **not** include RC persist-at-configure (added after that AAB).
4. Organic install cannot prove Ads click ids.
5. Campaign must stay paused until a **separate approved** controlled Ads + purchase test.
6. Coolify has no purchase analytics events to join even for existing payers.
7. iOS attribution stack is unimplemented; not part of this Android incident.

---

## 16. Final Ads resume gate

| Gate | Status |
|---|---|
| production Web/API fix deployed | **NO** |
| fresh Android first_open before login | **NO** |
| device identity before login | **NO** |
| ACK-safe delivery | **NO** on live SPA |
| device → Firebase UID stitching | **NO** on live API |
| attribution persistence | **NO** in production (`gclid` stripped) |
| WebView reload safety | **NOT VERIFIED** |
| authenticated event continuity | `PARTIALLY VERIFIED` (authed events exist) |
| RevenueCat identity continuity | `PARTIALLY VERIFIED` (1 Play payer eq_uid; mass Android anonymous) |
| purchase identity continuity | **NO** (0 purchase analytics events) |
| acquisition → revenue join possible | **NO** |
| controlled real Ads attribution verified | **NO** |
| controlled real purchase verified | **NO** |

**DO NOT recommend Ads resume.**

```
ROOT CAUSE IDENTIFIED
PRODUCTION VERIFIED: NO
ADS CAMPAIGN 23986249354: PAUSED
```

---

## iOS (separate, not production-verified)

| Layer | Status |
|---|---|
| Play Install Referrer | N/A |
| AdServices / ASA / SKAdNetwork | **NOT IMPLEMENTED** |
| Firebase Analytics pod | **NOT IMPLEMENTED** (`CoreOnly` + Messaging) |
| Native preauth first_open | **NOT IMPLEMENTED** |
| RC configure with `appUserID` | Stronger than Android (`native-billing-ios.ts`) |
| One App Store payer in Coolify | `eq_uid`, no gclid, no purchase event |

Do not treat Android repo fixes as iOS verification. No iOS release.

---

## Tests this session

| Suite | Result |
|---|---|
| taxonomy (incl. purchase gclid/txn persist) | 11 passed |
| preauth allowlist | 3 passed |
| kidschedule ACK / device id / attribution | 18 passed |
| API route DB integration | SKIPPED (no local integration DB) |
| Device / emulator | NOT RUN |

---

## Next sequence (do not skip)

1. Isolated commit of **only** analytics Web/API files → deploy → confirm live JS no longer sets first_open before ACK.
2. New internal AAB that includes RC persist (1.4.65-108 is insufficient for RC identity).
3. Fresh device install, **no login**, Coolify `device:` + `first_open` + `app_version`.
4. Then login → stitch proof.
5. Written approval for a **paused-budget controlled Ads** experiment.
6. One real Ads install + one real Play purchase.
7. Only then consider campaign 23986249354.

Until step 6 has production rows, keep Ads paused.
