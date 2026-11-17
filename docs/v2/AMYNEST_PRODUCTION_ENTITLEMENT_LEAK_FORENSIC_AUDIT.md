# AMYNEST — Production entitlement / full-access leak forensic audit

**Date queried:** 2026-09-10 (UTC)  
**Constraint:** Read-only. No product code, database rows, RevenueCat, Play/Apple products, pricing, analytics contracts, Firebase claims, or admin access were changed.  
**This document is an audit, not a remediation.** Do not treat it as approval to revoke users, cancel store subscriptions, or ship entitlement patches.

---

## 1. Executive verdict

**There is no evidence of a mass production entitlement leak through RevenueCat or Firebase.**

Live RevenueCat has **exactly 2** customers with an active `premium` entitlement out of **2709** listed customers (**134** identified Firebase-like IDs + **2575** `$RCAnonymousID:` IDs).

Those two are:

| Store | AmyNest identity | Classification |
|---|---|---|
| Google Play monthly `amynest_monthly:monthly` | Firebase UID `dJTWbVUsjHhAjlXGfvnrgLaEWSx1` = **`champion6779@gmail.com`** | **Certification / license-test account** (intentionally force-freed in AmyNest) |
| App Store yearly `amynest_yearly` | Firebase UID `CMrahNV1ckYv0ZOZ9BdEsPG0rk23` (Apple Sign-In, gmail.com) | **Legitimate Apple paid subscriber** (store subscription id + USD proceeds) |

**The screenshot message is not AmyNest granting premium.** It is RevenueCat `PurchasesErrorCode.ProductAlreadyPurchasedError` (code 6), wrapping Google Play `ITEM_ALREADY_OWNED`. The pricing screen still shows **Continue with Google Play**, which in current code only renders when AmyNest does **not** treat the user as premium.

That combination is exactly what the Champion6779 certification reset produces:

1. Play still owns `amynest_monthly` on the Play Store Google account.
2. AmyNest backend force-frees `champion6779@gmail.com`, so the paywall still offers checkout.
3. Tapping checkout fails with “This product is already active for the user.”

**AmyNest Postgres `subscriptions` / `admin_premium_grants` census: PRODUCTION COUNT = NOT EXECUTED.** The agent `DATABASE_URL` host is a Coolify Docker name (`tcl9udyxcuq2zu598ebj0pfu`) and does not resolve from this VM. Manual grants, Razorpay rows, and grandfathered internal trials therefore cannot be counted here.

**Historical `purchase_success` = 0 is not explained by “everyone is already premium.”** Relationship class: **NOT SUPPORTED** for a mass leak; **POSSIBLE** that Play already-owned blocked tester checkouts; **PROVEN** that store-side paid count is 2, not 0.

**Severity of a mass unpaid-premium leak: not proven (do not treat as P0 ship-stop for “all users are premium”).**  
**Severity of the screenshot / Champion6779 checkout deadlock: P1 certification and conversion-test blocker.**  
**Severity of unknown Postgres manual/grandfathered premium: OPEN until Coolify Postgres is queried — do not close that question.**

---

## 2. Exact current production premium-user count

### What was executed

| Source | Method | Result |
|---|---|---|
| RevenueCat REST v2 | `GET /v2/projects/{id}/metrics/overview` | `active_subscriptions` = **2**, `active_trials` = **0** |
| RevenueCat charts | `GET .../charts/actives?segment=store` (2026-09-10 incomplete period) | **Play Store 1 + App Store 1 = 2**. No Test Store segment. |
| RevenueCat charts | `GET .../charts/subscription_status` | Total active **2**; set to renew **1**; set to cancel **1**; billing issue **0** |
| RevenueCat customers | Paginated `GET .../customers` | **2709** customers |
| RevenueCat entitlements | `GET .../customers/{id}/active_entitlements` for **all 134 identified** customers | **2** with active `premium` |
| RevenueCat subscriptions | `GET .../customers/{id}/subscriptions` for those 2 | Both `gives_access=true`, `ownership=purchased`, non-empty store subscription identifiers, `total_revenue_in_usd.gross > 0` |
| Firebase Auth | Identity Toolkit `downloadAccount` + `accounts:lookup` | **452** users, **0** disabled, **0** custom attributes containing `premium` |
| AmyNest Postgres | `DATABASE_URL` | **PRODUCTION COUNT = NOT EXECUTED** |
| Razorpay REST | No `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in this environment | **PRODUCTION COUNT = NOT EXECUTED** |
| Coolify `ADMIN_PREMIUM_*` (production) | Not this VM’s env | **PRODUCTION COUNT = NOT EXECUTED** |

Anonymous RC customers (**2575**) were not individually entitlement-fetched. That does not change the paid count: overview `active_subscriptions=2` equals the two identified entitled customers, and the store-split chart is Play 1 + App Store 1.

### Counts that are exact (executed)

| Metric | Count |
|---:|---:|
| Firebase Auth users (this production project) | **452** |
| RevenueCat customers listed | **2709** |
| RevenueCat identified (non-anonymous) customers | **134** |
| RevenueCat customers with active `premium` entitlement | **2** |
| RevenueCat active store subscriptions | **2** |
| RevenueCat active trials | **0** |
| Firebase users with custom claims containing `premium` | **0** |

### Counts that are NOT EXECUTED

| Metric | Status |
|---|---|
| AmyNest `subscriptions` rows with `isPremiumNow=true` | **PRODUCTION COUNT = NOT EXECUTED** |
| `provider=manual` / `admin_premium_grants` | **PRODUCTION COUNT = NOT EXECUTED** |
| Razorpay active subscriptions | **PRODUCTION COUNT = NOT EXECUTED** |
| Grandfathered internal trials (`trialing` started before `2026-07-26`) | **PRODUCTION COUNT = NOT EXECUTED** |
| Live capped 3-day internal trials (not full premium in current code) | **PRODUCTION COUNT = NOT EXECUTED** |

**Do not report “AmyNest premium users = 2.”** That is the RevenueCat store number. AmyNest full access also includes manual/admin grants and grandfathered trials, which live in Postgres.

---

## 3. Exact current legitimate paid-subscriber count

### RevenueCat / stores (executed)

| Category | Count | Evidence |
|---|---:|---|
| Legitimate Google Play subscription (store id `GPA.3385-1127-8606-14254..2`, product `amynest_monthly:monthly`, proceeds USD 6.00 / gross 8.33, auto-renew on, period end **2026-09-25 08:34:59 UTC**) | **1** | RC subscription `store=play_store` |
| Legitimate Apple App Store subscription (store id `390002381830159`, product `amynest_yearly`, proceeds USD 9.33 / gross 15.73, auto-renew **off**, period end **2027-06-14 03:07:09 UTC**) | **1** | RC subscription `store=app_store` |
| RevenueCat Test Store active | **0** | Actives chart has no Test Store segment; overview total = Play+iOS |
| Stripe | **0 observed in RC** | Not an RC store; AmyNest code allows `provider=stripe` but no Stripe census was run |

**Of the 2 Play+Apple subscribers, 1 is the certification tester `champion6779@gmail.com`.** Treat that Play subscription as a **store-owned test/certification subscription**, not as organic consumer conversion.

**Organic (non-test) store paid subscribers in RevenueCat: 1** (Apple yearly).

**AmyNest `isPremiumSubscriberNow` (paid providers `razorpay|revenuecat|stripe` with future period end): PRODUCTION COUNT = NOT EXECUTED** (Postgres). Code would count the Apple user if the webhook/sync landed, and would **not** count Champion6779 if the certification force-free job is live in Coolify.

---

## 4. Exact suspicious / unpaid-premium count

### RevenueCat (executed)

**Suspicious RC entitlements (active `premium` with no store subscription / no revenue / unknown product): 0.**

Both active entitlements have:

- `ownership = purchased`
- `gives_access = true`
- a real store subscription identifier
- USD proceeds > 0
- product mapped to AmyNest SKUs (`amynest_monthly:monthly`, `amynest_yearly`)

### AmyNest DB (not executed)

**Suspicious AmyNest-premium-without-valid-source: PRODUCTION COUNT = NOT EXECUTED.**

Until Postgres is queried, this number is unknown. It is **not** “452” and **not** “2709”. Firebase custom claims are not a hidden premium switch (`0` users have `premium` in custom attributes).

---

## 5. Test / admin / legacy breakdown

### Intentionally approved test / license / certification

| Account | Role | Store premium | AmyNest premium (code intent) |
|---|---|---|---|
| `champion6779@gmail.com` (UID `dJTWbVUsjHhAjlXGfvnrgLaEWSx1`) | Play certification force-free list (`CERTIFICATION_FORCE_FREE_EMAILS`) | **Yes — active Play monthly in RC** | **Must be free** after `certificationPremiumReset.ts` |
| `googleplay.reviewer@amynest.app` | Hardcoded `HARDCODED_PREMIUM_EMAILS` | Unknown in this RC pair | Auto-grant `provider=manual` to 2099 |
| `amynestreview@amynest.in` | Hardcoded reviewer | Unknown | Auto-grant manual |
| One additional hardcoded email in `HARDCODED_PREMIUM_EMAILS` | Reviewer/internal | Unknown | Auto-grant manual |
| `tajkolli07@gmail.com` + phone `+918309772378` | `scripts/grantPremium.ts` allowlist (must already be in `admin_premium_grants` if the script was run) | Not in the RC active-2 set | Manual grant if table row exists |
| Play Console licence testers | Play Billing test accounts; **not** an AmyNest premium grant | Play may still report already-owned | Not an AmyNest allowlist |

Champion6779 is **not** in this Cloud Agent’s `ADMIN_PREMIUM_EMAILS`.

### Admin / internal (code vs this VM vs production Coolify)

| Mechanism | Grants full AmyNest premium? | Production size |
|---|---|---|
| `ADMIN_PREMIUM_UIDS` / `ADMIN_PREMIUM_EMAILS` / `ADMIN_PREMIUM_PHONES` | **Yes** — `maybeAutoGrantPremium` writes `provider=manual`, yearly, period end 2099 | **PRODUCTION COUNT = NOT EXECUTED** (Coolify). This Cloud VM has 1 email + 1 phone + 0 UIDs — **do not treat as Coolify**. |
| `HARDCODED_PREMIUM_EMAILS` (3 addresses) | **Yes**, production, no env required | **3 emails in source** (tiny, intentional) |
| `admin_premium_grants` table | **Yes**, if row exists | **PRODUCTION COUNT = NOT EXECUTED** |
| `ADMIN_USER_IDS` / `ADMIN_GROWTH_EMAILS` | **No** — growth/admin dashboards only (`growth-admin-access.ts`) | This VM: 1 UID + 1 email. Production unknown. **Does not auto-grant premium.** |
| Firebase custom claims | **No code path** (`setCustomUserClaims` not in repo). Census: **0** users with `premium` in custom attributes | **0** |

### Legacy / grandfathered

Internal 3-day age trial (`provider=none|manual`, `status=trialing`) is **not** full premium after `INTERNAL_TRIAL_CAP_ENFORCED_AFTER` (default `2026-07-26`). Grandfathered trials started before that date **are** `isPremiumNow=true` until `trialEndsAt`. **PRODUCTION COUNT = NOT EXECUTED.**

---

## 6. Screenshot diagnosis

### What the live screen shows (from the provided image)

- Plan card **Try the System** / ₹199.00 monthly is still selectable.
- Notice: **“This product is already active for the user.”**
- Primary CTA: **Continue with Google Play**
- Restore Purchases is visible.
- This is **not** the “AmyNest Premium is active” / manage-subscription state.

### Exact condition that produces the string

The string **does not exist in the AmyNest repository.** It is the RevenueCat Android SDK description for:

`PurchasesErrorCode.ProductAlreadyPurchasedError(6, "This product is already active for the user.")`

Official SDK: https://sdk.revenuecat.com/android/5.6.4/public/com.revenuecat.purchases/-purchases-error-code/-product-already-purchased-error/index.html  
Official meaning table: https://www.revenuecat.com/guides/revenuecat-android-sdk/error-handling — “This product is already active for the user” / refresh CustomerInfo.

**Code path:**

1. `artifacts/kidschedule/src/pages/pricing.tsx` — `onUpgradeNativeStore` → `nativeBilling.purchase(selected)`
2. On `!res.ok` and not user-cancelled: `setNotice(res.reason)` and `purchase_failed`
3. `artifacts/kidschedule/src/hooks/use-native-billing.ts` — Android branch returns `reason: result.error`
4. `android/app/src/main/kotlin/com/amynest/app/BillingBridge.kt` — `Purchases.sharedInstance.purchaseWith(..., onError = { err, userCancelled -> ... put("error", err.message) put("code", err.code.code) })`
5. Pricing renders `{notice}` in `.pricing-living-notice`

**Which system said the product is active?** Google Play Billing, via RevenueCat. **Not** AmyNest DB, **not** Firebase email, **not** localStorage.

**Why the purchase CTA is still visible:** `canPurchasePlan = !shouldSuppressPremiumMonetization(...)`. Suppress is true only when `isPremiumSubscriber` or `allPremiumAccess` (`isPremium`). A visible **Continue with Google Play** means AmyNest entitlements are **not** currently full premium.

**Why a “fresh” AmyNest account can see this:**

Play Billing is keyed to the **Play Store Google account on the device**, not the AmyNest Firebase login. RevenueCat then maps that Play ownership to an app user ID.

Proven production match: the only Android RC customer with an active `premium` entitlement **is** `champion6779@gmail.com`. A certification reset that force-frees AmyNest while leaving Play ownership intact **predicts this exact UI**.

Other non-bug ways a new AmyNest login sees the same error:

- Same phone / same Play Gmail previously purchased `amynest_monthly`.
- Licence tester Play account with an existing Play subscription, even if AmyNest is a new Firebase user.
- Restore never attached the Play purchase to this Firebase UID (app user mismatch), so AmyNest stays free while Play still owns the SKU.

**The screenshot does not prove that AmyNest granted premium without payment.** It proves Play refused a second purchase of an already-owned SKU.

---

## 7. Complete entitlement flow

```
Paywall (pricing.tsx)
  → nativeBilling.purchase(plan)
  → BillingBridge.setUserId(Firebase UID)
  → Purchases.purchaseWith(package)
  → Google Play Billing sheet
       FAIL ProductAlreadyPurchasedError → notice string, purchase_failed, NO AmyNest unlock
       SUCCESS storeTransaction (orderId / purchaseToken)
  → RevenueCat CustomerInfo
  → RevenueCat webhook POST /api/subscription/webhook
       (primary unlock path; POST /rc-sync is restore-only)
  → syncRevenueCatSubscription (RC V2 customer + active_entitlements + subscriptions)
  → applyRevenueCatSnapshot → AmyNest subscriptions row
  → GET /api/subscription → isPremiumNow / isPremiumSubscriberNow
  → frontend useSubscription (cache forced free until server resolves)
```

### Per-step source of truth and fail-closed behavior

| Step | Source of truth | Can premium activate incorrectly? |
|---|---|---|
| Catalog / product selection | RC offerings | **No.** Selecting a card does not grant premium. |
| Checkout button | UI only | **No.** |
| BillingBridge purchase error | Play / RC error | **No.** `ok: false`; pricing does not call success. |
| Purchase without token | Native success builder | Success still requires RC/webhook → `isPremiumSubscriber`. Finalize polls `/api/subscription`, not CustomerInfo alone. |
| Restore | `POST /api/subscription/rc-sync` `{purpose:"restore"}` then requires `isPremiumSubscriber` | **No** if RC has no active entitlement (`reason: no_active_entitlement` → snapshot FREE). |
| Cached frontend subscription | `asUiOnlyCachedSubscription` | **No.** Forces `isPremium=false` until `/api/subscription` resolves. |
| GET `/subscription` handler failure | `buildSubscriptionFallbackResponse` | **No.** `isPremium: false`. |
| RC V2 fetch failure | `syncRevenueCatSubscription` returns `isPremium: false` | **No.** |
| Missing expiration on RC snapshot | `deriveStateFromRevenueCatSnapshot` → `FREE` / `no_active_entitlement` | **No.** |
| Bare `status=active` without period end | `isPremiumNow` | **No.** Requires time-bound end (or bonus/trial dates). |
| Internal 3-day age trial | `isInternalTrialNow` | **Not full premium.** Feature-capped. |
| Grandfathered pre-2026-07-26 trial | `isGrandfatheredInternalTrial` | **Yes, intentional** until `trialEndsAt`. |
| Admin/manual allowlist | `maybeAutoGrantPremium` | **Yes, intentional**, production, tiny hardcoded list + env + DB table. |
| Certification Champion6779 | `certificationPremiumReset.ts` | Blocks stale RC writes from re-granting after reset. |
| Firebase custom claims | none | **No.** |
| `ADMIN_USER_IDS` / growth admin | dashboard only | **No.** |
| `FF_INFANT_PREMIUM` | infant UX flag | **No.** Not account premium. |
| Child vs account | `resolveSubscriptionOwnerUserId` / verified-email recovery | Can attach a **verified same-email** login to an existing premium owner. Intentional recovery, not a random-user leak. |
| Failed lookup default | free | **Unknown does not become premium.** Verified in `buildFreeEntitlements`, cache strip, RC sync failure, snapshot with no expiration. |

### Purchase-flow forensic answers

| Question | Answer |
|---|---|
| Can premium activate before payment? | **Not via Play/RC purchase path.** Manual/admin grant and grandfathered trial can, by design. |
| Can premium activate if Billing returns an error? | **No.** Error path sets notice and `purchase_failed`. |
| Can premium activate without purchaseToken/orderId? | Native success prefers those IDs but unlock is webhook/DB `isPremiumSubscriber`, not the token string. |
| Can premium activate from catalog selection alone? | **No.** |
| Can restore unlock without a valid RC entitlement? | **No.** Restore sync with no entitlement writes FREE. UI requires `isPremiumSubscriber`. |
| Can RC cached CustomerInfo unlock AmyNest? | **Not by itself.** Server `subscriptions` row is the API source of truth. |
| Can Firebase/admin flag unlock? | Admin **premium** env/emails/table yes. Firebase claims **no**. Growth admin **no**. |
| Can a mere subscription row existing unlock? | **No.** `isPremiumNow` requires a live time-bound state. |
| Can expired/cancelled still unlock? | Cancelled **with remaining `currentPeriodEnd`** yes (paid-through period). Expired / `FREE` no. |
| Can trial users get permanent premium? | Current capped internal trial: **no**. Grandfathered internal trial: premium **until trial end**, not 2099. Manual grant: **yes, to 2099** (intentional). |
| Can one user’s entitlement leak to another? | Only via **verified-email** identity recovery or RC Transfer (observed: Play original customer `batwvUd0UJV6o1Oh6QnbDbUeGfn2` now empty; current owner is Champion6779). Not a broadcast leak. |

---

## 8. Root cause(s)

### Root cause of the screenshot (PROVEN)

**Play already owns `amynest_monthly` for the device Play account, while AmyNest is showing a free paywall.**

Production identity match: the only Android RC active subscriber is **`champion6779@gmail.com`**, who is on the AmyNest certification force-free list. That is an **identity/store mismatch / leftover Play ownership**, not an AmyNest “everyone is premium” bug.

### Root cause of suspected mass unpaid premium (NOT SUPPORTED in RC)

RC has 2 actives, not hundreds. Firebase has 0 premium custom claims. Failed lookups default to free.

### Root causes that remain possible until Postgres is queried

1. `provider=manual` rows (allowlist / `admin_premium_grants` / `grantPremium.ts`) — intentional, size unknown in production.
2. Grandfathered internal trials still inside `trialEndsAt`.
3. Razorpay rows in AmyNest DB (no Razorpay API keys in this VM).
4. `healStaleSubscriptionRecord` extends **already-manual** rows missing a period end to 2099. That repairs admin grants; it would only leak if a row was wrongly `provider=manual`.

### What is not a leak

- Founder/growth admin lists (`ADMIN_USER_IDS`, `ADMIN_GROWTH_EMAILS`) do **not** grant premium.
- Age auto-trial does **not** set `isPremiumNow` after the 2026-07-26 cap.
- Client `localStorage` subscription cache is stripped to free.
- Feature flags named “premium” (infant UX) do not flip account entitlement.

---

## 9. Historical zero-conversion relationship

Prior conversion audit (`docs/product-growth/parent-conversion-paid-ads-readiness-2026-09-09.md`) reported analytics `purchase_success` = **0** (Jul 6 + Jul 13) and “effectively zero” paid conversion, while also recording **2** RevenueCat `INITIAL_PURCHASE` events on Jun 21.

**Today (2026-09-10) RevenueCat still has 2 active store subscriptions with real USD proceeds.** “Zero subscriptions” in analytics is **not** the same as zero store subscribers.

| Hypothesis | Class | Why |
|---|---|---|
| Users were already AmyNest-premium so they never needed to pay (mass leak) | **NOT SUPPORTED** | RC active premium = 2; screenshot still shows a buy CTA; 452 Firebase users are not entitled in RC |
| Checkout skipped because product appeared active in AmyNest | **NOT SUPPORTED** for the screenshot user | CTA still present; suppress-monetization would hide it |
| Play `ITEM_ALREADY_OWNED` blocked `purchase_success` for testers | **POSSIBLE** / **LIKELY for Champion6779** | Proven error path records `purchase_failed`, never `purchase_success` |
| RC entitlements without purchases | **NOT SUPPORTED** | Both actives have store ids + proceeds |
| AmyNest premium rows without purchase evidence | **NOT EXECUTED** (Postgres) | Cannot confirm or deny manual/Razorpay/grandfathered |
| Trials/admin/test included in conversion analytics | **POSSIBLE** historically | Internal trials existed; Champion6779 is a tester with a Play sub |
| `purchase_success` blocked because user already premium | **NOT SUPPORTED** for this screenshot | Purchase never succeeded; error returned first |
| Instrumentation change hid purchases | **POSSIBLE** | Store has 2 paid RC subs while historical `purchase_success` stayed 0 — tracking gap is real, leak is not proven |

**Do not claim the screenshot leak caused historical zero conversion.** Class: **NOT SUPPORTED.**

---

## 10. Security implications

Premium-only APIs use `isPremiumNow(sub)` from the **server `subscriptions` row** (`featureGate.ts`, hub gates, speech/TTS, etc.). A modified client setting `isPremium=true` does **not** satisfy those gates.

Fail-closed on unknown:

- GET `/subscription` error → `buildFreeEntitlements()` (`isPremium: false`)
- Client cache → forced free until server resolves
- RC sync miss → `isPremium: false`

Residual issues (not mass-leak, still real):

1. `routineGenerateGate` **fail-open** on thrown errors (`routine.generate_gate_failed_open`) — one feature can proceed if the gate throws; not full premium.
2. `maybeAutoGrantPremium` on every GET `/subscription` — anyone who can put an email in Coolify `ADMIN_PREMIUM_EMAILS` or `HARDCODED_PREMIUM_EMAILS` gets 2099 premium. List must stay tiny.
3. Verified-email identity recovery can move a new Firebase UID onto an existing premium owner. Correct for account recovery; dangerous if email verification were bypassed (code requires `emailVerified`).
4. Webhook `applyRevenueCatSnapshot` fallback can grant from webhook payload if V2 sync did not update DB — still requires expiration / supported event, not a blank lookup.

**A malicious frontend cannot mint production premium by flipping local state.**

---

## 11. Severity

| Issue | Severity | Status |
|---|---|---|
| Mass production users receiving full access without payment via RC/Firebase | **Not a P0 — not proven; RC evidence contradicts it** | Closed for RC+Firebase claims |
| Champion6779 / Play already-owned vs AmyNest force-free (screenshot) | **P1** certification and “real purchase test” blocker | Proven |
| Play already-owned blocking **real** new buyers who share a Play Gmail that previously subscribed | **P1** conversion | Possible; not counted |
| Postgres manual / grandfathered unpaid premium | **Unknown — keep open until SQL census** | NOT EXECUTED |
| Analytics `purchase_success` = 0 vs 2 RC store subs | **P2** measurement | Proven discrepancy |
| Routine generate gate fail-open | **P2** | Code |

**Founder label for “are we leaking premium to everyone?” → P0 suspicion, evidence says no for RC.**  
**Founder label for “can we run the next real Play purchase on Champion6779?” → No, P1 deadlock.**

---

## 12. Minimal remediation plan (DO NOT IMPLEMENT until approved)

This section is a plan only. **Nothing below was applied.**

1. **Do not revoke** the Apple yearly subscriber `CMrahNV1ckYv0ZOZ9BdEsPG0rk23`.
2. **Do not change** Play/Apple product IDs, prices, RC entitlement `premium`, or analytics event names.
3. For the screenshot / next purchase test:
   - Use a Play Gmail that has **never** owned `amynest_monthly`.
   - Sign into Play Store **and** AmyNest as that same account.
   - Do not use Champion6779 on a device whose Play account still owns the SKU.
   - Optional (founder-approved): in Play Subscriptions, cancel/refund the Champion6779 Play sub, or run the next test on a different physical Play account — **do not delete licence testers**.
4. After Coolify Postgres is reachable, run a **read-only** SQL classification (see §14). Only then decide whether any `provider=manual` rows are unexpected.
5. Product code worth considering later (not now): on `ProductAlreadyPurchasedError`, call restore / refresh CustomerInfo instead of only showing the raw SDK string; explain Play-account vs AmyNest-account mismatch. That is UX, not an entitlement grant.

---

## 13. Regression tests required (after any future remediation)

- GET `/subscription` fallback still returns `isPremium: false`.
- `isPremiumNow` false for missing `currentPeriodEnd`.
- `isInternalTrialNow` does not satisfy `isPremiumSubscriberNow`.
- `maybeAutoGrantPremium` only matches allowlisted emails/UIDs/phones.
- Champion6779 stays force-free unless a **new** `INITIAL_PURCHASE` after reset.
- Native purchase error path never sets `isPremiumSubscriber`.
- Restore with empty RC entitlements never sets paid subscriber.
- `ProductAlreadyPurchasedError` does not call `purchase_success`.

---

## 14. Production verification plan (read-only)

Run on Coolify Postgres (not this VM):

```sql
-- Counts only; do not dump emails in logs.
SELECT count(*) AS total_sub_rows FROM subscriptions;
SELECT provider, status, "subscriptionState", count(*)
FROM subscriptions GROUP BY 1,2,3;
SELECT count(*) FILTER (
  WHERE "currentPeriodEnd" > now()
    AND provider IN ('razorpay','revenuecat','stripe')
    AND (status IN ('active','canceled') OR "subscriptionState" IN ('ACTIVE','CANCELLED'))
) AS paid_subscriber_like;
SELECT count(*) FILTER (WHERE provider = 'manual' AND "currentPeriodEnd" > now()) AS manual_active;
SELECT count(*) FROM admin_premium_grants;
```

Then compare `revenuecat` user IDs to the two RC UIDs in this report.

Confirm Coolify `ADMIN_PREMIUM_EMAILS` / `UIDS` / `PHONES` length (values stay in the secret manager; report counts only).

---

## Classification table (as requested)

| Category | Users | Evidence |
|---|---:|---|
| Total users (Firebase Auth) | **452** | Identity Toolkit downloadAccount, 2026-09-10 |
| Total users (AmyNest `users` / children tables) | **NOT EXECUTED** | Postgres unreachable |
| Premium users (RC active `premium`) | **2** | RC V2 |
| Premium users (AmyNest `isPremiumNow`) | **NOT EXECUTED** | Postgres |
| Active paid subscribers (Play + App Store in RC) | **2** | Overview + subscriptions |
| Of which organic non-test | **1** (Apple) | Firebase lookup: not Champion6779 / not reviewer |
| Of which certification/test Play | **1** (`champion6779@gmail.com`) | Firebase lookup + RC Play sub |
| Active RC trials | **0** | Overview |
| Admin/manual premium | **NOT EXECUTED** | Postgres + Coolify env |
| Test/license-test users (known in code) | Champion6779 + 3 hardcoded reviewer emails + grantPremium.ts list | Source; DB grant table not queried |
| Legacy/grandfathered trials | **NOT EXECUTED** | Postgres |
| Premium with no valid source (RC) | **0** | Both RC actives have store ids + revenue |
| Free users incorrectly receiving RC premium | **0** | 132/134 identified RC customers have no active entitlement |
| Real users with AmyNest premium and no valid entitlement | **NOT EXECUTED** | Requires Postgres `isPremiumNow` minus paid/manual/test |

### Suspicious / notable identities (admin-safe)

| User ID | Email (admin-safe) | Premium state | Provider | Status | RC app user | Entitlement | Expiry | Trial | Admin/test | Class |
|---|---|---|---|---|---|---|---|---|---|---|
| `dJTWbVUsjHhAjlXGfvnrgLaEWSx1` | `champion6779@gmail.com` | RC Play **active**; AmyNest **intended free** | Play / RC | active, will renew | same UID; alias `$RCAnonymousID:3393c85e821842469d37d7a9859e6fcd`; original customer `batwvUd0UJV6o1Oh6QnbDbUeGfn2` (no current entitlement; not in Firebase) | `premium` | 2026-09-25 | no | **Yes — certification force-free** | Legitimate test leftover Play ownership; **not** a random-user leak |
| `CMrahNV1ckYv0ZOZ9BdEsPG0rk23` | gmail.com via Apple (email withheld) | RC App Store **active** | App Store / RC | active, will **not** renew | same UID | `premium` | 2027-06-14 | no | No (not Champion/reviewer/tajkolli) | **Legitimate paid** |
| `batwvUd0UJV6o1Oh6QnbDbUeGfn2` | not in Firebase | no active entitlement | — | — | historical Play original customer | none | — | — | Unknown deleted/old UID | Transfer source, not currently premium |

---

## Every `isPremium === true` path (audit matrix)

| SOURCE | CONDITION | DATA SOURCE | USER TYPE | INTENTIONAL? | CAN HIT PRODUCTION? |
|---|---|---|---|---|---|
| `isPremiumNow` paid/time-bound | `isStatePremium` or legacy active+future `currentPeriodEnd` | `subscriptions` | Paid RC/Razorpay/Stripe | Yes | Yes |
| `isPremiumNow` bonus | `bonusExpiresAt` in future | `subscriptions` | Bonus grant | Yes if used | Yes if rows exist |
| `isPremiumNow` grandfathered trial | `trialing` + `provider=none\|manual` started before 2026-07-26 + `trialEndsAt` future | `subscriptions` | Legacy trialists | Yes (compat) | Yes, size unknown |
| `isPremiumNow` internal trial | `isInternalTrialNow` | `subscriptions` | Age/manual 3-day trial | **Returns false** | N/A for full access |
| `isPremiumSubscriberNow` | paid provider + ACTIVE/CANCELLED + future end; rejects trial/grace/manual | `subscriptions` | Paid only | Yes | Yes |
| `maybeAutoGrantPremium` hardcoded emails | email in `HARDCODED_PREMIUM_EMAILS` | source | Reviewers | Yes | Yes, 3 emails |
| `maybeAutoGrantPremium` env | `ADMIN_PREMIUM_*` | Coolify env | Founder/admin | Yes | Yes; production list **NOT EXECUTED** |
| `maybeAutoGrantPremium` table | `admin_premium_grants` | Postgres | Manual grants | Yes | Yes; count **NOT EXECUTED** |
| `healStale` manual 2099 | `provider=manual` + `status=active` + no valid period end | Postgres | Admin grants | Yes (repair) | Yes if bad manual rows |
| Certification reset | Champion6779 | code + audit event | Tester | Yes (force **free**) | Yes |
| GET `/subscription` fallback | handler throw | none | everyone | Fail **free** | Yes |
| Client cache | localStorage | stripped to free | everyone | Fail **free** | Yes |
| RC CustomerInfo only | native SDK | not sufficient for API | native | No server unlock | No |
| Firebase claims | custom attributes | Auth | everyone | Unused | Census **0** |
| Growth admin | `ADMIN_USER_IDS` | env | staff | No premium | Dashboards only |
| Feature flags | `FF_INFANT_PREMIUM` etc. | Vite env | everyone | UX, not entitlement | Yes, not a leak |
| Restore rc-sync | RC V2 | RC | restorer | Only if RC entitled | Yes |
| Webhook | RC event + V2 sync | RC | purchasers | Yes | Yes |
| Identity recovery | verified email → existing premium owner | aliases + Firebase | same person new UID | Yes | Yes |
| Failed RC lookup | missing customer/entitlement | RC | anyone | **false** | Yes |
| Unknown state | default | — | anyone | **false** | Yes |

---

## Founder answers (explicit)

1. **How many users currently have full access?**  
   - **RC `premium` entitlement: 2.**  
   - **Firebase users: 452.**  
   - **AmyNest `isPremiumNow`: PRODUCTION COUNT = NOT EXECUTED** (Postgres).  
   Do not equate 452 or 2709 with premium.

2. **How many are genuinely paid?**  
   - **Store (RC): 2 subscriptions with Play/App Store IDs and USD proceeds.**  
   - **Organic non-test: 1 (Apple yearly).**  
   - **Play monthly is the certification account Champion6779.**  
   - **Razorpay: NOT EXECUTED.**

3. **How many are on valid trial?**  
   - **RC active trials: 0.**  
   - **AmyNest internal/grandfathered trials: NOT EXECUTED.**

4. **How many are admin/test/license users?**  
   - **Known in code:** Champion6779 (force-free) + 3 hardcoded premium emails + `grantPremium.ts` emails/phone.  
   - **Production `ADMIN_PREMIUM_*` and `admin_premium_grants` size: NOT EXECUTED.**  
   - **This Cloud VM’s `ADMIN_PREMIUM_EMAILS` count is 1 — not Coolify.**

5. **How many REAL users have premium without a valid entitlement?**  
   - **RC: 0** (both actives have valid store subscriptions; one is a tester).  
   - **AmyNest DB: PRODUCTION COUNT = NOT EXECUTED.**

6. **Why does the screenshot say “This product is already active for the user”?**  
   RevenueCat `ProductAlreadyPurchasedError` from Google Play (`ITEM_ALREADY_OWNED`), displayed as `res.reason` on pricing. AmyNest still shows the buy CTA because it does not currently treat that session as premium. Production RC’s only Android active subscriber is Champion6779, whose AmyNest access is force-freed — that is the matching explanation.

7. **Can this explain historical zero subscriptions?**  
   **NOT SUPPORTED** as a mass entitlement leak. **POSSIBLE** that already-owned Play errors produced `purchase_failed` instead of `purchase_success` for testers. **PROVEN** that RC is not at zero store subscribers today (2 actives).

8. **Is this a P0/P1?**  
   **Mass leak: not proven (not P0 on RC evidence).**  
   **Screenshot / next Play purchase on Champion6779: P1.**  
   **Postgres unpaid-premium question: still open.**

9. **What exact code path must be fixed?**  
   **No entitlement-grant path is proven broken.** The screenshot path is `pricing.tsx` → `use-native-billing.ts` → `BillingBridge.purchaseWith` `onError` → raw RC message, plus leftover Play ownership on the tester Play account vs `certificationPremiumReset.ts`. Do not “fix” by granting premium. Optional later UX: restore-on-already-owned + explain Play vs AmyNest account. Postgres census before any grant-list changes.

10. **Can we safely run the next real purchase test after remediation?**  
    **Not on Champion6779 / not on a Play Gmail that already owns `amynest_monthly`.** After a clean Play account (never owned the SKU) and the same Gmail in Play + AmyNest, a real purchase test can proceed **without** entitlement-code changes. Cancelling Play ownership requires founder approval in Play Console, not a code deploy.

11. **What must NOT be changed?**  
    Play/Apple products, prices, RC entitlement `premium`, the Apple paid user, analytics contracts, Firebase claims, mass revoke of testers/licence testers, Coolify `ADMIN_PREMIUM_*` until counted, production `subscriptions` rows.

12. **What production evidence is still missing?**  
    Coolify Postgres census (`subscriptions`, `admin_premium_grants`, grandfathered trials). Coolify `ADMIN_PREMIUM_*` counts. Razorpay dashboard/API. Confirmation that Coolify has deployed `certificationPremiumReset.ts` (screenshot CTA is consistent with it). Play Console licence-tester vs paid for Champion6779 (RC shows USD proceeds; Play may still be a tester).

---

## Blocker for AmyNest DB counts

**PRODUCTION COUNT = NOT EXECUTED** for AmyNest `subscriptions`.

- Agent `DATABASE_URL` hostname: `tcl9udyxcuq2zu598ebj0pfu` (Docker-style Coolify name).  
- `socket.getaddrinfo` → `Name or service not known`.  
- No Coolify SSH/token in this environment.  
- `BILLING_RECOVERY_SECRET` exists but `POST /subscription/rc-recover` **writes** RC mirrors — not used (read-only audit).  
- Razorpay keys are not present in this VM.

RevenueCat + Firebase Auth **were** queried read-only on 2026-09-10.

---

## Stop

No remediation, revoke, deploy, merge, product-code edit, or analytics change was performed. This audit stops here.
