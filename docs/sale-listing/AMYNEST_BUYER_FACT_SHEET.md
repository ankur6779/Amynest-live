# AmyNest AI — Buyer Fact Sheet

**Date:** 2 October 2026  
**Purpose:** Buyer-facing facts for listing and outreach.  
**Not a valuation. Not a closing certificate. Not a source-code title opinion.**

Internal diligence score **55/100** (hard cap **69**) is an **internal closing-readiness score**, not a product-quality score and not a price.

Nothing has been transferred. No buyer has been invited. Production was not changed for this package.

---

## Business

| Item | Fact | Status |
|------|------|--------|
| Product name | **AmyNest AI** (also styled AmyNest) | VERIFIED in product copy |
| Public site | `https://www.amynest.in` | VERIFIED live HTTP 200 (2 Oct 2026) |
| Product category | Parenting / child-development software (routines, learning, health, speech, content hubs) | VERIFIED from shipped UI and store listing name |
| Business model | Freemium subscription; entitlement `premium` via RevenueCat; store IAP on Play and App Store | VERIFIED in code + RC |
| Seller (commercial) | **AmyWorld — sole proprietorship of Ankur Raman** | OWNER-CONFIRMED (Path A). Not a registered-company proof |
| Personally held (scheduled with the deal) | Indian Patent Application 202611059355; domain `amynest.in`; Cloudflare account | OWNER-CONFIRMED; **not** AmyWorld-owned |
| Geography | India-oriented product and stores (INR Play charges; Indian patent filing; Lucknow applicant address on papers) | VERIFIED where cited; no market-share claim |
| Trademark registration | None evidenced in this diligence | NOT VERIFIED |

---

## Product

AmyNest is a **live** parenting app. Parents create child profiles and use a daily hub plus tools for routines, an AI assistant, learning, speech practice, health, games, and age-banded content (including infant shortcuts in the hub).

### Production functionality (live surface verified; modules not all E2E-tested this pass)

| Surface | Evidence |
|---------|----------|
| Public web | `https://www.amynest.in/` HTTP **200** (2 Oct 2026) |
| Public API health | `GET https://www.amynest.in/api/health` HTTP **200**, body `ok: true` (2 Oct 2026). Response also showed `birthSkyPublicEnabled: true` |
| Google Play | Production listing **AmyNest AI: Smart Parenting**, package `com.amynest.app`, release **106 (1.4.63)** (Play Console 2 Oct 2026) |
| App Store | App ID **6767664343**, bundle `com.amynest.app` (documented; listing live historically) |

### Documented in current application code (shipped routes / hub sections)

Code-present is **not** the same as “every screen E2E-tested on 2 Oct 2026.” Classify modules in `PRODUCT_FEATURE_INVENTORY.md`.

Includes (non-exhaustive): Today / dashboard; child profiles; routine list and generate; Ask Amy (`/assistant`); parenting hub groups (today, learning, creativity, stories, health, parent, support); coloring books, worksheets, art/craft tiles; stories / discovery worlds; Health Lab; Gaming Hub (`/games`); speech coach; audio lessons; nutrition hub; infant hub components; Birth Sky / astronomy; phonics, study, spelling, abacus; paywall / pricing; account, privacy, terms, support.

**Premium-gated in code (examples):** nutrition hub, speech coach, Health Lab (`PREMIUM_ROUTE_METADATA` in `AppCore.tsx`).

### Planned / not a current full product

| Item | Note |
|------|------|
| Kids Control Center (`/kids-control-center`) | Interest / feedback UI in code, not a shipped child OS |
| Speech Coach v2 routes | Present in code; treat as **needs verification**, not a separate marketed SKU |
| Archived Expo app | `archive/amynest-mobile-expo/` — **not** the shipped stores |
| Non-shipped Android trees | Shipped Play app is `android/` WebView, **not** Capacitor Android |

Do **not** describe roadmap or archive trees as current functionality.

---

## Technology

| Layer | Verified fact |
|-------|----------------|
| Frontend | Vite React SPA (`artifacts/kidschedule/`) |
| Backend | Express API (`artifacts/api-server/`) |
| Database | Coolify-managed PostgreSQL hostname `tcl9udyxcuq2zu598ebj0pfu` on VPS `188.245.208.126` |
| Queue | Redis hostname `g7jotufnm43n4au4e8n6x946` (same Coolify VPS) |
| Web hosting | Cloudflare Pages (`amynest-web`) → `www.amynest.in` |
| API edge | Cloudflare Worker `amynest-api-proxy` |
| API origin | Coolify on Hetzner |
| AI worker | Hetzner SSH deploy (historic worker IP `167.233.39.146` — confirm on Hetzner screenshot) |
| Android | Play Store **WebView wrapper** (`android/`), not Capacitor Android |
| iOS | Capacitor (`artifacts/amynest-capacitor/ios/`) |
| Auth | Firebase Authentication (Google / Apple native bridges as configured) |
| Billing | RevenueCat project `proj9c1919f0`; entitlement `premium` |
| Object storage | GCS bucket name `amynest-audio-storage` |
| AI / LLM | OpenAI and Gemini used in server/product (keys escrowed; live spend **UNVERIFIED**) |
| Analytics | Firebase Analytics / GA4 client IDs in build; property **title UNKNOWN** |
| CI/CD | GitHub Actions `deploy-production.yml` (Pages + Worker + path-filtered Hetzner); Coolify API **not** deployed by that workflow |
| Secrets | Production secret types escrowed offline (37 records). **Values are not in this listing pack.** |

Monorepo: public GitHub `ankur6779/Amynest-live`. Workspace Node engine `>=22.12.0 <23.0.0`; `pnpm@9.15.0`.

---

## Platforms

| Platform | Identifier | Status | Transfer |
|----------|------------|--------|----------|
| Google Play | `com.amynest.app` · Console app ID `4972454135983854770` · developer display **AmyWorld** | **Production** | App-store transfer is planned as **buyer-dependent closing work.** Not started. |
| Apple App Store | App ID `6767664343` · bundle `com.amynest.app` | Live listing documented | App-store transfer is planned as **buyer-dependent closing work.** Not started. |
| Web | `https://www.amynest.in` | Production HTTP 200 | Domain + Cloudflare are **personally held** (owner-confirmed); registrar evidence pending |

---

## Monetization

**Do not add Play + Apple + RevenueCat.** The same sale can appear in more than one source.  
**Do not treat Google Ads conversions as revenue or customers.**

### Google Play (first-party earnings lines)

| Period | Units | Gross charges | Status |
|--------|------:|---------------|--------|
| May 2026 | 1 | ₹199 | VERIFIED (duplicate May ZIP **not** double-counted) |
| June 2026 | 1 | ₹199 | VERIFIED |
| July 2026 | 1 | ₹199 | VERIFIED |
| August 2026 | 1 | ₹199 | VERIFIED |
| **May–Aug total** | **4** | **₹796 gross** | VERIFIED |
| September 2026 | — | — | **Not generated / not verified** — excluded |

Shown Play fees on those lines: −₹119.40; India TDS shown −₹0.80. Arithmetic after those deductions ₹675.80 is **not** labeled final net settlement.

### Apple (Payments and Financial Reports)

| Period | Units | Proceeds | Status |
|--------|------:|----------|--------|
| Report header **June 2026** (seller-stated payment date 30 July 2026) | 1 | **₹1,080.31** | VERIFIED (one report, three CSV views — **not** three sales) |

### RevenueCat (analytics layer, as of **24 Sep 2026**)

| Metric | Value | Notes |
|--------|-------|--------|
| Lifetime gross (`revenue`) | USD **26.14** | 2026-04-19 – 2026-09-24 |
| Lifetime proceeds | USD **16.83** | RC definition |
| MRR | USD **5** | Point-in-time 24 Sep 2026 — RC figure, **not** a reconstructed ARR |
| Active paid | **3** | Same as-of |
| Active trials | **0** | Same as-of |

**ARR is not calculated.** Do not annualize the $5 MRR for listing.

### Razorpay

Seller-stated **not currently used** for AmyNest transactions. No independent export. **Do not write ₹0.**

---

## Traction

| Metric | Value | Period | Source | Status |
|--------|-------|--------|--------|--------|
| RC active paid | 3 | as-of 24 Sep 2026 | RevenueCat | VERIFIED |
| RC active trials | 0 | as-of 24 Sep 2026 | RevenueCat | VERIFIED |
| RC MRR | USD 5 | as-of 24 Sep 2026 | RevenueCat | VERIFIED |
| RC lifetime gross | USD 26.14 | 19 Apr–24 Sep 2026 | RevenueCat | VERIFIED |
| Play Console installs shown | ~746–749 | Console home row dated 25 Sep 2026; inspected 2 Oct 2026 | Play Console | VERIFIED as **console display**, not a unique-user count |
| Play production countries/regions | 178 | 2 Oct 2026 Console | Play Console | VERIFIED display |
| Google Ads 90d conversions | 2,354 | ~last 90d as of 24 Sep 2026 | Google Ads | VERIFIED as **Google conversions** (installs + first opens) — **not paying customers** |
| Google Ads 90d spend | INR 18,946.27 | same | Google Ads | VERIFIED |
| RC 28-day actives | 231 | as-of 24 Sep 2026 baseline | RevenueCat (prior query) | VERIFIED in baseline memo — **not** paying customers |
| Retention / D1 / D7 | — | — | — | **Not verified** for listing |
| “12,000+ parents” | — | — | Historic marketing | **Rejected** — do not use |

---

## IP

| Item | Fact |
|------|------|
| Application | Indian Patent Application No. **202611059355** |
| Title | A System and Method for Adaptive Child Development Routine Generation Using Context-Aware Environmental and Caregiver-Oriented Computational Processing |
| Filing date | **10 May 2026** (provisional; CBR 29076) |
| Complete specification | Seller-stated filed **19 Sep 2026** — portal acceptance **not independently re-fetched** |
| Status | **FILED / PENDING** |
| Published | **Not verified** |
| Granted | **No.** Patent is pending; **grant has not been established.** |
| Applicant / inventor | **Ankur Raman** (natural person), personally held |
| Transaction | **INCLUDE** — assignment **not executed** |
| Source-code copyright | **UNKNOWN** until counsel warrant or SPA carve-out. Git authorship is not title. |
| Brand / TM | Use of “AmyNest” / “AmyNest AI” in product; **no TM registration evidenced** |

Forbidden public wording: patented, granted, patent-protected, exclusive patent.

---

## Assets included

Intended inclusion in a Path A asset sale **to the extent legally transferable**. Draft schedules exist; **nothing is executed.**

| Asset | Intended? | Caveat |
|-------|-----------|--------|
| AmyNest software / source (monorepo possession) | Yes | **Legal title UNKNOWN**; assignment + counsel memo required |
| Production database / user data | Yes, **if** legally transferable | Child-data assignability **pending counsel** (DPDP) |
| GitHub repository | Yes | Buyer-dependent transfer; currently sole admin `ankur6779` |
| Google Play listing | Yes | Buyer-dependent closing transfer |
| Apple App Store listing | Yes | Buyer-dependent closing transfer |
| Domain `amynest.in` | Yes | Personally held; registrar evidence pending; vendor transfer at closing |
| Cloudflare (Pages, Worker, DNS as used) | Yes | Personally held; evidence pending |
| Hetzner / Coolify / Postgres / Redis | Yes | Hetzner owner-confirmed AmyWorld; screenshots pending |
| GCP / Firebase / GCS | Yes, as used | Account title **UNKNOWN**; GCS objects **uninventoried** |
| RevenueCat project + entitlement config | Yes | Invite Admin at closing; owner currently founder Gmail |
| Analytics / Ads accounts | Yes, if kept | Ads keep/pause **undecided**; campaign currently **ENABLED** |
| Content / media | Yes, **subject to rights verification** | Repo/GCS presence ≠ copyright |
| Patent application 202611059355 | **INCLUDE** | Personal assignment + IPO; **not granted** |
| Production secrets / signing escrow | Handover at closing | Encrypted packs exist; **not** in this listing folder |
| Cursor tooling | Owner-confirmed AmyWorld relationship | Not source title |
| npm / SDKs | Licensed in, **not owned** | Buyer takes license obligations |

---

## Known open items

These are **transaction / diligence** items, not a claim that the live app is broken.

1. **Source-code title** — founder statement unsigned; counsel memo not issued.  
2. **Transaction agreements** — SPA / assignment / bill of sale **not executed**.  
3. **Patent assignment** — INCLUDE decided; **not assigned**.  
4. **Domain evidence** — live use verified; registrar pack pending.  
5. **Cloud ownership evidence** — Hetzner/CF owner-confirmed; screenshots pending; Coolify/GCP unknown.  
6. **GitHub transfer** — buyer org required at closing.  
7. **RevenueCat closing** — owner verified; invite **not sent**.  
8. **Deploy-plane** — Actions + Coolify still founder-gated.  
9. **GCS / media rights** — inventory not done.  
10. **Finance** — September Play missing; COGS invoices unverified except ads spend.  
11. **Legal-copy cleanup** — repo vs live lag; do not deploy without instruction.  
12. **Ads decision** — campaign `23986249354` still **ENABLED** (2 Oct 2026); keep/pause not written.

App-store transfers are **buyer-dependent closing work**, not current listing blockers.
