# Google Play subscription certification — operator checklist

**Date:** 2026-09-09  
**Status:** PRE-PURCHASE READY CHECKLIST. **P0-12 is NOT PASS.**  
**Do not simulate a purchase. Do not use the RevenueCat Test Store as a substitute.**  
**Do not mark P0-12 PASS until a real Play purchase on a physical Android device is verified through the full server chain.**

This document is the operator runbook for one real Google Play subscription on the shipped Android app (`android/` WebView wrapper, package `com.amynest.app`). Capacitor Android, Expo (`com.amynest.ai`), and debug APKs are out of scope.

---

## Verdict before you buy

| Question | Answer | Confidence |
|----------|--------|------------|
| 1. Which package to install | Play-signed **`com.amynest.app`** from Google Play (production **or** Internal/Closed testing). Never `com.amynest.app.debug`. Never a sideloaded unsigned/debug APK. | **Code-verified.** Live Play versionCode must be confirmed on the device. |
| 2. Subscription / product ID | Buy **monthly** `amynest_monthly` (RC package `$rc_monthly`, Play product `amynest_monthly:monthly`). Entitlement: **`premium`**. | **Code-verified.** Confirm the same IDs in Play Console + RevenueCat. |
| 3. Current build ↔ Play product | Release APK configures RevenueCat with public Play key `goog_…` (not `test_`). Package in Gradle is `com.amynest.app`. On-device proof is a native Play Billing sheet showing `amynest_monthly`. | **Code-wired.** Live RC ↔ Play package mapping cannot be confirmed from this agent (RevenueCat dashboard auth missing). |
| 4. Webhook / RTDN pipeline | AmyNest receives **RevenueCat webhooks** at `https://www.amynest.in/api/subscription/webhook`. Google Play RTDN is consumed by **RevenueCat**, not by AmyNest. New purchases unlock via webhook; restore uses `POST /api/subscription/rc-sync`. | **Code-ready.** Historical production evidence 2026-07-18. This agent cannot live-probe the endpoint (Cloudflare challenge from datacenter IPs). |
| 5. Test Google account | Use a Gmail that is a **Play Console license tester** and (if using a testing track) on that track’s email list. Do not invent an address. Sign that Gmail into Play Store **and** sign a real (non-guest) AmyNest account into the app. | **Operator-owned.** No tester email is stored in this repo. |
| 6–10 | Device steps, monitoring, restore, and fail/cancel are in the numbered runbook below. | — |

**P0-12 remains NOT PASS** until the handoff packet in §11 is filled and the SQL/log evidence matches.

---

## 1. Which production/release package to install

Install **only** a Play-signed build of:

| Field | Required value |
|-------|----------------|
| Play listing | https://play.google.com/store/apps/details?id=com.amynest.app |
| Application ID | `com.amynest.app` |
| Shell | `android/` WebView wrapper loading `https://www.amynest.in` |
| User-Agent | `AmyNestAndroid/1.0` |
| Billing bridge | `window.AmyNestBillingNative` |
| RevenueCat public SDK key | `goog_wswrltSsrqhqrsQrVvOPavTIzMA` (Play, not Test Store) |

**Do not install**

- `com.amynest.app.debug` (debug `applicationIdSuffix` — Play products will not resolve)
- Sideloaded `assembleRelease` / unsigned APK
- Capacitor Android under `artifacts/amynest-capacitor/android/`
- Archived Expo / `com.amynest.ai` (stale docs in `docs/android-internal-testing.md` — ignore that package)

**Which Play track**

1. Prefer **Play Store production** if that track already has a billing-capable wrapper (it does; Play listing was updated 2026-09-07).
2. Use **Internal / Closed testing** only if you uploaded a newer Play-signed AAB and opted the tester Gmail in. Testers must open the opt-in link once.
3. Repo checkout currently names `versionName = "1.4.60"` / `versionCode = 103`. That is **source**, not proof the device has it. Read the installed version on the phone.

**On-device identity check (before paywall)**

Settings → Apps → AmyNest AI:

- App name: AmyNest AI
- Package: `com.amynest.app` (not `.debug`)
- Record **version name** and **version code**
- Confirm it was installed by **Google Play**, not “unknown” / Files

If the package is `.debug` or the installer is not Play: **stop**. Do not purchase.

---

## 2. Which subscription / product ID AmyNest uses

Certification SKU (cheapest, easiest to cancel later):

| Layer | ID |
|-------|----|
| Play subscription product | `amynest_monthly` |
| Play base plan (seed + RC) | `monthly` → store identifier `amynest_monthly:monthly` |
| RevenueCat package | `$rc_monthly` |
| RevenueCat entitlement | `premium` |
| AmyNest plan key | `monthly` |
| Offering | `default` |

Other live products (do **not** buy these for this certification unless monthly is missing):

| Plan | Play product | RC package |
|------|----------------|------------|
| 6-month | `amynest_6month` (`amynest_6month:six-month`) | `$rc_six_month` |
| Yearly | `amynest_yearly` (`amynest_yearly:yearly`) | `$rc_annual` |

Server mapping (`productIdToPlan`) accepts any product ID that **starts with** `amynest_monthly` / `amynest_6month` / `amynest_yearly`.

Documented list prices (INR): monthly ₹199, 6-month ₹999, yearly ₹1599. **Trust the Play sheet on the device**, not this table.

---

## 3. Is the current build connected to the correct Google Play product?

### What is already true in code

- `AmyNestApp` configures Purchases with `BillingBridge.RC_API_KEY` = public `goog_` Play key (never a `test_` Test Store key).
- `applicationId` is `com.amynest.app`.
- Web paywall asks `/api/subscription/rc-config` for `offeringId: "default"` and `packageMap.monthly = "$rc_monthly"`.
- Native `purchase(packageId)` looks up that RC package and opens Play Billing via `Purchases.purchaseWith`.
- Success payload prefers Play **`orderId`**, falls back to **`purchaseToken`**.

### What you must confirm in dashboards (this agent cannot)

RevenueCat MCP is unauthenticated from this environment. Before buying, tick these in the **live** RevenueCat project (the July 2026 billing QA named it “AmyNest AI”, entitlement `premium` / `entld84a0126e2`):

- [ ] Android app package is **`com.amynest.app`**, not `com.amynest.ai` (the seed script still has the old package — **do not re-run seed blindly**).
- [ ] Play service account is linked and products import without error.
- [ ] Products `amynest_monthly`, `amynest_6month`, `amynest_yearly` are attached to entitlement **`premium`**.
- [ ] Offering **`default`** contains `$rc_monthly`, `$rc_six_month`, `$rc_annual`.
- [ ] Webhook URL is **`https://www.amynest.in/api/subscription/webhook`** (www, not apex).
- [ ] Webhook Authorization is `Bearer <REVENUECAT_WEBHOOK_SECRET>` matching Coolify.

Play Console:

- [ ] Monetize → Subscriptions shows `amynest_monthly` Active, base plan `monthly` Active, licensed for the tester’s country.
- [ ] Setup → License testing includes the tester Gmail.

### On-device proof the wiring is live (no purchase yet)

After signing in (not guest), open the paywall:

- [ ] Prices come from the store (Play formatted strings), not a hard-coded web fallback.
- [ ] Tapping Monthly opens the **Google Play** sheet, not Razorpay.
- [ ] Sheet product is monthly AmyNest / `amynest_monthly`.
- [ ] **Back out. Do not pay yet.** That is the fail/cancel rehearsal in §10.

If Razorpay appears inside the Android app: **stop**. Native billing is not attached (`wrapperPresent` / UA / bridge missing).

---

## 4. Backend / webhook / RTDN readiness

### Pipeline (authoritative)

```
Play Billing sheet
  → BillingBridge.purchase → RevenueCat SDK
  → RevenueCat validates with Google Play (RTDN is RC’s problem)
  → RC POST https://www.amynest.in/api/subscription/webhook
       Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>
  → insert revenuecat_webhook_events (idempotent on event_id)
  → syncRevenueCatSubscription (RC REST v2) + fallback applyRevenueCatSnapshot
  → subscriptions row: provider=revenuecat, isPremium from isPremiumNow()
  → app polls GET /api/subscription until entitlements.isPremiumSubscriber
```

**New purchases must not depend on `rc-sync`.** That endpoint is restore-only (`purpose: "restore"`). If the webhook never arrives, the paywall poll (~22s) will fail even if Play charged.

### Coolify env (names only — never paste secret values)

Confirm these exist on the **production** API:

- `REVENUECAT_WEBHOOK_SECRET`
- `REVENUECAT_V2_SECRET_KEY` (or the current REST secret the server uses)
- `REVENUECAT_PROJECT_ID`
- `REVENUECAT_ENTITLEMENT_ID` = `premium` (or unset; code defaults to `premium`)
- `DATABASE_URL` (production)

Optional but useful: `REVENUECAT_GOOGLE_PLAY_STORE_APP_ID`.

### Historical production evidence (not today’s live probe)

`docs/ops/commercial-launch-billing-qa.md` (2026-07-18): webhook at www, unsigned POST returned `invalid_webhook_signature`, RC ACTIVE×2 mirrored in DB.

### What this agent could not re-verify today

- `curl https://www.amynest.in/api/healthz` and the webhook URL from this datacenter received **Cloudflare managed challenge (403)**. That does **not** prove the webhook is down. RevenueCat’s servers historically reached it.
- Operator: from a non-challenged network (or Coolify logs), unsigned `POST /api/subscription/webhook` with `{}` must return **401** `invalid_webhook_signature`, not 503 `webhook_secret_unconfigured`, not 404, not HTML challenge.

### Cloudflare

RevenueCat webhook POSTs must bypass the browser challenge (WAF skip / IP allowlist). If Coolify shows no `webhook_received` after a real Play success, check CF first.

---

## 5. Which test Google account to use

Do **not** invent an email. Use the Gmail already on:

1. Play Console → Settings → License testing
2. The Internal/Closed testing email list **if** you install from a testing track
3. The device’s Play Store account (the account that will see the Play sheet)

Also required inside AmyNest:

- Sign in with **Google / email** so Firebase UID is a real user.
- **Do not purchase as a guest.** Guest checkout is blocked (`getGuestCheckoutBlock`). Purchasing while RevenueCat is still anonymous will not attach the webhook to the AmyNest user.

License testers still go through real Play Billing (often auto-refunded later). That **is** the certification path.

---

## 6. Exactly what to do on the physical Android device

Do the **cancel rehearsal first** (§10), then the real purchase. Record wall-clock times in IST and UTC.

### A. Environment

1. Sign the tester Gmail into Play Store. Remove extra Google accounts from Play if the sheet picks the wrong one.
2. Install AmyNest from Play (`com.amynest.app`). Uninstall any `.debug` build first.
3. Confirm package + version (§1). Screenshot App info.
4. Open AmyNest. Confirm the page is `www.amynest.in` (not a staging host).
5. Sign in (not guest). Screenshot the account email.
6. Optional: complete today’s plan so the outcome paywall is the one a real parent sees. You may also open Pricing / the paywall directly for this certification.

### B. Pre-purchase billing check (no charge)

7. Open paywall. Confirm Play prices and native sheet (§3).
8. Note AmyNest **user id** if visible in account/debug, or the signed-in email. You will need it for SQL.

### C. Fail / cancel rehearsal (no premium)

9. Tap Monthly → Play sheet → **Back / Cancel**.
10. Confirm: paywall still showing, no premium, no “purchase successful”.
11. Wait 60s. You will later confirm **no** `INITIAL_PURCHASE` webhook for this attempt.

### D. Real purchase

12. Start a timer. Tap Monthly → confirm the Play sheet → **complete payment**.
13. Screenshot the Play success / order confirmation. Copy **Order ID** (`GPA.xxxx`).
14. Stay in the app. Wait for premium unlock (poll window is about **22 seconds**: 0.5+1.2+2+3+4+5+6s).
15. Screenshot a gated surface that only paid subscribers get (not an internal trial banner).
16. Stop the timer. Write **Play success time** and **premium UI time**.

### E. Capture for the agent

17. Fill the handoff packet in §11. Do not cancel the subscription in Play until restore (§9) is done, unless you are only testing cancel-after-purchase (§10B).

---

## 7. Backend logs / events to monitor during the purchase

This Cloud Agent **cannot** tail production Coolify or query production Postgres from here (no prod DB URL; www is Cloudflare-challenged). Monitoring is:

1. **You** watch Coolify API logs + RevenueCat dashboard in real time.
2. **You** run the SQL below (or paste results back).
3. **This agent** certifies the chain only from those artifacts plus your device screenshots / Order ID.

### Coolify / API log strings (grep)

| When | Grep |
|------|------|
| Webhook accepted | `webhook_received` |
| Entitlement applied | `webhook_applied` |
| Webhook exception | `webhook_failed` |
| Duplicate RC event | `duplicate` / ignored types |
| Restore-only path (must **not** be the purchase path) | `[rc-sync] purchase finalize outcome` |

### RevenueCat dashboard

- Toggle **Sandbox vs Production**. License-tester Play purchases are often **Production** (not Test Store). Check both if empty.
- Customer → this AmyNest **Firebase UID** (after `Purchases.logIn`).
- Event: `INITIAL_PURCHASE`, product `amynest_monthly`, store Play Store.
- Transaction / Play order id present.

### Device logcat (optional, USB debugging)

```
adb logcat -s AmyNestApp:D BillingBridge:D Purchases:W
```

Expect `RevenueCat initialised` at process start. Purchase errors log on `BillingBridge`.

### First-party tables to watch

- `revenuecat_webhook_events`
- `billing_audit_events` (`webhook_received`, `webhook_applied`)
- `subscriptions`
- `analytics_events` (`subscription_funnel_event` step `purchase_success` / `subscription_active`, or `upgrade_completed`)

---

## 8. How verification will work (pass/fail)

Replace `:uid` with the AmyNest user id (Firebase UID). Replace `:order` with the Play Order ID if you have it. Window: from 2 minutes before Play success to 5 minutes after.

### 8.1 Purchase received (RevenueCat + webhook row)

```sql
SELECT event_id, event_type, app_user_id, transaction_id, original_transaction_id,
       environment, processing_status, processing_error, received_at, processed_at
FROM revenuecat_webhook_events
WHERE app_user_id = ':uid'
   OR payload::text ILIKE '%:uid%'
ORDER BY received_at DESC
LIMIT 20;
```

**PASS:** a new row with `event_type = 'INITIAL_PURCHASE'` (or `RENEWAL` only if this account already had Play history — then stop and use a clean tester), `processing_status = 'processed'`, `processing_error` null.  
**FAIL:** no row, `failed`, or only `ignored`.

### 8.2 Purchase token / Order ID received

On device: Play Order ID (`GPA.…`) from the sheet / Gmail receipt.

In webhook payload / RC event: `transaction_id` / `original_transaction_id` populated.

```sql
SELECT event_type, transaction_id, original_transaction_id,
       payload->'event'->>'transaction_id' AS payload_txn,
       payload->'event'->>'product_id' AS product_id,
       payload->'event'->>'store' AS store
FROM revenuecat_webhook_events
WHERE app_user_id = ':uid'
ORDER BY received_at DESC
LIMIT 5;
```

**PASS:** `product_id` starts with `amynest_monthly`, store is Play (`PLAY_STORE` / `play_store`), transaction id non-null. Order ID on the phone matches RC/Play Console.  
**FAIL:** empty transaction id, wrong product, Razorpay provider.

### 8.3 Backend verification

```sql
SELECT event_name, status, reason, provider_event_id, metadata, created_at
FROM billing_audit_events
WHERE user_id = ':uid'
  AND created_at > now() - interval '1 hour'
ORDER BY created_at DESC;
```

**PASS:** `webhook_received` then `webhook_applied` with `metadata.isPremium = true` (or equivalent).  
**FAIL:** `webhook_failed`, or applied with `isPremium=false` on INITIAL_PURCHASE.

### 8.4 Subscription entitlement created/updated

```sql
SELECT user_id, plan, status, provider, subscription_state, product_id, entitlement_id,
       store, environment, latest_transaction_id, original_transaction_id,
       current_period_end, expires_at, auto_renew_status, cancelled_at, last_event_type
FROM subscriptions
WHERE user_id = ':uid';
```

**PASS:**

- `provider = 'revenuecat'`
- `plan = 'monthly'`
- `subscription_state = 'ACTIVE'` (or `CANCELLED` only after you cancel in Play — not on first buy)
- `product_id` starts with `amynest_monthly`
- `entitlement_id = 'premium'` (or null if unset in env; premium still follows period end)
- `current_period_end` or `expires_at` in the **future**
- `isPremiumNow` would be true (future period end + paid state)

**FAIL:** `provider = 'none'` / `manual`, `subscription_state = 'FREE'`, missing period end, or premium from an internal 3-day trial (`provider` none/manual + `trialing`). Internal trial is **not** P0-12.

### 8.5 Premium unlocked in the app

- Paywall dismissed or “You’re premium”.
- A previously locked paid action works (extra routine beyond free cap, or the surface you screenshot).
- `GET /api/subscription` → `entitlements.isPremiumSubscriber = true` (paid RevenueCat, not trial).

**FAIL:** UI looks premium but API is trial-only; or Play charged and UI still free after 30s **and** webhook missing.

### 8.6 Unlock latency

| T0 | Play sheet success (your timer) |
| T1 | `revenuecat_webhook_events.received_at` |
| T2 | `subscriptions.last_event_at` / `billing_audit_events` `webhook_applied` |
| T3 | First time the app shows paid UI |

Target from the existing billing QA: **premium within 30s of purchase**.  
Client poll budget is ~22s after native success; webhook can land before that.

**PASS:** T3 − T0 < 30s **and** 8.1–8.5 pass.  
**FAIL:** UI unlocked from client RC cache but webhook never applied — that is **not** a server-chain pass. Wait and re-check SQL. If UI stays free past 30s, capture Coolify logs; do not retry-buy (duplicate charge). Use restore (§9) only after confirming Play + RC already show the entitlement.

---

## 9. Restore after a successful purchase

Do this **after** §8 PASSes, same Google account + same AmyNest login.

### 9A. Force-stop (no reinstall)

1. Android → Force stop AmyNest → reopen.
2. Confirm still premium without tapping Restore.

### 9B. Restore control

1. Open paywall / subscription screen → **Restore Purchases**.
2. Coolify may show `[rc-sync] purchase finalize outcome` with `synced: true`, `isPremium: true`.
3. Must **not** insert a second paid `subscriptions` row (table is one row per `user_id`).
4. Must **not** require a new `INITIAL_PURCHASE` webhook.

### 9C. Optional reinstall

1. Uninstall AmyNest. Reinstall from Play.
2. Sign in to the **same** AmyNest account (not a new guest).
3. Restore Purchases if still free after sign-in + 15s.
4. SQL: same `user_id`, still `provider=revenuecat`, same `original_transaction_id`.

**PASS:** premium returns; no second charge; no second subscription row.  
**FAIL:** restore grants premium with empty Play history, or restore no-ops while Play still shows the sub.

---

## 10. Cancel / failed purchase without accidentally granting premium

### 10A. Before any successful buy (required)

| Action | Expected | Must not happen |
|--------|----------|-----------------|
| Play sheet → Back / Cancel | `userCancelled: true`, paywall remains | `INITIAL_PURCHASE` webhook, `subscriptions` paid, `purchase_success` analytics |
| Decline / failed instrument (if Play shows it) | `purchase_failed` / error, still free | webhook applied with `isPremium=true` |

SQL after the cancel rehearsal (same `:uid`, last 10 minutes):

```sql
SELECT event_type, processing_status, received_at
FROM revenuecat_webhook_events
WHERE app_user_id = ':uid'
  AND received_at > now() - interval '10 minutes';
```

**PASS:** no `INITIAL_PURCHASE` from the cancelled sheet.

### 10B. After a successful buy — cancel in Play (do not expect instant downgrade)

Play → Payments & subscriptions → AmyNest → **Cancel**.

Expected:

- RevenueCat `CANCELLATION` webhook
- `subscriptions.subscription_state = 'CANCELLED'`
- `auto_renew_status = false`
- **`isPremiumNow` stays true until `current_period_end` / `expires_at`**
- App stays premium until period end

**Do not treat CANCELLATION as “failed purchase” and do not expect premium to drop immediately.** Immediate drop would be a bug.

Expiration (later): `EXPIRATION` webhook → `EXPIRED` / not premium. That is a follow-up, not required on the same day.

### 10C. What would accidentally grant premium (avoid)

- Purchasing as guest / anonymous RC user then signing in (transfer may or may not attach — not this certification).
- Hitting operator `rc-recover` / manual grant instead of Play.
- Treating Razorpay web checkout as Play certification.
- Using RC Test Store `test_` API key.

---

## 11. Handoff packet (paste back after the purchase)

Copy this block, fill it, send it with screenshots. P0-12 will be judged only from this plus SQL/log evidence.

```
P0-12 handoff
Date (UTC):
Device model / Android version:
Play track (production / internal / closed):
Installed package: com.amynest.app | versionName: | versionCode:
Installer: Google Play? yes/no
AmyNest account email:
AmyNest user id (Firebase UID):
Play license tester Gmail (same as Play Store?): yes/no

Cancel rehearsal (no pay):
  Time:
  Result: cancelled sheet, still free? yes/no

Successful purchase:
  Plan tapped: monthly
  Play product shown:
  Play Order ID:
  Purchase token (if shown, optional):
  T0 Play success (UTC):
  T3 premium UI (UTC):
  Latency seconds:
  Screenshot: Play success + premium UI attached? yes/no

RevenueCat customer URL or app_user_id:
RC event type seen:
RC environment (sandbox/production):

SQL pasted: webhook / audit / subscriptions / analytics? yes/no
Coolify snippet: webhook_received / webhook_applied? yes/no

Restore 9A/9B done? 
Play cancel 10B done? (optional same day)

Operator notes:
```

---

## 12. P0-12 gate (do not tick until evidence exists)

| Gate | Status now | Pass when |
|------|------------|-----------|
| Real Play purchase on physical device | **NOT DONE** | Handoff packet + Order ID |
| Purchase token / Order ID on server | **NOT DONE** | SQL 8.2 |
| Backend verification | **NOT DONE** | `webhook_applied` |
| Entitlement row | **NOT DONE** | `provider=revenuecat`, future period end |
| Premium in app | **NOT DONE** | `isPremiumSubscriber` + screenshot |
| Unlock &lt; 30s | **NOT DONE** | T3 − T0 |
| Restore | **NOT DONE** | §9 |
| Cancel/fail does not grant | **NOT DONE** | §10A before buy |

**P0-12 = PASS** only when every row above is evidenced. Until then: **NOT PASS.** Not ads-ready.

---

## Appendix A — Do-not-use documents

| Doc | Why it is wrong for this run |
|-----|------------------------------|
| `docs/android-internal-testing.md` | Expo / `com.amynest.ai` |
| `artifacts/api-server/scripts/seedRevenueCat.ts` Play package | Seeds `com.amynest.ai` |
| Capacitor Android tree | Not the Play Store app |

## Appendix B — Code map

| Concern | Location |
|---------|----------|
| Play wrapper + RC init | `android/app/src/main/kotlin/com/amynest/app/AmyNestApp.kt` |
| Play purchase / restore / orderId | `android/app/src/main/kotlin/com/amynest/app/BillingBridge.kt` |
| Web bridge | `artifacts/kidschedule/src/lib/native-billing.ts` |
| Purchase + poll | `artifacts/kidschedule/src/hooks/use-native-billing.ts`, `native-purchase-finalize.ts` |
| Webhook + rc-config | `artifacts/api-server/src/routes/subscription.ts` |
| Snapshot / plan IDs | `artifacts/api-server/src/services/subscriptionStateService.ts` |
| Paid vs trial | `artifacts/api-server/src/services/subscription-premium-gate.ts` |
