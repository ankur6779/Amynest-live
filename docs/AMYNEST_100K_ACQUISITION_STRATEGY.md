# AmyNest — $100K Acquisition Strategy (Sell-Side)

**Date:** 14 September 2026  
**Advisor role:** How the seller could *realistically* achieve $100,000 — without lying about traction.  
**Attack-test companion:** `docs/AMYNEST_100K_BUYER_ATTACK_TEST.md`

Verified now: **$5 MRR · 3 paid · $26.14 RC lifetime gross · 0.04% 7-day convert-to-pay.**

---

## 1. Five scenarios in which $100k is rational

### SCENARIO A — Financial acquisition

| | |
|--|--|
| Paying for | Cash flow |
| Required metrics | ~$25k–$50k ARR **or** ~$25k–$33k SDE (2–4× / 3–4× 2026 small-software comps) |
| Required proof | Bank + RC + Razorpay + stores, 12 months, churn |
| Likely buyer | Acquire.com / searcher |
| vs build | Irrelevant — they do not build |
| Logic | Multiple on yield |
| **$100k today?** | **NO.** Need ~400× MRR or ~1,000 USD-priced paid users (turnaround model below). |

### SCENARIO B — Strategic acquisition (the live path)

| | |
|--|--|
| Paying for | Time-to-market + module catalog + live stores, stuffed with **buyer’s** users |
| Required metrics | Almost none of AmyNest’s — buyer’s MAU/paid is the underwriting |
| Required proof | Demo, transfer plan, clean claims, title, 30-day founder |
| Likely buyer | Parenting/baby app or Indian family edtech |
| vs build | $80k–$145k and 4–8 months for thinner equivalent |
| Logic | Project substitution |
| **$100k today?** | **CONDITIONAL** on finding that buyer and surviving diligence (patent/social proof). |

### SCENARIO C — Technology / IP acquisition

| | |
|--|--|
| Paying for | Safety rules, entitlement state machine, speech realtime, notification engine, hub/routine journey |
| Required metrics | None; required **code tour** + tests |
| Required proof | No patent theatre; LICENSE + assignment |
| Likely buyer | App with users, weak backend |
| vs build | They would cherry-pick 5–8 packages, not buy the company |
| Logic | Asset cherry-pick often prices **$20k–$50k**, not $100k, unless bundled with stores |
| **$100k today?** | **NO as IP-only.** **MAYBE** if IP is bundled with Scenario B. |

### SCENARIO D — User-base / distribution acquisition

| | |
|--|--|
| Paying for | Users |
| Required metrics | Tens of thousands MAU or ≥500–1,000 paid with retention |
| Required proof | Console + RC + cohorts |
| Likely buyer | Aggregator |
| vs build | They would rather buy a *working* app |
| Logic | $/user |
| **$100k today?** | **NO.** 283 RC actives and 3 paid cannot carry this story. Marketing “12,000+” would **destroy** it in diligence. |

### SCENARIO E — Turnkey product acquisition

| | |
|--|--|
| Paying for | A running parenting app the buyer can operate Monday |
| Required metrics | Transferability more than MRR |
| Required proof | Access map, runbooks, COGS, no-founder-week test |
| Likely buyer | Operator / D2C brand hiring a studio |
| vs build | Agency quotes $50k–$150k for less, **without** store history |
| Logic | Turnkey premium on top of asset floor |
| **$100k today?** | **STRETCH.** Needs Scenario B buyer + turnkey proof. Founder dependency currently **blocks** “turnkey.” |

**Only B (optionally + E) can support $100k without a traction miracle.** A, C-only, and D cannot.

---

## 2. Technology: generic vs differentiated vs potentially proprietary

Differentiation /10 is **buyer-useful uniqueness**, not lines of code. Acquisition value is **indicative time-save**, not a standalone price.

| Component | Class | Evidence | Why buyer cares | Rebuild | Diff /10 | Acq. value |
|-----------|-------|----------|-----------------|---------|----------|------------|
| React SPA chrome, routing | Generic | `kidschedule` | Everyone has this | Weeks | 2 | Low |
| Firebase auth wrapper | Generic | `firebase-auth.tsx` | Commodity | Days | 2 | Low |
| Children/routines CRUD | Generic | `lib/db` children, routines | Commodity | Days | 2 | Low |
| OpenAI chat calls | Generic | integrations-openai | Rented | Days | 2 | Low |
| Marketing landings / ASO pages | Generic | `aso-landing-pages.ts` | Copy risk (see claims) | Days | 1 | Negative if claims stay |
| RC + Play + Apple + Razorpay + webhooks + restore | **Differentiated (ops)** | `subscription.ts`, BillingBridge, `native-billing-ios.ts` | Months of policy pain | 1–2 PM + calendar | 7 | **High** |
| Entitlement matrix + trial≠premium | **Differentiated** | `subscriptionService.ts`, `subscription-premium-gate.ts` | They already burned July 2026 on this | Weeks–1 PM | 7 | High |
| `@workspace/safety` age-band validator | **Differentiated domain** | `lib/safety` JSON rules + tests | Liability reduction | Days for JSON, weeks to wire | 6 | Medium |
| Routine generate + safety gate + journey | **Differentiated** | routine-safety-gate, `lib/routine-journey` | Core job | 1 PM | 7 | High |
| Parent Hub 4 rooms + journey quotas | **Differentiated UX** | constitution + `parent-hub-journey` | Product opinion | 1–2 PM | 6 | Medium |
| Speech Coach v2 realtime | **Differentiated** | `lib/speech-coach-v2`, OpenAI Realtime | Hard infra | 1.5 PM | 7 | High |
| TTS static→cache→OpenAI→ElevenLabs | **Differentiated** | API TTS/cache | Cost control | 0.5–1 PM | 6 | Medium |
| Notification engine + native push | **Differentiated** | `lib/notification-engine`, FCM/APNs | Retention tool (CTR 0.28% Jul — weak results) | 1 PM | 6 | Medium |
| Analytics taxonomy + Growth OS | **Differentiated ops** | `@workspace/analytics-taxonomy`, `/admin/growth` | Diligence + ops | 0.5–1 PM | 5 | Medium |
| `amy-intelligence` home picker | Generic-plus | rule-based resume/recommend | Not a model | Days | 3 | Low |
| `family-intelligence` twin/NBA | **Potentially proprietary as design** | `lib/family-intelligence`, `nba_decision_logs` | Ambitious; **unproven at n=3 paid** | 1–2 PM | 5 | Medium only if used |
| Phonics/learning stack | Differentiated content | multiple `lib/phonics*`, study, olympiad | Edtech buyers | 2–4 PM | 6 | Medium–high for edtech only |
| Birth Sky + ephemeris | Niche | `lib/birth-sky-*`, Python daemon | Astrology vertical only | 1–2 PM | 5 | Low for most |
| content-engine shorts factory | Differentiated ops | `content-engine/` | Distribution content | 2 PM | 5 | Low–med |
| Indian provisional **draft** | **Not an asset until filed** | `patent/amynest_patent_package.html` | Diligence landmine | n/a | 0 today | **Negative** |

**There is no verified proprietary model and no verified filed patent.** Do not sell “IP” as patents. Sell **wired production systems**.

---

## 3. Traction turnaround model (targets — not forecasts)

**Do not hide:** $5 MRR, 3 paid, $26.14 lifetime, 0.04% 7-day convert.

**Assumption A — India-weighted ARPU $1.70** (live $5/3 ≈ $1.67, rounded).  
**Assumption B — USD-ish blended ARPU $4.00** (mix of $4.99/mo and $39.99/yr).  
Multiples: **2.6× ARR** (2026 small SaaS *asking* avg, BigIdeasDB) and **4× ARR** as a generous strategic/financial blend. SDE unknown; if margin 50%, 4× SDE ≈ 2× ARR.

| Paid users | MRR A | ARR A | 2.6× A | 4× A | MRR B | ARR B | 2.6× B | 4× B |
|------------|-------|-------|--------|------|-------|-------|--------|------|
| 3 (now) | $5 | $60 | $156 | $240 | — | — | — | — |
| **100** | $170 | $2,040 | $5.3k | $8.2k | $400 | $4,800 | $12.5k | $19k |
| **250** | $425 | $5,100 | $13k | $20k | $1,000 | $12,000 | $31k | $48k |
| **500** | $850 | $10,200 | $27k | $41k | $2,000 | $24,000 | $62k | $96k |
| **1,000** | $1,700 | $20,400 | $53k | $82k | $4,000 | $48,000 | **$125k** | **$192k** |

**Implication:**  

- Financial **$100k** at India ARPU needs **~1,500+ paid** (or ~$33k SDE).  
- At USD ARPU, **~800–1,000 paid** at 2.6–3× can **cross $100k**.  
- **100–250 paid does not get you $100k on multiples.** It *does* change IC psychology (proof of conversion) and can unlock Scenario B at $75k–$100k.

### Conversion required (activating users → paid)

| Goal paid | At 0.04% (current) | At 1% | At 2% | At 5% (strong consumer) |
|-----------|-------------------|-------|-------|-------------------------|
| 100 | 250,000 | 10,000 | 5,000 | 2,000 |
| 250 | 625,000 | 25,000 | 12,500 | 5,000 |
| 500 | 1,250,000 | 50,000 | 25,000 | 10,000 |
| 1,000 | 2,500,000 | 100,000 | 50,000 | 20,000 |

Current ads cannot be scaled at 0.04%. **Funnel repair is mandatory** before volume. 1–2% is a **target**, not a prediction.

---

## 4. Fastest path to $100k: sell now vs 3–6 months

| | Path A — Sell now | Path B — 3–6 month improve then sell |
|--|-------------------|--------------------------------------|
| What you can sell | Asset + strategic option | Same + conversion proof (if it works) |
| Expected sale (probability-weighted, **assumption**) | ~$20k–$40k if a buyer appears; high no-sale risk at $100k list | ~$40k–$80k if 100–250 paid + clean claims; still not guaranteed $100k |
| $100k probability | ~**5–15%** (one strategic, clean diligence) | ~**15–30%** if conversion actually moves; **0%** if 6 months pass with still 3 paid |
| Burn | Low | AI + infra + founder time; ads **must not** repeat Jul ROAS |

**Recommendation:** **Do not wait 6 months hoping for 1,000 paid** unless the founder can fund it and will kill UA until convert-to-pay is ≥1%. **Do** spend **30 days** on confidence (claims, title, data room) — that raises *close probability* more than it raises *price*. Then **dual-track**: strategic outreach at a $75k–$100k conversation while a conversion sprint runs.

Path A alone will not produce $100k except by luck (one buyer). Path B without Path A’s legal cleanup still dies in diligence.

---

## 5. Minimum metrics that change buyer perception

| Metric | Current verified | Target that changes IC | Why | How buyer reads it |
|--------|------------------|------------------------|-----|-------------------|
| Paid subscribers | 3 | **100** (psychology) / **500–1,000** (financial $100k) | Proof vs multiple | “Works” vs “a business” |
| MRR | $5 | **$400–$2,000** | Underwriting | Tables vs hope |
| ARR | ~$60 implied | **$25k–$50k** | 2–4× comps | $100k math |
| 7-day convert-to-pay | 0.04% | **≥1%** | UA becomes possible | “Not broken” |
| D1 | 5.2% Jul (stale) | **≥15–20%** | Keepable | Cohort DD |
| D7 | 2.4% Jul | **≥8–12%** | Sub apps live here | Churn model |
| D30 | 12.5% n=8 Jul — ignore | **≥8% on n≥100** | LTV | Real vs noise |
| Trial→paid | 0% Jul | **≥8%** (their own target) | Paywall | Honesty vs `funnel-baseline.json` |
| CAC : LTV | Not computable | LTV ≥ 3× CAC | Scale | Will they fund UA |
| ARPU | ~$1.67 | **$3–$5** or volume | India cap | Mix shift |
| MAU | 283 RC 28d | **5,000+** for user story | Dist. | Still not $100k alone |
| Churn | n too small | <8% monthly logo | Multiple | 3 users cannot show this |

**Smallest set that moves $40k → a $100k conversation:** (1) **clean claims**, (2) **≥100 paid or a named strategic with users**, (3) **≥1% convert on a 30-day cohort**, (4) **title/IP pack**, (5) **transfer runbook**.

---

## 6. $100K scorecard

| Category | Current | $100K standard | Gap | Priority |
|----------|---------|----------------|-----|----------|
| Product | Shipped, too broad | One clear job + optional modules | Positioning | P1 |
| Technology | Production, complex | Transferable subset | Ops map | P1 |
| AI | Rented orchestration | Honest + unit cost | COGS sheet | P1 |
| IP | Draft patent, MIT field, no LICENSE | Clean title; no false patent | Filing or purge | **P0** |
| Revenue | $26.14 lifetime RC | $25k–$50k TTM or strategic overlay | ~400× | **P0** |
| MRR | $5 | ~$2k+ financial or N/A strategic | ~400× | **P0** |
| Paid users | 3 | 100 psych / 800–1500 financial | 30–500× | **P0** |
| Retention | D1 5.2% Jul | D1 ≥15–20% | 3–4× | **P0** |
| Conversion | 0.04% | ≥1% | ~25× | **P0** |
| CAC | Infinite ads→paid | LTV>3×CAC | Unopened | P1 |
| LTV | NOT VERIFIED | >CAC | n=3 | P1 |
| Growth | Spike then 0 pay | Repeatable | Broken UA | P1 |
| Distribution | Weak; fake 12k claim | Buyer-supplied or real MAU | Honesty + partner | **P0** |
| Security | Reasonable code, no audit | Memo + data map | Child data | P1 |
| Documentation | Internal rich, buyer-poor | Data room | 30 days | P1 |
| Legal | Entity/patent/claims | Closable | Counsel | **P0** |
| Transferability | Founder appliance | Access map + 30-day handoff | Runbook | P1 |
| Strategic value | Real for 1 buyer type | Named buyer in process | Outreach | **P0** for $100k |

**CURRENT $100K READINESS SCORE: 22 / 100**

(Architecture ~half of product/tech points; economics near zero; legal claims **negative**.)

---

## 7. Honest $100k investment thesis (seller → strategic)

**Why pay $100k:**

You are not buying $5 MRR. You are buying a **production parenting OS** that has already paid the ugly costs: two live stores, Play-policy WebView, Apple IAP, RevenueCat entitlements, Razorpay India, Firebase+FCM, a safety-gated routine engine, speech realtime, and a module catalog you can delete from. A thinner rebuild is **~$80k–$145k and 4–8 months**, with store-rejection risk still ahead. If you already have parents, $100k is a **schedule purchase**. If you do not, do not buy this.

**We will not tell you** we have 12,000 families, a filed patent, or a working UA channel. We have **3** paying RC subscribers and a conversion problem. That is why you get the OS at a **project price**, not a SaaS multiple.

---

## 8. DO NOT CLAIM (diligence / legal risk)

Not legal advice. Do not change copy in this audit — **report only**.

| Current claim | Where | Problem | Recommended treatment |
|---------------|-------|---------|----------------------|
| “Trusted by 12,000+ Parents” | `en.json` `landing.badge` | Contradicted by 283 RC 28d actives / 3 paid | Remove or replace with verified count |
| “Join 12,000+ families” | `landing.final_cta_sub` | Same | Same |
| “10,000+ parents are shaping AmyNest” | `feedback.tsx` | Same | Same |
| “Provisional patent filed” | `landing.tech_patent_desc` | Draft HTML; filing date placeholder | File and show receipt, or delete |
| “Patent-Pending AI” / loading strips | `en.json` `patent_pending.*`, App Store, landings | Unverified filing | Same |
| “30+ Research Studies / peer-reviewed frameworks” / “real results” | landing trust block | Citations in copy ≠ studies performed by AmyNest; “real results” unverified | Soften to “informed by published frameworks”; drop outcome claims |
| App Store “Backed by: Harvard Center… CDC…” | Public listing 14 Sep 2026 | Reads as affiliation/endorsement | “Informed by published guidance from…” or remove names |
| “patent-pending, research-backed” | App Store description | Stacked unverified | Counsel rewrite |
| “End-to-end secure” | App Store body | No audit in repo | “Industry-standard transport/auth” or delete |
| “Your child's data is never sold or shared” | App Store | Subprocessors (OpenAI, Firebase, etc.) **are** sharing for processing | Align with privacy policy; processors vs sale |
| “No ads, no data selling, ever” | App Store | Ads **accounts exist** for UA; “no in-app ads” is the true claim | Distinguish UA vs in-app |
| Health Lab / Cry Insight / “pediatrician-aligned” | i18n, infant marketing | Not a medical device; still invitation for health-claim DD | Keep disclaimers; avoid “aligned” if no pediatric review on file |
| Speech Coach as practice vs clinical | ASO FAQ is careful; store body is promotional | SLP confusion | Keep FAQ-strength on store |
| MIT license in package.json, no LICENSE | root | Title ambiguity | Add LICENSE + assignment |
| Science “not opinions” | landing | Overclaim | Tone down |

---

## 9. Seller story (truthful)

**AmyNest is not** “an app with $5 MRR, please pay $100k.”  
**AmyNest is** “a production-ready parenting technology platform that has already absorbed the difficult engineering and infrastructure work, with monetization and distribution still under-optimized — and with marketing claims that must be cleaned before sale.”

The codebase **supports** the engineering half of that sentence. It **does not** support social proof or patent-as-moat.

| Beat | Copy |
|------|------|
| PROBLEM | Parents juggle routines, learning, speech, meals; tools are fragmented. |
| PRODUCT | One parent OS, 0–12, freemium `premium` entitlement. |
| TECHNOLOGY | Hybrid rules + rented LLMs; safety validator; live IAP three ways. |
| BUILT | Web, iOS, Android, API, worker, stores, RC, Razorpay, Growth OS. |
| REMAINS | Conversion, retention, honest claims, title, a distribution partner. |
| WHY BUY | 4–8 months and $80k–$145k to get to *this* production shape. |
| WHY NOW | Stores are live; delay means you build during someone else’s cycle. |
| WHY THIS BUYER | You have the parents; we have the pipes. |
| WHY $100K | Project substitution, not 20,000× $5 MRR. |

---

## 10. Deal structures (not legal advice)

Lawyer/accountant required for tax, IP assignment, store transfer, and employment vs contractor.

| Structure | Pros | Cons / seller risk |
|-----------|------|-------------------|
| **A. $100k cash** | Clean | Almost no IC will approve on current metrics |
| **B. $75k cash + $25k earnout** | Lets them say $100k headline | Earnout likely **misses** if tied to AmyNest standalone MRR |
| **C. $60k cash + $40k earnout** | More believable cash | Seller finances buyer’s experiment |
| **D. $50k cash + revenue milestone** | Easiest yes | Milestone on **buyer’s** distribution — define carefully or never pay |
| **E. Asset deal + 30–60 day transition** | What this actually is | Employment/tax; Apple/Play transfer timing; holdback 10–20% for title |

**Practical $100k path:** **$60k–$75k cash + $25k–$40k earnout** tied to **transfer completion + 30-day uptime**, not to 1,000 new subs. If the buyer insists on revenue earnout, assume it is **not** part of expected proceeds.

---

## 11. Asking-price strategy

| Ask | Buyer perception | Room | No-interest risk | Likely sale |
|-----|------------------|-----|------------------|-------------|
| $40k | Distressed asset | Little | Low if any buyer exists | $25k–$40k |
| $65k | Serious asset sale | Some | Medium | $35k–$55k |
| **$75k** | Strategic project price | Yes | Medium | **$40k–$70k** |
| $100k | “Founder fantasy” on Acquire.com; “conversation start” in strategic letter | Only with strategics | **High** on marketplaces | $0 or $50k–$90k |
| $125k | Immediate delete | None | Very high | $0 |

**LISTING PRICE:** **$75,000** public / marketplace asset framing.  
**STRATEGIC CONVERSATION PRICE:** **$100,000** in a 2-page letter that is 80% buy-vs-build.  
**TARGET:** **$60,000 cash** (or $50k + $25k transfer earnout).  
**WALK-AWAY:** **$25,000** (below that, keep or wind down).

Why not list $100k on Flippa: $5 MRR screenshots get ridiculed; you train buyers to lowball $15k. Why not list $40k first: you cap the strategic conversation.

---

## 12. Channels

**Do not claim AmyNest is accepted or listed on any marketplace.**

| Channel | Fit for $100k |
|---------|----------------|
| Acquire.com | Poor for $5 MRR; their audience is yield. Use only if you wait for revenue. |
| Flippa | Possible for **asset** apps; expect $15k–$40k. Not $100k. |
| Empire Flippers / Motion Invest | Typically **higher revenue minima** (not verified for this listing). Unlikely. |
| **Direct strategic outreach** | **Primary** for $100k. |
| Indian startup / family-tech intros | **Secondary.** |
| AI companies | Weak — they will hate the patent slide. |

**PRIMARY:** Direct outreach to parenting/baby apps and mid-market Indian edtech.  
**SECONDARY:** Warm intros / family-tech operators.  
**MARKETPLACE:** Flippa **asset** listing at $75k only as a backstop, with RC screenshots honest.

---

## 13. Pre-contact diligence package

Full itemization: `docs/AMYNEST_ACQUISITION_DATA_ROOM_CHECKLIST.md`. Short version:

| Item | Status |
|------|--------|
| RC live metrics | READY (export PDF for buyer) |
| Play / App Store console | MISSING exports |
| Razorpay ledger | MISSING |
| P&L / COGS | MISSING |
| Ad spend APIs | PARTIAL (this audit) |
| Architecture + dependency list | PARTIAL (this audit) |
| IP / company / domain registrar | MISSING |
| Privacy/terms URLs | PARTIAL |
| Claim purge plan | MISSING (inventory in §8) |
| Transfer runbook | MISSING |
| Incident/support history | MISSING |

**Do not email a $100k teaser until patent/12k claims are decided (file or strip) and RC+ads numbers are in a one-pager that matches this audit.**
