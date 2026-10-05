# AmyNest AI — Confidential Acquisition Memorandum

**Prepared:** 14 September 2026 (updated same day with $100k buyer attack test)
**Purpose:** Buyer presentation for a potential sale of the AmyNest product/business
**Classification:** Confidential — not an offering document
**Method:** Read-only inspection of the AmyNest-AI repository plus live reads of RevenueCat, Google Ads, and Meta Ads on 14 Sep 2026. Attack-test addendum: hostile IC memo + sell-side $100k path. No application code, billing, ads, or production systems were modified.

**Evidence rule:** Quantitative claims cite a source. Anything not observed is labeled **NOT VERIFIED FROM CODEBASE**.

**Attack-test companions:** `docs/AMYNEST_100K_BUYER_ATTACK_TEST.md` · `docs/AMYNEST_100K_ACQUISITION_STRATEGY.md` · `docs/AMYNEST_BUY_VS_BUILD_ANALYSIS.md` · `docs/AMYNEST_STRATEGIC_BUYER_PROFILE.md` · `docs/AMYNEST_30_DAY_PRE_SALE_PLAN.md`

---

## 1. Cover — AmyNest Acquisition Opportunity

| | |
|--|--|
| Product | AmyNest AI |
| Operator named in product | AmyWorld (App Store seller: Amyworld) |
| Category | Consumer parenting OS / family subscription app |
| Surfaces | Web (`www.amynest.in`), iOS App Store, Google Play |
| Asking frame | **Asset / project-substitution sale**, not a cash-flow SaaS |
| Public / marketplace ask | **$75,000** |
| Strategic conversation ask | **$100,000** (buy-vs-build letter only) |
| Target cash | **$60,000** (or $50k + $25k transfer earnout) |
| Walk-away | **$25,000** |
| Current realistic value | **$15,000 – $40,000** |
| Likely sale if a buyer appears | **$20,000 – $45,000** |
| $100,000 cash, no extra traction, generic buyer | **NO** |
| $100,000 with one strategic who already has parents | **CONDITIONAL** |
| $100K readiness score | **22 / 100** |

**One-line:** A five-month-old, unusually complete parenting platform with live stores and billing — **$5 MRR**, **3** paid subscribers, and marketing copy that claims **12,000+ families**.

---

## 2. Executive Summary

AmyNest is a **freemium AI parenting platform for parents of children 0–12**. The product is real, in production, and broad: routines, coaching, speech, learning, nutrition, infant care, Parent Hub, Birth Sky, games, notifications, and subscriptions.

The **business is not real in financial terms**. Live RevenueCat project `proj9c1919f0` on 14 Sep 2026:

- **3** active paid subscriptions
- **0** active trials
- **$5** MRR
- **$26.14** lifetime gross revenue (19 Apr–14 Sep 2026)
- **$16.83** lifetime proceeds
- **6** lifetime paying transactions
- **2,728** RevenueCat “customers” (SDK-seen users)
- **0.04%** 7-day conversion to paying (1 of 2,728)
- **283** RevenueCat active users in the last 28 days

Paid user acquisition is live or recently live and **does not pay back**. Google Ads last 90 days: **₹18,929 (~$198)** for 2,354 Google conversion events with **₹103** conversion value. Meta AMYNESTAI: **₹12,712** lifetime spend and **718** reported app installs. Combined measured ad spend is about **$383** versus **$26** of RC gross. OpenAI/infra COGS: **NOT VERIFIED FROM CODEBASE**, but the product is AI-heavy, so SDE is almost certainly negative.

**Deal implication:** A financial buyer (Acquire.com, app roll-up, searcher) will bid an **asset floor**, not a multiple. A strategic parenting/edtech buyer might pay more for **time-to-market**. $100,000 is a stretch strategic number, not a comps-supported price.

**Attack-test facts that change the pitch (14 Sep 2026):**

1. **Hostile IC vote on $100k cash: NO.** 24 objections; P0s include revenue, conversion, ads ROAS, child-data packaging, and **unverified patent + 12,000-family claims**.
2. **India ARPU (~$1.67 live) means 1,000 paying users ≈ $20k ARR ≈ $53k at 2.6×** — still not $100k. Financial $100k needs ~1,500 India-priced paid **or** ~800–1,000 USD-priced paid **or** a strategic overlay.
3. **“I can build this for $30k”** builds a demo. A thinner **production** equivalent (both stores + RC + speech + safety) is **~$80k–$145k and 4–8 months**. That is the only honest $100k buy-vs-build.
4. **One-buyer theory:** a parenting/baby app or mid-market Indian edtech that **already has users**. MicroSaaS buyers are a $15k–$40k motion.
5. **Do not tell buyers** AmyNest has 12,000 families or a filed provisional until a receipt exists (`en.json` `landing.badge`, `landing.tech_patent_desc`; App Store “patent-pending”).

---

## 3. The Product

**VERIFIED proposition** (`lib/subscription-marketing/src/index.ts`):

> “Not parenting tips. Not one AI chat. The full growth system for children 0–12—connected in one place.”

**Target user:** Parent/caregiver as account holder; child profiles ages 0–12 (`PRODUCT_AGE_MIN/MAX`). Infants 0–24 months have separate Baby Expert limits.

**Shipped journeys** (`artifacts/kidschedule/src/AppCore.tsx`):

1. Welcome / sign-in / onboarding / child profile
2. Today Home (`/dashboard`) — “one next right thing”
3. Parent Hub (`/parenting-hub`) — four rooms: Help, Understand, Care, Moments
4. Routines generate + run
5. Amy AI, Amy Coach, Speech Coach / Talking Amy
6. Learning: phonics, spelling, study, math, abacus, olympiad, life skills
7. Nutrition, Health Lab, infant sleep/feeding
8. Birth Sky (astrology narrative + ephemeris daemon)
9. Games, stories, discovery worlds
10. Pricing / trial / referral / account / delete

**“Rooms” are UX architecture, not social rooms.** No multi-user social graph was found.

**Platforms (workspace production map):**

| Platform | Implementation | Path |
|----------|----------------|------|
| Web | React 19 + Vite SPA | `artifacts/kidschedule/` |
| iOS | Capacitor 6, bundled web, OTA | `artifacts/amynest-capacitor/` |
| Android (Play) | WebView loading `https://www.amynest.in` | `android/` — **not** Capacitor Android |
| API | Express 5 | `artifacts/api-server/` |

---

## 4. The Problem

The product is aimed at **exhausted parents** who currently assemble routines, learning, speech, meals, and advice from disconnected apps and generic AI chat.

That problem is real. **AmyNest has not proven parents will pay for this bundle.**

July 2026 first-party Postgres (`analytics-growth-report.md`, dated 13 Jul 2026 — **stale snapshot, not current**):

- 274 device registrations / 30 days
- First open 53% of install; onboarding complete 14%
- Instant-exit (<5s) **79%** of startup-funnel sessions
- D1 **5.2%**; D7 **2.4%**
- 0 `purchase_success` in the spike window
- Trial → paid **0%**

Live RC conversion (14 Sep 2026) is consistent with that picture: installs can be bought; **paid conversion cannot**.

---

## 5. The Solution

AmyNest’s intended solution is an **integrated parent OS**:

- Age-banded routines with `@workspace/safety` validation
- Quota-gated free AI, unlimited on `premium`
- 3-day hub journey then module gates
- Native IAP on iOS/Android; Razorpay on India web
- Push (FCM/APNs) with a notification decision engine
- Referral codes (3 valid + 1 paid → 30 days premium, cap 3 milestones)

**Honest product assessment:** the solution is **feature-complete relative to the problem statement** and **unproven relative to willingness to pay**. Completeness is the acquisition asset. Proof of demand is not.

---

## 6. Product Architecture

```
Parent device
  iOS Capacitor  ←→  bundled www + OTA + StoreKit/RevenueCat
  Android WebView ←→  https://www.amynest.in + BillingBridge/AuthBridge/PushBridge
  Browser        ←→  Cloudflare Pages (www.amynest.in) + Razorpay (India)

Cloudflare Worker  /api/*  →  Coolify Express API
Coolify: Postgres + Redis
Hetzner: BullMQ AI worker
GCS: audio/objects
Firebase: Auth + FCM
RevenueCat: Play + App Store entitlements
Ephemeris daemon: Birth Sky
content-engine: YouTube/shorts factory (separate ops plane)
```

**VERIFIED** from `android/README.md`, Capacitor config, `infra/cloudflare/`, `.env.production.example`, `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/queue/`.

**Database:** Drizzle/Postgres, 50+ migrations, domains including children, subscriptions, analytics_events, push_tokens, phonics, speech, infant, birth_sky, gift_tokens, admin_premium_grants (`lib/db/src/schema/`).

**Scale note:** Architecture is early/mid-stage consumer SaaS: worker split, rate limits, single-active scheduler. Coolify Postgres is a single plane. `getEntitlements()` is documented as query-heavy. **Current traffic does not stress this.** Complexity is a transfer cost, not a moat.

---

## 7. Technology & IP

### What is proprietary (VERIFIED as implementation, not as legal title)

- Parent Hub constitution + four-room living UX
- Routine generation + safety gate + journey quotas
- Freemium entitlement matrix (`subscriptionService.ts` `FREE_LIMITS` / `FREE_FEATURE_LIMITS` / module flags)
- Amy voice TTS pipeline (static → cache → OpenAI → ElevenLabs)
- Speech Coach v2 (OpenAI Realtime WebRTC)
- Notification engine (segmentation, fatigue, re-engagement modes)
- Content-engine shorts factory
- Birth Sky + Python ephemeris sidecar
- Growth OS / revenue intelligence admin

### What is rented

OpenAI (`gpt-5`, `gpt-5-mini`, `gpt-4o-mini`, `gpt-realtime`, `gpt-4o-mini-tts`), ElevenLabs, Google Gemini/Veo/Imagen (content-engine), Firebase, RevenueCat, Razorpay, Cloudflare, GCS.

**No proprietary trained model was found.** Anthropic: not found.

### Patent

`patent/amynest_patent_package.html` is an **Indian provisional specification draft**. Inventor/applicant: Ankur Raman. Filing date: **placeholder**. Application number: **NOT VERIFIED FROM CODEBASE**. App Store marketing says “patent-pending.” Treat as a **disclosure and advertising-claim risk** until a filing receipt is produced.

### Repo scale (supporting replacement-cost evidence)

| Signal | Value | Source |
|--------|-------|--------|
| First commit | 2026-04-08 | `git log` |
| Commits | 2,818 through 2026-09-13 | `git rev-list --count HEAD` |
| `lib/` packages | 88 | directory count |
| Test files | ~999 | glob excluding node_modules/archive |
| TS/Kotlin files (selected trees) | 5,152 | find on kidschedule, api-server, lib, android |

Root `package.json` license field: MIT. **No LICENSE file.**

---

## 8. Monetization

### VERIFIED

| Element | Detail | Source |
|---------|--------|--------|
| Model | Freemium, no in-app ads | Code search; RC ad_impressions = 0 |
| Entitlement | Single: `premium` | RC `entld84a0126e2`; `RC_ENTITLEMENT_ID` |
| USD catalog | $4.99 / mo, $24.99 / 6 mo, $39.99 / yr | `subscriptionService.ts` `PLAN_PRICES`; App Store US listing 14 Sep 2026 |
| INR Razorpay | ₹199 / ₹999 / ₹1499 | `RAZORPAY_PLAN_PRICES_INR` |
| Play SKUs | `amynest_monthly`, `amynest_6month`, `amynest_yearly` | RC products + Play checklist docs |
| RC packages | `$rc_monthly`, `$rc_six_month`, `$rc_annual` | Offering `default` |
| Native purchase | Android BillingBridge; iOS Purchases plugin | `native-billing.ts`, `native-billing-ios.ts` |
| Webhooks | RC `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `REFUND` | `artifacts/api-server/src/routes/subscription.ts` |
| Restore | RC sync purpose=restore | Same |
| Cancel API | `POST /subscription/cancel` | Same |
| Trial | 3-day internal age trial (≥24 months), feature-capped; store intro trials inferred from RC period_type | `subscription-premium-gate.ts` |
| Free caps | 1 child, 1 device, 10 AI queries/day, 3 routines, 3-day hub journey, many lifetime one-shots | `FREE_LIMITS`, `FREE_FEATURE_LIMITS` |
| Premium-only | Health Lab, activities hub, downloads, weekly reports | `getEntitlements` |
| Referral | 3 valid + 1 paid → 30 days; max 3 milestones | `referralPolicy.ts` |

### INFERRED

- India is primary Razorpay market; USD is store/default.
- Family-plan constants exist but no family SKU is sold.
- Stripe appears in a premium-gate comment/path; **no Stripe routes found**.

### UNKNOWN / NOT VERIFIED FROM CODEBASE

- Razorpay collections, refunds, settlements
- Store-localized prices outside US App Store listing (Play yearly doc drift ₹1599 vs code ₹1499)
- True gross margin after AI + infra
- Whether any of the 3 live RC subs are founder/test devices

**Revenue events in production RC:** 6 transactions, $26.14 gross. That is the verified P&L of IAP.

---

## 9. Traction

### Table — metrics a buyer will ask for

| Metric | Value | Source | Verified? | Importance to buyer |
|--------|-------|--------|-----------|---------------------|
| Active paid subscriptions | 3 | RC overview 14 Sep 2026 | Yes | Critical |
| Active trials | 0 | RC overview | Yes | High |
| MRR | $5 | RC overview | Yes | Critical |
| Last 28d revenue | $4 | RC overview | Yes | Critical |
| Lifetime RC gross | $26.14 | RC revenue metric 19 Apr–14 Sep 2026 | Yes | Critical |
| Lifetime RC proceeds | $16.83 | RC proceeds metric | Yes | Critical |
| Lifetime RC transactions | 6 | RC revenue chart summary | Yes | High |
| Implied ARR from MRR | ~$60 | $5 × 12 (calculation) | Derived | High |
| New RC customers lifetime | 2,728 | RC customers_new total | Yes (SDK users) | Medium |
| 7-day convert to paying | 0.04% (1/2728) | RC conversion_to_paying | Yes | Critical |
| RC 28d active users | 283 | RC overview | Yes (SDK) | High |
| RC 28d new customers | 144 | RC overview | Yes | Medium |
| Jul 2026 device regs / 30d | 274 | analytics-growth-report.md 13 Jul 2026 | Stale snapshot | Medium |
| Jul 2026 MAU | 281 | Same | Stale | Medium |
| Jul 2026 D1 | 5.2% (15/287) | Same | Stale | Critical |
| Jul 2026 D7 | 2.4% (5/209) | Same | Stale | Critical |
| Jul 2026 trial→paid | 0% | Same + subscription-audit | Stale | Critical |
| Play downloads | NOT VERIFIED FROM CODEBASE | Play page HTTP 409 | No | High |
| App Store ratings | Not enough to display | App Store 14 Sep 2026 | Yes (absence) | High |
| App Store units | NOT VERIFIED FROM CODEBASE | No ASC export | No | High |
| Google Ads 90d spend | ₹18,929 (~$198) | Google Ads API, INR, LAST_90_DAYS | Yes | High |
| Google Ads 90d conversions | 2,354 events; value ₹103 | Same — **not paid subs** | Yes as events | High |
| Google Ads 30d spend | ₹31.54; 0 conversions | LAST_30_DAYS | Yes | Medium |
| Meta AMYNESTAI spend | ₹12,711.85 | Meta account + insights | Yes | High |
| Meta app installs | 718 `mobile_app_install` | Meta insights 28 Jun–14 Sep | Yes as Meta event | High |
| Meta Amy World spend | ₹4,915.26 | Meta account | Yes | Medium |
| Meta pixel purchases | 7 events / ₹473 | Amy World insights — **≠ RC** | Do not use as revenue | Low |
| Razorpay revenue | NOT VERIFIED FROM CODEBASE | No API | No | Critical |
| Profit / SDE / EBITDA | NOT VERIFIED FROM CODEBASE | No P&L | No | Critical |
| LTV / CAC / ARPU current | NOT VERIFIED FROM CODEBASE | n too small / no COGS | No | High |
| Advertising revenue | $0 in-app | RC ad impressions 0; no AdMob | Yes (none) | Medium |

**July RC new-customer spike: 1,653** (customers_new chart) with **0** of that cohort converting in 7 days. Ads can buy SDK users. They have not bought subscribers.

---

## 10. Market Opportunity

Parenting, edtech, and consumer AI coaching are large categories. **Category size is not AmyNest traction.**

This memorandum does **not** assign AmyNest a TAM/SAM/SOM share. Any “$X billion parenting app market” slide would be decoration. A buyer should underwrite **this funnel**, not the industry.

Competitive set (descriptive, not a share study): generic ChatGPT usage, BabyCenter/The Bump, Cozi/family OS, dedicated routine apps, speech apps, Indian edtech (phonics/abacus/olympiad). AmyNest’s claimed differentiation is **bundling**. Bundling only wins if parents activate more than one module and then pay. Current data says they do not.

---

## 11. Competitive Position

| Dimension | Position | Evidence |
|-----------|----------|----------|
| Breadth | Strong vs point apps | Route map + modules |
| Depth per module | Mixed; many modules look production-certified in internal docs | Founder review docs in `docs/v2/` |
| Brand | Weak public proof | App Store: not enough ratings |
| Distribution | Weak | Organic + inefficient UA |
| Switching costs | Low | 3 paid users; free tier is usable |
| Network effects | None found | No social graph |
| Data advantage | Not at this n | 283 28d RC actives |
| Model IP | None | Rented APIs |
| Price | Cheap vs US consumer subs | $4.99 / ₹199 |

**Moat verdict:** **No commercially relevant moat today.** Complexity ≠ defensibility.

---

## 12. Growth Opportunity

What a buyer *could* do (forward-looking, labeled **INFERRED**, not a forecast):

1. **Stop paid UA** until a first-session → paywall path converts organically. Current ads buy installs that do not pay.
2. **Narrow the product** to 1–2 jobs (e.g. routines + coach) so value is obvious in session one. Instant-exit 79% (Jul snapshot) is a product problem.
3. **Feed an existing parent audience** if the buyer has one — this is the only plausible $100k synergy.
4. **India web Razorpay** may be easier than Play/Apple IAP psychologically; collections still **NOT VERIFIED**.

What growth is **not**: extrapolating the July install spike. That spike produced **0** seven-day paying conversions in RC.

---

## 13. Acquisition Assets

### A. Software / IP

Monorepo + git history. Value: rebuild time. Risk: MIT field without LICENSE; contractor IP unassigned.

### B. Mobile applications

iOS Capacitor (172.8 MB, v3.0.19, 20 Aug 2026). Android WebView Play app. Value: store presence + native bridges. Risk: two Android trees; Play metrics unknown.

### C. Backend

Express API, 150+ route modules, BullMQ worker, crons. Value: production billing/auth/AI. Risk: founder-only ops.

### D. Database / schema

Family, billing, analytics, learning, speech, infant, notifications. Value: real production schema. User PII transfer requires legal basis — **not packaged**.

### E. AI / ML

Orchestration and prompts, not models. Value: workflows. Risk: COGS and vendor lock.

### F. Brand / product

AmyNest AI, AmyWorld, mascot, philosophy docs. Value: name + listings. Risk: almost no public reviews.

### G. Domain

`amynest.in` in production config. Registrar **NOT VERIFIED FROM CODEBASE**.

### H. Analytics infrastructure

First-party taxonomy + Growth OS. Value: a buyer can measure; July proofs exist. Gap: no current export in the data room.

### I. Advertising infrastructure

Google + two Meta accounts, pixels, app campaigns. Value: accounts are live. **Negative value as currently operated** (spend >> IAP revenue).

### J. Subscription / billing

RC + Play + Apple + Razorpay + webhook + entitlements. **This is one of the few assets that would actually take months to rebuild correctly.**

### K. Deployment / infrastructure

Cloudflare + Coolify + Hetzner + GCS + GitHub Actions. Transferable only with account access.

### L. Documentation

Unusually large internal docs (`docs/`, content-engine ops, commercial launch). Value: onboarding a new team. Not buyer-formatted until this memo.

### M. User / customer assets

**Only verified:** 3 RC paid; 283 RC 28d actives; 2,728 RC customers ever. July Postgres 274/30d installs. **Do not sell “the user base” as the story.**

### N. Data / assets

Static audio, stories, brand golden master, worksheets. Licensing provenance **PARTIAL**.

### O. Operational processes

Notification cron, content-factory workflow, release gates. Founder-dependent.

---

## 14. Technical Readiness

**Production-ready as a product:** yes, with caveats.
**Production-ready as a transferable company:** no.

Strengths: release gates, ~999 tests, worker isolation, webhook billing, native IAP, device limits, account deletion, CORS allowlist, distributed rate limit.

Weaknesses: dual Android, archived Expo, Render leftover, Expo push remnants, entitlements query fan-out, Crashlytics missing, known typecheck/test gaps (`AGENTS.md`), Coolify single plane, secret-in-docs (RC public key).

---

## 15. Risks & Mitigations

| ID | Risk | Severity | Material to price? | Mitigation that would raise price |
|----|------|----------|--------------------|-----------------------------------|
| R1 | $5 MRR / no P&L | P0 | Yes — this *is* the price | 6–12 months of verified paid growth |
| R2 | 0.04% convert-to-pay | P0 | Yes | Proven funnel; kill UA until then |
| R3 | Retention ~5% D1 (Jul) | P0 | Yes | New cohorts after product narrowing |
| R4 | Corporate/IP docs missing | P1 | Yes — blocks close | Entity docs, IP assignment, LICENSE |
| R5 | Patent-pending claim vs unfiled draft | P1 | Yes (reps + App Store) | Filing receipt or remove claim |
| R6 | Founder ops dependency | P1 | Yes | Access map + paid transition |
| R7 | AI COGS unknown | P1 | Yes | Vendor invoices, unit cost per DAU |
| R8 | Ads attribution ≠ purchases | P1 | Medium | Stop mis-reading Google conversions |
| R9 | Child data / COPPA-DPDP | P1 | Yes for US/EU buyers | Legal memo + data map |
| R10 | Razorpay revenue unknown | P2 | Yes if material | Export settlements |
| R11 | Duplicate Android / archive | P2 | Small | Delete/archive policy |
| R12 | Overbuilt surface | P2 | Yes (ops load) | Kill-list of modules |
| R13 | Test/typecheck known failures | P2 | Small | Fix gates |
| R14 | Play metrics unknown | P2 | Medium | Console export |
| R15 | Hardcoded public keys in docs | P3 | Small | Rotate + scrub docs |

Fixing R4–R6 **raises close probability** more than price. Only R1–R3 **raise price**.

---

## 16. Buyer Synergies

| Rank | Buyer type | Why buy | Asset they care about | Premium driver | Objection | Fit |
|------|------------|---------|----------------------|----------------|-----------|-----|
| 1 | Parenting / family apps | Skip 6–12 months | Full parent OS + listings | Their distribution × this product | Conversion unproven | 1 |
| 2 | Edtech / kids learning | Speech + phonics + study | Learning stack | India curriculum adjacency | Unused at scale | 2 |
| 3 | AI companion / coach | Amy chat/coach/voice | Orchestration + UX | Voice pipeline | Rented models | 3 |
| 4 | Women’s / family wellness | Parent daily habit | Today Home + notifs | Notification engine | Weak brand | 3 |
| 5 | Social/community apps | Almost none | Referral only | — | No social graph | 5 |
| 6 | Subscription aggregators | IAP plumbing | RC + stores | — | $5 MRR below min | 5 |
| 7 | Mobile portfolio companies | Store listings | com.amynest.app | — | Retention | 4 |
| 8 | MicroSaaS financial buyers | Would want SDE | None | — | Negative SDE | 5 |
| 9 | Strategic tech (AI infra) | Unlikely | Prompts | — | Not unique | 5 |

**Best buyer:** a parenting or Indian family-edtech company that **already has paying parents** and wants a broader OS. They are the only party for whom $60k–$100k can be internally justified as “cheaper than building.”

---

## 17. Valuation Methodology

### Market comps (2026, small private software — not public SaaS)

| Source | Finding | Use |
|--------|---------|-----|
| [BigIdeasDB SaaS multiples 2026](https://bigideasdb.com/saas-valuation-multiples-2026) — 615 Acquire.com-sourced listings | Pure SaaS ask ~**2.6x TTM revenue**; mobile ~**2.6x rev / 4.9x profit**; AI ~**3.2x rev** | Financial-buyer ceiling |
| [Livmo micro-SaaS](https://livmo.com/blog/micro-saas-valuation/) | Under $100k ARR: **2.0x–3.0x SDE** | AmyNest is below this band |
| [OEB Digital subscription apps 2026](https://oebdigital.com/subscription-app-valuation-multiple/) | **2x–4.5x SDE**; ad-driven **1.5x–3x** | Applies if SDE existed |
| [whatsthe.app MRR tables](https://www.whatsthe.app/docs/app-valuation) | Tiny apps **24x–48x MRR** ($5 MRR → **$120–$240**) | Shows financial value of current MRR |

**Not used:** public-company ARR multiples (6x–15x). Wrong universe.

### Methods applied

1. **SDE / profit multiple** → ~$0 because SDE is unverified and ads already exceed RC revenue.
2. **Revenue multiple** → $60 ARR × 2.6x ≈ **$156**. Noise.
3. **MRR table** → **$120–$240**.
4. **User multiple** → not applied as primary; 283 actives × even a generous $10–$20 strategic = **$3k–$6k**.
5. **Asset / replacement cost (supporting only)** → see §9 of this audit’s replacement section: thinner rebuild ~$100k; full ~$240k at $10k/person-month × 10–24 months (**assumption**). Unproven consumer apps typically transact at a **small fraction** of rebuild.

**Primary method for AmyNest: asset floor + strategic option.**

---

## 18. $100K Acquisition Case (attack-test revised)

### Hostile IC: would I spend my own $100,000?

**NO** as cash for the going concern. **MAYBE $20k–$35k** for the asset after claim/title cleanup. **CONDITIONAL $100k** only as a strategic project substitution (buyer already has parents; alternative is 4–8 months and $80k–$145k to reach production IAP + speech + safety).

### Case A — Conservative (financial buyer)

**$8,000 – $15,000**

### Case B — Base (operator / small strategic)

**$20,000 – $45,000** — still the most likely negotiated cash outcome.

### Case C — Strategic / $100k

**Only Scenario B in `AMYNEST_100K_ACQUISITION_STRATEGY.md`:** time-to-market for a parenting/edtech company with distribution.

Financial multiples still fail even after a “successful” volume ramp at **India ARPU ~$1.67**:

| Paid users | ARR @ $1.70 ARPU | 2.6× | ARR @ $4 ARPU | 2.6× |
|------------|------------------|------|---------------|------|
| 100 | $2.0k | $5k | $4.8k | $13k |
| 500 | $10.2k | $27k | $24k | $62k |
| 1,000 | $20.4k | **$53k** | $48k | **$125k** |

**1,000 India-priced subscribers does not buy a $100k multiple.** USD mix or a strategic overlay is required.

**$100k possible WITHOUT additional traction:** **NO** (generic buyer, cash). **CONDITIONAL** (one strategic, and only after patent/12,000-family claims are filed or stripped).

**Readiness for a $100k close: 22 / 100.**

---

## 19. Deal Rationale

**If you are a financial buyer:** do not buy at $100k. Bid **$10k–$25k** or walk.

**If you are a parenting/edtech strategic:** you are buying **4–8 months of store+billing+domain-logic tuition**, not 12,000 families. Pay **$40k–$75k** cash if diligence is clean; **$100k headline** only with a **transfer earnout**, not an MRR earnout you will never hit.

**If you are the seller targeting $100k:**

- List **$75k** as the public asset ask.
- Use **$100k** only in a 2-page buy-vs-build letter to strategics.
- Target **$60k cash**. Walk away **$25k**.
- Spend 30 days on **claims, title, recon, teaser** — not new features (`AMYNEST_30_DAY_PRE_SALE_PLAN.md`).
- Do **not** lead with Acquire.com yield buyers.

**Can AmyNest realistically be marketed for $100,000 today?**

### CONDITIONAL

1. Frame as **project substitution / live OS**, never ARR.  
2. Audience = **parenting/edtech strategics with users**.  
3. **Strip or file** patent-pending; **strip 12,000+ / 10,000+ family claims** before the teaser.  
4. Title + RC/Razorpay/store recon in the data room.  
5. Seller accepts **~$60k cash** if $100k cash is refused.

Without those: **NO.**

---

## 20. Acquisition Next Steps

1. Week 1: claim register (12,000 families, patent filed, Harvard “backed by”) + RC/ads factpack + account map.  
2. Week 2: incorporation, IP assignment, Razorpay/Play/App Store vs RC $26.14, COGS invoices.  
3. Week 3: 20-minute demo; keep/kill module map; 30-day handover.  
4. Week 4: strategic teaser + 60-name outreach; $75k public / $100k letter; $60–75k cash + transfer earnout sketch.  
5. **Do not increase UA.** July RC spike 1,653 new customers → 0 seven-day payers.

**Also:** `docs/AMYNEST_ACQUISITION_DATA_ROOM_CHECKLIST.md` · `docs/AMYNEST_ACQUISITION_EXECUTIVE_SUMMARY.md` · attack-test suite listed on the cover.

---

## 21. Buy vs build (attack-test)

|$30k / 6 weeks | Thinner production T | Full AmyNest | Buy @ $100k |
|---------------|----------------------|--------------|-------------|
| Demo: web + Firebase + one chat + test checkout | Both stores + RC + entitlements + speech + safety | 88 packages + content-engine + Birth Sky | Live pipes, empty economics |
| **Not** IAP-policy complete | **~$80k–$145k, 4–8 months** | **~$220k–$280k, 8–12 months** | + $5–15k transition |

The $30k argument is **true for a prototype** and **false for Play-policy WebView + Apple IAP + RC restore/grace + realtime speech**. $100k is **not cheap vs $30k**; it is **in range vs Product T plus delay** — only for a buyer who needs T **now** and has parents to pour in.

---

## 22. Do not claim (before any teaser)

| Claim | Evidence | Treatment |
|-------|----------|-----------|
| 12,000+ parents/families | `en.json` `landing.badge`, `final_cta_sub` | Strip; RC 28d actives = 283 |
| 10,000+ parents shaping AmyNest | `feedback.tsx` | Strip |
| Provisional patent filed | `landing.tech_patent_desc` vs placeholder filing date in `patent/amynest_patent_package.html` | File+receipt or strip |
| Patent-pending AI (store + UI) | App Store + `patent_pending.*` | Same |
| Backed by Harvard / CDC / … | App Store description 14 Sep 2026 | “Informed by published guidance” or remove |
| End-to-end secure; data never shared | App Store vs subprocessors | Align to privacy policy |
| No ads ever | UA ad accounts exist | “No in-app ads” |

Full table: `AMYNEST_100K_ACQUISITION_STRATEGY.md` §8.

---

## 23. $100K scorecard

| Category | Current | $100K standard | Gap | Priority |
|----------|---------|----------------|-----|----------|
| Product | Shipped, too broad | One job | Positioning | P1 |
| Technology | Production, complex | Transferable subset | Ops map | P1 |
| AI | Rented | Honest + unit cost | COGS | P1 |
| IP | Unfiled draft + MIT/no LICENSE | Clean title | P0 | P0 |
| Revenue | $26.14 lifetime | $25k–$50k TTM or strategic | ~400× | P0 |
| MRR | $5 | ~$2k financial or N/A strategic | ~400× | P0 |
| Paid users | 3 | 100 psych / 800–1500 financial | 30–500× | P0 |
| Retention | D1 5.2% Jul | ≥15–20% | 3–4× | P0 |
| Conversion | 0.04% | ≥1% | ~25× | P0 |
| CAC / LTV | Broken / n=3 | LTV>3×CAC | Unopened | P1 |
| Growth / distribution | Failed UA + fake 12k | Buyer-supplied | Honesty | P0 |
| Security / legal / transfer | Partial | Closable | 30-day plan | P0–P1 |
| Strategic value | Real for 1 buyer type | Named buyer | Outreach | P0 |

**Score: 22 / 100.**

---

## 24. Asking and structure (attack-test)

| | |
|--|--|
| Public ask | $75,000 |
| Strategic letter | $100,000 |
| Target | $60,000 cash |
| Walk-away | $25,000 |
| Structure most likely to print a “$100k” headline | **$60–75k cash + $25–40k earnout on transfer/uptime, not on MRR** |
| Primary channel | Direct parenting/edtech outreach |
| Secondary | Indian family-tech intros |
| Marketplace | Flippa asset backstop — not Acquire.com yield |

---

## Appendix A — Replacement cost (assumption-labeled)

Assumptions: India-capable team; $10,000 fully loaded per person-month; “competent” not “world-class US agency.” Attack-test revision: a **thinner production** rebuild (Product T) is **~$80k–$145k / 4–8 months**, not $30k. Full scope remains ~$220k–$280k. Details: `docs/AMYNEST_BUY_VS_BUILD_ANALYSIS.md`.

| Workstream | Person-months (assumption) | $ at $10k |
|------------|----------------------------|-----------|
| Web / parent UX (kidschedule) | 6 | 60,000 |
| API / Postgres / workers | 4 | 40,000 |
| iOS Capacitor + OTA | 1.5 | 15,000 |
| Android WebView + bridges | 1.5 | 15,000 |
| Auth (Firebase) | 0.5 | 5,000 |
| Subscriptions (RC + Play + Apple + Razorpay) | 2 | 20,000 |
| AI feature orchestration | 3 | 30,000 |
| Notifications | 1 | 10,000 |
| Analytics + admin growth | 1 | 10,000 |
| Content-engine | 2 | 20,000 |
| Safety, tests, hardening, deploy | 1.5 | 15,000 |
| **Full recreation** | **~24** | **~$240,000** |
| **Thinner production equivalent (Product T)** | **~14.5 (or 8–11 if already fluent in RC/Play/Apple)** | **~$80,000 – $145,000** |
| **$30k / 6-week clone** | **~1.5** | **Demo only — not both stores / IAP policy / speech realtime** |

**This is not a valuation.** It is why a strategic might *discuss* $100k — and why a financial buyer will still offer $20k. See `docs/AMYNEST_BUY_VS_BUILD_ANALYSIS.md`.

---

## Appendix B — Acquisition readiness score

Weights sum to 100. Scores are 0–100 then weighted.

| Factor | Weight | Score | Weighted |
|--------|--------|-------|----------|
| Product maturity | 12 | 72 | 8.6 |
| Technical quality | 12 | 68 | 8.2 |
| Monetization architecture vs results | 12 | 45 | 5.4 |
| Traction | 15 | 18 | 2.7 |
| Growth | 8 | 22 | 1.8 |
| Retention | 10 | 15 | 1.5 |
| Defensibility | 8 | 28 | 2.2 |
| Documentation | 6 | 70 | 4.2 |
| Security | 7 | 55 | 3.9 |
| Transferability | 6 | 30 | 1.8 |
| Founder independence | 4 | 25 | 1.0 |
| **Total (general acquisition readiness)** | **100** | | **41 / 100** |

Not inflated: product/docs are the only strong categories. Traction/retention/transfer dominate the discount.

**$100k-specific readiness (attack test): 22 / 100** — general readiness scores the *asset*; the $100k score also penalizes false social proof, unfiled patent copy, and the India-ARPU multiple gap.

---

## Appendix C — Connected systems queried (14 Sep 2026)

- RevenueCat `list-projects`, `get-overview-metrics`, `list-apps`, `list-products`, `list-entitlements`, `list-offerings`, `get-revenue-metric` (gross + proceeds), charts: `mrr`, `revenue`, `actives`, `customers_new`, `conversion_to_paying`
- Google Ads `list_google_ads_customers`, `get_google_ads_account_info`, `get_google_ads_campaigns`, `get_google_ads_campaign_metrics` (LAST_90_DAYS, LAST_30_DAYS)
- Meta `list_meta_connections`, `get_account_info`, `get_insights` (maximum), `get_campaigns`
- App Store public listing ID 6767664343
- Play public listing fetch: failed HTTP 409

No production databases were queried. No secrets were rotated. No ads, billing, or code were changed.
