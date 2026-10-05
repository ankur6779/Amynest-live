# AmyNest AI — Acquisition Executive Summary

**Confidential. Prepared for a potential acquirer.**
**Date:** 14 September 2026
**Legal operator named in product copy:** AmyWorld (App Store seller: “Amyworld”)
**Product:** AmyNest AI — family growth / parenting OS for children ages 0–12
**Domain:** https://www.amynest.in
**This document is not an offer. It is a buyer-readiness and valuation memorandum based on repository inspection plus live RevenueCat, Google Ads, and Meta Ads reads on 14 Sep 2026.**

---

## What is AmyNest?

AmyNest is a **freemium consumer parenting platform**, not a single-feature chatbot. The shipped product combines daily routines, parent AI coaching, speech practice, learning (phonics, spelling, math, olympiad), nutrition, infant care, and a Parent Hub organized as four “rooms” (Help, Understand, Care, Moments). Parents hold the account; children 0–12 are profiles.

**Source:** `lib/subscription-marketing/src/index.ts`; `docs/AMYNEST_PHILOSOPHY.md`; `docs/v2/PARENT_HUB_CONSTITUTION.md`; `artifacts/kidschedule/src/AppCore.tsx`.

## Why should I care?

You should care **only if you are buying a built parenting OS and live store listings**, not if you are buying cash flow.

What is already built is unusually complete for a five-month-old product (first git commit 8 Apr 2026; 2,818 commits through 13 Sep 2026): production web, iOS (Capacitor), Android (Play Store WebView wrapper), RevenueCat + Google Play + App Store + Razorpay billing, Firebase auth, FCM/APNs, Postgres, Coolify + Hetzner + Cloudflare, and a large AI feature surface.

What is **not** built is a business. Live RevenueCat economics on 14 Sep 2026:

| Metric | Value | Source |
|--------|-------|--------|
| Active paid subscriptions | **3** | RevenueCat overview, project `proj9c1919f0` |
| Active trials | **0** | Same |
| MRR | **$5** | Same |
| Lifetime gross revenue (19 Apr–14 Sep 2026) | **$26.14** | RevenueCat `get-revenue-metric` |
| Lifetime proceeds (net of tax + store commission) | **$16.83** | Same, `revenue_type=proceeds` |
| 7-day conversion of new RC customers to paying | **1 of 2,728 (0.04%)** | RevenueCat conversion-to-paying chart |
| RC active users, last 28 days | **283** | RevenueCat overview |

Razorpay (India web) cash collections: **NOT VERIFIED FROM CODEBASE** (no live Razorpay API was queried). Play Store download count: **NOT VERIFIED FROM CODEBASE**. App Store: **not enough ratings to display** (listing fetched 14 Sep 2026).

## What am I acquiring?

| Bucket | Included if the seller can transfer it |
|--------|----------------------------------------|
| Software/IP | pnpm monorepo: React SPA, Express API, 88 `lib/` packages, content-engine, native shells |
| Mobile | iOS `com.amynest.app` (App Store ID 6767664343); Android `com.amynest.app` WebView wrapper |
| Backend | Express 5, Postgres/Drizzle, Redis/BullMQ AI worker, ~50 SQL migrations |
| Brand | AmyNest AI, Amy mascot, store listings, `amynest.in` |
| Billing | RevenueCat entitlement `premium`; Play/App Store IAPs; Razorpay India web |
| Ads/analytics | Google Ads account “Amynest AI”; Meta “AMYNESTAI” + “Amy World AD”; first-party Postgres analytics |
| Users | **Not a meaningful user-base acquisition.** 3 paid subscribers. 283 RC 28-day actives. |

Corporate formation documents, cap table, IP assignment from contractors, and proof that the Indian provisional patent was actually filed are **MISSING from the repository**.

## What is already built?

Verified in code, not claimed from a pitch:

- Production subscription architecture with a single `premium` entitlement (`artifacts/kidschedule/src/lib/native-rc-paywall.ts`; `artifacts/api-server` RevenueCat webhook at `/api/subscription/webhook`).
- Google Play Billing via Android `BillingBridge` and RevenueCat Play app `app7b7fc89f20` (package `com.amynest.app`).
- Apple IAP via Capacitor Purchases and RevenueCat App Store app `appa31011b39a`. Live App Store IAP prices: $4.99 / $24.99 / $39.99.
- India web checkout via Razorpay at ₹199 / ₹999 / ₹1499 (`subscriptionService.ts`).
- Firebase Authentication (email, Google, Apple, Facebook).
- Feature-gated freemium limits (1 child / 1 device / 10 AI queries per day on free; Health Lab, activities, downloads premium-only).
- Admin Growth OS at `/admin/growth/*` querying first-party Postgres.
- ~999 test files and multiple GitHub Actions release gates.

## What is the monetization model?

**VERIFIED:** Freemium subscription. No in-app ads. One entitlement (`premium`). Three plans.

**INFERRED:** India is the home market for Razorpay + INR display; USD is the App Store / fallback catalog.

**UNKNOWN:** Live Razorpay MRR; store-localized prices outside the App Store US listing; true COGS (OpenAI, ElevenLabs, infra).

Paid ads exist but do not produce subscriptions. Last 90 days Google Ads spend **₹18,929 (~$198 at USD/INR 95.5)** generated 2,354 Google “conversions” with only **₹103 conversion value** — those events are not paid subscriptions. Meta AMYNESTAI reports **718 `mobile_app_install`** on **₹12,712** lifetime spend. RevenueCat still shows **3** paying subscriptions.

## What traction is verified?

**Live (14 Sep 2026):** $5 MRR, 3 paid, $26.14 lifetime RC gross, 283 RC 28-day actives, 0 active trials.

**Stale but measured (Postgres, 13 Jul 2026, `analytics-growth-report.md`):** 274 device registrations / 30 days; D1 retention 5.2%; D7 2.4%; 0 `purchase_success` events in that window; estimated MRR ₹324 from 2 RC subs. Treat as historical, not current.

**Do not use:** any MAU/DAU, ARR, LTV, or CAC figure that is not in the tables above. Those are **NOT VERIFIED FROM CODEBASE** as current operating metrics.

## What is the realistic valuation?

| | USD |
|--|-----|
| Current realistic valuation | **$15,000 – $40,000** |
| Likely buyer offer | **$10,000 – $25,000** |
| Aggressive asking price | **$65,000** |
| $100,000 probability | **LOW** |

2026 small-software comps (Acquire.com / BigIdeasDB; Livmo; OEB Digital) price businesses on **2–4x revenue or 2–5x SDE**. AmyNest’s implied ARR from live MRR is **~$60**. Profit is not verified and is directionally negative after ~$383 of measured ad spend versus $26 of RC revenue. A financial multiple therefore values the **going concern near $0**. The $15k–$40k range is an **asset floor**: code, listings, domain, and billing plumbing.

## Why could this be worth $100K?

Only as a **strategic replacement-cost purchase**.

Assumption (labeled as assumption): a competent team would need on the order of **10 person-months** to recreate a thinner equivalent, or **~24 person-months** to recreate current scope, at ~$10,000 fully loaded per person-month in India → **$100k–$240k rebuild**. A parenting or edtech company that already has distribution might pay toward the low end of that rebuild to skip 6–12 months.

It is **not** worth $100k as a SaaS / subscription-app financial acquisition today. $100k at 3x SDE requires **$33k annual profit**. AmyNest has **$5 MRR**.

## What are the main risks?

1. **No underwritable financials.** $5 MRR, 3 paid users, ads ROAS << 1x on measured spend vs RC revenue.
2. **Conversion failure.** 0.04% 7-day RC convert-to-pay; July 2026 D1 ~5%. Buying users is buying churn.
3. **Founder / ops dependency.** Coolify + Hetzner worker + Cloudflare + Firebase + RC + two ad platforms. Transfer playbook is incomplete.
4. **IP / corporate gap.** No LICENSE file; `package.json` says MIT; AmyWorld formation docs not in repo; patent package is a draft Indian provisional with **unfilled filing date** while the App Store copy says “patent-pending.”
5. **Third-party AI COGS.** Product intelligence is rented (OpenAI `gpt-5` / `gpt-5-mini` / `gpt-4o-mini` / `gpt-realtime`, ElevenLabs, Gemini in content-engine). No proprietary model.
6. **Complexity as liability.** Dual Android trees, archived Expo, 150+ API route modules. Buyers inherit an operating burden, not a simple app.

## What would the buyer do with it after acquisition?

**Most rational uses:**

1. **Fold selected modules** (routines, speech, Parent Hub, billing) into an existing family app and discard unused surface area.
2. **Keep store listings and domain**, re-skin, and feed the funnel from the buyer’s existing parent audience — AmyNest’s missing piece is distribution + conversion, not features.
3. **Do not** keep running paid UA against the current funnel. Measured ads buy installs, not subscribers.

**Not recommended:** operate AmyNest as a standalone cash-flow business at current metrics.

---

**Bottom line:** AmyNest is a **real, production, overbuilt parenting product with almost no verified revenue.** Market it as an asset / project-substitution sale. **Do not market it as a $100k SaaS business.** A hostile IC would vote **NO** on $100k cash today. $100k is **CONDITIONAL** for one parenting/edtech buyer who already has users — and only after **12,000-family and patent-pending claims are filed or stripped**. Public ask **$75k**; target **$60k cash**; walk-away **$25k**.

**Attack test:** `docs/AMYNEST_100K_BUYER_ATTACK_TEST.md`. **$100k readiness: 22/100.**
