# AmyNest Cross-Platform Subscription Instrumentation — Implementation Review

Founder-approved instrumentation release only. No product, pricing, entitlement, or schema changes.

Branch: `cursor/analytics-subscription-instrumentation`

---

## Before

### Apple
- End-to-end observable: **NO**
- Ads readiness: **NO**
- `paywall_opened` fired Firebase `begin_checkout` (dirty)
- StoreKit transaction discarded on `purchasePackage`
- Duplicate purchase fan-out (JS layers)
- Restore lifecycle incomplete (`restore_purchase_failed` never fired)
- REFUND webhook ignored

### Android
- Ads readiness: **NO**
- `begin_checkout`: **dirty** (paywall + duplicate JS/native)
- Purchase duplication: **present** (BillingBridge native FA + JS)
- Transaction id: **missing** on conversions
- gbraid / wbraid: **not captured**
- Production proof: **unknown**

---

## Implementation — Event Contract Changes

| Event | Before | After |
|-------|--------|-------|
| `paywall_opened` | Also fired Firebase `begin_checkout` | Emits `paywall_viewed` + `premium_paywall_viewed` only |
| `checkout_started` / `subscribe_clicked` | JS Firebase `begin_checkout` on all shells | JS skips Firebase on Android wrapper; native `BillingBridge.purchase` fires one pre-sheet `begin_checkout` |
| `purchase_success` | Multiple independent emitters | Single idempotent path via `recordVerifiedStorePurchase()` (requires store transaction id) |
| `restore_purchase` | Tap only | Also emits `restore_started` |
| `restore_success` / `restore_purchase_failed` | Partial | Emitted from `useNativeBilling.restore()` |
| `entitlement_activated` | Missing | Emitted after verified purchase + premium subscriber confirm |
| `child_profile_created` | Missing | Emitted on child create success |
| `first_amy_chat` | Growth only | Also emitted on first successful Amy reply |
| Server lifecycle | DB only | `trackServerSubscriptionFunnel` on RC webhook (renewal, cancel, expire, billing, refund) |

---

## Apple

| Area | Change | Status |
|------|--------|--------|
| Checkout semantics | Paywall no longer `begin_checkout`; checkout on CTA only | CODE-WIRED |
| Transaction ID | `purchaseIOSPackage` preserves RC transaction → coordinator | CODE-WIRED |
| Actual price/currency | From StoreKit product via `storeMetadataFromIosTransaction` | CODE-WIRED |
| Idempotency | `localStorage` txn set + coordinator skip | TEST-VERIFIED |
| Restore | `restore_started` / `restore_success` / `restore_purchase_failed` | CODE-WIRED |
| Lifecycle/refund | Server webhook handles `REFUND`, `REFUND_REVERSED` + funnel steps | CODE-WIRED |

---

## Android

| Area | Change | Status |
|------|--------|--------|
| Checkout semantics | Removed JS duplicate; native pre-sheet only | CODE-WIRED |
| Transaction/order ID | Bridge returns `purchase.transactionId` (Play orderId) | CODE-WIRED |
| Actual Play price | From RC package at purchase time in bridge response | CODE-WIRED |
| Idempotency | JS coordinator + native SharedPreferences dedupe | TEST-VERIFIED (JS); CODE-WIRED (native) |
| Install Referrer | gbraid/wbraid parsed from URL + referrer merge | TEST-VERIFIED |
| Google Ads purchase signal | Single native FA `purchase` from JS coordinator (bridge deduped) | CODE-WIRED |
| Duplicate native purchase | Removed BillingBridge success-path FA logging | CODE-WIRED |

---

## Cross-Platform

| Area | Mechanism |
|------|-----------|
| Canonical events | Shared `subscription-analytics.ts` + server funnel ingest |
| Identity | Firebase user id + RC app user id (unchanged) + txn id on purchase |
| Purchase authority | `useNativeBilling.purchase()` for store checkout |
| Deduplication | Store transaction id in `recordVerifiedStorePurchase()` |

---

## Verification Matrix

| Step | CODE-WIRED | TEST-VERIFIED | PRODUCTION-VERIFIED |
|------|------------|---------------|---------------------|
| Paywall → paywall_viewed only | Yes | Unit test | No |
| Checkout → checkout_started | Yes | Partial | No |
| Play/Store purchase → one conversion | Yes | Coordinator unit test | No |
| Firebase purchase w/ txn id | Yes | Unit test | No |
| gbraid/wbraid capture | Yes | Unit test | No |
| Restore lifecycle | Yes | — | No |
| Webhook REFUND | Yes | — | No |
| Gate 0 sandbox purchase chain | Partial | **No** | **No** |

---

## Files Changed

### Shared (kidschedule)
- `src/lib/subscription-analytics.ts`
- `src/lib/subscription-purchase-coordinator.ts` (new)
- `src/lib/subscription-purchase-metadata.ts` (new)
- `src/lib/firebase-subscription-attribution.ts`
- `src/lib/install-attribution.ts`
- `src/lib/native-billing.ts`
- `src/lib/native-billing-ios.ts`
- `src/hooks/use-native-billing.ts`
- `src/pages/pricing.tsx`
- `src/pages/subscription-trial-ended.tsx`
- `src/pages/children/form.tsx`
- `src/pages/assistant.tsx`
- `src/components/paywall-modal.tsx`
- `src/components/paywall-modal-lazy.tsx`
- `src/components/post-purchase-upsell-modal.tsx`
- `src/components/subscription-trial-offer.tsx`
- Tests: coordinator, install-attribution, subscription-analytics.purchase, firebase-subscription-attribution

### API
- `src/routes/subscription.ts` — REFUND handling + lifecycle funnel
- `src/services/subscriptionService.ts` — export `trackServerSubscriptionFunnel`

### Android native
- `BillingBridge.kt` — txn metadata in bridge; removed duplicate FA purchase on success
- `FirebaseSubscriptionAnalytics.kt` — SharedPreferences dedupe by transaction_id

### Docs
- `docs/v2/AMYNEST_APPLE_SUBSCRIPTION_EVENT_AUDIT.md`
- `docs/v2/AMYNEST_ANDROID_SUBSCRIPTION_EVENT_AUDIT.md`
- This review

---

## Remaining UNKNOWN

1. **RC dashboard paywall path** (`VITE_FF_SUB_NATIVE_RC_PAYWALL`): no store transaction id from paywall result — client purchase conversion intentionally skipped; webhook/server only.
2. **Razorpay web purchases**: no Play/Store transaction id — still emit `purchase_success` directly (no native duplicate path).
3. **Google Ads linked conversion**: plumbing CODE-WIRED; end-to-end Ads dashboard proof not demonstrated.
4. **iOS native Firebase**: still JS SDK in WebView (unchanged this release).

---

## Ads Gate

**₹4,000 controlled acquisition test = BLOCKED**

Gate 0 requires demonstrated sandbox/test purchase chain:

- Android: Play → Firebase → RevenueCat → AmyNest → entitlement → Google Ads mapping
- iOS: StoreKit → Firebase → RevenueCat → AmyNest → entitlement

Neither chain has **PRODUCTION-VERIFIED** or **TEST-VERIFIED** end-to-end evidence in this environment.

**Do not start paid acquisition** based on passing unit tests alone.

---

## Scope Audit

Changes limited to: analytics, subscription events, attribution, purchase reconciliation, tests, documentation.

No changes to: UI layout, pricing, RC products/entitlements, auth, DB schema, routine/Amy AI product behaviour.
