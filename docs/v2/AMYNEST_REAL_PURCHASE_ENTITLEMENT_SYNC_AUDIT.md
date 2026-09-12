# AmyNest — Real purchase entitlement sync audit

**Date:** 2026-09-12 (UTC)  
**Regression account:** `amyworld1402@gmail.com`  
**Firebase UID / RevenueCat appUserID:** `Mvc8x7Jdoid7hmrZVJywGe979qO2`  
**Play subscription:** `GPA.3305-5562-8196-73420`  
**Product:** `amynest_monthly:monthly`  
**Constraint:** No manual premium grant, no allowlist, no test bypass, no product/price changes, no deploy.

---

## 1. Executive verdict

Google Play charged this user and RevenueCat granted `premium` (ACTIVE, `play_store`, `ownership=purchased`, renews through 2026-10-12). That link is **PROVEN** via RevenueCat REST v2 on 2026-09-12.

AmyNest did **not** automatically unlock premium in the app. The remaining break is **not** “Play failed” and **not** “RevenueCat failed.”

**Proven code defect:** after a native store purchase the app only polls `GET /api/subscription`. That GET **does not** pull RevenueCat for a first-time buyer (`provider` still `none`). `POST /api/subscription/rc-sync` was restore-only and returned `409 webhook_required` for any other purpose. The only writer that could create the first `provider=revenuecat` row was the RevenueCat webhook. If that webhook is late, missing, or rejected, the ~22s poll ends FREE and analytics `purchase_success` never fires.

**Live AmyNest `subscriptions` row for this UID:** `LIVE DB VERIFICATION = BLOCKED` (Coolify Postgres hostname does not resolve from this environment). Whether the webhook wrote a row is therefore **UNKNOWN**. The in-app unlock failure is explained even when the webhook is healthy but delayed, and is guaranteed when the webhook does not write.

**Fix implemented (code only, not deployed):** authenticated `POST /rc-sync` now accepts `purpose: "purchase_finalize"` and uses the same `syncRevenueCatSubscription` writer as the webhook. `finalizeNativePurchase` (Android and iOS) calls that endpoint before polling GET. No second entitlement system. No security weakening. No grant of `amyworld1402` by hand.

**Live unlock after this change:** **UNPROVEN** until the web/API build is deployed and the same Play purchase is re-read (Restore or next session after deploy). Do not treat compile/tests as live proof.

---

## 2. Exact root cause

**Primary (code-proven):** `L` + `J` — native Play purchase succeeds; the app waits for an AmyNest DB state that the purchase-success path cannot create; the client does not refresh from RevenueCat after purchase.

**Contributing (instance-unknown without DB/webhook logs):** `A` / `B` / `C` / `F` — webhook never arrived, arrived late, was rejected, or failed to write. Not distinguished.

**Ruled out for this UID:**

| Hypothesis | Verdict | Why |
|---|---|---|
| E. appUserID ≠ Firebase UID | **PASS / not the bug** | Both IDs are `Mvc8x7Jdoid7hmrZVJywGe979qO2` |
| K. analytics coupled as authority | **PASS as observers** | `purchase_success` / `entitlement_activated` fire only *after* `isPremiumSubscriber` |
| Admin / allowlist / Champion force-free | **PASS / not this user** | `amyworld1402@gmail.com` is not in `CERTIFICATION_FORCE_FREE_EMAILS` or hardcoded reviewer grants |
| I. cached FREE as authority after a paid GET | **Not the grant bug** | Placeholder cache *forces* FREE until GET resolves (fail-closed). GET itself stayed FREE. |
| Product / price / RC catalog | **Not involved** | Unchanged |

**Most likely instance path (do not over-claim):** Play → RevenueCat ACTIVE (proven) → AmyNest webhook write **UNKNOWN** → GET poll sees FREE (proven mechanism) → UI stays FREE (reported) → `purchase_success` stays 0 (follows from missing `isPremiumSubscriber`).

---

## 3. Exact affected code path

```
Android BillingBridge.purchase
  → use-native-billing.ts purchase()
  → finalizeNativePurchase()                    [was: poll GET only]
       POST /api/subscription/rc-sync           [NEW: purpose=purchase_finalize]
       syncRevenueCatSubscription()             [existing RC V2 pull]
       applyRevenueCatSnapshot()                [existing writer]
       GET /api/subscription poll               [existing; now reads the row]
  → isPremiumSubscriberNow()                    [existing resolver]
  → recordVerifiedStorePurchase()               [analytics observer only]
```

Webhook path (app killed / no client callback) is unchanged:

```
RevenueCat INITIAL_PURCHASE
  → POST /api/subscription/webhook
  → Bearer REVENUECAT_WEBHOOK_SECRET
  → revenuecat_webhook_events idempotent insert
  → syncRevenueCatSubscription(source=webhook)
  → fallback applyRevenueCatSnapshot(webhook payload)
```

iOS uses the same `finalizeNativePurchase` after StoreKit / RevenueCat purchase.

---

## 4. Real purchase evidence

Read-only RevenueCat REST v2, 2026-09-12, customer `Mvc8x7Jdoid7hmrZVJywGe979qO2`:

| Field | Value |
|---|---|
| Customer id | `Mvc8x7Jdoid7hmrZVJywGe979qO2` |
| Entitlement | `premium` (`entld84a0126e2`), object `customer.active_entitlement` |
| Entitlement expires | 2026-10-12T17:01:10.219Z |
| Subscription id | `subGpse79ae6fe4e39f70e53e3f09b7b67f074` |
| Product id (RC) | `prodef7f8bca0c` (store product `amynest_monthly:monthly`) |
| Store | `play_store` |
| Store subscription | `GPA.3305-5562-8196-73420` |
| Status | `active`, `gives_access=true`, `ownership=purchased` |
| Auto renew | `will_renew` |
| Period | 2026-09-12T17:01:39.648Z → 2026-10-12T17:01:10.219Z |
| Revenue | USD 2.08 gross / 1.50 proceeds |
| Project active subscriptions | **3** (this Play monthly + Champion Play monthly + Apple yearly) |

T0 (2026-09-10): this UID had 0 entitlements and 0 store subscriptions (prior forensic pass).

Negative control: no grant, allowlist, or DB edit was applied to this user in this work.

---

## 5. RevenueCat webhook evidence

| Check | Result |
|---|---|
| RC dashboard / webhook delivery log | **UNKNOWN** — REST v2 does not expose delivery history here |
| AmyNest `revenuecat_webhook_events` | **UNKNOWN** — live DB blocked |
| Handler supports `INITIAL_PURCHASE` | **PASS** — `artifacts/api-server/src/routes/subscription.ts` `supportedEvents` |
| Auth | Bearer `REVENUECAT_WEBHOOK_SECRET`; mismatch → 401 `invalid_webhook_signature` |
| Missing `app_user_id` | 400 `missing_app_user_id` |
| Idempotency | `event.id` (fallback transaction / type+user+expiry) unique; `onConflictDoNothing` → `{ duplicate: true }` |
| After insert | `syncRevenueCatSubscription` then payload fallback via `applyRevenueCatSnapshot` |
| Supported types | INITIAL_PURCHASE, RENEWAL, PRODUCT_CHANGE, CANCELLATION, EXPIRATION, UNCANCELLATION, BILLING_ISSUE, TRANSFER, SUBSCRIPTION_PAUSED, REFUND, REFUND_REVERSED |
| Lifecycle analytics | Observer only (`trackServerSubscriptionFunnel`) |

Whether *this* INITIAL_PURCHASE was delivered, accepted, or applied is **UNKNOWN**.

---

## 6. AmyNest DB evidence

**LIVE DB VERIFICATION = BLOCKED**
<!-- founder alias: PRODUCTION DB VERIFICATION = BLOCKED --> <!-- pragma: allowlist secret -->

| Attempt | Result |
|---|---|
| `DATABASE_URL` host `tcl9udyxcuq2zu598ebj0pfu:5432` | Does not resolve from this VM |
| Coolify public Postgres proxy | Previously TCP timeout (prior pass) |
| `GET /api/subscription` for this user | **Not called** — handler writes (auto-grant, heal, age-trial, certification reset) |
| Local SQL | Not live |

No subscription row was created or edited for `amyworld1402` / `Mvc8x7Jdoid7hmrZVJywGe979qO2` in this environment.

---

## 7. Entitlement resolver evidence

Authority: AmyNest `subscriptions` row via `isPremiumNow` / `isPremiumSubscriberNow` in `artifacts/api-server/src/services/subscription-premium-gate.ts`.

| Case | Result in current code |
|---|---|
| Valid RC ACTIVE + future `currentPeriodEnd` | premium **and** premium subscriber |
| Expired | not premium |
| Cancelled, paid period remaining | premium until expiry (`CANCELLED` + future period end) |
| Billing issue / grace | `GRACE_PERIOD` premium only while `gracePeriodExpiresAt` is future; **not** `isPremiumSubscriber` |
| Internal 3-day age trial | `isPremiumNow=false` (capped); not subscriber |
| Grandfathered pre-2026-07-26 internal trial | premium until `trialEndsAt` only |
| Unknown / missing period | **never** premium |
| Missing DB row / FREE | FREE |
| Webhook pending (no row yet) | FREE |
| Wrong user | no row → FREE |
| Lookup failure on GET | `buildSubscriptionFallbackResponse()` / fail-closed FREE |

A correctly written amyworld1402 row (`provider=revenuecat`, `ACTIVE`, period end 2026-10-12, product `amynest_monthly:monthly`) **would** resolve `isPremiumNow=true` and `isPremiumSubscriberNow=true`. The resolver is not the bug.

---

## 8. Client refresh evidence

| Step | File | Verdict |
|---|---|---|
| Native Play success | `use-native-billing.ts` | **PASS** — reaches `finalizeNativePurchase` |
| Pre-fix finalize | `native-purchase-finalize.ts` | **FAIL** — poll GET only; no RC pull |
| GET first-purchase refresh | `refreshRevenueCatBeforeSubscriptionRead` | **FAIL** as unlock path — returns early when no RC identity |
| React Query key | `["subscription", userId]` invalidated by prefix `["subscription"]` | **PASS** |
| Placeholder cache | `asUiOnlyCachedSubscription` | Fail-closed FREE (does not grant) |
| `staleTime` 60s | `use-subscription.ts` | Invalidate still refetches |
| Analytics | `recordVerifiedStorePurchase` after `isPremiumSubscriber` | Observer only |
| Restore | `finalizeNativeRestore` → `purpose: "restore"` | Already could unlock if user tapped Restore |

After the fix, finalize POSTs `purchase_finalize`, then invalidates subscription queries. Logout/login is not required.

---

## 9. Why premium did not unlock

1. Play billed `GPA.3305-5562-8196-73420`. **PROVEN.**
2. RevenueCat marked `premium` ACTIVE for the same Firebase UID. **PROVEN.**
3. AmyNest premium is the `subscriptions` row, not RevenueCat CustomerInfo and not analytics.
4. The in-app success path never asked the server to pull RevenueCat for a first purchase.
5. GET `/api/subscription` will not create that row for a still-free user.
6. Unlock therefore depended entirely on webhook delivery **within the poll window** (and a successful write).
7. The app reported FREE. `purchase_success` did not fire because it waits for `isPremiumSubscriber`.

Webhook delivery for this exact event remains **UNKNOWN**. The client/GET gap is **PROVEN** and is sufficient to leave a just-paid user FREE.

---

## 10. Fix implemented

Smallest live-safe change. Same writer as the webhook (`syncRevenueCatSubscription` → `applyRevenueCatSnapshot`). Client cannot grant premium.

1. `POST /api/subscription/rc-sync` accepts `purpose: "restore" | "purchase_finalize"`. Unknown purposes still `409 webhook_required`.
2. `finalizeNativePurchase` POSTs `purchase_finalize` before polling GET (Android and iOS).
3. Webhook path unchanged (app-closed recovery).
4. GET still does **not** fan out to RevenueCat for every free user (avoids a second entitlement system and RC API stampede).
5. Champion6779 force-free, fail-closed resolver, and analytics observers unchanged.
6. No row written for `amyworld1402`. No products/prices changed.

**App killed after Play payment and before finalize:** still depends on the webhook (or a later Restore). That remaining risk is documented in §16.

---

## 11. Tests

Added / extended:

- `artifacts/api-server/src/services/__tests__/real-purchase-entitlement-sync.test.ts` — T0 FREE, T1/T2 INITIAL_PURCHASE snapshot, expiry, cancel-in-period, wrong user, source contracts, DB snapshot idempotency (when Postgres is available)
- `artifacts/api-server/src/services/__tests__/subscription-state-service.test.ts` — `amynest_monthly:monthly`
- `artifacts/api-server/src/routes/p0-api-stability.integration.test.ts` — `purchase_finalize` accepted; unknown purpose still 409
- `artifacts/kidschedule/src/lib/native-purchase-finalize.test.ts` — client posts `purchase_finalize`; failed sync stays FREE

Results: see §12 (filled after the test run).

---

## 12. Build results

Filled after the verification run in this agent.

| Check | Status |
|---|---|
| Webhook / entitlement / rc-sync / finalize / analytics / identity tests | PENDING |
| `pnpm run typecheck:libs` | PENDING |
| Live web build | PENDING |
| API build | PENDING |

---

## 13. Android status

- Shipped Android app is `android/` WebView (`com.amynest.app`), not Capacitor Android.
- Purchase: Play Billing → RevenueCat (native bridge) → web `finalizeNativePurchase`.
- This fix is in the **shared web** finalize + API. WebView picks it up after **web/API deploy**.
- Android Gradle/SDK build: **not run** (no Android SDK in this environment).
- Device certification: **not claimed**.

---

## 14. iOS status

- iOS: Capacitor + StoreKit / RevenueCat → same `finalizeNativePurchase`.
- No iOS-only entitlement logic added.
- Xcode build: **not run** (`xcodebuild` not present).
- Device purchase → premium: **UNPROVEN** (no device). Architecture is shared with the Android fix.

---

## 15. Ads / conversion impact

| Claim | Class | Evidence |
|---|---|---|
| This bug can leave a real payer FREE in-app | **PROVEN** (mechanism) | GET + restore-only rc-sync |
| Explains this account remaining FREE after Play payment | **LIKELY** | RC premium proven; AmyNest unlock reported failed; DB unknown |
| Historical `purchase_success = 0` | **LIKELY** for native store checkouts that never reached `isPremiumSubscriber`; **not** proof that Ads instrumentation is wrong | Events are observers after unlock |
| Checkout abandonment | **POSSIBLE** | User sees “activating / Restore” after a successful charge |
| Users seeing “already active” | **PROVEN** as Play `ITEM_ALREADY_OWNED` for Champion6779; **NOT SUPPORTED** as this amyworld1402 purchase (Play accepted a new sub) | See §13 of the leak audit + this purchase |
| Premium access without payment | **NOT SUPPORTED** by this bug | Fail-closed; missing row = FREE |
| Inability to measure subscription conversion | **LIKELY** for Android/iOS store purchases that did not unlock | Ads will under-count payers |
| This bug caused historical *zero* store subscriptions | **NOT SUPPORTED** | RC now has 3 active store subscriptions including this real Play pay |

Do not start paid acquisition on unit tests alone. Gate 0 remains blocked until live AmyNest unlock is verified.

---

## 16. Remaining risks

1. **Webhook still required when the app dies after Play payment** before `purchase_finalize`. Restore Purchases remains the manual recovery.
2. **Live DB still unseen.** Cannot confirm whether a row already exists for this UID.
3. **Old live JS** still polls GET only until web deploy. Android WebView will keep the bug until `www.amynest.in` serves this bundle.
4. **Old live API** still 409s `purchase_finalize` until API deploy. Client and API should ship together.
5. **RC V2 pull dependency.** `purchase_finalize` needs `REVENUECAT_V2_SECRET_KEY` + project id (already required by webhook sync). Webhook payload fallback still covers webhook-only delivery if V2 fetch fails.
6. No mass unpaid premium path was added. Unknown state remains FREE.

---

## 17. Live verification status

| Link | Status |
|---|---|
| Google Play payment | **PROVEN** |
| RevenueCat received purchase | **PROVEN** |
| RevenueCat granted premium | **PROVEN** |
| AmyNest DB recorded it | **UNPROVEN** (`LIVE DB VERIFICATION = BLOCKED`) |
| Server `isPremiumNow` | **UNPROVEN** in live (code would return true on a correct row) |
| App premium unlock | **REPORTED FAIL** on the live purchase; **UNPROVEN** after this fix (not deployed) |
| Fresh unpaid user remains FREE | **PASS** in resolver tests; live census not re-run |
| Deploy | **NOT DONE** (stop before deploy) |

---

## Purchase chain scorecard

| Step | Verdict | File / function |
|---|---|---|
| Google Play purchase | **PASS** | Play order `GPA.3305-5562-8196-73420` |
| RevenueCat customer | **PASS** | RC V2 `GET .../customers/Mvc8x7…` |
| RevenueCat INITIAL_PURCHASE webhook | **UNKNOWN** | RC delivery logs not available |
| AmyNest webhook endpoint | **UNKNOWN** delivery; handler **PASS** | `POST /subscription/webhook` |
| Webhook auth / signature | **UNKNOWN** for this event; code **PASS** | Bearer `REVENUECAT_WEBHOOK_SECRET` |
| Event parsing | **UNKNOWN** instance; code **PASS** | `subscription.ts` event fields |
| appUserID / Firebase mapping | **PASS** (same UID) | `preferredRevenueCatUserId` + `resolveSubscriptionOwnerUserId` |
| Subscription DB write | **UNKNOWN** | `applyRevenueCatSnapshot` / `syncRevenueCatSubscription` |
| Entitlement state | **UNKNOWN** in prod; resolver **PASS** | `isPremiumNow` / `isPremiumSubscriberNow` |
| GET `/api/subscription` read path | **FAIL** as first-purchase unlock | `refreshRevenueCatBeforeSubscriptionRead` |
| Frontend premium hook | **FAIL** pre-fix (poll only) | `finalizeNativePurchase` |
| Cache invalidation | **PASS** mechanism; data stayed FREE | `useSubscription` / `asUiOnlyCachedSubscription` |
| Premium UI / features | **FAIL** (reported) | Paywall still offered; no subscriber unlock |

---

## Required answers

1. Did Google Play payment succeed? **YES (PROVEN).**
2. Did RevenueCat receive the purchase? **YES (PROVEN).**
3. Did RevenueCat grant premium? **YES (PROVEN, ACTIVE through 2026-10-12).**
4. Did AmyNest DB receive/record it? **UNKNOWN. LIVE DB VERIFICATION = BLOCKED.**
5. Did server entitlement resolve premium? **UNPROVEN in live.** Resolver **would** return true on a correct row.
6. Did the client refresh premium? **NO on the live purchase (reported / pre-fix path).** Fix is code-only until deploy.
7. Why did amyworld1402 remain FREE? **AmyNest unlock depended on a webhook write that GET cannot create for a first-time buyer; the client did not pull RevenueCat after Play success. Webhook delivery for this event is UNKNOWN.**
8. Is the root cause fixed? **Fixed in code (purchase_finalize sync). NOT live-verified. Do not say the live user is unlocked.**
9. Can a fresh unpaid user still accidentally receive premium? **No added path. Missing/unknown state stays FREE. Not a live census.**
10. Is Android purchase → premium proven? **Play → RevenueCat YES. AmyNest + app unlock UNPROVEN (DB blocked, not deployed, no device).**
11. Is iOS purchase → premium proven? **NO (no device). Shared architecture only.**
12. Are Ads purchase events now trustworthy? **They remain observers. They become trustworthy for native checkouts only after unlock actually reaches `isPremiumSubscriber` in live.**
13. Is Gate 0 now PASS or still BLOCKED? **BLOCKED.**
