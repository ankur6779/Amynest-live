# AmyNest — Real purchase entitlement sync audit

**Date:** 2026-09-12 (UTC)  
**Regression account:** `amyworld1402@gmail.com`  
**Firebase UID / RevenueCat appUserID:** `Mvc8x7Jdoid7hmrZVJywGe979qO2`  
**Play subscription:** `GPA.3305-5562-8196-73420`  
**Product:** `amynest_monthly:monthly`  
**Constraint:** No manual premium grant, no allowlist, no test bypass, no product/price changes. Deploy + live `purchase_finalize` verification added 2026-09-13.

---

## 1. Executive verdict

Google Play charged this user and RevenueCat granted `premium` (ACTIVE, `play_store`, `ownership=purchased`, renews through 2026-10-12). That link is **PROVEN** via RevenueCat REST v2 on 2026-09-12.

AmyNest did **not** automatically unlock premium in the app. The remaining break is **not** “Play failed” and **not** “RevenueCat failed.”

**Proven code defect:** after a native store purchase the app only polls `GET /api/subscription`. That GET **does not** pull RevenueCat for a first-time buyer (`provider` still `none`). `POST /api/subscription/rc-sync` was restore-only and returned `409 webhook_required` for any other purpose. The only writer that could create the first `provider=revenuecat` row was the RevenueCat webhook. If that webhook is late, missing, or rejected, the ~22s poll ends FREE and analytics `purchase_success` never fires.

**Live AmyNest `subscriptions` row for this UID:** `LIVE DB VERIFICATION = BLOCKED` (Coolify Postgres hostname does not resolve from this environment). Whether the webhook wrote a row is therefore **UNKNOWN**. The in-app unlock failure is explained even when the webhook is healthy but delayed, and is guaranteed when the webhook does not write.

**Fix implemented and deployed:** authenticated `POST /rc-sync` accepts `purpose: "purchase_finalize"` and uses the same `syncRevenueCatSubscription` writer as the webhook. `finalizeNativePurchase` (Android and iOS) calls that endpoint before polling GET. No second entitlement system. No security weakening. No hand-edited row for `amyworld1402`.

**Live `purchase_finalize` (2026-09-13):** authenticated as Firebase UID `Mvc8x7Jdoid7hmrZVJywGe979qO2` against the Coolify API after merge `9493e80c`. Result: `verifiedCustomer=true`, `activeEntitlement=true`, `dbUpdated=true`, `provider=revenuecat`, `subscriptionState=ACTIVE`, `plan=monthly`, `isPremium=true`, `isPremiumSubscriber=true`, `currentPeriodEnd=2026-10-12T17:01:10.219Z` (matches RevenueCat). This is a RevenueCat V2 pull, not a manual grant.

**Android device UI:** **DEVICE VERIFICATION = BLOCKED** (no device in this environment). Gate 0 stays **BLOCKED**.

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
6. No hand-edited row for `amyworld1402`. Live `purchase_finalize` wrote the AmyNest row via the same RC snapshot writer. No products/prices changed.

**App killed after Play payment and before finalize:** still depends on the webhook (or a later Restore). That remaining risk is documented in §16.

---

## 11. Tests

Added / extended:

- `artifacts/api-server/src/services/__tests__/real-purchase-entitlement-sync.test.ts` — T0 FREE, T1/T2 INITIAL_PURCHASE snapshot, expiry, cancel-in-period, wrong user, source contracts, DB snapshot idempotency (when Postgres is available)
- `artifacts/api-server/src/services/__tests__/subscription-state-service.test.ts` — `amynest_monthly:monthly`
- `artifacts/api-server/src/routes/p0-api-stability.integration.test.ts` — `purchase_finalize` accepted; unknown purpose still 409
- `artifacts/kidschedule/src/lib/native-purchase-finalize.test.ts` — client posts `purchase_finalize`; failed sync stays FREE

Results: see §12.

---

## 12. Build results

| Check | Status |
|---|---|
| Real-purchase resolver + source contracts | **PASS** (41/41 in the entitlement suite; DB writer **SKIPPED** — no local Postgres) |
| Premium gate / RC snapshot / certification reset / identity | **PASS** |
| Kidschedule finalize + purchase coordinator + analytics + funnel | **PASS** (9 tests / 4 files) |
| `pricing-living-source.test.ts` | **FAIL (pre-existing)** Vite `node:` resolution; not caused by this change |
| `subscription-cancel.test.ts` | **FAIL (pre-existing)** mock missing `trackServerSubscriptionFunnel` export |
| One P0 infant/coach route-guard assertion | **FAIL (pre-existing)** `ai-coach/next-win` wiring; unrelated to billing |
| `pnpm run typecheck:libs` | **PASS** |
| API `pnpm --filter @workspace/api-server run build` | **PASS** |
| Kidschedule Vite live web build (`--mode` live, 8GB heap) | **PASS** (`✓ built in 26.79s`) |
| Kidschedule `tsc --noEmit` | **PASS** with `NODE_OPTIONS=--max-old-space-size=8192` |
| Android Gradle | **NOT RUN** — no Android SDK |
| iOS Xcode | **NOT RUN** — no `xcodebuild` |

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

Do not start paid acquisition. Google Ads / Firebase attribution is **UNPROVEN**. Gate 0 remains **BLOCKED** until an Android device shows premium UI.

---

## 16. Remaining risks

1. **Webhook still required when the app dies after Play payment** before `purchase_finalize`. Restore Purchases remains the in-app recovery if finalize never runs.
2. **SQL still unseen.** Coolify Postgres hostname does not resolve. Store / GPA columns cannot be SELECTed here. API entitlements after finalize prove provider/state/plan/expiry.
3. **DEVICE VERIFICATION = BLOCKED.** No Android or iOS device. Server premium is proven; paywall UI is not.
4. **Ads attribution UNPROVEN.** This agent did not observe GA4 / Google Ads / `purchase_success` for `GPA.3305-5562-8196-73420`.
5. **RC V2 pull dependency** unchanged.
6. Unpaid control UID with no RevenueCat customer stayed FREE after `purchase_finalize`.

---

## 17. Live verification status (2026-09-13)

| Item | Result |
|---|---|
| Before SHA | `ce45fb7fac8fcd9731d446d35298fe5cecd946d2` |
| Fix head SHA | `e405060ebf9b44ba1429ed1f7726b9022573221f` |
| main merge SHA | `9493e80c64e0a4a5e69174cec8f5e0c47fe43587` (PR #186, merge commit) |
| Files in fix | `subscription.ts`, `native-purchase-finalize.ts` + tests + this audit |
| GitHub Actions | `34736015920` **success** — Cloudflare Pages uploaded; unique deploy `https://73230c62.amynest-web.pages.dev` |
| Web health | `amynest-web.pages.dev` 200; unique deploy `73230c62` 200; `AppCore-CzPzu65-.js` contains `purchase_finalize` + `rc-sync`. `www.amynest.in` returned 403 from this VM (WAF), not a deploy failure. |
| API health | Coolify `/api/healthz` 200, `/api/health` 200, `/api/healthz/audio` 200; unauth `rc-sync` 401; no new 5xx on these probes |
| Coolify rollout | First paid call 409 (old replica); retry 200 (new contract). Matching web+API now live. |
| RC premium | Still ACTIVE, `GPA.3305-5562-8196-73420`, period end 2026-10-12T17:01:10.219Z |
| `purchase_finalize` paid UID | **PASS** — see §18 |
| SQL `subscriptions` row | **LIVE DB VERIFICATION = BLOCKED** (host `tcl9udyxcuq2zu598ebj0pfu` does not resolve) |
| API-visible AmyNest state | **PASS** — `provider=revenuecat`, `ACTIVE`, `monthly`, expiry matches RC |
| Android device UI | **DEVICE VERIFICATION = BLOCKED** |
| iOS device | **BLOCKED** |
| Unpaid `purchase_finalize` | **PASS** — UID `2lqY46XmXOgMVcM8vyZHfHt2bfF3`, RC 404, stays FREE |
| Duplicate analytics | **UNPROVEN** (no GA/Ads read; server path does not emit `purchase_success`) |
| Google Ads attribution | **UNPROVEN** |
| Gate 0 | **BLOCKED** |
| ₹4,000 Ads test | **NO** |

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
| Subscription DB write | **PASS (API-visible) / SQL BLOCKED** | Live `purchase_finalize` returned `dbUpdated=true`, `provider=revenuecat`, `ACTIVE` |
| Entitlement state | **PASS (API)** | Live `isPremium=true`, `isPremiumSubscriber=true` |
| GET `/api/subscription` read path | **FAIL** as first-purchase unlock (pre-fix) | `refreshRevenueCatBeforeSubscriptionRead` |
| Frontend premium hook | **PASS (code)** / **DEVICE BLOCKED** | `finalizeNativePurchase` now POSTs `purchase_finalize`; UI not observed |
| Cache invalidation | **PASS** mechanism | `useSubscription` / `asUiOnlyCachedSubscription` |
| Premium UI / features | **DEVICE VERIFICATION = BLOCKED** | No Android/iOS device in this environment |

---

## Required answers

1. Did Google Play payment succeed? **YES (PROVEN).**
2. Did RevenueCat receive the purchase? **YES (PROVEN).**
3. Did RevenueCat grant premium? **YES (PROVEN, ACTIVE through 2026-10-12).**
4. Did AmyNest DB receive/record it? **YES via live `purchase_finalize` API (`provider=revenuecat`, `ACTIVE`, `monthly`, expiry matches RC). SQL SELECT = BLOCKED.**
5. Did server entitlement resolve premium? **YES.** Live `isPremium=true` and `isPremiumSubscriber=true`.
6. Did the client refresh premium? **Pre-purchase path: NO. Post-deploy: server yes; Android UI = DEVICE VERIFICATION BLOCKED.**
7. Why did amyworld1402 remain FREE? **AmyNest unlock depended on a webhook write that GET cannot create for a first-time buyer; the client did not pull RevenueCat after Play success. Webhook delivery for this event is UNKNOWN. After deploy, authenticated `purchase_finalize` wrote ACTIVE.**
8. Is the root cause fixed? **Server path live-verified. App UI unlock not observed. Do not call Gate 0 PASS.**
9. Can a fresh unpaid user still accidentally receive premium? **No. Live unpaid UID stayed FREE (`customer_not_found`).**
10. Is Android purchase → premium proven? **Play → RC → AmyNest ACTIVE → server `isPremiumNow` YES. App UI BLOCKED (no device).**
11. Is iOS purchase → premium proven? **NO (no device). Shared architecture only.**
12. Are Ads purchase events now trustworthy? **UNPROVEN. They remain observers. This agent did not read GA4 / Ads.**
13. Is Gate 0 now PASS or still BLOCKED? **BLOCKED.**

## 18. Live `purchase_finalize` JSON (paid user)

Fields returned by `POST /api/subscription/rc-sync` for UID `Mvc8x7Jdoid7hmrZVJywGe979qO2` after deploy (values, not a full dump):

- `ok=true`
- `verifiedCustomer=true`
- `activeEntitlement=true`
- `dbUpdated=true`
- `apiPremium=true`
- `isPremium=true`
- `isPremiumSubscriber=true`
- `provider=revenuecat`
- `subscriptionState=ACTIVE`
- `plan=monthly`
- `status=active`
- `currentPeriodEnd=2026-10-12T17:01:10.219Z` (matches RC `expires_date` to the millisecond)

Replay of the same call returned the same state. Unpaid control returned `ok=false`, `reason=customer_not_found`, `isPremium=false`, `isPremiumSubscriber=false`.

## Final answers (Gate 0 checklist)

1. Google Play payment = **PASS**
2. RevenueCat purchase = **PASS**
3. RevenueCat premium = **PASS**
4. `purchase_finalize` = **PASS**
5. AmyNest DB subscription = **PASS (API-visible) / SQL BLOCKED**
6. server `isPremiumNow` = **PASS**
7. Android app premium unlock = **BLOCKED**
8. Fresh unpaid user remains FREE = **PASS**
9. Transaction idempotency = **PASS**
10. Analytics purchase event = **UNPROVEN**
11. Android purchase → premium = **BLOCKED**
12. iOS purchase → premium = **BLOCKED**
13. Google Ads attribution = **UNPROVEN**
14. Gate 0 = **BLOCKED**
15. ₹4,000 Ads test = **NO**
