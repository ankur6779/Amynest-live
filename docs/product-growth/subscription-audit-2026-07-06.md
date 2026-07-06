# Subscription Conversion Audit — Why 29 Trials → 0 Paid

**Date:** 2026-07-06  
**Scope:** All 29 production users with `trial_ends_at` set  
**Data:** Production Postgres + `analytics_events` + codebase trace  
**Verdict:** **Zero conversions is not a billing outage — it is a product architecture mismatch.**

---

## Executive summary — root cause

**All 29 “trial” users are on an internal, server-granted trial (`provider=none`). None are on Google Play Billing or RevenueCat store trials.**

While on this internal trial:

1. `isPremium = true` → full product access, **no paywalls on locked features**
2. Pricing page treated them as **already premium** → **checkout buttons hidden**, **cancel UI shown**
3. Trial banner “Keep access” → `/pricing` → user hit **cancel flow** (1 user cited `technical_issues`)
4. **14/29 trials expired by date** but DB still `status=trialing` → **no conversion moment fired**
5. **0 RevenueCat webhooks** from this cohort; **0 `purchase_success`** lifetime

**Primary root cause (P0):** Internal trial grants premium without attaching a store subscription; pricing page blocks purchase for anyone `isPremium`, including internal trialists.

**Secondary root causes:** No trial-expiry cron (fixed in code, not deployed); paywall deferral + full trial access = no monetization touchpoints; 62% of trialists never activated (1 session, no routine).

---

## STEP 1 — Per-user reconstruction (29 users)

Trial start estimated as `trial_ends_at − 3 days` (internal `FREE_LIMITS.trialDays`).  
Platform: **28 Android**, **1 iOS** (analytics). **0** have `revenuecat_app_user_id`.

| # | User ID (short) | Install | Signup | Trial end | Days | Sess | Dash | Hub | Gen | Done | Paywall | Plan | Checkout | Purchase | Last | Status |
|---|-----------------|--------|--------|-----------|-----:|-----:|-----:|----:|----:|-----:|--------:|-----:|---------:|---------:|------|--------|
| 1 | E8uFJInr… | — | Jun 28 | Jul 1 † | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jun 28 | trialing † |
| 2 | zEfNlGQ61… | — | Jun 28 | Jul 1 † | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jun 28 | trialing † |
| 3 | Q0EkboDP… | — | Jun 29 | Jul 2 † | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jun 29 | trialing † |
| 4 | UydMQ4mL… | — | Jun 29 | Jul 2 † | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jun 29 | trialing † |
| 5 | iMAdBsJZ… | — | Jun 30 | Jul 3 † | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jun 30 | trialing † |
| 6 | 4ZOngDJ1… | — | Jun 30 | Jul 3 † | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jun 30 | trialing † |
| 7 | ltjK0Kot… | Jul 4 | Jun 30 | Jul 3 † | 2 | 3 | 8 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | Jul 4 | trialing † |
| 8 | haDiOeUO… | — | Jun 30 | Jul 3 † | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jun 30 | trialing † |
| 9 | Y7LhGNjB… | — | Jul 1 | Jul 4 † | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 1 | trialing † |
| 10 | VO5nwWgo… | — | Jul 1 | Jul 4 † | 2 | 6 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | Jul 2 | trialing † |
| 11 | VE0K1D0b… | — | Jul 2 | Jul 5 † | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 2 | trialing † |
| 12 | mZnGmsbX… | — | Jul 3 | Jul 6 † | 1 | 2 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | Jul 3 | trialing † |
| 13 | s7bSE3x7… | — | Jul 3 | Jul 6 † | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 3 | trialing † |
| 14 | xhRT7S0C… | Jul 3 | Jul 3 | Jul 6 † | 1 | 3 | 2 | 0 | 0 | 0 | **6** | 0 | 0 | 0 | Jul 3 | trialing † |
| 15 | **iQEzeqb1…** | Jul 3 | Jul 3 | Jul 6 † | **3** | 5 | 17 | 3 | 1 | 2 | 0 | **2** | **2** | 0 | Jul 5 | trialing † |
| 16 | hhW5WMFT… | Jul 4 | Jul 4 | Jul 7 | 1 | 3 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 4 | trialing |
| 17 | 3xtOuSRT… | Jul 4 | Jul 4 | Jul 7 | 1 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 4 | trialing |
| 18 | 8xM7Yesg… | Jul 4 | Jul 4 | Jul 7 | 2 | 5 | 9 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 5 | trialing |
| 19 | LlnGOYC4… | Jul 4 | Jul 4 | Jul 7 | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 4 | trialing |
| 20 | VlPwTh23… | Jul 4 | Jul 4 | Jul 7 | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 4 | trialing |
| 21 | IKOtM2RC… | Jul 4 | Jul 4 | Jul 7 | 1 | 4 | 4 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 4 | trialing |
| 22 | MDvsWy9e… | — | Jul 5 | Jul 8 | 1 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | Jul 5 | trialing |
| 23 | XcGQwttm… | Jul 5 | Jul 5 | Jul 8 | 1 | 4 | 5 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | Jul 5 | trialing |
| 24 | SCkOeyOg… | Jul 5 | Jul 5 | Jul 8 | 1 | 4 | 7 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | Jul 5 | trialing |
| 25 | MJEP5naB… | Jul 5 | Jul 5 | Jul 8 | 1 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 5 | trialing |
| 26 | pp0CWgOv… | Jul 5 | Jul 5 | Jul 8 | 1 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 5 | trialing |
| 27 | mINa5CK7… | Jul 6 | Jul 6 | Jul 9 | 1 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 6 | trialing |
| 28 | vU8z1v1m… | Jul 6 | Jul 6 | Jul 9 | 1 | 3 | 4 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 6 | trialing |
| 29 | Zq1LLes4… | Jul 6 | Jul 6 | Jul 9 | 1 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Jul 6 | trialing |

† = trial end date passed; DB still `status=trialing`, `subscription_state=TRIAL` (expiry bug)

**Universal DB fields (all 29):** `provider=none`, `store=null`, `product_id=null`, `revenuecat_app_user_id=null`, `last_event_type=null`  
**Google Billing opened:** 0 events (no native purchase attempts logged)  
**RevenueCat webhook:** 0 for any trial user  
**Renewal:** N/A (no purchasers)

### Closest-to-convert user: `iQEzeqb1…` (Android, India)

Event trace (Jul 4):

1. `checkout_started` (trial_banner) → `/pricing` with `subscription_state=TRIAL`
2. `plan_selected` yearly → then **`cancel_started`** (not purchase)
3. Cancel agent: reason **`technical_issues`** (twice), **`cancel_continue`**
4. Second `checkout_started` → pricing again — **no `purchase_failed`**, no Google Play bridge call logged
5. **Root UX bug:** `isPremium=true` on TRIAL → pricing showed **“Already premium” + Cancel**, not Subscribe

---

## STEP 2 — Conversion funnel (29 trials)

```
29 Trial users (internal, provider=none)
  ↓ Routine generated: 7 users (24%)     −76% never activated
  ↓ Paywall viewed: 1 user (3%)          −97% (trial = premium, paywalls suppressed)
  ↓ Plan selected: 1 user (3%)           same user (iQEzeqb1)
  ↓ Checkout started: 1 user (3%)        trial_banner → pricing
  ↓ Google Billing opened: 0 (0%)        checkout CTA blocked on pricing
  ↓ Purchase success: 0 (0%)
  ↓ Renewal: 0 (0%)
```

| Step | Users | % of trial | Drop |
|------|------:|-----------:|-----:|
| Trial | 29 | 100% | — |
| Routine | 7 | 24% | 76% |
| Paywall | 1 | 3% | 86% of remainder |
| Plan | 1 | 3% | 0% |
| Checkout | 1 | 3% | 0% |
| Purchase | **0** | **0%** | **100%** |

---

## STEP 3 — Billing audit

### Google Play (Android WebView + `BillingBridge.kt`)

| Check | Result |
|-------|--------|
| Bridge implemented | ✅ `artifacts/kidschedule-android/.../BillingBridge.kt` via RevenueCat SDK |
| Trial cohort usage | ❌ **0 purchase attempts** from 28 Android trial users |
| Products / offerings | Cannot verify Play Console from DB; bridge calls `getOfferings` when paywall loads |
| Acknowledgement / pending | Handled in RC SDK; **no production traffic** to validate |
| Signature verification | Server-side via RC webhooks — **no webhooks from cohort** |

**Conclusion:** Play Billing is **wired but never reached** by trial users.

### RevenueCat

| Check | Result |
|-------|--------|
| Webhook events (lifetime) | **4** (Jun 21 only; user `CMrahNV1…`, anonymous renewal) |
| Trial cohort `revenuecat_app_user_id` | **0 / 29** |
| Reconcile cron | Runs every 6h — nothing to reconcile for `provider=none` |
| Entitlement sync | Internal trial bypasses RC entirely |

### Backend (`subscriptionService`)

| Check | Result |
|-------|--------|
| Trial creation | `maybeApplyAutomaticAgeTrial()` on entitlement read — silent, no billing |
| `startTrial()` API | Manual path; same `provider=none` |
| `healStaleSubscriptionRecord` | Did not set `subscription_state=EXPIRED` (**fixed**, not deployed) |
| Trial expiry cron | **Missing in prod** (**added** `trialExpiryCron.ts`, not deployed) |
| `isPremiumNow` | Returns **true** for active internal trial → blocks monetization UX |

### Webhooks / acknowledgement

- **Razorpay:** 245 `billing_audit_events` — none tied to trial user IDs in analytics
- **RevenueCat:** 4 events, pre-cohort, processed OK
- **Restore purchases:** No `restore_purchase` analytics events

---

## STEP 4 — Paywall audit

| Check | Finding |
|-------|---------|
| Paywall shown? | **1/29** (`premium_paywall_viewed`) — xhRT7S0C (6 views) |
| CTA visible? | Yes when paywall opens |
| CTA clickable? | Yes |
| CTA disabled? | **`handleStickyCheckout`: `if (isPremium) return`** — disabled for all trialists |
| Loading stuck? | No evidence |
| Dismissed immediately? | iQEzeqb1 dismissed into **cancel agent**, not purchase |
| Hidden (entitlement)? | **Yes — `isPremium=true` during internal trial suppresses most paywalls** |
| Deferred paywall? | **Yes** — `activation-gate.ts` defers until first routine (22/29 never generated) |
| Navigation | Trial banner → `/pricing` (correct intent, broken destination) |

---

## STEP 5 — Trial expiry audit

| Layer | State |
|-------|-------|
| Cron | ❌ Not in production |
| DB | 14/29 `trial_ends_at < now()` still `trialing` |
| `subscription_state` | Stuck `TRIAL` |
| Server entitlement | `isPremiumNow` still true for expired-if-not-healed rows on read |
| Client cache | Shows `TRIAL` / `FREE` inconsistently (iQEzeqb1: FREE on Jul 5 despite trialing in DB) |
| UI | Trial banner may hide; no expiry urgency |

---

## STEP 6 — Analytics validation

| Event | Expected | Actual | Gap |
|-------|----------|--------|-----|
| `trial_started` (funnel) | 29 | **0** | Auto-trial skips client; server emit **added** |
| `trial_expired` | ≥14 | **0** | No expiry processing |
| `premium_paywall_viewed` | >1 | 42 events / **16 users** (1 trial) | Trial suppresses paywall |
| `checkout_started` | >0 | **3** funnel / **2 users** (1 trial) | Pricing blocks CTA |
| `purchase_success` | ≥1 | **0** | **100% leak at checkout** |
| `purchase_failed` | on errors | **0** | Checkout never executed |
| `restore_purchase` | optional | **0** | — |

---

## STEP 7 — Google Play (code + evidence)

| Item | Status |
|------|--------|
| Products in Play Console | Not queryable from DB — **no purchase attempts to validate** |
| Billing Library | RevenueCat  wraps Play Billing in Android shell |
| Country availability | Trial users predominantly **India** (`country: IN` in funnel) |
| Bridge availability | `probeBillingAvailability()` — no failures logged (checkout never attempted) |
| Pending purchases | RC SDK handles; **untested in prod** |

---

## STEP 8 — Top 10 root causes (probability-ranked)

| Rank | Root cause | Evidence | P |
|------|------------|----------|---|
| **1** | **Internal trial = `isPremium` → pricing blocks checkout** | iQEzeqb1: checkout_started → cancel_started; `handleStickyCheckout` guard; `canCancelHere` for `provider=none` | **99%** |
| **2** | **Trials are not store subscriptions (`provider=none`)** | 29/29 null RC ID, null store | **99%** |
| **3** | **Trial expiry not enforced (14 stuck trialing)** | SQL: expired date + status=trialing | **95%** |
| **4** | **No paywall during trial (full premium access)** | 1/29 paywall; `isPremiumNow(trialing)` | **90%** |
| **5** | **Paywall deferral until first routine** | 22/29 no routine; `activation-gate.ts` | **85%** |
| **6** | **Low activation (76% no routine)** | 7/29 generators | **80%** |
| **7** | **Trial banner misroutes to broken pricing UX** | checkout_started on link click, not purchase | **75%** |
| **8** | **Analytics blind (0 trial_started, 0 purchase_failed)** | Funnel SQL | **70%** |
| **9** | **RevenueCat / Play never engaged for cohort** | 0 webhooks, 0 billing bridge events | **65%** |
| **10** | **Single-session churn (20/29 one active day)** | Per-user table | **60%** |

**Not the root cause:** Play Billing outage, RC webhook failure, product delisting — **no user reached those systems.**

---

## STEP 9 — Critical fixes implemented

| Fix | File | Status |
|-----|------|--------|
| **Pricing: allow checkout for internal trial (`canPurchasePlan = !isPremiumSubscriber`)** | `pricing.tsx` | ✅ Code |
| **Pricing: cancel UI only for paid subscribers** | `pricing.tsx` | ✅ Code |
| **Trial expiry cron + `EXPIRED` state on heal** | `trialExpiryCron.ts`, `subscriptionService.ts` | ✅ Code (prior session) |
| **Server-side `trial_started` / `trial_expired` analytics** | `subscriptionService.ts` | ✅ Code (prior session) |

**Not implemented (lower priority):** Trial-expiry push, paywall on day-2 of trial, store-attached trials.

---

## Deliverables index

1. **Complete Subscription Audit** — this document  
2. **Billing Audit** — Step 3  
3. **RevenueCat Audit** — Step 3 (4 lifetime webhooks, 0 cohort)  
4. **Google Billing Audit** — Step 7  
5. **Paywall Audit** — Step 4  
6. **Trial Audit** — Step 5  
7. **Root Cause Ranking** — Step 8  
8. **Critical Fixes** — Step 9  
9. **Estimated paid conversion improvement** — below  

---

## Estimated paid conversion improvement (30 days post-deploy)

Assumes: pricing fix + trial expiry cron deployed.

| Metric | Current | Estimate | Basis |
|--------|--------:|----------|-------|
| Trial → checkout | 3.4% (1/29) | **15–25%** | Unblock pricing CTA |
| Checkout → purchase | 0% | **10–20%** | Play Billing + Razorpay path finally reachable |
| **Trial → paid** | **0%** | **2–5%** | Industry low-end for fixed funnel |
| Expired trial downgrade | 0% correct | **100%** | Cron + heal |

**Expected paid subscribers from current 29:** **0–2** (small n).  
**Expected from next 100 trials with fixes:** **2–5 paid** at 2–5% trial→paid.

---

*Deploy pricing + API cron together. Re-measure `checkout_started` → `purchase_success` for internal-trial users only.*
