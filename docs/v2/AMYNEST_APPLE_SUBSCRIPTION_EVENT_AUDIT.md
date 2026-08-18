# AmyNest Apple / iOS Subscription Funnel — Event Instrumentation Audit

**Status:** AUDIT ONLY. No production code, products, entitlements, pricing, checkout, or Firebase/GA4 contracts were changed.

**Date:** 2026-08-18  
**Shipped iOS app:** Capacitor shell `artifacts/amynest-capacitor/` (marketing version **3.0.18** in Xcode) + bundled web `artifacts/kidschedule/`.  
**Not the Play app:** `android/` WebView wrapper is out of scope except where it proves an iOS gap (native Firebase Analytics exists on Android only).

**Evidence standard:** an event is **not** “working” because it exists in source. This audit did **not** query production Firebase, GA4, RevenueCat, or App Store Connect. **Nothing in this document is production-proven (class C).**

---

## Founder verdict (read this first)

**Apple paid acquisition is not instrumented end-to-end.**

You can see *some* of the in-app funnel in AmyNest’s own `analytics_events` table **if** the WKWebView successfully flushes after sign-in. You cannot currently prove:

- ad → App Store install
- install → first open as a native iOS conversion
- paywall view ≠ checkout (Firebase already conflates them)
- Apple transaction ↔ Firebase user ↔ advertised plan price
- renewal / cancel / expire / refund as product-analytics events

**Ads readiness: NO**  
**₹4,000 Apple acquisition test: do not spend it yet.**

---

## Classification legend (section 3)

Used throughout.

| Code | Meaning |
|------|---------|
| **A** | CODE-WIRED — exists in current source and would fire if that path runs |
| **B** | TEST-VERIFIED — covered by in-repo unit/jsdom tests (not TestFlight sandbox E2E) |
| **C** | PRODUCTION-VERIFIED — observed in live Apple / Firebase / GA4 / RC with counts. **None in this audit.** |
| **D** | NOT AVAILABLE — no emitter, or Apple/ad system cannot see it |
| **E** | DUPLICATED / DIRTY — one user action fans out into multiple “purchase/checkout” signals, or two systems both count it |
| **F** | MISNAMED / SEMANTICALLY WRONG — name does not match the real user action |

---

# 1. Platform inventory

## 1.1 Actual current architecture

```
Ad / campaign
  ✗ no SKAdNetwork, no Apple Search Ads SDK, no ATT, no IDFA
  ✗ Play Install Referrer is Android-only
  ~ UTM/gclid/fbclid only if the WKWebView URL actually has those query params
      (App Store ads do not)

App Store install
  → Capacitor iOS shell (WKWebView loads bundled kidschedule)
  → first_open / app_open / session_start via JS AnalyticsService (AmyNest DB)
  ✗ native Firebase Analytics SDK is not in the iOS target
  ~ Facebook FBSDKCoreKit is configured in AppDelegate (URL open + launch)
  ~ FCM via AmyNestFcmBridge (push only)

Onboarding / activation
  → JS events → POST analytics ingest → analytics_events
  → optional GA4 gtag if VITE_GA4_MEASUREMENT_ID is baked into the Capacitor web bundle

Paywall
  → custom React paywall (RevenueCat native UI paywall is forced off on iOS)
  → checkout: useNativeBilling.purchase() → purchaseIOSPackage()
  → Purchases.purchasePackage → StoreKit sheet (RevenueCat iOS SDK 5.72 / Capacitor plugin 13.1.1)

Purchase
  → RC customerInfo (transaction object discarded in JS)
  → finalizeNativePurchase polls GET /api/subscription until isPremiumSubscriber
  → client fires purchase_success (+ aliases + Firebase JS purchase)
  → RevenueCat server webhook POST /api/subscription/webhook
      → revenuecat_webhook_events (idempotent on eventId)
      → syncs AmyNest subscription / entitlement rows
  ✗ webhook does not emit Firebase / GA4 events
  ✗ no Purchases.addCustomerInfoUpdateListener anywhere

Restore
  → restoreIOSPurchases() → finalizeNativeRestore
  → client fires restore_purchase at tap time only
```

## 1.2 What each native/binary piece actually does

| Layer | Location | Role today |
|-------|----------|------------|
| UI, paywall, JS analytics | `artifacts/kidschedule/src/` | Canonical funnel names, Firebase JS fallback, GA4 gtag |
| iOS shell | `artifacts/amynest-capacitor/ios/` | StoreKit via RevenueCat plugin, FCM, Facebook SDK, Associated Domains |
| iOS billing JS | `artifacts/kidschedule/src/lib/native-billing-ios.ts` | `configure` / `logIn` / `purchasePackage` / `restorePurchases` |
| Android Play wrapper | `android/` | Native Firebase Analytics + RC — **not shipped iOS** |
| API / entitlements | `artifacts/api-server/src/routes/subscription.ts` | RC webhook, `rc-sync`, subscription DB |
| Privacy / tracking policy | `PrivacyInfo.xcprivacy` + App Store review notes | `NSPrivacyTracking = false`; **do not add ATT** |

## 1.3 Explicit non-inventory (do not confuse)

- Expo / React Native under `archive/` is dead.
- Capacitor `android/` tree is not the Play Store app.
- Razorpay checkout is blocked on iOS; remaining Razorpay event paths in `pricing.tsx` / `paywall-modal.tsx` are web/Android-adjacent. On iOS the live path is `nativeBilling.purchase`.
- Google Ads “app conversion” wiring on Android (`AmyNestBillingNative.logSubscriptionAnalytics`) **does not run on iOS**.

## 1.4 iOS attribution / tracking SDKs

| Mechanism | Present? | Notes |
|-----------|----------|--------|
| App Tracking Transparency | **No** | Review notes forbid adding ATT. `Info.plist` has no `NSUserTrackingUsageDescription`. |
| IDFA | **No** | Tracking disabled in privacy manifest. |
| SKAdNetwork / SKAN | **No** | No `SKAdNetworkItems` in `Info.plist`. |
| AdServices / Apple Search Ads | **No** | Not imported. |
| Play Install Referrer | Android only | `install-attribution.ts` waits on `window.__AMYNEST_INSTALL_REFERRER`. |
| UTM / gclid / fbclid | Code-wired | Only if Capacitor web URL has query params (universal links `/referral/*`, `/routine/*` — not ad campaign tokens). |
| Facebook SDK | Binary present | `AmyNestFacebookSDK` in `AppDelegate`. Not an Apple Search Ads or SKAN substitute. Meta Pixel `fbq` is JS (`meta-attribution.ts`). |
| Native Firebase Analytics | **No on iOS** | Review notes: FCM only. JS `firebase/analytics` is the iOS fallback. |
| GA4 | gtag JS | `Ga4Bootstrap` mounts in `AppCore.tsx` when `VITE_GA4_MEASUREMENT_ID` is set. Marketing-page oriented; also receives some growth events. |
| Associated Domains | Yes | `applinks:amynest.in`, `applinks:www.amynest.in`. Referral/routine/privacy/terms — not paid-ad attribution. |

**Do not assume code-wired JS events are visible as iOS app conversions in Google Ads.** Native `first_open` / `in_app_purchase` from the iOS Firebase SDK is missing.

---

# 2. Event matrix

Canonical client subscription names live in `trackSubscriptionEvent()` (`artifacts/kidschedule/src/lib/subscription-analytics.ts`). Those persist as first-party `subscription_funnel_event` with `props.step = <name>`.

Columns:

- **Apple/iOS** = StoreKit / App Store Connect / native Apple reporting
- **Firebase** = Firebase Analytics (native or JS)
- **GA4** = gtag measurement
- **RevenueCat** = RC dashboard and/or AmyNest webhook ingest
- **ASC** = App Store Connect financial/subscription reports
- **Prod?** = production-proven in this audit

`—` means that system is not the place this step is supposed to live.

### Acquisition

| Funnel step | Event name | Where emitted | Apple/iOS | Firebase | GA4 | RevenueCat | ASC | Prod? | Class |
|-------------|------------|---------------|-----------|----------|-----|------------|-----|-------|-------|
| Campaign attribution | `install_source` (UTM/gclid/fbclid/Play referrer) | `install-attribution.ts` via `trackGrowthEvent` | No for App Store ads | No dedicated campaign event | If GA4 ID set and growth event mapped | No | Campaign reports only if Apple Search Ads is used (SDK not present) | No | **A** for URL params; **D** for Apple ads |
| First open | `first_open` | `AnalyticsService.trackAppOpen()` from `AppCore` `ClientTelemetryBootstrap` | ASC units ≠ first open | Native iOS FA `first_open` **not installed**. JS FA may emit web-like events, not app `first_open` | Possible if gtag loaded | No | No | No | **A** first-party only |
| App open / session | `app_open`, `session_start` | same `trackAppOpen()` | No | No native | Possible | No | No | No | **A** |
| Cold-start funnel | `app_install_first_open` | `startup-funnel/tracker.ts` | No | No | No | No | No | No | **A** |
| Deep link (product) | `deep_link_opened` | notification / navigation helpers | Universal links exist | No | No | No | No | No | **A** for referrals/notifs; **D** for ad campaign links |

There is **no** `app_install` event name in the iOS client. Do not invent one as “already tracked.”

### Activation

| Funnel step | Event name | Where emitted | Apple/iOS | Firebase | GA4 | RevenueCat | ASC | Prod? | Class |
|-------------|------------|---------------|-----------|----------|-----|------------|-----|-------|-------|
| Onboarding started | `onboarding_started` | `onboarding-analytics.ts` from `onboarding.tsx`, `child-discovery-film.tsx` (once-guarded) | No | `sign_up` only later via `signup_completed` | If mapped through growth | No | No | No | **A** |
| Onboarding completed | `onboarding_completed` | onboarding analytics | No | No | No | No | No | No | **A** |
| Signup completed | `signup_completed` | `trackOnboardingMilestone("signup_completed")` | No | JS `sign_up` (`trackFirebaseSignUp`) | Yes via `trackGrowthEvent` | RC `logIn(firebaseUid)` after auth | No | No | **A** |
| Child profile created | *(none)* | Child forms save to API; **no `child_profile_created` emitter found** | No | No | No | No | No | No | **D** |
| First routine generated | `first_routine_generated` | `routines/generate.tsx` → `trackOnboardingMilestone` | No | No | Yes via growth | No | No | No | **A** |
| First routine created | `first_routine_created` | `routines/detail.tsx` | No | No | Yes via growth | No | No | No | **A** |
| First routine completed / first value | `first_routine_completed` | `trackFirstRoutineValueMomentCompleted` when first-routine value sheet shows | No | No | No | No | No | No | **A** (sheet shown, not necessarily item completion) |
| First Amy AI interaction | `first_amy_chat` | Type exists in `retention-engine` / `growth-analytics` / GA4 union. **Zero call sites** | No | No | Would if called | No | No | No | **D** |

### Monetization

| Funnel step | Event name | Where emitted | Apple/iOS | Firebase | GA4 | RevenueCat | ASC | Prod? | Class |
|-------------|------------|---------------|-----------|----------|-----|------------|-----|-------|-------|
| Paywall viewed | `paywall_opened` | `paywall-context.tsx`, pricing, trial pages, banners, orchestrator | No | **`begin_checkout` (wrong)** | No | No | No | No | **A + E + F** |
| Paywall aliases | `paywall_viewed`, `paywall_view`, `premium_paywall_viewed` | auto from `paywall_opened` | No | No | No | No | No | No | **E** |
| Pricing / plan cards | `plan_card_viewed`, `plan_selected` | `use-plan-card-view-analytics.ts`, `subscription-plans.ts` | No | No | No | Offerings fetch is RC, not an impression event | No | No | **A** |
| Checkout started | `checkout_started` (+ `subscribe_clicked`) | pricing native path, paywall modal, trial-ended, sticky CTA | StoreKit sheet **after** this | `begin_checkout` again | No | `purchasePackage` starts after | No | No | **A**; Firebase **E** with paywall |
| StoreKit sheet opened | *(none)* | `purchaseIOSPackage` awaits `purchasePackage`; no separate event | Apple presents sheet; we do not log it | No | No | Internal | No | No | **D** |
| Checkout cancelled | `checkout_cancelled` / `purchase_cancelled` | paywall-modal (and trial-ended) on `userCancelled` | User dismissed sheet | No | No | Purchase error code 1 | No | No | **A** on paywall-modal; **D** on `pricing.tsx` native path (cancel is silent) |
| Purchase success | `purchase_success` | pricing / paywall / trial-ended **after** `finalizeNativePurchase` | Transaction exists in StoreKit; **not attached to analytics** | JS `purchase` + `app_store_subscription_convert` with **catalog price**, not StoreKit | No dedicated purchase hit | `INITIAL_PURCHASE` webhook | Units/proceeds later | No | **A + E** |
| Purchase aliases | `purchase_completed`, `premium_unlocked`, `feature_unlocked`, `upgrade_completed`, `premium_conversion` | auto from `purchase_success`; paywall-modal **also** calls `track("upgrade_completed")` itself | No | No extra | `premium_conversion` via growth | Webhook separate | No | No | **E** |
| Purchase failed | `purchase_failed` | pricing / trial-ended when `!ok && !userCancelled` | StoreKit error | No | No | Failed purchase not a webhook type we handle as conversion | No | No | **A** |
| Entitlement active | *(no client event)* | Inferred: `finalizeNativePurchase` sees `entitlements.isPremiumSubscriber`; webhook syncs DB | Apple subscription status | No | No | `entitlements.active` | Active subs report | No | **D** as named event; **A** as DB state |
| Subscription started | *(no client event)* | Use `purchase_success` + webhook `INITIAL_PURCHASE` | Yes in ASC | Dirty `purchase` | No | Yes | Yes (delayed) | No | **D** dedicated name |
| Restore started | `restore_purchase` | pricing / paywall **on tap**, before result | Restore sheet / silent restore | No | No | `restorePurchases()` | No | No | **A**; not restore **success** |
| Restore success | *(none)* | `nativeBilling.restore()` boolean; toast only | No | No | No | CustomerInfo | No | No | **D** |
| Restore failed | `restore_purchase_failed` | **Declared in the type union. Never emitted.** UI notice only | No | No | No | Error swallowed | No | No | **D** |

### Subscription lifecycle

| Funnel step | Event name | Where emitted | Apple/iOS | Firebase | GA4 | RevenueCat | ASC | Prod? | Class |
|-------------|------------|---------------|-----------|----------|-----|------------|-----|-------|-------|
| AmyNest internal trial started | `trial_started` | `use-trial-state.ts`; server `trackServerSubscriptionFunnel` | Not StoreKit intro | No | No | Only if product has intro and RC sends `period_type` | Intro-offer reports if configured in ASC | No | **A** for **internal** trial; **F** if read as Apple trial |
| Trial converted | `trial_converted` | `subscription-funnel-orchestrator.tsx` `source: entitlement_sync` when premium after local trial and provider is not `none`/`manual` | Not Apple trial convert | No | No | `INITIAL_PURCHASE` / renewal | Trial conversion report if Apple intro exists | No | **A + F** vs StoreKit trial |
| Trial expired | `trial_expired` / trial-ended paywall | trial banners / pages | No | No | No | EXPIRATION if store sub | Yes delayed | No | **A** internal |
| Renewal | *(no product event)* | Webhook `RENEWAL` → DB + `revenuecat_webhook_events` | Yes | No | No | Yes | Yes delayed | No | **A** server/RC; **D** Firebase/GA4/client |
| Cancellation | webhook `CANCELLATION`; client `cancel_*` is **in-app cancel agent / store redirect**, not Apple auto-renew off | webhook; pricing cancel agent | User turns off auto-renew in Settings / ASC | No | No | Yes | Yes delayed | No | **A** RC/DB; **D** client analytics for Apple cancel |
| Expiration | webhook `EXPIRATION` | API only | Yes | No | No | Yes | Yes delayed | No | **A** RC/DB; **D** product analytics |
| Billing issue | webhook `BILLING_ISSUE` | API only | Billing retry | No | No | Yes | Limited | No | **A** RC/DB; **D** product analytics |
| Uncancel / pause / transfer | `UNCANCELLATION`, `SUBSCRIPTION_PAUSED`, `TRANSFER`, `PRODUCT_CHANGE` | webhook supported set | Partial | No | No | Yes | Partial | No | **A** RC/DB |
| Refund / revocation | *(not in `supportedEvents`)* | Unknown RC types are stored then **`ignored`** | ASC refunds | No | No | RC may send `REFUND`; AmyNest **does not apply** it | Refund reports | No | **D** for product + entitlement apply |

---

# 3. Critical distinction — do not call this “working”

**Class C (production-verified): empty.** This environment did not pull live GA4, Firebase DebugView, RevenueCat charts, or App Store Connect. Growth SQL *queries* `purchase_success` / `upgrade_completed` / `first_open`, which only proves dashboards expect those names — not that iOS production emits them cleanly.

### A — CODE-WIRED (selected)

First-party: `first_open`, `onboarding_started`, `onboarding_completed`, `signup_completed`, `first_routine_generated`, `first_routine_created`, `first_routine_completed`, `paywall_opened`, `checkout_started`, `purchase_success`, `purchase_failed`, `restore_purchase`, `trial_started`.  
Server: RC webhook types listed in section 1.  
JS Firebase: `begin_checkout`, `purchase`, `app_store_subscription_convert`, `sign_up`.

### B — TEST-VERIFIED (not Apple sandbox)

In-repo tests exist for analytics helpers (e.g. `subscription-analytics.purchase.test.ts` for `upgrade_completed` on `purchase_success`, `analytics-service.test.ts` for `first_open` once, Firebase attribution jsdom tests). **No TestFlight / StoreKit sandbox E2E suite was found that purchases a real `appl_` product and asserts Firebase + webhook + `analytics_events`.**

### C — PRODUCTION-VERIFIED

**None claimed.**

### D — NOT AVAILABLE

SKAN, ASA, ATT, iOS native Firebase Analytics, StoreKit sheet event, `child_profile_created`, `first_amy_chat` (never called), `restore_success`, `restore_purchase_failed` emission, client renewal/cancel/expire/billing/refund events, transaction id on client analytics, Apple store country/currency/value on client purchase events.

### E — DUPLICATED / DIRTY

1. One `paywall_opened` → `paywall_viewed` + `paywall_view` + `premium_paywall_viewed` + Firebase `begin_checkout`.
2. `checkout_started` / `subscribe_clicked` → another `begin_checkout`.
3. One `purchase_success` → `purchase_completed` + `premium_unlocked` + `feature_unlocked` + `upgrade_completed` + `premium_conversion` + Meta Subscribe + Firebase `purchase` + `app_store_subscription_convert`.
4. `paywall-modal.tsx` fires `track("upgrade_completed")` **and** `purchase_success` (which fires `upgrade_completed` again).
5. Client `purchase_success` and webhook `INITIAL_PURCHASE` are two truths in two stores; dashboards that union `upgrade_completed` OR `purchase_success` can double-count if both land.
6. `use-native-billing.ts` already `finalizeNativePurchase`s; `pricing.tsx` finalizes **again** (extra polling, not a second StoreKit charge, but a second chance to race UI).

### F — MISNAMED / SEMANTICALLY WRONG

1. Firebase `begin_checkout` on **paywall open** — comment in code: “Early Google Ads signal — most users never reach checkout_started.” That is an ads hack, not checkout.
2. `trial_started` / `trial_converted` are AmyNest **internal** trial, not Apple introductory-offer trial conversion (orchestrator even skips `provider === none|manual`, but still is not StoreKit `period_type=TRIAL`).
3. Firebase/Meta purchase `value` / `currency` default to `resolveMetaPlanPrice` (INR catalog or hardcoded USD 4.99 / 24.99 / 39.99) because iOS `purchase_success` extras do **not** pass StoreKit `product.price` / `currencyCode`.
4. `restore_purchase` means “user tapped Restore”, not restore succeeded.
5. `app_store_subscription_convert` on iOS is a JS event name, not proof of App Store server-side conversion.

---

# 4. What each system knows (and the gaps)

## Apple / App Store Connect / StoreKit

**Knows (in Apple’s world):** product id, transaction, original transaction, subscription state, auto-renew, billing retry, refunds, proceeds, country of storefront, introductory offers if configured.

**AmyNest does not currently read those into product analytics.** `purchaseIOSPackage` types `transaction: unknown` and **drops it**:

```260:277:artifacts/kidschedule/src/lib/native-billing-ios.ts
export async function purchaseIOSPackage(
  pkg: RCPackage,
): Promise<{ ok: boolean; userCancelled?: boolean; reason?: string; customerInfo?: RCCustomerInfo }> {
  // ...
    const { customerInfo } = await plugin.purchasePackage({ aPackage: pkg });
    // transaction from purchasePackage is unused
    return { ok: true, customerInfo };
```

ASC is **not** a real-time funnel. Typical lag is a day or more. It cannot tell you onboarding or paywall view.

## RevenueCat

**Knows:** `appUserID` (AmyNest sets this to the signed-in user id in `initIOSBilling`), offerings, packages, StoreKit product price string, `customerInfo.entitlements`, `activeSubscriptions`, webhook `transaction_id` / `original_transaction_id` / `product_id` / `period_type` / `price` / `store` / `environment`.

Webhook **persists** that payload in `revenuecat_webhook_events` (idempotent on `eventId`). Supported apply types: `INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `CANCELLATION`, `EXPIRATION`, `UNCANCELLATION`, `BILLING_ISSUE`, `TRANSFER`, `SUBSCRIPTION_PAUSED`.

**Does not:** emit Firebase/GA4; notify the client of renewals (no customer-info listener); apply `REFUND` (ignored).

## Firebase Analytics

**Android:** native SDK via billing bridge — usable for Play app campaigns.

**iOS:** JS SDK inside WKWebView after `isSupported()`. Events: `begin_checkout` (paywall **and** checkout), `purchase`, `app_store_subscription_convert`, `sign_up`. `setFirebaseAnalyticsUserId` was recently wired for JS + Android native — **there is still no iOS native `Analytics.setUserId`.**

**Does not know:** Apple transaction id, storefront country, real StoreKit proceeds, SKAN campaign, native `first_open`.

## GA4 (gtag)

**Knows (if measurement ID is in the iOS web bundle):** marketing-site funnels; a subset of growth events (`install_source`, `signup_completed`, `first_routine_*`, `premium_conversion`, …) because `trackGrowthEvent` also calls `trackMarketingEvent`.

**Does not know:** StoreKit; RC lifecycle; reliable iOS app-campaign attribution.

## AmyNest first-party (`analytics_events`)

**Knows:** funnel steps listed as class A, with `platform=ios` when `isCapacitorIosShell()`, `country` as `IN` vs `GLOBAL` from `isIndiaRegion()` (not Apple storefront), `user_id` from auth after login (`device:{id}` preauth for `first_open`).

**Does not know:** transaction id, RC event id, real price, campaign from App Store.

### Gap map

```
Apple transaction  ──(RC webhook)──► AmyNest DB subscription + revenuecat_webhook_events
Apple transaction  ──(not linked)──► analytics_events.purchase_success
Apple transaction  ──(not linked)──► Firebase JS purchase (fake catalog value)
Ad campaign        ──(broken)──────► install / first_open / purchase
Renewal/cancel     ──(RC/DB only)─► not in Firebase/GA4/client funnel
Refund             ──(ASC only)───► webhook ignored
```

---

# 5. Purchase event integrity (correlation)

Required join for a single Apple purchase:

| Identifier | In Apple / RC | On client analytics event | On Firebase JS purchase | On webhook row |
|------------|---------------|---------------------------|-------------------------|----------------|
| StoreKit transaction id | Yes | **No** (discarded) | **No** | **Yes** `transaction_id` |
| Original transaction id | Yes | **No** | **No** | **Yes** |
| Product identifier | RC `pkg.product.identifier` | **Plan enum only** (`monthly` / `yearly` / …), not Apple SKU | `item_id` = plan string | **Yes** `product_id` |
| RevenueCat customer / app user id | `logIn(userId)` | Not a dedicated property | Not a dedicated property | **Yes** + canonical AmyNest user id |
| AmyNest / Firebase Auth uid | Same id used for RC login (intent) | Ingest `user_id` after auth | `setUserId` JS (code-wired, not prod-proven) | Resolved owner user id |
| Timestamp | Apple / RC | Server ingest time | Event time | `event_timestamp_ms` |
| Currency | StoreKit / RC package | **Not passed** | Catalog INR or hardcoded USD | Webhook `price` field exists on payload; not copied to FA |
| Value | StoreKit / RC `product.price` | **Not passed** on iOS `purchase_success` | Catalog / hardcoded | In RC payload |

**A single Apple purchase cannot be joined today as:**  
Apple `transaction_id` → RC customer → Firebase app instance → `analytics_events` row → real proceeds.

Do **not** send receipt blobs to analytics. The missing pieces are **ids and StoreKit price fields already returned by the SDK**, not the receipt.

Identity caveat: RC app user id is configured as the AmyNest user id. That is the right shape. It is still not copied onto the purchase analytics payload, and iOS has no native FA user id.

---

# 6. Duplicate purchases

**StoreKit / Apple** will not charge twice for one sheet confirmation. The risk is **analytics and dashboard double-counting**.

| Source | Can double-fire a “purchase”? | Idempotent? |
|--------|-------------------------------|-------------|
| `Purchases.purchasePackage` success | Once per confirmation | N/A |
| `addCustomerInfoUpdateListener` | **Not registered** — no listener storm on resume | N/A |
| `purchase_success` aliases | 4+ first-party steps + `upgrade_completed` | 300ms fingerprint dedupe only; **different event names all stored** |
| `paywall-modal` + `purchase_success` | **Two** `upgrade_completed` | No |
| Client success + webhook `INITIAL_PURCHASE` | Two systems | Webhook `onConflictDoNothing(eventId)` is idempotent **in DB**; does not stop client event |
| Restore | `restore_purchase` on every tap; toast on success; **can look like a new conversion if someone later maps restore → purchase_success** (currently it does not) | Restore is not aliased to purchase_success |
| App resume / retry | User taps Subscribe again | New `checkout_started`; new purchase only if StoreKit succeeds again |
| Post-purchase upsell | `purchase_success` with `source: post_purchase_upsell` | Legitimate second product **or** dirty if treated as new subscriber |

**Idempotent analytics: no.** A single Apple purchase can appear as many first-party steps and two Firebase conversion-shaped events (`purchase` + `app_store_subscription_convert`), after a paywall that already sent `begin_checkout`.

---

# 7. Checkout event semantics

**Required:** paywall view ≠ checkout start ≠ purchase success.

**Current first-party names are separate:** `paywall_opened` vs `checkout_started` vs `purchase_success`. That part is correct **inside `analytics_events`**.

**Firebase/Google Ads is not:**

```117:153:artifacts/kidschedule/src/lib/subscription-analytics.ts
  if (payload.event === "paywall_opened") {
    // ... aliases ...
    // Early Google Ads signal — most users never reach checkout_started.
    void import("@/lib/firebase-subscription-attribution").then(
      ({ trackFirebaseBeginCheckout }) => {
        trackFirebaseBeginCheckout(payload.plan ?? "yearly", {
          source: payload.source ? `paywall:${payload.source}` : "paywall_opened",
        });
      },
    );
  }

  if (payload.event === "subscribe_clicked" || payload.event === "checkout_started") {
    void import("@/lib/firebase-subscription-attribution").then(
      ({ trackFirebaseBeginCheckout }) => {
        trackFirebaseBeginCheckout(payload.plan, { source: payload.source });
      },
    );
  }
```

If Ads optimization uses `begin_checkout`, **paywall impression is already checkout.** That will inflate checkout rate and poison paid acquisition learning.

StoreKit sheet is still not a distinct event; `checkout_started` fires **before** `purchasePackage`. That is acceptable as “user initiated checkout” **if** it is not also fired on paywall open. First-party is OK; Firebase is not.

`pricing.tsx` native cancel: **no** `checkout_cancelled` / `purchase_cancelled` (unlike paywall-modal). Cancelled Apple sheets are under-counted on the main pricing page.

---

# 8. Country / price

| Field | Available in RC iOS package | Sent on iOS `purchase_success` | Sent to Firebase/Meta |
|-------|-----------------------------|-------------------------------|------------------------|
| Storefront country | Not copied from StoreKit into JS extras | `country` = `IN` or `GLOBAL` via `isIndiaRegion()` | Not storefront |
| Currency | `product.currencyCode` | Not in extras | Catalog / USD fallback |
| Product | `product.identifier` | AmyNest plan key only | Plan key as `item_id` |
| Billing period | packageType MONTHLY / ANNUAL / SIX_MONTH | Plan key implies period | Same |
| Displayed price | `product.priceString` | Not sent | No |
| Transaction value | `product.price` / webhook `price` | Not sent | Hardcoded catalog |

There is **no** country-specific hardcoded analytics matrix in the iOS purchase path — the bug is the opposite: **store price is ignored**, then Meta/Firebase fill INR/USD catalogs. Do not treat those values as Apple proceeds.

---

# 9. Attribution

**Can an Apple user from an ad be connected campaign → install → activation → checkout → purchase?**

**No.** Not with the current iOS binary and privacy policy.

| Link | Status |
|------|--------|
| Paid Apple Search Ads → install | **Missing** AdServices / ASA token |
| SKAN postback → campaign | **Missing** SKAdNetwork |
| IDFA / ATT → Meta/Google iOS | **Intentionally off** (`NSPrivacyTracking = false`) |
| Play referrer → campaign | **Android only** |
| UTM on App Store listing | **Not delivered** into the Capacitor bundle URL |
| Universal link with `?utm_*` | Possible only if the user opens a **web** AmyNest URL that launches the app; App Store ad traffic does not |
| Referral `ref` | First-party invite (`/referral/:code`), not ads |
| Facebook SDK in AppDelegate | May assist Meta **if** ATT/tracking were on; they are not. Pixel `fbclid` still needs a URL |

**Do not claim Google Ads iOS app campaigns work.** Android native FA is the only path that even resembles that. This audit has **no production proof** that Android Ads work either; it only shows the iOS path is weaker.

---

# 10. App Store Connect vs product analytics

**Use ASC for:** units, proceeds, subscription counts, trials (if Apple intro offers exist), conversions, cancellations, refunds, territory mix — **lagged financial truth**.

**Do not use ASC for:** paywall view, checkout start, onboarding, first routine, Amy chat, campaign ROI, real-time dashboards, user-level join to Firebase.

**Not available from ASC as real-time product events:** `paywall_opened`, `checkout_started`, `first_open` (as AmyNest defines it), activation, restore UX, which paywall source converted.

RevenueCat charts are closer to real-time subscription state than ASC, still **not** the in-app funnel.

Firebase/GA4 are **not** substitutes for ASC proceeds.

---

# 11. Test matrix (sandbox / TestFlight)

| # | Scenario | Possible in Apple sandbox / TestFlight? | Current test coverage | Missing |
|---|----------|------------------------------------------|-----------------------|---------|
| 1 | Fresh install | Yes | None E2E | Device reset, assert `first_open` + `install_source` empty |
| 2 | First open | Yes | jsdom `trackAppOpen` once | Capacitor install, preauth ingest, `platform=ios` |
| 3 | Onboarding | Yes | Partial unit | Full iOS path |
| 4 | Paywall | Yes | Component tests exist elsewhere; not IAP | Confirm **no** StoreKit call on view |
| 5 | Checkout | Yes | None | `checkout_started` then sheet |
| 6 | Successful subscription | Yes (sandbox Apple ID) | None | Transaction id captured; webhook `INITIAL_PURCHASE`; `purchase_success` once; entitlement |
| 7 | Failed purchase | Yes | None | `purchase_failed` vs cancel |
| 8 | Restore | Yes | None | `restore_purchase` + success/fail events (fail event missing) |
| 9 | Entitlement activation | Yes | API tests for webhook/sync exist in isolation | iOS poll `finalizeNativePurchase` vs webhook race |
| 10 | Trial | Internal trial: yes in app. Apple intro trial: only if products have intro offers in ASC/RC | Internal trial unit tests | Distinguish internal vs StoreKit `period_type` |
| 11 | Renewal | Sandbox renews accelerated | Webhook unit-ish coverage | No client event to assert |
| 12 | Cancellation | Yes (Settings → Subscriptions) | Webhook handler | No client event |
| 13 | Expiration | Yes | Webhook handler | No client event |
| 14 | Billing issue | Hard in sandbox | Webhook accepted | No client event |
| 15 | Refund / revocation | Limited (ASC / request refund) | **Webhook ignores unknown types including refund** | Apply + analytics |

**Bottom line:** Apple sandbox *can* exercise 1–9 and 11–13. The repo does **not** currently prove them on device. 14–15 are weakly testable; refund is not applied.

---

# 12. Ads readiness

## Is Apple attribution + subscription instrumentation good enough to spend acquisition money?

# NO

Not for App Store / Apple Search Ads / iOS app campaigns.

**LIMITED TEST ONLY** would apply only to a **non-Apple** channel (web or Play) or to watching **organic** iOS users already in `analytics_events`. That is not an Apple paid-acquisition experiment.

UI quality of the paywall is irrelevant. The measurement graph is broken at attribution, native conversion SDK, checkout semantics, purchase identity, and lifecycle.

---

# 13. Required missing events (do not implement in this audit)

Use **existing** names where they already exist. Do not add a parallel taxonomy.

### P0 — required before any Apple paid acquisition

1. **Stop treating paywall view as checkout** — Firebase `begin_checkout` only on `checkout_started` / `subscribe_clicked`, never on `paywall_opened`.
2. **Native iOS conversion identity** — either native Firebase Analytics in the Capacitor iOS app **or** an explicit decision that Apple ads will not be used (current privacy manifest forbids ATT/IDFA; SKAN still possible without ATT for some networks — **not implemented**).
3. **Purchase correlation fields** on one first-party event (and FA if used): product identifier, RC app user id, AmyNest user id, timestamp, StoreKit/RC currency + price. **Not** the receipt.
4. **Idempotent purchase success** — one `purchase_success` / one `upgrade_completed` per Apple `transaction_id` (client + webhook must not both look like two new subscribers in Ads).
5. **Distinguish restore vs purchase** — emit restore success/fail; never alias restore to `purchase_success`.
6. **Sandbox proof** — one TestFlight path: paywall → sheet → success → webhook → entitlement, with event counts = 1.

Attribution P0 if the ₹4,000 is **Apple ads**: SKAN and/or Apple Search Ads token. If the budget is **not** Apple ads, do not pretend iOS installs are campaign-attributed.

### P1 — required before meaningful scaling

1. `restore_purchase_failed` actually emitted; add `restore_success` (new name only if you refuse to overload `restore_purchase`).
2. `purchase_cancelled` / `checkout_cancelled` on **pricing native** path.
3. Server-side funnel events (or carefully mapped RC webhooks) for `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE` into analytics **without** looking like new `purchase_success`.
4. `child_profile_created` **or** a documented proxy (today: none).
5. Wire `first_amy_chat` at the real first Amy send (type exists; **zero emitters**).
6. Storefront country from Apple/RC, not only `IN`/`GLOBAL`.
7. Handle RC `REFUND` (entitlement + analytics), without sending receipt data.

### P2 — nice-to-have lifecycle

1. StoreKit sheet presented event (only if RC/StoreKit exposes a reliable hook — do not fake it at `checkout_started`).
2. `PRODUCT_CHANGE`, `UNCANCELLATION`, `TRANSFER`, pause as product events.
3. Apple introductory-offer `period_type=TRIAL` vs AmyNest internal trial (`trial_started` rename or extra property `trial_kind`).
4. Deduplicate paywall aliases (`paywall_viewed` / `paywall_view` / `premium_paywall_viewed`) down to one impression name.

---

# 14. Version plan

Instrumentation is **not** sufficient. Define a minimum release. **Do not ship it in this audit.**

## Release name

**Analytics / Subscription Instrumentation Release**

## Allowed contents (only)

- Missing Apple funnel events listed in P0 (and P1 restore/cancel if cheap)
- Event correctness (`begin_checkout` ≠ paywall)
- Duplicate prevention keyed by `transaction_id`
- Attribution continuity **within policy** (SKAN/ASA if Apple ads are the plan; do not silently enable ATT against current App Privacy answers)
- RevenueCat ↔ Firebase / first-party correlation fields (ids, product, price, currency, timestamp)
- TestFlight / sandbox verification instrumentation
- Analytics verification queries (one purchase = one conversion)

## Forbidden in that release

- UI redesign
- New monetization
- Pricing / product / entitlement changes
- Feature work
- Sending receipts to analytics
- Changing checkout UX except event timing

## If you skip Apple ads

You still need P0 items 1, 3, 4, 5, 6 before trusting iOS **conversion rates**. You can skip SKAN/ASA only if the ₹4,000 is **not** spent on Apple install campaigns.

---

# 15. Final founder answers

1. **How much of the Apple funnel is currently observable?**  
   Roughly the **middle of the in-app funnel** in AmyNest’s own DB (open → onboarding → some first-value → paywall → checkout start → client purchase success), **if** the webview flushes. **Not** ad → install. **Not** StoreKit sheet. **Not** real proceeds. **Not** renewal/cancel/expire/refund as product events. **Not** native iOS Ads conversions.

2. **Which events are production-proven?**  
   **None in this audit.** Dashboards querying a name ≠ proof iOS production is clean.

3. **Which events are only code-wired?**  
   Almost everything useful: `first_open`, onboarding, `first_routine_*`, `paywall_opened`, `checkout_started`, `purchase_success` (+ dirty aliases), `purchase_failed`, `restore_purchase`, JS Firebase `purchase` / `begin_checkout` / `sign_up`, RC webhooks into **DB**.

4. **Which events are missing?**  
   Apple campaign attribution; native iOS `first_open`; StoreKit sheet; `child_profile_created`; `first_amy_chat` (never called); restore success/fail; client lifecycle (renew/cancel/expire/billing/refund); transaction id / store price on purchase analytics; `REFUND` apply.

5. **Can we reliably identify an Apple subscriber from an ad?**  
   **No.**

6. **Can we distinguish paywall view vs checkout vs purchase?**  
   **In first-party names: yes. In Firebase: no** (`begin_checkout` on paywall). StoreKit sheet is not separate.

7. **Can we reconcile Apple ↔ RevenueCat ↔ Firebase?**  
   **RC ↔ AmyNest subscription DB: yes (webhook).**  
   **Apple transaction ↔ Firebase ↔ analytics_events: no.**

8. **Can we detect duplicate purchase events?**  
   We can **see in code** that they will duplicate. We cannot currently **detect/collapse** them in production by transaction id. 300ms analytics dedupe does not save you.

9. **Is Apple ready for the ₹4,000 controlled acquisition test?**  
   **No.** Spending it now would buy installs you cannot attribute and conversions you cannot trust (paywall counted as checkout; purchase value invented; no native iOS FA).

10. **What is the minimum instrumentation release required before that test?**  
    **Analytics / Subscription Instrumentation Release** (section 14): fix checkout semantics, attach purchase ids/price, make purchase success idempotent, restore vs purchase, sandbox-prove a single Apple buy, plus **SKAN or Apple Search Ads** if that ₹4,000 is actually Apple ads.

---

*End of audit. No code was changed. No app version was created. No RevenueCat products, entitlements, pricing, or checkout logic were modified.*
