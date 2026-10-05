# AmyNest — $100K Buyer Attack Test

**Date:** 14 September 2026  
**Role:** Hostile M&A buyer with exactly $100,000  
**Rule:** Kill the $100K thesis first. No fabricated metrics.  
**Live economics (RevenueCat `proj9c1919f0`, 14 Sep 2026):** $5 MRR · 3 paid subscriptions · $26.14 lifetime gross · $16.83 proceeds · 0.04% 7-day convert-to-pay (1 of 2,728) · 283 RC 28-day actives.

**Investment committee question:** *Why should we pay $100,000 for AmyNest instead of building something similar ourselves?*

**Hostile answer, first:** **We should not.** Not as a financial acquisition. The rest of this document is the IC memo that would get a $100K cash bid rejected — then, only after that, what would have to be true to reverse the vote.

---

## IC vote (hostile)

| Question | Vote |
|----------|------|
| Would I spend my own $100,000 cash today? | **NO** |
| Would I offer $20,000–$35,000 for the asset? | **MAYBE**, after legal/IP cleanup |
| Would I pay $100,000 as a strategic if I already have a parent audience and need a production OS in <6 months? | **CONDITIONAL** — see strategy memo |
| $100K possible with no additional traction, cash at close, generic buyer? | **NO** |

---

## 1. Twenty-plus objections

Severity: P0 kills a $100K cash deal · P1 cuts $30K+ or blocks close · P2 cuts $10–30K or delays · P3 hygiene.

### 1. Revenue

**OBJECTION 1 — There is no revenue base to multiple.**  
Evidence: RC lifetime gross **$26.14**; MRR **$5**; 6 transactions (19 Apr–14 Sep 2026).  
Severity: **P0**  
Impact: 2.6× TTM revenue (2026 Acquire.com-style SaaS ask, BigIdeasDB) × $26 = **~$68**. Even annualizing $5 MRR → ~$60 ARR × 2.6× = **~$156**.  
What would resolve it: Verified TTM revenue ≥ **$25k–$50k** (2–4× for $100k) or a non-financial thesis the IC accepts in writing.

**OBJECTION 2 — Profit is unverified and directionally negative.**  
Evidence: Measured ad spend ~**$383** (Google 90d ₹18,929 + Meta AMYNESTAI ₹12,712 + Amy World ₹4,915 at USD/INR 95.5) vs **$26** RC gross. OpenAI/ElevenLabs/Coolify/Hetzner/GCS COGS **NOT VERIFIED FROM CODEBASE**.  
Severity: **P0**  
Impact: SDE multiple (2–4.5×, Livmo/OEB 2026) on negative SDE = **$0**.  
What would resolve it: 12-month P&L with positive SDE ≥ **$25k** (4×) or ≥ **$33k** (3×).

### 2. Users

**OBJECTION 3 — There is no user base worth $100K.**  
Evidence: 3 paid; 283 RC 28-day actives; 2,728 lifetime RC customers (SDK-seen, not payers). July 2026 Postgres: 274 device regs / 30d (stale).  
Severity: **P0**  
Impact: Even a generous $20/MAU strategic × 283 = **$5,660**.  
What would resolve it: Verified MAU in the **tens of thousands**, or paid users in the **high hundreds to thousands** (see turnaround model).

**OBJECTION 4 — Marketing claims a user base the metrics contradict.**  
Evidence: Landing copy `Trusted by 12,000+ Parents` and `Join 12,000+ families` (`artifacts/kidschedule/src/i18n/en.json` `landing.badge`, `landing.final_cta_sub`). Feedback UI: `10,000+ parents` (`feedback.tsx`). RC 28d actives = 283.  
Severity: **P0** (diligence + advertising-claim)  
Impact: IC will assume the rest of the CIM is inflated. Price **haircut or walk**.  
What would resolve it: Remove/replace claims; seller written representation of actual counts.

### 3. Retention

**OBJECTION 5 — Retention is below a viable consumer-sub floor.**  
Evidence: July 2026 snapshot D1 **5.2%** (15/287), D7 **2.4%** (5/209) (`analytics-growth-report.md`). Instant-exit **79%**. Current cohorts **NOT VERIFIED FROM CODEBASE**.  
Severity: **P0**  
Impact: Buyer is purchasing churn. Subscription multiples require documented retention (OEB 2026).  
What would resolve it: 90 days of post-cleanup cohorts; D1 **≥20%**, D7 **≥10%** as a minimum “not broken” bar (targets, not promises).

### 4. Monetization

**OBJECTION 6 — Freemium is configured; conversion is not.**  
Evidence: Full entitlement matrix exists; 7-day convert-to-pay **0.04%**. July trial→paid **0%**.  
Severity: **P0**  
Impact: Billing plumbing is not a business.  
What would resolve it: Sustained convert-to-pay **≥1–2%** of new activating users, or trial→paid **≥8%** (internal target in `funnel-baseline.json`, never hit).

**OBJECTION 7 — India list prices cap financial value even if volume appears.**  
Evidence: Razorpay ₹199/mo ≈ **$2.08**; implied live ARPU **$5/3 ≈ $1.67**. USD catalog $4.99/$39.99.  
Severity: **P1**  
Impact: **1,000 India-priced subscribers ≈ $1.7k MRR ≈ $20k ARR**. At 2.6× ≈ **$53k**. Still not $100k.  
What would resolve it: USD/Western mix that lifts ARPU toward **$4**, or volume **~1,500–2,000** India paid, or a strategic (not multiple) bid.

### 5. CAC / conversion

**OBJECTION 8 — Paid acquisition does not produce subscribers.**  
Evidence: Google LAST_90_DAYS: ₹18,929, 2,354 conversion *events*, conversion *value* ₹103. Meta AMYNESTAI: 718 `mobile_app_install`. RC still 3 paid. July RC new-customer spike **1,653** with **0** of that cohort paying in 7 days.  
Severity: **P0**  
Impact: CAC on an ads-attributed paid user is effectively **infinite**. Buying the company does not buy a growth engine.  
What would resolve it: A channel with **LTV > 3× CAC** on a 30–90 day cohort, documented.

**OBJECTION 9 — Attribution is not trustworthy.**  
Evidence: July Postgres: 0 Google/Meta attributed installs in-product while UA was running. Google “conversions” ≠ RC purchases. Meta Amy World 7 pixel purchases / ₹473 ≠ RC $26.  
Severity: **P1**  
Impact: Buyer cannot underwrite UA.  
What would resolve it: End-to-end SKAN/Play referrer/RC customer IDs reconciling to cash.

### 6. Product

**OBJECTION 10 — Breadth is a liability: parents bounce before value.**  
Evidence: 79% instant exits; onboarding complete 14% of 30d installs (Jul). Surface includes routines, coach, speech, phonics, abacus, olympiad, nutrition, Health Lab, Birth Sky, games, worksheets.  
Severity: **P1**  
Impact: Buyer inherits a product that failed to communicate one job.  
What would resolve it: Proof that one core job (e.g. routine generate) converts; a kill-list for the rest.

**OBJECTION 11 — Health/infant/speech adjacency is regulated-feeling without being a medical product.**  
Evidence: Health Lab, Cry Insight, infant sleep/feeding, speech coach. Copy has disclaimers (`en.json`, `terms.tsx`) but App Store lists Health/Wellness topics; marketing says “pediatrician-aligned.”  
Severity: **P1**  
Impact: US/EU strategics add counsel cost; some will not bid.  
What would resolve it: Counsel memo (COPPA/DPDP/health claims) + narrowed claims.

### 7. Technology

**OBJECTION 12 — Most of the repo is generic product engineering, not a secret system.**  
Evidence: React/Vite SPA, Express, Drizzle/Postgres, Firebase Auth, BullMQ, standard RC + Razorpay. `@workspace/amy-intelligence` home-state is rule-based resume/recommend, not a trained model.  
Severity: **P1**  
Impact: IC will not pay a “proprietary AI” premium.  
What would resolve it: Honest “production OS + domain rules” framing; drop patent theatre.

**OBJECTION 13 — Complexity raises operating cost after close.**  
Evidence: 88 `lib/` packages; dual Android trees; archived Expo; 150+ API routes; Coolify + Hetzner + Cloudflare + GCS + Firebase + RC + Razorpay + two ad platforms. `AGENTS.md` known typecheck/test failures.  
Severity: **P1**  
Impact: $100k purchase + $10–20k/month to keep it alive. NPV worse.  
What would resolve it: Supported-module map; 90-day run cost budget; founder transition.

### 8. AI

**OBJECTION 14 — Intelligence is rented. We would still pay OpenAI after buying.**  
Evidence: `openai-model-catalog.ts` — `gpt-5`, `gpt-5-mini`, `gpt-4o-mini`, `gpt-realtime`, `gpt-4o-mini-tts`; ElevenLabs; Gemini in content-engine. No weights in repo.  
Severity: **P0** for an “AI company” premium; **P1** otherwise  
Impact: Zero model IP. COGS scale with usage.  
What would resolve it: Unit-cost dashboard (cost per DAU / per routine). Buyer already has an LLM budget.

### 9. IP / legal

**OBJECTION 15 — Patent-pending is not evidenced as filed.**  
Evidence: `patent/amynest_patent_package.html` filing date = `[Date of Filing of this Provisional]`. i18n: `Provisional patent filed` (`landing.tech_patent_desc`). App Store: “patent-pending.”  
Severity: **P0** for reps & warranties  
Impact: Walk or escrow. False patent marking / advertising risk in some jurisdictions (counsel required — not legal advice).  
What would resolve it: Filing receipt with application number, or purge all patent-pending copy before marketing the company.

**OBJECTION 16 — We may not be buying clean title.**  
Evidence: No LICENSE file; `package.json` `"license": "MIT"`; no contractor IP assignment; operator “AmyWorld” vs App Store “Amyworld”; founder Ankur Raman on Meta + patent draft.  
Severity: **P0** for close  
Impact: $100k into an asset we cannot prove we own.  
What would resolve it: Incorporation pack, IP assignment, store-account identity match.

### 10. Security / child data

**OBJECTION 17 — Child-data compliance is not packaged.**  
Evidence: Parent-gated Firebase auth; `@workspace/safety` age-band rules; privacy URL exists; **no COPPA program**, no DPA/subprocessor list, no pen test in repo. Precise location in App Store privacy label.  
Severity: **P1**  
Impact: Family-app strategics will discount or require indemnity.  
What would resolve it: Data map, age-gate evidence, DPA, counsel letter.

### 11. Infrastructure / transfer

**OBJECTION 18 — This is a founder appliance, not a transferable company.**  
Evidence: Coolify + Hetzner worker + Cloudflare Pages/Worker + GCS; env names in examples; no access-owner map; no incident history export.  
Severity: **P1**  
Impact: 30–90 day transition risk; deal structure shifts to earnout / holdback.  
What would resolve it: Credential matrix, recorded deploy, 30-day paid handover.

### 12. Founder dependency

**OBJECTION 19 — Key-person risk is total.**  
Evidence: 2,818 commits in ~5 months; ads login Facebook user Ankur Raman; patent applicant Ankur Raman; no org chart.  
Severity: **P1**  
Impact: Without founder, the 88-package monorepo is a museum.  
What would resolve it: Transition agreement; documented kill-switch architecture; or acquihire the founder (separate from $100k asset price).

### 13. Market / competition

**OBJECTION 20 — Parents already have ChatGPT, YouTube, and free routine templates.**  
Evidence: Product’s own conversion: people install, do not pay. Category TAM is irrelevant.  
Severity: **P1**  
Impact: Strategic premium requires the buyer’s distribution, not AmyNest’s.  
What would resolve it: One job with paid conversion in a defined geography.

**OBJECTION 21 — App Store social proof is empty.**  
Evidence: App Store 14 Sep 2026: *hasn’t received enough ratings or reviews to display*. Play install count **NOT VERIFIED** (public page HTTP 409).  
Severity: **P1**  
Impact: No brand. ASO is not an asset.  
What would resolve it: Ratings volume + console export.

### 14. Documentation / claims

**OBJECTION 22 — Internal docs are excellent; buyer-facing truth is not.**  
Evidence: Hundreds of founder-review markdown files vs landing “12,000+” / “patent filed” / “30+ research studies” / “real results.”  
Severity: **P1**  
Impact: Trust discount on every other seller statement.  
What would resolve it: Claim inventory (this file §13 companion) executed, not just reported.

### 15. Third-party / stores

**OBJECTION 23 — The product dies if OpenAI, Firebase, or RC is cut off.**  
Evidence: Auth, IAP, and almost all generation depend on those three.  
Severity: **P2**  
Impact: Standard SaaS risk; still an IC talking point at $100k with $5 MRR.  
What would resolve it: Vendor agreements in the data room; backup STT/TTS path (partially exists).

**OBJECTION 24 — Store transfer is slow and can fail.**  
Evidence: Apple and Google developer account transfers are entity processes, not git clones. Bundle `com.amynest.app` is the only public ID.  
Severity: **P2**  
Impact: Cash at close should not equal 100% of price.  
What would resolve it: Transfer checklists started; lawyer on Apple/Play.

---

## 2. The $100K value gap

| | Amount |
|--|--------|
| Current defensible value (prior audit, reaffirmed) | **$15,000 – $40,000** |
| Midpoint | **$27,500** |
| Target | **$100,000** |
| **Gap** | **~$60,000 – $85,000** |

| Gap type | Size (indicative) | What it actually is |
|----------|-------------------|---------------------|
| Revenue gap | ~$25k–$50k ARR missing for a 2–4× $100k | Have ~$60 implied ARR |
| Traction gap | ~500–2,000 paid users missing for a user-story | Have 3 |
| Retention gap | D1/D7 an order of magnitude below “keepable” | 5.2% / 2.4% Jul |
| Conversion gap | ~25–50× vs a 1–2% activating-user convert | 0.04% 7-day |
| CAC gap | No working paid channel | Ads ROAS << 1 vs RC cash |
| Documentation/confidence gap | $10k–$20k of the gap | False social proof, unfiled patent copy, no P&L |
| IP/legal gap | Blocks close more than it sets price | Title + patent claims |
| Distribution gap | The entire strategic premium | Buyer must bring the audience |
| Buy-vs-build gap | Only this can fill $60k+ without traction | See `AMYNEST_BUY_VS_BUILD_ANALYSIS.md` |

**The gap is not “a few more users.”** At **current India ARPU (~$1.67)**, even **1,000 paying subscribers** produce ~**$20k ARR**, which at 2.6× is ~**$53k** — still short of $100k. Closing the financial gap requires **ARPU expansion and/or a strategic (time-to-market) overlay**, not a modest user bump.

---

## 3. Would I spend my own $100,000?

**NO** — as cash for the going concern.

I would spend $100,000 of *my company’s* money only if:

1. I already have **paying parents** I can route into this OS within 90 days, **and**
2. My alternative is **≥4 months and ≥$80k** to reach live IAP on iOS+Android plus speech/safety, **and**
3. Patent/social-proof claims are cleaned, **and**
4. Title is clean, **and**
5. The founder stays 30–60 days.

Those five are the attack-test reversal conditions. They are **not** true for a generic MicroSaaS buyer.

Companion documents: `docs/AMYNEST_100K_ACQUISITION_STRATEGY.md`, `docs/AMYNEST_BUY_VS_BUILD_ANALYSIS.md`, `docs/AMYNEST_STRATEGIC_BUYER_PROFILE.md`.
