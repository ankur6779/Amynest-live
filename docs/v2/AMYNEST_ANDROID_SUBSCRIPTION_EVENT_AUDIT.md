# AmyNest Android / Google Play Subscription Funnel — Event Instrumentation Audit

**Status:** AUDIT ONLY. No production code, products, entitlements, pricing, checkout, Firebase/GA4 contracts, Google Ads configuration, or subscription logic was changed.

**Date:** 2026-08-18  
**Production candidate referenced:** `5bb33cc0` (repo state inspected; not deployed/verified by this audit).  
**Shipped Android app:** WebView wrapper `android/` (Play version **1.4.56**, billing bridge **2.5.2**) loading **https://www.amynest.in** with native bridges.  
**Shared web layer:** `artifacts/kidschedule/src/` (same subscription analytics as iOS Capacitor).

**Evidence standard:** an event is **not** “working” because it exists in source. This audit did **not** query production Firebase, GA4, Google Ads, RevenueCat, or Play Console. **Nothing is production-proven (class C) unless explicitly stated as unknown.**

---

## Founder verdict (read this first)

**Android is materially ahead of iOS for Google Play acquisition** — native Firebase Analytics, Play Install Referrer, and real Play Store prices on the native purchase path exist in code.

**It is still not safe to treat subscription conversion as production-proven or Google-Ads-trustworthy.**

Critical blockers for a conversion-instrumented ₹4,000 test:

1. **`begin_checkout` is still dirty** — fires on paywall open (JS), not only real checkout.
2. **Duplicate native `purchase` + `app_store_subscription_convert`** on the default Play checkout path (BillingBridge + JS `purchase_success`).
3. **No production proof** that Firebase → Google Ads receives clean purchase signals.
4. **Purchase events lack Google Play transaction / order id** in analytics — cannot reconcile one Play charge to one Firebase event.
5. **`gbraid` / `wbraid` not captured** anywhere in code.

**Ads readiness verdict (section 15): C — NOT READY FOR PAID ACQUISITION** when the goal is subscription-conversion-instrumented spend. Android may support a **manual-reconciliation** controlled test (first-party DB + RevenueCat) only if Google Ads is **not** optimized on `begin_checkout` / `purchase` until P0 fixes land.

---

## Classification legend

| Code | Meaning |
|------|---------|
| **A** | CODE-WIRED |
| **B** | TEST-VERIFIED (unit/jsdom; not Play sandbox E2E) |
| **C** | PRODUCTION-VERIFIED — **none claimed in this audit** |
| **D** | MISSING / NOT AVAILABLE |
| **E** | DUPLICATED |
| **F** | DIRTY / SEMANTICALLY WRONG |
| **G** | UNKNOWN (requires Firebase / Google Ads / Play Console live verification) |

---

# 1. Android platform inventory

## 1.1 Actual architecture

```
Google Ads / UTM / Play listing
  → Play Store install
  → InstallReferrerBridge (native) → window.__AMYNEST_INSTALL_REFERRER
  → install-attribution.ts → localStorage + install_source (first-party + GA4 if configured)

First open
  → Firebase Android SDK auto-collects first_open / session (native, automatic)  [G: linked to Ads?]
  → JS AnalyticsService.trackAppOpen() → first_open / app_open / session_start → analytics_events
  → startup-funnel: app_install_first_open, app_open, webview_created, …

Auth
  → AuthBridge (Google / Facebook native) → Firebase Auth in WebView
  → trackStartupFunnel auth_started / auth_finished
  → setFirebaseAnalyticsUserId(uid) + RC logIn via BillingBridge.setUserId

Activation / value
  → Same kidschedule onboarding + growth events as iOS (first-party)

Paywall (default)
  → Custom React paywall (FF_NATIVE_RC_PAYWALL=false by default)
  → Optional: RevenueCat PaywallActivity when VITE_FF_SUB_NATIVE_RC_PAYWALL=true

Checkout (default custom paywall)
  → trackSubscriptionEvent checkout_started
  → trackFirebaseBeginCheckout → native FA begin_checkout (catalog price, plan key as productId)
  → nativeBilling.purchase(plan)
  → BillingBridge.purchase → native FA begin_checkout AGAIN (real Play SKU + price)
  → Play Billing sheet (via RevenueCat purchaseWith)
  → onSuccess: native FA purchase + app_store_subscription_convert (real SKU + price)
  → JS finalizeNativePurchase → trackSubscriptionEvent purchase_success
  → trackFirebaseSubscriptionPurchase → native FA purchase + convert AGAIN (catalog price, plan key)

Entitlement / subscription state
  → RC webhook → AmyNest DB (same as iOS)
  → finalizeNativePurchase polls /api/subscription
  → No Purchases.addCustomerInfoUpdateListener on web or native
```

## 1.2 Component map

| Concern | Location | Notes |
|---------|----------|--------|
| Android shell | `android/app/src/main/kotlin/com/amynest/app/` | WebView loads production site |
| User-agent contract | `AmyNestAndroid/1.0` | Detected by `device-lite.ts`, `native-billing.ts` |
| Play Install Referrer | `InstallReferrerBridge.kt` | Injects referrer string + timestamps |
| Attribution persistence | `install-attribution.ts` | localStorage; Android waits 2.5s for referrer |
| Native Firebase Analytics | `AmyNestApp.kt`, `FirebaseSubscriptionAnalytics.kt` | Collection enabled at app start |
| Google Ads subscription events | `FirebaseSubscriptionAnalytics.kt` | `begin_checkout`, `purchase`, `app_store_subscription_convert`, `sign_up` |
| Play Billing / RC | `BillingBridge.kt`, `AmyNestApp.kt` | RC SDK 8.20.0, `goog_…` public key |
| Web ↔ native billing | `native-billing.ts`, `use-native-billing.ts` | `window.AmyNestBillingNative` |
| JS Firebase fallback | `firebase-subscription-attribution.ts` | Used when not Android wrapper or native bridge fails |
| First-party funnel | `subscription-analytics.ts` | Same canonical names as iOS |
| RC webhooks / DB | `artifacts/api-server/src/routes/subscription.ts` | Same supported types as Apple audit |
| GA4 marketing | `ga4-analytics.ts`, `Ga4Bootstrap` in `AppCore.tsx` | gtag when `VITE_GA4_MEASUREMENT_ID` set in **web build** |
| Deep links | `apple-app-site-association` + in-app routes | Referral `/referral/*`, routine links; not ad gclid delivery |

## 1.3 Identity mapping

| System | Identifier | When set |
|--------|------------|----------|
| Firebase Analytics | `setUserId(firebaseUid)` | `setFirebaseAnalyticsUserId` on auth; `BillingBridge.setUserId` / `setAnalyticsUserId`; before native purchase logging |
| RevenueCat | `appUserID` = AmyNest user id | `BillingBridge.setUserId` → `Purchases.logIn` after `/api/subscription/rc-config` |
| First-party analytics | `user_id` from auth token | After sign-in ingest |
| Pre-auth | `device:{deviceId}` | `first_open`, `install_source` via preauth rules |
| Play Install Referrer | Raw referrer string + parsed gclid/UTM | localStorage only; **not** attached to Firebase purchase params |

## 1.4 What is NOT in the Android shell

- No explicit `gbraid` / `wbraid` parsing (grep: zero matches in repo).
- No Google Play purchase **order id / token** forwarded to Firebase or first-party analytics.
- No native logging of paywall view (only JS).
- No RC customer-info update listener for renewals/cancellations on device.
- No server-side emission of Firebase events from webhooks.

---

# 2. Complete Android funnel (observability)

| Step | Observable today? | Primary system | Class |
|------|-------------------|----------------|-------|
| Ad click | Partial | Play referrer may contain gclid/UTM | A / G |
| Play Store listing | No client event | — | D |
| Install | Partial | Play Console (delayed); Firebase auto first_open | G |
| First open | Yes (dual) | Firebase auto + JS `first_open` | A |
| Attribution | Partial | `install_source` + localStorage | A |
| Onboarding | Yes | first-party | A |
| Activation / first value | Partial | `first_routine_*`; **no** `first_amy_chat` emitter | A / D |
| Paywall viewed | Yes | `paywall_opened` (+ aliases) | A / E |
| Checkout initiated | Yes (over-reported) | `checkout_started` + native `begin_checkout` | A / E / F |
| Play purchase sheet | Implicit | No dedicated event | D |
| Purchase success | Yes (over-reported) | Native FA + first-party + webhook | A / E |
| RC purchase | Yes | RC dashboard + webhook | A |
| Entitlement active | Yes (state) | DB / API; no named client event | A / D |
| Subscription conversion | Dirty | Multiple aliases + double native FA | E / F |
| Renewal / cancel / expire / billing | Server only | RC webhook → DB | A (DB); D (FA/GA4) |
| Restore | Partial | `restore_purchase` tap only | A / D |
| Refund / revoke | Partial | Play Console; webhook **ignores** unknown types incl. refund | D |

---

# 3. Event matrix

Persisted subscription steps use `subscription_funnel_event` with `props.step = <name>` unless noted.

| Funnel step | Event | Source | Firebase | GA4 | Google Ads | RevenueCat | Play Console | Prod? | Class |
|-------------|-------|--------|----------|-----|------------|------------|--------------|-------|-------|
| Install | Firebase `first_open` (automatic) | Firebase SDK | Yes | Via linked property | If linked | No | Installs metric | G | G |
| Install (first-party) | `install_source` | `install-attribution.ts` | No | If GA4 ID in web build | No | No | No | No | A |
| First open | `first_open` | `AnalyticsService.trackAppOpen` | No explicit native log | Possible via growth | No | No | No | No | A |
| Session | `app_open`, `session_start` | same | Auto + JS | Partial | No | No | No | No | A |
| Cold start | `app_install_first_open` | startup-funnel | No | No | No | No | No | No | A |
| WebView boot | `webview_created`, `webview_page_*` | MainActivity inject | No | No | No | No | No | No | A |
| Campaign / gclid | fields on `install_source` | parseReferrerQuery / URL | No | `install_source` event | Indirect via Firebase install | No | No | No | A |
| gbraid | — | — | No | No | No | No | No | No | D |
| wbraid | — | — | No | No | No | No | No | No | D |
| UTM source/medium/campaign | `install_source` props | install-attribution | No | Yes if GA4 configured | No | No | No | No | A |
| Play Install Referrer | `play_referrer` on `install_source` | InstallReferrerBridge | No | No | Helps Google install attrib | No | No | No | A |
| Onboarding started | `onboarding_started` | onboarding pages | No | No | No | No | No | No | A |
| Onboarding completed | `onboarding_completed` | onboarding analytics | No | No | No | No | No | No | A |
| Auth started | `auth_started` | firebase-auth-listener | No | No | No | No | No | No | A |
| Auth completed | `auth_finished` (not `auth_completed`) | firebase-auth-listener | No | No | No | RC login after config | No | No | A / F name |
| Signup completed | `signup_completed` | retention-engine | Native `sign_up` via growth | Yes | If conversion imported | RC logIn | No | No | A |
| Child profile created | — | — | No | No | No | No | No | No | D |
| First routine generated | `first_routine_generated` | routines/generate | No | Yes | No | No | No | No | A |
| First routine created | `first_routine_created` | routines/detail | No | Yes | No | No | No | No | A |
| First routine completed | `first_routine_completed` | premium-moment context | No | No | No | No | No | No | A |
| Amy AI first interaction | `first_amy_chat` | **Type only — never emitted** | No | Would if called | No | No | No | No | D |
| Paywall viewed | `paywall_opened` | paywall-context, banners, … | **`begin_checkout` (dirty)** | No | **Invalid if optimized** | No | No | No | A / F |
| Paywall aliases | `paywall_viewed`, `paywall_view`, `premium_paywall_viewed` | auto | No | No | No | No | No | No | E |
| Pricing viewed | `plan_card_viewed` | plan card hook | No | No | No | No | No | No | A |
| Checkout started | `checkout_started`, `subscribe_clicked` | pricing, paywall-modal | Native `begin_checkout` (catalog) | No | Yes if linked | Before sheet | No | No | A / E |
| Play flow initiated | Native `begin_checkout` | `BillingBridge.purchase` pre-sheet | Yes (real SKU/price) | No | Yes | Sheet opens | No | No | A / E |
| Play sheet opened | — | — | No | No | No | No | No | No | D |
| Purchase success | `purchase_success` | pricing / paywall after finalize | Native `purchase` + convert **again** | No | **Double risk** | INITIAL_PURCHASE webhook | Orders (delayed) | No | A / E |
| Purchase failed | `purchase_failed` | pricing / paywall | No | No | No | No | No | No | A |
| Purchase cancelled | `purchase_cancelled`, `checkout_cancelled` | paywall-modal | No | No | No | User cancelled | No | No | A (paywall); D (pricing native) |
| Subscription started | — | infer from above | Yes (purchase) | No | Yes | Yes | Yes delayed | No | D name |
| Entitlement activated | — | finalizeNativePurchase | No | No | No | entitlements.active | No | No | D |
| Restore started | `restore_purchase` | pricing / paywall tap | No | No | No | restorePurchases | No | No | A |
| Restore success | — | toast only | No | No | No | CustomerInfo | No | No | D |
| Restore failed | `restore_purchase_failed` | **never emitted** | No | No | No | No | No | No | D |
| Internal trial started | `trial_started` | use-trial-state / server | No | No | No | If Play intro | No | No | A / F |
| Trial converted | `trial_converted` | entitlement_sync orchestrator | No | No | No | webhook | No | No | A / F |
| Renewal | webhook `RENEWAL` | API | No | No | No | Yes | Yes delayed | No | A DB / D FA |
| Cancellation | webhook `CANCELLATION` | API | No | No | No | Yes | Yes delayed | No | A DB / D FA |
| Expiration | webhook `EXPIRATION` | API | No | No | No | Yes | Yes delayed | No | A DB / D FA |
| Billing issue | webhook `BILLING_ISSUE` | API | No | No | No | Yes | Partial | No | A DB / D FA |
| Refund / revoke | — | webhook ignores REFUND | No | No | No | RC may send | Refunds report | No | D |

---

# 4. Event classification summary

| Area | Dominant class |
|------|----------------|
| Play Install Referrer + UTM persistence | **A** |
| Native Firebase purchase path with real Play price | **A** |
| Firebase user id binding on auth + purchase | **A** (code); **G** (Ads) |
| Paywall → `begin_checkout` | **F** |
| Checkout → duplicate `begin_checkout` | **E** |
| Purchase → duplicate native FA events | **E** (P0) |
| Production conversion proof | **G** / not **C** |
| Lifecycle after day 0 | **D** in Firebase/GA4 |
| `first_amy_chat`, `child_profile_created` | **D** |
| Google Ads ↔ Firebase linkage | **G** |

---

# 5. Google Ads conversion path

## 5.1 Intended path (from code comments + implementation)

```
Install → Firebase Android SDK (automatic) → [Firebase console link] → Google Ads
Sign-up → trackFirebaseSignUp → native sign_up (bridge ≥ 2.5.2)
Checkout → begin_checkout (native; also dirty from paywall)
Purchase → purchase + app_store_subscription_convert (native)
```

## 5.2 What the code actually does

| Stage | Android native FA | JS / WebView FA | Evidence |
|-------|-------------------|-----------------|----------|
| Install / first_open | SDK automatic | JS `first_open` to AmyNest DB only | Code |
| sign_up | Native when bridge ≥ 2.5.2 | Fallback JS | **B** unit tests |
| begin_checkout | Native via bridge + **BillingBridge.purchase** | Also from `paywall_opened` | **F** + **E** |
| purchase | **Twice** on default path (see §8) | Skipped if native ok | **E** |
| User id | `setUserId` before purchase | Same | **A** |

## 5.3 What this audit cannot verify (**G**)

- Firebase project linked to Google Ads
- Which events are imported as primary conversions
- Conversion window (7 / 30 / 90 day)
- Whether `app_store_subscription_convert` vs `purchase` is the optimized action
- Live DebugView / Ads conversion counts

**Do not claim Google Ads attribution works.** Code supports the **plumbing**; production correctness is **unknown**.

## 5.4 GA4 path

- `Ga4Bootstrap` loads gtag in the **web app** (including WebView if measurement ID is in the deployed www bundle).
- Growth events (`install_source`, `signup_completed`, `first_routine_*`, `premium_conversion`) may hit GA4.
- **Native Firebase purchase events do not automatically appear in GA4** unless the Firebase property is linked and configured — **G**.

---

# 6. `begin_checkout` semantics (HIGH PRIORITY)

## Required separation

**PAYWALL VIEW ≠ CHECKOUT START ≠ PURCHASE SUCCESS**

## Current triggers of Firebase `begin_checkout` on Android

| Trigger | When | Product id | Price | Valid for Ads? |
|---------|------|------------|-------|----------------|
| `paywall_opened` | Paywall shown | Plan key or `"yearly"` | Catalog INR / USD fallback | **NO — DIRTY** |
| `checkout_started` / `subscribe_clicked` | User taps subscribe | Plan key (`yearly`, …) | Catalog | **Intent OK; fires before sheet** |
| `BillingBridge.purchase` | Immediately before Play sheet | **Play product id** | **Play price.amountMicros** | **YES — true checkout** |

Same user action on default path can emit **2–3** `begin_checkout` events with **different product ids and values**.

```117:153:artifacts/kidschedule/src/lib/subscription-analytics.ts
  if (payload.event === "paywall_opened") {
    // ...
    trackFirebaseBeginCheckout(payload.plan ?? "yearly", {
      source: payload.source ? `paywall:${payload.source}` : "paywall_opened",
    });
  }
  if (payload.event === "subscribe_clicked" || payload.event === "checkout_started") {
    trackFirebaseBeginCheckout(payload.plan, { source: payload.source });
  }
```

```189:201:android/app/src/main/kotlin/com/amynest/app/BillingBridge.kt
                FirebaseSubscriptionAnalytics.logBeginCheckout(
                    activity,
                    productId,
                    currency,
                    value,
                    "native_purchase",
                )
                Purchases.sharedInstance.purchaseWith(/* … */)
```

**Verdict:** `begin_checkout` is **NOT trustworthy for Google Ads optimization** until `paywall_opened` stops firing it and duplicate pre-sheet events are deduplicated.

**Real checkout initiation event:** native `BillingBridge.purchase` → `logBeginCheckout` with Play SKU + micros price (best signal in codebase).

---

# 7. Purchase integrity

## Can one Play purchase be joined across systems?

| Identifier | Play / RC | Native Firebase bundle | First-party `purchase_success` | Webhook row |
|------------|-----------|------------------------|----------------------------------|-------------|
| Order / transaction id | Yes (RC) | **No** | **No** | `transaction_id` |
| Product id | Play SKU | Play SKU (native) / plan key (JS path) | Plan enum only | `product_id` |
| RC customer id | `originalAppUserId` | No | No | `app_user_id` |
| Firebase uid | Via RC logIn | `setUserId` | Ingest user_id | canonical user id |
| Timestamp | Play / RC | Event time | Server ingest | `event_timestamp_ms` |
| Currency | Play | Native: real / JS: catalog | `IN`/`GLOBAL` heuristic | In payload |
| Value | Play micros | Native: real / JS: catalog | Not in extras | `price` in payload |
| Billing period | Package type | item_category subscription | plan key | product_id |

**Join today:** Play purchase → RC webhook → AmyNest subscription row: **yes (server).**  
**Join today:** Play purchase → Firebase user → one analytics event → one Ads conversion: **no** (duplicates, missing transaction id, mixed product ids).

Do **not** send receipt tokens to analytics.

---

# 8. Duplicate purchase protection

## Default path: custom paywall → `nativeBilling.purchase`

On **every successful Play purchase**:

1. **`BillingBridge.purchase` onSuccess** logs native `purchase` + `app_store_subscription_convert` with **Play SKU + real price** (`source=native_purchase_success`).

2. **`trackSubscriptionEvent({ event: "purchase_success" })`** fires:
   - Multiple first-party aliases (`purchase_completed`, `premium_unlocked`, `upgrade_completed`, …)
   - **`trackFirebaseSubscriptionPurchase`** → native `logSubscriptionAnalytics("purchase")` → **second** `purchase` + `app_store_subscription_convert` with **plan key + catalog price**

**One Play transaction → two native Firebase purchase conversions** (and two subscription_convert).

## Additional duplicate risks

| Risk | Status |
|------|--------|
| RC PaywallActivity path (flag on) | Only JS path fires FA purchase (single) — **no** BillingBridge purchase logging |
| `paywall-modal` + `purchase_success` | Double `upgrade_completed` |
| Webhook `INITIAL_PURCHASE` + client success | Two systems count subscriber; dashboards may union |
| App resume / retry | New user tap = new checkout; not double charge |
| Restore | Does not emit purchase_success by default |
| 300ms analytics dedupe | Does not dedupe across event **names** or native + JS |

**Idempotent purchase tracking: NO — P0 instrumentation risk.**

---

# 9. RevenueCat reconciliation

## Google Play → RevenueCat

- `Purchases.configure(goog_…)` in `AmyNestApp`
- Purchase via `purchaseWith(PurchaseParams)`
- `setUserId` → `logInWith(appUserId)` aligned with `/api/subscription/rc-config` `appUserId`

## RevenueCat → AmyNest premium

- Same webhook handler as iOS (`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, …)
- `finalizeNativePurchase` polls until `isPremiumSubscriber`
- Idempotent webhook insert on `eventId`

## Analytics reconciliation

| Question | Answer |
|----------|--------|
| Can analytics see purchase + product + customer? | Partially in DB/webhook; not on client FA event |
| Active subscription in analytics funnel? | No dedicated event |
| Cancellation / expiration in product analytics? | DB only |
| Refund? | Not applied in webhook handler |

---

# 10. Country / price analytics

| Field | Source on Android native purchase path | Source on JS Firebase path |
|-------|----------------------------------------|----------------------------|
| Country | `isIndiaRegion()` → `IN`/`GLOBAL` on first-party events; Play storefront not copied | Same |
| Currency | Play `price.currencyCode` in BillingBridge | Catalog INR or USD fallback |
| Product | Play `product.id` | Plan key string |
| Plan / period | Inferred from package map | Plan enum |
| Display price | `priceString` available in offerings API | Not sent to FA on purchase_success |
| Transaction value | Play micros / 1e6 in native bridge | Catalog/hardcoded in JS bridge |

**India pricing:** Play Console / RC control live prices; analytics must read store price (native path does on BillingBridge success). **Do not hardcode country prices** — but JS layer still uses `resolveMetaPlanPrice` when forwarding via web attribution.

---

# 11. Attribution

## Mechanism

1. **Play Install Referrer** — native fetch → JS → merged into localStorage → `install_source` once.
2. **URL params** — if WebView load URL contains UTM/gclid (unusual for Play install).
3. **Referrer string parsing** — extracts `gclid`, `utm_*` from Play referrer query format.

## Survival to purchase

| Token | Stored? | On Firebase purchase? | On first-party purchase? |
|-------|---------|----------------------|--------------------------|
| gclid | localStorage via install_attribution | **No** | **No** (only `source` string) |
| UTM * | localStorage + install_source | **No** | Partial via paywall `source` |
| playReferrer | localStorage | **No** | install_source only |
| gbraid / wbraid | **Not captured** | No | No |
| Firebase user id | After login | Yes | After login |

**Google’s install → in-app event attribution** may still work via Firebase/Google Play Services **without** app code attaching gclid to purchase — **G**. App code does **not** explicitly preserve gclid on conversion events.

## Where attribution is lost

- No gclid/UTM on `purchase` / `begin_checkout` Firebase params
- Meta uses campaign ids; Google FA does not read `install_source` table
- Reinstall clears localStorage unless referrer re-fetched

---

# 12. Delayed conversion (Day 0 install → Day 3 purchase)

| Mechanism | Persists? | Helps Day-3 purchase attrib? |
|-----------|-----------|------------------------------|
| Firebase `setUserId(uid)` | Until sign-out | **G** — if Ads linked |
| Play referrer in localStorage | Until cleared | Indirect; not on purchase event |
| AmyNest `device_id` | Persistent | First-party funnels only |
| RC `appUserID` | Same as uid | Server reconciliation |
| Firebase app instance id | SDK | **G** — Google internal |

**Do not claim 30/60/90-day windows** — those are Google Ads / Firebase console settings, not visible in repo. Code does **not** implement extended attribution logic.

---

# 13. Play Console vs analytics

**Play Console provides (delayed):** installs, subscription active counts, revenue, cancellations, refunds, renewals, country breakdown.

**Play Console is NOT:** real-time paywall/checkout funnel, user-level link to Firebase uid, replacement for `analytics_events`.

| System | Role |
|--------|------|
| Play Console | Financial / subscription truth (lagged) |
| RevenueCat | Near-real-time entitlement + webhook truth |
| Firebase | In-app events + potential Ads conversions |
| GA4 | Marketing / web-oriented reporting |
| Google Ads | Campaign optimization (config-dependent) |
| AmyNest DB | Product funnel + growth dashboards |

---

# 14. Test matrix

| # | Scenario | Supported in Play? | Current test coverage | Production evidence | Missing |
|---|----------|-------------------|----------------------|---------------------|---------|
| 1 | Fresh install | Yes | None E2E | G | Instrumented sandbox install test |
| 2 | First open | Yes | jsdom analytics | G | Native FA + first-party join |
| 3 | Attribution | Yes | install-attribution logic | G | Referrer → purchase join |
| 4 | Onboarding | Yes | Partial unit | No | Android WebView E2E |
| 5 | Auth | Yes | auth wiring tests | G | auth_finished → FA user id |
| 6 | First routine | Yes | milestone unit | No | — |
| 7 | Paywall | Yes | None IAP | No | Assert no Store call on view |
| 8 | Checkout | Yes | firebase-subscription-attribution **B** | G | Count begin_checkout fires |
| 9 | Successful purchase | Yes (license testers) | None E2E | G | Single purchase = 1 FA event |
| 10 | Failed purchase | Yes | None | No | — |
| 11 | Entitlement activation | Yes | API webhook tests | G | Client poll E2E |
| 12 | Trial | Internal + Play intro | Partial | G | Distinguish types |
| 13 | Renewal | Sandbox accelerated | Webhook code | G | No client event |
| 14 | Cancellation | Yes | Webhook code | G | — |
| 15 | Expiration | Yes | Webhook code | G | — |
| 16 | Billing issue | Hard | Webhook accepted | G | — |
| 17 | Restore | Yes | None | No | restore_success/fail events |
| 18 | Refund/revoke | Limited | Refund not handled | G | — |

---

# 15. Current Android ads readiness

## Verdict: **C — NOT READY FOR PAID ACQUISITION**

(when the test requires **trustworthy subscription conversion instrumentation**)

**Why not A (scale):** dirty checkout, duplicate purchase, unproven Ads linkage, no transaction-level idempotency.

**Why not B alone:** a “controlled test” optimized on Firebase conversions will **over-count checkout and purchase** today — you would optimize on poisoned signals, repeating the historical install-only failure mode in a different shape.

**Relative to iOS:** Android is the **correct platform** to fix first for Google Play / Google Ads plumbing (native FA + Install Referrer exist).

---

# 16. Historical problems — fixed or not?

| Historical problem | Status | Notes |
|--------------------|--------|-------|
| Install-only optimization | **PARTIALLY FIXED** | Native purchase exists; dirty checkout can still mis-train |
| Missing purchase signal | **PARTIALLY FIXED** | Native FA purchase wired; **duplicated**; not production-proven |
| Dirty `begin_checkout` | **NOT FIXED** | Still on `paywall_opened` |
| Missing subscription conversion | **PARTIALLY FIXED** | `app_store_subscription_convert` native; doubled |
| Missing attribution | **PARTIALLY FIXED** | Play Referrer + UTM; no gbraid/wbraid; gclid not on purchase |
| Firebase event gaps | **PARTIALLY FIXED** | Native sub events; lifecycle missing; no transaction id |
| Google Ads linkage uncertainty | **UNKNOWN** | Console config not in repo |
| Duplicate purchase risk | **NOT FIXED** | **Double native purchase on default path** |
| RC / Firebase identity mismatch | **PARTIALLY FIXED** | `setUserId` + RC logIn; not on every event payload |

---

# 17. Gap priority

### P0 — Must fix before paid acquisition (subscription-instrumented)

1. Remove `begin_checkout` from `paywall_opened` (shared JS — affects Android + iOS).
2. **Single native Firebase purchase per Play transaction** — choose BillingBridge **or** JS forwarder, not both; key by order/transaction id.
3. **Single `begin_checkout` per checkout attempt** — prefer BillingBridge pre-sheet; drop JS duplicate on `checkout_started` for Android wrapper.
4. Attach **Play product id + store currency + store value** to the one canonical purchase analytics event (first-party + Firebase).
5. Sandbox proof: one tester purchase → exactly one `purchase` + one `app_store_subscription_convert` in DebugView.
6. Production verification checklist for Firebase ↔ Google Ads linked conversions (**G** → must become **C** before spend).

### P1 — Must fix before scaling

1. Emit `restore_success` / `restore_purchase_failed` (type exists).
2. Pass install attribution snapshot (gclid, utm_*, campaign) as **non-PII** params on first `purchase` only, if Google recommends for your linked property.
3. Parse **gbraid/wbraid** if running Performance Max / web-to-app campaigns.
4. Server-side or BigQuery export of webhook purchases joined to `user_id` for ground-truth ROAS.
5. Lifecycle events from webhooks → analytics (renewal/cancel/expire) without looking like new purchases.
6. `child_profile_created`, wire `first_amy_chat`.
7. `auth_finished` vs documented `auth_completed` naming alignment.

### P2 — Nice to have

1. Dedicated Play sheet opened event if API allows.
2. RC native paywall path parity with BillingBridge analytics.
3. Dedupe paywall alias events.
4. Startup funnel correlation with subscription funnel in one dashboard view.

---

# 18. Cross-platform instrumentation plan

*(Consolidation section — suitable for later merge into `docs/v2/AMYNEST_CROSS_PLATFORM_SUBSCRIPTION_INSTRUMENTATION_PLAN.md`.)*

## APPLE vs ANDROID — high level

| Dimension | Apple (Capacitor iOS) | Android (WebView) |
|-----------|----------------------|-------------------|
| Native Firebase Analytics | **No** (JS only) | **Yes** |
| Play/App Install Referrer | **No** | **Yes** |
| Real store price on conversion | **No** (discarded transaction) | **Yes** in BillingBridge |
| SKAN / ATT | Off by policy | N/A |
| Google Ads app conversions | **Not viable** today | **Plumbing exists; dirty/duplicate** |
| `begin_checkout` on paywall | **Dirty (JS)** | **Dirty (JS)** + native duplicates |
| Duplicate purchase | JS aliases + webhook | **Double native FA** + aliases |
| RC webhook lifecycle | Same | Same |
| Identity `setUserId` | JS only | Native + JS |

## Common missing / broken (fix once in shared release)

| Item | Platforms |
|------|-----------|
| `paywall_opened` → Firebase `begin_checkout` | **Both** — remove in `subscription-analytics.ts` |
| Idempotent `purchase_success` / `upgrade_completed` by transaction id | **Both** |
| Transaction / product id on first-party purchase event | **Both** |
| `restore_purchase_failed` never emitted | **Both** |
| `first_amy_chat` never emitted | **Both** |
| No `child_profile_created` | **Both** |
| Lifecycle (renew/cancel/expire/refund) not in product analytics | **Both** (server-side) |
| Webhook REFUND ignored | **Both** |
| Paywall alias duplication | **Both** |

## Platform-specific (same release, different impl)

| Item | Apple | Android |
|------|-------|---------|
| Native conversion SDK | Add native FA **or** defer Apple ads | Fix duplicate native logging in `BillingBridge` vs JS |
| Install attribution | SKAN / ASA if ads planned | gbraid/wbraid; gclid on conversion params |
| StoreKit/Play sheet event | StoreKit transaction capture | Already has pre-sheet native checkout |
| Checkout cancel on pricing page | Silent cancel | Same shared pricing.tsx gap |

## One canonical funnel (target state)

```
acquisition   → install_source + platform install referrer / SKAN
activation    → onboarding_started → signup_completed → first_routine_* → first_amy_chat
value         → first_routine_completed
monetization  → paywall_opened (NO begin_checkout)
              → checkout_started (ONE begin_checkout with store SKU + price)
              → [store sheet]
              → purchase_success (ONE purchase + ONE subscription_convert, store value, transaction_id)
entitlement   → entitlement_active (explicit or verified poll success)
lifecycle     → server webhook → analytics (renewal/cancel/expire/billing/refund) — NOT duplicate purchase
```

**Release name (unchanged from Apple audit):** Analytics / Subscription Instrumentation Release — **one PR train**, shared JS semantics, platform-native conversion layers only where required.

---

# 20. Final founder questions

1. **Is Android instrumented well enough for the ₹4,000 controlled acquisition test?**  
   **No** if Google Ads will optimize on checkout/purchase. **Maybe** for manual RC/DB counting only — not conversion-instrumented ads.

2. **Can we reliably know when an ad-acquired user becomes a paying subscriber?**  
   **In AmyNest DB + RevenueCat after webhook: likely yes per user id. In Google Ads / Firebase automatically: not proven; duplicates break reliability.**

3. **Is `begin_checkout` trustworthy?**  
   **No.** Paywall impressions fire it; checkout fires it twice with different ids/prices on Android.

4. **Is `purchase` production-proven?**  
   **No (G).** Code fires it; native path fires **twice** per success on default checkout.

5. **Is Google Ads receiving the correct purchase signal?**  
   **Unknown (G).** Even if linked, signal is duplicated and semantically mixed with paywall checkout.

6. **Is Play Install Referrer attribution surviving to purchase?**  
   **Stored to install; not attached to purchase events.** Google may attribute internally — **G**.

7. **Can RevenueCat purchases be reconciled with Firebase users?**  
   **Yes at uid / RC appUserID level. Not at transaction/event level in analytics.**

8. **Is duplicate purchase tracking possible?**  
   **Yes — happening by design on default Android Play path today.**

9. **Exact P0 gaps?**  
   Dirty paywall `begin_checkout`; double native purchase; no transaction idempotency; no production Ads verification; pricing native cancel events missing.

10. **Exact P1 gaps?**  
    gbraid/wbraid; gclid on conversion; restore success/fail; lifecycle analytics; refund handling; missing activation events.

11. **Which Apple + Android gaps fix together?**  
    All shared `subscription-analytics.ts` semantics, first-party purchase payload, webhook→analytics lifecycle, restore events, activation events, idempotency — **one release**.

12. **Minimum release before ads?**  
    **Analytics / Subscription Instrumentation Release** (section 18): fix checkout semantics and purchase deduplication **first on Android** (only platform with native Google Ads plumbing), apply shared JS fixes to both, add sandbox DebugView proof, then run ₹4,000 with **one** primary conversion event and manual RC reconciliation weekly.

---

*End of audit. No code was changed. No app version was created.*
