# Production Launch Report — Revenue Recovery Sprint

**Date:** 2026-07-07  
**Release Manager:** Static verification (no code changes, no live purchase)  
**Target commit:** `51a586a00` — `fix(subscription): revenue recovery sprint`  
**Verdict:** **NO-GO** — sprint code is **not confirmed live** in production

---

## STEP 1 — Deployment verification

| Component | Expected | Observed | Status |
|-----------|----------|----------|--------|
| **Git commit** | `51a586a00` on `origin/main` | `origin/main` = `aa19391eb` (amy-3d); local `main` **ahead by 1** unpushed commit | ❌ |
| **Frontend (www.amynest.in)** | Bundle contains sprint markers | `assets/index-DN6PX9yN.js` — **no** `canPurchasePlan`, `internalTrialExpired`, `trial_expired_banner`, `Continue Premium` | ❌ |
| **Frontend deploy time** | After `51a586a00` (~Jul 6 18:33 UTC) | `last-modified: Mon, 06 Jul 2026 18:02:09 UTC` | ⚠️ Pre-sprint |
| **API (api.amynest.in)** | Trial expiry cron + entitlement fields | Prod DB: **15** stuck `trialing` past `trial_ends_at`; **0** `subscription_state=EXPIRED` | ❌ |
| **Android (Play)** | WebView loads live site; native shell `1.4.45` (88) | `android/app/build.gradle.kts` — billing bridge present; **no APK change required** for sprint (web+API only) | ⚠️ Depends on web deploy |

**Conclusion:** User stated sprint deployed; **static evidence does not confirm it.** Push `51a586a00` and redeploy **API + static** before manual billing QA.

---

## STEP 2 — Subscription lifecycle (static code trace)

```
Internal Trial (provider=none, maybeApplyAutomaticAgeTrial / startTrial)
  ↓ isPremium=true, isPremiumSubscriber=false
Pricing (/pricing)
  ↓ canPurchasePlan = !isPremiumSubscriber  [51a586a00]
  ↓ isAndroidNative → nativeBilling.purchase(plan)
Google Play Billing (BillingBridge.kt → RevenueCat SDK → purchaseWith)
  ↓ RC acknowledges via Play Billing Library
RevenueCat
  ↓ INITIAL_PURCHASE webhook
Webhook POST /api/subscription/webhook
  ↓ applyRevenueCatSnapshot / syncRevenueCatSubscription
Entitlement GET /api/subscription
  ↓ isPremiumSubscriber=true, provider=revenuecat
Premium UI unlocked
  ↓ trackSubscriptionEvent(purchase_success)
Analytics subscription_funnel_event + premium_paywall_viewed
```

**Static audit:** Path is **wired end-to-end in repo**. **Not verified live** until deploy + manual purchase.

---

## Static Billing Verification Report

### BillingBridge.kt (`android/` — shipped Play shell)

| Check | Status | Notes |
|-------|--------|-------|
| Bridge installed | ✅ | `MainActivity.kt` → `BillingBridge.installOn` |
| Origin trust | ✅ | `WebViewOrigins.isTrustedAmyNestHost` |
| Actions | ✅ | `isAvailable`, `setUserId`, `getOfferings`, `purchase`, `restore`, `getCustomerInfo` |
| Purchase flow | ✅ | `getOfferings` → `findPackage` → `purchaseWith(PurchaseParams)` |
| User cancel handling | ✅ | `userCancelled` in error payload |
| Restore | ✅ | `restorePurchasesWith` |
| RevenueCat init | ✅ | `AmyNestApp.initRevenueCat()` with `goog_wswrltSsrqhqrsQrVvOPavTIzMA` (fallback in gradle) |
| Acknowledgement | ✅ | Delegated to RevenueCat / Play Billing Library |

### RevenueCat integration

| Check | Status | Notes |
|-------|--------|-------|
| Android SDK | ✅ | `purchases` + optional Paywall UI |
| iOS | ✅ | Capacitor `native-billing-ios.ts` |
| RC config API | ✅ | `GET /api/subscription/rc-config` |
| Package map | ✅ | `monthly: $rc_monthly`, `six_month: $rc_six_month`, `yearly: $rc_annual` |
| Entitlement ID | ✅ | `REVENUECAT_ENTITLEMENT_ID` default `premium` |
| Webhook | ✅ | `POST /api/subscription/webhook` + bearer auth |
| Restore sync | ✅ | `POST /api/subscription/rc-sync` purpose `restore` |
| Purchase finalize poll | ✅ | `finalizeNativePurchase` polls up to ~21s |

### Google Play product IDs (code mapping)

| Plan | RC package | Play product prefix (webhook) |
|------|------------|-------------------------------|
| Monthly | `$rc_monthly` | `amynest_monthly*` |
| 6-month | `$rc_six_month` | `amynest_6month*` |
| Yearly | `$rc_annual` | `amynest_yearly*` |

**Manual verify in Play Console:** products active, base plans, country IN, closed testing track.

### Pricing / paywall (sprint fix)

| Check | Status | Notes |
|-------|--------|-------|
| Trial can purchase | ✅ Code | `canPurchasePlan = !isPremiumSubscriber` |
| Cancel hidden for trial | ✅ Code | `canCancelHere = isPremiumSubscriber && …` |
| Paywall modal CTA | ✅ | No `isPremium` block on native/Razorpay buttons |
| Paywall deferral pre-routine | ✅ | `activation-gate.ts` |
| Trial reminders | ✅ Code | `SubscriptionTrialBanner` day-2 / last-day copy |
| Expired trial banner | ✅ Code | `SubscriptionTrialExpiredBanner` |
| Post-routine premium CTA | ✅ Code | `SubscriptionPostActivationBanner` |

### Trial expiry (sprint)

| Check | Status | Notes |
|-------|--------|-------|
| Cron scheduled | ✅ Code | `trialExpiryCron.ts` hourly `:05` IST |
| Sweep query | ✅ | `status=trialing`, `trial_ends_at < now`, `provider=none` |
| Heal sets EXPIRED | ✅ | `healStaleSubscriptionRecord` |
| API field | ✅ | `internalTrialExpired` on entitlements |
| **Prod DB heal** | ❌ | 15 stuck trials as of audit |

### Analytics (taxonomy)

| Event | Emitter | Prod (7d) |
|-------|---------|-------------|
| `trial_started` | Server auto/manual trial + client | **0** |
| `trial_expired` | Server heal + client check | **0** |
| `paywall_opened` / `premium_paywall_viewed` | paywall-context, pricing | Existing |
| `plan_selected` / `plan_card_viewed` | pricing, paywall | Existing |
| `checkout_started` | pricing, paywall, banners | Existing |
| `purchase_success` | pricing, paywall | **0 lifetime** |
| `purchase_failed` | pricing, paywall on error | **0** |
| `restore_purchase` | **Not in taxonomy** | Use restore button + `rc-sync` logs |

---

## Manual QA Checklist

### Pre-flight (release manager)

- [ ] Push `51a586a00` to `origin/main`
- [ ] Deploy **Amynest-backend** (Docker API)
- [ ] Deploy **Amynest-live-1** (static kidschedule)
- [ ] Confirm prod bundle contains `trial_expired_banner` or `internalTrialExpired`
- [ ] Confirm API logs: `Trial expiry cron scheduled`
- [ ] Confirm DB: stuck trialing count drops to 0 after cron

### Closed testing purchase (one real transaction)

**Account:** Play Closed Testing tester  
**Device:** Android app v1.4.45+ from Play (loads www.amynest.in)

1. [ ] Sign in with fresh or internal-trial account
2. [ ] Confirm trial active (`subscription_state=TRIAL` on screen_view props)
3. [ ] Tap trial banner **Subscribe** → `/pricing?plan=yearly&source=trial_banner`
4. [ ] Confirm **Google Play CTA visible** (not “Already premium”, not Cancel)
5. [ ] Select yearly plan → tap subscribe
6. [ ] **Google Play sheet opens**
7. [ ] Complete test purchase (license tester / test card)
8. [ ] App shows success toast / premium state
9. [ ] `purchase_success` in analytics (within 5 min)
10. [ ] `revenuecat_webhook_events` new `INITIAL_PURCHASE` row
11. [ ] `subscriptions`: `provider=revenuecat`, `status=active`, `isPremiumSubscriber=true`
12. [ ] Kill app → reopen → premium persists
13. [ ] Tap **Restore purchases** → still premium

### Trial expiry path

1. [ ] Use account with `trial_ends_at` in past (or wait)
2. [ ] After cron: `status=free`, `subscription_state=EXPIRED`
3. [ ] Dashboard shows **“Your free trial has ended”** banner
4. [ ] Pricing shows checkout CTAs
5. [ ] `trial_expired` analytics event

### Regression smoke

- [ ] Generate routine (free/trial)
- [ ] Dashboard loads
- [ ] Analytics `screen_view` fires
- [ ] API `/health` returns ok
- [ ] No new crash spikes

---

## Expected Logs

### API (Render)

```
Trial expiry cron scheduled { expr: '5 * * * *', tz: 'Asia/Kolkata' }
Expired internal trials healed { scanned: N, healed: N, job: 'trial_expiry_sweep' }
[rc-sync] purchase finalize outcome { userId, synced, isPremium: true, plan: 'yearly' }
```

Webhook processing:

```
billing_audit webhook_received eventType: INITIAL_PURCHASE
```

### Android logcat

```
AmyNestApp: RevenueCat initialised
BillingBridge: (no billing_unavailable / package_not_found)
```

### Client (analytics_events)

See table below.

---

## Expected Analytics Events (purchase happy path)

| Order | Event | Key props |
|-------|-------|-----------|
| 1 | `subscription_funnel_event` | `step=trial_started` (server, on trial grant) |
| 2 | `subscription_funnel_event` | `step=checkout_started`, `source=trial_banner` |
| 3 | `subscription_funnel_event` | `step=paywall_opened` or `plan_card_viewed` |
| 4 | `subscription_funnel_event` | `step=plan_selected`, `plan=yearly` |
| 5 | `subscription_funnel_event` | `step=checkout_started`, `source=pricing` |
| 6 | `upgrade_started` | `entitlement_state=trial` → `premium` |
| 7 | `subscription_funnel_event` | `step=purchase_success`, `plan=yearly` |
| 8 | `premium_paywall_viewed` | (if paywall_opened mapped) |

On failure: `step=purchase_failed` with `source=pricing` or `paywall_modal`.

---

## Expected RevenueCat Webhooks

| Event | When | DB effect |
|-------|------|-----------|
| `INITIAL_PURCHASE` | First paid subscription | `subscriptions` → ACTIVE, provider revenuecat |
| `RENEWAL` | Subscription renews | `currentPeriodEnd` extended |
| `CANCELLATION` | User cancels | `cancelAtPeriodEnd` / CANCELLED state |
| `EXPIRATION` | Lapsed | EXPIRED / free |

Webhook row: `revenuecat_webhook_events.processing_status = processed`.

---

## Expected Database Changes

### After trial expiry cron

```sql
-- Before: status='trialing', trial_ends_at < now()
-- After:
status = 'free'
subscription_state = 'EXPIRED'
provider = 'none'
trial_ends_at = NULL
expired_at = <now>
```

### After successful Play purchase

```sql
status = 'active'
subscription_state = 'ACTIVE'
provider = 'revenuecat'
store = 'PLAY_STORE'
product_id = 'amynest_yearly...'
revenuecat_app_user_id = <firebase uid>
isPremiumSubscriber = true (via API entitlements)
```

---

## Expected UI Changes (post-deploy)

| User state | Dashboard | Pricing |
|------------|-----------|---------|
| Internal trial active | Amber trial banner + day-2/last-day copy | Plan cards + **Play CTA** (not Cancel) |
| Internal trial expired | “Continue Premium” banner | Full checkout |
| Paid subscriber | No trial banner | “Already premium” + manage/cancel |
| Free post-routine | Post-activation “Go Premium” banner | Checkout available |

---

## Regression (static — prod signals)

| Area | Status | Evidence |
|------|--------|----------|
| API up | ✅ | `https://amynest-backend-dykj.onrender.com/health` → `ok:true` |
| Web up | ✅ | `https://www.amynest.in/` → HTTP 200 |
| Routines | ⚠️ | Not re-tested live; no deploy regression signal |
| Analytics spine | ✅ | `analytics_events` receiving events |
| Crashes | ⚠️ | No Sentry query in this audit |
| Stuck trials | ❌ | 15 rows — **regression risk** for entitlement truth |

---

## Remaining risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Sprint not deployed | **P0** | Push + deploy API + static |
| Trial cron not run | **P0** | Verify log + DB after API deploy |
| Play products misconfigured | **P1** | Play Console + RC offering `default` |
| Webhook secret / URL | **P1** | RC dashboard → `https://api.amynest.in/api/subscription/webhook` |
| Purchase finalize timeout | **P2** | 21s poll; user sees “activating” + Restore |
| `restore_purchase` analytics gap | **P3** | Rely on `rc-sync` logs for now |
| Android shell loads stale CDN | **P2** | Hard refresh / cache bust after static deploy |

---

## Go / No-Go recommendation

### **NO-GO** for production billing certification

**Reasons:**

1. Commit `51a586a00` is **not on `origin/main`** (unpushed).
2. Production JS bundle **does not include** revenue recovery code.
3. Production DB shows **15 expired-but-trialing** users — trial expiry **not active**.
4. **Zero** `purchase_success` and **zero** RC webhooks in 7 days (expected until first manual test).

### **GO** after:

1. Deploy sprint to API + static  
2. Confirm stuck trial count → 0  
3. Complete **one** closed-testing purchase with checklist above  
4. Observe `INITIAL_PURCHASE` webhook + `purchase_success` + `isPremiumSubscriber=true`

---

## Deliverables index

1. Static Billing Verification Report — above  
2. Manual QA Checklist — above  
3. Expected Logs — above  
4. Expected Analytics Events — above  
5. Expected RevenueCat Webhooks — above  
6. Expected Database Changes — above  
7. Expected UI Changes — above  

**Release successful only after one complete verified production purchase.**
